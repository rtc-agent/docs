---
title: Getting Started
description: Deploy RTC Agent Server and embed the frontend component in 5 minutes — run the full pipeline end to end.
---

Getting RTC Agent up and running takes two steps: **deploy the Server** → **embed the frontend component**.

## Choose a Deployment

| Deployment | Use Case | Dependencies |
| --- | --- | --- |
| **Docker Single Instance** (recommended) | Quick demo, small-scale deployment | Docker |
| [Build from Source](/docs/en/deployment/source-build/) | Local development & debugging | Go 1.27, PostgreSQL, Redis |
| [Docker Distributed Cluster](/docs/en/deployment/distributed-deploy/) | Multi-Worker testing, production validation | Docker |

## Prerequisites

- **Docker** — Docker Desktop or equivalent recommended
- **LLM API Key** — Claude or OpenAI-compatible API key

> For source builds, you also need Go 1.27+, PostgreSQL 17+ (with pgvector), and Redis 7+. See the [Source Build Guide](/docs/en/deployment/source-build/).
>
> Docker deployments include a built-in `mock-oauth2` as a sample auth service for quick demos. Production environments require your own OAuth2 service — see [Authentication](/docs/en/integration/auth/#developer-integration-guide) for details.

## Step 1: Deploy the Server

### 1. Clone & Prepare Configuration

```bash
git clone https://github.com/rtc-agent/server.git
cd server
cp etc/config.example.yaml etc/config.docker.yaml
```

Edit `etc/config.docker.yaml` and fill in your LLM API Key:

```yaml
database:
  dsn: "postgres://rtc_agent:rtc_agent@postgres:5432/rtc_agent?sslmode=disable"
  auto_migrate: true

redis:
  addr: "redis:6379"

llm:
  provider: "claude"           # or "openai"
  api_key: "your-api-key"      # ← Replace with your actual API Key
  model: "claude-sonnet-4-20250514"
```

> **Docker config loading**: Compose mounts `etc/config.docker.yaml` directly as `/app/etc/config.yaml` inside the container, so this file must be a **complete configuration** (copy from `config.example.yaml` and modify).

### 2. Start

```bash
docker compose up -d
```

Compose will automatically:

1. Start PostgreSQL and Redis
2. Run database migration (init container)
3. Start the Server container (port 8888)

### 3. Verify

```bash
curl http://localhost:8888/healthz
# {"status":"ok"}
```

## Step 2: Embed the Frontend Component

With the Server running, add the `<rtc-agent>` component to your web page to get an AI assistant:

```html
<!-- Import the component -->
<script type="module" src="https://cdn.example.com/rtc-agent/index.js"></script>

<!-- Minimal setup -->
<rtc-agent></rtc-agent>
```

Customize theme and title:

```html
<rtc-agent theme="dark" app-label="My AI Assistant"></rtc-agent>
```

The component automatically connects to the Server on the current page's domain (defaults to `localhost:8888`).

> Full attribute, event, and CSS variable reference: [Web Component API](/docs/en/integration/component-api/).

## Other Deployment Options

### Build from Source

For scenarios where you need to develop and debug on the Server side. Requires Go 1.27+.

→ See [Source Build Guide](/docs/en/deployment/source-build/)

### Docker Distributed Cluster

2 Server containers + Nginx load balancing + full observability stack (Jaeger, Prometheus, Grafana) for validating multi-Worker distributed capabilities.

→ See [Distributed Cluster Deployment](/docs/en/deployment/distributed-deploy/)

## Configuration Reference

For the full configuration options, see [etc/config.example.yaml](https://github.com/rtc-agent/server/blob/main/etc/config.example.yaml).

| Config | Description | Required |
| --- | --- | --- |
| `database.dsn` | PostgreSQL connection string | ✅ |
| `redis.addr` | Redis address | ✅ |
| `auth.jwt_secret` | JWT signing key (use a strong random value in production) | ✅ |
| `llm.provider` | Model provider: `claude` or `openai` | ✅ |
| `llm.api_key` | LLM API key | ✅ |
| `llm.model` | Model name | ✅ |
| `tracing.enabled` | Enable OpenTelemetry tracing | Optional |
| `embedding.enabled` | Enable vector retrieval (User Memory) | Optional |

> 🔐 **Production security**: Before deploying to production, ensure HTTPS is enabled, configure a proper OAuth2 provider (not Mock), use a strong random `jwt_secret`, and set CORS allowlists.

## Troubleshooting

**`curl healthz` not responding?**

- Docker deployment: Check container status with `docker compose ps`, confirm all containers are `healthy`
- Check Server logs: `docker compose logs server`
- Confirm port 8888 is not in use: `lsof -i :8888`

**LLM call errors?**

- Check that `api_key` is correctly filled in (no extra spaces in YAML)
- Confirm `model` name matches your API plan (e.g., `claude-sonnet-4-20250514` requires a valid Claude API subscription)
- If using OpenAI, confirm `provider` is set to `"openai"` and `api_key` is an OpenAI key

**PostgreSQL connection failed?**

- In Docker deployment, the `dsn` hostname should be `postgres` (Docker service name), not `localhost`
- Confirm the PostgreSQL container is running: `docker compose ps postgres`

**Frontend component cannot connect to Server?**

- Confirm the Server and web page are on the same domain, or CORS is configured
- Open browser DevTools and check Console and Network panels for errors

## Next Steps

- [Embed Frontend Component](/docs/en/integration/component-api/) — Learn all `<rtc-agent>` attributes and events
- [Register Functions](/docs/en/integration/function-registration/) — Turn your website APIs into AI-callable tools
- [Work Modes](/docs/en/concepts/work-modes/) — Understand the five permission modes for AI operations
- [Author Scenarios](/docs/en/integration/scenario-authoring/) — Provide business context to the AI
