---
title: Error Recovery and Workflow Logs
description: Trace the execution status of background tasks such as Stale Turn recovery, Loop/Goal workflows, and lifecycle management.
---

The system includes multiple background recovery mechanisms and workflow engines to ensure data consistency under abnormal conditions. These logs help monitor the health status of background tasks.

## Log Events

### Stale Turn Recovery

When the service restarts or Turn execution is abnormally interrupted, the system automatically scans and recovers stale Turns.

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[Server] recoverStaleTurns: found stale turns` | Stale Turns discovered | `count` |
| `[Server] recoverStaleTurns: published submit` | Recovery submission published | `turn` |
| `[Server] recoverStaleTurns: skip closed session` | Skip closed Session | `session` |
| `[Server] recoverStaleTurns: skip already-interrupted turn` | Skip already interrupted Turn | `turn` |
| `[Server] recoverStaleTurns: requeued ghost work` | Re-queued ghost task | `work_id` |
| `[Server] recoverStaleTurns: released session lock` | Session lock released | `session` |
| `[Server] recoverStaleTurns: skip lock release -- worker alive` | Skip lock release (Worker still alive) | `session` |
| `[Server] periodicRecoverStaleTurns: found stale turns` | Periodic scan found stale Turns | `count` |
| `[Server] periodicRecoverStaleTurns: checkpoint expired` | Checkpoint expired | `turn` |
| `[Server] periodicRecoverStaleTurns: recovering stale running/interrupted turn` | Recovering running/interrupted Turn | `turn` |
| `[Server] publishRecoveryWorkItem: published` | Recovery work item published | `session`, `turn` |

### Loop Recovery and Cleanup

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[loop.Recovery] started` | Recovery scan started | `interval` |
| `[loop.Recovery] cancelled expired loop` | Cancelled expired Loop | `loop_id` |
| `[loop.Recovery] re-enqueued stale loop` | Re-enqueued stalled Loop | `loop_id` |
| `[loop.Cleanup] cancelled active loop` | Cleaned up active Loop | `loop_id` |
| `[loop.Cleanup] cancelled active goal` | Cleaned up active Goal | `goal_id` |

### Loop / Goal Workflow Tools

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[turnagent] createLoop.completed` | Loop creation completed | `loop_id`, `session_id` |
| `[turnagent] createGoal.completed` | Goal creation completed | `goal_id`, `session_id` |
| `[turnagent] pauseLoop.completed` | Loop paused | `loop_id`, `session_id` |
| `[turnagent] resumeLoop.completed` | Loop resumed | `loop_id`, `session_id` |
| `[turnagent] listLoops.completed` | Loop list query | `session_id`, `count` |
| `[turnagent] loopWorkflow.loop_exhausted` | Loop reached maximum iterations | `loop_id`, `session_id` |
| `[turnagent] loopWorkflow.loop_extended` | Loop iteration extended | `loop_id`, `session_id`, `iteration` |
| `[turnagent] loopWorkflow.scheduled_next` | Next execution scheduled | `loop_id`, `task_id` |
| `[turnagent] goalWorkflow.goal_exhausted` | Goal reached maximum iterations | `goal_id`, `session_id` |
| `[turnagent] goalWorkflow.goal_extended` | Goal iteration extended | `goal_id`, `session_id`, `iteration` |

### Lifecycle Management

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[lifecycle.Manager] component started` | Component started successfully | `component` |
| `[lifecycle.Manager] component stopped` | Component stopped successfully | `component` |
| `[lifecycle.Manager] start component failed` | Component start failed | `component`, `error` |
| `[lifecycle.Manager] stop component failed` | Component stop failed | `component`, `error` |
| `[lifecycle.Manager] shutdown timeout` | Shutdown timeout | - |
| `[lifecycle.Manager] goroutine panic` | Component Goroutine exception | `component`, `panic`, `stack` |

### Server Startup and Shutdown

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `Starting RTC Agent server...` | Server starting | - |
| `HTTP server listening` | HTTP server ready | `addr` |
| `LLM initialized` | LLM initialization completed | `provider`, `model` |
| `Tracing enabled` | Tracing enabled | `endpoint`, `sample_rate` |
| `Shutting down server...` | Server shutting down | - |
| `Server failed` | Server startup failed | `error` |
| `Database migration completed successfully` | Database migration completed | - |

### Goroutine Leak Monitoring

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `goroutine leak threshold exceeded` | Goroutine count exceeds threshold | `count`, `threshold` |

## Loki Queries

### View Stale Turn recovery events

```logql
{service="server"} | json | msg=~"\\[Server\\] (recoverStaleTurns|periodicRecoverStaleTurns|publishRecoveryWorkItem)"
```

### View trend of recovered stale Turns

```logql
{service="server"} | json count="count" | msg=~"\\[Server\\] (recoverStaleTurns|periodicRecoverStaleTurns): found stale turns"
```

