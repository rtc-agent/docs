---
title: 实时通信
description: RTC Agent 的双频道实时通信架构——Topic 保可靠、Live 保速度，让 AI 的每一个字都即时送达。
---

**实时通信** 是 RTC Agent 用户体验的基石。基于 Centrifuge WebSocket，系统采用 **双频道架构**：Topic 频道确保消息不丢失，Live 频道确保流式输出低延迟——可靠与速度，一个都不少。

## 双频道架构

```mermaid
flowchart TD
    subgraph DUAL["📡 双频道架构"]
        direction LR
        TOPIC["📬 Topic 频道<br/>topic:u=userID"]
        LIVE["⚡ Live 频道<br/>live:u=userID"]
    end

    subgraph T_FEAT["Topic 特性"]
        direction TB
        T1["📦 持久化<br/>写入数据库"]
        T2["🔢 Offset 追踪<br/>保证连续性"]
        T3["🔄 离线恢复<br/>支持历史补全"]
    end

    subgraph L_FEAT["Live 特性"]
        direction TB
        L1["💨 非持久化<br/>Redis PUB/SUB"]
        L2["🔥 即发即弃<br/>可接受丢失"]
        L3["⚡ 低延迟<br/>实时推送"]
    end

    TOPIC --> T_FEAT
    LIVE --> L_FEAT

    style DUAL fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    style T_FEAT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style L_FEAT fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| | Topic 频道 | Live 频道 |
|---|-----------|----------|
| **用途** | 状态变更事件 | 流式消息中间 chunks |
| **持久化** | ✅ 写入数据库 | ❌ Redis PUB/SUB |
| **Offset** | ✅ 严格递增 | ❌ 无 |
| **离线恢复** | ✅ 支持 | ❌ 不支持 |
| **延迟** | 较低（需持久化） | 极低（内存转发） |

> 💡 设计思路：**重要的事走 Topic，求快的事走 Live**。状态变更必须可靠送达，而流式输出的中间 chunk 丢一两个也无妨。

## 事件分布

不同类型的事件走不同的频道：

```mermaid
flowchart LR
    subgraph EVENTS["📨 事件类型"]
        E1["session.created/updated"]
        E2["turn.created/updated"]
        E3["message.created"]
        E4["message.updated（流完成）"]
        E5["message.updated（流中间 chunk）"]
        E6["rtc.updated"]
    end

    subgraph T["📬 Topic"]
        T1["✅ session.created/updated"]
        T2["✅ turn.created/updated"]
        T3["✅ message.created"]
        T4["✅ message.updated（完成）"]
        T5["✅ rtc.updated"]
    end

    subgraph L["⚡ Live"]
        L1["✅ message.updated（中间 chunk）"]
    end

    E1 --> T
    E2 --> T
    E3 --> T
    E4 --> T
    E5 --> L
    E6 --> T

    style EVENTS fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px
    style T fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style L fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| 事件类型 | Topic | Live | 说明 |
|----------|:-----:|:----:|------|
| `session.created/updated` | ✅ | ❌ | 会话状态变更 |
| `turn.created/updated` | ✅ | ❌ | 轮次状态变更 |
| `message.created` | ✅ | ❌ | 新消息创建 |
| `message.updated`（流完成） | ✅ | ❌ | 流式输出完成后的最终状态 |
| `message.updated`（流中间 chunk） | ❌ | ✅ | 流式输出的中间片段 |
| `rtc.updated` | ✅ | ❌ | RTC 工具调用状态变更 |

## Offset 机制

Offset 是 Topic 频道可靠性的核心——每个事件分配一个 **严格递增** 的序号，客户端通过检测序号连续性来发现丢失的消息：

```mermaid
flowchart LR
    subgraph SERVER["🖥️ 服务端"]
        A["发布事件"] --> B["🔢 原子分配 Offset<br/>n, n+1, n+2..."]
        B --> C["📦 写入数据库"]
        C --> D["📤 推送到 Topic"]
    end

    subgraph CLIENT["📱 客户端"]
        D --> E["接收事件"]
        E --> F{"检测 Offset<br/>连续性"}
        F -->|"✅ 连续"| G["正常处理"]
        F -->|"❌ 跳跃"| H["📥 拉取缺失历史"]
        H --> I["补全后继续"]
    end

    style SERVER fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style CLIENT fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style F fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style H fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

| 特性 | 说明 |
|------|------|
| **严格递增** | 每个 Topic 事件的 Offset 都大于前一个 |
| **Gap 检测** | 客户端发现 Offset 跳跃时，自动拉取缺失历史 |
| **不丢不重** | 保证消息不丢失、不重复 |

## 流式消息流程

AI 模型的流式输出是用户最常感知的实时功能。系统通过 **Topic + Live 协作** 实现既实时又可靠的流式推送：

```mermaid
sequenceDiagram
    participant LLM as 🧠 AI 模型
    participant Server as ⚙️ 服务端
    participant Redis as 📦 Redis
    participant Live as ⚡ Live 频道
    participant Topic as 📬 Topic 频道
    participant UI as 🖥️ 前端

    LLM->>Server: 第一个 chunk
    Server->>Server: 创建消息记录
    Server->>Topic: 推送 message.created
    Topic->>UI: 显示消息开始

    loop 中间 chunks
        LLM->>Server: 流式 chunk
        Server->>Redis: 缓冲 chunk
        Server->>Live: 推送中间 chunk
        Live->>UI: ⚡ 实时显示
    end

    LLM->>Server: 最后一个 chunk
    Server->>Redis: 读取所有 chunks
    Server->>Server: 拼接完整内容
    Server->>Server: 更新数据库
    Server->>Topic: 推送 message.updated（完成）
    Topic->>UI: 📬 更新最终状态
