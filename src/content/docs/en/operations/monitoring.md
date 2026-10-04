---
title: Monitoring
description: RTC Agent's Prometheus metrics, Grafana dashboards, and alert rules — full visibility into system health.
---

RTC Agent includes a complete observability infrastructure: Prometheus for metrics collection, Grafana for dashboard visualization, and Alertmanager for alert notifications. This page documents all available metrics, dashboards, and pre-configured alert rules.

## Metrics

All Prometheus metrics are exposed via the `GET /metrics` endpoint (`text/plain` format), following the `{namespace}_{subsystem}_{name}` naming convention with a unified `rtc_` prefix.

### Database Metrics (rtc_db_*)

Automatically collected for all SQL operations via a GORM plugin.

| Metric | Type | Labels | Description |
| --- | --- | --- | --- |
| `rtc_db_queries_total` | Counter | `operation` (select/insert/update/delete/raw), `status` (success/error) | Total database queries |
| `rtc_db_query_duration_seconds` | Histogram | `operation` | Database query duration distribution (buckets: 1ms ~ 4.096s) |

> 💡 These metrics help identify slow queries and database bottlenecks. The `operation` label distinguishes CRUD operation types.

### Queue Lifecycle Metrics (rtc_queue_*)

Tracks work items from publish to completion.

| Metric | Type | Labels | Description |
| --- | --- | --- | --- |
| `rtc_queue_publish_total` | Counter | `status` (success/error) | Total work items published |
| `rtc_queue_claim_total` | Counter | `status` (success/empty/error) | Total work items claimed |
| `rtc_queue_complete_total` | Counter | `status` (success/error) | Total work items completed |
| `rtc_queue_cancel_total` | Counter | `reason` | Total work items cancelled |
| `rtc_queue_wait_duration_seconds` | Histogram | — | Wait time (publish to claim) |
| `rtc_queue_processing_duration_seconds` | Histogram | — | Processing time (claim to completion) |

> 💡 Queue metrics are essential for troubleshooting Worker load and task latency. `wait_duration` reflects scheduling efficiency; `process_duration` reflects processing capacity.

### Circuit Breaker Metrics (rtc_circuitbreaker_*)

Monitor circuit breaker state for WebFetch and other modules.

| Metric | Type | Labels | Description |
| --- | --- | --- | --- |
| `rtc_circuitbreaker_state_changes_total` | Counter | `name`, `from_state`, `to_state` | Total state changes |
| `rtc_circuitbreaker_state` | Gauge | `name`, `state` (closed/open/half_open) | Current state (1=active, 0=inactive) |

### WebSocket / Centrifuge Metrics (rtc_centrifuge_*)

Monitor real-time connections, RPC calls, and channel subscriptions.

| Metric | Type | Labels | Description |
| --- | --- | --- | --- |
| `rtc_centrifuge_connections_total` | Counter | `status` (connected/disconnected) | Total connection events |
| `rtc_centrifuge_disconnect_reason_total` | Counter | `reason` (slow/normal/error) | Disconnect reason distribution |
| `rtc_centrifuge_rpc_requests_total` | Counter | `method`, `status` (success/error) | Total RPC calls |
| `rtc_centrifuge_rpc_duration_seconds` | Histogram | `method` | RPC call duration distribution (buckets: 1ms ~ 4s) |
| `rtc_centrifuge_subscriptions_total` | Counter | `channel_type` (user/topic/live) | Total channel subscriptions |
| `rtc_centrifuge_connecting_duration_seconds` | Histogram | `status` (success/error) | JWT verification duration (OnConnecting phase) |

### Authentication Metrics (rtc_auth_*)

| Metric | Type | Labels | Description |
| --- | --- | --- | --- |
| `rtc_auth_failures_total` | Counter | `type` (jwt/oauth/centrifuge), `reason` (expired/invalid/missing/signature/claims) | Total authentication failures |

> 💡 A sudden spike in auth failure rate may indicate a brute-force attack or misconfiguration.

### Business Event Metrics (rtc_session_*, rtc_message_*)

Track core business events (Session lifecycle and message sending).

| Metric | Type | Labels | Description |
| --- | --- | --- | --- |
| `rtc_session_created_total` | Counter | — | Total sessions created |
| `rtc_session_closed_total` | Counter | `reason` (normal/error/stopped_by_parent) | Total sessions closed (by reason) |
| `rtc_messages_sent_total` | Counter | `type` (user/assistant/system) | Total messages sent (by type) |

### OSS3 Object Storage Metrics (rtc_oss3_*)

| Metric | Type | Labels | Description |
| --- | --- | --- | --- |
| `rtc_oss3_requests_total` | Counter | `operation` (PutObject/GetObject/...), `status` | Total S3 requests |
| `rtc_oss3_request_duration_seconds` | Histogram | `operation` | S3 request duration distribution |
| `rtc_oss3_quota_usage_bytes` | Gauge | `user_id` | User quota usage (bytes) |
| `rtc_oss3_multipart_uploads_active` | Gauge | — | Active multipart uploads |
| `rtc_oss3_backend_errors_total` | Counter | — | Backend (MinIO) error count |

