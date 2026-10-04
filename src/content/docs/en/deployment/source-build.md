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
cp etc/config.yaml.example etc/config.local.yaml
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
> ⚠️ **Sensitive field handling**: Sensitive fields (like `api_key`, `password`) should not be written in plaintext in YAML; instead, configure them via environment variables. Environment variables have higher priority than config files and can safely override YAML values.

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

## 6. Start Admin-server (Optional)

Admin-server is an independent management service that uses the same binary as the main server. It provides admin login, user management, and other features, integrating with the main server via RFC 8693 Token Exchange.

### Configuration

Copy the admin config template and edit:

```bash
cp etc/admin.yaml etc/admin.local.yaml
```

Edit `etc/admin.local.yaml`, modifying at least the following fields:

```yaml
server:
  host: "0.0.0.0"
  port: 8081
  env: "development"  # Set to "production" in production deployments

database:
  dsn: "postgres://rtc_agent:rtc_agent@localhost:25432/rtc_agent?sslmode=disable"

# Redis config (optional in development; required for production multi-instance deployments — JWKS caching and rate limiting)
# redis:
#   addr: "localhost:6379"

cors:
  allowed_origins: ["http://localhost:23001"]  # Admin dashboard URL; explicitly specify in production

jwt:
  algorithm: "RS256"
  issuer: "http://localhost:8081"
  audience: "http://localhost:8888"
  private_key_path: "./etc/keys/admin-private.pem"
  public_key_path: "./etc/keys/admin-public.pem"
  access_token_ttl: 3600      # 1 hour
  refresh_token_ttl: 604800   # 7 days
```

### Generate JWT Key Pair

Admin-server uses asymmetric keys to sign JWTs. On first startup, if the key files at the configured paths do not exist, admin-server automatically generates a key pair and saves it to disk (persists across restarts). You can also generate keys manually:

```bash
# Manually generate key pair (ES256 recommended)
./bin/rtc-agent admin keygen --algorithm ES256

# Or RSA
./bin/rtc-agent admin keygen --algorithm RS256

# Or EdDSA (Ed25519)
./bin/rtc-agent admin keygen --algorithm EdDSA

# Force overwrite existing keys
./bin/rtc-agent admin keygen --force
```

Keys are stored in the `etc/keys/` directory by default (already excluded from `.gitignore` as `*.pem`).

> 💡 In Docker deployments, `docker-entrypoint.sh` automatically generates persistent keys in a named volume — no manual operation needed.

### Create Admin Account

```bash
./bin/rtc-agent admin account create \
  --email admin@example.com \
  --password your-password \
  --name "Admin"
```

### Start the Service

```bash
# Start admin-server (default port 8081)
./bin/rtc-agent admin serve --config etc/admin.local.yaml
```

> 💡 Admin-server must connect to the same PostgreSQL database as the main server. The main server needs `token_exchange.external_issuers` configured in `config.yaml` to trust JWTs issued by admin-server. See [HTTP API - Admin-server Authentication](/docs/en/protocol/http-api/#admin-server-authentication).

## 7. Embed Frontend

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
