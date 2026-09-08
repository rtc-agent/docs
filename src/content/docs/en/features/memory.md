---
title: Memory System
description: RTC Agent's dual-layer memory architecture — session-level memory and user-level memory — ensuring AI never forgets during a conversation and carries knowledge across sessions.
---

The **Memory System** gives AI a "memory." It not only tracks key decisions and progress throughout a single conversation, but also remembers your preferences, project context, and working habits across sessions — the more you use it, the better it understands you.

## Dual-Layer Architecture

The memory system is divided into two layers, each with its own role:

```mermaid
flowchart TD
    subgraph MEMORY["🧠 Memory System"]
        direction TB
        SM["📋 Session Memory<br/>Session-Level Memory"]
        UM["🗂️ User Memory<br/>User-Level Memory"]
    end

    subgraph SM_DETAIL["Session Memory Features"]
        direction TB
        SM1["Scope: Single session"]
        SM2["Lifecycle: During session"]
        SM3["Purpose: Compression summaries / Cross-turn context"]
        SM4["Extraction: Automatic + Manual"]
    end

    subgraph UM_DETAIL["User Memory Features"]
        direction TB
        UM1["Scope: Across all sessions"]
        UM2["Lifecycle: Long-term retention"]
        UM3["Purpose: Personalization / Knowledge inheritance"]
        UM4["Extraction: Agent-initiated saves"]
    end

    SM --> SM_DETAIL
    UM --> UM_DETAIL
    SM --> EMB["🔍 Embedding Vector Search"]
    UM --> EMB

    style MEMORY fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    style SM_DETAIL fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style UM_DETAIL fill:#fce4ec,stroke:#c62828,stroke-width:2px
    style EMB fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| | Session Memory | User Memory |
|---|---------------|-------------|
| **Scope** | Single session | Across all sessions |
| **Lifecycle** | During session | Long-term retention |
| **Core Purpose** | Compression summaries, cross-turn context | Personalization, knowledge inheritance |
| **Extraction Method** | Automatic extraction + Agent-initiated saves | Agent-initiated saves |
| **Capacity Limit** | 20 entries, ~12K tokens | 1,000 entries |

## Session Memory

### Five Categories

Session Memory distills key information from ongoing conversations into **5 categories**:

| Category | Description | Example |
|:----:|------|------|
| 🎯 `decision` | Technical decisions and design choices | "Choose PostgreSQL as the database" |
| 📍 `context` | Current task context | "Implementing user login functionality" |
| 📊 `progress` | Task progress and completion status | "Database schema design completed" |
| 🚧 `issue` | Encountered issues and solutions | "CORS error, resolved by configuring middleware" |
| 💡 `learnings` | Lessons learned and takeaways | "Connection pooling can significantly improve performance" |

### Dual-Track Extraction

Session Memory accumulates through **automatic extraction** and **agent-initiated saves** via two parallel paths:

```mermaid
flowchart LR
    subgraph AUTO["🤖 Automatic Extraction (Background Agent)"]
        direction TB
        A1["Context tokens >= 10,000"] -->|"Trigger"| A2["Background forked agent<br/>Shares prompt cache"]
        A2 --> A3["Extract 5 categories of key information"]
        A3 --> A4["Write to session_memories"]
    end

    subgraph MANUAL["✋ Agent-Initiated Save"]
        direction TB
        M1["Agent determines information is important"] --> M2["Call save_session_memory"]
        M2 --> M3["Write to session_memories"]
    end

    A4 --> DB[("📦 Session Memory<br/>Up to 20 entries<br/>~12K tokens")]
    M3 --> DB

    style AUTO fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style MANUAL fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style DB fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

**Automatic extraction** is performed by a background agent, triggered by the following conditions:

| Condition | Description |
|------|------|
| Initial threshold | Context tokens >= 10,000 |
| Growth threshold | Token growth >= 5,000 |
| Tool calls | Number of tool calls >= 3 |
| Conversation breakpoint | Token threshold met + no tool calls in the last turn |

> 💡 The background agent shares the prompt cache with the main conversation, is hard-limited to at most 5 turns, and has virtually no impact on main conversation performance.

### Capacity Limits

| Limit | Value | Description |
|--------|:--:|------|
| Maximum entries | 20 | Per single session |
| Per-entry token limit | ~2,000 | Entries exceeding this are truncated |
| Total token limit | ~12,000 | Approximately 9 pages of documentation |
| Overflow strategy | Delete oldest | Retain the most recent information |

## User Memory

### Four Categories

User Memory records long-term knowledge across sessions, organized into **4 categories**:

| Category | Description | Example |
|:----:|------|------|
| 👤 `user` | User role, goals, preferences | "10 years of Go experience, new to React" |
| 💬 `feedback` | User guidance on working methods | "Don't mock the database in tests" |
| 📁 `project` | Project progress, goals, decision context | "Merge freeze since 2026-03-05" |
| 🔗 `reference` | Pointers to external systems | "Pipeline bug in Linear INGEST project" |

### Importance Levels

Each User Memory entry has an importance rating that affects retrieval priority:

```mermaid
flowchart LR
    C["🔴 critical<br/>Critical information"] --> P1["Highest priority"]
    H["🟠 high<br/>Important information"] --> P2["High priority"]
    M["🟡 medium<br/>General information"] --> P3["Medium priority"]
    L["🟢 low<br/>Minor information"] --> P4["Low priority"]

    style C fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style H fill:#ffe0b2,stroke:#e65100,stroke-width:2px
    style M fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style L fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
```

