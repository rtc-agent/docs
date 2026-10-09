---
title: 快速入门
description: 5 分钟从零启动 RTC Agent Server，跑通完整链路。
---

从零到跑通 RTC Agent 只需五步。无论你想**快速体验**还是**真实接入**，都从这里开始。

> 💡 **RTC Agent 是什么？** 一个 AI 助手后端，通过 Remote Tool Calling 协议让 AI 调用你前端定义的工具。整体架构：
> - **Server**（本教程启动的）：接收用户消息，调用 LLM，协调工具执行
> - **前端组件**：嵌入你的网页，提供 AI 对话 UI，注册并执行工具
> - **SharedWorker**：浏览器后台进程，多个标签页共享一个 WebSocket 连接，避免重复认证

## 前置条件

- **Docker** — 推荐 Docker Desktop 或等效环境
- **LLM API Key** — Claude 或 OpenAI 兼容接口的 API 密钥

## Step 1: 获取代码

```bash
git clone https://github.com/rtc-agent/server.git
cd server
```

## Step 2: 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，填入你的 LLM API Key：

```bash
# ========== 必填 ==========
LLM__API_KEY=sk-ant-xxx...

# ========== 可选：快速体验时需要（详见 /quick-start/） ==========
# PROVIDERS__GITHUB__ENABLED=true
# PROVIDERS__GITHUB__CLIENT_ID=your-client-id
# PROVIDERS__GITHUB__CLIENT_SECRET=your-client-secret
```

> 💡 **环境变量命名规则**：大写字母 + 双下划线 `__` 分隔层级，对应 YAML 配置的层级结构。例如 `llm.api_key` → `LLM__API_KEY`。如果你只做真实接入（Token Exchange），不需要配置 GitHub OAuth。

## Step 3: 启动 Server

```bash
docker compose up -d
```

Compose 会自动启动：

| 服务 | 说明 |
|------|------|
| PostgreSQL + Redis | 数据存储 |
| Server (2 实例) | RTC Agent 主服务 + Nginx 负载均衡 |
| Admin Server | 管理后台服务 |
| MinIO | 对象存储（文件上传等，自动启动无需配置） |
| Prometheus + Grafana | 监控 |
| Jaeger | 分布式追踪 |

> 💡 **镜像来源**：Docker Compose 默认从 GitHub Container Registry (`ghcr.io`) 拉取官方预构建镜像，无需本地编译。

### Docker 镜像

RTC Agent 提供官方预构建镜像，托管在 GitHub Container Registry：

| 镜像 | 地址 | 版本列表 |
| :--- | :--- | :--- |
| Server | `ghcr.io/rtc-agent/server` | [查看版本](https://github.com/rtc-agent/server/pkgs/container/server) |
| MinIO | `ghcr.io/rtc-agent/minio` | [查看版本](https://github.com/rtc-agent/minio/pkgs/container/minio) |

```bash
# 拉取最新版本
docker pull ghcr.io/rtc-agent/server:latest

# 拉取指定版本（推荐生产环境）
docker pull ghcr.io/rtc-agent/server:v1.0.0

# MinIO 对象存储镜像
docker pull ghcr.io/rtc-agent/minio:release.2025-10-15t17-29-55z
```

如需在 `docker-compose.yml` 中指定版本，修改 `image` 字段即可：

```yaml
services:
  server:
    image: ghcr.io/rtc-agent/server:v1.0.0  # 将 latest 替换为具体版本号
```

## Step 4: 创建管理员账号

管理员账号用于登录 **Admin 后台**（http://localhost:28081），管理用户、查看系统状态等。

```bash
docker compose exec server rtc-agent admin account create \
  --email admin@example.com \
  --password your-password \  # 至少 8 位
  --role admin
```

> 💡 **认证体系说明**：RTC Agent 有两套认证：
> - **Admin 后台**：使用邮箱+密码或邮箱验证码登录，管理系统配置
> - **用户端**：使用 GitHub/Google OAuth2 登录，与 AI 助手对话
> 
> 管理员账号和普通用户是独立的，GitHub 登录的用户是普通用户。

## Step 5: 验证

```bash
curl http://localhost:28080/healthz
# 应返回: {"status":"ok"}
```

**访问地址**：

| 服务 | 地址 |
|------|------|
| RTC Agent Server | http://localhost:28080 |
| Admin 后台 | http://localhost:28081 |
| Grafana | http://localhost:3000 |
| Jaeger | http://localhost:16686 |

## 下一步

选择你的场景：

| 场景 | 说明 | 跳转 |
|------|------|------|
| 🚀 **快速体验** | 最小改动，体验 AI 助手能力 | [→ 快速体验](/quick-start/) |
| 🏗️ **真实接入** | 将 RTC Agent 集成到你的生产应用 | [→ 真实接入](/integration-guide/) |
| 📦 **源码构建** | 本地开发调试，需要 Go 1.27+ | [→ 源码构建](/deployment/source-build/) |
| 🌐 **分布式集群** | 多 Worker 测试、生产验证 | [→ 分布式集群](/deployment/distributed-deploy/) |

## 常见问题

**`curl healthz` 无响应？**

- 检查容器状态：`docker compose ps`，确认所有容器为 `healthy`
- 查看 Server 日志：`docker compose logs server-1`
- 确认端口 28080 未被占用：`lsof -i :28080`

**LLM 调用报错？**

- 检查 `.env` 中的 `LLM__API_KEY` 是否正确
- 确认 API Key 有足够的额度
- 查看日志：`docker compose logs server-1 | grep -i error`

**PostgreSQL 连接失败？**

- Docker 部署中，`dsn` 的主机名应为 `postgres`（Docker 服务名），不是 `localhost`
- 确认 PostgreSQL 容器已启动：`docker compose ps postgres`

**前端组件无法连接 Server？**

- 确认 Server 和网页在同一域名下，或已配置 CORS
- 打开浏览器开发者工具，查看 Console 和 Network 面板中的错误信息
- 检查 `server.url` 配置是否正确
