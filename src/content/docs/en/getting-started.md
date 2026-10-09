---
title: Getting Started
description: Get RTC Agent Server running from scratch in 5 minutes.
---

From zero to running RTC Agent takes five steps. Whether you want a **quick try** or **production integration**, start here.

> 💡 **What is RTC Agent?** An AI assistant backend that lets AI call tools defined in your frontend via Remote Tool Calling protocol. Architecture overview:
> - **Server** (what this tutorial starts): Receives user messages, calls LLM, coordinates tool execution
> - **Frontend component**: Embeds in your web page, provides AI chat UI, registers and executes tools
> - **SharedWorker**: Background browser process, shares one WebSocket connection across tabs to avoid re-authentication

## Prerequisites

- **Docker** — Docker Desktop or equivalent
- **LLM API Key** — Claude or OpenAI-compatible API key

## Step 1: Get the Code

```bash
git clone https://github.com/rtc-agent/server.git
cd server
```

## Step 2: Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your LLM API Key:

```bash
# ========== Required ==========
LLM__API_KEY=sk-ant-xxx...

# ========== Optional: Only needed for Quick Try (see /en/quick-start/) ==========
# PROVIDERS__GITHUB__ENABLED=true
# PROVIDERS__GITHUB__CLIENT_ID=your-client-id
# PROVIDERS__GITHUB__CLIENT_SECRET=your-client-secret
```

> 💡 **Environment variable naming**: Uppercase + double underscore `__` separates hierarchy levels, matching YAML config. Example: `llm.api_key` → `LLM__API_KEY`. If you're doing production integration (Token Exchange), you don't need GitHub OAuth config.

## Step 3: Start the Server

```bash
docker compose up -d
```

Compose automatically starts:

| Service | Description |
| :--- | :--- |
| PostgreSQL + Redis | Data storage |
| Server (2 instances) | RTC Agent + Nginx load balancer |
| Admin Server | Admin dashboard |
| MinIO | Object storage (file uploads, auto-started no config needed) |
| Prometheus + Grafana | Monitoring |
| Jaeger | Distributed tracing |

> 💡 **Image source**: Docker Compose pulls official pre-built images from GitHub Container Registry (`ghcr.io`) by default — no local compilation needed.

### Docker Images

RTC Agent provides official pre-built images hosted on GitHub Container Registry:

| Image | Address | Versions |
| :--- | :--- | :--- |
| Server | `ghcr.io/rtc-agent/server` | [View versions](https://github.com/rtc-agent/server/pkgs/container/server) |
| MinIO | `ghcr.io/rtc-agent/minio` | [View versions](https://github.com/rtc-agent/minio/pkgs/container/minio) |

```bash
# Pull latest version
docker pull ghcr.io/rtc-agent/server:latest

# Pull specific version (recommended for production)
docker pull ghcr.io/rtc-agent/server:v1.0.0

# MinIO object storage image
docker pull ghcr.io/rtc-agent/minio:release.2025-10-15t17-29-55z
```

To pin a specific version in `docker-compose.yml`, change the `image` field:

```yaml
services:
  server:
    image: ghcr.io/rtc-agent/server:v1.0.0  # Replace latest with a specific version
```

## Step 4: Create Admin Account

The admin account is used to log in to the **Admin dashboard** (http://localhost:28081) for managing users and system status.

```bash
docker compose exec server rtc-agent admin account create \
  --email admin@example.com \
  --password your-password \  # At least 8 characters
  --role admin
```

> 💡 **Authentication systems**: RTC Agent has two auth systems:
> - **Admin dashboard**: Email + password or OTP login, for system management
> - **User-facing**: GitHub/Google OAuth2 login, for chatting with AI assistant
> 
> Admin accounts and regular users are separate — GitHub login users are regular users.

## Step 5: Verify

```bash
curl http://localhost:28080/healthz
# Should return: {"status":"ok"}
```

**Access URLs**:

| Service | URL |
| :--- | :--- |
| RTC Agent Server | http://localhost:28080 |
| Admin Dashboard | http://localhost:28081 |
| Grafana | http://localhost:3000 |
| Jaeger | http://localhost:16686 |

## Next Steps

Choose your scenario:

| Scenario | Description | Link |
| :--- | :--- | :--- |
| 🚀 **Quick Try** | Minimal changes, try AI assistant | [→ Quick Try](/en/quick-start/) |
| 🏗️ **Production Integration** | Integrate RTC Agent into your production app | [→ Integration Guide](/en/integration-guide/) |
| 📦 **Source Build** | Local development, requires Go 1.27+ | [→ Source Build](/en/deployment/source-build/) |
| 🌐 **Distributed Cluster** | Multi-Worker testing, production validation | [→ Distributed Cluster](/en/deployment/distributed-deploy/) |

## FAQ

**`curl healthz` not responding?**

- Check container status: `docker compose ps`, confirm all containers are `healthy`
- Check Server logs: `docker compose logs server-1`
- Confirm port 28080 is not in use: `lsof -i :28080`

**LLM call errors?**

- Check `LLM__API_KEY` in `.env` is correct
- Confirm API key has sufficient quota
- Check logs: `docker compose logs server-1 | grep -i error`

**PostgreSQL connection failed?**

- In Docker deployment, `dsn` hostname should be `postgres` (Docker service name), not `localhost`
- Confirm PostgreSQL container is running: `docker compose ps postgres`

**Frontend component cannot connect to Server?**

- Confirm Server and web page are on the same domain, or CORS is configured
- Open browser DevTools, check Console and Network panels for errors
- Check `server.url` configuration is correct
