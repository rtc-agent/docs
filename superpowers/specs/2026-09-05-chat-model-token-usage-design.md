# ChatModel Token Usage Tracking — 设计文档

**日期**: 2026-09-05  
**状态**: 待审阅  
**范围**: `pkg/turn-agent` + `internal/agent` + `internal/model` + `pkg/protocol`

---

## 1. 背景

### 1.1 问题

LLM 每次调用都会返回 token 用量（`schema.Message.ResponseMeta.Usage`），但当前 turn-agent pkg 在事件分发时**只提取了 FinishReason，丢弃了 Usage**。上层应用无法得知每条消息消耗了多少 token，也无法做全局的 token 统计。

**当前代码中的丢弃点**：

```go
// pkg/turn-agent/agent.go:279 — consumeStream
if res.msg.ResponseMeta != nil {
    finishReason = res.msg.ResponseMeta.FinishReason
    // ← ResponseMeta.Usage 被丢弃
}

// pkg/turn-agent/message.go:163 — fromEinoMessage
if m.ResponseMeta != nil {
    msg.FinishReason = m.ResponseMeta.FinishReason
    // ← ResponseMeta.Usage 被丢弃
}
```

### 1.2 需求

1. **每条消息记录 token 用量** — 消息创建/完成时，将 Input/Output Token 写入 DB
2. **可观测性集成** — token 用量上报到 Prometheus（`Metrics.RecordLLMCall` 已定义但未被调用）
3. **summarize.go 的 ChatModel 调用** — 压缩历史时的 token 也应被统计（通过 eino callback 自动覆盖）

### 1.3 现有基础设施

| 层 | 机制 | 现状 |
| --- | --- | --- |
| Logging | `pkg/logger`（zap）+ `turnagent.Logger` | ✅ 完善 |
| Metrics | `turnagent.Metrics` + Prometheus | ⚠️ `RecordLLMCall` 已定义，未被调用 |
| Tracing | OpenTelemetry + OTLP | ✅ 完善 |
| Eino Callbacks | `Config.Callbacks []callbacks.Handler` | ⚠️ 字段存在，未注册 handler |

---

## 2. 设计

### 2.1 核心思路

Token 数据通过两条独立通道传递，职责分离：

- **Event.TokenUsage** — 跟着内容流走，在 final chunk / message event 时到达 app，用于 **message 持久化**（关联到具体 message 记录）
- **eino Callback Handler** — 注册到 `Config.Callbacks`，在 `OnEnd` 时从 `model.CallbackOutput` 获取完整信息（含 model name、token usage），用于 **metrics 上报和日志**（不需要 message 关联）

**为什么不用同一个机制？**

- Event.TokenUsage 解决的是"token 数据属于哪条 message"的关联问题——eino callback 不知道 sessionID/turnID/messageID，无法做这件事
- eino callback 解决的是"全局 LLM 可观测性"——它能拿到 `model.CallbackOutput.Config.Model`（model name）、覆盖所有 ChatModel 调用（包括 summarize），且不需要 turn-agent 引入新的 Config 字段

### 2.2 类型定义

```go
// pkg/turn-agent/types.go 新增

// TokenUsage 是 pkg 级别的 token 统计类型，不依赖 eino schema。
type TokenUsage struct {
    // InputTokens 是输入 token 数（prompt tokens）。
    InputTokens int
    // OutputTokens 是输出 token 数（completion tokens）。
    OutputTokens int
    // TotalTokens 是总 token 数（InputTokens + OutputTokens）。
    TotalTokens int
    // CachedTokens 是 prompt cache 命中的 token 数。
    CachedTokens int
    // ReasoningTokens 是 reasoning/thinking 消耗的 token 数
    // （来自 CompletionTokensDetails.ReasoningTokens）。
    ReasoningTokens int
}
```

### 2.3 Message 增强（pkg 级）

turn-agent pkg 级的 `Message` 类型也需要携带 token 信息，因为它在 `LoadMessages` → `toEinoMessage` 路径上影响 summarize middleware 的压缩决策。

