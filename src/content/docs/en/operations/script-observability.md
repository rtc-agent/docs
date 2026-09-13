---
title: Script Observability
description: Monitor Script tool execution via Loki logs, Prometheus metrics, and Grafana dashboards.
---

Every Script tool execution produces structured logs and metrics, enabling real-time monitoring via Grafana and troubleshooting via Loki queries.

## Log Events

Each Script execution produces two log events:

| Event | Trigger | Key Fields |
|-------|---------|-----------|
| `script.execution_started` | When RTC is created (before execution) | `rtc_id`, `session_id`, `title`, `action`, `name` |
| `script.execution_completed` | After result submission (after execution) | `rtc_id`, `session_id`, `title`, `action`, `status`, `duration_ms`, `result_size`, `code_size` |

Logs are JSON-encoded (zap JSON encoding) and collected by Promtail into Loki.

## Loki Queries

Use the following queries in Grafana Explore (Data source: Loki) or the Logs Dashboard:

### View all Script execution events

```logql
{service="server"} | json | msg=~"script\\.execution_(started|completed)"
```

### View completed events only

```logql
{service="server"} | json | msg="script.execution_completed"
```

### Extract key fields

```logql
{service="server"} | json title="title", action="action", status="status", duration_ms="duration_ms" | msg="script.execution_completed"
```

### Filter failed executions

```logql
{service="server"} | json status="status" | msg="script.execution_completed" | status="failed"
```

### Count executions per minute by action

```logql
sum(count_over_time({service="server"} | json | msg="script.execution_completed"[1m])) by (action)
```

### Find executions by title

```logql
{service="server"} | json title="title" | msg="script.execution_completed" | title="Analyze sales data trends"
```

### Match started/completed pairs (troubleshoot timeouts)

```logql
{service="server"} | json | msg=~"script\\.execution_(started|completed)"
```

Sort by `rtc_id`. If a `started` event has no matching `completed`, the execution failed abnormally.

## Prometheus Metrics

| Metric | Type | Labels | Purpose |
|--------|------|--------|---------|
| `rtc_script_executions_total` | Counter | `action`, `status` | Execution count, success rate |
| `rtc_script_execution_duration_seconds` | Histogram | `action` | Execution duration distribution (P50/P95/P99) |
| `rtc_script_result_size_bytes` | Histogram | `action` | Result size distribution |
| `rtc_script_code_size_bytes` | Histogram | `action` | Code size distribution |

### Common PromQL

```promql
# Execution rate (by action and status)
sum by (action, status) (rate(rtc_script_executions_total[5m]))

# P95 execution latency
histogram_quantile(0.95, sum(rate(rtc_script_execution_duration_seconds_bucket[5m])) by (le))

# Error rate
sum(rate(rtc_script_executions_total{status="failed"}[5m])) / sum(rate(rtc_script_executions_total[5m]))
```

## Grafana Dashboards

### Script Execution Panels

The main Dashboard (`rtc-agent.json`) includes a "Script Execution" Row with 6 panels:

| Panel | Description |
|-------|-------------|
| Execution Rate | Real-time rate grouped by action + status |
| Execution Latency | P50 / P95 / P99 latency trends |
| Error Rate | Failure ratio (thresholds: 5% yellow, 10% red) |
| Result Size P95 | Return data volume trends |
| Code Size P95 | Input code volume trends |
| Total Executions | Cumulative count grouped by action |

### Logs Panel

The Logs Dashboard (`logs.json`) includes a "Script Execution Logs" panel with a pre-configured Loki query showing both `script.execution_started` and `script.execution_completed` events.

## Alert Rules

| Alert | Condition | Duration | Severity |
|-------|-----------|----------|----------|
| `ScriptExecutionHighErrorRate` | Failure rate > 10% | 2 minutes | warning |
| `ScriptExecutionSlow` | P95 latency > 30s | 5 minutes | warning |

Alert rules are defined in `server/etc/dev/prometheus/alerts.yml`.
