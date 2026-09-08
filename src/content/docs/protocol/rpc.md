---
title: WebSocket RPC
description: RTC Agent 的 WebSocket RPC 接口——16 个方法覆盖会话管理、消息收发、Turn 控制和 RTC 工具调用。
---

认证完成后，前端通过一条 **WebSocket 持久连接** 完成所有业务操作。RPC 共定义 **16 个方法**，分为 **Action（操作类）** 和 **Query（查询类）** 两种类型。

## RPC 分类

```mermaid
flowchart TD
    subgraph ACTION["⚡ Action RPC（8 个）"]
        direction TB
        A1["创建 / 修改 / 删除操作"]
        A2["响应附带 updates 事件"]
        A3["支持 client_id 幂等"]
        A4["前端收到后更新本地状态"]
    end

    subgraph QUERY["🔍 Query RPC（8 个）"]
        direction TB
        Q1["只读查询操作"]
        Q2["分页列表 + 单条获取"]
        Q3["不影响服务端状态"]
        Q4["响应不含 updates"]
    end

    style ACTION fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style QUERY fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

| 对比 | Action RPC | Query RPC |
|------|:----------:|:---------:|
| **操作类型** | 创建 / 修改 / 删除 | 只读查询 |
| **响应包含 updates** | ✅ 是 | ❌ 否 |
| **幂等支持** | ✅ client_id | — |
| **典型场景** | 发消息、关闭会话 | 加载消息列表 |

---

## 方法一览

16 个方法按 **4 个业务域** 组织：

| 域 | Action | Query |
|:--:|:------:|:-----:|
| **Session** | `v1.session.close` · `v1.session.update` · `v1.session.fork` · `v1.session.compact` | `v1.session.list` · `v1.session.get` |
| **Message** | `v1.message.send` | `v1.message.list` · `v1.message.get` |
| **Turn** | `v1.turn.stop` | `v1.turn.list` · `v1.turn.get` |
| **RTC** | `v1.rtc.update_status` · `v1.rtc.submit_result` | `v1.rtc.list` · `v1.rtc.get` |

---

## Session 域

会话是用户与 AI 对话的容器。每个会话包含多条消息和多个 Turn。

```mermaid
flowchart LR
    subgraph SESSION["📦 Session"]
        direction TB
        S1["v1.session.list"]
        S2["v1.session.get"]
        S3["v1.session.close"]
        S4["v1.session.update"]
        S5["v1.session.fork"]
        S6["v1.session.compact"]
    end

    subgraph STATUS["会话状态"]
        direction TB
        ST1["🟢 active"]
        ST2["🔵 idle"]
        ST3["⚫ closed"]
    end

    style SESSION fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style STATUS fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| 方法 | 类型 | 功能 | 关键参数 |
|------|:----:|------|----------|
| `v1.session.list` | 🔍 Query | 获取会话列表 | `cursor`（分页），`limit`（默认 20） |
| `v1.session.get` | 🔍 Query | 获取单个会话 | `session_id` |
| `v1.session.close` | ⚡ Action | 关闭会话 | `session_id` |
| `v1.session.update` | ⚡ Action | 更新会话标题 / 软删除 | `session_id`，`title`，`deleted_at` |
| `v1.session.fork` | ⚡ Action | 分叉对话（基于历史消息创建新会话） | `old_server_session_id`，`new_client_session_id`，`new_client_message_id`，`old_server_message_id`，`content_data`，`limit`（默认 200，最多 1000） |
| `v1.session.compact` | ⚡ Action | 手动触发上下文压缩（不返回 updates） | `session_id`，`custom_instruction` |

### Fork 分叉对话

