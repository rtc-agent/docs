---
title: LLM 内置工具
description: AI 在对话中可调用的内置工具——子 Agent 管理、用户提问，以及会话层级关系。
---

AI 在推理过程中可以调用一组**内置工具**来扩展自身能力。这些工具由后端注册，无需宿主应用额外配置。工具分为两类：**子 Agent 管理**（创建、查询、停止子 Agent）和**用户交互**（向用户提问获取决策）。

## 工具总览

| 工具 | 用途 | 是否中断轮次 |
|------|------|:----------:|
| `sub_agent` | 创建子 Agent 会话，执行复杂多步任务 | 取决于模式 |
| `list_sub_agent` | 列出当前会话树中所有活跃的子 Agent | 否 |
| `get_sub_agent_message` | 获取指定子 Agent 的最新消息 | 否 |
| `stop_sub_agent` | 停止指定子 Agent 及其所有后代会话 | 否 |
| `ask_user` | 向用户提出 1-4 个选择题，等待用户回答 | 是 |
| `create_goal` | 创建自主目标，自动驱动后续轮次直到完成 | 否 |
| `complete_goal` | 标记目标为已完成 | 否 |
| `cancel_goal` | 取消目标 | 否 |
| `create_loop` | 创建定时循环任务，按固定间隔自动执行 | 否 |
| `cancel_loop` | 取消循环任务 | 否 |
| `list_loop` | 列出当前会话的所有循环任务 | 否 |
| `pause_loop` | 暂停循环任务 | 否 |
| `resume_loop` | 恢复暂停的循环任务 | 否 |

---

## 子 Agent 工具

子 Agent 是 RTC Agent 的**任务分解**机制。主 Agent 可以将复杂任务拆分为多个子任务，每个子任务运行在独立的会话中，拥有独立的上下文。

### 会话层级

子 Agent 通过父/根会话 ID 形成树状层级结构：

```mermaid
flowchart TD
    ROOT["根会话<br/>root_server_session_id = 自身"]
    CHILD1["子 Agent A<br/>parent = 根会话"]
    CHILD2["子 Agent B<br/>parent = 根会话"]
    GRANDCHILD["子子 Agent<br/>parent = 子 Agent A"]

    ROOT --> CHILD1
    ROOT --> CHILD2
    CHILD1 --> GRANDCHILD

    style ROOT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style CHILD1 fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style CHILD2 fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style GRANDCHILD fill:#fff3e0,stroke:#f57c00,stroke-width:2px
```

| 字段 | 说明 |
|------|------|
| `parent_server_session_id` | 直接父会话的服务端 UUID |
| `root_server_session_id` | 根会话的服务端 UUID（如果当前会话已是子会话，则继承其根） |

---

### sub_agent — 创建子 Agent

创建一个新的子 Agent 会话来执行复杂的多步任务。子 Agent 从空白上下文启动，需要像给新同事做交接一样提供完整的背景信息。

#### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `title` | string | 是 | 任务简短描述（3-5 个词），如 `"OAuth 认证配置"`、`"登录按钮修复"` |
| `instruction` | string | 是 | 子 Agent 的任务指令。需要包含所有必要上下文，因为子 Agent 从空白上下文启动 |
| `mode` | string | 否 | 执行模式：`"async"`（默认）或 `"sync"` |

#### 执行模式

