---
title: Context Management
description: RTC Agent's three-layer compression mechanism — from tool result cleanup to full summarization — ensuring conversations never hit the context ceiling.
---

**Context Management** is the key to sustaining long conversations. As conversations grow longer and tool outputs accumulate, the system intelligently manages the context window through a **three-layer compression mechanism** — retaining critical information, freeing up precious space, and keeping the conversation unbroken.

## Three-Layer Compression Architecture

```mermaid
flowchart TD
    subgraph LAYERS["📦 Three-Layer Compression"]
        direction TB
        L1["🔹 Layer 1: Microcompact<br/>Tool result cleanup"]
        L2["🔸 Layer 2: Auto Compact<br/>Automatic summary compression"]
        L3["🔹 Layer 3: Session Memory Compact<br/>Session memory compression"]
    end

    L1 -->|"Running out of space"| L2
    L2 -->|"Has Session Memory"| L3
    L2 -->|"No Session Memory"| L2B["🧠 Call LLM to generate summary"]

    subgraph SCOPE["Compression Granularity"]
        direction LR
        S1["🎯 Fine-grained<br/>Single tool result"]
        S2["📄 Medium<br/>A batch of messages"]
        S3["📋 Efficient<br/>Full memory summary"]
    end

    L1 --> S1
    L2 --> S2
    L3 --> S3

    style LAYERS fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    style SCOPE fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px
    style L1 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style L2 fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style L3 fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| Layer | Name | Trigger | Compression Granularity | Cost |
|:----:|------|----------|----------|:----:|
| 1 | Microcompact | Time interval / Cached edits / API native | Single tool result | Zero |
| 2 | Auto Compact | Token count reaches threshold | A batch of messages → summary | One LLM call |
| 3 | Session Memory Compact | When Auto Compact is triggered | Session memory → summary | Zero |

## Microcompact — Tool Result Cleanup

Microcompact is the lightest form of compression — it doesn't generate summaries, it simply cleans up old tool results that take up a lot of space.

### Cleanable Tools

Only tools that produce large outputs are cleaned:

| Tool | Typical Output |
|:----:|----------|
| 📖 `Read` | File contents |
| ⚡ `Bash` / `PowerShell` | Command output |
| 🔍 `Grep` | Search results |
| 📁 `Glob` | File listings |
| 🌐 `WebSearch` / `WebFetch` | Web page content |
| ✏️ `Edit` / 📝 `Write` | Operation results |

### Three Cleanup Strategies

```mermaid
flowchart TD
    REQ["📤 Before Request"] --> A{"Time-based<br/>Interval > 60 minutes?"}
    A -->|"✅ Yes"| A1["Clean old tool results<br/>Keep most recent 5"]
    A -->|"❌ No"| B{"Cached MC<br/>enabled?"}
    B -->|"✅ Yes"| B1["Clean via cache_edits<br/>(without breaking cache)"]
    B -->|"❌ No"| C{"API-level<br/>enabled?"}
    C -->|"✅ Yes"| C1["Use context_management<br/>native API cleanup"]
    C -->|"❌ No"| SKIP["⏭️ Skip microcompact"]

    A1 --> SEND["📤 Send Request"]
    B1 --> SEND
    C1 --> SEND
    SKIP --> SEND

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style B fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style SKIP fill:#f5f5f5,stroke:#9e9e9e,stroke-width:2px
    style SEND fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
