---
title: Architecture Overview
description: RTC Agent overall architecture — the three-way collaboration between the browser-side virtual file system, the server-side Agent engine, and the LLM provider.
---

RTC Agent's architecture consists of three parts: **Browser / Frontend** (virtual file system + Web Component), **RTC Agent Server** (Agent engine + context management + real-time communication), and **LLM Provider** (AI reasoning).

## Full Architecture

```mermaid
flowchart LR
    subgraph BROWSER["🖥️ Browser / Frontend"]
        direction TB
        UI["👤 Web Component<br/>&lt;rtc-agent&gt;"]
        WS["🔌 WebSocket Client"]
        SCRIPT["🔑 script tool"]
        TOOLS["⚙️ Basic Tools<br/>ls / read / write / grep / find"]
        VFS[("💾 Virtual File System<br/>IndexedDB")]
        FX["📦 Function Library"]
    end

    subgraph SERVER["⚙️ RTC Agent Server"]
        direction TB
        GW["🌐 WebSocket Gateway"]
        AUTH["🔐 Auth"]
        CTX["🗜️ Context Manager"]
        MEM["🧠 Memory System"]
        AGENT["🤖 Agent Engine"]
        REG["📋 Function Registry"]
    end

    LLM["🧠 LLM Provider"]

    UI -->|User message| GW
    GW --> AUTH --> CTX
    CTX -.->|Inject memory| MEM
    CTX --> AGENT
    AGENT -.->|Query Function definitions| REG
    AGENT -->|Inference request| LLM
    LLM -->|tool_calls| AGENT
    AGENT -->|script call| GW
    GW <-->|WebSocket| WS
    WS --> SCRIPT
    SCRIPT -->|Compose calls| FX
    SCRIPT -->|Read/Write| VFS
    WS --> TOOLS
    TOOLS -->|Read/Write| VFS
    SCRIPT -->|Results| WS
    AGENT -->|Response| GW
    GW -->|Streaming output| UI

    style BROWSER fill:#e1f5fe,stroke:#0288d1,stroke-width:3px
    style SERVER fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px
    style LLM fill:#fff3e0,stroke:#f57c00,stroke-width:3px
    style VFS fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
    style SCRIPT fill:#ffeb3b,stroke:#f9a825,stroke-width:2px,color:#000
```

> **Function Registry**: Function metadata (name, parameter Schema, description) registered by developers via `agentConfig` or `defineRegistry`, stored as Markdown files in the `/functions/` directory of the virtual file system. The Agent engine discovers available business capabilities by reading these files. See [Skill System](/docs/en/features/skill-system).

## Core Design Principles

| Principle | Implementation | User Value |
| --- | --- | --- |
| 🔐 **Privacy First** | File operations execute on the frontend; data stored in IndexedDB | Sensitive data is never uploaded to the server |
| 🧩 **File System as Interface** | AI operates business logic via `ls`/`read`/`write`/`grep` | Developers only need to maintain Function documentation |
| ⚡ **Real-Time Sync** | Centrifuge dual-channel push | Users can see every step the AI takes |
| ♻️ **Resilient Recovery** | Redis Checkpoint + 100% delivery guarantee | Network disconnections and restarts are seamless |

> **Why "File System as Interface"?** LLMs naturally understand file operations (`ls`, `cat`, `grep`) — no need to learn custom APIs. Developers just write a Markdown document for each Function, and the Agent can automatically discover and compose calls — lower integration cost and higher observability compared to traditional RPC registration.

## Request Processing Flow

```mermaid
sequenceDiagram
    actor User as 👤 User
    participant FE as 🖥️ Frontend
    participant GW as 🌐 Gateway
    participant CTX as 🗜️ Context
    participant MEM as 🧠 Memory
    participant AGENT as 🤖 Agent
    participant LLM as 🧠 LLM

    User->>FE: Send message
    FE->>GW: WebSocket RPC
    GW->>CTX: Build context
    CTX->>MEM: Retrieve user memory
    MEM-->>CTX: Return memory fragments
    CTX->>AGENT: Assemble prompt
    AGENT->>LLM: Inference request
    LLM-->>AGENT: Streaming response

    alt Tool call needed
        LLM-->>AGENT: tool_call
        AGENT-->>GW: Push RTC event
        GW-->>FE: WebSocket event
        FE->>FE: Confirm → Execute tool
        Note over FE: script calls Function<br/>or basic tools operate on VFS
        FE-->>GW: Submit result
        GW-->>AGENT: Restore Checkpoint, resume reasoning
        AGENT->>LLM: Continue reasoning with tool result
    end

    AGENT-->>GW: Streaming output
    GW-->>FE: Real-time push
    FE-->>User: Display reply
```

## Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| **Backend** | Go 1.27 | Main service language |
| **Database** | PostgreSQL + GORM | Persistent storage |
| **Cache** | Redis | Checkpoint, streaming buffer, Pub/Sub |
| **Real-Time Communication** | Centrifuge WebSocket | Bidirectional push |
| **AI Framework** | Anthropic SDK + Eino | Agent engine |
| **Frontend** | Lit Web Components | Componentized UI |
| **Observability** | OpenTelemetry + Jaeger + Prometheus | Tracing + Metrics |

## Architecture Sub-Pages

```mermaid
flowchart LR
    subgraph PAGES["📖 Detailed Architecture Docs"]
        direction TB
        FE_PAGE["🖥️ Frontend Architecture<br/>Web Components<br/>16 Components · 9 Controllers"]
        BE_PAGE["⚙️ Backend Architecture<br/>Go Service<br/>Gateway · Agent · Context · Memory"]
    end

    style PAGES fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style FE_PAGE fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    style BE_PAGE fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

## Next Steps

- [Frontend Architecture](/docs/en/architecture/frontend) — Web Components system, state management, window system
- [Backend Architecture](/docs/en/architecture/backend) — Go service layers, Agent engine, context management
- [Remote Tool Calling](/docs/en/concepts/rtc) — Learn how the core protocol works
- [Protocol Overview](/docs/en/protocol) — Full definition of the communication protocol
