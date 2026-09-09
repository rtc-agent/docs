---
title: Docker Distributed Cluster
description: 2 Servers + Nginx load balancing + full observability stack — validate multi-Worker distributed deployment.
---

The distributed cluster deployment validates RTC Agent's multi-Worker capabilities — 2 Server containers + Nginx load balancing + full observability stack (Jaeger, Prometheus, Grafana, Loki, etc.).

## Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Client1[Browser / Web Component]
    end

    subgraph Access["Access Layer"]
        Nginx[Nginx :28080]
    end

    subgraph App["Application Layer"]
        Server1[Server-1 :8888]
        Server2[Server-2 :8888]
    end

    subgraph Data["Data Layer"]
        PostgreSQL[(PostgreSQL :25432)]
        Redis[(Redis :26379)]
    end

    subgraph Observability["Observability Stack"]
        Jaeger[Jaeger]
        Prometheus[Prometheus]
        Grafana[Grafana]
        Loki[Loki]
    end

    Client1 --> Nginx
    Nginx --> Server1
    Nginx --> Server2
    Server1 --> PostgreSQL
    Server1 --> Redis
    Server2 --> PostgreSQL
    Server2 --> Redis
    Server1 -.-> Jaeger
    Server2 -.-> Jaeger
    Server1 -.-> Prometheus
    Server2 -.-> Prometheus
    Grafana --> Prometheus
    Grafana --> Loki
```

## Port Assignments

| Service | Port | Description |
| --- | --- | --- |
| Nginx | 28080 | Load balancer entry point |
| Server 1 & 2 | Internal 8888 | Not directly exposed |
| PostgreSQL | 25432 | With pgvector |
| Redis | 26379 | Worker coordination |
| Jaeger UI | 26686 | Trace visualization |
| Jaeger OTLP | 24317 | gRPC ingestion |
| Prometheus | 29090 | Metrics collection |
| Grafana | 23001 | Dashboards (admin/admin) |
| Loki | 23100 | Log aggregation |
| Pyroscope | 24040 | Continuous profiling |
| Alertmanager | 29093 | Alert routing |
| Mock OAuth2 | 20060 | Development OAuth2 |

> **Port design**: All ports do not conflict with the development environment (15432/16379/80), so both can run simultaneously.

## 1. Prepare Configuration

```bash
cp etc/config.example.yaml etc/config.docker-full.yaml
```

Edit `etc/config.docker-full.yaml`:

```yaml
database:
  dsn: "postgres://rtc_agent:rtc_agent@postgres:5432/rtc_agent?sslmode=disable"
  auto_migrate: true

redis:
  addr: "redis:6379"

tracing:
  enabled: true
  endpoint: "jaeger:4317"
  sample_rate: 1.0

providers:
  mock:
    enabled: true
    url: "http://mock-oauth2:10060"

llm:
  provider: "claude"
  api_key: "${LLM_API_KEY}"   # Injected via env var — set LLM_API_KEY before starting
  model: "claude-sonnet-4-20250514"
```

> ⚠️ **OAuth2 service address**: `providers.mock.url` points to the OAuth2 authorization service. The example `192.168.31.60:20060` is a public IP example from the dev environment. Developers need to deploy their own OAuth2 service (compatible with the mock-oauth2 protocol) and replace this with the actual service address. See [Authentication](/docs/en/integration/auth/) for details.

## 2. Start

```bash
docker compose -f docker-compose.full.yml up -d
```

Startup order: PostgreSQL/Redis → migrate (one-time container) → Server-1 & Server-2 → Nginx

## 3. Verify

```bash
# Health check (via Nginx load balancing)
curl http://localhost:28080/healthz
# {"status":"ok"}

# Check container status — all containers should be healthy/running
docker compose -f docker-compose.full.yml ps

# Jaeger trace dashboard
open http://localhost:26686
```

## 4. Validate Distributed Behavior

Both Servers share the same PostgreSQL and Redis. When user requests are distributed across different Servers via Nginx:

- **Session Affinity**: Implemented via Redis distributed lock (`SET NX`), ensuring only one Worker processes a given Session's work at any time
- **RTC Checkpoint**: When the Agent executes a remote tool call, the checkpoint is stored in Redis, allowing any Worker to resume
- **Worker Heartbeat**: Each Worker independently registers with Redis, sends heartbeats, and competes for tasks

## 5. Stop & Clean Up

```bash
docker compose -f docker-compose.full.yml down      # Stop containers
docker compose -f docker-compose.full.yml down -v   # Also delete data volumes
```

## Next Steps

- [Getting Started](/docs/en/getting-started/) — Back to overview
- [Build from Source](/docs/en/deployment/source-build/) — Local development debugging
- [Configuration Reference](/docs/en/getting-started/#configuration-reference) — Full configuration options