`feedback` and `project` type memories also contain a special structure:

```
Rule/Fact
Why: The reason provided by the user
How to apply: When/where this guidance applies
```

> 📌 This **Why + How to apply** structure helps AI understand the context and apply the right rules in the right scenarios.

### Capacity Limits

| Limit | Value | Description |
|--------|:--:|------|
| Maximum entries | 1,000 | Per single user |
| Per-entry token limit | ~1,000 | - |
| Overflow strategy | Tiered eviction | Priority: delete `low` → least recently accessed → oldest |

## Embedding Retrieval

User Memory uses a **hybrid retrieval** strategy that balances semantic understanding with exact matching:

```mermaid
flowchart TD
    Q["🔍 Query"] --> VE["Generate Query Embedding"]
    Q --> KW["Extract Keywords"]

    VE --> VS["📐 Vector Similarity Search<br/>Cosine similarity Top 20"]
    KW --> KS["🔤 Keyword Search<br/>tags + title + content<br/>Top 20"]

    VS --> FUSION["🔀 RRF Fusion Ranking<br/>Reciprocal Rank Fusion"]
    KS --> FUSION

    FUSION --> FILTER["⚖️ Importance Weighting<br/>critical ×1.5, high ×1.3<br/>medium ×1.0, low ×0.7"]
    FILTER --> TOP["✅ Return Top 5"]

    style Q fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    style VS fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style KS fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style FUSION fill:#fce4ec,stroke:#c62828,stroke-width:2px
    style FILTER fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style TOP fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| Stage | Strategy | Description |
|------|------|------|
| Vector search | Cosine similarity | Semantic-level matching, Top 20 |
| Keyword search | Full-text search + tag matching | Exact keyword matching, Top 20 |
| Fusion ranking | RRF algorithm | `score = Σ 1/(60 + rank)`, merges both result sets |
| Weighted filtering | Importance + access frequency + recency | Important and frequently used memories are prioritized |
| Final output | Top 5 | The 5 most relevant memories |

> 💡 Memories older than 1 day are annotated with a recency reminder: "Note: This memory was created N days ago and may be outdated."

## Injection Strategy

Memories enter the AI's context through a carefully designed injection strategy:

```mermaid
flowchart LR
    subgraph SM_INJECT["Session Memory Injection"]
        direction TB
        SM1["Before each turn"] --> SM2["Auto-inject<br/>Latest 5 entries"]
    end

    subgraph UM_INJECT["User Memory Injection"]
        direction TB
        UM1["At session start"] --> UM2["Embedding retrieval<br/>Inject Top 5"]
    end

    SM2 --> CTX["📝 AI Context"]
    UM2 --> CTX

    style SM_INJECT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style UM_INJECT fill:#fce4ec,stroke:#c62828,stroke-width:2px
    style CTX fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| Memory Type | Injection Timing | Injection Count | Trigger |
|----------|----------|:--------:|----------|
| Session Memory | Before each turn | 5 entries | Automatic |
| User Memory | At session start | 5 entries | Based on embedding retrieval |
| Session Memory (during compression) | Auto Compact triggered | All entries | Used as compression summary |

## Session Memory Compact

When the context needs to be compressed, Session Memory can serve as a summary at **zero cost**:

```mermaid
flowchart TD
    A["⚡ Auto Compact Triggered"] --> B{"Session Memory<br/>exists?"}
    B -->|"✅ Yes"| C["📋 Use Session Memory<br/>as summary"]
    B -->|"❌ No"| D["🧠 Call LLM<br/>to generate summary"]

    C --> E["💰 Zero API cost"]
    D --> F["💸 Incurs API cost"]

    E --> G["🔄 Continue conversation"]
    F --> G

    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style D fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style E fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
    style F fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

| Approach | Cost | Summary Quality | Speed |
|------|------|----------|------|
| Session Memory Compact | Zero API cost | Higher (continuously updated) | Faster |
| Standard Auto Compact | One LLM call | Average (generated in one shot) | Slower |

> 📌 Session Memory is **continuously accumulated** throughout the conversation, producing a more complete and accurate summary than one generated in a single pass during compression.

## Future Roadmap

```mermaid
flowchart LR
    subgraph NOW["🔵 Current"]
        N1["Session Memory"]
        N2["User Memory"]
        N3["Embedding Retrieval"]
    end

    subgraph NEXT["🟢 Near-term"]
        NX1["🌙 Memory Consolidation<br/>Dream Task"]
        NX2["📊 Memory Visualization"]
    end

    subgraph FUTURE["🟡 Long-term"]
        F1["👥 Team Memory"]
        F2["🔗 Memory Association"]
    end

    NOW --> NEXT --> FUTURE

    style NOW fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style NEXT fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style FUTURE fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| Feature | Description |
|------|------|
| 🌙 Memory Consolidation (Dream Task) | Periodically merge duplicate memories, delete outdated ones, and extract shared knowledge |
| 👥 Team Memory | Support team-shared preferences, standards, and best practices |
| 📊 Memory Visualization | View, edit, search memories in the UI, and view usage statistics |

## Next Steps

- [Context Management](/docs/en/features/context-management/) — Learn how the memory system works with the compression system
- [Remote Tool Calling](/docs/concepts/rtc/) — Learn how AI executes tools on the frontend
- [Session Management](/docs/en/features/session/) — Understand memory in the context of sessions
