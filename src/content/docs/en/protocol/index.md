---
title: Protocol Overview
description: A panoramic view of the RTC Agent communication protocol — HTTP API handles authentication, WebSocket RPC handles business operations, and real-time events keep frontend and backend in sync.
---

The RTC Agent protocol consists of three layers, each with its own role: **HTTP API** handles authentication, **WebSocket RPC** handles all business operations, and **real-time events** drive frontend-backend state synchronization.

```mermaid
flowchart TD
    subgraph PROTOCOL["📡 RTC Agent Protocol"]
        direction TB
        HTTP["🔐 HTTP API<br/>OAuth2 Auth"]
        RPC["💬 WebSocket RPC<br/>18 Methods"]
        EVT["📢 Real-Time Events<br/>Dual-Channel Push"]
    end

    subgraph USAGE["Use Cases"]
        direction TB
        U1["Login / Exchange Token / Refresh"]
        U2["Send Message / Query Session / Submit Tool Result"]
        U3["Streaming Output / State Change / Offline Recovery"]
    end

    HTTP --> U1
    RPC --> U2
    EVT --> U3

    style PROTOCOL fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style USAGE fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

## Protocol Layers

| Layer | Protocol | Purpose | Features |
|:--:|:----:|------|------|
| 🔐 **Auth Layer** | HTTPS | OAuth2 authorization code flow | Standard HTTP, compatible with all OAuth2 Providers |
| 💬 **Operation Layer** | WebSocket RPC | Session, Message, Turn, RTC operations | 18 methods, divided into Action and Query types |
| 📢 **Event Layer** | WebSocket Pub/Sub | Real-time state push | Dual-channel (Topic + Live), supports offline recovery |

## Auth Layer: HTTP API

Handles user login and token management, following the standard OAuth2 authorization code flow.

```mermaid
sequenceDiagram
    actor User as 👤 User
    participant FE as 🖥️ Frontend
    participant Server as ⚙️ Server
    participant Provider as 🌐 OAuth2 Provider

    User->>FE: Click login
    FE->>Server: GET /oauth2/authorize
    Server-->>FE: Redirect URL
    FE->>Provider: Navigate to authorization page
    User->>Provider: Grant authorization
    Provider->>FE: Callback (with code)
    FE->>Server: POST /oauth2/token
    Server-->>FE: access_token + refresh_token
```

**3 endpoints** cover the complete authentication lifecycle:

| Endpoint | Method | Function |
|------|:----:|------|
| `/oauth2/authorize` | GET | Get OAuth2 authorization redirect URL |
| `/oauth2/token` | POST | Exchange authorization code for access_token |
| `/oauth2/refresh` | POST | Refresh access_token |

👉 [Detailed docs: HTTP API](/docs/en/protocol/http-api/)

## Operation Layer: WebSocket RPC

All business operations are performed over WebSocket RPC — sending messages, querying sessions, submitting tool results — all on a single persistent connection.

```mermaid
flowchart LR
    subgraph ACTION["⚡ Action RPC (10)"]
        direction TB
        A1["Create / Modify operations"]
        A2["Response includes updates"]
        A3["Supports idempotent client_id"]
    end

    subgraph QUERY["🔍 Query RPC (8)"]
        direction TB
        Q1["Read-only queries"]
        Q2["Paginated list / Single item fetch"]
        Q3["Does not affect state"]
    end

    style ACTION fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style QUERY fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

**4 business domains, 18 methods**:

| Domain | Action | Query |
|:--:|:------:|:-----:|
| **Session** | `close` · `update` · `fork` · `compact` | `list` · `get` |
| **Message** | `send` | `list` · `get` |
| **Turn** | `stop` | `list` · `get` |
| **RTC** | `update_status` · `submit_result` | `list` · `get` |

👉 [Detailed docs: WebSocket RPC](/docs/en/protocol/rpc/)

## Event Layer: Real-Time Events

The server pushes real-time events through a **dual-channel** architecture, balancing reliability and low latency.

```mermaid
flowchart TD
    subgraph TOPIC["📬 Topic Channel"]
        direction TB
        T1["✅ Persisted"]
        T2["🔢 Offset tracking"]
        T3["♻️ Offline recovery"]
    end

    subgraph LIVE["⚡ Live Channel"]
        direction TB
        L1["🚀 Low latency"]
        L2["📡 Redis PUB/SUB"]
        L3["💨 Acceptable loss"]
    end

    TOPIC -->|"State change events"| APP1["Session / Turn / Message create & update"]
    LIVE -->|"Streaming intermediate chunks"| APP2["Typewriter effect"]

    style TOPIC fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style LIVE fill:#fff3e0,stroke:#f57c00,stroke-width:2px
```

| Channel | Purpose | Features |
|------|------|------|
| **Topic** | State change events | Persisted, Offset tracking, Offline recovery |
| **Live** | Streaming message intermediate chunks | Non-persisted, low latency, fire-and-forget |

👉 [Detailed docs: Real-Time Events](/docs/en/protocol/events/)

## Data Flow Panorama

```mermaid
flowchart LR
    subgraph CLIENT["🖥️ Client"]
        FE["Frontend App"]
    end

    subgraph SERVER["⚙️ RTC Agent Server"]
        GW["WebSocket Gateway"]
        AGENT["Agent Engine"]
    end

    subgraph LLM["🧠 AI Model"]
        MODEL["LLM Provider"]
    end

    FE -->|"HTTP: OAuth2 Login"| GW
    FE <-->|"WebSocket: RPC + Events"| GW
    GW --> AGENT
    AGENT -->|"Inference request"| MODEL
    MODEL -->|"tool_calls"| AGENT
    AGENT -->|"RTC push"| GW
    GW -->|"Real-time events"| FE

    style CLIENT fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    style SERVER fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style LLM fill:#fff3e0,stroke:#f57c00,stroke-width:2px
```

## Next Steps

- [HTTP API](/docs/en/protocol/http-api/) — Detailed definition of OAuth2 authentication endpoints
- [WebSocket RPC](/docs/en/protocol/rpc/) — Complete reference for all 18 RPC methods
- [Real-Time Events](/docs/en/protocol/events/) — Dual-channel event push mechanism
- [Architecture Overview](/docs/en/architecture/) — Learn about the overall architecture design of RTC Agent
