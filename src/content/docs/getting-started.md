---
title: 快速开始
description: 5 分钟部署 RTC Agent Server 并嵌入前端组件，跑通完整链路。
---

从零到跑通 RTC Agent 只需两步：**部署 Server** → **嵌入前端组件**。

## 部署方式选择

| 部署方式 | 适用场景 | 依赖 |
| --- | --- | --- |
| **Docker 单实例**（推荐） | 快速体验、小规模部署 | Docker |
| [源码构建](/docs/deployment/source-build/) | 本地开发调试 | Go 1.27, PostgreSQL, Redis |
| [Docker 分布式集群](/docs/deployment/distributed-deploy/) | 多 Worker 测试、生产验证 | Docker |

## 前置条件

- **Docker** — 推荐 Docker Desktop 或等效环境
- **LLM API Key** — Claude 或 OpenAI 兼容接口的 API 密钥

> 如果选择源码构建，还需 Go 1.27+、PostgreSQL 17+（含 pgvector）、Redis 7+。详见 [源码构建指南](/docs/deployment/source-build/)。
>
> Docker 部署内置了 `mock-oauth2` 作为示例认证服务，可直接体验。生产环境需部署自己的 OAuth2 服务，详见 [认证与授权](/docs/integration/auth/#开发者接入指南)。

## 第一步：部署 Server

### 1. 克隆代码 & 准备配置

```bash
git clone https://github.com/rtc-agent/server.git
cd server
cp etc/config.example.yaml etc/config.docker.yaml
```

编辑 `etc/config.docker.yaml`，填入你的 LLM API Key：

```yaml
database:
  dsn: "postgres://rtc_agent:rtc_agent@postgres:5432/rtc_agent?sslmode=disable"
  auto_migrate: true

redis:
  addr: "redis:6379"

llm:
  provider: "claude"           # 或 "openai"
  api_key: "your-api-key"      # ← 替换为实际 API Key
  model: "claude-sonnet-4-20250514"
```

> **Docker 配置加载**：Compose 会将 `etc/config.docker.yaml` 直接挂载为容器内的 `/app/etc/config.yaml`，因此该文件需要是**完整配置**（从 `config.example.yaml` 复制后修改）。

### 2. 启动

```bash
docker compose up -d
```

Compose 会自动：

1. 启动 PostgreSQL 和 Redis
2. 运行数据库迁移（init 容器）
3. 启动 Server 容器（端口 8888）

### 3. 验证

```bash
curl http://localhost:8888/healthz
# {"status":"ok"}
```

## 第二步：嵌入前端组件

Server 跑起来后，在你的网页中添加 `<rtc-agent>` 组件即可获得 AI 助手能力：

```html
<!-- 引入组件 -->
<script type="module" src="https://cdn.example.com/rtc-agent/index.js"></script>

<!-- 最简接入 -->
<rtc-agent></rtc-agent>
```

自定义主题和标题：

```html
<rtc-agent theme="dark" app-label="我的 AI 助手"></rtc-agent>
```

组件会自动连接当前页面所在域名的 Server（默认 `localhost:8888`）。

> 📖 完整的属性、事件、CSS 变量说明见 [Web Component API](/docs/integration/component-api/)。

## 其他部署方式

### 源码构建

适合需要在 Server 侧开发调试的场景。需要 Go 1.27+ 环境。

→ 详见 [源码构建指南](/docs/deployment/source-build/)

### Docker 分布式集群

2 个 Server 容器 + Nginx 负载均衡 + 完整可观测性栈（Jaeger、Prometheus、Grafana），用于验证多 Worker 分布式能力。

→ 详见 [分布式集群部署](/docs/deployment/distributed-deploy/)

## 配置参考

完整配置项参见 [etc/config.example.yaml](https://github.com/rtc-agent/server/blob/main/etc/config.example.yaml)。

| 配置 | 说明 | 必填 |
| --- | --- | --- |
| `database.dsn` | PostgreSQL 连接字符串 | ✅ |
| `redis.addr` | Redis 地址 | ✅ |
| `auth.jwt_secret` | JWT 签名密钥（生产环境务必使用强随机值） | ✅ |
| `llm.provider` | 模型提供商：`claude` 或 `openai` | ✅ |
| `llm.api_key` | LLM API 密钥 | ✅ |
| `llm.model` | 模型名称 | ✅ |
| `tracing.enabled` | 启用 OpenTelemetry 追踪 | 可选 |
| `embedding.enabled` | 启用向量检索（User Memory） | 可选 |

> 🔐 **生产环境安全提示**：部署到生产环境前，请确保启用 HTTPS、配置正确的 OAuth2 提供商（非 Mock）、使用强随机 `jwt_secret`、设置 CORS 白名单。

## 常见问题

**`curl healthz` 无响应？**

- Docker 部署：检查容器状态 `docker compose ps`，确认所有容器为 `healthy`
- 查看 Server 日志：`docker compose logs server`
- 确认端口 8888 未被占用：`lsof -i :8888`

**LLM 调用报错？**

- 检查 `api_key` 是否正确填入（注意 YAML 中不要有多余空格）
- 确认 `model` 名称与你的 API 计划匹配（如 `claude-sonnet-4-20250514` 需要有效的 Claude API 订阅）
- 如使用 OpenAI，确认 `provider` 设为 `"openai"` 且 `api_key` 是 OpenAI 的 Key

**PostgreSQL 连接失败？**

- Docker 部署中，`dsn` 的主机名应为 `postgres`（Docker 服务名），不是 `localhost`
- 确认 PostgreSQL 容器已启动：`docker compose ps postgres`

**前端组件无法连接 Server？**

- 确认 Server 和网页在同一域名下，或已配置 CORS
- 打开浏览器开发者工具，查看 Console 和 Network 面板中的错误信息

## 下一步

- [嵌入前端组件](/docs/integration/component-api/) — 了解 `<rtc-agent>` 的全部属性和事件
- [注册 Function](/docs/integration/function-registration/) — 让你的网站 API 变成 AI 可调用的工具
- [工作模式](/docs/concepts/work-modes/) — 理解 AI 操作的五种权限模式
- [编写 Scenario](/docs/integration/scenario-authoring/) — 给 AI 提供业务上下文
