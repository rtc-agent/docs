---
title: 上下文管理
description: RTC Agent 的三层压缩机制——从工具结果清理到全量摘要，让对话永不触及上下文天花板。
---

**上下文管理** 是对话持续进行的关键。当对话越来越长、工具输出越来越多时，系统通过 **三层压缩机制** 智能管理上下文窗口——保留关键信息，释放宝贵空间，让对话永不断裂。

## 三层压缩架构

```mermaid
flowchart TD
    subgraph LAYERS["📦 三层压缩机制"]
        direction TB
        L1["🔹 Layer 1: Microcompact<br/>工具结果清理"]
        L2["🔸 Layer 2: Auto Compact<br/>自动摘要压缩"]
        L3["🔹 Layer 3: Session Memory Compact<br/>会话记忆压缩"]
    end

    L1 -->|"空间不足"| L2
    L2 -->|"有 Session Memory"| L3
    L2 -->|"无 Session Memory"| L2B["🧠 调用 LLM 生成摘要"]

    subgraph SCOPE["压缩粒度"]
        direction LR
        S1["🎯 精细<br/>单个工具结果"]
        S2["📄 中等<br/>一批消息"]
        S3["📋 高效<br/>全部记忆摘要"]
    end

    L1 --> S1
    L2 --> S2
    L3 --> S3

    style LAYERS fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    style SCOPE fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px
    style L1 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style L2 fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style L3 fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| 层级 | 名称 | 触发条件 | 压缩粒度 | 成本 |
|:----:|------|----------|----------|:----:|
| 1 | Microcompact | 时间间隔 / 缓存编辑 / API 原生 | 单个工具结果 | 零 |
| 2 | Auto Compact | token 达到阈值 | 一批消息 → 摘要 | 一次 LLM 调用 |
| 3 | Session Memory Compact | Auto Compact 触发时 | 会话记忆 → 摘要 | 零 |

## Microcompact — 工具结果清理

Microcompact 是最轻量的压缩——不生成摘要，只清理占用大量空间的旧工具结果。

### 可清理的工具

只有产生大量输出的工具才会被清理：

| 工具 | 典型输出 |
|:----:|----------|
| 📖 `Read` | 文件内容 |
| ⚡ `Bash` / `PowerShell` | 命令输出 |
| 🔍 `Grep` | 搜索结果 |
| 📁 `Glob` | 文件列表 |
| 🌐 `WebSearch` / `WebFetch` | 网页内容 |
| ✏️ `Edit` / 📝 `Write` | 操作结果 |

### 三种清理策略

```mermaid
flowchart TD
    REQ["📤 请求前"] --> A{"Time-based<br/>间隔 > 60 分钟？"}
    A -->|"✅ 是"| A1["清理旧工具结果<br/>保留最近 5 个"]
    A -->|"❌ 否"| B{"Cached MC<br/>启用？"}
    B -->|"✅ 是"| B1["通过 cache_edits<br/>清理（不破坏缓存）"]
    B -->|"❌ 否"| C{"API-level<br/>启用？"}
    C -->|"✅ 是"| C1["使用 context_management<br/>原生 API 清理"]
    C -->|"❌ 否"| SKIP["⏭️ 跳过微压缩"]

    A1 --> SEND["📤 发送请求"]
    B1 --> SEND
    C1 --> SEND
    SKIP --> SEND

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style B fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style SKIP fill:#f5f5f5,stroke:#9e9e9e,stroke-width:2px
    style SEND fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
