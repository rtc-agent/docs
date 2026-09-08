---
title: 工作模式
description: 5 种工作模式控制 AI 执行工具时的确认策略——在安全与效率之间自由选择。
---

**工作模式** 决定了 AI 执行工具时是否需要你的确认。不同模式提供不同级别的自动化程度——从"每一步都要确认"到"完全自动执行"。你可以在安全和效率之间选择最适合当前任务的平衡点。

## 5 种工作模式

```mermaid
flowchart LR
    subgraph ENABLED["✅ 已启用"]
        direction TB
        M1["🔒 manual<br/>每次编辑前询问"]
        M2["📝 edit<br/>自动编辑文件<br/>⭐ 默认"]
        M3["⚡ bypass<br/>不询问直接执行"]
    end

    subgraph UPCOMING["🔜 即将推出"]
        direction TB
        M4["📋 plan<br/>先探索代码再编辑"]
        M5["🤖 auto<br/>安全检查后自动执行"]
    end

    style ENABLED fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style UPCOMING fill:#f5f5f5,stroke:#9e9e9e,stroke-width:2px,stroke-dasharray: 5 5
```

| 模式 | 标签 | 说明 | 状态 |
|:----:|------|------|:----:|
| 🔒 manual | Manual | 每次编辑前询问用户 | ✅ 启用 |
| 📝 edit | Edit automatically | 自动编辑文件（⭐ 默认） | ✅ 启用 |
| 📋 plan | Plan | 先探索代码再编辑 | 🔜 未启用 |
| 🤖 auto | Auto | 安全检查后自动执行 | 🔜 未启用 |
| ⚡ bypass | Bypass permissions | 不询问直接执行 | ✅ 启用 |

> 📌 当前默认模式为 **edit**——自动处理文件读写，但脚本执行前仍需确认。这是大多数场景下的最佳平衡。

## 权限矩阵

不同模式下，工具的确认策略如下：

```mermaid
flowchart TD
    subgraph MANUAL["🔒 manual 模式"]
        direction TB
        M1["只读工具<br/>ls / read / find / grep"] -->|"✅ 自动允许"| M1R["执行"]
        M2["write"] -->|"⚠️ 需确认"| M2R["弹窗"]
        M3["script"] -->|"⚠️ 需确认"| M3R["弹窗"]
    end

    subgraph EDIT["📝 edit 模式（默认）"]
        direction TB
        E1["只读工具<br/>ls / read / find / grep"] -->|"✅ 自动允许"| E1R["执行"]
        E2["write"] -->|"✅ 自动允许"| E2R["执行"]
        E3["script"] -->|"⚠️ 需确认"| E3R["弹窗"]
    end

    subgraph BYPASS["⚡ bypass 模式"]
        direction TB
        B1["所有工具<br/>ls / read / write / script ..."] -->|"✅ 自动允许"| B1R["执行"]
    end

    style MANUAL fill:#fce4ec,stroke:#c62828,stroke-width:2px
    style EDIT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style BYPASS fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

| 工具 | 🔒 manual | 📝 edit | ⚡ bypass |
|------|:---------:|:-------:|:---------:|
| ls / read / find / grep | ✅ 自动 | ✅ 自动 | ✅ 自动 |
| write | ⚠️ 确认 | ✅ 自动 | ✅ 自动 |
| script | ⚠️ 确认 | ⚠️ 确认 | ✅ 自动 |

> 💡 **设计原则**：只读操作始终安全放行；`write` 仅在最高警戒模式（manual）下需要确认；`script` 因为可以执行任意代码，除 bypass 外都需要用户确认。

### 选择建议

```mermaid
flowchart TD
    A{"选择工作模式"} --> B{"需要最高安全性？<br/>逐步审查每个操作"}
    B -->|"是"| C["🔒 manual"]
    B -->|"否"| D{"信任 AI 编辑文件？<br/>只需确认脚本执行"}
    D -->|"是"| E["📝 edit ⭐"]
    D -->|"否"| F{"完全信任 AI？<br/>无需任何确认"}
    F -->|"是"| G["⚡ bypass"]
    F -->|"否"| E

    style C fill:#fce4ec,stroke:#c62828,stroke-width:2px
    style E fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style G fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style A fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| 场景 | 推荐模式 | 原因 |
|------|---------|------|
| 🔍 初次使用，了解 AI 行为 | 🔒 manual | 每一步都可见可控 |
| 💼 日常开发，信任 AI 编辑 | 📝 edit | 效率与安全的最佳平衡 |
| ⚡ 批量操作，完全信任 AI | ⚡ bypass | 最高效率，无中断 |

## 模式切换

```mermaid
flowchart TD
    A["👤 点击工具栏 mode 按钮"] --> B["📋 弹出模式面板"]
    B --> C["👆 选择新模式"]
    C --> D["🔄 更新状态"]
    D --> E["💾 写入 localStorage"]
    D --> F["🔗 同步到 RtcProcessor"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style D fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style E fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style F fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| 操作 | 说明 |
|------|------|
| 入口 | 输入区域底部工具栏的 mode 按钮 |
| 面板 | 浮动在按钮上方 |
| 关闭 | 点击外部区域或按 Escape |

## 切换影响

```mermaid
flowchart LR
    A["🔄 切换模式"] --> B["✅ 当前任务<br/>不受影响"]
    A --> C["🆕 下一个任务<br/>使用新模式"]

    style A fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style B fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style C fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

模式切换遵循 **"不影响当前，立即影响下一个"** 的原则：

| 维度 | 行为 |
|------|------|
| 正在执行的任务 | 不会被中断，沿用旧模式的权限 |
| 下一个待处理的任务 | 立即使用新模式 |
| 切换时机 | 任意时刻都可以切换 |

> 📌 如果你正在执行一个敏感操作，可以先用 manual 模式完成，再切回 edit 模式继续日常工作。

## 状态持久化

| 特性 | 说明 |
|------|------|
| 存储位置 | `localStorage['rtc_mode']` |
| 恢复行为 | 页面刷新后恢复上次的模式 |
| 降级策略 | 存储失败时静默降级为默认值 `edit` |

模式偏好跟随你的浏览器，不需要每次重新设置。

## 下一步

- [脚本执行引擎](/docs/concepts/script-engine/) — 了解 script 工具为什么需要最高权限
- [Remote Tool Calling](/docs/concepts/rtc/) — 了解工具权限矩阵在 RTC 协议中的完整应用
- [会话管理](/docs/features/session/) — 了解工作模式在会话上下文中的作用
