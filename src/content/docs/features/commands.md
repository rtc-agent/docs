---
title: 命令系统
description: 通过 /command 语法快速触发功能——支持本地执行、后端调用和 AI 注入三种模式。
---

**命令系统** 让用户通过 `/command` 语法快速触发特定功能。输入 `/` 开头的文本，前端自动识别命令名和参数，分发到对应的处理逻辑——就像终端命令行一样高效。

## 命令类型

```mermaid
flowchart TD
    subgraph LOCAL["🖥️ local — 前端本地执行"]
        L1["/clear 清空本地状态"]
    end

    subgraph RPC["📡 rpc — 调用后端接口"]
        R1["/compact 触发上下文压缩"]
    end

    subgraph PROMPT["💬 prompt — 注入 prompt 给 AI"]
        P1["/loop 设置循环任务"]
        P2["/goal 设定目标"]
    end

    style LOCAL fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style RPC fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style PROMPT fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| 类型 | 执行方式 | 说明 | 示例 |
|:----:|:-------:|------|------|
| **local** | 前端直接处理 | 不经过后端，如清空本地状态 | `/clear` |
| **rpc** | 调用后端 RPC | 需要后端配合，如触发压缩 | `/compact` |
| **prompt** | 生成 prompt 注入对话 | 交给 AI 处理，如设置循环任务 | `/loop`、`/goal` |

## 命令解析流程

```mermaid
flowchart TD
    A["👤 用户输入"] --> B{"以 / 开头?"}
    B -->|"否"| C["作为普通消息发送"]
    B -->|"是"| D["解析命令名 + 参数"]
    D --> E{"命令存在?"}
    E -->|"否"| F["❌ 显示错误提示"]
    E -->|"是"| G["按类型分发执行"]
    G --> H["🖥️ local: 前端处理"]
    G --> I["📡 rpc: 调用后端"]
    G --> J["💬 prompt: 注入对话"]

    style B fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style E fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style H fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style I fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style J fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

解析规则：
- `/` 后第一个单词为**命令名**
- 剩余部分为**参数**（原始字符串传递）
- 命令名匹配优先级：**精确匹配** > **别名匹配**

命令来自两个渠道：系统**内置命令**（`/compact`、`/loop`、`/goal`）和宿主应用通过 API 注册的**自定义命令**。

---

## /compact — 手动压缩

暴露已有的自动压缩功能，允许用户主动触发上下文压缩，释放 token 空间。

```mermaid
flowchart LR
    A["👤 /compact [指令]"] --> B["📤 前端发送 RPC"]
    B --> C["⚙️ 后端接收请求"]
    C --> D["📋 加入压缩队列"]
    D --> E["🗜️ 执行压缩"]
    E --> F["📊 返回压缩结果"]
    F --> G["🖥️ 前端更新状态"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style D fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style E fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style F fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| 参数 | 必填 | 说明 |
|:----:|:----:|------|
| 自定义指令 | 否 | 覆盖默认压缩 prompt 的自定义摘要指令 |

| 关键规则 | 说明 |
|---------|------|
| **异步执行** | 压缩走队列，不阻塞当前对话 |
| **完成通知** | 压缩完成后通过 Live 频道推送通知 |
| **防重复** | 压缩中禁止重复触发 |
| **结果反馈** | 返回压缩前 token 数、压缩后 token 数、压缩比 |

---

## /loop — 循环执行

用户用自然语言描述需要循环执行的任务，Agent 理解意图后选择合适的循环模式执行。

### 两种循环模式

```mermaid
flowchart TD
    A["👤 用户描述循环任务"] --> B{"🧠 Agent 判断模式"}
    B -->|"固定间隔"| C["⏰ 定时循环"]
    B -->|"目标驱动"| D["🔄 动态循环"]

    C --> E["scheduler.create<br/>前端管理定时器"]
    D --> F["loop.create<br/>系统管理轮次状态"]

    style C fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style D fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style B fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| | 定时循环 | 动态循环 |
|---|:------:|:------:|
| **触发方式** | 固定时间间隔 | 目标驱动，轮次相关 |
| **适用场景** | 监控部署、轮询状态 | 测试迭代、代码优化、批量处理 |
| **状态存储** | IndexedDB（前端） | 后端数据库 |
| **实现方式** | RTC tool `scheduler.*` | RTC tool `loop.*` |
| **页面关闭** | 暂停，重新打开恢复 | 持久化，不依赖前端 |

### 模式判断

Agent 根据用户描述中的关键词自动判断使用哪种模式：

| 用户描述 | 判断依据 | 选择模式 |
|----------|:-------:|:-------:|
| "每 5 分钟检查一次" | 固定时间间隔 | ⏰ 定时循环 |
| "每小时轮询" | 固定时间间隔 | ⏰ 定时循环 |
| "循环 5 轮" | 固定轮次，轮次相关 | 🔄 动态循环 |
| "直到测试通过" | 目标驱动 | 🔄 动态循环 |
| "处理这 100 个文件" | 批量处理，每批相关 | 🔄 动态循环 |
| "反复优化直到满意" | 迭代优化 | 🔄 动态循环 |