```

| 策略 | 触发条件 | 原理 | 适用场景 |
|------|----------|------|----------|
| 🕐 Time-based | 距上次 assistant 消息 > 60 分钟 | 直接替换旧工具结果为占位符 | 用户离开后回来 |
| 💾 Cached | 缓存仍然有效 | 通过 `cache_edits` 告知 API 删除特定结果 | 缓存未过期时 |
| 🔌 API-level | token >= 180,000 | 使用 Anthropic 原生 `context_management` | 接近上下文上限 |

> 💡 Time-based 策略至少保留 1 个最近的工具结果，避免模型完全失去工作上下文。

## Auto Compact — 自动摘要压缩

当 Microcompact 不够用时，Auto Compact 启动——将一批旧消息压缩为一段精炼摘要。

### 触发条件

以 200K 上下文窗口模型为例：

```mermaid
flowchart LR
    W["📏 上下文窗口<br/>200,000 tokens"] --> E["减去预留输出<br/>- 20,000"]
    E --> T["减去缓冲区<br/>- 13,000"]
    T --> TH["阈值 = 167,000 tokens"]

    TH --> CHECK{"当前 token >= 阈值？"}
    CHECK -->|"✅ 是"| COMPACT["🗜️ 触发压缩"]
    CHECK -->|"❌ 否"| CONT["🔄 继续对话"]

    style W fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style TH fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style COMPACT fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style CONT fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| 配置项 | 值 | 说明 |
|--------|:--:|------|
| `MAX_OUTPUT_TOKENS_FOR_SUMMARY` | 20,000 | 为模型输出预留空间 |
| `AUTOCOMPACT_BUFFER_TOKENS` | 13,000 | 安全缓冲区 |
| **触发阈值**（200K 模型） | **167,000** | 达到此值即触发 |

### 熔断机制

连续失败 3 次后自动停止压缩尝试，避免在不可恢复的场景下浪费资源：

```mermaid
flowchart LR
    F1["❌ 失败 1"] --> F2["❌ 失败 2"]
    F2 --> F3["❌ 失败 3"]
    F3 --> STOP["⛔ 停止自动压缩"]

    style F1 fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style F2 fill:#ffe0b2,stroke:#e65100,stroke-width:2px
    style F3 fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style STOP fill:#f44336,stroke:#b71c1c,stroke-width:2px,color:#fff
```

### 压缩提示词

Auto Compact 使用 **9 部分结构** 的提示词，确保摘要涵盖所有关键维度：

| 序号 | 部分 | 内容 |
|:----:|------|------|
| 1 | Primary Request and Intent | 用户的核心请求和意图 |
| 2 | Key Technical Concepts | 涉及的关键技术概念 |
| 3 | Files and Code Sections | 相关文件与代码片段（含完整代码） |
| 4 | Errors and Fixes | 遇到的错误及修复方案 |
| 5 | Problem Solving | 问题解决过程 |
| 6 | All User Messages | 所有用户消息（非工具结果） |
| 7 | Pending Tasks | 待处理的任务 |
| 8 | Current Work | 当前正在进行的工作 |
| 9 | Optional Next Step | 可选的下一步操作 |

### 消息保留策略

压缩时不会丢弃所有旧消息，而是 **保留最近的消息**：

| 配置项 | 值 | 说明 |
|--------|:--:|------|
| `minTokens` | 10,000 | 至少保留的 token 数 |
| `minTextBlockMessages` | 5 | 至少保留的有文本块的消息数 |
| `maxTokens` | 40,000 | 最多保留的 token 数 |

```mermaid
flowchart LR
    A["📝 从后往前<br/>计算保留范围"] --> B{"满足条件？"}
    B -->|"tokens >= 10K<br/>且 消息 >= 5 条"| C["✅ 停止保留"]
    B -->|"tokens >= 40K"| D["⛔ 达到上限<br/>停止保留"]
    B -->|"都不满足"| E["◀️ 继续向前保留"]
    E --> B

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style D fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style E fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

> 📌 **API 不变量保护**：保留消息中的 `tool_result` 必须能找到对应的 `tool_use`，压缩时会向前扩展保留范围以确保配对完整。

## Session Memory Compact

当 [记忆系统](/docs/features/memory/) 中有 Session Memory 时，压缩可以 **零成本** 完成：

```mermaid
flowchart TD
    A["⚡ Auto Compact 触发"] --> B{"Session Memory<br/>存在？"}
    B -->|"✅ 有"| C["📋 用 Session Memory<br/>直接作为摘要"]
    B -->|"❌ 无"| D["🧠 调用 LLM<br/>生成摘要"]
    C --> E["💰 零成本 + 更高质量"]
    D --> F["💸 一次 API 调用"]
    E --> G["🔄 替换旧消息 + 保留最近消息"]
    F --> G

    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style D fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style E fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
    style F fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

