---
title: Real-Time Communication
description: RTC Agent's dual-channel real-time communication architecture — Topic ensures reliability, Live ensures speed — every word from AI delivered instantly.
---

**Real-Time Communication** is the foundation of the RTC Agent user experience. Built on Centrifuge WebSocket, the system uses a **dual-channel architecture**: the Topic channel ensures no messages are lost, and the Live channel ensures low-latency streaming output — reliability and speed, without compromising either.

## Dual-Channel Architecture

```mermaid
flowchart TD
    subgraph DUAL["📡 Dual-Channel Architecture"]
        direction LR
        TOPIC["📬 Topic Channel<br/>topic:u=userID"]
        LIVE["⚡ Live Channel<br/>live:u=userID"]
    end

    subgraph T_FEAT["Topic Features"]
        direction TB
        T1["📦 Persistent<br/>Written to database"]
        T2["🔢 Offset tracking<br/>Guaranteed continuity"]
        T3["🔄 Offline recovery<br/>Supports history catch-up"]
    end

    subgraph L_FEAT["Live Features"]
        direction TB
        L1["💨 Non-persistent<br/>Redis PUB/SUB"]
        L2["🔥 Fire and forget<br/>Loss is acceptable"]
        L3["⚡ Low latency<br/>Real-time push"]
    end

    TOPIC --> T_FEAT
    LIVE --> L_FEAT

    style DUAL fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    style T_FEAT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style L_FEAT fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| | Topic Channel | Live Channel |
|---|-----------|----------|
| **Purpose** | State change events | Streaming message intermediate chunks |
| **Persistence** | ✅ Written to database | ❌ Redis PUB/SUB |
| **Offset** | ✅ Strictly incrementing | ❌ None |
| **Offline Recovery** | ✅ Supported | ❌ Not supported |
| **Latency** | Lower (requires persistence) | Extremely low (in-memory forwarding) |

> 💡 Design principle: **Important messages go through Topic, speed-critical messages go through Live**. State changes must be delivered reliably, while losing one or two intermediate chunks of streaming output is harmless.

## Event Distribution

Different types of events are routed to different channels:

```mermaid
flowchart LR
    subgraph EVENTS["📨 Event Types"]
        E1["session.created/updated"]
        E2["turn.created/updated"]
        E3["message.created"]
        E4["message.updated (stream complete)"]
        E5["message.updated (stream intermediate chunk)"]
        E6["rtc.updated"]
    end

    subgraph T["📬 Topic"]
        T1["✅ session.created/updated"]
        T2["✅ turn.created/updated"]
        T3["✅ message.created"]
        T4["✅ message.updated (complete)"]
        T5["✅ rtc.updated"]
    end

    subgraph L["⚡ Live"]
        L1["✅ message.updated (intermediate chunk)"]
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

| Event Type | Topic | Live | Description |
|----------|:-----:|:----:|------|
| `session.created/updated` | ✅ | ❌ | Session state changes |
| `turn.created/updated` | ✅ | ❌ | Turn state changes |
| `message.created` | ✅ | ❌ | New message created |
| `message.updated` (stream complete) | ✅ | ❌ | Final state after stream completion |
| `message.updated` (stream intermediate chunk) | ❌ | ✅ | Intermediate fragments of streaming output |
| `rtc.updated` | ✅ | ❌ | RTC tool call state changes |

## Offset Mechanism

The Offset is the core of the Topic channel's reliability — each event is assigned a **strictly incrementing** sequence number. Clients detect lost messages by checking sequence continuity:

```mermaid
flowchart LR
    subgraph SERVER["🖥️ Server"]
        A["Publish event"] --> B["🔢 Atomically assign Offset<br/>n, n+1, n+2..."]
        B --> C["📦 Write to database"]
        C --> D["📤 Push to Topic"]
    end

    subgraph CLIENT["📱 Client"]
        D --> E["Receive event"]
        E --> F{"Check Offset<br/>continuity"}
        F -->|"✅ Continuous"| G["Process normally"]
        F -->|"❌ Gap"| H["📥 Fetch missing history"]
        H --> I["Continue after catch-up"]
    end

    style SERVER fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style CLIENT fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style F fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style H fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

| Feature | Description |
|------|------|
| **Strictly incrementing** | Each Topic event's Offset is greater than the previous one |
| **Gap detection** | When the client detects an Offset gap, it automatically fetches missing history |
| **No loss, no duplicates** | Guarantees messages are neither lost nor duplicated |

## Streaming Message Flow

AI model streaming output is the most frequently perceived real-time feature by users. The system achieves both real-time and reliable streaming through **Topic + Live collaboration**:

```mermaid
sequenceDiagram
    participant LLM as 🧠 AI Model
    participant Server as ⚙️ Server
    participant Redis as 📦 Redis
    participant Live as ⚡ Live Channel
    participant Topic as 📬 Topic Channel
    participant UI as 🖥️ Frontend

    LLM->>Server: First chunk
    Server->>Server: Create message record
    Server->>Topic: Push message.created
    Topic->>UI: Display message start

    loop Intermediate chunks
        LLM->>Server: Streaming chunk
        Server->>Redis: Buffer chunk
        Server->>Live: Push intermediate chunk
        Live->>UI: ⚡ Real-time display
    end

    LLM->>Server: Last chunk
    Server->>Redis: Read all chunks
    Server->>Server: Concatenate full content
    Server->>Server: Update database
    Server->>Topic: Push message.updated (complete)
    Topic->>UI: 📬 Update final state
