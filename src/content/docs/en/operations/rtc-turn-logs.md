---
title: RTC and Turn Execution Logs
description: Trace the lifecycle of RTC (Remote Tool Calling) and Turn execution, troubleshoot execution timeouts, state anomalies, and recovery events.
---

RTC is the core mechanism for LLM to call external tools. Each tool call creates an RTC instance. A Turn is a complete execution round of an Agent, which may contain multiple RTCs. These logs allow you to trace the full tool execution chain.

## Log Events

### RTC Lifecycle

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[SubmitRtcResult]` | Client submits RTC execution result | `user`, `rtc`, `success` |
| `[SubmitRtcResult] idempotent repeat` | Duplicate submission (idempotent deduplication) | `rtc`, `status`, `client_id` |
| `[UpdateRtcStatus]` | RTC status changed | `user`, `rtc`, `status` |
| `rtcToolBase.rtc_created` | RTC instance created | `rtc_id`, `session_id`, `turn_id` |

### Turn Lifecycle (turnagent prefix)

#### Callback Layer (Callback)

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[turnagent] createTurn.created` | Turn created | `turn_id`, `session_id`, `work_kind` |
| `[turnagent] createTurn.idempotent_hit` | Idempotent creation hit cache | `turn_id`, `session_id` |
| `[turnagent] beginTurn.done` | Turn execution started | `turn_id`, `session_id` |
| `[turnagent] completeTurn.done` | Turn completed normally | `turn_id`, `session_id` |
| `[turnagent] cancelTurn.done` | Turn cancelled | `turn_id`, `session_id` |
| `[turnagent] failTurn.done` | Turn execution failed | `turn_id`, `session_id` |
| `[turnagent] interruptTurn.done` | Turn interrupted | `turn_id`, `session_id`, `interrupt_id` |
| `[turnagent] resumeTurn.done` | Turn resumed execution | `turn_id` |

#### Execution Layer (Turn Internal State Machine)

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[turnagent] turn.start` | Turn execution started | `turn_id`, `session_id`, `work_kind`, `work_id` |
| `[turnagent] turn.waiting_completion` | Turn waiting for LLM/RTC completion | `turn_id`, `session_id`, `work_id` |
| `[turnagent] turn.work_completed` | Turn work completed | `turn_id`, `session_id`, `work_id` |
| `[turnagent] turn.loop_exited` | Turn loop exited | `turn_id`, `session_id`, `work_kind`, `exit_reason`, `has_error` |
| `[turnagent] turn.clean_exit` | Turn clean exit | `turn_id`, `session_id`, `message` |
| `[turnagent] turn.end` | Turn ended (final event) | `turn_id`, `session_id`, `work_kind`, `status`, `duration_ms` |
| `[turnagent] interrupt` | Turn interrupted (with reason) | `turn_id`, `session_id`, `interrupt_id`, `interrupt_count`, `reason` |

### Work Queue (rtcqueue)

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[rtcqueue] worker.received_notification` | Worker received notification | `session_id` |
| `[rtcqueue] worker.claiming` | Worker attempting to claim task | `session_id`, `worker_id` |
| `[rtcqueue] worker.claimed` | Worker claimed successfully | `session_id`, `credential`, `work_id` |
| `[rtcqueue] worker.claim_empty` | Worker claim failed (queue empty) | `session_id` |
| `[rtcqueue] worker.processing_work` | Worker started processing | `session_id`, `work_id`, `hold_lock` |
| `[rtcqueue] worker.loaded_work` | Worker loaded work data | `session_id`, `work_id` |
| `[rtcqueue] worker.calling_onwork` | Worker calling processing callback | `session_id`, `work_id` |
| `[rtcqueue] worker.onwork_returned` | Worker processing completed, returned | `session_id`, `work_id` |
| `[rtcqueue] worker.queue_empty_releasing_lock` | Queue emptied, releasing Session lock | `session_id` |

### Tool Calls

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[turnagent] tool.call_failed` | Tool call failed (e.g. interrupted) | `tool_name`, `session_id`, `turn_id`, `error` |
| `[turnagent] agent.process` | Agent started processing work | `session_id`, `work_id`, `kind` (submit/resume) |

### Turn Recovery After RTC Result Submission

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[resumeTurnAfterRtc] entry` | Attempt to recover Turn after RTC completion | `rtc`, `turn`, `remaining` |
| `[resumeTurnAfterRtc] batch progress` | Batch recovery progress | `rtc`, `turn`, `remaining` |
| `[resumeTurnAfterRtc] batch item` | Batch recovery single item | `rtc_id`, `interrupt_id`, `result_len` |
| `[resumeTurnAfterRtc] batch complete, resuming turn` | Batch recovery complete, resuming Turn | `turn`, `session`, `batch_size` |
| `[resumeTurnAfterRtc] resume published` | Recovery event published to queue | `rtc`, `session`, `turn`, `batch_size` |
| `[resumeTurnAfterRtc] skip: session closed` | Skip recovery (Session closed) | `rtc`, `session` |
| `[resumeTurnAfterRtc] orphan submit published` | Orphan RTC submission published | `rtc`, `session` |