这正是记忆系统与上下文管理的 **交汇点**——对话过程中持续积累的 Session Memory，在压缩时直接变成高质量摘要，无需额外调用 LLM。

## 压缩后的上下文恢复

压缩后，系统会自动恢复最近读取的文件，帮助模型快速回到工作状态：

| 配置项 | 值 | 说明 |
|--------|:--:|------|
| 最多恢复文件数 | 5 | 最近读取的 5 个文件 |
| 总 token 预算 | 50,000 | 所有恢复文件的总上限 |
| 单文件 token 上限 | 5,000 | 每个文件的最大 token |

## 系统提示词组装

系统提示词分为 **静态** 和 **动态** 两部分，静态部分可全局缓存以降低成本：

```mermaid
flowchart TD
    subgraph STATIC["🔒 静态部分（可缓存）"]
        direction TB
        S1["基础系统提示词<br/>身份、安全、工具指南"]
        S2["工具 Schema 定义<br/>每个会话缓存一次"]
        S3["Agent 定义<br/>默认提示词"]
    end

    subgraph DYNAMIC["🔄 动态部分（每次请求）"]
        direction TB
        D1["📅 当前日期"]
        D2["🔀 Git 状态快照"]
        D3["📝 自定义提示词"]
        D4["📋 记忆注入"]
        D5["📎 附件内容"]
    end

    STATIC --> CACHE["💾 Prompt Cache"]
    DYNAMIC --> REQ["📤 API 请求"]
    CACHE --> REQ

    style STATIC fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style DYNAMIC fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style CACHE fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style REQ fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
```

**提示词优先级**（从高到低）：

| 优先级 | 来源 | 说明 |
|:------:|------|------|
| 1 | `overrideSystemPrompt` | 替换所有其他提示词 |
| 2 | Coordinator system prompt | Coordinator 模式 |
| 3 | Agent system prompt | Agent 定义存在时替换默认 |
| 4 | Custom system prompt | `--system-prompt` 参数 |
| 5 | Default system prompt | 标准系统提示词 |
| 6 | `appendSystemPrompt` | 始终追加到末尾 |

## 消息组装流程

每次 API 调用前，消息经历完整的组装管线：

```mermaid
flowchart TD
    A["📝 原始消息历史"] --> B["过滤<br/>压缩边界后的消息"]
    B --> C["裁剪<br/>强制 tool result 大小限制"]
    C --> D["移除<br/>旧消息"]
    D --> E["🔹 Microcompact<br/>压缩工具结果"]
    E --> F["折叠<br/>上下文折叠"]
    F --> G["🔸 Auto Compact<br/>完整压缩"]
    G --> H["注入<br/>CLAUDE.md + 日期"]
    H --> I["📤 API 调用"]
    I --> J["📎 添加附件消息"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style E fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style G fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style I fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    style J fill:#fce4ec,stroke:#c62828,stroke-width:2px
```

## 附件系统

附件系统在对话过程中动态注入上下文信息：

| 附件类型 | 注入时机 | 说明 |
|----------|----------|------|
| 📅 当前日期 | 初始 + 日期变化时 | 通过 `date_change` 附件更新 |
| 🔀 Git Status | 对话开始时 | 当前分支、状态（截断 2000 字符）、最近提交 |
| 📋 Todo List | 每 10 轮 | 提醒待办事项进展 |
| 🧠 CLAUDE.md | 初始注入 | 项目指令和配置 |
| 📂 嵌套记忆 | 子目录操作时 | 搜索目录层级中的 CLAUDE.md |
| 🔍 相关记忆 | 异步预取 | 从 auto-memory 中检索相关记忆 |
| 🛠️ Skills | 发现 / 调用时 | 可用技能列表和调用内容 |
| 💻 IDE 上下文 | 实时 | 选中行、打开的文件 |
| 📊 Token 用量 | 实时 | 当前 token 使用情况和预算 |

## 下一步

- [记忆系统](/docs/features/memory/) — 深入了解 Session Memory 和 User Memory 的工作原理
- [Remote Tool Calling](/docs/concepts/rtc/) — 了解工具调用的完整生命周期
- [会话管理](/docs/features/session/) — 了解上下文管理在会话中的位置
