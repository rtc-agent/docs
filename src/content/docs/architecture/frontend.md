---
title: 前端架构
description: RTC Agent 的前端架构——基于 Lit 的 Web Components 组件库，16 个子组件、9 个 Controller、@lit/context 状态分发。
---

RTC Agent 的前端是一个基于 **Lit Web Components** 构建的组件库。对外只暴露一个 `<rtc-agent>` 组件，内部包含 **16 个子组件**，使用 **9 个 Controller** 管理状态，通过 `@lit/context` 向子组件分发数据。

## 组件架构

```mermaid
flowchart TD
    ROOT["🏠 &lt;rtc-agent&gt;<br/>根组件 · 中枢编排"]

    ROOT --> HEADER["📌 header-bar<br/>标题栏 · 窗口控制"]
    ROOT --> MSG["💬 message-list<br/>消息列表"]
    ROOT --> INPUT["⌨️ input-area<br/>输入区域"]
    ROOT --> WIN["🪟 window-system<br/>窗口管理"]

    MSG --> MSGITEM["📝 message-item<br/>单条消息"]
    MSGITEM --> MD["📄 markdown-render<br/>Markdown 渲染"]
    MSGITEM --> CODE["💻 code-block<br/>代码高亮"]
    MSGITEM --> THINK["💭 thinking-block<br/>推理过程"]
    MSGITEM --> TOOL["🔧 tool-call-card<br/>工具调用卡片"]

    INPUT --> TOOLBAR["🛠️ toolbar<br/>附件 · 工具 · 模式"]
    INPUT --> TA["📝 textarea<br/>文本输入"]

    ROOT --> CONFIRM["⚠️ tool-confirm<br/>工具确认弹窗"]
    ROOT --> BUBBLE["🫧 bubble-icon<br/>最小化气泡"]

    style ROOT fill:#fff9c4,stroke:#f9a825,stroke-width:3px
    style MSG fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style INPUT fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style WIN fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style CONFIRM fill:#fce4ec,stroke:#c62828,stroke-width:2px
```

## 公开组件

宿主应用只需引入一个组件即可使用全部功能：

```mermaid
flowchart TD
    A["&lt;rtc-agent&gt;"] --> B["📋 属性"]
    A --> C["📢 事件"]
    A --> D["🎨 CSS 变量"]

    B --> B1["theme: light / dark / system"]
    B --> B2["app-label: 标题文字"]
    B --> B3["bubble-icon: 气泡图标"]
    B --> B4["scenarios-url: 场景文档"]
    B --> B5["agentConfig: 声明式配置"]

    C --> C1["rtc-agent-ready"]

    D --> D1["--rtc-window-default-width"]
    D --> D2["--rtc-window-default-height"]
    D --> D3["--rtc-bubble-size"]

    style A fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style B fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style D fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

| 属性 | 说明 | 示例 |
|------|------|------|
| `theme` | 主题切换 | `light` / `dark` / `system` |
| `app-label` | 标题栏文字 + 气泡 tooltip | `"RTC 助手"` |
| `bubble-icon` | 最小化气泡内的 SVG/HTML | 自定义图标 |
| `scenarios-url` | 场景文档 URL | `"https://..."` |
| `agentConfig` | 声明式函数注册（推荐） | JSON 配置对象 |

---

## 状态管理

```mermaid
flowchart TD
    subgraph CONTROLLERS["🎮 9 个 Controller"]
        direction TB
        C1["🪟 WindowState<br/>窗口位置 / 尺寸"]
        C2["🔐 Auth<br/>登录状态"]
        C3["📦 Session<br/>会话列表"]
        C4["💬 Message<br/>消息列表"]
        C5["🔧 Mode<br/>工作模式"]
        C6["⚠️ ToolCall<br/>工具确认"]
        C7["💾 Persistence<br/>数据层"]
        C8["📚 Skill<br/>函数注册"]
        C9["🖱️ WindowInteraction<br/>拖拽交互"]
    end

    ROOT["🏠 &lt;rtc-agent&gt;<br/>中枢编排"] --> C1
    ROOT --> C2
    ROOT --> C3
    ROOT --> C4
    ROOT --> C5
    ROOT --> C6
    ROOT --> C7
    ROOT --> C8
    ROOT --> C9

    ROOT -->|"@lit/context"| CHILDREN["🧩 子组件<br/>按需消费状态"]

    style ROOT fill:#fff9c4,stroke:#f9a825,stroke-width:3px
    style CONTROLLERS fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style CHILDREN fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

### 设计原则

