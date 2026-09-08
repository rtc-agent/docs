---
title: Session Management
description: Sessions are containers for user-AI conversations — create, switch, fork, close, and the local-first data strategy.
---

A **Session** is a container for user-AI conversations. Each session independently manages its own message history and execution state. Users can freely create, switch, and rename sessions, and can also **fork** a new session based on any historical message.

## Session States

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Idle: Create session

    Idle --> Active: Send message / Resume turn
    Active --> Idle: Turn completed / Interrupted / Failed

    Idle --> Closed: Close session
    Active --> Closed: Close session

    Closed --> [*]

    state Active {
        [*] --> Executing
        Executing --> AI_Inferring: LLM processing
        AI_Inferring --> Waiting_for_Tool: RTC call
        Waiting_for_Tool --> AI_Inferring: Tool result returned
        AI_Inferring --> [*]: Completed
    }
```

| State | Meaning | Available Actions |
|:-----:|---------|-------------------|
| 🟢 `Idle` | Idle, ready to send new messages | Send message, Close |
| 🔵 `Active` | Turn is executing | Stop turn, Close |
| ⚫ `Closed` | Closed, no further writes allowed | View history, Fork |

## Session Operations

```mermaid
flowchart TD
    subgraph CREATE["🆕 Create"]
        C1["Send first message<br/>→ Auto-created"]
        C2["Click new button<br/>→ Create empty session"]
    end

    subgraph MANAGE["📋 Manage"]
        M1["📑 List<br/>Cursor pagination, reverse chronological"]
        M2["🔄 Switch<br/>Load corresponding message history"]
        M3["✏️ Rename<br/>Modify session title"]
    end

    subgraph ADVANCED["🔀 Advanced"]
        A1["🌿 Fork<br/>Create branch from a message"]
        A2["🔒 Close<br/>Freeze session, stop execution"]
    end

    style CREATE fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style MANAGE fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style ADVANCED fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

| Operation | Description |
|-----------|-------------|
| **Create** | Auto-created when sending the first message — no dedicated RPC; can also click the new button to create an empty session (purely frontend-local) |
| **List** | Reverse chronological by creation time, cursor-paginated |
| **Switch** | Pure frontend behavior, no RPC — loads message history from local IndexedDB |
| **Rename** | Modify the session title |
| **Fork** | Copy history based on a specific message, replace that message's content, and trigger a new AI flow |
| **Close** | Mark as `Closed` and stop the currently executing turn |

## Session Title

```mermaid
flowchart LR
    A["📝 Session Title"] --> B["🤖 Auto-generated"]
    A --> C["✏️ Manual Rename"]
    A --> D["🌿 Fork Inheritance"]

    B --> B1["Take first 50 chars of first message"]
    C --> C1["User-initiated modification"]
    D --> D1["New session inherits original title<br/>+ marked as fork"]

    style B fill:#e3f2fd,stroke:#1565c0
    style C fill:#fff9c4,stroke:#f9a825
    style D fill:#f3e5f5,stroke:#7b1fa2
```

## Session Forking

Forking is a signature feature of RTC Agent — **unsatisfied with a previous answer? Edit the question and regenerate.**

```mermaid
flowchart LR
    subgraph BEFORE["Original Session"]
        direction TB
        M1["💬 Message 1"]
        M2["💬 Message 2"]
        M3["💬 Message 3"]
        M4["💬 Message 4 ← Fork from here"]
        M5["💬 Message 5"]
    end

    subgraph AFTER["New Session (Fork)"]
        direction TB
        N1["💬 Message 1 (copied)"]
        N2["💬 Message 2 (copied)"]
        N3["💬 Message 3 (copied)"]
        N4["💬 Message 4' (modified content)"]
        N5["🤖 AI regenerates..."]
    end

    M4 -.->|"Copy history<br/>Replace this message"| N4

    style BEFORE fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style AFTER fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

Fork process:

| Step | Description |
|------|-------------|
| 1. Select message | Click on any historical message |
| 2. Click fork | Trigger the fork operation |
| 3. Copy history | Copy all messages before the selected message |
| 4. Replace content | Replace the selected message with new content |
| 5. Trigger AI | AI reprocesses based on the new content |

## Concurrency Constraints

```mermaid
flowchart TD
    subgraph SESSION["📋 Same Session"]
        T1["🟢 Turn 1 (executing)"]
        T2["⏳ Turn 2 (queued)"]
        T3["⏳ Turn 3 (queued)"]
    end

    T1 -->|"After completion"| T2
    T2 -->|"After completion"| T3

    style T1 fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style T2 fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style T3 fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| Constraint | Description |
|------------|-------------|
| **Single Turn Execution** | Only one turn can execute at a time per session |
| **Ownership Isolation** | Users can only operate on their own sessions |
| **Closed = Frozen** | Closed sessions cannot accept new messages |

## Local-First

RTC Agent adopts a **Local-First** data strategy — all operations are written locally first, then asynchronously synced to the server.

```mermaid
flowchart TD
    A["👤 User Action"] --> B["💾 Write to IndexedDB"]
    B --> C["✅ Return immediately<br/>UI updated"]
    B --> D["📤 Background sync to server"]
    D --> E{"Sync result?"}
    E -->|"✅ Success"| F["Mark as synced"]
    E -->|"❌ Failed"| G["Mark as failed<br/>Retry supported"]

    style B fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style F fill:#c8e6c9,stroke:#2e7d32
    style G fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

| Advantage | Description |
|-----------|-------------|
| ⚡ **Instant Response** | Returns after writing locally, no network wait |
| 📴 **Offline Capable** | Operations work offline, auto-sync on reconnection |
| 🔄 **Auto Retry** | Failed syncs marked as `failed`, manual retry supported |

## Real-time Updates

The server pushes session changes via WebSocket, and the frontend syncs automatically:

```mermaid
sequenceDiagram
    participant Server as ⚙️ Server
    participant WS as 🔌 WebSocket
    participant FE as 🖥️ Frontend
    participant IDB as 💾 IndexedDB

    Server->>WS: Session change event
    WS->>FE: Push update
    FE->>IDB: Sync to local storage
    FE->>FE: Update UI
```

Pushed change types:

| Event | Description |
|-------|-------------|
| Created | A new session was created (e.g., auto-created) |
| Updated | Session title modified, state changed |
| Closed | Session was closed |

## Next Steps

- [Messaging](/docs/en/features/messaging/) — Learn about message interactions within sessions
- [Remote Tool Calling](/docs/en/concepts/rtc/) — Learn about tool calling within turns
- [Command System](/docs/en/features/commands/) — Learn about session-level commands (/compact, /loop, /goal)