```go
// pkg/turn-agent/message.go 修改

type Message struct {
    // ... 现有字段不变 ...

    // TokenUsage 是此消息的 token 统计。
    // 对 assistant 消息：来自 LLM 响应的 ResponseMeta.Usage。
    // 对其他角色：通常为 nil。
    //
    // 用途：
    //   - toEinoMessage 将 TokenUsage 写入 schema.Message.ResponseMeta.Usage，
    //     使 summarize_middleware 的 defaultTokenCounter 能获取精确基线。
    //   - Event.TokenUsage 是此字段的流式传递补充（Event 用于 final chunk）。
    TokenUsage *TokenUsage
}
```

**数据流**：

```text
DB 加载 → LoadMessages → []*turnagent.Message (TokenUsage 有值)
                              ↓
                        toEinoMessage
                              ↓
                     []*schema.Message (ResponseMeta.Usage 被填充)
                              ↓
                 summarize_middleware.shouldCompress
                              ↓
              defaultTokenCounter 读取精确 TotalTokens 基线
```

**conversion 函数更新**：

```go
// toEinoMessage — 将 TokenUsage 写回 schema.Message.ResponseMeta.Usage
func toEinoMessage(m *Message) *schema.Message {
    if m == nil { return nil }
    em := &schema.Message{
        // ... 现有映射 ...
    }
    if m.TokenUsage != nil {
        em.ResponseMeta = &schema.ResponseMeta{
            Usage: &schema.TokenUsage{
                PromptTokens:     m.TokenUsage.InputTokens,
                CompletionTokens: m.TokenUsage.OutputTokens,
                TotalTokens:      m.TokenUsage.TotalTokens,
            },
        }
        if m.TokenUsage.CachedTokens > 0 {
            em.ResponseMeta.Usage.PromptTokenDetails.CachedTokens = m.TokenUsage.CachedTokens
        }
        if m.TokenUsage.ReasoningTokens > 0 {
            em.ResponseMeta.Usage.CompletionTokensDetails.ReasoningTokens = m.TokenUsage.ReasoningTokens
        }
    }
    return em
}

// fromEinoMessage — 从 ResponseMeta.Usage 提取 TokenUsage
func fromEinoMessage(m *schema.Message) *Message {
    if m == nil { return nil }
    msg := &Message{
        // ... 现有映射 ...
    }
    if m.ResponseMeta != nil {
        msg.FinishReason = m.ResponseMeta.FinishReason
        if m.ResponseMeta.Usage != nil {
            msg.TokenUsage = extractTokenUsage(m.ResponseMeta.Usage)
        }
    }
    // ...
}
```

### 2.4 Event 增强

```go
// pkg/turn-agent/event.go 修改

type Event struct {
    // ... 现有字段不变 ...

    // TokenUsage 仅在以下时机携带值：
    //   - EventKindStreamChunk 且 FinishReason != ""（最后一个 chunk）
    //   - EventKindMessage（非流式完整消息）
    // 其他情况为 nil。
    //
    // 上层在 finalize 消息时读取此字段，写入 DB。
    TokenUsage *TokenUsage
}
```

### 2.4 Eino Callback Handler（全局 LLM 可观测性）

不再在 turn-agent Config 中新增回调字段。改为在 app 层注册一个 eino `callbacks.Handler` 到 `Config.Callbacks`，利用 eino 已有的 callback 注入机制。

