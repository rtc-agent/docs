---
title: 错误恢复与工作流日志
description: 追踪 Stale Turn 恢复、Loop/Goal 工作流、生命周期管理等后台任务的执行状态。
---

系统包含多个后台恢复机制和工作流引擎，确保异常情况下的数据一致性。这些日志帮助监控后台任务的健康状态。

## 日志事件

### Stale Turn 恢复

当服务重启或 Turn 执行异常中断时，系统自动扫描并恢复过期的 Turn。

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[Server] recoverStaleTurns: found stale turns` | 发现过期 Turn | `count` |
| `[Server] recoverStaleTurns: published submit` | 已发布恢复提交 | `turn` |
| `[Server] recoverStaleTurns: skip closed session` | 跳过已关闭的 Session | `session` |
| `[Server] recoverStaleTurns: skip already-interrupted turn` | 跳过已中断的 Turn | `turn` |
| `[Server] recoverStaleTurns: requeued ghost work` | 重新入队幽灵任务 | `work_id` |
| `[Server] recoverStaleTurns: released session lock` | 释放 Session 锁 | `session` |
| `[Server] recoverStaleTurns: skip lock release -- worker alive` | 跳过锁释放（Worker 仍存活） | `session` |
| `[Server] periodicRecoverStaleTurns: found stale turns` | 周期性扫描发现过期 Turn | `count` |
| `[Server] periodicRecoverStaleTurns: checkpoint expired` | 检查点已过期 | `turn` |
| `[Server] periodicRecoverStaleTurns: recovering stale running/interrupted turn` | 正在恢复运行中/已中断的 Turn | `turn` |
| `[Server] publishRecoveryWorkItem: published` | 恢复工作项已发布 | `session`, `turn` |

### Loop 恢复与清理

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[loop.Recovery] started` | 恢复扫描启动 | `interval` |
| `[loop.Recovery] cancelled expired loop` | 取消过期 Loop | `loop_id` |
| `[loop.Recovery] re-enqueued stale loop` | 重新入队停滞 Loop | `loop_id` |
| `[loop.Cleanup] cancelled active loop` | 清理活跃 Loop | `loop_id` |
| `[loop.Cleanup] cancelled active goal` | 清理活跃 Goal | `goal_id` |

### Loop / Goal 工作流工具

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[turnagent] createLoop.completed` | Loop 创建完成 | `loop_id`, `session_id` |
| `[turnagent] createGoal.completed` | Goal 创建完成 | `goal_id`, `session_id` |
| `[turnagent] pauseLoop.completed` | Loop 暂停 | `loop_id`, `session_id` |
| `[turnagent] resumeLoop.completed` | Loop 恢复 | `loop_id`, `session_id` |
| `[turnagent] listLoops.completed` | Loop 列表查询 | `session_id`, `count` |
| `[turnagent] loopWorkflow.loop_exhausted` | Loop 达到最大迭代 | `loop_id`, `session_id` |
| `[turnagent] loopWorkflow.loop_extended` | Loop 扩展迭代 | `loop_id`, `session_id`, `iteration` |
| `[turnagent] loopWorkflow.scheduled_next` | 已调度下一次执行 | `loop_id`, `task_id` |
| `[turnagent] goalWorkflow.goal_exhausted` | Goal 达到最大迭代 | `goal_id`, `session_id` |
| `[turnagent] goalWorkflow.goal_extended` | Goal 扩展迭代 | `goal_id`, `session_id`, `iteration` |

### 生命周期管理

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[lifecycle.Manager] component started` | 组件启动成功 | `component` |
| `[lifecycle.Manager] component stopped` | 组件停止成功 | `component` |
| `[lifecycle.Manager] start component failed` | 组件启动失败 | `component`, `error` |
| `[lifecycle.Manager] stop component failed` | 组件停止失败 | `component`, `error` |
| `[lifecycle.Manager] shutdown timeout` | 关闭超时 | - |
| `[lifecycle.Manager] goroutine panic` | 组件 Goroutine 异常 | `component`, `panic`, `stack` |

### 服务器启动与关闭

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `Starting RTC Agent server...` | 服务启动 | - |
| `HTTP server listening` | HTTP 服务就绪 | `addr` |
| `LLM initialized` | LLM 初始化完成 | `provider`, `model` |
| `Tracing enabled` | Tracing 启用 | `endpoint`, `sample_rate` |
| `Shutting down server...` | 服务关闭中 | - |
| `Server failed` | 服务启动失败 | `error` |
| `Database migration completed successfully` | 数据库迁移完成 | - |

### Goroutine 泄漏监控

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `goroutine leak threshold exceeded` | Goroutine 数超过阈值 | `count`, `threshold` |

## Loki 查询

### 查看 Stale Turn 恢复事件

```logql
{service="server"} | json | msg=~"\\[Server\\] (recoverStaleTurns|periodicRecoverStaleTurns|publishRecoveryWorkItem)"
```

### 查看恢复的过期 Turn 数量趋势

```logql
{service="server"} | json count="count" | msg=~"\\[Server\\] (recoverStaleTurns|periodicRecoverStaleTurns): found stale turns"
```

