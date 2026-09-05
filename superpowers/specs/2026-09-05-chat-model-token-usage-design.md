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

Token 数据需要沿着内容流**一起传递**（解决 message 关联），同时提供独立回调用于可观测性（解决 metrics 上报）。

**两条数据通道**：

- **Event.TokenUsage** — 跟着内容走，在 final chunk / message event 时到达 app，用于 message 持久化
- **Config.OnLLMComplete** — 独立回调，用于 metrics、日志等不需要 message 关联的场景

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
}
```

### 2.3 Event 增强

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

### 2.4 Config.OnLLMComplete 回调

```go
// pkg/turn-agent/config.go 新增

// LLMCompleteInfo 携带一次 ChatModel 调用完成的元数据。
type LLMCompleteInfo struct {
    // SessionID 是此调用所属的 session。
    SessionID string
    // TurnID 是此调用所属的 turn。
    TurnID string
    // AgentName 是产生此调用的 agent 名称。
    AgentName string
    // TokenUsage 是此调用的 token 统计。
    TokenUsage *TokenUsage
    // FinishReason 是调用完成原因（"stop", "tool_calls", "length" 等）。
    FinishReason string
    // IsStreaming 表示此调用是否使用了流式模式。
    IsStreaming bool
    //
    // 注意：model name 不在此 struct 中。app 层应从自身配置
    // （如 h.deps.LLMConfig）获取 model identifier 用于 metrics label。
    // 如果未来需要支持多 model 场景，再扩展此 struct。
}

// Config 新增字段
type Config struct {
    // ... 现有字段 ...

    // OnLLMComplete 在每次 ChatModel 调用完成后触发。
    // 用于不需要 message 关联的可观测性场景：metrics 上报、结构化日志等。
    // 可选 — 为 nil 时不触发。
    //
    // 注意：如果需要将 token 数据写入具体 message 记录，
    // 应从 Event.TokenUsage 获取，而非此回调。
    OnLLMComplete func(ctx context.Context, info *LLMCompleteInfo) error
}
```

### 2.5 turn-agent 内部提取

```go
// pkg/turn-agent/agent.go — consumeStream 修改

// 在 final chunk 时提取 token usage:
if res.msg.ResponseMeta != nil {
    finishReason = res.msg.ResponseMeta.FinishReason
}

var tokenUsage *TokenUsage
if res.msg.ResponseMeta != nil && res.msg.ResponseMeta.Usage != nil {
    u := res.msg.ResponseMeta.Usage
    tokenUsage = &TokenUsage{
        InputTokens:  u.PromptTokens,
        OutputTokens: u.CompletionTokens,
        TotalTokens:  u.TotalTokens,
    }
    if u.PromptTokenDetails.CachedTokens > 0 {
        tokenUsage.CachedTokens = u.PromptTokenDetails.CachedTokens
    }
}

// PublishEvent 时携带 tokenUsage:
if err := a.cfg.PublishEvent(ctx, sessionID, turnID, &Event{
    Kind:             EventKindStreamChunk,
    // ... 现有字段 ...
    FinishReason:     finishReason,
    TokenUsage:       tokenUsage,  // 仅 final chunk 有值
}); err != nil { ... }

// OnLLMComplete 触发:
if a.cfg.OnLLMComplete != nil && tokenUsage != nil {
    _ = a.cfg.OnLLMComplete(ctx, &LLMCompleteInfo{
        SessionID:    sessionID,
        TurnID:       turnID,
        AgentName:    agentName,
        TokenUsage:   tokenUsage,
        FinishReason: finishReason,
        IsStreaming:  true,
    })
}
```

```go
// pkg/turn-agent/agent.go — dispatchEvents 修改（非流式路径）

var tokenUsage *TokenUsage
if mv.Message != nil && mv.Message.ResponseMeta != nil && mv.Message.ResponseMeta.Usage != nil {
    u := mv.Message.ResponseMeta.Usage
    tokenUsage = &TokenUsage{
        InputTokens:  u.PromptTokens,
        OutputTokens: u.CompletionTokens,
        TotalTokens:  u.TotalTokens,
    }
    if u.PromptTokenDetails.CachedTokens > 0 {
        tokenUsage.CachedTokens = u.PromptTokenDetails.CachedTokens
    }
}

