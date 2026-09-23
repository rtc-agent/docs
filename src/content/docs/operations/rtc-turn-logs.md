---
title: RTC 与 Turn 执行日志
description: 追踪 RTC（Remote Tool Calling）和 Turn 的生命周期，排查执行超时、状态异常和恢复事件。
---

RTC 是 LLM 调用外部工具的核心机制，每次工具调用创建一个 RTC 实例。Turn 是 Agent 的一次完整执行轮次，可能包含多个 RTC。通过这些日志可以追踪工具执行全链路。

## 日志事件

### RTC 生命周期

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[SubmitRtcResult]` | 客户端提交 RTC 执行结果 | `user`, `rtc`, `success` |
| `[SubmitRtcResult] idempotent repeat` | 重复提交（幂等去重） | `rtc`, `status`, `client_id` |
| `[UpdateRtcStatus]` | RTC 状态变更 | `user`, `rtc`, `status` |
| `rtcToolBase.rtc_created` | RTC 实例创建 | `rtc_id`, `session_id`, `turn_id` |

### Turn 生命周期（turnagent 前缀）

#### 回调层（Callback）

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[turnagent] createTurn.created` | Turn 创建完成 | `turn_id`, `session_id`, `work_kind` |
| `[turnagent] createTurn.idempotent_hit` | 幂等创建命中缓存 | `turn_id`, `session_id` |
| `[turnagent] beginTurn.done` | Turn 开始执行 | `turn_id`, `session_id` |
| `[turnagent] completeTurn.done` | Turn 正常完成 | `turn_id`, `session_id` |
| `[turnagent] cancelTurn.done` | Turn 被取消 | `turn_id`, `session_id` |
| `[turnagent] failTurn.done` | Turn 执行失败 | `turn_id`, `session_id` |
| `[turnagent] interruptTurn.done` | Turn 被中断 | `turn_id`, `session_id`, `interrupt_id` |
| `[turnagent] resumeTurn.done` | Turn 恢复执行 | `turn_id` |

#### 执行层（Turn 内部状态机）

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[turnagent] turn.start` | Turn 开始执行 | `turn_id`, `session_id`, `work_kind`, `work_id` |
| `[turnagent] turn.waiting_completion` | Turn 等待 LLM/RTC 完成 | `turn_id`, `session_id`, `work_id` |
| `[turnagent] turn.work_completed` | Turn 工作完成 | `turn_id`, `session_id`, `work_id` |
| `[turnagent] turn.loop_exited` | Turn 循环退出 | `turn_id`, `session_id`, `work_kind`, `exit_reason`, `has_error` |
| `[turnagent] turn.clean_exit` | Turn 干净退出 | `turn_id`, `session_id`, `message` |
| `[turnagent] turn.end` | Turn 结束（最终事件） | `turn_id`, `session_id`, `work_kind`, `status`, `duration_ms` |
| `[turnagent] interrupt` | Turn 被中断（含原因） | `turn_id`, `session_id`, `interrupt_id`, `interrupt_count`, `reason` |

### 工作队列（rtcqueue）

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[rtcqueue] worker.received_notification` | Worker 收到通知 | `session_id` |
| `[rtcqueue] worker.claiming` | Worker 尝试认领任务 | `session_id`, `worker_id` |
| `[rtcqueue] worker.claimed` | Worker 认领成功 | `session_id`, `credential`, `work_id` |
| `[rtcqueue] worker.claim_empty` | Worker 认领失败（队列为空） | `session_id` |
| `[rtcqueue] worker.processing_work` | Worker 开始处理 | `session_id`, `work_id`, `hold_lock` |
| `[rtcqueue] worker.loaded_work` | Worker 加载工作数据 | `session_id`, `work_id` |
| `[rtcqueue] worker.calling_onwork` | Worker 调用处理回调 | `session_id`, `work_id` |
| `[rtcqueue] worker.onwork_returned` | Worker 处理完成返回 | `session_id`, `work_id` |
| `[rtcqueue] worker.queue_empty_releasing_lock` | 队列清空，释放 Session 锁 | `session_id` |

### 工具调用

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[turnagent] tool.call_failed` | 工具调用失败（如被中断） | `tool_name`, `session_id`, `turn_id`, `error` |
| `[turnagent] agent.process` | Agent 开始处理工作 | `session_id`, `work_id`, `kind` (submit/resume) |

### RTC 结果提交后的 Turn 恢复

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[resumeTurnAfterRtc] entry` | RTC 完成后尝试恢复 Turn | `rtc`, `turn`, `remaining` |
| `[resumeTurnAfterRtc] batch progress` | 批量恢复进度 | `rtc`, `turn`, `remaining` |
| `[resumeTurnAfterRtc] batch item` | 批量恢复单项 | `rtc_id`, `interrupt_id`, `result_len` |
| `[resumeTurnAfterRtc] batch complete, resuming turn` | 批量恢复完成，恢复 Turn | `turn`, `session`, `batch_size` |
| `[resumeTurnAfterRtc] resume published` | 恢复事件已发布到队列 | `rtc`, `session`, `turn`, `batch_size` |
| `[resumeTurnAfterRtc] skip: session closed` | 跳过恢复（Session 已关闭） | `rtc`, `session` |
| `[resumeTurnAfterRtc] orphan submit published` | 孤儿 RTC 提交已发布 | `rtc`, `session` |

