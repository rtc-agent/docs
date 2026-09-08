---
title: Real-Time Events
description: RTC Agent real-time event push mechanism — Topic/Live dual-channel architecture, Offset guarantees no message loss, supports offline recovery and streaming output.
---

RTC Agent pushes real-time events via **Centrifuge WebSocket**, using a **dual-channel architecture**: the Topic channel ensures reliability, while the Live channel provides low latency. The frontend updates local state upon receiving events, achieving real-time frontend-backend synchronization.

## Dual-Channel Architecture

```mermaid
flowchart TD
    subgraph PUB["📡 Server Publishing"]
        EVT["Event generated"]
    end

    EVT --> TOPIC
    EVT --> LIVE

    subgraph TOPIC["📬 Topic Channel"]
        direction TB
        T1["✅ Persisted<br/>Written to database"]
        T2["🔢 Offset tracking<br/>Ensures continuity"]
        T3["♻️ Offline recovery<br/>Supports history backfill"]
    end

    subgraph LIVE["⚡ Live Channel"]
        direction TB
        L1["🚀 Non-persisted<br/>Redis PUB/SUB"]
        L2["💨 Fire-and-forget<br/>Acceptable loss"]
        L3["📉 Low latency<br/>Real-time push"]
    end

    style TOPIC fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style LIVE fill:#fff3e0,stroke:#f57c00,stroke-width:2px
```

| Channel | Identifier | Storage | Purpose | Features |
|------|------|:----:|------|------|
| **Topic** | `topic:u=<userID>` | Persisted | State change events | Reliable, ordered, supports offline recovery |
| **Live** | `live:u=<userID>` | Non-persisted | Streaming message intermediate chunks | Low latency, fire-and-forget |

> 💡 **Why two channels?** State changes (e.g., message creation, Turn completion) must not be lost — they need persistence and ordering guarantees. But streaming intermediate chunks only need to "arrive as fast as possible" — it's fine if one is lost, because the complete message will eventually be received. Handling them separately leverages the strengths of each.

---

## Event Distribution

| Event Type | Topic Channel | Live Channel | Description |
|---------|:----------:|:---------:|------|
| `session.created` | ✅ | ❌ | Session created |
| `session.updated` | ✅ | ❌ | Session updated (title, status, etc.) |
| `turn.created` | ✅ | ❌ | Turn created |
| `turn.updated` | ✅ | ❌ | Turn state changed |
| `message.created` | ✅ | ❌ | Message created |
| `message.updated` (stream complete) | ✅ | ❌ | Final complete version of a streamed message |
| `message.updated` (stream intermediate chunk) | ❌ | ✅ | Real-time fragments for the typewriter effect |
| `rtc.created` | ❌ | ❌ | Reserved (not currently emitted) |
| `rtc.updated` | ✅ | ❌ | RTC state changed |

```mermaid
flowchart LR
    subgraph EVENTS["Event Routing"]
        direction TB
        S["State events"] -->|"Persisted<br/>Ordered"| TOPIC_CH["📬 Topic"]
        C["Streaming chunks"] -->|"Fire-and-forget<br/>Low latency"| LIVE_CH["⚡ Live"]
    end

    TOPIC_CH --> APP1["Frontend state sync"]
    LIVE_CH --> APP2["Real-time typewriter effect"]

    style EVENTS fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

---

## Update Model

Each event is an **Update** — describing changes to an entity (Session / Turn / Message / RTC):

```json
{
  "id": "update-uuid",
  "items": [
    { "entity": "message", "action": "created", "entity_id": "msg-uuid" }
  ],
  "data_list": [{ "id": "msg-uuid", "role": "assistant", "..." : "..." }],
  "offset": 42
}
```

| Field | Type | Description |
|------|:----:|------|
| `id` | UUID | Update unique identifier |
| `items` | array | List of change entries |
| `items[].entity` | string | Entity type: `session` / `turn` / `message` / `rtc` (`file` is reserved, currently unused) |
| `items[].action` | string | Action type: `created` / `updated` (`deleted` is reserved, currently unused; deletion is expressed via `deleted_at` in `data_list`) |
| `items[].entity_id` | UUID | Entity ID |
| `data_list` | array | Complete entity data (optional, corresponds one-to-one with items) |
| `offset` | integer | Monotonically increasing offset per user |

```mermaid
flowchart TD
    A["📦 Update"] --> B["items<br/>Change description"]
    A --> C["data_list<br/>Entity data"]
    A --> D["offset<br/>Sequence identifier"]

    B --> B1["entity: which entity"]
    B --> B2["action: what was done"]
    B --> B3["entity_id: who changed"]

    style A fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style B fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style D fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

