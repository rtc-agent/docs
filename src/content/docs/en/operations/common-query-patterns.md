---
title: Common Log Query Patterns
description: Query server logs by general dimensions such as log level, Trace ID, and Session ID. Applicable to common troubleshooting scenarios across all modules.
---

In addition to module-specific queries, day-to-day troubleshooting typically filters by general dimensions such as log level, Trace ID, and Session ID. This document provides ready-to-reuse query templates.

## Log Format

All logs are in JSON format (zap JSON encoding). Key fields:

| Field | Description | Example |
|-------|-------------|---------|
| `level` | Log level | `info`, `warn`, `error`, `debug`, `fatal` |
| `time` | ISO8601 timestamp | `2026-09-22T05:33:26.910Z` |
| `msg` | Event name | `[turnagent] turn.end`, `[RPC] ->` |
| `trace_id` | OpenTelemetry Trace ID (auto-injected) | `463b28fa9fd2b71c0c6355247e80f045` |
| `span_id` | OpenTelemetry Span ID (auto-injected) | `531f76a1dc491cce` |

## Query by Log Level

### View all warn logs

```logql
{service="server"} | json | level="warn"
```

### View all error logs

```logql
{service="server"} | json | level="error"
```

### View all fatal logs

```logql
{service="server"} | json | level="fatal"
```

### View warn + error (filter out info noise)

```logql
{service="server"} | json | level=~"warn|error"
```

### Aggregate error log rate per minute

```logql
sum(count_over_time({service="server"} | json | level="error"[1m]))
```

### Top 10 error logs grouped by msg

```logql
topk(10,
  count by (msg) ({service="server"} | json msg="msg" | level="error")
)
```

### View error logs from the last 5 minutes (with details)

```logql
{service="server"} | json | level="error"
```

Set the time range to `now-5m` in Grafana Explore.

## Query by Trace ID

Every log entry automatically contains `trace_id` and `span_id` (from the OpenTelemetry context), enabling full end-to-end tracing of a single request.

### Query the full call chain by Trace ID

```logql
{service="server"} | json trace_id="trace_id" | trace_id="463b28fa9fd2b71c0c6355247e80f045"
```

### Extract Trace ID from error logs, then trace the full chain

1. First, find the error:
```logql
{service="server"} | json trace_id="trace_id", msg="msg" | level="error"
```

2. After obtaining the `trace_id`, query the full chain:
```logql
{service="server"} | json trace_id="trace_id" | trace_id="<value from above>"
```

### Cross-service tracing

The same `trace_id` is shared across multiple services. Searching for a `trace_id` in Grafana Tempo reveals the complete cross-service call chain (HTTP -> RPC -> Agent -> LLM).

### Trace the full logs for a specific RPC request

Start from the RPC logs and extract the `trace_id`:

```logql
{service="server"} | json trace_id="trace_id", method="method" | msg="[RPC] ->" | method="v1.rtc.submit_result"
```

Then use the extracted `trace_id` to query the full chain:

```logql
{service="server"} | json trace_id="trace_id" | trace_id="e6518062ef5d54ff05961e2a48d3e3c0"
```

## Query by Session ID

`session_id` is the core correlation field on the business dimension.

### View all logs for a specific Session

```logql
{service="server"} | json session_id="session_id" | session_id="01a0c796-1ecc-72c9-80b9-b214e6ef6d68"
```

### View error logs for a specific Session

```logql
{service="server"} | json session_id="session_id" | level="error" | session_id="01a0c796-1ecc-72c9-80b9-b214e6ef6d68"
```

### View all warn/error logs for a specific Session

```logql
{service="server"} | json session_id="session_id" | level=~"warn|error" | session_id="01a0c796-1ecc-72c9-80b9-b214e6ef6d68"
```

### Top 10 Sessions by error count

```logql
topk(10,
  count by (session_id) ({service="server"} | json session_id="session_id" | level="error")
)
```

## Query by Turn ID

`turn_id` is used to trace the full execution chain of a single Turn.

### View all logs for a specific Turn

```logql
{service="server"} | json turn_id="turn_id" | turn_id="01a0c79c-adbb-73ae-818d-9c2b5b95cb5f"
```

### View execution duration for a specific Turn

```logql
{service="server"} | json turn_id="turn_id", duration_ms="duration_ms" | msg="[turnagent] turn.end" | turn_id="01a0c79c-adbb-73ae-818d-9c2b5b95cb5f"
```

## Query by User ID

### View all actions for a specific user

```logql
{service="server"} | json user="user" | user="01a09047-0f11-7c36-8e08-74e6726fbbd3"
```

### View errors for a specific user

```logql
{service="server"} | json user="user" | level="error" | user="01a09047-0f11-7c36-8e08-74e6726fbbd3"
```

## Combined Time Range + Keyword Queries

### Find logs containing a specific keyword within a time range

```logql
{service="server"} |= "timeout" | json
```

### Find logs containing a specific error message

```logql
{service="server"} |= "connection refused" | json | level="error"
```

### Exclude specific noisy logs

```logql
{service="server"} | json | level="warn" | msg !~ "non-fatal|best effort"
```

## Composite Query Templates

### Troubleshoot user issues: by Session + time + level

```logql
{service="server"} | json session_id="session_id", msg="msg" | level=~"warn|error" | session_id="<session-id>"
```

### Troubleshoot tool call failures: by Session + keyword

```logql
{service="server"} | json session_id="session_id" | level="warn" | msg=~"tool\\.call_failed|script.*failed" | session_id="<session-id>"
```

### Troubleshoot LLM anomalies: by Session + token-related

```logql
{service="server"} | json session_id="session_id" | msg=~"llm\\.complete|llm\\.http\\.error|token_callback" | session_id="<session-id>"
```

### Troubleshoot RTC end-to-end: trace from Trace ID

```logql
{service="server"} | json trace_id="trace_id", msg="msg" | trace_id="<trace-id>" | line_format "{{.msg}} | {{.level}}"
```

### Global health overview: errors from the last 15 minutes grouped by module

```logql
sum by (msg) (count_over_time({service="server"} | json msg="msg" | level="error"[15m]))
```

## Grafana Explore Tips

### Use log formatting

Use `line_format` in Grafana Explore to simplify output:

```logql
{service="server"} | json | level="error" | line_format "{{.time}} [{{.level}}] {{.msg}} | session={{.session_id}} | error={{.error}}"
```

### Use label_format to extract new labels

```logql
{service="server"}
| json
| label_format level="{{.level}}"
| level="error"
```

### Combine with Tempo to view Traces

In Grafana, you can click directly on the `trace_id` field in a Loki log entry to jump to Tempo and view the full distributed tracing chain.

## Local Debug Logs

In the development environment, logs are also written to `logs/debug.log` (console format, more readable):

```bash
# Tail error logs in real time
tail -f logs/debug.log | grep '"level":"error"'

# Filter by session_id
tail -f logs/debug.log | grep '<session-id>'

# Filter by trace_id
tail -f logs/debug.log | grep '<trace-id>'

# Filter by keyword
tail -f logs/debug.log | grep 'timeout\|failed\|error'
```

Full LLM request/response logs are in `logs/llm-payload.log`:

```bash
# View LLM request errors
tail -f logs/llm-payload.log | grep 'llm.http.error'

# View requests for a specific URL
tail -f logs/llm-payload.log | grep 'api.anthropic.com'
```
