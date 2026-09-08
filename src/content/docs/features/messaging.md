---
title: 消息与对话
description: 消息是用户与 AI 交互的载体——流式输出、思考过程展示、工具调用卡片、本地优先发送。
---

消息是用户与 AI 交互的载体。用户发送消息，AI **流式返回**回复，支持 Markdown 渲染、代码高亮、思考过程展示、工具调用卡片——整个过程实时可见。

## 消息类型

```mermaid
flowchart TD
    subgraph MSG["📨 消息类型"]
        U["💬 用户消息"]
        AI["🤖 AI 消息"]
        SYS["ℹ️ 系统消息"]
    end

    subgraph AI_CONTENT["AI 消息内容"]
        T["📝 文本回复<br/>Markdown 渲染"]
        TH["🧠 思考过程<br/>可折叠"]
        TC["⚙️ 工具调用<br/>卡片展示"]
    end

    AI --> T
    AI --> TH
    AI --> TC

    style U fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style AI fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style SYS fill:#f5f5f5,stroke:#757575,stroke-width:2px
    style T fill:#e8f5e9,stroke:#2e7d32
    style TH fill:#fff9c4,stroke:#f9a825
    style TC fill:#f3e5f5,stroke:#7b1fa2
```

| 类型 | 说明 | 渲染方式 |
|------|------|----------|
| 💬 用户消息 | 用户输入的内容 | 纯文本 |
| 📝 AI 回复 | AI 生成的文本 | Markdown + 代码高亮 |
| 🧠 思考过程 | AI 的推理过程 | 可折叠，Markdown 渲染 |
| ⚙️ 工具调用 | AI 请求执行的工具 | 输入/输出卡片 |
| ℹ️ 系统消息 | 系统通知 | 纯文本 |

## 消息发送流程

```mermaid
flowchart TD
    A["👤 用户输入消息"] --> B["💾 本地写入 IndexedDB"]
    B --> C["✅ 立即显示在界面"]
    B --> D["📤 后台同步到服务端"]
    D --> E{"同步成功？"}
    E -->|"✅ 是"| F["标记 synced"]
    E -->|"❌ 否"| G["标记 failed<br/>显示重试按钮"]
    F --> H["📋 服务端创建消息记录"]
    H --> I["⚙️ 异步创建 Turn"]
    I --> J["🧠 AI 开始处理"]
    J --> K["📡 流式返回结果"]

    style B fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style G fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style K fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

消息采用**本地优先**策略：先存本地立即显示，后台异步同步。用户发消息后**零等待**即可看到消息出现在界面上。

## 发送失败处理

```mermaid
flowchart TD
    A["❌ 消息发送失败"] --> B["消息显示失败状态"]
    B --> C["🔄 显示重试按钮"]
    C --> D{"用户操作"}
    D -->|"点击重试"| E["使用相同 client_id 重新发送"]
    D -->|"不操作"| F["保持失败状态"]
    E --> G{"成功？"}
    G -->|"✅ 是"| H["标记 synced ✅<br/>移除重试按钮"]
    G -->|"❌ 否"| I["保持 failed 状态"]

    style A fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style H fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px
```

| 同步状态 | 用户看到的行为 |
|:--------:|---------------|
| `pending` | 消息显示发送中动画 |
| `synced` | 消息正常显示 |
| `failed` | 消息显示失败标记 + 🔄 重试按钮 |

> 💡 重试使用相同的 `client_id`，服务端**幂等去重**，不会产生重复消息。

## Turn 状态机

每次 AI 处理构成一个 **Turn**，它有明确的生命周期：

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Pending: 创建 Turn
    Pending --> Running: 开始执行

    Running --> Completed: 正常完成 ✅
    Running --> Failed: 执行失败 ❌
    Running --> Interrupted: 等待 RTC 工具执行 ⏸️
    Running --> Cancelled: 用户取消 🚫

    Interrupted --> Running: 工具结果返回，恢复执行

    Completed --> [*]
    Failed --> [*]
    Cancelled --> [*]

    state Running {
        [*] --> LLM推理
        LLM推理 --> 工具调用: tool_use
        工具调用 --> RTC执行: 推送至前端
        RTC执行 --> 结果返回: tool_result
        结果返回 --> LLM推理: 继续推理
        LLM推理 --> [*]: 生成最终回复
    }
```

| 状态 | 含义 | 用户看到的行为 |
|:----:|------|---------------|
| `Pending` | 等待执行 | 消息显示"处理中" |
| `Running` | 正在执行 | AI 流式输出，工具卡片闪烁 |
| `Interrupted` | 等待工具执行 | 工具卡片显示"执行中" |
| `Completed` | 正常完成 | AI 回复完整显示 |
| `Failed` | 执行失败 | 错误提示 |
| `Cancelled` | 用户取消 | 已停止标记 |

## 流式消息

AI 的回复**逐字流式**到达，用户无需等待完整回复：