---

## Offset Mechanism

**Offset** is the core guarantee for event reliability — each Topic event is assigned a strictly increasing Offset, and the client detects lost events by checking Offset continuity.

```mermaid
flowchart TD
    subgraph SERVER["Server"]
        direction TB
        A["Event generated"] --> B["Atomically assign Offset"]
        B --> C["Write to database"]
        C --> D["Push to Topic channel"]
    end

    subgraph CLIENT["Client"]
        direction TB
        E["Receive event"] --> F{"Offset contiguous?"}
        F -->|"✅ Contiguous"| G["Process normally"]
        F -->|"❌ Gap"| H["Fetch missing history"]
        H --> I["Backfill, then continue processing"]
    end

    D --> E

    style SERVER fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style CLIENT fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
```

| Feature | Description |
|------|------|
| **Monotonically increasing** | Topic event Offsets for the same user are strictly increasing |
| **Continuity detection** | Client automatically backfills when an Offset gap is detected |
| **Persisted** | Offset is stored in IndexedDB, restored after page refresh |
| **Epoch mechanism** | When historical data is cleaned up, the Epoch changes and the client starts from the latest position |
| **Gap placeholder** | During offline recovery, the server sends `{"type": "gap", "data": {}}` events to fill Offset gaps; the client only advances the Offset without any business processing |

> 💡 **Analogy**: Offset is like the numbering on letters. If you receive letters #1, #2, and #4, you realize #3 is missing — then you go to the post office to claim it.

---

## Streaming Message Flow

AI replies use streaming output. Intermediate chunks are pushed in real-time via the Live channel, and the final complete message is delivered via the Topic channel to ensure reliability.

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
    Topic->>UI: Display message skeleton

    loop Intermediate chunks
        LLM->>Server: Streaming chunk
        Server->>Redis: Buffer chunk
        Server->>Live: Push intermediate chunk
        Live->>UI: Display in real-time (typewriter effect)
    end

    LLM->>Server: Stream ends
    Server->>Redis: Read all chunks
    Server->>Server: Assemble complete content
    Server->>Server: Update database
    Server->>Topic: Push message.updated (complete version)
    Topic->>UI: Replace with final content
```

| Phase | Channel | Behavior |
|------|:----:|------|
| **First chunk** | Topic | Create message record, push `message.created`, also write to Redis buffer |
| **Intermediate chunks** | Live | Append to Redis buffer, push to Live channel for real-time display |
| **Stream ends** | Topic | Read all chunks from Redis, assemble complete content, update database, push `message.updated` |

---

## Offline Recovery

After a client reconnects following a network disconnection, the system automatically checks the Offset and backfills missing events.

```mermaid
flowchart TD
    A["🔌 Client reconnects"] --> B{"Check Offset"}
    B -->|"✅ Contiguous"| C["Process new events directly"]
    B -->|"❌ Gap"| D["Fetch missing history"]
    D --> E["Backfill missing events"]
    E --> C

    F{"Epoch changed?"}
    F -->|"✅ Yes"| G["Clear local Offset"]
    G --> H["Start from latest position"]
    F -->|"❌ No"| I["Keep current Offset"]

    style C fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
    style D fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style G fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

| Scenario | Behavior | User Perception |
|------|------|----------|
| **Brief disconnection** | Automatically pushes messages from the offline period | Seamless; messages appear automatically |
| **Extended disconnection** | Detects Offset gap, fetches history | Short loading, then messages are filled in |
| **History cleaned up** | Epoch changes, starts from the latest position | Historical messages no longer displayed |

## Reconnection Behavior

```mermaid
flowchart LR
    A["🔌 Disconnected"] --> B["📡 Centrifuge SDK<br/>Auto-reconnect"]
    B --> C{"Token valid?"}
    C -->|"✅ Yes"| D["🔄 Resume connection<br/>Backfill offline events"]
    C -->|"❌ Expired"| E["🔑 Attempt to refresh Token"]
    E --> F{"Refresh successful?"}
    F -->|"✅ Yes"| D
    F -->|"❌ No"| G["🔐 Re-login required"]

    style D fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
    style G fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

| Component | Responsibility |
|------|------|
| **Centrifuge SDK** | Auto-reconnection, Token refresh |
| **IndexedDB** | Persist Offset, restore after page refresh |
| **Topic Channel** | Ensures offline events are not lost |

## Next Steps

- [WebSocket RPC](/docs/en/protocol/rpc/) — Learn how to perform business operations via RPC
- [Remote Tool Calling](/docs/concepts/rtc/) — Learn about the full RTC tool call lifecycle
- [Protocol Overview](/docs/en/protocol/) — Return to the protocol panorama
