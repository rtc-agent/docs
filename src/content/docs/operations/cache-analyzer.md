---
title: LLM 缓存命中率分析工具
description: 使用 Cache Analyzer 可视化分析 LLM 调用的缓存命中率和请求变化。
---

Cache Analyzer 是一个内置的 Web 工具，用于分析 LLM 请求的缓存命中率、Token 消耗和上下文变化。通过可视化界面帮助优化 Prompt 设计，提升缓存命中效率。

## 功能特性

- **缓存命中率统计**：整体命中率、平均命中率、Token 消耗明细
- **请求对比分析**：自动对比相邻请求的差异（新增/删除/修改）
- **Message 级别 Diff**：精确展示每条消息的变化内容
- **System Prompt Diff**：追踪系统提示词的变更
- **Markdown 导出**：一键导出分析报告，方便分享和存档

## 启动工具

```bash
cache-analyzer -p 1000
```

启动后访问 `http://localhost:1000` 进入配置页面。

## 使用流程

### 1. 添加日志文件

在配置页面添加一个或多个日志文件路径。工具会自动扫描 `llm.http.request` 和 `llm.http.response` 事件。

### 2. 输入 Session ID

输入要分析的 Session ID，工具会提取该 Session 的所有 LLM 请求。

### 3. 查看分析报告

报告页面展示：

- 整体缓存命中率统计
- 每次请求的详细 Diff（Message 和 System 变化）
- 命中率变化趋势

![Cache Analyzer 界面](/docs/demo-screenshot/cache-analyzer.png)

### 4. 导出报告

点击导出按钮生成 Markdown 格式的分析报告，包含完整的 Diff 和统计数据。

## 分析维度

### 缓存命中率

| 指标               | 说明                         |
| ------------------ | ---------------------------- |
| Overall Hit Rate   | 基于总 Token 计算的整体命中率 |
| Avg Hit Rate       | 各请求命中率的平均值         |
| Cache Read Tokens  | 从缓存读取的 Token 数         |
| Cache Write Tokens | 写入缓存的 Token 数           |
| Total Input Tokens | 总输入 Token 数               |

### 请求变化统计

每次请求对比包含以下统计：

- **Added**：新增的消息数量
- **Removed**：删除的消息数量
- **Modified**：修改的消息数量
- **System Changes**：系统提示词的变化（新增/删除/修改）

## 优化建议

基于分析结果优化 Prompt：

1. **稳定部分前置**：将不变的内容（角色定义、规则等）放在 Message 开头，提升缓存命中
2. **动态部分后置**：将变化的内容（用户输入、上下文）放在 Message 末尾
3. **避免随机 ID**：使用确定性标识符而非随机 UUID
4. **控制 Message 顺序**：保持 Message 顺序稳定，避免插入/删除中间消息

## 日志格式要求

工具解析的日志事件：

| 事件                | 说明                             |
| ------------------- | -------------------------------- |
| `llm.http.request`  | LLM 请求，包含完整的 request body |
| `llm.http.response` | LLM 响应，包含 token 使用统计    |

关键字段：

- `session_id`：会话标识
- `input_tokens`、`cached_read_tokens`、`cached_write_tokens`：Token 统计
- `messages`：消息列表
- `system`：系统提示词

### 启用 LLM Payload 日志

`llm-payload.log` 文件包含完整的 LLM API 请求/响应数据，需要在配置中启用：

**配置文件方式**（`etc/config.yaml` 或 `etc/config.local.yaml`）：

```yaml
log:
  llm_payload: true
```

**环境变量方式**：

```bash
export LOG__LLM_PAYLOAD=true
```

**启动参数说明**：

- 日志文件位置：`logs/llm-payload.log`
- 格式：JSON Lines（每行一个 JSON 对象）
- 适用环境：**仅开发/调试环境**，生产环境请勿启用
- 性能影响：会增加磁盘 I/O，记录完整的请求和响应数据

启用后，服务器启动时会显示：

```text
LLM payload logging enabled — writing to logs/llm-payload.log
```

## 故障排查

### 找不到 Session

- 确认日志文件路径正确且可读
- 检查 Session ID 是否拼写正确
- 确认日志包含该 Session 的 `llm.http.request` 事件

### 命中率为 0

- 检查是否启用了 Prompt Caching（需要支持缓存的模型）
- 确认 `cached_read_tokens` 字段有值
- 排查 Prompt 是否频繁变化导致缓存失效

### Diff 显示异常

- 确认日志格式完整（包含 request body）
- 检查 Message 内容是否包含特殊字符
- 尝试重新解析日志文件