```mermaid
flowchart TD
    A["LLM 调用 sub_agent"] --> B{"mode?"}
    B -->|"async（默认）"| C["立即返回子会话 ID"]
    C --> D["父会话继续运行"]
    D --> E["子 Agent 完成后<br/>通知推送到父会话"]

    B -->|"sync"| F["父会话暂停"]
    F --> G["等待子 Agent 完成"]
    G --> H["子 Agent 结果<br/>作为工具返回值"]

    style C fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
    style F fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| 模式 | 行为 | 适用场景 |
|------|------|---------|
| **async**（默认） | 立即返回子会话 ID，父会话继续运行。子 Agent 完成后通过通知消息推送结果 | 父会话可继续其他工作，不需要等待结果 |
| **sync** | 父会话暂停（通过 `StatefulInterrupt`），等待子 Agent 完成后返回结果 | 父会话需要子 Agent 的结果才能继续 |

#### 使用建议

- 指令要具体——包含文件路径、相关上下文和已排除的方案
- 不要写模糊指令如"处理这个任务"——子 Agent 没有当前对话的上下文
- 标题要简短有描述性，便于在列表中识别

---

### list_sub_agent — 列出子 Agent

列出当前会话树中所有活跃的子 Agent 会话。用于查看已创建的子 Agent 状态。

#### 参数

无参数。

#### 返回值

返回 JSON 数组，每个元素包含：

| 字段 | 类型 | 说明 |
|------|------|------|
| `sub_session_id` | string | 子会话的服务端 UUID |
| `title` | string | 子 Agent 标题 |
| `status` | string | 会话状态（仅返回 `active` 状态的会话） |
| `created_at` | string | 创建时间（RFC 3339 格式） |
| `updated_at` | string | 更新时间（RFC 3339 格式） |

---

### get_sub_agent_message — 获取子 Agent 消息

获取指定子 Agent 会话的最新消息内容。用于检查子 Agent 的最新输出或进度。

#### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `sub_session_id` | string | 是 | 目标子会话的服务端 UUID。使用 `list_sub_agent` 获取可用的会话 ID |

#### 返回值

返回 JSON 对象：

| 字段 | 类型 | 说明 |
|------|------|------|
| `sub_session_id` | string | 子会话 UUID |
| `sub_session_title` | string | 子会话标题 |
| `sub_session_status` | string | 子会话状态 |
| `message_id` | string / null | 最新消息 ID（无消息时为 null） |
| `role` | string / null | 消息角色（无消息时为 null） |
| `content` | string | 消息文本内容 |
| `created_at` | string / null | 消息创建时间（无消息时为 null） |

#### 权限检查

- 目标会话必须是当前会话树的后代（`root_server_session_id` 匹配）
- 不能查询当前会话自身

---

### stop_sub_agent — 停止子 Agent

停止指定的子 Agent 会话及其所有后代会话。采用**自底向上**的停止顺序（先停叶子节点，再停父节点）。

#### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `sub_session_id` | string | 是 | 目标子会话的服务端 UUID。使用 `list_sub_agent` 获取可用的会话 ID |

#### 返回值

返回 JSON 对象：

| 字段 | 类型 | 说明 |
|------|------|------|
| `stopped_sessions` | array | 被停止的会话列表，每项包含 `sub_session_id` 和 `title` |
| `total_stopped` | int | 总共停止的会话数 |

#### 停止流程

```mermaid
flowchart TD
    A["调用 stop_sub_agent"] --> B["验证权限<br/>目标是当前会话树的后代"]
    B --> C["查询所有活跃后代"]
    C --> D["DFS 收集目标及其后代"]
    D --> E["反转顺序<br/>（叶子优先）"]
    E --> F["逐个停止会话<br/>CancelTurn + Close"]
    F --> G["父会话恢复"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style F fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style G fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
```

---

## ask_user — 向用户提问

AI 向用户提出 1-4 个选择题，用于收集偏好、澄清歧义、理解需求或获取实现决策。用户始终可以选择"其他"来提供自由文本。

### 参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `questions` | array | 是 | 1-4 个问题对象 |

每个问题对象包含：

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `question` | string | 是 | 完整的问题文本，以问号结尾 |
| `header` | string | 是 | 短标签（最多 12 字符），显示在问题旁边的标签/芯片 |
| `options` | array | 是 | 2-4 个选项 |
| `multiSelect` | boolean | 否 | 设为 `true` 允许用户选择多个选项，默认 `false` |

每个选项包含：

| 字段 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `label` | string | 是 | 选项显示文本（1-5 个词） |
| `description` | string | 是 | 选项说明，描述选择的含义或后果 |
| `preview` | string | 否 | 聚焦时显示的预览内容（支持多行文本，仅适用于单选问题） |

### 交互流程

```mermaid
sequenceDiagram
    participant AI
    participant Server
    participant Client

    AI->>Server: 调用 ask_user 工具
    Server->>Server: 创建 RTC 记录，暂停轮次
    Server->>Client: 推送问题渲染
    Client->>Client: 用户选择答案
    Client->>Server: 提交答案（RTC Result）
    Server->>Server: 恢复轮次
    Server->>AI: 返回用户答案
```

### 使用示例

```json
{
  "questions": [
    {
      "question": "使用哪个日期格式化库？",
      "header": "日期库",
      "options": [
        {
          "label": "date-fns",
          "description": "轻量级、Tree-shakable，按需导入"
        },
        {
          "label": "dayjs",
          "description": "API 兼容 Moment.js，体积仅 2KB"
        }
      ]
    }
  ]
}
```

### 返回格式

用户回答后，AI 收到的文本格式为：

```text
User has answered your questions: "使用哪个日期格式化库？"="date-fns". You can now continue with the user's answers in mind.
```

---

## Goal 工具 — 自主目标驱动

Goal 系统允许 AI 创建自主目标，并在后续轮次中自动推进目标完成。每个 Goal 有独立的状态生命周期和 turn 边界检查点。

### Goal 状态

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Active: create_goal
    Active --> Completed: complete_goal ✅
    Active --> Cancelled: cancel_goal 🚫
    Active --> Exhausted: 超过 max_turns ⏰

    Completed --> [*]
    Cancelled --> [*]
    Exhausted --> [*]
```

| 状态 | 说明 |
|:----:|------|
| `active` | 目标活跃中，每轮自动检查进度 |
| `completed` | 目标已完成 |
| `cancelled` | 目标被取消 |
| `exhausted` | 达到最大轮次限制，自动终止 |

### create_goal — 创建目标

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `condition` | string | 是 | 目标完成条件描述 |
| `max_turns` | int | 否 | 最大轮次限制（默认 50） |

**执行机制**：每轮 Turn 完成后，系统自动检查活跃 Goal，递增 `completed_turns` 计数器。如果条件满足则自动标记为 `completed`；如果达到 `max_turns` 则标记为 `exhausted`。

### complete_goal / cancel_goal

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `goal_id` | string | 是 | 目标 ID |

---

## Loop 工具 — 定时循环任务

Loop 系统允许 AI 创建定时执行的循环任务。基于 asynq 后台任务队列，支持暂停、恢复和自动过期。

### Loop 状态

```mermaid
stateDiagram-v2
    direction LR

    [*] --> Active: create_loop
    Active --> Paused: pause_loop ⏸️
    Paused --> Active: resume_loop ▶️
    Active --> Completed: 条件满足 ✅
    Active --> Cancelled: cancel_loop 🚫
    Active --> Exhausted: 超过 max_turns 或过期 ⏰

    Completed --> [*]
    Cancelled --> [*]
    Paused --> [*]
    Exhausted --> [*]
```

| 状态 | 说明 |
|:----:|------|
| `active` | 循环活跃中，按间隔自动触发 |
| `paused` | 循环暂停，不触发新轮次 |
| `completed` | 循环完成 |
| `cancelled` | 循环被取消 |
| `exhausted` | 达到最大轮次或过期时间 |

### create_loop — 创建循环

| 参数 | 类型 | 必填 | 说明 |
|------|------|:----:|------|
| `prompt` | string | 是 | 每次循环执行的提示词 |
| `interval_seconds` | int | 是 | 执行间隔（秒） |
| `max_turns` | int | 否 | 最大执行次数（默认 10） |

### 其他 Loop 操作

| 工具 | 参数 | 说明 |
|------|------|------|
| `cancel_loop` | `loop_id` | 取消循环 |
| `list_loop` | 无 | 列出当前会话的所有循环 |
| `pause_loop` | `loop_id` | 暂停循环 |
| `resume_loop` | `loop_id` | 恢复暂停的循环 |

> 💡 **Loop vs Goal**：Goal 是"完成某个条件就停"，Loop 是"每隔 N 秒执行一次"。两者可以组合使用——在 Loop 中创建 Goal，让 AI 定期检查某个条件是否满足。

---

## 下一步

- [命令系统](/docs/features/commands/) — 了解用户可用的斜杠命令
- [Skill 系统](/docs/features/skill-system/) — 了解宿主如何注册自定义函数扩展 AI 能力
- [会话管理](/docs/features/session/) — 了解会话层级与上下文管理
- [Remote Tool Calling](/docs/concepts/rtc/) — 了解工具调用背后的远程调用机制
