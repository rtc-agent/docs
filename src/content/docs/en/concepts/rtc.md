---
title: Remote Tool Calling
description: The core protocol of RTC Agent — AI reasons on the server, tools execute on the frontend, and data never leaves the user's browser.
---

**Remote Tool Calling (RTC)** is the core protocol of RTC Agent. It reverses the traditional invocation direction: instead of the frontend calling backend APIs, **AI calls frontend tools** — file read/write, script execution, and business API calls all happen within the user's browser.

## Why RTC

```mermaid
flowchart LR
    subgraph TRADITIONAL["Traditional Approach"]
        direction TB
        A1["Frontend"] -->|"Request"| A2["Backend"]
        A2 -->|"Call Tool"| A3["Tool Execution<br/>on Server"]
        A3 -->|"Result + Data"| A2
        A2 -->|"Response"| A1
    end

    subgraph RTC["RTC Approach"]
        direction TB
        B1["Frontend<br/>🔐 Data stays local"] -->|"User Message"| B2["Backend<br/>🤖 AI Reasoning"]
        B2 -->|"tool_call"| B1
        B1 -->|"Tool Execution<br/>on Frontend"| B1
        B1 -->|"Execution Result"| B2
    end

    style TRADITIONAL fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style RTC fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| | Traditional | RTC |
|---|---------|-----|
| **Tool Execution** | Server | Frontend |
| **Data Flow** | To the cloud 🔒 | Stays on user's device 🔐 |
| **Privacy** | Data passes through server | End-to-end, data never leaves the browser |
| **Observability** | Black box | Fully visible to the user |

## Full Lifecycle

A single RTC call goes through the following steps:

```mermaid
sequenceDiagram
    actor User as 👤 User
    participant FE as 🖥️ Frontend
    participant Server as ⚙️ Server
    participant Redis as 📦 Redis
    participant LLM as 🧠 AI Model

    LLM->>Server: 1. Request to call tool
    Server->>Server: 2. Create RTC record
    Server->>Redis: 3. Save Checkpoint
    Server->>Server: 4. Suspend Turn

    Server-->>FE: 5. Push RTC event

    alt User confirmation required
        FE->>User: 6a. Show confirmation dialog
        User->>FE: Approve / Reject
    end

    FE->>FE: 7. Execute tool locally
    FE->>Server: 8. Submit execution result
    Server->>Redis: 9. Restore Checkpoint
    Server->>LLM: 10. Continue reasoning (with tool result)
```

> 💡 **Key Design**: After pushing the RTC, the server **suspends** the Turn and saves a Checkpoint to Redis. Even if the server restarts, it can recover from the Checkpoint — the user is completely unaware.

## Built-in Tools

The RTC protocol defines **6 built-in tools** covering file system operations and script execution:

| Tool | Function | Key Parameters |
|:----:|------|----------|
| 🔍 `ls` | List directory contents | `path` (default `/`) |
| 📖 `read` | Read file contents | `path`, `offset` / `limit` (pagination) |
| ✏️ `write` | Write to file | `path`, `content`, `mode` (overwrite / append) |
| 🔎 `grep` | Search by content | `pattern` (regex), `path` |
| 📁 `find` | Search by name | `pattern` (glob), `path` |
| ⚡ `script` | Execute JavaScript | `action` (save / run / eval), `code` |

These 6 tools give the AI a **complete file operation interface** — operating on the frontend virtual file system just like working with a local terminal.

## State Machine

Each RTC call has a well-defined lifecycle state:

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Pending: Create RTC

    Pending --> Sent: Push to frontend
    Sent --> Executing: Start execution

    Executing --> Completed: Execution successful ✅
    Executing --> Failed: Execution failed ❌
    Executing --> Timeout: Execution timed out ⏱️
    Executing --> Rejected: User rejected 🚫

    Completed --> [*]
    Failed --> [*]
    Timeout --> [*]
    Rejected --> [*]

    state Executing {
        [*] --> InProgress
        InProgress --> ResultReported
        ResultReported --> [*]: 100% delivered
    }
```

