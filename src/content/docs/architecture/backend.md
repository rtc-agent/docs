---
title: 后端架构
description: RTC Agent 的后端架构——Go 服务分层，WebSocket Gateway、Agent 引擎、上下文管理、记忆系统、RTC 处理器的协作机制。
---

RTC Agent Server 是一个 **Go 服务**，负责 AI 推理编排、上下文管理、实时通信和工具调用调度。核心组件包括 WebSocket Gateway、Agent 引擎、上下文管理、记忆系统和 RTC 处理器。

## 服务分层

```mermaid
flowchart TD
    subgraph LAYERS["🏗️ 服务分层"]
        direction TB
        L1["🌐 接入层<br/>WebSocket Gateway · OAuth2"]
        L2["📋 用例层<br/>Session · Message · Turn · RTC"]
        L3["🤖 领域层<br/>Agent 引擎 · 上下文 · 记忆"]
        L4["💾 基础设施层<br/>PostgreSQL · Redis · Centrifuge"]
    end

    L1 --> L2 --> L3 --> L4

    style LAYERS fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style L1 fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style L2 fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style L3 fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style L4 fill:#fce4ec,stroke:#c62828,stroke-width:2px
```

| 层 | 职责 | 关键模块 |
|:--:|------|----------|
| 🌐 **接入层** | 协议适配、认证鉴权 | WebSocket Gateway、OAuth2 Handler |
| 📋 **用例层** | 业务编排、RPC 处理 | Session / Message / Turn / RTC 用例 |
| 🤖 **领域层** | AI 推理、状态管理 | Agent 引擎、上下文管理、记忆系统 |
| 💾 **基础设施层** | 数据持久化、消息传递 | PostgreSQL、Redis、Centrifuge |

---

## 核心组件

```mermaid
flowchart LR
    subgraph CORE["⚙️ 核心组件"]
        direction TB
        GW["🌐 WebSocket Gateway<br/>协议适配 · 连接管理"]
        AGENT["🤖 Agent 引擎<br/>推理编排 · 工具调度"]
        CTX["🗜️ 上下文管理<br/>Prompt 组装 · 自动压缩"]
        MEM["🧠 记忆系统<br/>Session Memory · User Memory"]
        RTC_P["🔧 RTC 处理器<br/>Checkpoint · 恢复"]
    end

    subgraph INFRA["💾 基础设施"]
        direction TB
        PG[("PostgreSQL<br/>持久化存储")]
        RD[("Redis<br/>缓存 · 队列 · Pub/Sub")]
        CF["Centrifuge<br/>实时推送"]
    end

    GW --> AGENT
    AGENT --> CTX
    CTX --> MEM
    AGENT --> RTC_P
    RTC_P --> RD
    GW --> CF
    AGENT --> PG
    CTX --> PG

    style CORE fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style INFRA fill:#fce4ec,stroke:#c62828,stroke-width:2px
```

### WebSocket Gateway

Gateway 是前后端通信的入口，管理所有 WebSocket 连接和 RPC 路由。

| 职责 | 说明 |
|------|------|
| **连接管理** | 处理 WebSocket 建连、鉴权、心跳、断线 |
| **RPC 路由** | 将 18 个 RPC 方法分发到对应的用例处理 |
| **事件推送** | 将 Agent 产生的事件通过 Centrifuge 推送到前端 |
| **RTC 中转** | 将 AI 的工具调用请求转发到前端，接收执行结果 |

```mermaid
flowchart LR
    subgraph GW_FLOW["Gateway 请求处理"]
        direction TB
        A["📥 WebSocket 消息"] --> B["🔐 鉴权"]
        B --> C["📋 RPC 解析"]
        C --> D{"方法类型？"}
        D -->|"Action"| E["⚡ 用例处理<br/>+ 生成 updates"]
        D -->|"Query"| F["🔍 数据查询"]
        E --> G["📤 响应 + updates"]
        F --> G
    end

    style GW_FLOW fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

### Agent 引擎

Agent 引擎是 AI 推理的核心——组装 Prompt、调用 LLM、处理工具调用、管理推理循环。

```mermaid
flowchart TD
    subgraph AGENT_FLOW["🤖 Agent 推理循环"]
        direction TB
        A["📋 组装 Prompt"] --> B["🧠 调用 LLM"]
        B --> C{"响应类型？"}
        C -->|"文本回复"| D["📤 流式输出"]
        C -->|"tool_call"| E["🔧 创建 RTC"]
        E --> F["📦 保存 Checkpoint"]
        F --> G["⏸️ 暂停 Turn"]
        G --> H["📤 推送 RTC 到前端"]
        H --> I["⏳ 等待结果"]
        I --> J["♻️ 恢复 Checkpoint"]
        J --> A
    end

    style AGENT_FLOW fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style E fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style F fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
