---
title: Web Component API
description: A single <rtc-agent> component handles AI conversation, tool calls, and theme switching — configure with attributes, listen with events, and customize with CSS variables.
---

**`<rtc-agent>`** is the **sole component** exposed by RTC Agent. Built on Lit, it contains 16 sub-components and 9 Controllers internally, but presents only a clean Web Component interface externally — attribute configuration, event listening, and CSS variable customization.

```mermaid
flowchart TD
    A["🧩 &lt;rtc-agent&gt;"] --> B["🎛️ Attributes"]
    A --> C["📡 Events"]
    A --> D["🎨 CSS Variables"]

    B --> B1["theme: light / dark / system"]
    B --> B2["app-label: title text"]
    B --> B3["bubble-icon: bubble icon"]
    B --> B4["scenarios-url: scenario docs"]
    B --> B5["agentConfig: declarative config"]

    C --> C1["rtc-agent-ready"]

    D --> D1["--rtc-window-default-width"]
    D --> D2["--rtc-window-default-height"]
    D --> D3["--rtc-bubble-size"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:3px
    style B fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style C fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style D fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

## Attributes

| Attribute | Type | Default | Description |
|:----:|:----:|:------:|:----:|
| 🎨 `theme` | `"light"` \| `"dark"` \| `"system"` | `"system"` | Theme mode. `system` follows the OS setting |
| 📛 `app-label` | `string` | `"RTC Agent"` | Title bar text + minimized bubble tooltip |
| 🖼️ `bubble-icon` | `string` | Default icon | SVG / HTML content displayed inside the minimized bubble |
| 📄 `scenarios-url` | `string` | — | URL of the scenario manifest, pointing to `manifest.json` |
| ⚙️ `agentConfig` | `object` | — | Declarative function registration (recommended approach) |

### Quick Integration

```html
<!-- Minimal integration -->
<rtc-agent></rtc-agent>

<!-- Custom theme and title -->
<rtc-agent theme="dark" app-label="My AI Assistant"></rtc-agent>

<!-- With scenario docs and function registration -->
<rtc-agent
  app-label="Order Assistant"
  scenarios-url="https://example.com/scenarios"
  .agentConfig=${{
    name: 'OrderApp',
    persona: 'You are an order management assistant',
    groups: [{ /* ... */ }]
  }}
></rtc-agent>
```

## Events

| Event | Trigger | Purpose |
|:----:|:--------:|:----:|
| 🟢 `rtc-agent-ready` | Component initialization complete | Safe to access the component instance and set attributes at this point |

```ts
const agent = document.querySelector('rtc-agent');