return a.cfg.PublishEvent(ctx, sessionID, turnID, &Event{
    Kind:       EventKindMessage,
    // ... 现有字段 ...
    Message:    fromEinoMessage(mv.Message),
    TokenUsage: tokenUsage,
})
```

### 2.6 Message 持久化层变更

#### model.Message（DB 模型）

```go
// internal/model/message.go 新增字段
type Message struct {
    // ... 现有字段 ...
    
    // Token 用量（仅 assistant 消息有值）
    InputTokens  *int `json:"input_tokens,omitempty"`
    OutputTokens *int `json:"output_tokens,omitempty"`
    TotalTokens  *int `json:"total_tokens,omitempty"`
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
    InputTokens  int
    OutputTokens int
    TotalTokens  int
}
```

#### protocol.Message（API 模型）

需要同步更新 OpenAPI spec 并重新生成。新增 `input_tokens`, `output_tokens`, `total_tokens` 可选字段。

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

#### OnLLMComplete 注册（agent.go）

```go
// internal/agent/agent.go — 构建 turnagent.Config 时
cfg.OnLLMComplete = func(ctx context.Context, info *turnagent.LLMCompleteInfo) error {
    h.metrics.RecordLLMCall(ctx, turnagent.LLMCallMetricsAttrs{
        SessionID:    info.SessionID,
        TurnID:       info.TurnID,
        Model:        info.AgentName,  // 或从 info 中获取实际 model name
        InputTokens:  info.TokenUsage.InputTokens,
        OutputTokens: info.TokenUsage.OutputTokens,
        TotalTokens:  info.TokenUsage.TotalTokens,
    })
    h.logIfEnabled(ctx, "llm.complete", map[string]any{
        "session_id":    info.SessionID,
        "turn_id":       info.TurnID,
        "input_tokens":  info.TokenUsage.InputTokens,
        "output_tokens": info.TokenUsage.OutputTokens,
        "total_tokens":  info.TokenUsage.TotalTokens,
        "finish_reason": info.FinishReason,
    })
    return nil
}
```

### 2.8 summarizeMessages 的 token 统计

`summarizeMessages` 直接调用 `h.deps.ChatModel.Generate()`，不经过 turn-agent 的 event 流。它的 token 统计通过 **eino callback** 自动覆盖：

1. turn-agent 在 `GenInput` 时已通过 `callbacks.InitCallbacks` 注入 eino callbacks 到 context
2. ChatModel.Generate() 会自动触发注册的 callback handler
3. 如果注册了 token 统计的 callback handler，summarize 调用的 token 也会被统计

**可选增强**：注册一个 eino `callbacks.Handler` 到 `Config.Callbacks`，在 `OnEnd` 时调用 `Metrics.RecordLLMCall()`，覆盖所有 ChatModel 调用（包括 summarize）。

---

## 3. 变更范围

### 3.1 pkg/turn-agent（核心层）

| 文件 | 变更 |
| --- | --- |
| `types.go` | 新增 `TokenUsage` struct |
| `event.go` | `Event` 新增 `TokenUsage *TokenUsage` 字段 |
| `config.go` | 新增 `LLMCompleteInfo` struct + `Config.OnLLMComplete` 回调 |
| `agent.go` | `consumeStream` 提取 token usage + 触发 OnLLMComplete |
| `agent.go` | `dispatchEvents` 提取 token usage（非流式路径） |
| `message.go` | 无需修改（pkg 级 Message 不携带 token，通过 Event 传递） |

### 3.2 internal/agent（应用层）

| 文件 | 变更 |
| --- | --- |
| `data_handler.go` | `handleStreamChunk` finalize 路径写入 token |
| `data_handler.go` | `handleMessage` 创建时携带 token |
| `data_message_helper.go` | `appendStreamChunk` finalize 路径支持 token |
| `agent.go` | 注册 `OnLLMComplete` 回调 |
| `summarize.go` | 无需修改（eino callback 自动覆盖） |

### 3.3 数据模型层

| 文件 | 变更 |
| --- | --- |
| `internal/model/message.go` | 新增 `InputTokens`, `OutputTokens`, `TotalTokens` 字段 |
| `internal/repo/message_repo.go` | `MessageRepo` 新增 `UpdateTokenUsage` 方法 |
| `internal/usecase/primitives/message.go` | `MessageToCreate` 新增 `TokenUsage` 字段；`CreateMessage` / `BatchCreateMessages` 传递 |
| `pkg/protocol/models.gen.go` | 重新生成（OpenAPI spec 更新） |

### 3.4 DB Migration

新增 migration：在 `messages` 表添加 `input_tokens`, `output_tokens`, `total_tokens` 列（可选 int，默认 NULL）。

---

## 4. 边界场景

### 4.1 Token 数据缺失

- 部分 LLM provider 可能不返回 token usage（`ResponseMeta.Usage == nil`）
- 处理：`Event.TokenUsage` 为 nil，app 层跳过写入，DB 字段保持 NULL

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
- 处理：`OnLLMComplete` 不触发（或触发时 `TokenUsage` 为 nil）

---

## 5. 非目标

- **Cost 计算**：本次不引入 model pricing 表和费用计算
- **前端展示**：protocol.Message 会新增 token 字段，但前端是否展示不在本次范围
- **Eino Callback Handler 实现**：Config.Callbacks 的 handler 注册是可选增强，不在核心范围内

---

## 6. 测试策略

- **单元测试**：`consumeStream` / `dispatchEvents` 的 token 提取逻辑
- **集成测试**：模拟 LLM 响应，验证 token 数据从 event 传递到 DB
- **E2E 测试**：完整 turn 流程，验证 token 用量在消息记录和 Prometheus 指标中都正确
