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
| 1 | Microcompact | Time interval | Single tool result | Zero |
| 2 | Auto Compact | Token count reaches threshold | A batch of messages → summary | One LLM call |
| 3 | Session Memory Compact | When Auto Compact is triggered | Session memory → summary | Zero |

## Microcompact — Tool Result Cleanup

Microcompact is the lightest form of compression — it doesn't generate summaries, it simply cleans up old tool results that take up a lot of space.

### Cleanable Tools

Only tools that produce large outputs are cleaned:

| Tool | Typical Output |
|:----:|----------|
| 📖 `read` | File contents |
| ✏️ `write` | Write results |
| 🔍 `grep` | Search results |
| 🔎 `find` | File listings |
| ⚡ `script` | Script execution results |

### Cleanup Strategy

```mermaid
flowchart TD
    REQ["📤 Before Request"] --> A{"Time-based<br/>Interval > 60 minutes?"}
    A -->|"✅ Yes"| A1["Clean old tool results<br/>Keep most recent 5"]
    A -->|"❌ No"| SKIP["⏭️ Skip microcompact"]

    A1 --> SEND["📤 Send Request"]
    SKIP --> SEND

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style SKIP fill:#f5f5f5,stroke:#9e9e9e,stroke-width:2px
    style SEND fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
```

| Strategy | Trigger | Mechanism |
|------|----------|------|
| 🕐 Time-based | Last assistant message > 60 minutes ago | Directly replace old tool results with placeholders, keep most recent 5 |

> 💡 The time-based strategy retains at least 5 recent tool results to prevent the model from completely losing its working context.

## Auto Compact — Automatic Summary Compression

When microcompact isn't enough, Auto Compact kicks in — compressing a batch of old messages into a concise summary.

### Trigger Conditions

```mermaid
flowchart LR
    W["📏 contextTokensLimit<br/>25,000 tokens"] --> T["Subtract buffer<br/>- 13,000"]
    T --> TH["Threshold = 12,000 tokens"]

    TH --> CHECK{"Current tokens >= threshold?"}
    CHECK -->|"✅ Yes"| COMPACT["🗜️ Trigger compression"]
    CHECK -->|"❌ No"| CONT["🔄 Continue conversation"]

    style W fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style TH fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style COMPACT fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style CONT fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| Configuration | Default | Description |
|--------|:------:|------|
| `contextTokensLimit` | 25,000 | Context token limit |
| `autoCompactBufferTokens` | 13,000 | Safety buffer |
| **Trigger threshold** | **12,000** | `contextTokensLimit - autoCompactBufferTokens` |

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
| Total token budget | 10,000 | Total limit for all recovered files |
| Per-file token limit | 2,000 | Maximum tokens per file |

## System Prompt Assembly

The system prompt is provided via the `SystemPrompt` configuration item and passed as the Agent's Instruction. When an agent definition exists, the agent's system prompt is used; otherwise, the default system prompt is used.

## Message Assembly Pipeline

Before each API call, messages go through a complete assembly pipeline:

```mermaid
flowchart TD
    A["📝 Raw message history"] --> B["Filter<br/>Messages after compression boundary"]
    B --> C["Trim<br/>Enforce tool result size limits"]
    C --> D["Remove<br/>Old messages"]
    D --> E["🔹 Microcompact<br/>Compress tool results"]
    E --> G["🔸 Auto Compact<br/>Full compression"]
    G --> H["Inject attachments"]
    H --> I["📤 API Call"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style E fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style G fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style I fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
```

## Attachment System

The attachment system dynamically injects contextual information during conversations:

| Attachment Type | Injection Timing | Description |
|----------|----------|------|
| 📋 AgentPrompt | Every turn | AGENT.md snapshot, containing agent capability description |
| 📝 TodoList | Every turn | Pending task list |
| 🧠 SessionMemory | Every turn | Latest 5 session memories (up to 5,000 tokens) |
| 🗂️ UserMemory | Every turn | User memories filtered by importance |

## Next Steps

- [Memory System](/docs/en/features/memory/) — Dive deeper into how Session Memory and User Memory work
- [Remote Tool Calling](/docs/concepts/rtc/) — Learn the full lifecycle of tool calls
- [Session Management](/docs/en/features/session/) — Understand where context management fits within sessions
