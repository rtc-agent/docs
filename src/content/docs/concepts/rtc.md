---
title: Remote Tool Calling
description: RTC Agent 的核心协议——AI 在服务端推理，工具在前端执行，数据不离开用户浏览器。
---

**Remote Tool Calling（RTC）** 是 RTC Agent 的核心协议。它颠覆了传统的调用方向：不是前端调用后端 API，而是 **AI 调用前端工具**——文件读写、脚本执行、业务接口调用，都在用户浏览器内完成。

## 为什么需要 RTC

```mermaid
flowchart LR
    subgraph TRADITIONAL["传统方案"]
        direction TB
        A1["前端"] -->|"请求"| A2["后端"]
        A2 -->|"调用工具"| A3["工具执行<br/>在服务端"]
        A3 -->|"结果 + 数据"| A2
        A2 -->|"响应"| A1
    end

    subgraph RTC["RTC 方案"]
        direction TB
        B1["前端<br/>🔐 数据留在本地"] -->|"用户消息"| B2["后端<br/>🤖 AI 推理"]
        B2 -->|"tool_call"| B1
        B1 -->|"工具执行<br/>在前端"| B1
        B1 -->|"执行结果"| B2
    end

    style TRADITIONAL fill:#fff3e0,stroke:#f57c00,stroke-width:2px
    style RTC fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| | 传统方案 | RTC |
|---|---------|-----|
| **工具执行** | 服务端 | 前端 |
| **数据流向** | 上云 🔒 | 留在用户设备 🔐 |
| **隐私** | 数据经过服务端 | 端到端，数据不出浏览器 |
| **可观测性** | 黑箱 | 用户全程可见 |

## 完整生命周期

一次 RTC 调用经历以下步骤：

```mermaid
sequenceDiagram
    actor User as 👤 用户
    participant FE as 🖥️ 前端
    participant Server as ⚙️ 服务端
    participant Redis as 📦 Redis
    participant LLM as 🧠 AI 模型

    LLM->>Server: 1. 请求调用工具
    Server->>Server: 2. 创建 RTC 记录
    Server->>Redis: 3. 保存 Checkpoint
    Server->>Server: 4. 暂停 Turn

    Server-->>FE: 5. 推送 RTC 事件

    alt 需要用户确认
        FE->>User: 6a. 显示确认弹窗
        User->>FE: 批准 / 拒绝
    end

    FE->>FE: 7. 在本地执行工具
    FE->>Server: 8. 提交执行结果
    Server->>Redis: 9. 恢复 Checkpoint
    Server->>LLM: 10. 继续推理（带工具结果）
```

> 💡 **关键设计**：服务端在推送 RTC 后将 Turn **暂停**并保存 Checkpoint 到 Redis。即使服务端重启，也能从 Checkpoint 恢复——用户完全无感知。

## 内置工具

RTC 协议定义了 **6 个内置工具**，覆盖文件系统和脚本执行：

| 工具 | 功能 | 关键参数 |
|:----:|------|----------|
| 🔍 `ls` | 列出目录内容 | `path`（默认 `/`） |
| 📖 `read` | 读取文件内容 | `path`，`offset` / `limit`（分页） |
| ✏️ `write` | 写入文件 | `path`、`content`，`mode`（overwrite / append） |
| 🔎 `grep` | 按内容搜索 | `pattern`（正则），`path` |
| 📁 `find` | 按名称搜索 | `pattern`（glob），`path` |
| ⚡ `script` | 执行 JavaScript | `action`（save / run / eval），`code` |

这 6 个工具让 AI 拥有了一个 **完整的文件操作界面**——就像操作本地终端一样操作前端虚拟文件系统。

## 状态机

每个 RTC 调用都有明确的生命周期状态：

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Pending: 创建 RTC

    Pending --> Sent: 推送至前端
    Sent --> Executing: 开始执行

    Executing --> Completed: 执行成功 ✅
    Executing --> Failed: 执行失败 ❌
    Executing --> Timeout: 执行超时 ⏱️
    Executing --> Rejected: 用户拒绝 🚫

    Completed --> [*]
    Failed --> [*]
    Timeout --> [*]
    Rejected --> [*]

    state Executing {
        [*] --> 执行中
        执行中 --> 结果上报
        结果上报 --> [*]: 100% 送达
    }
```

| 状态 | AI 看到的提示 | 说明 |
|:----:|:------------:|------|
| `Pending` | `[Tool Pending]` | 等待前端接收 |
| `Sent` | `[Tool Pending]` | 已送达前端 |
| `Executing` | `[Tool Pending]` | 正在执行 |
| `Completed` | 工具输出 | 执行成功，结果回传 |
| `Failed` | `[Tool Error]` | 执行失败 |
| `Timeout` | `[Tool Timeout]` | 执行超时 |
| `Rejected` | `[Tool Rejected]` | 用户拒绝执行 |