```

| Phase | Channel | Action |
|------|------|------|
| First chunk | Topic | Create message record, push `message.created` |
| Intermediate chunks | Live | Append to Redis buffer, push to Live for real-time display |
| Last chunk | Topic | Concatenate full content, update database, push final state |

> 💡 **Why two steps?** The Live channel lets each chunk reach the frontend instantly, giving users a smooth typing effect. Finally, the Topic channel pushes the complete message, ensuring that even if Live lost some chunks, the final state is complete and correct.

## Offline Recovery

Network connections can't always be stable. The system provides different strategies for recovery after disconnection:

```mermaid
flowchart TD
    A["📱 Client reconnects"] --> B{"Check Offset"}
    B -->|"✅ Continuous"| C["Process directly<br/>No loss"]
    B -->|"❌ Gap"| D["📥 Fetch history<br/>Fill in gaps"]
    D --> E["Continue after catch-up"]
    E --> C

    F{"Epoch changed?"}
    F -->|"✅ Yes"| G["🗑️ Clear local Offset"]
    G --> H["📍 Start from latest position"]
    F -->|"❌ No"| I["Continue using<br/>current Offset"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style B fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style D fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style G fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style H fill:#ffe0b2,stroke:#e65100,stroke-width:2px
```

| Scenario | Behavior | User Perception |
|------|------|----------|
| 🟢 Brief disconnection | Messages from offline period are automatically pushed after reconnection | Nearly imperceptible |
| 🟡 Extended disconnection | Offset gap detected, proactively fetches history to fill in | Sees backfilled messages |
| 🔴 History cleaned up | Epoch changed, local Offset cleared, starts from latest position | Continues from current state |

**Epoch** is the timeline identifier for Offsets. When the server performs large-scale cleanup or rebuilding, the Epoch changes and clients need to reset their Offset to start from the latest position — because the old history no longer exists.

## Reconnection Mechanism

```mermaid
flowchart LR
    subgraph RECONNECT["🔄 Reconnection Behavior"]
        direction TB
        R1["Centrifuge SDK<br/>Auto-reconnect"] --> R2["Token refresh"]
        R2 --> R3{"Refresh successful?"}
        R3 -->|"✅ Yes"| R4["🔗 Restore connection<br/>Restore Offset"]
        R3 -->|"❌ No"| R5["🔐 Re-login required"]
    end

    subgraph PERSIST["💾 Offset Persistence"]
        direction TB
        P1["Offset written to<br/>IndexedDB"] --> P2["Auto-restore after<br/>page refresh"]
    end

    R4 --> PERSIST

    style RECONNECT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style PERSIST fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style R4 fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
    style R5 fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

| Mechanism | Description |
|------|------|
| **Auto-reconnect** | Centrifuge SDK built-in reconnection with exponential backoff |
| **Token refresh** | Automatically refreshes authentication token when connection is restored |
| **Offset persistence** | Offset is stored in IndexedDB and restored after page refresh |
| **Fallback strategy** | User must re-login when token refresh fails |

> 📌 Offset persistence to IndexedDB means: even if the user closes the browser tab and reopens it, they can continue receiving messages from where they left off, without missing any updates.

## Architecture Overview

```mermaid
flowchart TD
    subgraph FRONTEND["🖥️ Frontend"]
        FE["Centrifuge SDK<br/>+ IndexedDB"]
    end

    subgraph BACKEND["⚙️ Server"]
        PUB["Event Publisher"]
    end

    subgraph INFRA["🏗️ Infrastructure"]
        CENT["Centrifuge Server<br/>WebSocket"]
        REDIS["📦 Redis<br/>PUB/SUB + Buffering"]
        DB[("🗄️ Database<br/>Message persistence")]
    end

    FE -->|"WebSocket"| CENT
    CENT --> PUB
    PUB -->|"State events"| DB
    PUB -->|"Topic events"| DB
    PUB -->|"Live events"| REDIS
    REDIS -->|"Intermediate chunks"| CENT

    style FRONTEND fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style BACKEND fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style INFRA fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

## Next Steps

- [Remote Tool Calling](/docs/concepts/rtc/) — Learn about the core protocol carried by real-time communication
- [Session Management](/docs/en/features/session/) — Learn how real-time events are organized within sessions
- [Context Management](/docs/en/features/context-management/) — Learn how messages are intelligently compressed
