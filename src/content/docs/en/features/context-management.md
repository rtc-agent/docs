---
title: Context Management
description: RTC Agent's five-layer compression mechanism — from tool result cleanup to full summarization — ensuring conversations never hit the context ceiling.
---

**Context Management** is the key to sustaining long conversations. As conversations grow longer and tool outputs accumulate, the system intelligently manages the context window through a **five-layer compression mechanism** — retaining critical information, freeing up precious space, and keeping the conversation unbroken.

## Five-Layer Compression Architecture

```mermaid
flowchart TD
    subgraph LAYERS["📦 Compression Mechanisms"]
        direction TB
        L0["🔹 Manual Compact<br/>User-triggered"]
        L1["🔸 Microcompact<br/>Tool result cleanup"]
        L2["🔹 Auto Compact<br/>Automatic summary compression"]
        L3["🔸 Reactive Compact<br/>Progressive emergency compression"]
        L4["🔹 Session Memory Compact<br/>Session memory compression"]
    end

    L0 -->|"User command"| COMPACT["🗜️ Force compression"]
    L1 -->|"Running out of space"| L2
    L2 -->|"Has Session Memory"| L4
    L2 -->|"No Session Memory"| L2B["🧠 Call LLM to generate summary"]
    L2 -->|"Tokens still over limit"| L3

    subgraph SCOPE["Compression Granularity"]
        direction LR
        S1["🎯 Fine-grained<br/>Single tool result"]
        S2["📄 Medium<br/>A batch of messages"]
        S3["📋 Efficient<br/>Full memory summary"]
    end

    L1 --> S1
    L2 --> S2
    L4 --> S3

    style LAYERS fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    style SCOPE fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px
    style L0 fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style L1 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style L2 fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style L3 fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style L4 fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| Layer | Name | Trigger | Compression Granularity | Cost |
|:----:|------|----------|----------|:----:|
| 0 | Manual Compact | User sends `/compact` command | Full → summary | One LLM call |
| 1 | Microcompact | Time interval | Single tool result | Zero |
| 2 | Auto Compact | Token count reaches threshold | A batch of messages → summary | One LLM call |
| 3 | Reactive Compact | Still over limit after Auto Compact | Progressive multi-level compression | Zero ~ one LLM |
| 4 | Session Memory Compact | When Auto Compact is triggered | Session memory → summary | Zero |

## Manual Compact

Users can trigger context compression manually via the `/compact` command, useful for proactively cleaning context or adjusting summary direction.

**RPC**: `v1.session.compact`

```json
{
  "session_id": "uuid",
  "custom_instruction": "Focus on retaining API design decisions and code snippets"
}
```

| Parameter | Description |
|------|------|
| `session_id` | Target session ID |
| `custom_instruction` | Optional, custom summary instruction overriding the default compression prompt |

> 💡 Manual compression uses `force` mode, bypassing the token threshold check — compression is performed even if the context is not over the limit. The compression LLM call disables thinking/reasoning to save tokens.

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

## Reactive Compact — Progressive Emergency Compression

When tokens are still over the limit after Auto Compact, the system activates **Reactive Compact** — a progressive multi-level compression strategy that frees up as much space as possible without increasing LLM cost.

```mermaid
flowchart LR
    A["📏 After Auto Compact<br/>tokens still over limit"] --> L1["Level 1<br/>Light compression"]
    L1 -->|"Still over"| L2["Level 2<br/>Medium compression"]
    L2 -->|"Still over"| L3["Level 3<br/>Aggressive compression"]

    style A fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style L1 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style L2 fill:#ffcc80,stroke:#ef6c00,stroke-width:2px
    style L3 fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

| Level | Strategy | Description |
|:----:|------|------|
| Level 1 | Light compression | More aggressive tool result cleanup + reduced message retention |
| Level 2 | Medium compression | Further message trimming + shorter attachment injection |
| Level 3 | Aggressive compression | Aggressive microcompact + minimal retention configuration |

