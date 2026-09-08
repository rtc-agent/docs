---
title: Virtual File System
description: A browser-side virtual file system based on IndexedDB — the file operation interface for AI, where data never leaves the user's device.
---

RTC Agent builds a **complete virtual file system** in the browser. AI operates on files using tools like `ls`, `read`, `write`, `grep`, and `find`, just like working with a local terminal — but all data always stays within the user's browser.

## Why a File System

```mermaid
flowchart LR
    subgraph APPROACH["Design Approach"]
        direction TB
        A["🤖 LLMs naturally understand file systems"] --> B["📁 Expose business capabilities via file interfaces"]
        B --> C["👨‍💻 Developers only need to maintain Function docs"]
        C --> D["🧩 AI freely combines them to accomplish complex tasks"]
    end

    subgraph ALT["Alternative: Custom APIs"]
        direction TB
        X["Define query APIs"] --> Y["One interface per business feature"]
        Y --> Z["LLM needs to understand each API"]
        Z --> W["Extension = code changes"]
    end

    style APPROACH fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style ALT fill:#fce4ec,stroke:#c62828,stroke-width:2px
```

> 💡 **Core Insight**: LLMs are already very good at operating file systems. Instead of making the AI learn custom APIs, give it a file system — it can immediately `ls`, `read`, `grep`, and `write`.

## Directory Structure

```mermaid
flowchart TD
    ROOT["📁 /"] --> FUNCTIONS["📁 functions/"]
    ROOT --> SCENARIOS["📁 scenarios/"]
    ROOT --> SCRIPTS["📁 scripts/"]
    ROOT --> AGENT["📄 AGENT.md"]

    FUNCTIONS --> F1["📄 order/"]
    F1 --> F2["📄 create.md"]
    F1 --> F3["📄 query.md"]

    SCENARIOS --> S1["📄 checkout-flow.md"]

    SCRIPTS --> SC1["📄 batch-export.md"]

    style ROOT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style FUNCTIONS fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style SCENARIOS fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style SCRIPTS fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style AGENT fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
```

| Directory | Purpose | Content Source |
|------|------|----------|
| `/functions/` | Function documentation | **Auto-generated** after the host app registers Functions |
| `/scenarios/` | Scenario documentation | Markdown workflows provided by the business side |
| `/scripts/` | Executable scripts | Saved by AI via the `script` tool |
| `/AGENT.md` | System entry point | Auto-generated template describing directory structure and tools |

## File Operations

The virtual file system provides **6 operations** covering all file interactions the AI needs:

```mermaid
flowchart LR
    subgraph READ["📖 Read Operations"]
        LS["ls<br/>List directory"]
        READ["read<br/>Read file"]
        FIND["find<br/>Search by name"]
        GREP["grep<br/>Search by content"]
    end

    subgraph WRITE["✏️ Write Operations"]
        WRITE_OP["write<br/>Write file"]
        REMOVE["remove<br/>Delete file"]
    end

    style READ fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style WRITE fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| Operation | Function | Key Parameters |
|:----:|------|----------|
| `ls` | List directory contents | `path` (default `/`) |
| `read` | Read file contents | `path` (required), `offset` / `limit` (pagination) |
| `write` | Create or write to file | `path`, `content` (required), `mode` (overwrite / append) |
| `find` | Search by file name | `pattern` (glob), `path` |
| `grep` | Search by file content | `pattern` (regex), `path`, `caseSensitive` |
| `remove` | Delete file | `path` |

### Paginated Reading

Large files support paginated reading to avoid loading too much content at once:

```mermaid
flowchart LR
    A["📄 Large File<br/>10,000 lines"] --> B["read offset=0 limit=100"]
    A --> C["read offset=100 limit=100"]
    A --> D["read offset=200 limit=100"]
    A --> E["..."]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

## Path Specifications

```mermaid
flowchart TD
    A["Path Input"] --> B{"Contains ..?"}
    B -->|"⚠️ Yes"| C["❌ Rejected<br/>Path traversal forbidden"]
    B -->|"✅ No"| D["Normalize to absolute path"]
    D --> E["Execute file operation"]

    style C fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style E fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
```

| Rule | Description |
|------|------|
| Root directory | `/` |
| Separator | `/` (forward slash) |
| Auto-conversion | All paths are automatically converted to absolute paths |
| Path traversal | `..` is rejected directly, without parsing |
| Directories | Logical concept, not stored separately, derived from path prefixes |

## File Type Inference

File types are automatically inferred from the **path prefix**, no explicit specification needed:

```mermaid
flowchart TD
    A["✏️ write file"] --> B{"Path prefix?"}
    B -->|"/functions/"| C["📦 type = function"]
    B -->|"/scenarios/"| D["🎬 type = scenario"]
    B -->|"/scripts/"| E["⚡ type = script"]
    B -->|"Other"| F{"Filename = AGENT.md?"}
    F -->|"Yes"| G["📋 type = index"]
    F -->|"No"| H["📄 Regular file"]

    style C fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style D fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style E fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style G fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
```

## Storage Mechanism

```mermaid
flowchart LR
    subgraph BROWSER["🖥️ Browser"]
        VFS["Virtual File System"] --> Dexie["Dexie.js"]
        Dexie --> IDB[("IndexedDB")]
    end

    subgraph STORAGE["Storage Features"]
        S1["🔑 Primary key = file path"]
        S2["📦 Store and retrieve as whole"]
        S3["📑 Supports paginated reading"]
        S4["💾 Subject to browser quota"]
    end

    style IDB fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
```

| Feature | Description |
|------|------|
| Storage Engine | IndexedDB (wrapped by Dexie.js) |
| Primary Key | File path |
| Large Files | Stored and retrieved as whole, supports paginated reading |
| Caching | No cache layer, queries IndexedDB directly each time |
| Capacity | Subject to browser IndexedDB quota (typically hundreds of MB) |

## Initialization

```mermaid
flowchart TD
    A["🚀 System startup"] --> B{"/AGENT.md<br/>exists?"}
    B -->|"✅ Yes"| C["✅ Use existing file"]
    B -->|"❌ No"| D["📝 Auto-generate template"]
    D --> E["Describe directory structure and available tools"]

    style D fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

At system startup, `/AGENT.md` is automatically checked. If it doesn't exist, a template file is auto-generated to describe the directory structure and available tools to the AI — ensuring the AI knows "what's in the file system" as soon as it comes online.

## Security Constraints

| Constraint | Description |
|------|------|
| 🔒 Path traversal protection | `..` is rejected directly |
| 🔐 Permission control | Determined by [work mode](/docs/en/concepts/work-modes/) |
| 💾 Capacity limits | Subject to browser IndexedDB quota |
| 🚫 No cross-origin access | File system is fully isolated within the browser sandbox |

## Next Steps

- [Remote Tool Calling](/docs/en/concepts/rtc/) — Learn how AI calls these file operations
- [Script Engine](/docs/en/concepts/script-engine/) — Learn how scripts in the `/scripts/` directory are executed
- [Skill System](/docs/en/features/skill-system/) — Learn how functions in the `/functions/` directory are registered