```go
// internal/agent/token_callback.go 新增

// newTokenUsageCallbackHandler 创建一个 eino callbacks.Handler，
// 在每次 ChatModel 调用完成时上报 metrics 和日志。
//
// 此 handler 覆盖所有 ChatModel 调用，包括：
//   - agent 的主循环调用（流式/非流式）
//   - summarizeMessages 的压缩调用
//   - 未来可能新增的其他 ChatModel 调用
//
// 通过 ucb.HandlerHelper 过滤，仅在 ChatModel 组件上触发。
func newTokenUsageCallbackHandler(metrics turnagent.Metrics, logger turnagent.Logger) callbacks.Handler {
    return ucb.NewHandlerHelper().
        ChatModel(&ucb.ModelCallbackHandler{
            OnEnd: func(ctx context.Context, info *callbacks.RunInfo, output *model.CallbackOutput) context.Context {
                // 提取 sessionID/turnID（由 turn-agent 在 GenInput 时注入到 context）
                sessionID := getSessionIDFromContext(ctx)
                turnID := getTurnIDFromContext(ctx)

                var inputTokens, outputTokens, totalTokens int
                if output.TokenUsage != nil {
                    inputTokens = output.TokenUsage.PromptTokens
                    outputTokens = output.TokenUsage.CompletionTokens
                    totalTokens = output.TokenUsage.TotalTokens
                }

                // model name 从 eino callback 直接获取（比 OnLLMComplete 方案更准确）
                modelName := ""
                if output.Config != nil {
                    modelName = output.Config.Model
                }

                // Metrics 上报
                if metrics != nil {
                    metrics.RecordLLMCall(ctx, turnagent.LLMCallMetricsAttrs{
                        SessionID:    sessionID,
                        TurnID:       turnID,
                        Model:        modelName,
                        InputTokens:  inputTokens,
                        OutputTokens: outputTokens,
                        TotalTokens:  totalTokens,
                    })
                }

                // 结构化日志
                if logger != nil {
                    logger.Info(ctx, "llm.complete", map[string]any{
                        "session_id":     sessionID,
                        "turn_id":        turnID,
                        "model":          modelName,
                        "input_tokens":   inputTokens,
                        "output_tokens":  outputTokens,
                        "total_tokens":   totalTokens,
                        "finish_reason":  output.Message.ResponseMeta.FinishReason,
                    })
                }

                return ctx
            },
        }).
        Handler()
}
```

**注册方式**（在 `internal/agent/agent.go` 构建 turnagent.Config 时）：

```go
cfg.Callbacks = []callbacks.Handler{
    newTokenUsageCallbackHandler(h.metrics, h.logger),
}
```

**优势**：

- 不需要 turn-agent 新增 Config 字段，减少 API 表面积
- 自动覆盖所有 ChatModel 调用（包括 summarize）
- 从 `model.CallbackOutput.Config.Model` 获取准确的 model name
- 与 eino 生态兼容（cozeloop、langfuse 等 handler 可以并存）

### 2.5 turn-agent 内部提取（Event.TokenUsage）

turn-agent pkg 层只负责从 `schema.Message.ResponseMeta.Usage` 提取 token 数据并填充到 `Event.TokenUsage`，不再触发任何回调。

```go
// pkg/turn-agent/agent.go — consumeStream 修改

// 在每个 chunk 上提取 token usage（仅 final chunk 有值，中间 chunk 为 nil）：
var tokenUsage *TokenUsage
if res.msg.ResponseMeta != nil && res.msg.ResponseMeta.Usage != nil {
    tokenUsage = extractTokenUsage(res.msg.ResponseMeta.Usage)
}

// PublishEvent 时携带 tokenUsage:
if err := a.cfg.PublishEvent(ctx, sessionID, turnID, &Event{
    Kind:             EventKindStreamChunk,
    // ... 现有字段 ...
    FinishReason:     finishReason,
    TokenUsage:       tokenUsage,  // 仅 final chunk 有值，其他 chunk 为 nil
}); err != nil { ... }
```

```go
// pkg/turn-agent/agent.go — dispatchEvents 修改（非流式路径）

var tokenUsage *TokenUsage
if mv.Message != nil && mv.Message.ResponseMeta != nil && mv.Message.ResponseMeta.Usage != nil {
    tokenUsage = extractTokenUsage(mv.Message.ResponseMeta.Usage)
}

return a.cfg.PublishEvent(ctx, sessionID, turnID, &Event{
    Kind:       EventKindMessage,
    // ... 现有字段 ...
    Message:    fromEinoMessage(mv.Message),
    TokenUsage: tokenUsage,
})
```