```mermaid
flowchart LR
    subgraph OLD["旧会话"]
        direction TB
        M1["User A"] --> M2["Assistant B"]
        M2 --> M3["Assistant C"]
        M3 --> M4["User D"]
    end

    subgraph NEW["新会话（Fork）"]
        direction TB
        N1["User A"] --> N2["Assistant B"]
        N2 --> N3["Assistant C"]
        N3 --> N4["User D'（重写）"]
    end

    OLD -->|"Fork at D<br/>复制 A-B-C"| NEW

    style OLD fill:#fce4ec,stroke:#c62828,stroke-width:2px
    style NEW fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

> 💡 **Fork 的典型场景**：用户想从历史对话的某个分叉点开始新的方向。指定旧消息位置，系统复制之前的上下文，用新消息替换指定位置之后的内容，并触发新的 AI 推理。

**Fork 响应**：返回 `{session_id, turn_id, message_ids[]}`。注意 `turn_id` 为空字符串——Turn 由后台 turn-agent 异步创建。

---

## Message 域

消息是会话中的基本通信单元，支持多种内容类型。

| 方法 | 类型 | 功能 | 关键参数 |
|------|:----:|------|----------|
| `v1.message.send` | ⚡ Action | 发送消息（自动创建 session 和 turn） | `content_data`，`client_session_id`，`client_id`（必填），`server_session_id`（可选），`agent_prompt`（可选） |
| `v1.message.list` | 🔍 Query | 获取消息列表 | `session_id`，`cursor`（global_offset，uint32），`limit`（默认 50） |
| `v1.message.get` | 🔍 Query | 获取单条消息 | `message_id` |

### 消息发送流程

```mermaid
sequenceDiagram
    participant FE as 🖥️ 前端
    participant Server as ⚙️ 服务端
    participant LLM as 🧠 AI 模型

    FE->>Server: v1.message.send
    Server->>Server: 自动创建 Session（如需）
    Server->>Server: 创建 Turn
    Server->>Server: 创建 Message
    Server-->>FE: 响应（session_id, turn_id, message_id）+ updates
    Server->>LLM: 开始推理
    LLM-->>Server: 流式输出
    Server-->>FE: 实时事件推送
```

> 💡 **自动创建**：调用 `v1.message.send` 时，如果 `server_session_id` 为空，服务端会自动创建新会话。这意味着"新建对话"和"发送消息"可以合并为一次调用。

> 💡 **异步 Turn**：`v1.message.send` 和 `v1.session.fork` 响应中的 `turn_id` 为空字符串——Turn 由后台 turn-agent 异步创建，不随请求同步返回。

### 内容类型

| 类型 | 说明 | Data 结构 |
|------|------|-----------|
| `markdown` | Markdown 文本 | 字符串 |
| `text` | 纯文本 | 字符串 |
| `thinking` | AI 推理过程 | 字符串 |
| `summary` | 上下文摘要 | `SummaryItem[]` |
| `toolcall_input` | 工具调用请求 | `ToolCall` 对象 |
| `toolcall_output` | 工具调用结果 | `ToolCall` 对象 |

---

## Turn 域

Turn 代表一次完整的 AI 推理轮次——从用户发消息到 AI 完成响应。

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Pending: 消息发送
    Pending --> Running: 开始推理
    Running --> Completed: 推理完成 ✅
    Running --> Failed: 推理失败 ❌
    Running --> Cancelled: 用户取消 🚫
    Running --> Interrupted: 被中断 ⚡
    Running --> Merged: 合并 🔀

    Completed --> [*]
    Failed --> [*]
    Cancelled --> [*]
    Interrupted --> [*]
    Merged --> [*]
```

| 方法 | 类型 | 功能 | 关键参数 |
|------|:----:|------|----------|
| `v1.turn.stop` | ⚡ Action | 停止当前 Turn（不返回 updates） | `session_id` |
| `v1.turn.list` | 🔍 Query | 获取 Turn 列表 | `session_id`，`cursor`，`limit`（默认 50） |
| `v1.turn.get` | 🔍 Query | 获取单个 Turn | `turn_id` |

| 状态 | 说明 |
|:----:|------|
| `pending` | 等待开始 |
| `running` | AI 正在推理 |
| `completed` | 推理完成 |
| `failed` | 推理失败 |
| `cancelled` | 用户主动取消 |
| `interrupted` | 被系统中断 |
| `merged` | 与其他 Turn 合并 |

---

## RTC 域

RTC（Remote Tool Calling）是 AI 调用前端工具的机制。前端通过 RTC 域的 RPC 上报工具执行状态和结果。

```mermaid
sequenceDiagram
    participant Server as ⚙️ 服务端
    participant FE as 🖥️ 前端

    Server-->>FE: RTC 事件推送（tool_call）
    Note over FE: 执行工具...

    FE->>Server: v1.rtc.update_status<br/>{ rtc_id, status: "executing" }
    Note over FE: 工具执行完成...
    FE->>Server: v1.rtc.submit_result<br/>{ rtc_id, success: true, result: "..." }
    Server-->>FE: updates（AI 继续推理）
```