agent.addEventListener('rtc-agent-ready', () => {
  // Component is ready, safe to operate
  agent.theme = 'dark';
  agent.appLabel = 'Custom Title';
});
```

> 💡 **Best Practice**: Always wait for the `rtc-agent-ready` event before interacting with the component to avoid errors caused by uninitialized state.

## Window System

`<rtc-agent>` includes three built-in window modes, supporting floating, fullscreen, and minimized bubble:

```mermaid
flowchart LR
    A["🪟 Window Modes"] --> B["📐 normal<br/>Floating window"]
    A --> C["🖥️ maximized<br/>Fullscreen"]
    A --> D["🫧 minimized<br/>Bubble"]

    B --> B1["420×640<br/>Draggable / Resizable"]
    C --> C1["100% fill<br/>Fill the container"]
    D --> D1["40×40 circle<br/>Click to restore"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style B fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style C fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style D fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Normal: Default
    Normal --> Minimized: Click minimize 🫧
    Normal --> Maximized: Click maximize 🖥️
    Minimized --> Normal: Click bubble 📐
    Maximized --> Normal: Exit fullscreen 📐
```

| Interaction | Description |
|:----:|------|
| 🖱️ Drag | The title bar serves as the drag handle |
| ↔️ Resize | Supports 8-directional resize operations |
| ⌨️ Keyboard | Arrow keys move the window; Shift to accelerate |
| 📏 Viewport constraint | Window always stays within the visible area and cannot be dragged off-screen |

## State Management

The component uses 9 **Controllers** internally to manage state. Controllers do not reference each other directly; instead, the root component `<rtc-agent>` acts as the central hub orchestrating cross-Controller communication:

```mermaid
flowchart TD
    ROOT["🧩 &lt;rtc-agent&gt;<br/>Central Orchestration"] --> C1["🪟 WindowState<br/>Window position/size"]
    ROOT --> C2["🔐 Auth<br/>Login state"]
    ROOT --> C3["💬 Session<br/>Session list"]
    ROOT --> C4["📨 Message<br/>Message list"]
    ROOT --> C5["🔧 Mode<br/>Working mode"]
    ROOT --> C6["⚡ ToolCall<br/>Tool confirmation"]
    ROOT --> C7["💾 Persistence<br/>Data layer"]
    ROOT --> C8["📚 Skill<br/>Function registration"]
    ROOT --> C9["🖱️ WindowInteraction<br/>Drag interaction"]

    style ROOT fill:#e3f2fd,stroke:#1565c0,stroke-width:3px
    style C1 fill:#e8f5e9,stroke:#388e3c
    style C2 fill:#e8f5e9,stroke:#388e3c
    style C3 fill:#e8f5e9,stroke:#388e3c
    style C4 fill:#e8f5e9,stroke:#388e3c
    style C5 fill:#e8f5e9,stroke:#388e3c
    style C6 fill:#e8f5e9,stroke:#388e3c
    style C7 fill:#e8f5e9,stroke:#388e3c
    style C8 fill:#e8f5e9,stroke:#388e3c
    style C9 fill:#e8f5e9,stroke:#388e3c
```

> 💡 **Design Principle**: Controllers are decoupled from each other; all cross-Controller communication goes through the root component. Sub-components obtain state via `@lit/context` and do not hold direct Controller references.

## CSS Variables

CSS variables allow you to customize the component's appearance and dimensions without modifying source code:

```css
rtc-agent {
  /* Window default dimensions */
  --rtc-window-default-width: 420px;
  --rtc-window-default-height: 640px;

  /* Minimized bubble size */
  --rtc-bubble-size: 40px;
}
```

| Variable | Default | Description |
|:----:|:------:|:----:|
| `--rtc-window-default-width` | `420px` | Default width of the floating window |
| `--rtc-window-default-height` | `640px` | Default height of the floating window |
| `--rtc-bubble-size` | `40px` | Diameter of the minimized bubble |

## Style System

The component uses a three-layer style architecture, progressing from foundational tokens to top-level variables:

```mermaid
flowchart TD
    subgraph LAYER1["🎨 Design Tokens"]
        direction LR
        T1["Spacing"]
        T2["Typography"]
        T3["Radius"]
        T4["Shadow"]
        T5["Transition"]
        T6["Z-index"]
    end

    subgraph LAYER2["🌓 Color Themes"]
        direction LR
        TH1["☀️ Light theme"]
        TH2["🌙 Dark theme<br/>VS Code style"]
    end

    subgraph LAYER3["🔧 CSS Variables"]
        direction LR
        V1["Window dimensions"]
        V2["Bubble size"]
    end

    LAYER1 --> LAYER2 --> LAYER3

    style LAYER1 fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style LAYER2 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style LAYER3 fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| Layer | Content | Description |
|:----:|:----:|:----:|
| 🏗️ Design Tokens | Spacing, typography, radius, shadow, transition, z-index | Foundational design constants ensuring visual consistency |
| 🌓 Color Themes | Light / Dark (VS Code style) | Two complete color schemes with automatic adaptation |
| 🔧 CSS Variables | Component-level customization (window dimensions, bubble size) | Overridable by host applications for personalization |

## Key Interactions

| Area | Behavior |
|:----:|:----:|
| ⌨️ **Input Area** | Textarea + bottom toolbar; Enter to submit, Shift+Enter for newline; toolbar includes attachments, tools, mode toggle, send/stop |
| 📨 **Message List** | Auto-scrolls to bottom; "New messages" button shown when user scrolls away; supports Markdown rendering and code highlighting |
| ⚡ **Tool Confirmation Dialog** | Displays tool name and parameters; Yes / No buttons; clicking the background is equivalent to rejecting |

## Next Steps

- [Authentication & Authorization](/docs/en/integration/auth/) — Learn about the login flow and token mechanism
- [Function Registration Guide](/docs/en/integration/function-registration/) — Register custom functions via `agentConfig`
- [Scenario Authoring Guide](/docs/en/integration/scenario-authoring/) — Write scenario documents to guide AI behavior