### Trace recovery process for a specific Turn

```logql
{service="server"} | json turn="turn" | msg=~"\\[Server\\] (recoverStaleTurns|periodicRecoverStaleTurns)" | turn="turn-123"
```

### View errors during recovery

```logql
{service="server"} | json | msg=~"\\[Server\\] (recoverStaleTurns|periodicRecoverStaleTurns).*(failed|error)"
```

### View Loop recovery and cleanup events

```logql
{service="server"} | json | msg=~"\\[loop\\.(Recovery|Cleanup)\\]"
```

### View Loop workflow execution

```logql
{service="server"} | json | msg=~"\\[turnagent\\] (createLoop|createGoal|pauseLoop|resumeLoop|loopWorkflow|goalWorkflow)"
```

### Trace the complete lifecycle of a Loop

```logql
{service="server"} | json loop_id="loop_id" | msg=~"\\[turnagent\\] (createLoop|pauseLoop|resumeLoop|loopWorkflow|listLoops)" | loop_id="loop-abc"
```

### View Loops that reached maximum iterations

```logql
{service="server"} | json | msg="[turnagent] loopWorkflow.loop_exhausted"
```

### View Goals that reached maximum iterations

```logql
{service="server"} | json | msg="[turnagent] goalWorkflow.goal_exhausted"
```

### View component start failures

```logql
{service="server"} | json component="component", error="error" | msg="[lifecycle.Manager] start component failed"
```

### View component stop failures

```logql
{service="server"} | json component="component", error="error" | msg="[lifecycle.Manager] stop component failed"
```

### View Goroutine leak alerts

```logql
{service="server"} | json count="count", threshold="threshold" | msg="goroutine leak threshold exceeded"
```

### View server startup logs

```logql
{service="server"} | json | msg=~"Starting RTC Agent server|HTTP server listening|LLM initialized|Tracing enabled"
```

### View server shutdown logs

```logql
{service="server"} | json | msg=~"Shutting down server|centrifuge node shutdown|broker close|Server shutdown"
```

### View database migrations

```logql
{service="server"} | json | msg=~"Running database migration|Database migration completed"
```

### View shutdown timeouts (possible Goroutine leaks)

```logql
{service="server"} | msg="[lifecycle.Manager] shutdown timeout, goroutines still running"
```

### View Panic recovery

```logql
{service="server"} | json panic="panic", stack="stack" | msg=~"panic recovered|panic|\\[Centrifuge\\] OnConnect panic"
```

## Prometheus Metrics

| Metric | Type | Labels | Purpose |
|--------|------|--------|---------|
| `rtc_stale_turns_recovered_total` | Counter | `status` | Stale Turn recovery statistics |
| `rtc_checkpoint_operations_total` | Counter | `operation`, `status` | Checkpoint operation statistics |
| `rtc_checkpoint_data_bytes` | Histogram | `operation` | Checkpoint data size |

### Common PromQL

```promql
# Stale Turns recovered per minute
sum(rate(rtc_stale_turns_recovered_total[5m])) by (status)

# Checkpoint operation rate
sum(rate(rtc_checkpoint_operations_total[5m])) by (operation, status)
```

## Alert Rules

| Alert | Condition | Description |
|-------|-----------|-------------|
| Frequent Stale Turn recovery | Recovery > 30 per minute | Service may be restarting frequently or Turn execution is unstable |
| Goroutine leak | Goroutine count exceeds threshold | Goroutine leak detected |
| Component start failure | Consecutive start failures | Dependency service unavailable |
| Shutdown timeout | Shutdown timeout appears | Check for blocked Goroutines |
| Frequent Loop recovery | Recovery > 10 per minute | Task queue may have issues |

## Troubleshooting Guide

### Stale Turns Persisting

1. View recovery logs: `{service="server"} | msg=~"recoverStaleTurns" | json`
2. Check if the service is restarting frequently: `{service="server"} | msg="Starting RTC Agent server"`
3. Check if Workers are alive: `{service="server"} | msg="skip lock release -- worker alive"`
4. If the service is healthy, check if Turn execution is timing out

### Loop/Goal Not Completing Normally

1. View workflow logs: `{service="server"} | msg=~"loopWorkflow|goalWorkflow" | json`
2. Check Loop status: are there `loop_exhausted` events
3. View recovery logs: `{service="server"} | msg=~"\\[loop\\.(Recovery|Cleanup)\\]"`
4. Check if asynq tasks are executing normally

### Server Shutdown Stuck

1. View shutdown logs: `{service="server"} | msg=~"Shutting down|stopped|shutdown"`
2. Check for timeouts: `{service="server"} | msg="shutdown timeout"`
3. View Goroutine count: `{service="server"} | msg="goroutine leak threshold exceeded"`
4. Export pprof: `GET /debug/pprof/goroutine`