```

| 能力 | 说明 |
|------|------|
| **推理循环** | 调用 LLM → 处理响应 → 工具调用 → 继续推理，直到生成最终回复 |
| **工具调度** | 管理 6 个内置工具（ls / read / write / grep / find / script） |
| **流式输出** | 实时将 LLM 输出推送到前端 |
| **子代理** | 复杂任务自动拆解，多个专业子代理并行工作 |

### 上下文管理

上下文管理负责构建发送给 LLM 的完整 Prompt，并在对话过长时自动压缩。

```mermaid
flowchart LR
    subgraph CTX_FLOW["🗜️ 上下文构建"]
        direction TB
        A["📋 系统 Prompt"] --> D["🧩 组装"]
        B["🧠 记忆注入"] --> D
        C["💬 历史消息"] --> D
        D --> E{"Token 超限？"}
        E -->|"✅ 否"| F["📤 发送给 LLM"]
        E -->|"❌ 是"| G["🗜️ 自动压缩"]
        G --> F
    end

    style CTX_FLOW fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style G fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| 功能 | 说明 |
|------|------|
| **Prompt 组装** | 系统提示 + 记忆 + AGENT.md + 历史消息 |
| **自动压缩** | 上下文接近 Token 限制时，自动摘要早期对话 |
| **手动压缩** | 通过 `v1.session.compact` RPC 触发 |
| **记忆注入** | 从记忆系统检索相关片段注入上下文 |

### 记忆系统

双层记忆架构，让 AI 同时拥有短期和长期记忆。

```mermaid
flowchart TD
    subgraph MEMORY["🧠 双层记忆"]
        direction TB
        SM["📋 Session Memory<br/>会话上下文压缩"]
        UM["🧬 User Memory<br/>跨会话长期记忆"]
    end

    SM -->|"当前会话的摘要"| CTX["上下文"]
    UM -->|"向量检索<br/>相关记忆片段"| CTX

    style MEMORY fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style SM fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style UM fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| 类型 | 范围 | 存储 | 用途 |
|------|:----:|:----:|------|
| **Session Memory** | 单会话 | 数据库 | 长对话的上下文压缩摘要 |
| **User Memory** | 跨会话 | 向量数据库 | 用户偏好、历史事实的长期记忆 |

### RTC 处理器

RTC 处理器管理工具调用的完整生命周期——从创建 RTC 记录到保存 Checkpoint、暂停 Turn、等待结果、恢复推理。

```mermaid
flowchart LR
    subgraph RTC_FLOW["🔧 RTC 处理流程"]
        direction TB
        A["🧠 LLM 请求工具"] --> B["📝 创建 RTC 记录"]
        B --> C["📦 保存 Checkpoint<br/>到 Redis"]
        C --> D["⏸️ 暂停 Turn"]
        D --> E["📤 推送到前端"]
        E --> F["⏳ 等待结果<br/>（TTL 24h）"]
        F --> G["📥 收到结果"]
        G --> H["♻️ 从 Checkpoint 恢复"]
        H --> I["🧠 继续推理"]
    end

    style RTC_FLOW fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style C fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    style H fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| 特性 | 说明 |
|------|------|
| **Checkpoint** | 保存当前推理状态到 Redis，TTL 24 小时 |
| **崩溃恢复** | 服务端重启后可从 Checkpoint 恢复 |
| **串行执行** | 同一会话内 RTC 严格串行，避免文件冲突 |
| **100% 送达** | 前端结果提交无限重试，幂等保证 |

---

## 实时通信层

```mermaid
flowchart TD
    subgraph COMM["📡 实时通信"]
        direction TB
        CF["Centrifuge<br/>WebSocket 服务"]

        CF --> TOPIC["📬 Topic 频道<br/>持久化事件"]
        CF --> LIVE["⚡ Live 频道<br/>流式 chunks"]
    end

    subgraph BACKEND["后端集成"]
        direction TB
        UPD["Update 系统<br/>事件生成"]
        PUB["发布器<br/>推送到频道"]
    end

    UPD --> PUB --> CF

    style COMM fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style BACKEND fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| 组件 | 职责 |
|------|------|
| **Centrifuge** | WebSocket 服务端，管理频道订阅和消息分发 |
| **Update 系统** | 每次数据变更生成 Update 事件 |
| **Redis PUB/SUB** | Live 频道的底层传输，低延迟即发即弃 |

---

## 技术栈

| 组件 | 技术 | 用途 |
|------|:----:|------|
| **语言** | Go 1.27 | 主服务语言 |
| **CLI** | Cobra | 命令行框架 |
| **ORM** | GORM | 数据库操作 |
| **数据库** | PostgreSQL | 持久化存储 |
| **缓存** | Redis | Checkpoint、缓冲、Pub/Sub |
| **实时通信** | Centrifuge | WebSocket 服务 |
| **AI SDK** | Anthropic SDK + Eino | Agent 推理 |
| **可观测** | OpenTelemetry + Jaeger | 分布式追踪 |
| **指标** | Prometheus | 监控指标 |

## 下一步

- [前端架构](/docs/architecture/frontend/) — 了解 Web Components 组件体系
- [架构总览](/docs/architecture/) — 返回架构全景
- [Remote Tool Calling](/docs/concepts/rtc/) — 了解 RTC 工具调用的完整机制
- [WebSocket RPC](/docs/protocol/rpc/) — 了解 RPC 方法的详细定义