| 原则 | 说明 |
|------|------|
| **Controller 不互相引用** | 每个 Controller 独立管理自己的状态切片 |
| **根组件编排** | `<rtc-agent>` 作为中枢，协调跨 Controller 通信 |
| **Context 分发** | 通过 `@lit/context` 向子组件分发状态，避免 prop drilling |
| **数据层隔离** | Persistence Controller 统一管理 IndexedDB 读写 |

> 💡 **为什么不用全局状态？** Web Components 运行在宿主应用的页面中，可能有多个实例。Controller + Context 保证每个 `<rtc-agent>` 实例的状态完全隔离。

---

## 窗口系统

```mermaid
flowchart LR
    subgraph MODES["🪟 窗口模式"]
        direction TB
        N["📐 normal<br/>浮动窗口<br/>420×640<br/>可拖拽 / 缩放"]
        M["🔲 maximized<br/>全屏<br/>100% 填充"]
        B["🫧 minimized<br/>气泡<br/>40×40 圆形"]
    end

    N -->|"最大化"| M
    M -->|"还原"| N
    N -->|"最小化"| B
    B -->|"点击恢复"| N

    style N fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style M fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style B fill:#fff3e0,stroke:#f57c00,stroke-width:2px
```

| 交互 | 实现 |
|------|------|
| **拖拽** | title-bar 作为拖拽手柄 |
| **缩放** | 8 方向 resize |
| **键盘** | 方向键移动，Shift 加速 |
| **视口约束** | 始终保持在可视区域内 |

```mermaid
flowchart TD
    A["🖱️ 用户拖拽"] --> B["WindowInteraction Controller"]
    B --> C["计算新位置"]
    C --> D{"视口内？"}
    D -->|"✅ 是"| E["更新 WindowState"]
    D -->|"❌ 越界"| F["约束到边界"]
    F --> E
    E --> G["🖥️ UI 重绘"]

    style B fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style E fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
```

---

## 样式系统

```mermaid
flowchart TD
    subgraph LAYERS["🎨 样式分层"]
        direction TB
        L1["🏗️ Design Tokens<br/>间距 · 字体 · 圆角 · 阴影 · 过渡 · z-index"]
        L2["🌈 颜色主题<br/>light / dark（VS Code 风格）"]
        L3["📏 CSS 变量<br/>组件级自定义<br/>窗口尺寸 · 气泡大小"]
    end

    L1 --> L2 --> L3

    style LAYERS fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style L1 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style L2 fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style L3 fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| 层级 | 内容 | 自定义方式 |
|------|------|------------|
| **Design Tokens** | 间距、字体、圆角、阴影、过渡、z-index | 覆盖 CSS 变量 |
| **颜色主题** | light / dark 两套配色 | `theme` 属性切换 |
| **CSS 变量** | 窗口尺寸、气泡大小 | `--rtc-*` 前缀变量 |

---

## 关键交互

### 输入区域

```mermaid
flowchart TD
    subgraph INPUT["⌨️ 输入区域"]
        direction TB
        TA["📝 textarea<br/>多行输入"]
        TB_BAR["🛠️ 底部工具栏"]
    end

    TB_BAR --> ATT["📎 附件"]
    TB_BAR --> TOOL_BTN["🔧 工具"]
    TB_BAR --> MODE_BTN["⚙️ 模式切换"]
    TB_BAR --> SEND["📤 发送 / 停止"]

    TA -->|"Enter"| SEND_MSG["发送消息"]
    TA -->|"Shift+Enter"| NEWLINE["换行"]

    style INPUT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

### 消息列表

| 特性 | 行为 |
|------|------|
| **自动滚动** | 新消息到达时自动滚动到底部 |
| **智能暂停** | 用户手动上滑时暂停自动滚动 |
| **新消息提示** | 用户离开底部时显示"新消息"按钮 |
| **渲染** | Markdown 渲染 + 代码高亮 |

### 工具确认弹窗

```mermaid
flowchart TD
    A["🔧 AI 请求调用工具"] --> B["⚠️ 弹出确认框"]
    B --> C["显示工具名和参数"]
    C --> D{"用户决定"}
    D -->|"✅ Yes"| E["执行工具"]
    D -->|"❌ No / 点击背景"| F["拒绝执行"]
    E --> G["📤 提交结果"]
    F --> H["📤 提交拒绝状态"]

    style B fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style E fill:#c8e6c9,stroke:#388e3c,stroke-width:2px
    style F fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

## 下一步

- [后端架构](/docs/architecture/backend/) — 了解 Go 服务端的分层设计
- [架构总览](/docs/architecture/) — 返回架构全景
- [Remote Tool Calling](/docs/concepts/rtc/) — 了解前端工具调用的核心协议
- [虚拟文件系统](/docs/concepts/virtual-fs/) — 了解前端 IndexedDB 文件系统