```mermaid
sequenceDiagram
    actor User as 👤 用户
    participant UI as 🖥️ 前端界面
    participant Live as 📡 Live 频道
    participant Server as ⚙️ 服务端
    participant LLM as 🧠 AI 模型

    User->>UI: 发送消息
    UI->>Server: 同步消息

    rect rgb(232, 245, 233)
        Note over LLM,UI: 流式输出阶段
        LLM-->>Server: chunk 1
        Server-->>Live: stream:chunk
        Live-->>UI: 实时显示 "你"
        LLM-->>Server: chunk 2
        Server-->>Live: stream:chunk
        Live-->>UI: 实时显示 "好"
        LLM-->>Server: chunk ...
        Server-->>Live: stream:chunk
        Live-->>UI: 实时显示 "，" "世" "界" "..."
    end

    LLM-->>Server: 流结束
    Server-->>UI: stream:end
    UI->>UI: ✅ 标记完成
```

流式消息通过 **双频道** 传输：

| 频道 | 用途 | 特性 |
|------|------|------|
| **Topic 频道** | 首条 chunk + 最终完整消息 | 持久化，支持离线恢复 |
| **Live 频道** | 中间 chunk | 非持久化，低延迟，可容忍丢失 |

> 💡 最终完整消息通过 Topic 频道推送，即使中间 chunk 丢失，最终也能收到完整内容。

## 停止 Turn

用户可随时停止正在执行的 Turn：

```mermaid
flowchart LR
    A["👤 点击停止按钮"] --> B["📤 发送停止请求"]
    B --> C["⚙️ 服务端取消任务"]
    C --> D["🏷️ Turn 标记 Cancelled"]
    D --> E["🖥️ UI 显示已停止"]

    style A fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style D fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style E fill:#f5f5f5,stroke:#757575,stroke-width:2px
```

## AI Thinking 展示

AI 的推理过程默认折叠，用户可选择展开查看：

```mermaid
flowchart TD
    subgraph COLLAPSED["🧠 折叠状态"]
        C1["💭 思考过程 →"]
    end

    subgraph EXPANDED["🧠 展开状态"]
        E1["💭 思考过程 ▼"]
        E2["让我分析一下这个问题..."]
        E3["首先，需要考虑..."]
        E4["其次，根据..."]
    end

    COLLAPSED -->|"点击展开"| EXPANDED
    EXPANDED -->|"点击折叠"| COLLAPSED

    style COLLAPSED fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style EXPANDED fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| 特性 | 说明 |
|------|------|
| 默认折叠 | 节省界面空间 |
| 点击展开 | 查看完整推理过程 |
| 流式动画 | 生成时有脉冲动画效果 |
| Markdown 渲染 | 支持格式化显示 |

## 工具调用卡片

每次 RTC 工具调用以**卡片**形式展示，包含输入和输出两部分：

```mermaid
flowchart TD
    subgraph CARD["⚙️ 工具调用卡片"]
        HEADER["📌 read"]
        subgraph INPUT["📥 输入"]
            I1["path: /functions/order/create.md"]
        end
        subgraph OUTPUT["📤 输出"]
            O1["# 创建订单<br/><br/>## 参数<br/>- userId..."]
        end
        STATUS["✅ 完成 · 0.3s"]
    end

    style CARD fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style HEADER fill:#e1bee7,stroke:#7b1fa2
    style INPUT fill:#ede7f6,stroke:#5e35b1
    style OUTPUT fill:#ede7f6,stroke:#5e35b1
    style STATUS fill:#c8e6c9,stroke:#2e7d32
```

| 特性 | 说明 |
|------|------|
| 分区展示 | 输入参数和输出结果独立展示 |
| JSON 格式化 | 参数和结果自动美化 |
| 状态指示 | 运行中（🟠 橙色脉冲）/ 完成（🟢 绿色） |
| 复制按钮 | 一键复制输入/输出内容 |
| 耗时显示 | 展示工具执行耗时 |

## 消息列表

| 特性 | 说明 |
|------|------|
| 📊 排序 | 按发送时间升序（最早的在上） |
| 📑 分页 | 游标分页，从服务端加载历史消息 |
| 📜 自动滚动 | 新消息到达时自动滚动到底部 |
| 🔔 离开提示 | 用户滚动离开底部时显示"↓ 新消息"按钮 |

## 消息重试

| 场景 | 处理方式 |
|------|---------|
| 发送失败 | 标记 `failed`，显示重试按钮 |
| 幂等保证 | 使用 `client_id` 去重，重试不产生重复消息 |
| RTC 失败 | 指数退避重试（1s → 2s → 4s → ... → 30s 封顶） |

## 下一步

- [会话管理](/docs/features/session/) — 了解消息所在的会话容器
- [Remote Tool Calling](/docs/concepts/rtc/) — 了解工具调用卡片的背后机制
- [实时通信](/docs/features/realtime/) — 了解流式消息的双频道架构