```

| Strategy | Trigger | Mechanism | Use Case |
|------|----------|------|----------|
| 🕐 Time-based | Last assistant message > 60 minutes ago | Directly replace old tool results with placeholders | User returns after stepping away |
| 💾 Cached | Cache is still valid | Use `cache_edits` to tell the API to remove specific results | When cache hasn't expired |
| 🔌 API-level | Tokens >= 180,000 | Use Anthropic's native `context_management` | Approaching context limit |

> 💡 The time-based strategy retains at least 1 recent tool result to prevent the model from completely losing its working context.

## Auto Compact — Automatic Summary Compression

When microcompact isn't enough, Auto Compact kicks in — compressing a batch of old messages into a concise summary.

### Trigger Conditions

Using a 200K context window model as an example:

```mermaid
flowchart LR
    W["📏 Context Window<br/>200,000 tokens"] --> E["Subtract reserved output<br/>- 20,000"]
    E --> T["Subtract buffer<br/>- 13,000"]
    T --> TH["Threshold = 167,000 tokens"]

    TH --> CHECK{"Current tokens >= threshold?"}
    CHECK -->|"✅ Yes"| COMPACT["🗜️ Trigger compression"]
    CHECK -->|"❌ No"| CONT["🔄 Continue conversation"]

    style W fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style TH fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style COMPACT fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style CONT fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| Configuration | Value | Description |
|--------|:--:|------|
| `MAX_OUTPUT_TOKENS_FOR_SUMMARY` | 20,000 | Reserved space for model output |
| `AUTOCOMPACT_BUFFER_TOKENS` | 13,000 | Safety buffer |
| **Trigger threshold** (200K model) | **167,000** | Compression is triggered when this value is reached |

### Circuit Breaker

After 3 consecutive failures, automatic compression attempts are stopped to avoid wasting resources in unrecoverable scenarios:

```mermaid
flowchart LR
    F1["❌ Failure 1"] --> F2["❌ Failure 2"]
    F2 --> F3["❌ Failure 3"]
    F3 --> STOP["⛔ Stop auto-compression"]

    style F1 fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style F2 fill:#ffe0b2,stroke:#e65100,stroke-width:2px
    style F3 fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style STOP fill:#f44336,stroke:#b71c1c,stroke-width:2px,color:#fff
```

### Compression Prompt

Auto Compact uses a **9-part structured** prompt to ensure the summary covers all critical dimensions:

| # | Section | Content |
|:----:|------|------|
| 1 | Primary Request and Intent | The user's core request and intent |
| 2 | Key Technical Concepts | Key technical concepts involved |
| 3 | Files and Code Sections | Relevant files and code snippets (including full code) |
| 4 | Errors and Fixes | Errors encountered and their fixes |
| 5 | Problem Solving | Problem-solving process |
| 6 | All User Messages | All user messages (excluding tool results) |
| 7 | Pending Tasks | Tasks awaiting completion |
| 8 | Current Work | What is currently being worked on |
| 9 | Optional Next Step | Optional next action |

### Message Retention Policy

Compression doesn't discard all old messages — it **retains recent messages**:

| Configuration | Value | Description |
|--------|:--:|------|
| `minTokens` | 10,000 | Minimum tokens to retain |
| `minTextBlockMessages` | 5 | Minimum messages with text blocks to retain |
| `maxTokens` | 40,000 | Maximum tokens to retain |

```mermaid
flowchart LR
    A["📝 Calculate retention range<br/>from end backwards"] --> B{"Conditions met?"}
    B -->|"tokens >= 10K<br/>and messages >= 5"| C["✅ Stop retaining"]
    B -->|"tokens >= 40K"| D["⛔ Reached upper limit<br/>Stop retaining"]
    B -->|"Neither met"| E["◀️ Continue retaining backwards"]
    E --> B

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style D fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style E fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

> 📌 **API invariant protection**: `tool_result` entries in retained messages must have corresponding `tool_use` entries. During compression, the retention range is extended backwards to ensure pairs remain complete.

## Session Memory Compact

When [Memory System](/docs/en/features/memory/) has Session Memory entries, compression can be completed at **zero cost**:

```mermaid
flowchart TD
    A["⚡ Auto Compact Triggered"] --> B{"Session Memory<br/>exists?"}
    B -->|"✅ Yes"| C["📋 Use Session Memory<br/>directly as summary"]
    B -->|"❌ No"| D["🧠 Call LLM<br/>to generate summary"]
    C --> E["💰 Zero cost + Higher quality"]
    D --> F["💸 One API call"]
    E --> G["🔄 Replace old messages + Retain recent messages"]
    F --> G

    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style D fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style E fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
    style F fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