### Stop Active Turns

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[StopActiveTurns] cancelled turns` | Batch cancel active Turns | `session`, `count` |

## Loki Queries

### Trace the complete lifecycle of an RTC

```logql
{service="server"} | json rtc="rtc", rtc_id="rtc_id" | msg=~"\\[SubmitRtcResult\\]|\\[UpdateRtcStatus\\]|rtcToolBase\\.rtc_created|\\[resumeTurnAfterRtc\\]" | rtc_id="rtc-123"
```

### View all RTC creation events

```logql
{service="server"} | json | msg="rtcToolBase.rtc_created"
```

### Troubleshoot RTC result submission failures

```logql
{service="server"} | json | msg="[SubmitRtcResult]" | json success="success" | success="false"
```

### View duplicate submissions (may indicate client retry issues)

```logql
{service="server"} | json | msg="[SubmitRtcResult] idempotent repeat"
```

### Trace the complete execution flow of a Turn

```logql
{service="server"} | json turn_id="turn_id", session_id="session_id" | msg=~"\\[turnagent\\] (create|begin|complete|cancel|fail|interrupt|resume)Turn" | turn_id="turn-456"
```

### View failed Turns

```logql
{service="server"} | json | msg="[turnagent] failTurn.done"
```

### View interrupted Turns

```logql
{service="server"} | json | msg="[turnagent] interruptTurn.done"
```

### View Turn execution rate (by type and status)

```logql
sum by (work_kind, status) (rate(rtc_turn_total[5m]))
```

### View Turn latency P95 by work_kind

```logql
histogram_quantile(0.95, sum(rate(rtc_turn_duration_seconds_bucket[5m])) by (le, work_kind))
```

### Troubleshoot Turn recovery anomalies (has entry but no completion)

```logql
{service="server"} | json | msg=~"\\[resumeTurnAfterRtc\\] (entry|batch complete|skip|orphan)"
```

Sort by `rtc` field. If there is an `entry` but no corresponding completion event, the recovery process is abnormal.

### View errors in the recovery process

```logql
{service="server"} | json | msg=~"\\[resumeTurnAfterRtc\\].*(failed|error)"
```

### View batch cancel events

```logql
{service="server"} | json session="session", count="count" | msg="[StopActiveTurns] cancelled turns"
```

### View all Turn activity for a specific Session

```logql
{service="server"} | json session_id="session_id", session="session" | msg=~"\\[turnagent\\]|\\[StopActiveTurns\\]|\\[resumeTurnAfterRtc\\]|\\[rtcqueue\\]" | session_id="session-abc"
```

### Trace the full Turn state machine chain

```logql
{service="server"} | json turn_id="turn_id" | msg=~"\\[turnagent\\] turn\\.(start|waiting_completion|work_completed|loop_exited|clean_exit|end)" | turn_id="turn-456"
```

### View Turn execution duration and status

```logql
{service="server"} | json turn_id="turn_id", status="status", duration_ms="duration_ms", work_kind="work_kind" | msg="[turnagent] turn.end"
```

### View Turn loop exit reason

```logql
{service="server"} | json turn_id="turn_id", exit_reason="exit_reason", has_error="has_error" | msg="[turnagent] turn.loop_exited"
```

### View Turn exits with errors

```logql
{service="server"} | json has_error="has_error" | msg="[turnagent] turn.loop_exited" | has_error="true"
```

### View work queue claim events

```logql
{service="server"} | json session_id="session_id", work_id="work_id" | msg=~"\\[rtcqueue\\] worker\\.(claiming|claimed|claim_empty|processing_work|onwork_returned)"
```

### View empty queue (no tasks to process)

```logql
{service="server"} | json session_id="session_id" | msg="[rtcqueue] worker.claim_empty"
```

### View tool call failures

```logql
{service="server"} | json tool_name="tool_name", error="error", session_id="session_id" | msg="[turnagent] tool.call_failed"
```

### View Turn interrupt events (with reason)

```logql
{service="server"} | json turn_id="turn_id", interrupt_id="interrupt_id", reason="reason", interrupt_count="interrupt_count" | msg="[turnagent] interrupt"
```

### View Agent processing work types

```logql
{service="server"} | json session_id="session_id", work_id="work_id", kind="kind" | msg="[turnagent] agent.process"
```

## Prometheus Metrics

| Metric | Type | Labels | Purpose |
|--------|------|--------|---------|
| `rtc_turn_total` | Counter | `work_kind`, `status` | Total Turn count |
| `rtc_turn_duration_seconds` | Histogram | `work_kind`, `status` | Turn execution duration |
| `rtc_stale_turns_recovered_total` | Counter | `status` | Stale Turn recovery statistics |

### Common PromQL

```promql
# Turn success/failure rate
sum by (status) (rate(rtc_turn_total[5m]))

# Turn execution latency P50 / P95 / P99
histogram_quantile(0.50, sum(rate(rtc_turn_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.95, sum(rate(rtc_turn_duration_seconds_bucket[5m])) by (le))
histogram_quantile(0.99, sum(rate(rtc_turn_duration_seconds_bucket[5m])) by (le))

# Stale Turns recovered per minute
sum(rate(rtc_stale_turns_recovered_total[5m])) by (status)
```

## Alert Rules

| Alert | Condition | Description |
|-------|-----------|-------------|
| High Turn failure rate | `rate(rtc_turn_total{status="failed"}[5m]) / rate(rtc_turn_total[5m]) > 0.1` | More than 10% of Turns fail |
| High Turn latency | `histogram_quantile(0.95, ...) > 60` | P95 latency exceeds 60 seconds |
| Frequent stale Turn recovery | `rate(rtc_stale_turns_recovered_total[5m]) > 0.5` | More than 30 stale Turns recovered per minute |
