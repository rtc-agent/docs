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

Use the development Docker Compose to start PostgreSQL, Redis, etc.:

```bash
# Start dev dependencies (PostgreSQL:15432, Redis:16379, Jaeger, Mock OAuth2, etc.)
go run main.go dev dependencies start
```

Or start Docker manually:

```bash
docker compose -f etc/dev/docker-compose.yml up -d
```

## 3. Configuration

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

> **Config merging**: On startup, the Server automatically loads `etc/config.yaml` (baseline) + `etc/config.local.yaml` (overrides). `config.local.yaml` is already in `.gitignore` and will not be committed. Only write the diff items.

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
