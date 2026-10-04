---
title: Docker Distributed Cluster
description: 2 Servers + Admin-server + Nginx load balancing + full observability stack — validate multi-Worker distributed deployment.
---

The distributed cluster deployment validates RTC Agent's multi-Worker capabilities — 2 Server containers + Admin-server management service + Nginx load balancing + full observability stack (Jaeger, Prometheus, Grafana, Loki, etc.).

## Architecture

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        Client1[Browser / Web Component]
        AdminBrowser[Admin Browser]
    end

    subgraph Access["Access Layer"]
        Nginx[Nginx :28080]
    end

    subgraph App["Application Layer"]
        Server1[Server-1 :8888]
        Server2[Server-2 :8888]
        AdminSvr[Admin-server :8081]
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
    AdminBrowser -->|"Admin Login"| AdminSvr
    AdminSvr -.->|"RFC 8693<br/>JWKS Verify"| Server1
    AdminSvr -.->|"RFC 8693<br/>JWKS Verify"| Server2
    Server1 --> PostgreSQL
    Server1 --> Redis
    Server2 --> PostgreSQL
    Server2 --> Redis
    AdminSvr --> PostgreSQL
    AdminSvr --> Redis
    Server1 -.-> Jaeger
    Server2 -.-> Jaeger
    AdminSvr -.-> Jaeger
    Server1 -.-> Prometheus
    Server2 -.-> Prometheus
    AdminSvr -.-> Prometheus
    Grafana --> Prometheus
    Grafana --> Loki
```

## Port Assignments

| Service | Port | Description |
| --- | --- | --- |
| Nginx | 28080 | Load balancer entry point |
| Server 1 & 2 | Internal 8888 | Not directly exposed |
| Admin-server | 28081 | Admin panel (:28081 → :8081) |
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

> **Port design**: All ports use the 2xxxx range to avoid conflicts with commonly used local service ports.

## 1. Prepare Configuration

### Environment Variables

Copy the `.env.example` template and fill in your actual values:

```bash
cp .env.example .env
```

Edit `.env` and fill in your LLM API Key:

```bash
LLM__API_KEY=your-api-key-here
```

> 💡 **Environment variable naming**: Uppercase letters + double underscore `__` to separate hierarchy levels, matching YAML config structure. For example, `llm.api_key` → `LLM__API_KEY`, `database.dsn` → `DATABASE__DSN`. This mapping is implemented by Viper's `SetEnvKeyReplacer(".", "__")`.

**Configuration priority** (from highest to lowest):

| Priority | Source | Description |
|:--------:|--------|-------------|
| 1 | Config file | `etc/config.yaml` or the file specified by `--config` |
| 2 | Environment variables | e.g., `LLM__API_KEY` |
| 3 | Defaults | Values set by `SetDefault` in code |

> ⚠️ **Sensitive field handling**: If a field (like `api_key`) is explicitly written in the YAML config file, environment variables **will not override** it. Therefore, sensitive fields should not be written in plaintext in YAML; instead, configure them via environment variables.

### YAML Configuration

Edit `etc/config.docker.yaml` (docker-compose.yml mounts this file automatically):

```yaml
database:
  dsn: "postgres://rtc_agent:rtc_agent@postgres:5432/rtc_agent?sslmode=disable"

redis:
  addr: "redis:6379"

tracing:
  enabled: true
  endpoint: "jaeger:4317"
  sample_rate: 1.0

# Token Exchange: Trust JWTs issued by admin-server (RFC 8693)
token_exchange:
  external_issuers:
    - name: "admin-server"
      issuer: "http://admin-server:8081"
      jwks_uri: "http://admin-server:8081/.well-known/jwks.json"
      allowed_algorithms: ["RS256", "ES256"]
      cache_ttl: 3600
      claims_mapping:
        sub: "sub"
        email: "email"
        name: "name"
        avatar_url: "picture"

providers:
  mock:
    enabled: true
    url: "http://mock-oauth2:10060"

llm:
  provider: "claude"
  # api_key configured via LLM__API_KEY environment variable, not in YAML
  model: "claude-sonnet-4-20250514"