```go
// pkg/turn-agent/helper.go 或 types.go — 共享的提取函数

// extractTokenUsage 从 eino 的 schema.TokenUsage 转换为 pkg 级的 TokenUsage。
func extractTokenUsage(u *schema.TokenUsage) *TokenUsage {
    if u == nil {
        return nil
    }
    t := &TokenUsage{
        InputTokens:  u.PromptTokens,
        OutputTokens: u.CompletionTokens,
        TotalTokens:  u.TotalTokens,
    }
    if u.PromptTokenDetails.CachedTokens > 0 {
        t.CachedTokens = u.PromptTokenDetails.CachedTokens
    }
    if u.CompletionTokensDetails.ReasoningTokens > 0 {
        t.ReasoningTokens = u.CompletionTokensDetails.ReasoningTokens
    }
    return t
}
```

### 2.6 Message 持久化层变更

#### model.Message（DB 模型）

```go
// internal/model/message.go 新增字段
type Message struct {
    // ... 现有字段 ...
    
    // Token 用量（仅 assistant 消息有值）
    InputTokens     *int `json:"input_tokens,omitempty"`
    OutputTokens    *int `json:"output_tokens,omitempty"`
    TotalTokens     *int `json:"total_tokens,omitempty"`
    CachedTokens    *int `json:"cached_tokens,omitempty"`
    ReasoningTokens *int `json:"reasoning_tokens,omitempty"`
}
```

#### primitives.MessageToCreate

```go
// internal/usecase/primitives/message.go 新增字段
type MessageToCreate struct {
    // ... 现有字段 ...
    
    // TokenUsage 可选，仅 assistant 消息需要。
    TokenUsage *TokenUsage
}

// pkg 级 TokenUsage 类型（或直接使用 turnagent.TokenUsage）
type TokenUsage struct {
    InputTokens     int
    OutputTokens    int
    TotalTokens     int
    CachedTokens    int
    ReasoningTokens int
}
```

#### protocol.Message（API 模型）

需要同步更新 OpenAPI spec 并重新生成。新增 `input_tokens`, `output_tokens`, `total_tokens`, `cached_tokens`, `reasoning_tokens` 可选字段。

### 2.7 Application 层使用

#### handleStreamChunk（data_handler.go）

```go
// 在 finalize 路径中，读取 event.TokenUsage 并更新 message 记录
if event.FinishReason != "" && state.markdownMsgID != uuid.Nil && !state.markdownFinalized {
    if err := h.finalizeStreamMessage(ctx, sessionID, turnID, &state.markdownMsgID, ...); err != nil {
        return err
    }
    // 写入 token 用量
    if event.TokenUsage != nil {
        h.deps.MessageRepo.UpdateTokenUsage(ctx, state.markdownMsgID, event.TokenUsage)
    }
    state.markdownFinalized = true
}
```

#### handleMessage（data_handler.go）

```go
// 非流式消息创建时直接携带 token 用量
messagesToCreate = append(messagesToCreate, primitives.MessageToCreate{
    Role:    protocol.MessageRoleAssistant,
    Creator: usecase.SystemCreator{},
    Content: markdownContent,
    Status:  protocol.MessageStreamingCompleted,
    TokenUsage: eventTokenUsage(event),  // 从 event.TokenUsage 转换
})
```

#### Eino Callback 注册（agent.go）

```go
// internal/agent/agent.go — 构建 turnagent.Config 时
cfg.Callbacks = []callbacks.Handler{
    newTokenUsageCallbackHandler(h.metrics, h.logger),
}
```

### 2.7 summarizeMessages 的 token 统计

`summarizeMessages` 直接调用 `h.deps.ChatModel.Generate()`，不经过 turn-agent 的 event 流。但由于 eino callback handler 已注册到 `Config.Callbacks`，而 turn-agent 在 `GenInput` 时已通过 `callbacks.InitCallbacks` 将其注入到 context 中，因此 summarize 调用会**自动触发** eino callback，token 也会被统计和上报。

