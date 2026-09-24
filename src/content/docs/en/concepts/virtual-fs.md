---
title: Virtual File System
description: A browser-side virtual file system based on IndexedDB — the file operation interface for AI, where data never leaves the user's device.
---

RTC Agent builds a **complete virtual file system** in the browser. AI operates on files using tools like `ls`, `read`, `edit`, `grep`, and `find`, just like working with a local terminal — but all data always stays within the user's browser.

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

The virtual file system provides **7 operations** covering all file interactions the AI needs:

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
        EDIT["edit<br/>Exact replacement"]
        REMOVE["remove<br/>Delete file"]
    end

    style READ fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style WRITE fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| Operation | Function | Key Parameters | Status |
|:----:|------|----------|:----:|
| `ls` | List directory contents | `path` (default `/`) | ✅ Available |
| `read` | Read file contents | `path` (required), `offset` / `limit` (pagination) | ✅ Available |
| `write` | Create or write to file | `path`, `content` (required) | ✅ Available |
| `edit` | Exact string replacement | `path`, `old_string`, `new_string` (required), `replace_all` | ✅ Available |
| `find` | Search by file name | `pattern` (glob), `path` | ✅ Available |
| `grep` | Search by file content | `pattern` (regex), see parameter table below | ✅ Available |
| `remove` | Delete file | `path` | 🔒 Internal API |

> ⚠️ `remove` is an internal API of the virtual file system and is not currently exposed to AI as an RTC tool. AI cannot directly delete files.

### read — Paginated Reading

Large files support paginated reading to avoid loading too much content at once:

```mermaid
flowchart LR
    A["📄 Large File<br/>10,000 lines"] --> B["read offset=0 limit=100"]
    A --> C["read offset=100 limit=100"]
    A --> D["read offset=200 limit=100"]
    A --> E["..."]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

| Parameter | Type | Required | Description |
|------|------|:----:|------|
| `path` | string | Yes | Absolute path to the file |
| `offset` | integer | No | Starting line number (1-indexed), only provide for large files |
| `limit` | integer | No | Number of lines to read, only provide for large files |

### edit — Exact String Replacement

Perform exact string replacements in a file, similar to Claude Code's Edit tool. You must use the `read` tool on the file before editing it.

| Parameter | Type | Required | Description |
|------|------|:----:|------|
| `path` | string | Yes | Absolute path to the file |
| `old_string` | string | Yes | The original text to replace — must exactly match the file content including indentation and whitespace |
| `new_string` | string | Yes | The replacement text (must differ from `old_string`) |
| `replace_all` | boolean | No | Set to `true` to replace all occurrences (default `false`). Required when `old_string` is not unique |

**Usage Constraints**:

- You must use the `read` tool on the file first, otherwise the edit will fail
- `old_string` must match **uniquely** in the file — provide more surrounding context to make it unique, or use `replace_all`
- Prefer using `edit` to modify existing files rather than using `write` to overwrite the entire file

### grep — Advanced Search

A powerful search tool for the virtual filesystem. Supports regex, file filtering, pagination, and multiple output modes.

| Parameter | Type | Required | Description |
|------|------|:----:|------|
| `pattern` | string | Yes | Regular expression search pattern |
| `path` | string | No | File or directory path to search in (default root `/`) |
| `glob` | string | No | Glob pattern to filter files (e.g. `"*.js"`, `"**/*.tsx"`) |
| `type` | string | No | File type filter (e.g. `"js"`, `"py"`, `"go"`) — more efficient than glob |
| `output_mode` | string | No | Output mode: `"files_with_matches"` (default, file paths only), `"content"` (matching lines with context), `"count"` (match counts) |
| `-i` | boolean | No | Case-insensitive search |
| `-n` | boolean | No | Show line numbers (requires `output_mode: "content"`, default `true`) |
| `-B` | integer | No | Lines to show **before** each match (requires `output_mode: "content"`) |
| `-A` | integer | No | Lines to show **after** each match (requires `output_mode: "content"`) |
| `-C` / `context` | integer | No | Lines to show **before and after** each match |
| `head_limit` | integer | No | Limit output to first N entries (default 250, pass 0 for unlimited) |
| `offset` | integer | No | Skip first N entries before applying `head_limit` (default 0) |
| `multiline` | boolean | No | Enable multiline mode (`.` matches newlines, patterns can span lines) |

> 💡 **Mode Selection Tips**: Use `"files_with_matches"` to find files; use `"content"` with `-n` and `-C` to inspect matching code; use `"count"` to tally occurrences.

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
| Read Behavior | Each read queries the latest data directly, no cache layer |
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
| 🛡️ User edit protection | System files (e.g. `/AGENT.md`, `/functions/*.md`) that the user has manually edited will not be automatically overwritten by the system. The user must click "Restore Default" to regenerate them |

## Next Steps

- [Remote Tool Calling](/docs/en/concepts/rtc/) — Learn how AI calls these file operations
- [Script Engine](/docs/en/concepts/script-engine/) — Learn how scripts in the `/scripts/` directory are executed
- [Skill System](/docs/en/features/skill-system/) — Learn how functions in the `/functions/` directory are registered
