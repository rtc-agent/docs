---
title: Getting Started
description: Deploy RTC Agent Server and embed the frontend component in 5 minutes — run the full pipeline end to end.
---

Getting RTC Agent up and running takes two steps: **deploy the Server** → **embed the frontend component**.

## Choose a Deployment

| Deployment | Use Case | Dependencies |
| --- | --- | --- |
| **Docker Deployment** (recommended) | Quick demo, full deployment | Docker |
| [Build from Source](/docs/en/deployment/source-build/) | Local development & debugging | Go 1.27, PostgreSQL, Redis |
| [Docker Distributed Cluster](/docs/en/deployment/distributed-deploy/) | Multi-Worker testing, production validation | Docker |

## Prerequisites

- **Docker** — Docker Desktop or equivalent recommended
- **LLM API Key** — Claude or OpenAI-compatible API key

> For source builds, you also need Go 1.27+, PostgreSQL 17+ (with pgvector), and Redis 7+. See the [Source Build Guide](/docs/en/deployment/source-build/).
>
> Docker Compose includes a `mock-oauth2` service container, but `providers.mock.enabled` defaults to `false` in the config. To try Mock login, edit `etc/config.docker.yaml` and set `mock.enabled` to `true`, and change `url` to `http://mock-oauth2:10060` (the internal Docker service name). Production environments require your own OAuth2 service — see [Authentication](/docs/en/integration/auth/#developer-integration-guide) for details.

## Step 1: Deploy the Server

### 1. Clone & Prepare Configuration

```bash
git clone https://github.com/rtc-agent/server.git
cd server
```

Edit `etc/config.docker.yaml` and verify the following configuration:

```yaml
database:
  dsn: "postgres://rtc_agent:rtc_agent@postgres:5432/rtc_agent?sslmode=disable"
  auto_migrate: true

redis:
  addr: "redis:6379"

llm:
  provider: "claude"           # or "openai"
  # api_key configured via LLM__API_KEY environment variable, not in YAML
  model: "claude-sonnet-4-20250514"  # Example: using Claude model; actual default may differ (e.g., qwen3.7-plus)
```

Configure LLM API Key (via environment variable):

```bash
# Copy .env template
cp .env.example .env

# Edit .env and fill in your API Key
echo "LLM__API_KEY=your-api-key-here" >> .env
```

> 💡 **Environment variable naming**: Uppercase letters + double underscore `__` to separate hierarchy levels, matching YAML config structure. For example, `llm.api_key` → `LLM__API_KEY`.
>
> ⚠️ **Sensitive field handling**: If a field (like `api_key`) is explicitly written in the YAML config file, environment variables **will not override** it. Therefore, sensitive fields should not be written in plaintext in YAML; instead, configure them via environment variables.

### 2. Start

```bash
docker compose up -d
```

Compose will automatically:

1. Start PostgreSQL and Redis
2. Run database migration (init container)
3. Start 2 Server containers + Nginx load balancing + observability stack

### 3. Verify

```bash
# Access via Nginx load balancer entry point
curl http://localhost:28080/healthz
# {"status":"ok"}
```

## Step 2: Embed the Frontend Component

With the Server running, add the `<rtc-agent>` component to your web page to get an AI assistant:

```html
<!-- Import the component -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@rtc-agent/component@0.2.3/dist/index.js"></script>

<!-- Minimal setup -->
<rtc-agent></rtc-agent>
```

Customize theme and title:

```html
<rtc-agent theme="dark" app-label="My AI Assistant"></rtc-agent>
```

The component automatically connects to the Server on the current page's domain (defaults to `localhost:28080`).

> Full attribute, event, and CSS variable reference: [Web Component API](/docs/en/integration/component-api/).

## Other Deployment Options

### Build from Source

For scenarios where you need to develop and debug on the Server side. Requires Go 1.27+.

→ See [Source Build Guide](/docs/en/deployment/source-build/)

### Docker Distributed Cluster

Uses the same `docker-compose.yml` as the Docker deployment above, with additional guidance on distributed behavior validation (Session Affinity, RTC Checkpoint) and restart recovery mechanisms.

→ See [Distributed Cluster Deployment](/docs/en/deployment/distributed-deploy/)

## Configuration Reference

For the full configuration options, see [etc/config.docker.yaml](https://github.com/rtc-agent/server/blob/main/etc/config.docker.yaml).

### Required Configuration

| Config | Description | Required |
| --- | --- | --- |
| `database.dsn` | PostgreSQL connection string | ✅ |
| `redis.addr` | Redis address | ✅ |
| `auth.jwt_secret` | JWT signing key (use a strong random value in production) | ✅ |
| `llm.provider` | Model provider: `claude` or `openai` | ✅ |
| `llm.api_key` | LLM API key | ✅ |
| `llm.model` | Model name | ✅ |

### Optional Configuration

| Config | Description | Default |
| --- | --- | --- |
| `tracing.enabled` | Enable OpenTelemetry tracing | `false` |
| `log.level` | Log level: `debug` / `info` / `warn` / `error` | `info` |
| `log.server_log_file` | Server log file path (JSON format, for promtail collection). Leave empty to disable file logging. Logs use lumberjack auto-rotation (100MB/file, retain 3, 7 days, gzip compression) | empty |
| `worker.cache_hit_rate_warn_threshold` | Cache hit rate warning threshold (0.0-1.0). A warn log is emitted when the session's cumulative cache hit rate drops below this value. Negative values disable the warning | `0.88` |
| `llm.retry_max_attempts` | Maximum retry attempts on model call failure. 0 means no retry | `0` |
| `llm.retry_base_delay` | Base delay for retry backoff (exponential: `base_delay * 2^(attempt-1)`) | `1s` |

### Model Pricing Configuration

The `llm.pricing` section allows customizing model costs so the system can calculate per-invocation cost (`total_cost_usd`). All prices are in **USD per million tokens**. Defaults to Claude 3.5 Sonnet pricing when not configured.

```yaml
llm:
  pricing:
    input_per_million: 3.0        # Normal input token price
    output_per_million: 15.0      # Output token price
    cached_read_per_million: 0.3  # Cache read (cache hit) price, typically 10% of input
    cached_write_per_million: 3.75 # Cache write (cache creation) price, typically 125% of input
    reasoning_per_million: 0.0    # Reasoning (thinking) token price
```

| Field | Description | Default (Claude 3.5 Sonnet) |
| --- | --- | --- |
| `input_per_million` | Normal input token price (USD/million tokens) | `3.0` |
| `output_per_million` | Output token price (USD/million tokens) | `15.0` |
| `cached_read_per_million` | Cache read (cache hit) price (USD/million tokens) | `0.3` |
| `cached_write_per_million` | Cache write (cache creation) price (USD/million tokens) | `3.75` |
| `reasoning_per_million` | Reasoning (thinking) token price (USD/million tokens) | `0.0` |

> 💡 When using a different model, refer to your model provider's pricing page and set `llm.pricing` accordingly. Cost calculation accumulates after each LLM call into the Session's `total_cost_usd` field, which is pushed to the frontend via `session.updated` events.
>
> 🔐 **Production security**: Before deploying to production, ensure HTTPS is enabled, configure a proper OAuth2 provider (not Mock), use a strong random `jwt_secret`, and set CORS allowlists.

## Troubleshooting

**`curl healthz` not responding?**

- Docker deployment: Check container status with `docker compose ps`, confirm all containers are `healthy`
- Check Server logs: `docker compose logs server-1 server-2`
- Confirm port 28080 is not in use: `lsof -i :28080`

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