```

| 阶段 | 频道 | 动作 |
|------|------|------|
| 第一个 chunk | Topic | 创建消息记录，推送 `message.created` |
| 中间 chunks | Live | 追加到 Redis 缓冲，推送到 Live 实时显示 |
| 最后一个 chunk | Topic | 拼接完整内容，更新数据库，推送最终状态 |

> 💡 **为什么分两步？** Live 频道让每个 chunk 即时到达前端，用户看到流畅的打字效果；最后通过 Topic 频道推送完整消息，确保即使 Live 丢失了某些 chunk，最终状态也是完整正确的。

## 离线恢复

网络不可能永远稳定。系统在断网恢复时提供不同策略：

```mermaid
flowchart TD
    A["📱 客户端重连"] --> B{"检测 Offset"}
    B -->|"✅ 连续"| C["直接处理<br/>无丢失"]
    B -->|"❌ 跳跃"| D["📥 拉取历史<br/>补全缺失"]
    D --> E["补全后继续"]
    E --> C

    F{"Epoch 变更？"}
    F -->|"✅ 是"| G["🗑️ 清空本地 Offset"]
    G --> H["📍 从最新位置开始"]
    F -->|"❌ 否"| I["继续使用<br/>当前 Offset"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style B fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style D fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style G fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style H fill:#ffe0b2,stroke:#e65100,stroke-width:2px
```

| 场景 | 行为 | 用户感知 |
|------|------|----------|
| 🟢 短暂断网 | 重连后自动推送离线期间的消息 | 几乎无感知 |
| 🟡 长时间断网 | 检测 Offset 跳跃，主动拉取历史补全 | 看到补齐的消息 |
| 🔴 历史被清理 | Epoch 变更，清空本地 Offset，从最新位置开始 | 从当前状态继续 |

**Epoch** 是 Offset 的时间线标识。当服务端进行大规模清理或重建时，Epoch 会变更，客户端需要重置 Offset 从最新位置开始——因为旧历史已经不存在了。

## 重连机制

```mermaid
flowchart LR
    subgraph RECONNECT["🔄 重连行为"]
        direction TB
        R1["Centrifuge SDK<br/>自动重连"] --> R2["Token 刷新"]
        R2 --> R3{"刷新成功？"}
        R3 -->|"✅ 是"| R4["🔗 恢复连接<br/>恢复 Offset"]
        R3 -->|"❌ 否"| R5["🔐 需重新登录"]
    end

    subgraph PERSIST["💾 Offset 持久化"]
        direction TB
        P1["Offset 写入<br/>IndexedDB"] --> P2["页面刷新后<br/>自动恢复"]
    end

    R4 --> PERSIST

    style RECONNECT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style PERSIST fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style R4 fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
    style R5 fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

| 机制 | 说明 |
|------|------|
| **自动重连** | Centrifuge SDK 内置断线重连，指数退避 |
| **Token 刷新** | 连接恢复时自动刷新认证 Token |
| **Offset 持久化** | Offset 存储在 IndexedDB，页面刷新后恢复 |
| **降级策略** | Token 刷新失败时需要用户重新登录 |

> 📌 Offset 持久化到 IndexedDB 意味着：即使用户关闭了浏览器标签页再打开，也能从上次的位置继续接收消息，不会错过任何更新。

## 架构全景

```mermaid
flowchart TD
    subgraph FRONTEND["🖥️ 前端"]
        FE["Centrifuge SDK<br/>+ IndexedDB"]
    end

    subgraph BACKEND["⚙️ 服务端"]
        PUB["事件发布器"]
    end

    subgraph INFRA["🏗️ 基础设施"]
        CENT["Centrifuge Server<br/>WebSocket"]
        REDIS["📦 Redis<br/>PUB/SUB + 缓冲"]
        DB[("🗄️ 数据库<br/>消息持久化")]
    end

    FE -->|"WebSocket"| CENT
    CENT --> PUB
    PUB -->|"状态事件"| DB
    PUB -->|"Topic 事件"| DB
    PUB -->|"Live 事件"| REDIS
    REDIS -->|"中间 chunks"| CENT

    style FRONTEND fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style BACKEND fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style INFRA fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

## 下一步

- [Remote Tool Calling](/docs/concepts/rtc/) — 了解实时通信承载的核心协议
- [会话管理](/docs/features/session/) — 了解实时事件在会话中的组织方式
- [上下文管理](/docs/features/context-management/) — 了解消息如何被智能压缩
