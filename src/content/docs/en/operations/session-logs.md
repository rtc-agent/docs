---
title: Session Lifecycle Logs
description: Track Session lifecycle events such as creation, closure, message sending, compression, and forking through Loki log queries.
---

Session is the most core business entity. Every state change produces structured logs. These logs allow you to trace the complete session lifecycle.

## Log Events

### Session State Changes

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[OpenSession]` | New Session created | `user`, `session` |
| `[OpenSession] session not closed, skipping` | Attempt to open an existing unclosed Session | `session`, `status` |
| `[CloseSession]` | Session closed | `user`, `session` |
| `[CloseSession] session already closed` | Duplicate close of an already closed Session | `session` |
| `[UpdateSession]` | Session properties updated | `user`, `session` |
| `[CompactSession]` | Context compression triggered | `user`, `session` |
| `[CompactSession] enqueued` | Compression task enqueued | `session`, `has_custom_instruction` |
| `[ForkSession] start` | Session fork started | `user`, `old_session`, `old_message`, `limit` |

### Messages and Turns

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[SendMessage]` | User sends a message | `user`, `device`, `content_len`, `session_id`, `client_id` |
| `[StopTurn]` | User interrupts a Turn | `user`, `session` |
| `[GetSession]` | Query Session details | `user`, `session` |
| `[ListSessions]` | List Sessions | `user`, `count`, `has_next` |
| `[MessageList]` | Query message list | `user`, `session`, `count`, `has_next` |

## Loki Queries

### View all Session operations for a specific user

```logql
{service="server"} | json user="user" | msg=~"\\[(Open|Close|Update|Compact|Fork)Session\\]" | user="user-123"
```

### Trace the complete lifecycle of a Session

```logql
{service="server"} | json session="session", session_id="session_id" | msg=~"\\[(Open|Close|Update|Compact|Fork)Session\\]|\\[SendMessage\\]|\\[StopTurn\\]" | session="abc-def-123"
```

### View all Session close events

```logql
{service="server"} | json | msg="[CloseSession]"
```

### View message send rate (per minute)

```logql
sum(count_over_time({service="server"} | json | msg="[SendMessage]"[1m]))
```

### View users with the highest message volume

```logql
topk(10, count by (user) ({service="server"} | json user="user" | msg="[SendMessage]"))
```

### Troubleshoot message send failures

```logql
{service="server"} | json | msg=~"\\[SendMessage\\].*failed"
```

### View Session compression events

```logql
{service="server"} | json session="session" | msg=~"\\[CompactSession\\]"
```

### View Session fork operations

```logql
{service="server"} | json | msg=~"\\[ForkSession\\]"
```

### Find duplicate Session close anomalies

```logql
{service="server"} | json session="session" | msg="[CloseSession] session already closed"
```

### View message content length distribution

Extract the `content_len` field to observe message sizes:

```logql
{service="server"} | json content_len="content_len" | msg="[SendMessage]"
```

### Troubleshoot Session open failures (existing unclosed Session)

```logql
{service="server"} | json session="session", status="status" | msg="[OpenSession] session not closed, skipping"
```

### Correlate Session operations with Traces

Every log entry automatically includes `trace_id`, which can be used to trace across services:

```logql
{service="server"} | json trace_id="trace_id", session_id="session_id" | msg="[SendMessage]" | session_id="abc-def-123"
```

After obtaining the `trace_id`, view the full call chain in Grafana Tempo.

## Prometheus Metrics

Session-related operations are automatically recorded via RPC middleware:

| Metric | Description |
|--------|-------------|
| `rtc_turn_total` | Total Turn count by `work_kind` and `status` |
| `rtc_turn_duration_seconds` | Turn execution duration distribution |

### Common PromQL

```promql
# Session message send rate per minute
sum(rate(rtc_turn_total[5m])) by (status)

# Turn execution latency P95
histogram_quantile(0.95, sum(rate(rtc_turn_duration_seconds_bucket[5m])) by (le))
```
