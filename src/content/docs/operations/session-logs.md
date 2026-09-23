---
title: 会话生命周期日志
description: 通过 Loki 日志查询追踪 Session 的创建、关闭、消息发送、压缩和分叉等生命周期事件。
---

Session 是最核心的业务实体，每次状态变更都会产生结构化日志。通过这些日志可以追踪完整的会话生命周期。

## 日志事件

### Session 状态变更

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[OpenSession]` | 新 Session 创建 | `user`, `session` |
| `[OpenSession] session not closed, skipping` | 尝试打开已有未关闭的 Session | `session`, `status` |
| `[CloseSession]` | Session 关闭 | `user`, `session` |
| `[CloseSession] session already closed` | 重复关闭已关闭的 Session | `session` |
| `[UpdateSession]` | Session 属性更新 | `user`, `session` |
| `[CompactSession]` | 触发上下文压缩 | `user`, `session` |
| `[CompactSession] enqueued` | 压缩任务入队 | `session`, `has_custom_instruction` |
| `[ForkSession] start` | Session 分叉开始 | `user`, `old_session`, `old_message`, `limit` |

### 消息与 Turn

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[SendMessage]` | 用户发送消息 | `user`, `device`, `content_len`, `session_id`, `client_id` |
| `[StopTurn]` | 用户中断 Turn | `user`, `session` |
| `[GetSession]` | 查询 Session 详情 | `user`, `session` |
| `[ListSessions]` | 列出 Session 列表 | `user`, `count`, `has_next` |
| `[MessageList]` | 查询消息列表 | `user`, `session`, `count`, `has_next` |

## Loki 查询

### 查看特定用户的所有 Session 操作

```logql
{service="server"} | json user="user" | msg=~"\\[(Open|Close|Update|Compact|Fork)Session\\]" | user="user-123"
```

### 追踪某个 Session 的完整生命周期

```logql
{service="server"} | json session="session", session_id="session_id" | msg=~"\\[(Open|Close|Update|Compact|Fork)Session\\]|\\[SendMessage\\]|\\[StopTurn\\]" | session="abc-def-123"
```

### 查看所有 Session 关闭事件

```logql
{service="server"} | json | msg="[CloseSession]"
```

### 查看消息发送速率（按分钟）

```logql
sum(count_over_time({service="server"} | json | msg="[SendMessage]"[1m]))
```

### 查看消息发送量最大的用户

```logql
topk(10, count by (user) ({service="server"} | json user="user" | msg="[SendMessage]"))
```

### 排查消息发送失败

```logql
{service="server"} | json | msg=~"\\[SendMessage\\].*failed"
```

### 查看 Session 压缩事件

```logql
{service="server"} | json session="session" | msg=~"\\[CompactSession\\]"
```

### 查看 Session 分叉操作

```logql
{service="server"} | json | msg=~"\\[ForkSession\\]"
```

### 查找重复关闭 Session 的异常情况

```logql
{service="server"} | json session="session" | msg="[CloseSession] session already closed"
```

### 查看消息内容长度分布

提取 `content_len` 字段，观察消息大小：

```logql
{service="server"} | json content_len="content_len" | msg="[SendMessage]"
```

### 排查 Session 打开失败（已有未关闭 Session）

```logql
{service="server"} | json session="session", status="status" | msg="[OpenSession] session not closed, skipping"
```

### 关联 Session 操作与 Trace

每条日志都自动包含 `trace_id`，可以跨服务追踪：

```logql
{service="server"} | json trace_id="trace_id", session_id="session_id" | msg="[SendMessage]" | session_id="abc-def-123"
```

拿到 `trace_id` 后在 Grafana Tempo 中查看完整调用链。

## Prometheus 指标

Session 相关操作通过 RPC 中间件自动记录：

| 指标 | 说明 |
|------|------|
| `rtc_turn_total` | 按 `work_kind` 和 `status` 统计的 Turn 总数 |
| `rtc_turn_duration_seconds` | Turn 执行耗时分布 |

### 常用 PromQL

```promql
# 每分钟 Session 消息发送速率
sum(rate(rtc_turn_total[5m])) by (status)

# Turn 执行延迟 P95
histogram_quantile(0.95, sum(rate(rtc_turn_duration_seconds_bucket[5m])) by (le))
```