This is exactly the **convergence point** of the memory system and context management — Session Memory, continuously accumulated during the conversation, becomes a high-quality summary at compression time without requiring an additional LLM call.

## Post-Compression Context Recovery

After compression, the system automatically re-injects recently read files to help the model quickly return to its working state:

| Configuration | Value | Description |
|--------|:--:|------|
| Max files to recover | 5 | The 5 most recently read files |
| Total token budget | 50,000 | Total limit for all recovered files |
| Per-file token limit | 5,000 | Maximum tokens per file |

## System Prompt Assembly

The system prompt is divided into **static** and **dynamic** parts. The static part can be globally cached to reduce costs:

```mermaid
flowchart TD
    subgraph STATIC["🔒 Static Part (Cacheable)"]
        direction TB
        S1["Base system prompt<br/>Identity, security, tool guidelines"]
        S2["Tool Schema definitions<br/>Cached once per session"]
        S3["Agent definitions<br/>Default prompts"]
    end

    subgraph DYNAMIC["🔄 Dynamic Part (Per request)"]
        direction TB
        D1["📅 Current date"]
        D2["🔀 Git status snapshot"]
        D3["📝 Custom prompts"]
        D4["📋 Memory injection"]
        D5["📎 Attachment content"]
    end

    STATIC --> CACHE["💾 Prompt Cache"]
    DYNAMIC --> REQ["📤 API Request"]
    CACHE --> REQ

    style STATIC fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style DYNAMIC fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style CACHE fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style REQ fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
```

**Prompt priority** (highest to lowest):

| Priority | Source | Description |
|:------:|------|------|
| 1 | `overrideSystemPrompt` | Replaces all other prompts |
| 2 | Coordinator system prompt | Coordinator mode |
| 3 | Agent system prompt | Replaces default when agent definition exists |
| 4 | Custom system prompt | `--system-prompt` parameter |
| 5 | Default system prompt | Standard system prompt |
| 6 | `appendSystemPrompt` | Always appended to the end |

## Message Assembly Pipeline

Before each API call, messages go through a complete assembly pipeline:

```mermaid
flowchart TD
    A["📝 Raw message history"] --> B["Filter<br/>Messages after compression boundary"]
    B --> C["Trim<br/>Enforce tool result size limits"]
    C --> D["Remove<br/>Old messages"]
    D --> E["🔹 Microcompact<br/>Compress tool results"]
    E --> F["Fold<br/>Context folding"]
    F --> G["🔸 Auto Compact<br/>Full compression"]
    G --> H["Inject<br/>CLAUDE.md + Date"]
    H --> I["📤 API Call"]
    I --> J["📎 Add attachment messages"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style E fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style G fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style I fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    style J fill:#fce4ec,stroke:#c62828,stroke-width:2px
```

## Attachment System

The attachment system dynamically injects contextual information during conversations:

| Attachment Type | Injection Timing | Description |
|----------|----------|------|
| 📅 Current date | Initial + on date change | Updated via `date_change` attachment |
| 🔀 Git Status | At conversation start | Current branch, status (truncated to 2000 chars), recent commits |
| 📋 Todo List | Every 10 turns | Reminder of pending task progress |
| 🧠 CLAUDE.md | Initial injection | Project instructions and configuration |
| 📂 Nested memories | During subdirectory operations | Search for CLAUDE.md in directory hierarchy |
| 🔍 Relevant memories | Async pre-fetch | Retrieve relevant memories from auto-memory |
| 🛠️ Skills | On discovery / invocation | Available skill list and invocation content |
| 💻 IDE Context | Real-time | Selected lines, open files |
| 📊 Token Usage | Real-time | Current token usage and budget |

## Next Steps

- [Memory System](/docs/en/features/memory/) — Dive deeper into how Session Memory and User Memory work
- [Remote Tool Calling](/docs/concepts/rtc/) — Learn the full lifecycle of tool calls
- [Session Management](/docs/en/features/session/) — Understand where context management fits within sessions