| State | Prompt Seen by AI | Description |
|:----:|:------------:|------|
| `Pending` | `[Tool Pending]` | Waiting for frontend to receive |
| `Sent` | `[Tool Pending]` | Delivered to frontend |
| `Executing` | `[Tool Pending]` | Currently executing |
| `Completed` | Tool output | Execution successful, result returned |
| `Failed` | `[Tool Error]` | Execution failed |
| `Timeout` | `[Tool Timeout]` | Execution timed out |
| `Rejected` | `[Tool Rejected]` | User rejected execution |

## Permission Matrix

Different **work modes** determine whether tool execution requires user confirmation. See [Work Modes](/docs/en/concepts/work-modes/#permission-matrix) for the full permission matrix.

> 📌 **Core Principle**: Read-only operations are always safely allowed; `write` only requires confirmation in the highest-alertness mode; `script` can execute arbitrary code, so it requires user confirmation in all modes except bypass.

## Checkpoint Mechanism

The core reliability guarantee of RTC is the **Checkpoint**:

```mermaid
flowchart LR
    A["🧠 AI requests tool"] --> B["📦 Save Checkpoint<br/>to Redis"]
    B --> C["⏸️ Turn Suspended"]
    C --> D["⏳ Waiting for frontend<br/>execution (could be a while)"]
    D --> E["📤 Submit result"]
    E --> F["♻️ Restore from Checkpoint"]
    F --> G["🧠 AI continues reasoning"]

    style B fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style C fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    style F fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| Feature | Description |
|------|------|
| **Storage Location** | Redis, TTL 24 hours |
| **Crash Recovery** | Can recover from Checkpoint after server restart |
| **User Experience** | Perceived as "AI waiting for tool result before continuing" |

## Reliability Guarantee

RTC result reporting follows the **100% delivery** principle:

```mermaid
flowchart TD
    A["🔧 Tool execution complete"] --> B["📤 Submit result to server"]
    B --> C{"Success?"}
    C -->|"✅ Yes"| D["🎉 Done"]
    C -->|"❌ No"| E["Mark as submission failed"]
    E --> F["⏳ Wait for retry"]
    F --> B

    style D fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
    style E fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

**Why must it be 100% delivered?** Because the AI is waiting for the tool result to continue reasoning. If the result is lost, the AI will wait indefinitely.

| Mechanism | Description |
|------|------|
| **Infinite Retry** | Failed submissions are automatically retried, with no give-up mechanism |
| **Idempotency Guarantee** | Repeated submissions with the same `client_id` return success |
| **Exponential Backoff** | Retry intervals: 1s → 2s → 4s → ... → capped at 30s |

## Sequential Execution

RTC calls within the same session are **strictly serialized** to avoid file conflicts caused by concurrency:

```mermaid
flowchart LR
    RTC1["RTC 1<br/>📖 read /config"] -->|Complete| RTC2["RTC 2<br/>✏️ write /config"]
    RTC2 -->|Complete| RTC3["RTC 3<br/>⚡ script"]
    RTC3 -->|Complete| RTC4["🧠 AI continues reasoning"]

    style RTC1 fill:#e3f2fd,stroke:#1565c0
    style RTC2 fill:#e3f2fd,stroke:#1565c0
    style RTC3 fill:#e3f2fd,stroke:#1565c0
    style RTC4 fill:#e8f5e9,stroke:#388e3c
```

> The next RTC is processed only after the current one completes. This is transparent to the user — the AI naturally completes each operation in sequence.

## Next Steps

- [Virtual File System](/docs/en/concepts/virtual-fs/) — Learn about the file system that RTC tools operate on
- [Work Modes](/docs/en/concepts/work-modes/) — Learn about the mode switching behind the permission matrix
- [Session Management](/docs/en/features/session/) — Learn about RTC context within sessions
