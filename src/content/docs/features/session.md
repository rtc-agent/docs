---
title: 会话管理
description: 会话是用户与 AI 对话的容器——创建、切换、分叉、关闭，以及本地优先的数据策略。
---

**会话（Session）** 是用户与 AI 对话的容器。每个会话独立管理自己的消息历史和执行状态。用户可以自由创建、切换、重命名会话，还能基于任意一条历史消息**分叉**出新会话。

## 会话状态

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Idle: 创建会话

    Idle --> Active: 发送消息 / 恢复 Turn
    Active --> Idle: Turn 完成 / 中断 / 失败

    Idle --> Closed: 关闭会话
    Active --> Closed: 关闭会话

    Closed --> [*]

    state Active {
        [*] --> 正在执行
        正在执行 --> AI推理中: LLM 处理
        AI推理中 --> 等待工具: RTC 调用
        等待工具 --> AI推理中: 工具结果返回
        AI推理中 --> [*]: 完成
    }
```

| 状态 | 含义 | 可执行操作 |
|:----:|------|-----------|
| 🟢 `Idle` | 空闲，可发送新消息 | 发送消息、关闭 |
| 🔵 `Active` | 正在执行 Turn | 停止 Turn、关闭 |
| ⚫ `Closed` | 已关闭，不可再写入 | 查看历史、分叉 |

## 会话操作

```mermaid
flowchart TD
    subgraph CREATE["🆕 创建"]
        C1["发送首条消息<br/>→ 自动创建"]
        C2["点击新建按钮<br/>→ 创建空会话"]
    end

    subgraph MANAGE["📋 管理"]
        M1["📑 列表<br/>游标分页，按时间倒序"]
        M2["🔄 切换<br/>加载对应消息历史"]
        M3["✏️ 重命名<br/>修改会话标题"]
    end

    subgraph ADVANCED["🔀 高级"]
        A1["🌿 分叉<br/>基于某条消息创建分支"]
        A2["🔒 关闭<br/>冻结会话，停止执行"]
    end

    style CREATE fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style MANAGE fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style ADVANCED fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

| 操作 | 说明 |
|------|------|
| **创建** | 发送首条消息时自动创建，无独立 RPC；也可点击新建按钮创建空会话（纯前端本地创建） |
| **列表** | 按创建时间倒序，游标分页加载 |
| **切换** | 纯前端行为，无 RPC——从本地 IndexedDB 加载对应消息历史 |
| **重命名** | 修改会话标题 |
| **分叉** | 基于某条消息复制历史，替换该消息内容，触发新的 AI 流程 |
| **关闭** | 标记为 `Closed`，停止正在执行的 Turn |

## 会话标题

```mermaid
flowchart LR
    A["📝 会话标题"] --> B["🤖 自动截取"]
    A --> C["✏️ 手动重命名"]
    A --> D["🌿 分叉继承"]

    B --> B1["取首条消息前 50 字符"]
    C --> C1["用户主动修改"]
    D --> D1["新会话继承原标题<br/>+ 标记为分叉"]

    style B fill:#e3f2fd,stroke:#1565c0
    style C fill:#fff9c4,stroke:#f9a825
    style D fill:#f3e5f5,stroke:#7b1fa2
```

## 会话分叉

分叉是 RTC Agent 的特色功能——**对之前的回答不满意？修改问题，重新生成。**

```mermaid
flowchart LR
    subgraph BEFORE["原会话"]
        direction TB
        M1["💬 消息 1"]
        M2["💬 消息 2"]
        M3["💬 消息 3"]
        M4["💬 消息 4 ← 从这里分叉"]
        M5["💬 消息 5"]
    end

    subgraph AFTER["新会话（分叉）"]
        direction TB
        N1["💬 消息 1（复制）"]
        N2["💬 消息 2（复制）"]
        N3["💬 消息 3（复制）"]
        N4["💬 消息 4'（修改后的内容）"]
        N5["🤖 AI 重新回答..."]
    end

    M4 -.->|"复制历史<br/>替换该消息"| N4

    style BEFORE fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style AFTER fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

分叉流程：

| 步骤 | 说明 |
|------|------|
| 1. 选择消息 | 点击任意一条历史消息 |
| 2. 点击分叉 | 触发分叉操作 |
| 3. 复制历史 | 复制该消息之前的所有消息 |
| 4. 替换内容 | 用新内容替换选中的消息 |
| 5. 触发 AI | AI 基于新内容重新处理 |

## 并发约束

```mermaid
flowchart TD
    subgraph SESSION["📋 同一会话"]
        T1["🟢 Turn 1（正在执行）"]
        T2["⏳ Turn 2（排队等待）"]
        T3["⏳ Turn 3（排队等待）"]
    end

    T1 -->|"完成后"| T2
    T2 -->|"完成后"| T3

    style T1 fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style T2 fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style T3 fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| 约束 | 说明 |
|------|------|
| **单 Turn 执行** | 同一会话同时只能有一个 Turn 在执行 |
| **归属隔离** | 用户只能操作自己的会话 |
| **关闭即冻结** | 已关闭的会话不可再发送消息 |

## 本地优先

RTC Agent 采用 **Local-First** 数据策略——所有操作先写入本地，再异步同步到服务端。

```mermaid
flowchart TD
    A["👤 用户操作"] --> B["💾 写入 IndexedDB"]
    B --> C["✅ 立即返回<br/>UI 更新"]
    B --> D["📤 后台同步到服务端"]
    D --> E{"同步结果？"}
    E -->|"✅ 成功"| F["标记 synced"]
    E -->|"❌ 失败"| G["标记 failed<br/>支持重试"]

    style B fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style F fill:#c8e6c9,stroke:#2e7d32
    style G fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

| 优势 | 说明 |
|------|------|
| ⚡ **即时响应** | 写入本地即返回，无网络等待 |
| 📴 **离线可用** | 断网时仍可操作，恢复后自动同步 |
| 🔄 **自动重试** | 同步失败标记 `failed`，支持手动重试 |

## 实时更新

服务端通过 WebSocket 推送会话变更，前端自动同步：

```mermaid
sequenceDiagram
    participant Server as ⚙️ 服务端
    participant WS as 🔌 WebSocket
    participant FE as 🖥️ 前端
    participant IDB as 💾 IndexedDB

    Server->>WS: 会话变更事件
    WS->>FE: 推送更新
    FE->>IDB: 同步到本地存储
    FE->>FE: 更新 UI
```

推送的变更类型：

| 事件 | 说明 |
|------|------|
| 创建 | 新会话被创建（如自动创建） |
| 更新 | 会话标题修改、状态变更 |
| 关闭 | 会话被关闭 |

## 下一步

- [消息与对话](/docs/features/messaging/) — 了解会话内的消息交互
- [Remote Tool Calling](/docs/concepts/rtc/) — 了解 Turn 中的工具调用
- [命令系统](/docs/features/commands/) — 了解会话级命令（/compact、/loop、/goal）
