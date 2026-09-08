---
title: Frontend Architecture
description: RTC Agent frontend architecture — a Lit-based Web Components library with 16 sub-components, 9 Controllers, and @lit/context state distribution.
---

The RTC Agent frontend is a component library built on **Lit Web Components**. It exposes only a single `<rtc-agent>` component to the outside world, containing **16 sub-components** internally, managed by **9 Controllers**, with data distributed to child components via `@lit/context`.

## Component Architecture

```mermaid
flowchart TD
    ROOT["🏠 &lt;rtc-agent&gt;<br/>Root Component · Central Orchestrator"]

    ROOT --> HEADER["📌 header-bar<br/>Title bar · Window controls"]
    ROOT --> MSG["💬 message-list<br/>Message list"]
    ROOT --> INPUT["⌨️ input-area<br/>Input area"]
    ROOT --> WIN["🪟 Window Management<br/>normal/maximized/minimized"]

    MSG --> MSGITEM["📝 message-item<br/>Single message"]
    MSGITEM --> MD["📄 markdown-render<br/>Markdown rendering"]
    MSGITEM --> CODE["💻 code-block<br/>Code highlighting"]
    MSGITEM --> THINK["💭 thinking-block<br/>Reasoning process"]
    MSGITEM --> TOOL["🔧 tool-call-card<br/>Tool call card"]

    INPUT --> TOOLBAR["🛠️ toolbar<br/>Attachments · Tools · Modes"]
    INPUT --> TA["📝 textarea<br/>Text input"]

    ROOT --> CONFIRM["⚠️ tool-confirm<br/>Tool confirmation dialog"]
    ROOT --> BUBBLE["🫧 bubble-icon<br/>Minimized bubble"]

    style ROOT fill:#fff9c4,stroke:#f9a825,stroke-width:3px
    style MSG fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style INPUT fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style WIN fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style CONFIRM fill:#fce4ec,stroke:#c62828,stroke-width:2px
```

![File Explorer](/docs/demo-screenshot/file-explorer.png)

> **File Explorer**: Left panel shows the virtual file system directory tree (functions/, scenarios/, scripts/), right panel is an editor with live preview. All file data is stored in the browser's IndexedDB.

![Settings UI](/docs/demo-screenshot/settings.png)

> **Settings UI**: Supports theme switching, language selection, font size adjustment, and other personalization options.
>
> **Window management is not a standalone component**: `Window Management` is a functional module of the root component (implemented by the collaboration of WindowState Controller and WindowInteraction Controller), not an independent UI component. It controls three window states: normal (floating), maximized (full-screen), minimized (bubble).

## Public Component

Host applications only need to import a single component to access all functionality:

```mermaid
flowchart TD
    A["&lt;rtc-agent&gt;"] --> B["📋 Attributes"]
    A --> C["📢 Events"]
    A --> D["🎨 CSS Variables"]

    B --> B1["theme: light / dark / system"]
    B --> B2["app-label: Title text"]
    B --> B3["bubble-icon: Bubble icon"]
    B --> B4["scenarios-url: Scenarios doc"]
    B --> B5["agentConfig: Declarative config"]

    C --> C1["rtc-agent-ready"]

    D --> D1["--rtc-window-default-width"]
    D --> D2["--rtc-window-default-height"]
    D --> D3["--rtc-bubble-size"]

    style A fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style B fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style D fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

| Attribute | Description | Example |
| --- | --- | --- |
| `theme` | Theme switching | `light` / `dark` / `system` |
| `app-label` | Title bar text + bubble tooltip | `"RTC Assistant"` |
| `bubble-icon` | SVG/HTML inside the minimized bubble | Custom icon |
| `scenarios-url` | Scenarios document URL | `"https://..."` |
| `agentConfig` | Declarative function registration (recommended) | JSON config object |

For detailed API documentation, see [Component API](/docs/en/integration/component-api).

## State Management

```mermaid
flowchart TD
    subgraph CONTROLLERS["🎮 9 Controllers"]
        direction TB
        C1["🪟 WindowState<br/>Window position / size"]
        C2["🔐 Auth<br/>Login state"]
        C3["📦 Session<br/>Session list"]
        C4["💬 Message<br/>Message list"]
        C5["🔧 Mode<br/>Work mode"]
        C6["⚠️ ToolCall<br/>Tool confirmation"]
        C7["💾 Persistence<br/>Data layer"]
        C8["📚 Skill<br/>Function registration"]
        C9["🖱️ WindowInteraction<br/>Drag interaction"]
    end

    ROOT["🏠 &lt;rtc-agent&gt;<br/>Central Orchestrator"] --> C1
    ROOT --> C2
    ROOT --> C3
    ROOT --> C4
    ROOT --> C5
    ROOT --> C6
    ROOT --> C7
    ROOT --> C8
    ROOT --> C9

    ROOT -->|"@lit/context"| CHILDREN["🧩 Child Components<br/>Consume state as needed"]

    style ROOT fill:#fff9c4,stroke:#f9a825,stroke-width:3px
    style CONTROLLERS fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style CHILDREN fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