### 追踪某个 Turn 的恢复过程

```logql
{service="server"} | json turn="turn" | msg=~"\\[Server\\] (recoverStaleTurns|periodicRecoverStaleTurns)" | turn="turn-123"
```

### 查看恢复过程中的错误

```logql
{service="server"} | json | msg=~"\\[Server\\] (recoverStaleTurns|periodicRecoverStaleTurns).*(failed|error)"
```

### 查看 Loop 恢复与清理事件

```logql
{service="server"} | json | msg=~"\\[loop\\.(Recovery|Cleanup)\\]"
```

### 查看 Loop 工作流执行

```logql
{service="server"} | json | msg=~"\\[turnagent\\] (createLoop|createGoal|pauseLoop|resumeLoop|loopWorkflow|goalWorkflow)"
```

### 追踪某个 Loop 的完整生命周期

```logql
{service="server"} | json loop_id="loop_id" | msg=~"\\[turnagent\\] (createLoop|pauseLoop|resumeLoop|loopWorkflow|listLoops)" | loop_id="loop-abc"
```

### 查看达到最大迭代的 Loop

```logql
{service="server"} | json | msg="[turnagent] loopWorkflow.loop_exhausted"
```

### 查看达到最大迭代的 Goal

```logql
{service="server"} | json | msg="[turnagent] goalWorkflow.goal_exhausted"
```

### 查看组件启动失败

```logql
{service="server"} | json component="component", error="error" | msg="[lifecycle.Manager] start component failed"
```

### 查看组件停止失败

```logql
{service="server"} | json component="component", error="error" | msg="[lifecycle.Manager] stop component failed"
```

### 查看 Goroutine 泄漏告警

```logql
{service="server"} | json count="count", threshold="threshold" | msg="goroutine leak threshold exceeded"
```

### 查看服务启动日志

```logql
{service="server"} | json | msg=~"Starting RTC Agent server|HTTP server listening|LLM initialized|Tracing enabled"
```

### 查看服务关闭日志

```logql
{service="server"} | json | msg=~"Shutting down server|centrifuge node shutdown|broker close|Server shutdown"
```

### 查看数据库迁移

```logql
{service="server"} | json | msg=~"Running database migration|Database migration completed"
```

### 查看关闭超时（可能有 Goroutine 泄漏）

```logql
{service="server"} | msg="[lifecycle.Manager] shutdown timeout, goroutines still running"
```

### 查看 Panic 恢复

```logql
{service="server"} | json panic="panic", stack="stack" | msg=~"panic recovered|panic|\\[Centrifuge\\] OnConnect panic"
```

## Prometheus 指标

| 指标 | 类型 | Labels | 用途 |
|------|------|--------|------|
| `rtc_stale_turns_recovered_total` | Counter | `status` | 过期 Turn 恢复统计 |
| `rtc_checkpoint_operations_total` | Counter | `operation`, `status` | 检查点操作统计 |
| `rtc_checkpoint_data_bytes` | Histogram | `operation` | 检查点数据大小 |

### 常用 PromQL

```promql
# 每分钟恢复的过期 Turn 数
sum(rate(rtc_stale_turns_recovered_total[5m])) by (status)

# 检查点操作速率
sum(rate(rtc_checkpoint_operations_total[5m])) by (operation, status)
```

## 告警规则

| 告警 | 条件 | 说明 |
|------|------|------|
| Stale Turn 恢复频繁 | 每分钟恢复 > 30 | 服务可能频繁重启或 Turn 执行不稳定 |
| Goroutine 泄漏 | Goroutine 数超过阈值 | 存在 Goroutine 泄漏 |
| 组件启动失败 | 连续启动失败 | 依赖服务不可用 |
| 关闭超时 | 出现 shutdown timeout | 需检查是否有阻塞的 Goroutine |
| Loop 恢复频繁 | 每分钟恢复 > 10 | 任务队列可能有问题 |

## 排查指南

### Stale Turn 持续出现

1. 查看恢复日志：`{service="server"} | msg=~"recoverStaleTurns" | json`
2. 检查服务是否频繁重启：`{service="server"} | msg="Starting RTC Agent server"`
3. 检查 Worker 是否存活：`{service="server"} | msg="skip lock release -- worker alive"`
4. 如确认服务正常，检查 Turn 执行是否超时

### Loop/Goal 未正常完成

1. 查看工作流日志：`{service="server"} | msg=~"loopWorkflow|goalWorkflow" | json`
2. 检查 Loop 状态：是否有 `loop_exhausted` 事件
3. 查看恢复日志：`{service="server"} | msg=~"\\[loop\\.(Recovery|Cleanup)\\]"`
4. 检查 asynq 任务是否正常执行

### 服务关闭卡住

1. 查看关闭日志：`{service="server"} | msg=~"Shutting down|stopped|shutdown"`
2. 检查是否有超时：`{service="server"} | msg="shutdown timeout"`
3. 查看 Goroutine 数量：`{service="server"} | msg="goroutine leak threshold exceeded"`
4. 导出 pprof：`GET /debug/pprof/goroutine`
