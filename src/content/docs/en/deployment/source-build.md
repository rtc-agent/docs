---
title: Build from Source
description: Build RTC Agent Server from source — ideal for local development and debugging.
---

Building from source is ideal for scenarios where you need to develop and debug on the Server side.

## Prerequisites

- **Go 1.27+**
- **PostgreSQL 17+** (with pgvector extension) — recommend using the `pgvector/pgvector:pg17` image
- **Redis 7+**
- **LLM API** — Claude or OpenAI-compatible interface

## 1. Clone the Repository

```bash
git clone https://github.com/rtc-agent/server.git
cd server
```

## 2. Start Infrastructure

Use the root `docker-compose.yml` to start PostgreSQL, Redis, and other dependencies:

```bash
# Start only the infrastructure needed for development (PostgreSQL:25432, Redis:26379, etc.)
docker compose up -d postgres redis
```

## 3. Configuration

Copy the config template and edit:

```bash
cp etc/config.docker.yaml etc/config.local.yaml
```

Edit `etc/config.local.yaml`, modifying at least the following fields:

```yaml
database:
  dsn: "postgres://rtc_agent:rtc_agent@localhost:25432/rtc_agent?sslmode=disable"

redis:
  addr: "localhost:26379"

llm:
  provider: "claude"           # or "openai"
  # api_key configured via LLM__API_KEY environment variable, not in YAML
  model: "claude-sonnet-4-20250514"  # Example: using Claude model; actual default may differ (e.g., qwen3.7-plus)
```

Configure LLM API Key (via environment variable):

```bash
# Set environment variable (local Go runtime does not auto-read .env files)
export LLM__API_KEY=your-api-key-here
```

> 💡 You can also copy `.env.example` to `.env`, then `source .env` and `export` the needed variables. In Docker deployments, docker-compose reads `.env` automatically (via `env_file`), but local Go runtime requires manual export.
>
> 💡 **Environment variable naming**: Uppercase letters + double underscore `__` to separate hierarchy levels, matching YAML config structure. For example, `llm.api_key` → `LLM__API_KEY`. This mapping is implemented by Viper's `SetEnvKeyReplacer(".", "__")`.
>
> ⚠️ **Sensitive field handling**: If a field (like `api_key`) is explicitly written in the YAML config file, environment variables **will not override** it. Therefore, sensitive fields should not be written in plaintext in YAML; instead, configure them via environment variables.

## 4. Build & Run

```bash
# Build
go build -o bin/rtc-agent .

# Database migration (first deployment)
./bin/rtc-agent migrate

# Start the service
./bin/rtc-agent serve
```

The service starts at `http://localhost:8888`.

## 5. Verify

```bash
curl http://localhost:8888/healthz
# {"status":"ok"}
```

## 6. Embed Frontend

After the Server is running, add the `<rtc-agent>` component to your web page:

```html
<script type="module" src="https://cdn.example.com/rtc-agent/index.js"></script>
<rtc-agent></rtc-agent>
```

See [Web Component API](/docs/en/integration/component-api/) for details.

## Next Steps

- [Getting Started](/docs/en/getting-started/) — Back to overview
- [Distributed Cluster Deployment](/docs/en/deployment/distributed-deploy/) — Multi-Worker deployment
- [Configuration Reference](/docs/en/getting-started/#configuration-reference) — Full configuration options
