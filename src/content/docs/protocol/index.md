---
title: 协议总览
description: RTC Agent 的通信协议全景——HTTP API 处理认证，WebSocket RPC 承载业务操作，实时事件保证前后端状态同步。
---

RTC Agent 的协议由三层组成，各司其职：**HTTP API** 负责认证、**WebSocket RPC** 承载所有业务操作、**实时事件**驱动前后端状态同步。

```mermaid
flowchart TD
    subgraph PROTOCOL["📡 RTC Agent 协议"]
        direction TB
        HTTP["🔐 HTTP API<br/>OAuth2 认证"]
        RPC["💬 WebSocket RPC<br/>18 个方法"]
        EVT["📢 实时事件<br/>双频道推送"]
    end

    subgraph USAGE["使用场景"]
        direction TB
        U1["登录 / 换Token / 刷新"]
        U2["发消息 / 查会话 / 提交工具结果"]
        U3["流式输出 / 状态变更 / 离线恢复"]
    end

    HTTP --> U1
    RPC --> U2
    EVT --> U3

    style PROTOCOL fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style USAGE fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

## 协议分层

| 层 | 协议 | 用途 | 特点 |
|:--:|:----:|------|------|
| 🔐 **认证层** | HTTPS | OAuth2 授权码流程 | 标准 HTTP，兼容所有 OAuth2 Provider |
| 💬 **操作层** | WebSocket RPC | 会话、消息、Turn、RTC 操作 | 18 个方法，分为 Action 和 Query 两类 |
| 📢 **事件层** | WebSocket Pub/Sub | 实时状态推送 | 双频道（Topic + Live），支持离线恢复 |

## 认证层：HTTP API

处理用户登录和令牌管理，遵循标准 OAuth2 授权码流程。

```mermaid
sequenceDiagram
    actor User as 👤 用户
    participant FE as 🖥️ 前端
    participant Server as ⚙️ 服务端
    participant Provider as 🌐 OAuth2 Provider

    User->>FE: 点击登录
    FE->>Server: GET /oauth2/authorize
    Server-->>FE: 重定向 URL
    FE->>Provider: 跳转授权页
    User->>Provider: 授权
    Provider->>FE: 回调（携带 code）
    FE->>Server: POST /oauth2/token
    Server-->>FE: access_token + refresh_token
```

**3 个端点**覆盖完整认证生命周期：

| 端点 | 方法 | 功能 |
|------|:----:|------|
| `/oauth2/authorize` | GET | 获取 OAuth2 授权重定向 URL |
| `/oauth2/token` | POST | 授权码换取 access_token |
| `/oauth2/refresh` | POST | 刷新 access_token |

👉 [详细文档：HTTP API](/docs/protocol/http-api/)

## 操作层：WebSocket RPC

所有业务操作通过 WebSocket RPC 完成——发消息、查会话、提交工具结果，都在一条持久连接上。

```mermaid
flowchart LR
    subgraph ACTION["⚡ Action RPC（10 个）"]
        direction TB
        A1["创建 / 修改操作"]
        A2["响应包含 updates"]
        A3["支持幂等 client_id"]
    end

    subgraph QUERY["🔍 Query RPC（8 个）"]
        direction TB
        Q1["只读查询"]
        Q2["分页列表 / 单条获取"]
        Q3["不影响状态"]
    end

    style ACTION fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style QUERY fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

**4 个业务域，18 个方法**：

| 域 | Action | Query |
|:--:|:------:|:-----:|
| **Session** | `close` · `update` · `fork` · `compact` | `list` · `get` |
| **Message** | `send` | `list` · `get` |
| **Turn** | `stop` | `list` · `get` |
| **RTC** | `update_status` · `submit_result` | `list` · `get` |

👉 [详细文档：WebSocket RPC](/docs/protocol/rpc/)

## 事件层：实时事件

服务端通过 **双频道** 架构推送实时事件，兼顾可靠性和低延迟。

```mermaid
flowchart TD
    subgraph TOPIC["📬 Topic 频道"]
        direction TB
        T1["✅ 持久化"]
        T2["🔢 Offset 追踪"]
        T3["♻️ 离线恢复"]
    end

    subgraph LIVE["⚡ Live 频道"]
        direction TB
        L1["🚀 低延迟"]
        L2["📡 Redis PUB/SUB"]
        L3["💨 可接受丢失"]
    end

    TOPIC -->|"状态变更事件"| APP1["会话 / Turn / 消息创建更新"]
    LIVE -->|"流式中间 chunk"| APP2["打字机效果"]

    style TOPIC fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style LIVE fill:#fff3e0,stroke:#f57c00,stroke-width:2px
```

| 频道 | 用途 | 特性 |
|------|------|------|
| **Topic** | 状态变更事件 | 持久化、Offset 追踪、离线恢复 |
| **Live** | 流式消息中间 chunks | 非持久化、低延迟、即发即弃 |

👉 [详细文档：实时事件](/docs/protocol/events/)

## 数据流全景

```mermaid
flowchart LR
    subgraph CLIENT["🖥️ 客户端"]
        FE["前端应用"]
    end

    subgraph SERVER["⚙️ RTC Agent Server"]
        GW["WebSocket Gateway"]
        AGENT["Agent 引擎"]
    end

    subgraph LLM["🧠 AI 模型"]
        MODEL["LLM Provider"]
    end

    FE -->|"HTTP: OAuth2 登录"| GW
    FE <-->|"WebSocket: RPC + 事件"| GW
    GW --> AGENT
    AGENT -->|"推理请求"| MODEL
    MODEL -->|"tool_calls"| AGENT
    AGENT -->|"RTC 推送"| GW
    GW -->|"实时事件"| FE

    style CLIENT fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    style SERVER fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style LLM fill:#fff3e0,stroke:#f57c00,stroke-width:2px
```

## 下一步

- [HTTP API](/docs/protocol/http-api/) — OAuth2 认证端点的详细定义
- [WebSocket RPC](/docs/protocol/rpc/) — 18 个 RPC 方法的完整参考
- [实时事件](/docs/protocol/events/) — 双频道事件推送机制
- [架构总览](/docs/architecture/) — 了解 RTC Agent 的整体架构设计