### 模式 1：定时循环（Scheduled Loop）

用于固定间隔的独立任务。Agent 调用 `scheduler.create` 在前端创建定时器。

```mermaid
flowchart TD
    A["👤 每 5 分钟检查部署状态"] --> B["🧠 Agent 理解意图"]
    B --> C["⚡ scheduler.create"]
    C --> D["🖥️ 前端创建定时任务"]
    E["⏰ 定时器触发"] --> F["💬 注入消息到对话"]
    F --> G["🧠 Agent 执行检查"]

    style C fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style D fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style E fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

**RTC 工具**：

| 工具 | 功能 |
|:----:|------|
| `scheduler.create` | 创建定时任务（参数：`interval`、`prompt`、`max_age`） |
| `scheduler.list` | 列出所有定时任务 |
| `scheduler.cancel` | 取消定时任务 |
| `scheduler.pause` | 暂停定时任务 |
| `scheduler.resume` | 恢复定时任务 |

**间隔格式**：

| 输入 | 含义 |
|:----:|------|
| `30s` | 30 秒（最小粒度 1 分钟，向上取整） |
| `5m` | 5 分钟 |
| `2h` | 2 小时 |
| `1d` | 1 天 |

**任务生命周期**：

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Active: scheduler.create 🆕
    Active --> Active: 定时触发 ⏰
    Active --> Paused: scheduler.pause / 页面关闭 ⏸️
    Paused --> Active: scheduler.resume / 页面重新打开 ▶️
    Active --> Expired: 超过最大存活时间 ⏱️
    Active --> Cancelled: scheduler.cancel ❌
    Expired --> [*]
    Cancelled --> [*]
```

| 阶段 | 行为 |
|:----:|------|
| **创建** | 立即执行一次 + 注册定时器 |
| **触发** | 注入消息到对话，Agent 执行（消息标记为 `isMeta: true`） |
| **暂停** | 页面关闭时暂停，不执行 |
| **恢复** | 页面重新打开后，从当前时间重算下次触发 |
| **过期** | 默认 7 天后自动过期（可配置） |
| **取消** | 调用 `scheduler.cancel` 手动取消 |

> 📌 定时任务存储在前端 IndexedDB 中，仅在当前会话有效，页面关闭后暂停。

### 模式 2：动态循环（Dynamic Loop）

用于目标驱动、轮次相关的关键任务。**系统显式管理任务状态**，保证执行完成，不依赖 LLM 上下文记忆。

> 💡 **为什么不能用 ReAct？** ReAct 依赖 LLM 上下文记忆任务进度，上下文过长时 LLM 可能"遗忘"任务——不可靠，用户不敢放心使用。

