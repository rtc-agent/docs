---
title: Observability Integration
description: Observability tools integrated in Admin service, including Grafana, Prometheus, Jaeger, and Pyroscope
---

# Observability Integration

The Admin service integrates a complete observability toolchain, providing unified monitoring interface through reverse proxy and iframe embedding.

## Architecture Overview

```
┌──────────────┐     ┌──────────────     ┌──────────────┐
│   Admin UI   │────►│ Admin Server │────►│  Monitoring  │
│  (iframe)    │     │   (Proxy)    │     │   Services   │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ──────────────┐
    │   Grafana    │ │  Prometheus  │ │    Jaeger    │
    │  (Dashboards)│ │  (Metrics)   │ │  (Tracing)   │
    └──────────────┘ └──────────────┘ ──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  Pyroscope   │
                    │ (Profiling)  │
                    └──────────────┘
```

## Integration Methods

### Reverse Proxy

Admin Server acts as a reverse proxy, forwarding requests to monitoring services:

| Proxy Path | Target Service | Purpose |
|------------|----------------|---------|
| `/api/grafana/*` | Grafana | Dashboard display |
| `/api/metrics/*` | Prometheus | Metrics query |
| `/api/jaeger/*` | Jaeger | Distributed tracing |
| `/api/pyroscope/*` | Pyroscope | Profiling |

### iframe Embedding

Grafana dashboards are embedded in Admin UI via iframe:

```html
<iframe
  src="/api/grafana/d/rtc-agent/rtc-agent"
  frameborder="0"
  width="100%"
  height="600px"
></iframe>
```

## Grafana Integration

### Configuration

Configure Grafana URL in `admin.yaml`:

```yaml
grafana_url: "http://grafana:3000"
```

**Grafana Environment Configuration** (docker-compose.yml):

```yaml
grafana:
  image: grafana/grafana:11.1.0
  environment:
    # Disable built-in auth, allow Admin Server iframe access
    - GF_AUTH_ANONYMOUS_ENABLED=true
    - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
    - GF_AUTH_BASIC_ENABLED=false
    - GF_AUTH_DISABLE_LOGIN_FORM=true
    # Reverse proxy subpath configuration
    - GF_SERVER_ROOT_URL=http://localhost:8000/api/grafana
    - GF_SERVER_SERVE_FROM_SUB_PATH=true
    # Allow iframe embedding
    - GF_SECURITY_ALLOW_EMBEDDING=true
    - GF_SECURITY_CSRF_TRUSTED_ORIGINS=http://localhost:8000,http://localhost:28081
    - GF_SECURITY_CSRF_ENABLED=false
    - GF_SERVER_ALLOWED_ORIGINS=http://localhost:8000 http://localhost:28081
  ports:
    - "23001:3000"
  volumes:
    - ./etc/dev/grafana/provisioning/datasources:/etc/grafana/provisioning/datasources:ro
    - ./etc/dev/grafana/provisioning/dashboards:/etc/grafana/provisioning/dashboards:ro
    - ./etc/dev/grafana/dashboards:/var/lib/grafana/dashboards:ro
```

### Datasource Configuration

Grafana comes pre-configured with the following datasources:

| Datasource | Type | URL |
|------------|------|-----|
| Prometheus | Prometheus | `http://prometheus:9090` |
| Loki | Loki | `http://loki:3100` |
| Jaeger | Jaeger | `http://jaeger:16686` |
| Pyroscope | Pyroscope | `http://pyroscope:4040` |

### Pre-built Dashboards

Admin UI provides the following pre-built dashboards:

#### 1. RTC Agent

Monitor RTC Agent core metrics:
- LLM usage (Token consumption rate, cumulative consumption)
- LLM request latency (p50/p95/p99)
- LLM error rate
- LLM HTTP layer monitoring (request rate, Token consumption rate)

#### 2. Go Runtime

Monitor Go runtime metrics:
- Goroutine count
- Memory usage (Heap, Stack)
- GC pause duration
- System calls

#### 3. HTTP Server

Monitor HTTP service metrics:
- Request rate
- Request latency distribution
- Error rate
- Active connections

#### 4. Error Feedback

Display application errors and exceptions:
- Error type distribution
- Error trends
- Error details

#### 5. Log Overview

Query logs via Loki:
- Log level distribution
- Log trends
- Log search

#### 6. OSS3 Storage

Monitor object storage metrics:
- Storage usage
- Request rate
- Error rate

#### 7. MinIO Storage

Monitor MinIO-specific metrics:
- Disk usage
- Bucket statistics
- Operation statistics

### Access Method

```
Admin UI → Monitoring Dashboards → RTC Agent
                                → Go Runtime
                                → HTTP Server
                                → Error Feedback
                                → Log Overview
                                → OSS3 Storage
                                → MinIO Storage
```

## Prometheus Integration

