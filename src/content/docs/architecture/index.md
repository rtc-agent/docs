---
title: 架构总览
description: RTC Agent 的整体架构——浏览器端虚拟文件系统、服务端 Agent 引擎、LLM 推理的三方协作全景。
---

RTC Agent 的架构由三部分组成：**浏览器 / 前端**（虚拟文件系统 + Web Component）、**RTC Agent Server**（Agent 引擎 + 上下文管理 + 实时通信）、**LLM Provider**（AI 推理）。

## 全景架构

```mermaid
flowchart LR
    subgraph BROWSER["🖥️ 浏览器 / 前端"]
        direction TB
        UI["👤 Web Component<br/>&lt;rtc-agent&gt;"]
        WS["🔌 WebSocket Client"]
        SCRIPT["🔑 script 工具"]
        TOOLS["⚙️ 基础工具<br/>ls / read / write / grep / find"]
        VFS[("💾 虚拟文件系统<br/>IndexedDB")]
        FX["📦 Function 库"]
    end

    subgraph SERVER["⚙️ RTC Agent Server"]
        direction TB
        GW["🌐 WebSocket Gateway"]
        AUTH["🔐 认证"]
        CTX["🗜️ 上下文管理"]
        MEM["🧠 记忆系统"]
        AGENT["🤖 Agent 引擎"]
        WS2["📋 Workspace"]
    end

    LLM["🧠 LLM Provider"]

    UI -->|用户消息| GW
    GW --> AUTH --> CTX
    CTX -.->|注入记忆| MEM
    CTX --> AGENT
    AGENT -.->|加载 Functions| WS2
    AGENT -->|推理请求| LLM
    LLM -->|tool_calls| AGENT
    AGENT -->|script 调用| GW
    GW <-->|WebSocket| WS
    WS --> SCRIPT
    SCRIPT -->|组合调用| FX
    SCRIPT -->|读写| VFS
    WS --> TOOLS
    TOOLS -->|读写| VFS
    SCRIPT -->|结果| WS
    AGENT -->|响应| GW
    GW -->|流式输出| UI

    style BROWSER fill:#e1f5fe,stroke:#0288d1,stroke-width:3px
    style SERVER fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px
    style LLM fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    style VFS fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
    style SCRIPT fill:#ffeb3b,stroke:#f9a825,stroke-width:2px,color:#000
```

## 核心设计原则

```mermaid
flowchart TD
    subgraph PRINCIPLES["🏗️ 设计原则"]
        direction TB
        P1["🔐 隐私优先<br/>数据不离开浏览器"]
        P2["🧩 文件系统即接口<br/>LLM 天然理解文件操作"]
        P3["⚡ 实时同步<br/>双向 WebSocket 推送"]
        P4["♻️ 弹性恢复<br/>Checkpoint 保证可靠性"]
    end

    style PRINCIPLES fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| 原则 | 实现方式 | 用户价值 |
|------|----------|----------|
| 🔐 **隐私优先** | 文件操作在前端执行，数据存于 IndexedDB | 敏感数据不上传服务器 |
| 🧩 **文件系统即接口** | AI 通过 `ls`/`read`/`write`/`grep` 操作业务 | 开发者只需维护 Function 文档 |
| ⚡ **实时同步** | Centrifuge 双频道推送 | 用户全程可见 AI 的每一步 |
| ♻️ **弹性恢复** | Redis Checkpoint + 100% 送达保证 | 断网、重启无感知 |

## 请求处理流程

```mermaid
sequenceDiagram
    actor User as 👤 用户
    participant FE as 🖥️ 前端
    participant GW as 🌐 Gateway
    participant CTX as 🗜️ 上下文
    participant MEM as 🧠 记忆
    participant AGENT as 🤖 Agent
    participant LLM as 🧠 LLM

    User->>FE: 发送消息
    FE->>GW: WebSocket RPC
    GW->>CTX: 构建上下文
    CTX->>MEM: 注入用户记忆
    MEM-->>CTX: 返回记忆片段
    CTX->>AGENT: 组装 Prompt
    AGENT->>LLM: 推理请求
    LLM-->>AGENT: 流式响应

    alt 需要调用工具
        LLM-->>AGENT: tool_call
        AGENT-->>GW: 推送 RTC
        GW-->>FE: WebSocket 事件
        FE->>FE: 前端执行工具
        FE-->>GW: 提交结果
        GW-->>AGENT: 恢复推理
        AGENT->>LLM: 继续推理（带工具结果）
    end

    AGENT-->>GW: 流式输出
    GW-->>FE: 实时推送
    FE-->>User: 显示回复
```

## 技术栈

| 层 | 技术 | 用途 |
|:--:|:----:|------|
| **后端** | Go 1.27 | 主服务语言 |
| **数据库** | PostgreSQL + GORM | 持久化存储 |
| **缓存** | Redis | Checkpoint、流式缓冲、Pub/Sub |
| **实时通信** | Centrifuge WebSocket | 双向推送 |
| **AI 框架** | Anthropic SDK + Eino | Agent 引擎 |
| **前端** | Lit Web Components | 组件化 UI |
| **可观测** | OpenTelemetry + Jaeger + Prometheus | 追踪 + 指标 |

## 架构子页面

```mermaid
flowchart LR
    subgraph PAGES["📖 详细架构文档"]
        direction TB
        FE_PAGE["🖥️ 前端架构<br/>Web Components<br/>16 个组件 · 9 个 Controller"]
        BE_PAGE["⚙️ 后端架构<br/>Go 服务<br/>Gateway · Agent · Context · Memory"]
    end

    style PAGES fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style FE_PAGE fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    style BE_PAGE fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

## 下一步

- [前端架构](/docs/architecture/frontend/) — Web Components 组件体系、状态管理、窗口系统
- [后端架构](/docs/architecture/backend/) — Go 服务分层、Agent 引擎、上下文管理
- [Remote Tool Calling](/docs/concepts/rtc/) — 了解核心协议的工作机制
- [协议总览](/docs/protocol/) — 了解通信协议的完整定义
