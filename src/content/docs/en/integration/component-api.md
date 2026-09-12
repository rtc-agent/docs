---
title: Web Component API
description: A single <rtc-agent> component handles AI conversation, tool calls, and theme switching — configure with attributes, listen with events, and customize with CSS variables.
---

**`<rtc-agent>`** is the **sole component** exposed by RTC Agent. Built on Lit, it contains 38 sub-components and 20 Controllers internally, but presents only a clean Web Component interface externally — attribute configuration, event listening, and CSS variable customization.

```mermaid
flowchart TD
    A["🧩 &lt;rtc-agent&gt;"] --> B["🎛️ Attributes"]
    A --> C["📡 Events"]
    A --> D["🎨 CSS Variables"]

    B --> B1["theme: light / dark / system"]
    B --> B2["app-label: title text"]
    B --> B3["bubble-icon: bubble icon"]
    B --> B4["scenarios-url: scenario docs"]
    B --> B5["server-url: server address"]
    B --> B6["agentConfig: declarative config (JS)"]

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
| 🔗 `server-url` | `string` | `""` | Server address. Falls back to the current page's domain when empty |

**JS Properties** (set via JavaScript only, not HTML attributes):

| Property | Type | Default | Description |
|:----:|:----:|:------:|:----:|
| ⚙️ `agentConfig` | `object` | `null` | Declarative function registration (recommended approach) |
| 📦 `registry` | `FunctionRegistry` | `null` | Imperative function registration (created via `defineRegistry`) |
| 🪟 `windowConfig` | `WindowConfig` | `null` | Window behavior configuration (mode, size, interaction limits) |
| 🎛️ `activityBarConfig` | `ActivityBarConfig` | `null` | Activity Bar button visibility configuration |

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

```ts
// Window configuration (JS property, set after rtc-agent-ready)
const agent = document.querySelector('rtc-agent');

agent.addEventListener('rtc-agent-ready', () => {
  // Embedded panel: disable drag/resize/buttons, default to maximized
  agent.windowConfig = { embedded: true };

  // Keep only chat, hide files/settings buttons
  agent.activityBarConfig = {
    disabledActivities: ['files', 'settings'],
  };
});
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

### Window Configuration

Use the `windowConfig` property to control default window behavior and interaction limits:

```ts
agent.windowConfig = {
  // Default window mode
  defaultMode: 'maximized',  // 'normal' | 'maximized' | 'minimized'

  // Embedded mode (shortcut)
  // Equivalent to: defaultMode: 'maximized' + draggable: false + resizable: false
  //                + showMinimize: false + showMaximize: false
  embedded: true,

  // Fine-grained control
  draggable: false,       // Whether the window can be dragged
  resizable: false,       // Whether the window can be resized
  showMinimize: false,    // Whether to show the minimize button
  showMaximize: false,    // Whether to show the maximize button
  showClose: false,       // Whether to show the close button

  // Size and position
  initialSize: { width: 420, height: 640 },
  initialPosition: { x: 100, y: 100 },
  minWidth: 350,
  minHeight: 520,
  maxWidth: Infinity,
  maxHeight: Infinity,
};
```

**Common Scenarios**:

| Scenario | Configuration |
|:----:|------|
| Embedded panel | `{ embedded: true }` |
| Fixed position window | `{ draggable: false, resizable: false }` |
| No minimize button | `{ showMinimize: false, defaultMode: 'maximized' }` |
| Floating chat window | `null` (uses defaults) |

### Activity Bar Configuration

Use the `activityBarConfig` property to control button visibility in the Activity Bar:

```ts
agent.activityBarConfig = {
  // Activities to hide (chat is always visible and cannot be hidden)
  disabledActivities: ['files', 'settings'],

  // Default active activity
  defaultActivity: 'chat',  // 'chat' | 'files' | 'settings'
};
```

| Activity | Description | Hideable |
|:----:|:----:|:------:|
| 💬 `chat` | Chat interface | ❌ Always visible |
| 📁 `files` | File manager | ✅ |
| ⚙️ `settings` | Settings panel | ✅ |

## State Management

The component uses 20 **Controllers** internally to manage state. 9 core state Controllers handle business logic, and 11 UI Controllers handle interface interactions. Controllers do not reference each other directly; instead, the root component `<rtc-agent>` acts as the central hub orchestrating cross-Controller communication:

```mermaid
flowchart TD
    ROOT["🧩 &lt;rtc-agent&gt;<br/>Central Orchestration"] --> CORE["📦 9 Core Controllers"]
    ROOT --> UI["🎨 11 UI Controllers"]

    CORE --> C1["🪟 WindowState"]
    CORE --> C2["🔐 Auth"]
    CORE --> C3["💬 Session"]
    CORE --> C4["📨 Message"]
    CORE --> C5["🔧 Mode"]
    CORE --> C6["⚡ ToolCall"]
    CORE --> C7["💾 Persistence"]
    CORE --> C8["📚 Skill"]
    CORE --> C9["🖱️ WindowInteraction"]

    UI --> U1["Activity"]
    UI --> U2["EditorArea / Editor"]
    UI --> U3["FileExplorer"]
    UI --> U4["Fork"]
    UI --> U5["Notification / Toast"]
    UI --> U6["SessionTab / SessionTree"]
    UI --> U7["Settings / StatusBar"]

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