无需额外处理。

---

## 3. 变更范围

### 3.1 pkg/turn-agent（核心层）

| 文件 | 变更 |
| --- | --- |
| `types.go` | 新增 `TokenUsage` struct + `extractTokenUsage` 函数 |
| `event.go` | `Event` 新增 `TokenUsage *TokenUsage` 字段 |
| `agent.go` | `consumeStream` 提取 token usage 填充到 Event |
| `agent.go` | `dispatchEvents` 提取 token usage（非流式路径） |
| `message.go` | `Message` 新增 `TokenUsage *TokenUsage` 字段；`toEinoMessage` / `fromEinoMessage` 映射更新 |
| `config.go` | 无需修改 |

### 3.2 internal/agent（应用层）

| 文件 | 变更 |
| --- | --- |
| `data_handler.go` | `handleStreamChunk` finalize 路径写入 token |
| `data_handler.go` | `handleMessage` 创建时携带 token |
| `data_message_helper.go` | `appendStreamChunk` finalize 路径支持 token |
| `agent.go` | 注册 eino callback handler 到 `Config.Callbacks` |
| `token_callback.go` | **新增** — eino callback handler 实现（metrics + 日志） |
| `summarize.go` | 无需修改（eino callback 自动覆盖） |

### 3.3 数据模型层

| 文件 | 变更 |
| --- | --- |
| `internal/model/message.go` | 新增 `InputTokens`, `OutputTokens`, `TotalTokens`, `CachedTokens`, `ReasoningTokens` 字段 |
| `internal/repo/message_repo.go` | `MessageRepo` 新增 `UpdateTokenUsage` 方法 |
| `internal/usecase/primitives/message.go` | `MessageToCreate` 新增 `TokenUsage` 字段；`CreateMessage` / `BatchCreateMessages` 传递 |
| `pkg/protocol/models.gen.go` | 重新生成（OpenAPI spec 更新） |

### 3.4 DB Migration

新增 migration：在 `messages` 表添加 `input_tokens`, `output_tokens`, `total_tokens`, `cached_tokens`, `reasoning_tokens` 列（可选 int，默认 NULL）。

---

## 4. 边界场景

### 4.1 Token 数据缺失

- 部分 LLM provider 可能不返回 token usage（`ResponseMeta.Usage == nil`）
- 流式场景下，部分 provider 需要显式设置 `stream_options.include_usage` 才会在 final chunk 中返回 usage
- 处理：`Event.TokenUsage` 为 nil，app 层跳过写入，DB 字段保持 NULL
- eino callback 同样处理 nil（`output.TokenUsage == nil` 时跳过 metrics 上报）

### 4.2 Streaming 中的中间 chunk

- 中间 chunk 的 `ResponseMeta.Usage` 为 nil
- 处理：`Event.TokenUsage` 为 nil，仅 final chunk 携带

### 4.3 多消息 turn

- 一个 turn 可能产生多条 assistant message（例如 tool call 后再回复）
- 处理：每条 message 的 finalize 时读取对应 event 的 token usage，独立写入

### 4.4 Summarize 调用

- `summarizeMessages` 的 ChatModel 调用不走 event 流
- 处理：通过 eino callback 覆盖（如果注册了），或单独记录

### 4.5 错误场景

- ChatModel 调用失败时不返回 token usage
- 处理：eino callback 的 `OnError` 触发（可记录错误），`OnEnd` 不触发或 `TokenUsage` 为 nil

---

## 5. 非目标

- **Cost 计算**：本次不引入 model pricing 表和费用计算
- **前端展示**：protocol.Message 会新增 token 字段，但前端是否展示不在本次范围

---

## 6. 测试策略

- **单元测试**：`consumeStream` / `dispatchEvents` 的 token 提取逻辑
- **集成测试**：模拟 LLM 响应，验证 token 数据从 event 传递到 DB
- **E2E 测试**：完整 turn 流程，验证 token 用量在消息记录和 Prometheus 指标中都正确