### Design Principles

| Principle | Description |
| --- | --- |
| **Controllers do not reference each other** | Each Controller independently manages its own state slice |
| **Root component orchestrates** | `<rtc-agent>` acts as the hub, coordinating cross-Controller communication |
| **Context distribution** | State is distributed to child components via `@lit/context`, avoiding prop drilling |
| **Data layer isolation** | The Persistence Controller manages all IndexedDB reads and writes |

> 💡 **Why not global state?** Web Components run inside the host application's page and may have multiple instances. For example, a page might embed both a "Customer Support Assistant" and a "Data Analysis Assistant" as two `<rtc-agent>` elements — they need independent sessions, messages, and auth state. Controller + Context ensures each instance's state is fully isolated with no interference.

## Window System

```mermaid
flowchart LR
    subgraph MODES["🪟 Window Modes"]
        direction TB
        N["📐 normal<br/>Floating window<br/>420×640<br/>Draggable / Resizable"]
        M["🔲 maximized<br/>Full screen<br/>100% fill"]
        B["🫧 minimized<br/>Bubble<br/>40×40 circle"]
    end

    N -->|"Maximize"| M
    M -->|"Restore"| N
    N -->|"Minimize"| B
    B -->|"Click to restore"| N

    style N fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style M fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style B fill:#fff3e0,stroke:#f57c00,stroke-width:2px
```

| Interaction | Implementation |
| --- | --- |
| **Drag** | Title bar serves as the drag handle |
| **Resize** | 8 resize handles — 4 corners + 4 edges |
| **Keyboard** | Arrow keys to move, Shift to accelerate |
| **Viewport constraint** | Always stays within the visible area |

```mermaid
flowchart TD
    A["🖱️ User drags"] --> B["WindowInteraction Controller"]
    B --> C["Calculate new position"]
    C --> D{"Within viewport?"}
    D -->|"✅ Yes"| E["Update WindowState"]
    D -->|"❌ Out of bounds"| F["Constrain to boundary"]
    F --> E
    E --> G["🖥️ UI redraw"]

    style B fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style E fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
```

## Style System

