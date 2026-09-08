---
title: Getting Started
description: Deploy RTC Agent Server — build from source, Docker single instance, or Docker distributed cluster
---

RTC Agent Server offers three deployment options, chosen by scenario:

| Deployment | Use Case | Dependencies |
|---------|---------|------|
| [Build from Source](#build-from-source) | Local development & debugging | Go 1.27, PostgreSQL, Redis |
| [Docker Single Instance](#docker-single-instance) | Quick demo, small-scale deployment | Docker |
| [Docker Distributed](#docker-distributed-cluster) | Production validation, multi-Worker testing | Docker |

## Prerequisites

All deployment methods require the following infrastructure:

- **PostgreSQL 17+** (with pgvector extension) — recommend using the `pgvector/pgvector:pg17` image
- **Redis 7+** — used for message queues, caching, and Worker coordination
- **LLM API** — Claude or OpenAI-compatible interface

## Build from Source

### 1. Clone the Repository

```bash
git clone https://github.com/rtc-agent/server.git
cd server
```

### 2. Start Infrastructure

Use the development Docker Compose to start PostgreSQL, Redis, etc.:

```bash
# Start dev dependencies (PostgreSQL:15432, Redis:16379, Jaeger, Mock OAuth2, etc.)
go run main.go dev dependencies start
```

Or start Docker manually:

```bash
docker compose -f etc/dev/docker-compose.yml up -d
```

### 3. Configuration

Copy the config template and edit:

```bash
cp etc/config.example.yaml etc/config.local.yaml
```

Edit `etc/config.local.yaml`, modifying at least the following fields:

```yaml
database:
  dsn: "postgres://rtc_agent:rtc_agent@localhost:15432/rtc_agent?sslmode=disable"

redis:
  addr: "localhost:16379"

llm:
  provider: "claude"           # or "openai"
  api_key: "your-api-key"      # Replace with your actual API Key
  model: "claude-sonnet-4-20250514"
```

> **Config merging**: On startup, the Server automatically loads `etc/config.yaml` (baseline) + `etc/config.local.yaml` (overrides).
> `config.local.yaml` is already in `.gitignore` and will not be committed. Only write the diff items.

### 4. Build & Run

```bash
# Build
go build -o bin/rtc-agent .

# Database migration (first deployment)
./bin/rtc-agent migrate

# Start the service
./bin/rtc-agent serve
```

The service starts at `http://localhost:8888`.

### 5. Verify

```bash
curl http://localhost:8888/healthz
# {"status":"ok"}
```

## Docker Single Instance

The simplest Docker deployment — one Server container + PostgreSQL + Redis.

### 1. Prepare Configuration

```bash
cp etc/config.example.yaml etc/config.docker.yaml
```

Edit `etc/config.docker.yaml`, changing connection addresses to Docker service names:

```yaml
database:
  dsn: "postgres://rtc_agent:rtc_agent@postgres:5432/rtc_agent?sslmode=disable"
  auto_migrate: true

redis:
  addr: "redis:6379"

llm:
  provider: "claude"
  api_key: "your-api-key"
  model: "claude-sonnet-4-20250514"
```

### 2. Start

```bash
docker compose up -d
```

Compose will automatically:
1. Start PostgreSQL and Redis (ports 15432 / 16379)
2. Run database migration (init container)
3. Start the Server container (port 8888)

### 3. Verify

```bash
curl http://localhost:8888/healthz
# {"status":"ok"}
```

### 4. Stop & Clean Up

```bash
docker compose down            # Stop containers
docker compose down -v         # Also delete data volumes
```

## Docker Distributed Cluster

Validates multi-Worker distributed deployment — 2 Server containers + Nginx load balancing + full observability stack.

### Architecture

```mermaid
flowchart TB
    subgraph "Client Layer"
        Client[Browser / Web Component]
    end

    subgraph "Access Layer"
        Nginx[Nginx<br/>:28080<br/>Load Balancer]
    end

    subgraph "Application Layer"
        Server1[Server-1<br/>:8888]
        Server2[Server-2<br/>:8888]
    end

    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL<br/>:25432<br/>pgvector)]
        Redis[(Redis<br/>:26379<br/>Queue/Cache)]
    end

    subgraph "Observability Stack"
        Jaeger[Jaeger<br/>UI:26686<br/>OTLP:24317]
        Prometheus[Prometheus<br/>:29090]
        Grafana[Grafana<br/>:23001]
        Loki[Loki<br/>:23100]
        Promtail[Promtail]
        Pyroscope[Pyroscope<br/>:24040]
        Alertmanager[Alertmanager<br/>:29093]
    end

    subgraph "Auth Service"
        OAuth2[Mock OAuth2<br/>:20060]
    end

    Client --> Nginx
    Nginx --> Server1
    Nginx --> Server2

    Server1 --> PostgreSQL
    Server1 --> Redis
    Server2 --> PostgreSQL
    Server2 --> Redis

    Server1 -.->|traces| Jaeger
    Server2 -.->|traces| Jaeger

    Server1 -.->|metrics| Prometheus
    Server2 -.->|metrics| Prometheus

    Promtail -.->|logs| Loki
    Grafana --> Prometheus
    Grafana --> Loki
    Grafana --> Pyroscope
    Prometheus -.->|alerts| Alertmanager

    Server1 -.->|auth| OAuth2
    Server2 -.->|auth| OAuth2

    style Client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style Nginx fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style Server1 fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style Server2 fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style PostgreSQL fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    style Redis fill:#ffebee,stroke:#b71c1c,stroke-width:2px
    style Jaeger fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style Prometheus fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style Grafana fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style Loki fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style Promtail fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style Pyroscope fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style Alertmanager fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style OAuth2 fill:#fce4ec,stroke:#880e4f,stroke-width:2px
```

### Port Assignments

| Service | Port | Description |
|------|------|------|
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

### 1. Prepare Configuration

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
  api_key: "your-api-key"
  model: "claude-sonnet-4-20250514"
```

### 2. Start

```bash
docker compose -f docker-compose.full.yml up -d
```

Startup order: PostgreSQL/Redis → migrate (one-time container) → Server-1 & Server-2 → Nginx

### 3. Verify

```bash
# Health check (via Nginx load balancing)
curl http://localhost:28080/healthz
# {"status":"ok"}

# Check container status — all containers should be healthy/running
docker compose -f docker-compose.full.yml ps

# Jaeger trace dashboard
open http://localhost:26686
```

### 4. Distributed Validation

Both Servers share the same PostgreSQL and Redis. When user requests are distributed across different Servers via Nginx:

- **Session Affinity**: Implemented via Redis distributed lock (`SET NX`), ensuring only one Worker processes a given Session's work at any time
- **RTC Checkpoint**: When the Agent executes a remote tool call, the checkpoint is stored in Redis, allowing any Worker to resume
- **Worker Heartbeat**: Each Worker independently registers with Redis, sends heartbeats, and competes for tasks

## Configuration Reference

For the full configuration options, see [etc/config.example.yaml](https://github.com/rtc-agent/server/blob/main/etc/config.example.yaml).

Key configuration items:

| Config | Description | Required |
|------|------|------|
| `database.dsn` | PostgreSQL connection string | ✅ |
| `redis.addr` | Redis address | ✅ |
| `auth.jwt_secret` | JWT signing key (use a strong random value in production) | ✅ |
| `llm.provider` | Model provider: `claude` or `openai` | ✅ |
| `llm.api_key` | LLM API key | ✅ |
| `llm.model` | Model name | ✅ |
| `tracing.enabled` | Enable OpenTelemetry tracing | Optional |
| `embedding.enabled` | Enable vector retrieval (User Memory) | Optional |

## Next Steps

- [What is RTC Agent](/docs/en/introduction/) — Learn about core concepts and architecture
- [Protocol Reference](/docs/en/protocol/) — HTTP API and WebSocket RPC documentation (coming soon)