## 权限矩阵

不同**工作模式**下，工具的确认策略不同：

```mermaid
flowchart TD
    subgraph MANUAL["🔒 manual 模式"]
        M1["只读工具<br/>ls / read / find / grep"] -->|✅ 自动允许| M1R[执行]
        M2["write"] -->|⚠️ 需确认| M2R[弹窗]
        M3["script"] -->|⚠️ 需确认| M3R[弹窗]
    end

    subgraph EDIT["📝 edit 模式（默认）"]
        E1["只读工具"] -->|✅ 自动允许| E1R[执行]
        E2["write"] -->|✅ 自动允许| E2R[执行]
        E3["script"] -->|⚠️ 需确认| E3R[弹窗]
    end

    subgraph BYPASS["⚡ bypass 模式"]
        B1["所有工具"] -->|✅ 自动允许| B1R[执行]
    end

    style MANUAL fill:#fce4ec,stroke:#c62828,stroke-width:2px
    style EDIT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style BYPASS fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

| 工具 | manual | edit | plan / auto | bypass |
|------|:------:|:----:|:-----------:|:------:|
| `ls` / `read` / `find` / `grep` | ✅ | ✅ | ✅ | ✅ |
| `write` | ⚠️ 确认 | ✅ | ✅ | ✅ |
| `script` | ⚠️ 确认 | ⚠️ 确认 | ⚠️ 确认 | ✅ |

> 📌 **设计原则**：只读操作始终安全放行；`write` 仅在最高警戒模式下需要确认；`script` 因为可以执行任意代码，除 bypass 外都需要用户确认。

## Checkpoint 机制

RTC 的核心可靠性保障是 **Checkpoint**：

```mermaid
flowchart LR
    A["🧠 AI 请求工具"] --> B["📦 保存 Checkpoint<br/>到 Redis"]
    B --> C["⏸️ Turn 暂停"]
    C --> D["⏳ 等待前端执行<br/>（可能很久）"]
    D --> E["📤 提交结果"]
    E --> F["♻️ 从 Checkpoint 恢复"]
    F --> G["🧠 AI 继续推理"]

    style B fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style C fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    style F fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| 特性 | 说明 |
|------|------|
| **存储位置** | Redis，TTL 24 小时 |
| **崩溃恢复** | 服务端重启后可从 Checkpoint 恢复 |
| **用户体验** | 感知为"AI 等待工具结果后继续" |

## 可靠性保证

RTC 结果上报遵循 **100% 送达** 原则：

```mermaid
flowchart TD
    A["🔧 工具执行完成"] --> B["📤 提交结果到服务端"]
    B --> C{"成功？"}
    C -->|"✅ 是"| D["🎉 完成"]
    C -->|"❌ 否"| E["标记 sync_status = failed"]
    E --> F["⏳ 等待重试"]
    F --> B

    style D fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
    style E fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

**为什么必须 100% 送达？** 因为 AI 在等待工具结果才能继续推理。如果结果丢失，AI 会无限等待。

| 机制 | 说明 |
|------|------|
| **无限重试** | 提交失败自动重试，无放弃机制 |
| **幂等保证** | 相同 `client_id` 重复提交返回成功 |
| **指数退避** | 重试间隔 1s → 2s → 4s → ... → 30s 封顶 |

## 顺序执行

同一会话内的 RTC **严格串行**，避免并发导致的文件冲突：

```mermaid
flowchart LR
    RTC1["RTC 1<br/>📖 read /config"] -->|完成| RTC2["RTC 2<br/>✏️ write /config"]
    RTC2 -->|完成| RTC3["RTC 3<br/>⚡ script"]
    RTC3 -->|完成| RTC4["🧠 AI 继续推理"]

    style RTC1 fill:#e3f2fd,stroke:#1565c0
    style RTC2 fill:#e3f2fd,stroke:#1565c0
    style RTC3 fill:#e3f2fd,stroke:#1565c0
    style RTC4 fill:#e8f5e9,stroke:#388e3c
```

> 当前 RTC 完成后，才会处理下一个。这对用户来说是无感知的——AI 会自然地依次完成每个操作。

## 下一步

- [虚拟文件系统](/docs/concepts/virtual-fs/) — 了解 RTC 工具操作的文件系统
- [工作模式](/docs/concepts/work-modes/) — 了解权限矩阵背后的模式切换
- [会话管理](/docs/features/session/) — 了解 RTC 在会话中的上下文