```mermaid
flowchart TD
    subgraph LAYERS["🎨 Style Layers"]
        direction TB
        L1["🏗️ Design Tokens<br/>Spacing · Typography · Border Radius · Shadows · Transitions · z-index"]
        L2["🌈 Color Themes<br/>light / dark (VS Code style)"]
        L3["📏 CSS Variables<br/>Component-level customization<br/>Window size · Bubble size"]
    end

    L1 --> L2 --> L3

    style LAYERS fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style L1 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style L2 fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style L3 fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| Layer | Content | Customization Method |
| --- | --- | --- |
| **Design Tokens** | Spacing, typography, border radius, shadows, transitions, z-index | Override CSS variables |
| **Color Themes** | light / dark color schemes | Switch via `theme` attribute |
| **CSS Variables** | Window size, bubble size | `--rtc-*` prefixed variables |

## Key Interactions

### Input Area

```mermaid
flowchart TD
    subgraph INPUT["⌨️ Input Area"]
        direction TB
        TA["📝 textarea<br/>Multi-line input"]
        TB_BAR["🛠️ Bottom Toolbar"]
    end

    TB_BAR --> ATT["📎 Attachments"]
    TB_BAR --> TOOL_BTN["🔧 Tools"]
    TB_BAR --> MODE_BTN["⚙️ Mode toggle"]
    TB_BAR --> SEND["📤 Send / Stop"]

    TA -->|"Enter"| SEND_MSG["Send message"]
    TA -->|"Shift+Enter"| NEWLINE["New line"]

    style INPUT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

### Message List

| Feature | Behavior |
| --- | --- |
| **Auto-scroll** | Automatically scrolls to the bottom when new messages arrive |
| **Smart pause** | Pauses auto-scroll when the user manually scrolls up |
| **New message indicator** | Shows a "New messages" button when the user is not at the bottom |
| **Rendering** | Markdown rendering + code highlighting |

### Tool Confirmation Dialog

```mermaid
flowchart TD
    A["🔧 AI requests to call a tool"] --> B["⚠️ Show confirmation dialog"]
    B --> C["Display tool name and parameters"]
    C --> D{"User decides"}
    D -->|"✅ Yes"| E["Execute tool"]
    D -->|"❌ No / Click background"| F["Reject execution"]
    E --> G["📤 Submit result"]
    F --> H["📤 Submit rejection status"]

    style B fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style E fill:#c8f5e9,stroke:#388e3c,stroke-width:2px
    style F fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

### Command System

When the user types text starting with `/`, command input mode is triggered:

```mermaid
flowchart TD
    A["User types /"] --> B["Show command list<br/>compact · loop · goal"]
    B --> C["Continue typing to filter"]
    C --> D["Tab to complete command"]
    D --> E["Enter parameters"]
    E --> F["Enter to execute"]
    F --> G{"Command type?"}
    G -->|Local command| H["Execute on frontend"]
    G -->|RPC command| I["Send to backend"]
    G -->|Prompt command| J["Inject into AI context"]

    style B fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style H fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style I fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style J fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

| Command | Type | Function |
| --- | --- | --- |
| `/compact` | RPC | Manually trigger context compression |
| `/loop` | Local + RPC | Loop execution (scheduled / dynamic) |
| `/goal` | Prompt | Goal-driven; AI sets completion criteria, Judge model checks |

See [Commands](/docs/en/features/commands).

## Performance & Accessibility

### Performance Considerations

| Scenario | Strategy |
| --- | --- |
| **Large message lists** | Paginated loading (cursor pagination); first load shows the latest 50 |
| **Long conversation scrolling** | Virtual scroll optimization (future release) |
| **Markdown rendering** | On-demand rendering; code highlighting loaded lazily |
| **IndexedDB reads/writes** | Unified by Persistence Controller; batch operations reduce IO |

### Accessibility

| Feature | Implementation |
| --- | --- |
| **Keyboard navigation** | Tab to switch focus, Enter to activate, Esc to close dialogs |
| **ARIA labels** | All interactive elements have `aria-label` |
| **Screen reader** | Message list uses `role="log"`; new messages announced automatically |
| **High contrast** | Supports system high-contrast mode |

## Next Steps

- [Backend Architecture](/docs/en/architecture/backend) — Learn about the Go server's layered design
- [Architecture Overview](/docs/en/architecture) — Return to the architecture panorama
- [Remote Tool Calling](/docs/en/concepts/rtc) — Learn about the core protocol for frontend tool calling
- [Virtual File System](/docs/en/concepts/virtual-fs) — Learn about the frontend IndexedDB file system
- [Commands](/docs/en/features/commands) — Learn about the complete command system
