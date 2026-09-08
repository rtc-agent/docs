---
title: Work Modes
description: 5 work modes control the confirmation strategy when AI executes tools — freely choose between safety and efficiency.
---

**Work modes** determine whether AI needs your confirmation when executing tools. Different modes provide different levels of automation — from "confirm every step" to "fully automatic execution". You can choose the balance between safety and efficiency that best fits your current task.

## 5 Work Modes

```mermaid
flowchart LR
    subgraph ENABLED["✅ Enabled"]
        direction TB
        M1["🔒 manual<br/>Ask before each edit"]
        M2["📝 edit<br/>Auto-edit files<br/>⭐ Default"]
        M3["⚡ bypass<br/>Execute without asking"]
    end

    subgraph UPCOMING["🔜 Coming Soon"]
        direction TB
        M4["📋 plan<br/>Explore code before editing"]
        M5["🤖 auto<br/>Auto-execute after safety checks"]
    end

    style ENABLED fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style UPCOMING fill:#f5f5f5,stroke:#9e9e9e,stroke-width:2px,stroke-dasharray: 5 5
```

| Mode | Label | Description | Status |
|:----:|------|------|:----:|
| 🔒 manual | Manual | Ask user before each edit | ✅ Enabled |
| 📝 edit | Edit automatically | Auto-edit files (⭐ Default) | ✅ Enabled |
| 📋 plan | Plan | Explore code before editing (expected behavior) | 🔜 Not enabled |
| 🤖 auto | Auto | Auto-execute after safety checks; pauses for risky operations (expected behavior) | 🔜 Not enabled |
| ⚡ bypass | Bypass permissions | Execute without asking | ✅ Enabled |

> 📌 The current default mode is **edit** — auto-handles file read/write, but still requires confirmation before script execution. This is the optimal balance for most scenarios.

## Permission Matrix

The confirmation policies for tools in different modes are as follows:

```mermaid
flowchart TD
    subgraph MANUAL["🔒 manual mode"]
        direction TB
        M1["Read-only tools<br/>ls / read / find / grep"] -->|"✅ Auto-allowed"| M1R["Execute"]
        M2["write"] -->|"⚠️ Confirmation required"| M2R["Dialog"]
        M3["script"] -->|"⚠️ Confirmation required"| M3R["Dialog"]
    end

    subgraph EDIT["📝 edit mode (default)"]
        direction TB
        E1["Read-only tools<br/>ls / read / find / grep"] -->|"✅ Auto-allowed"| E1R["Execute"]
        E2["write"] -->|"✅ Auto-allowed"| E2R["Execute"]
        E3["script"] -->|"⚠️ Confirmation required"| E3R["Dialog"]
    end

    subgraph BYPASS["⚡ bypass mode"]
        direction TB
        B1["All tools<br/>ls / read / write / script ..."] -->|"✅ Auto-allowed"| B1R["Execute"]
    end

    style MANUAL fill:#fce4ec,stroke:#c62828,stroke-width:2px
    style EDIT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style BYPASS fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

| Tool | 🔒 manual | 📝 edit | 📋 plan | 🤖 auto | ⚡ bypass |
|------|:---------:|:-------:|:-------:|:-------:|:---------:|
| ls / read / find / grep | ✅ Auto | ✅ Auto | ✅ Auto | ✅ Auto | ✅ Auto |
| write | ⚠️ Confirm | ✅ Auto | ✅ Auto | ✅ Auto | ✅ Auto |
| script | ⚠️ Confirm | ⚠️ Confirm | ⚠️ Confirm | ⚠️ Confirm | ✅ Auto |

> 📌 **plan** and **auto** modes are not yet enabled and currently use the same permission rules as **edit**.

> 💡 **Design Principle**: Read-only operations are always safely allowed; `write` only requires confirmation in the highest-alertness mode (manual); `script` can execute arbitrary code, so it requires user confirmation in all modes except bypass.

### Selection Guide

```mermaid
flowchart TD
    A{"Choose work mode"} --> B{"Need maximum safety?<br/>Review every operation step by step"}
    B -->|"Yes"| C["🔒 manual"]
    B -->|"No"| D{"Trust AI to edit files?<br/>Only confirm script execution"}
    D -->|"Yes"| E["📝 edit ⭐"]
    D -->|"No"| F{"Fully trust AI?<br/>No confirmation needed"}
    F -->|"Yes"| G["⚡ bypass"]
    F -->|"No"| E

    style C fill:#fce4ec,stroke:#c62828,stroke-width:2px
    style E fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style G fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style A fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| Scenario | Recommended Mode | Reason |
|------|---------|------|
| 🔍 First time use, understanding AI behavior | 🔒 manual | Every step is visible and controllable |
| 💼 Daily development, trust AI to edit | 📝 edit | Best balance of efficiency and safety |
| ⚡ Batch operations, fully trust AI | ⚡ bypass | Maximum efficiency, no interruptions |

## Mode Switching

```mermaid
flowchart TD
    A["👤 Click mode button on toolbar"] --> B["📋 Mode panel pops up"]
    B --> C["👆 Select new mode"]
    C --> D["🔄 Update state"]
    D --> E["💾 Write to localStorage"]
    D --> F["🔗 Takes effect immediately"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style D fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style E fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style F fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| Action | Description |
|------|------|
| Entry point | Mode button on the bottom toolbar of the input area |
| Panel | Floats above the button |
| Close | Click outside the panel or press Escape |

## Switching Impact

```mermaid
flowchart LR
    A["🔄 Switch mode"] --> B["✅ Current task<br/>Not affected"]
    A --> C["🆕 Next task<br/>Uses new mode"]

    style A fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style B fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style C fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

Mode switching follows the principle of **"don't affect the current, immediately affect the next"**:

| Dimension | Behavior |
|------|------|
| Currently executing task | Not interrupted, continues with old mode's permissions |
| Next pending task | Immediately uses the new mode |
| Timing | Can be switched at any time |

> 📌 If you're performing a sensitive operation, you can complete it in manual mode first, then switch back to edit mode for daily work.

## State Persistence

| Feature | Description |
|------|------|
| Storage location | `localStorage['rtc_mode']` |
| Restoration | Previous mode is restored after page refresh |
| Fallback strategy | Silently falls back to default value `edit` if storage fails |

Mode preference follows your browser — no need to reconfigure each time.

## Next Steps

- [Script Engine](/docs/en/concepts/script-engine/) — Learn why the script tool requires the highest permission level
- [Remote Tool Calling](/docs/en/concepts/rtc/) — Learn how the tool permission matrix is applied in the RTC protocol
- [Session Management](/docs/en/features/session/) — Learn about the role of work modes in session context