> 💡 Reactive Compact persists across process restarts — even after a Server restart, the system detects the current token state and continues executing the required compression level.

## Tool Result Budget

Individual tool outputs are limited to **10K tokens** to prevent any single tool result from monopolizing the context window:

| Strategy | Ratio | Description |
|------|:----:|------|
| Head retention | 60% | Keep the first 6,000 tokens of the output |
| Tail retention | 20% | Keep the last 2,000 tokens of the output |
| Middle truncation | 20% | Middle section replaced with `[...truncated...]` |

Truncation uses a **UTF-8 safe** algorithm to ensure no character is split in the middle.

## Strategic Cache Breakpoints

**Cache breakpoints** are set at key positions in the message list so that the LLM's prompt cache maintains a high hit rate even after compression:

```mermaid
flowchart TD
    subgraph MESSAGES["📝 Message List"]
        direction TB
        BP1["🔵 Breakpoint 1<br/>Summary (1h TTL)"]
        M1["...older messages..."]
        BP2["🟢 Breakpoint 2<br/>Recent messages (5m TTL)"]
        M2["...recent messages..."]
    end

    style BP1 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style BP2 fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| Breakpoint | Position | TTL | Description |
|:----:|------|:---:|------|
| BP1 | After summary message | 1h | Compressed summaries rarely change, long TTL |
| BP2 | After recent messages | 5m | Active area, short TTL for freshness |

| Effect | Data |
|------|------|
| Cache hit rate | 0% → **75%** (after microcompact) |
| Input cost reduction | ~**69%** |

> 💡 Configurable via `worker.enable_strategic_cache_breakpoints` (default `true`). This feature works with Anthropic's prompt caching mechanism to reuse previous caches even after context compression.

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

## Compression Status Visualization

The following Session model fields reflect compression status in real-time, displayed by the frontend via the `rtc-token-usage` component:

| Field | Description | Calculation |
|-------|-------------|-------------|
| `compression_progress` | Compression progress (0-100) | `current tokens / compression_threshold * 100` |
| `compression_threshold` | Compression trigger threshold | `contextTokensLimit - autoCompactBufferTokens` |
| `rounds_until_compression` | Rounds until compression | EWMA-based prediction, -1 means threshold exceeded |
| `estimated_next_round_tokens` | Next round token estimate | Based on EWMA (Exponentially Weighted Moving Average) |

```mermaid
flowchart LR
    subgraph PROGRESS["📊 Compression Progress Visualization"]
        direction TB
        RING["🔵 Circular Progress<br/>compression_progress"]
        THRESHOLD["📏 Threshold Line<br/>compression_threshold"]
        ROUNDS["🔢 Remaining Rounds<br/>rounds_until_compression"]
    end

    PROGRESS --> UI["🖥️ rtc-token-usage Component"]

    style PROGRESS fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style UI fill:#e8f5e9,stroke:#388e3c
```

### Compression Progress Interpretation

| Progress Range | Meaning | User Guidance |
|:--------------:|---------|---------------|
| 0-50% | Context is ample | Normal usage |
| 50-80% | Context gradually filling | Continue conversation, monitor progress |
| 80-100% | Compression approaching | Prepare for compression |
| > 100% | Threshold exceeded, compression triggered | `rounds_until_compression` becomes -1 |

> 💡 `rounds_until_compression` is estimated using the EWMA (Exponentially Weighted Moving Average) algorithm, which considers historical token consumption trends across rounds. The prediction becomes more accurate as conversation rounds increase.

## Next Steps

- [Memory System](/docs/en/features/memory/) — Dive deeper into how Session Memory and User Memory work
- [Remote Tool Calling](/docs/concepts/rtc/) — Learn the full lifecycle of tool calls
- [Session Management](/docs/en/features/session/) — Understand where context management fits within sessions