```mermaid
flowchart TD
    A["👤 测试网站，循环 5 轮"] --> B["🧠 Agent 理解意图"]
    B --> C["⚡ loop.create"]
    C --> D["📦 创建 LoopTask<br/>round=1, total=5"]
    D --> E["🔧 执行第 1 轮"]
    E --> F["💾 保存结果到任务状态"]
    F --> G["📊 更新: round=2"]
    G --> H["🔧 执行第 2 轮"]
    H --> I["..."]
    I --> J["✅ round=5 完成"]
    J --> K["📋 输出汇总报告"]

    style C fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style D fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style J fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
    style K fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

**设计原则**：

| 原则 | 说明 |
|------|------|
| **显式状态管理** | 当前轮次、总轮次、每轮参数、每轮结果都存在任务状态中 |
| **系统控制循环** | 不是 LLM 决定何时停止，而是系统检查任务状态 |
| **持久化** | 存储在数据库，即使上下文被压缩，任务状态不丢失 |
| **不达目的不罢休** | 保证执行完成，除非用户取消或达到最大轮次 |

**RTC 工具**：

| 工具 | 功能 | 关键参数 |
|:----:|------|----------|
| `loop.create` | 创建动态循环任务 | `task`、`total_rounds`、`termination_condition` |
| `loop.get_status` | 获取任务状态 | — |
| `loop.submit_round_result` | 提交当前轮次结果，触发下一轮 | `task_id`、`result`、`next_params` |
| `loop.cancel` | 取消任务 | `task_id` |

| 关键规则 | 说明 |
|---------|------|
| **状态注入** | 每轮执行前，系统注入任务状态到 Agent 上下文 |
| **结果提交** | 每轮执行后，Agent 必须调用 `loop.submit_round_result` |
| **终止检查** | 系统检查终止条件（轮次完成 / 条件满足）决定是否继续 |
| **暂停恢复** | 页面关闭时暂停，重新打开后恢复 |

---

## /goal — 目标驱动

用户设定一个**完成条件**，AI 持续工作直到条件满足。每次 AI 准备停止时，系统用独立评判模型检查条件是否达成，未达成则强制 AI 继续。

### 核心流程

```mermaid
flowchart TD
    A["👤 /goal 所有测试通过"] --> B["📦 存储目标条件"]
    B --> C["🪝 激活 Stop Hook"]
    C --> D["🧠 AI 执行工作"]
    D --> E{"🤔 AI 尝试停止"}
    E --> F["🔍 Judge 模型评判"]
    F -->|"❌ 未达成"| G["💬 注入反馈<br/>强制继续"]
    G --> D
    F -->|"✅ 已达成"| H["🛑 停止<br/>报告完成"]
    H --> I["🗑️ 清除目标"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style F fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style G fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style H fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
```

### 核心机制

```mermaid
flowchart LR
    subgraph Worker["🔧 Worker — 主模型"]
        A["AI 执行工作"]
    end
    subgraph Judge["🔍 Judge — 评判模型"]
        B["独立评判<br/>（Haiku）"]
    end
    subgraph Hook["🪝 Stop Hook"]
        C["停止拦截"]
    end

    A -->|"完成一轮"| C
    C -->|"读取会话记录"| B
    B -->|"未达成"| C
    C -->|"blocking feedback"| A
    B -->|"已达成"| D["✅ 允许停止"]

    style Worker fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style Judge fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style Hook fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style D fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
```

| 组件 | 职责 |
|:----:|------|
| **Worker** | 执行工作的主模型 |
| **Judge** | 独立评判模型（使用轻量模型如 Haiku，降低成本），读取会话记录判断目标是否达成 |
| **Stop Hook** | 在 AI 停止时触发，调用 Judge 检查条件 |

### 目标作为独立实体

Goal 是独立于 Session 的实体，有自己的生命周期：

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Active: /goal <condition> 🎯
    Active --> Active: 轮次执行 🔄
    Active --> Completed: Judge 判定达成 ✅
    Active --> Cancelled: /goal clear ❌
    Active --> Exhausted: 超过最大轮次 ⚠️
    Completed --> [*]
    Cancelled --> [*]
    Exhausted --> [*]
```

| 状态 | 说明 |
|:----:|------|
| `Active` | 目标激活中，AI 持续工作 |
| `Completed` | Judge 判定条件达成 |
| `Cancelled` | 用户手动取消 |
| `Exhausted` | 超过最大轮次上限（默认 50 轮） |

### Judge 评判

```mermaid
flowchart TD
    A["🛑 AI 尝试停止"] --> B["📖 读取会话记录"]
    B --> C["📝 构造评判 prompt"]
    C --> D["🔍 调用 Judge 模型"]
    D --> E{"评判结果"}
    E -->|"✅ 达成"| F["返回 allow"]
    E -->|"❌ 未达成"| G["返回 block + 原因"]

    style D fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style F fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
    style G fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

Judge 使用**轻量模型**（如 Haiku），输入目标条件 + 最近 N 轮会话记录，输出 `{ achieved: boolean, reason: string }`。评判失败时（API 错误等）默认允许停止，避免死循环。

### 状态显示

| 元素 | 说明 |
|------|------|
| **状态栏** | 显示当前目标条件摘要 |
| **Overlay 面板** | 显示已执行轮次、累计 token、运行时长 |
| **完成通知** | 目标达成时弹出通知 |

### 相关命令

| 命令 | 说明 |
|------|------|
| `/goal` | 显示当前目标 |
| `/goal <condition>` | 设定目标 |
| `/goal clear` | 清除目标 |

| 关键规则 | 说明 |
|---------|------|
| **单一目标** | 单次会话只能有一个活跃目标 |
| **会话内有效** | 目标仅在当前会话有效 |
| **安全上限** | 最大轮次上限（默认 50 轮），防止失控 |
| **失败兜底** | Judge 评判失败时默认允许停止 |

---

## 前端交互

```mermaid
flowchart TD
    A["👤 输入 /..."] --> B["🔍 实时检测命令名"]
    B --> C{"匹配命令?"}
    C -->|"是"| D["💡 显示命令提示<br/>参数说明"]
    C -->|"否"| E["无提示"]
    D --> F["⌨️ Tab 补全命令名"]

    style B fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style D fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| 交互特性 | 说明 |
|---------|------|
| **Typeahead** | 输入 `/` 后显示命令列表 |
| **Tab 补全** | Tab 键自动补全命令名 |
| **参数提示** | 匹配命令后显示参数说明（灰色文字） |
| **Toast 反馈** | 命令执行成功/失败时弹出 Toast 通知 |

**命令反馈**：

| 场景 | 反馈方式 |
|------|:-------:|
| 命令执行成功 | Toast 通知 ✅ |
| 命令执行失败 | Toast 错误提示 ❌ |
| 命令返回结果 | 系统消息显示在对话中 |
| 命令需要交互 | 弹出对话框 |

**状态栏** 实时显示活跃命令：Loop 任务显示任务数量和下次触发时间，Goal 目标显示条件摘要和运行时长。

## 下一步

- [Skill 系统](/docs/features/skill-system/) — 了解宿主如何注册自定义函数扩展 AI 能力
- [RTC 协议](/docs/concepts/rtc/) — 了解命令背后的远程工具调用机制
- [会话管理](/docs/features/session/) — 了解命令在会话中的上下文