```

> ⚠️ **OAuth2 service address**: `providers.mock.url` points to the OAuth2 authorization service. The example `192.168.31.60:20060` is a public IP example from the dev environment. Developers need to deploy their own OAuth2 service (compatible with the mock-oauth2 protocol) and replace this with the actual service address. See [Authentication](/docs/en/integration/auth/) for details.
>
> 💡 **Token Exchange**: After configuring `token_exchange`, the Main Server can verify JWTs issued by admin-server via the JWKS endpoint, enabling unified administrator authentication. Admin-server uses its own `etc/admin.docker.yaml` configuration file. See [HTTP API - Admin-server](/docs/en/protocol/http-api/#admin-server-authentication).

## 2. Start

```bash
docker compose up -d
```

Startup order: PostgreSQL/Redis → migrate (one-time container) → Server-1 & Server-2 & Admin-server → Nginx

Admin-server automatically generates a JWT key pair (RS256) on first startup, stored in the `full-admin-server-keys` Docker volume. To manually create an administrator account:

```bash
# Create administrator user
docker compose exec admin-server ./rtc-agent admin account create \
  --email admin@example.com \
  --password your-password \
  --name "Admin"
```

Access the admin panel: `http://localhost:28081`

## 3. Verify

```bash
# Health check (via Nginx load balancing)
curl http://localhost:28080/healthz
# {"status":"ok"}

# Check container status — all containers should be healthy/running
docker compose ps

# Jaeger trace dashboard
open http://localhost:26686

# Grafana observability dashboards
open http://localhost:23001

# Prometheus metrics endpoint
curl http://localhost:28080/metrics
```

> 💡 The distributed deployment includes 8 preconfigured Grafana dashboards and 30+ alert rules covering the full stack: database, queue, WebSocket, authentication, circuit breaker, object storage, and more. See [Monitoring & Observability](/docs/en/operations/monitoring/) for details.

## 4. Validate Distributed Behavior

Both Servers share the same PostgreSQL and Redis. When user requests are distributed across different Servers via Nginx:

- **Session Affinity**: Implemented via Redis distributed lock (`SET NX`), ensuring only one Worker processes a given Session's work at any time
- **RTC Checkpoint**: When the Agent executes a remote tool call, the checkpoint is stored in Redis, allowing any Worker to resume
- **Worker Heartbeat**: Each Worker independently registers with Redis, sends heartbeats, and competes for tasks

## 5. Stop & Clean Up

```bash
docker compose down      # Stop containers
docker compose down -v   # Also delete data volumes
```

## 6. Restart Recovery

The Server automatically performs **stale turns recovery** on startup, ensuring that work interrupted by crashes or restarts can continue.

### Recovery Flow

```mermaid
flowchart TD
    A["🔄 Server Startup"] --> B["Scan stale turns"]
    B --> C{"Found stale turns?"}
    C -->|"❌ None"| D["Normal startup"]
    C -->|"✅ Yes"| E["Mark as interrupted"]
    E --> F["Requeue ghost work"]
    F --> G["Publish resume work items"]
    G --> H["Release stale session locks"]
    H --> I["Workers resume processing"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style E fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style I fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

### Key Concepts

| Concept | Description |
| --- | --- |
| **Stale Turn** | A Turn in a non-terminal state (`running` / `pending` / `interrupted`), left over from a previous crash or restart |
| **Ghost Work** | A work item in `processing` state whose session lock has expired (left over from a Worker crash) |
| **recoverStaleTurns** | The recovery entry point at Server startup, scans and processes all stale turns |
| **RequeueGhostWork** | Places ghost work items back into the queue for Workers to reclaim |

### Recovery Behavior

1. **Find stale turns**: Scans the database for all Turns in `running`, `pending`, or `interrupted` state
2. **Mark interrupted**: Marks `running` / `pending` Turns as `interrupted`
3. **Requeue ghost work**: Batch checks and requeues work items left behind by crashes
4. **Publish resume**: Publishes a resume work item for each stale Turn, triggering Worker recovery
5. **Release session locks**: Cleans up expired session distributed locks, allowing Workers to compete again

> 💡 The recovery process is transparent to frontend users. Interrupted Turns notify the frontend of the `interrupted` state via `turn.updated` events, then automatically resume processing. RTC Checkpoints also play a role here — Turns waiting for frontend tool results can recover from Redis Checkpoints without requiring user re-action.

## Next Steps

- [Getting Started](/docs/en/getting-started/) — Back to overview
- [Build from Source](/docs/en/deployment/source-build/) — Local development debugging
- [Configuration Reference](/docs/en/getting-started/#configuration-reference) — Full configuration options