### HTTP Metrics

| Metric | Type | Labels | Description |
| --- | --- | --- | --- |
| `http_requests_total` | Counter | `code`, `method` | Total HTTP requests (with status codes) |
| `http_request_duration_seconds` | Histogram | — | HTTP request duration distribution |

### Go Runtime Metrics

| Metric | Type | Description |
| --- | --- | --- |
| `go_goroutines` | Gauge | Current Goroutine count |
| `go_memstats_heap_alloc_bytes` | Gauge | Heap memory usage (bytes) |
| `process_start_time_seconds` | Gauge | Process start time |

## Grafana Dashboards

The distributed deployment includes pre-configured Grafana (port 23001, default credentials admin/admin). The following dashboards are loaded automatically via Provisioning:

| Dashboard | Description | Key Panels |
| --- | --- | --- |
| **RTC Agent** | Core business dashboard | Active sessions, Turn execution, LLM calls, Token consumption, Cache hit rate |
| **OSS3 Overview** | Object storage overview | Upload/download throughput, Quota usage, Multipart upload status, Backend health |
| **MinIO Overview** | MinIO backend details | Disk usage, S3 request rate, Node status |
| **HTTP Server** | HTTP layer monitoring | Request rate, Latency distribution, Status code distribution |
| **Go Runtime** | Go runtime | Goroutine count, GC pause times, Memory usage |
| **System Health Watchdog** | System health watchdog | Composite health score, Resource usage trends |
| **Logs** | Log aggregation (Loki) | Structured log queries, Error log filtering |
| **Error Feedback Overview** | Error feedback overview | Error message creation rate, Reactive Compact status |

Access Grafana: `http://localhost:23001` (distributed deployment) or your custom port.

## Alert Rules

The distributed deployment includes pre-configured Alertmanager alert rules via `etc/dev/prometheus/alerts.yml`. Alerts are organized into the following groups:

### rtc-agent-alerts — Core Service Alerts

| Alert | Condition | Severity | Description |
| --- | --- | --- | --- |
| `ServerDown` | `up == 0` for 30s | critical | Service unreachable |
| `HighHTTPErrorRate` | 5xx error rate > 5% for 2m | warning | HTTP error rate anomaly |
| `HighHTTPLatency` | p95 latency > 2s for 5m | warning | HTTP latency too high |
| `LLMHighErrorRate` | LLM error rate > 10% for 2m | warning | LLM service anomaly |
| `HighTokenConsumptionRate` | Token consumption > 100k/s for 1m | warning | Token consumption anomaly |
| `HighReasoningTokenRatio` | Reasoning token ratio > 50% for 5m | warning | Model configuration may be wrong |
| `GoroutineLeak` | Goroutines > 5000 for 10m | warning | Possible Goroutine leak |
| `HighMemoryUsage` | Heap memory > 1GB for 5m | warning | Memory pressure |
| `ContainerRestarting` | > 2 restarts in 10min | critical | Frequent container restarts |
| `ScriptExecutionHighErrorRate` | Script error rate > 10% for 2m | warning | Script execution anomaly |
| `ScriptExecutionSlow` | Script p95 latency > 30s for 5m | warning | Slow script execution |

### error-feedback-alerts — Error Feedback Alerts

| Alert | Condition | Severity | Description |
| --- | --- | --- | --- |
| `StaleTurnRecoveryActive` | Stale turn recovery within 15min | warning | Auto-recovery triggered |
| `StaleTurnRecoveryHighRate` | Recovery rate > 0.1/s for 5m | warning | Many turns stuck |
| `ErrorMessageRateSpike` | Error message creation rate > 0.5/s | warning | Error message spike |
| `ReactiveCompactExhausted` | All Level-3 compactions failed | critical | Auto-recovery mechanism exhausted |
| `ErrorFeedbackSLABreach` | P99 latency > 10s | warning | Error feedback SLA breach |

### new-metrics-alerts — Extended Metrics Alerts

#### Centrifuge / WebSocket

| Alert | Condition | Severity |
| --- | --- | --- |
| `CentrifugeHighErrorDisconnectRate` | error disconnects > 20% | warning |
| `CentrifugeRPCHighErrorRate` | RPC error rate > 10% | warning |
| `CentrifugeRPCHighLatency` | RPC p95 latency > 1s | warning |

#### Queue Lifecycle

| Alert | Condition | Severity |
| --- | --- | --- |
| `QueueHighWaitDuration` | Wait time p95 > 30s | warning |
| `QueueHighProcessingDuration` | Processing time p95 > 5min | warning |
| `QueueHighCompleteFailureRate` | complete failure rate > 10% | warning |
| `QueueHighCancelRate` | Cancel rate > 20% | warning |