### Configuration

```yaml
prometheus_url: "http://prometheus:9090"
```

### Metrics Collection

RTC Agent Server exposes the following metrics endpoint:

```
GET /metrics
```

**Metric Types**:

| Metric | Type | Description |
|--------|------|-------------|
| `rtc_agent_http_requests_total` | Counter | Total HTTP requests |
| `rtc_agent_http_request_duration_seconds` | Histogram | HTTP request latency |
| `rtc_agent_llm_tokens_total` | Counter | LLM Token consumption |
| `rtc_agent_llm_request_duration_seconds` | Histogram | LLM request latency |
| `rtc_agent_active_sessions` | Gauge | Active sessions |
| `go_goroutines` | Gauge | Goroutine count |
| `go_memstats_heap_alloc_bytes` | Gauge | Heap memory usage |

### PromQL Examples

```promql
# LLM Token consumption rate
rate(rtc_agent_llm_tokens_total[5m])

# HTTP request latency p99
histogram_quantile(0.99, rate(rtc_agent_http_request_duration_seconds_bucket[5m]))

# Error rate
rate(rtc_agent_http_requests_total{status=~"5.."}[5m]) / rate(rtc_agent_http_requests_total[5m])
```

## Jaeger Integration

### Configuration

```yaml
jaeger_url: "http://jaeger:16686"
```

### Distributed Tracing

RTC Agent uses OpenTelemetry to generate tracing data:

**Trace Chain**:
```
User Request → Nginx → RTC Server → LLM API
                              ↓
                         Database
                              ↓
                         Redis
```

**Span Attributes**:
- `http.method`: HTTP method
- `http.url`: Request URL
- `http.status_code`: Response status code
- `db.statement`: SQL statement
- `llm.model`: LLM model name
- `llm.tokens`: Token consumption

### Access Method

```
Admin UI → Distributed Tracing → Jaeger UI (iframe embedded)
```

Or access via Admin Server reverse proxy:
```
http://localhost:28081/api/jaeger/search
```

## Pyroscope Integration

### Configuration

```yaml
pyroscope_url: "http://pyroscope:4040"
```

### Performance Profiling

Pyroscope provides continuous performance profiling:

**Profile Types**:
- CPU profiling
- Memory profiling
- Goroutine profiling
- Blocking profiling

**Use Cases**:
- Identify CPU hotspots
- Detect memory leaks
- Analyze Goroutine blocking

### Access Method

```
Admin UI → Profiling → Pyroscope UI (iframe embedded)
```

Or access via Admin Server reverse proxy:
```
http://localhost:28081/api/pyroscope/
```

## Admin UI Monitoring Panels

### Left Navigation

```
Monitoring Dashboards
├── RTC Agent        # LLM usage, latency, error rate
├── Go Runtime       # Go runtime metrics
├── HTTP Server      # HTTP service metrics
├── Error Feedback   # Errors and exceptions
├── Log Overview     # Log query
├── OSS3 Storage     # Object storage monitoring
└── MinIO Storage    # MinIO-specific metrics
```

### Panel Features

**Time Range Selection**:
- Last 15 minutes
- Last 1 hour
- Last 6 hours
- Last 24 hours
- Custom range

**Auto Refresh**:
- Off
- 5 seconds
- 10 seconds
- 30 seconds
- 1 minute

**Panel Operations**:
- Fullscreen
- Edit panel
- Export panel
- Share link

## Alert Configuration

### Prometheus Alert Rules

Configure in `etc/dev/prometheus/alerts.yml`:

```yaml
groups:
  - name: rtc-agent-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(rtc_agent_http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} for the last 5 minutes"

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(rtc_agent_http_request_duration_seconds_bucket[5m])) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "p99 latency is {{ $value }}s for the last 10 minutes"
```

### Alertmanager Configuration

```yaml
alertmanager:
  image: prom/alertmanager:v0.27.0
  ports:
    - "29093:9093"
  volumes:
    - ./etc/dev/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
```

## Logging System

### Loki Log Aggregation

```yaml
loki:
  image: grafana/loki:3.1.0
  ports:
    - "23100:3100"
```

### Promtail Log Collection

```yaml
promtail:
  image: grafana/promtail:3.1.0
  volumes:
    - ./etc/dev/promtail/promtail.yml:/etc/promtail/config.yml:ro
    - /var/run/docker.sock:/var/run/docker.sock:ro
```

### LogQL Query Examples

```logql
# Query error logs
{app="rtc-agent"} |= "error"

# Query logs for specific session
{app="rtc-agent"} |~ "session_id=abc123"

# Log rate statistics
rate({app="rtc-agent"} |= "error"[5m])
```

## Related Documentation

- [Admin Service Overview](/en/admin/overview/)
- [Deployment & Operations](/en/admin/deployment/)
- [API Reference](/en/admin/api-reference/)