| 方法 | 类型 | 功能 | 关键参数 |
|------|:----:|------|----------|
| `v1.rtc.update_status` | ⚡ Action | 更新 RTC 执行状态 | `rtc_id`，`status`，`client_id` |
| `v1.rtc.submit_result` | ⚡ Action | 提交工具执行结果 | `rtc_id`，`success`，`result` / `error`，`client_id` |
| `v1.rtc.list` | 🔍 Query | 获取 RTC 列表 | `session_id`，`cursor`，`limit`（默认 50） |
| `v1.rtc.get` | 🔍 Query | 获取单个 RTC | `rtc_id` |

### RTC 状态流转

| 状态 | 说明 | 前端操作 |
|:----:|------|----------|
| `pending` | 等待前端接收 | 收到 RTC 事件 |
| `sent` | 已送达前端 | 展示工具调用 UI |
| `executing` | 正在执行 | 调用 `update_status` |
| `completed` | 执行成功 | 调用 `submit_result(success=true)` |
| `failed` | 执行失败 | 调用 `submit_result(success=false)` |
| `timeout` | 执行超时 | 系统自动标记 |
| `rejected` | 用户拒绝 | 用户点击拒绝 |

---

## 幂等机制

部分 Action RPC 支持 `client_id` 用于去重或所有权验证，但**各方法行为不同**：

| 方法 | client_id | 实际行为 |
|------|:---------:|---------|
| `message.send` | ✅ 必填 | 重复 client_id 返回 `client_id_conflict` 错误 |
| `rtc.submit_result` | ✅ 可选 | 终态 + 相同 client_id → 返回缓存结果（幂等）；终态 + 不同 client_id → 返回已有数据 |
| `rtc.update_status` | ✅ 可选 | 用于所有权验证 + 状态机转换检查，非简单去重 |
| `session.close` | ✅ 可选 | 字段接受但不做去重 |
| `turn.stop` | ✅ 可选 | 字段接受但不做去重 |
| `session.update` | ❌ 无此字段 | — |
| `session.compact` | ❌ 无此字段 | 使用内部队列去重（同一 session 不重复压缩） |
| `session.fork` | ❌ 用 `new_client_message_id` | 作为新消息的 ClientID 存储，不做 fork 级去重 |

> 💡 **设计说明**：`client_id` 在不同方法中承担不同职责——有时是幂等键，有时是所有权标识，有时仅做记录。集成时应参考各方法的具体行为，不要假设统一的幂等语义。

---

## Update 模型

大部分 Action RPC 的响应包含 **`result`** 和 **`updates`** 两部分（`session.compact` 和 `turn.stop` 除外，它们的 `updates` 为空）：

```json
{
  "result": { "...业务数据..." },
  "updates": [
    {
      "id": "update-uuid",
      "items": [
        { "entity": "message", "action": "created", "entity_id": "msg-uuid" }
      ],
      "data_list": [{ "...实体完整数据..." }],
      "offset": 42
    }
  ]
}
```

```mermaid
flowchart LR
    A["⚡ Action RPC 响应"] --> B["result<br/>业务结果"]
    A --> C["updates<br/>状态变更"]

    C --> D["items<br/>变更条目"]
    C --> E["data_list<br/>实体数据"]
    C --> F["offset<br/>顺序标识"]

    D --> G["entity: session / turn / message / rtc"]
    D --> H["action: created / updated / deleted"]

    style A fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style B fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style C fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

> 💡 **前端收到 updates 后**：直接更新本地状态（IndexedDB / 内存），保持与服务端一致。无需再发一次查询请求——这就是"操作即同步"的设计理念。

---

## RPC 错误格式

RPC 错误使用与 HTTP 不同的结构化格式：

```json
{
  "code": "session.not_found",
  "message": "session xxx not found",
  "details": "optional additional info"
}
```

| 字段 | 类型 | 说明 |
|------|:----:|------|
| `code` | string | 机器可读错误码，如 `session.not_found`、`client_id_conflict`、`method_not_found` |
| `message` | string | 人类可读描述 |
| `details` | any | 可选附加信息（仅部分错误包含） |

---

## Message 排序

消息模型包含两个排序字段：

| 字段 | 类型 | 说明 |
|------|:----:|------|
| `global_offset` | uint32 | Session 内全局消息顺序，单调递增，用作 `v1.message.list` 的分页 cursor |
| `turn_offset` | uint32 | Turn 内消息顺序 |

## 下一步

- [实时事件](/docs/protocol/events/) — 了解 updates 背后的双频道推送机制
- [Remote Tool Calling](/docs/concepts/rtc/) — 深入了解 RTC 工具调用的完整生命周期
- [协议总览](/docs/protocol/) — 返回协议全景