#### Authentication

| Alert | Condition | Severity |
| --- | --- | --- |
| `AuthFailuresSpike` | Auth failures > 1/s for 2m | warning |

#### Circuit Breaker

| Alert | Condition | Severity |
| --- | --- | --- |
| `CircuitBreakerOpen` | Circuit breaker in open state for 1m | critical |

#### Database

| Alert | Condition | Severity |
| --- | --- | --- |
| `DBHighQueryLatency` | Query p95 latency > 1s | warning |
| `DBHighQueryErrorRate` | Query error rate > 5% | warning |
| `DBUnavailable` | Query error rate > 90% | critical |

#### Business Events

| Alert | Condition | Severity |
| --- | --- | --- |
| `SessionHighErrorCloseRate` | Session error close rate > 20% | warning |

### minio-alerts — MinIO Storage Alerts

| Alert | Condition | Severity |
| --- | --- | --- |
| `MinIODown` | Service unreachable for 30s | critical |
| `MinIODiskUsageHigh` | Disk usage > 85% | warning |
| `MinIODiskUsageCritical` | Disk usage > 95% | critical |
| `MinIOHighErrorRate` | S3 request error rate > 5% | warning |
| `MinIOHighLatency` | S3 p95 latency > 5s | warning |
| `MinIOOfflineNodes` | Nodes offline | critical |
| `MinIOQuotaExceeded` | Bucket usage > 10GB | warning |

### oss3-alerts — OSS3 Object Storage Alerts

| Alert | Condition | Severity |
| --- | --- | --- |
| `OSS3EndpointDown` | S3 endpoint unreachable | critical |
| `OSS3HighUploadErrorRate` | Upload error rate > 5% | warning |
| `OSS3HighDownloadLatency` | Download p95 > 5s | warning |
| `OSS3QuotaNearLimit` | User quota usage > 90% | warning |
| `OSS3MultipartUploadBacklog` | Active multipart uploads > 1000 | warning |
| `OSS3BackendError` | Backend error rate anomaly | warning |

### infra-alerts — Infrastructure Alerts

| Alert | Condition | Severity |
| --- | --- | --- |
| `PostgresDown` | Server unreachable (possible dependency failure) | critical |
| `PrometheusTargetMissing` | Scrape target unreachable | warning |

## Configuration

### Enable Metrics Authentication

In production, the `/metrics` endpoint **requires** Basic Auth — otherwise the endpoint is disabled:

```yaml
metrics:
  user: "admin"
  password: "${METRICS__PASSWORD}"  # Configure via environment variable
```

> ⚠️ **Production enforcement**: Without credentials configured, the endpoint remains accessible in development (for local debugging) but is **disabled** in production.

### Enable Debug Endpoint Authentication

Debug endpoints (pprof, goroutines) are **disabled by default** (`enabled: false`). To enable them, you must also configure authentication:

```yaml
debug:
  enabled: true          # Default false; must be explicitly enabled
  user: "admin"
  password: "${DEBUG__PASSWORD}"
```

> ⚠️ In production, debug endpoints are **disabled** when authentication is not configured. Even if `enabled: true`, they will be turned off without authentication configuration.

### Security Hardening

The Server automatically enables the following security protections in production:

| Mechanism | Description |
| --- | --- |
| **OAuth2 IP Rate Limiting** | OAuth2 endpoints (`/oauth2/authorize`, `/oauth2/token`, `/oauth2/refresh`) are rate-limited to 5 req/s per IP with a burst of 10, preventing brute-force attacks |
| **HSTS Header** | Enforces HTTPS transport, preventing protocol downgrade attacks |
| **Permissions-Policy Header** | Restricts browser API access, reducing the attack surface |
| **Debug Endpoints Default Disabled** | Debug endpoints (pprof, goroutines) are disabled by default; must be explicitly enabled and configured with authentication |
| **Redirect URI Whitelist** | Production enforces OAuth2 redirect_uri whitelist validation, preventing open redirect attacks |
| **OSS3 SecretAccessKey Static Encryption** | Object storage SecretAccessKey is encrypted at rest in the database, preventing plaintext leakage |
| **Trusted Proxy Support** | Supports configuring trusted proxies to ensure audit logs and rate limiting correctly identify the real client IP |

### Alertmanager Integration

The distributed deployment comes with pre-configured Alertmanager (port 29093). Alert rules are loaded via Prometheus's `rule_files`. To customize alert rules, edit `etc/dev/prometheus/alerts.yml`.

## Next Steps

- [Distributed Cluster Deployment](/docs/en/deployment/distributed-deploy/) — Deploy a distributed cluster with full observability stack
- [Agent & LLM Observability](/docs/en/operations/agent-llm-observability/) — Deep dive into LLM call logs and token consumption
- [Session Logs](/docs/en/operations/session-logs/) — Session-level structured logging
- [HTTP API](/docs/en/protocol/http-api/) — All HTTP endpoint reference