### 停止活跃 Turn

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[StopActiveTurns] cancelled turns` | 批量取消活跃 Turn | `session`, `count` |

## Loki 查询

### 追踪某个 RTC 的完整生命周期

```logql
{service="server"} | json rtc="rtc", rtc_id="rtc_id" | msg=~"\\[SubmitRtcResult\\]|\\[UpdateRtcStatus\\]|rtcToolBase\\.rtc_created|\\[resumeTurnAfterRtc\\]" | rtc_id="rtc-123"
```

### 查看所有 RTC 创建事件

```logql
{service="server"} | json | msg="rtcToolBase.rtc_created"
```

### 排查 RTC 结果提交失败

```logql
{service="server"} | json | msg="[SubmitRtcResult]" | json success="success" | success="false"
```

### 查看重复提交（可能表示客户端重试问题）

```logql
{service="server"} | json | msg="[SubmitRtcResult] idempotent repeat"
```

### 追踪 Turn 的完整执行流程

```logql
{service="server"} | json turn_id="turn_id", session_id="session_id" | msg=~"\\[turnagent\\] (create|begin|complete|cancel|fail|interrupt|resume)Turn" | turn_id="turn-456"
```

### 查看失败的 Turn

```logql
{service="server"} | json | msg="[turnagent] failTurn.done"
```

### 查看被中断的 Turn

```logql
{service="server"} | json | msg="[turnagent] interruptTurn.done"
```

### 查看 Turn 执行速率（按类型和状态）

```logql
sum by (work_kind, status) (rate(rtc_turn_total[5m]))
```

### 按 work_kind 统计 Turn 延迟 P95

```logql
histogram_quantile(0.95, sum(rate(rtc_turn_duration_seconds_bucket[5m])) by (le, work_kind))
```

### 排查 Turn 恢复异常（有 entry 但无完成）

```logql
{service="server"} | json | msg=~"\\[resumeTurnAfterRtc\\] (entry|batch complete|skip|orphan)"
```

按 `rtc` 字段排序，如果有 `entry` 但没有对应的完成事件，说明恢复流程异常。

### 查看恢复流程中的错误

```logql
{service="server"} | json | msg=~"\\[resumeTurnAfterRtc\\].*(failed|error)"
```

### 查看批量取消事件

```logql
{service="server"} | json session="session", count="count" | msg="[StopActiveTurns] cancelled turns"
```

### 查看特定 Session 的所有 Turn 活动

```logql
{service="server"} | json session_id="session_id", session="session" | msg=~"\\[turnagent\\]|\\[StopActiveTurns\\]|\\[resumeTurnAfterRtc\\]|\\[rtcqueue\\]" | session_id="session-abc"
```

### 追踪 Turn 状态机全链路

```logql
{service="server"} | json turn_id="turn_id" | msg=~"\\[turnagent\\] turn\\.(start|waiting_completion|work_completed|loop_exited|clean_exit|end)" | turn_id="turn-456"
```

### 查看 Turn 执行耗时和状态

```logql
{service="server"} | json turn_id="turn_id", status="status", duration_ms="duration_ms", work_kind="work_kind" | msg="[turnagent] turn.end"
```

### 查看 Turn 循环退出原因

```logql
{service="server"} | json turn_id="turn_id", exit_reason="exit_reason", has_error="has_error" | msg="[turnagent] turn.loop_exited"
```

### 查看有错误的 Turn 退出

```logql
{service="server"} | json has_error="has_error" | msg="[turnagent] turn.loop_exited" | has_error="true"
```

### 查看工作队列认领事件

```logql
{service="server"} | json session_id="session_id", work_id="work_id" | msg=~"\\[rtcqueue\\] worker\\.(claiming|claimed|claim_empty|processing_work|onwork_returned)"
```

### 查看队列为空（无任务可处理）

```logql
{service="server"} | json session_id="session_id" | msg="[rtcqueue] worker.claim_empty"
```

### 查看工具调用失败

```logql
{service="server"} | json tool_name="tool_name", error="error", session_id="session_id" | msg="[turnagent] tool.call_failed"
```

### 查看 Turn 中断事件（含原因）

```logql
{service="server"} | json turn_id="turn_id", interrupt_id="interrupt_id", reason="reason", interrupt_count="interrupt_count" | msg="[turnagent] interrupt"
```

### 查看 Agent 处理工作类型

```logql
{service="server"} | json session_id="session_id", work_id="work_id", kind="kind" | msg="[turnagent] agent.process"
```

## Prometheus 指标

| 指标 | 类型 | Labels | 用途 |
|------|------|--------|------|
| `rtc_turn_total` | Counter | `work_kind`, `status` | Turn 总数统计 |
| `rtc_turn_duration_seconds` | Histogram | `work_kind`, `status` | Turn 执行耗时 |
| `rtc_stale_turns_recovered_total` | Counter | `status` | 过期 Turn 恢复统计 |

### 常用 PromQL

```promql
# Turn 成功/失败速率
sum by (status) (rate(rtc_turn_total[5m]))

# Turn 执行延迟 P50 / P95 / P99
histogram_quantile(0.50, sum(rate(rtc_turn_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.95, sum(rate(rtc_turn_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.99, sum(rate(rtc_turn_duration_seconds_bucket[5m])) by (le))

# 每分钟恢复的过期 Turn 数
sum(rate(rtc_stale_turns_recovered_total[5m])) by (status)
```

## 告警规则

| 告警 | 条件 | 说明 |
|------|------|------|
| Turn 失败率过高 | `rate(rtc_turn_total{status="failed"}[5m]) / rate(rtc_turn_total[5m]) > 0.1` | 超过 10% 的 Turn 执行失败 |
| Turn 延迟过高 | `histogram_quantile(0.95, ...) > 60` | P95 延迟超过 60 秒 |
| 过期 Turn 恢复频繁 | `rate(rtc_stale_turns_recovered_total[5m]) > 0.5` | 每分钟恢复超过 30 个过期 Turn |
