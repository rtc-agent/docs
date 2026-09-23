---
title: 快速开始
description: 5 分钟部署 RTC Agent Server 并嵌入前端组件，跑通完整链路。
---

从零到跑通 RTC Agent 只需两步：**部署 Server** → **嵌入前端组件**。

## 部署方式选择

| 部署方式 | 适用场景 | 依赖 |
| --- | --- | --- |
| **Docker 部署**（推荐） | 快速体验、完整部署 | Docker |
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
```

编辑 `etc/config.docker.yaml`，确认以下配置正确：

```yaml
database:
  dsn: "postgres://rtc_agent:rtc_agent@postgres:5432/rtc_agent?sslmode=disable"
  auto_migrate: true

redis:
  addr: "redis:6379"

llm:
  provider: "claude"           # 或 "openai"
  # api_key 通过环境变量 LLM__API_KEY 配置，不在 YAML 中写明文
  model: "claude-sonnet-4-20250514"  # 示例：使用 Claude 模型，实际默认配置可能不同（如 qwen3.7-plus）
```

配置 LLM API Key（环境变量方式）：

```bash
# 复制 .env 模板
cp .env.example .env

# 编辑 .env，填入你的 API Key
echo "LLM__API_KEY=your-api-key-here" >> .env
```

> 💡 **环境变量命名规则**：大写字母 + 双下划线 `__` 分隔层级，对应 YAML 配置的层级结构。例如 `llm.api_key` → `LLM__API_KEY`。
>
> ⚠️ **敏感字段处理**：如果 YAML 配置文件中明确写了某个字段（如 `api_key`），环境变量**不会覆盖**它。因此敏感字段建议不在 YAML 中写明文，而是通过环境变量配置。

### 2. 启动

```bash
docker compose up -d
```

Compose 会自动：

1. 启动 PostgreSQL 和 Redis
2. 运行数据库迁移（init 容器）
3. 启动 2 个 Server 容器 + Nginx 负载均衡 + 可观测性栈

### 3. 验证

```bash
# 通过 Nginx 负载均衡入口访问
curl http://localhost:28080/healthz
# {"status":"ok"}
```

## 第二步：嵌入前端组件

Server 跑起来后，在你的网页中添加 `<rtc-agent>` 组件即可获得 AI 助手能力：

```html
<!-- 引入组件 -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@rtc-agent/component@0.2.2/dist/index.js"></script>

<!-- 最简接入 -->
<rtc-agent></rtc-agent>
```

自定义主题和标题：

```html
<rtc-agent theme="dark" app-label="我的 AI 助手"></rtc-agent>
```

组件会自动连接当前页面所在域名的 Server（默认 `localhost:28080`）。

> 📖 完整的属性、事件、CSS 变量说明见 [Web Component API](/docs/integration/component-api/)。

## 其他部署方式

### 源码构建

适合需要在 Server 侧开发调试的场景。需要 Go 1.27+ 环境。

→ 详见 [源码构建指南](/docs/deployment/source-build/)

### Docker 分布式集群

与上述 Docker 部署使用同一个 `docker-compose.yml`，额外包含分布式行为验证（Session Affinity、RTC Checkpoint）、重启恢复机制等深入说明。

→ 详见 [分布式集群部署](/docs/deployment/distributed-deploy/)

## 配置参考

完整配置项参见 [etc/config.docker.yaml](https://github.com/rtc-agent/server/blob/main/etc/config.docker.yaml)。

### 必填配置

| 配置 | 说明 | 必填 |
| --- | --- | --- |
| `database.dsn` | PostgreSQL 连接字符串 | ✅ |
| `redis.addr` | Redis 地址 | ✅ |
| `auth.jwt_secret` | JWT 签名密钥（生产环境务必使用强随机值） | ✅ |
| `llm.provider` | 模型提供商：`claude` 或 `openai` | ✅ |
| `llm.api_key` | LLM API 密钥 | ✅ |
| `llm.model` | 模型名称 | ✅ |

### 可选配置

| 配置 | 说明 | 默认值 |
| --- | --- | --- |
| `tracing.enabled` | 启用 OpenTelemetry 追踪 | `false` |
| `embedding.enabled` | 启用向量检索（User Memory） | `false` |
| `log.level` | 日志级别：`debug` / `info` / `warn` / `error` | `info` |
| `log.server_log_file` | 服务器日志文件路径（JSON 格式，用于 promtail 采集）。留空则不写文件。日志使用 lumberjack 自动轮转（100MB/文件，保留 3 个，7 天，gzip 压缩） | 空 |
| `worker.cache_hit_rate_warn_threshold` | 缓存命中率告警阈值（0.0-1.0）。Session 累计缓存命中率低于此值时输出 warn 日志。负数表示禁用告警 | `0.88` |
| `llm.retry_max_attempts` | 模型调用失败时的最大重试次数。0 表示不重试 | `0` |
| `llm.retry_base_delay` | 重试的基础退避时间（指数退避：`base_delay * 2^(attempt-1)`） | `1s` |

### 模型定价配置

`llm.pricing` 配置段用于自定义模型价格，以便系统计算每次调用的成本（`total_cost_usd`）。所有价格单位为 **USD / 百万 tokens**。未配置时使用 Claude 3.5 Sonnet 的默认价格。

```yaml
llm:
  pricing:
    input_per_million: 3.0        # 正常 input token 价格
    output_per_million: 15.0      # output token 价格
    cached_read_per_million: 0.3  # cache read（cache hit）价格，通常为 input 的 10%
    cached_write_per_million: 3.75 # cache write（cache creation）价格，通常为 input 的 125%
    reasoning_per_million: 0.0    # reasoning（thinking）token 价格
```

| 字段 | 说明 | 默认值（Claude 3.5 Sonnet） |
| --- | --- | --- |
| `input_per_million` | 正常 input token 价格（USD/百万 tokens） | `3.0` |
| `output_per_million` | output token 价格（USD/百万 tokens） | `15.0` |
| `cached_read_per_million` | cache read（cache hit）价格（USD/百万 tokens） | `0.3` |
| `cached_write_per_million` | cache write（cache creation）价格（USD/百万 tokens） | `3.75` |
| `reasoning_per_million` | reasoning（thinking）token 价格（USD/百万 tokens） | `0.0` |

> 💡 使用其他模型时，请参考模型提供商的定价页面，将 `llm.pricing` 配置为对应价格。成本计算会在每次 LLM 调用后累加到 Session 的 `total_cost_usd` 字段，通过 `session.updated` 事件推送给前端。
>
> 🔐 **生产环境安全提示**：部署到生产环境前，请确保启用 HTTPS、配置正确的 OAuth2 提供商（非 Mock）、使用强随机 `jwt_secret`、设置 CORS 白名单。

## 常见问题

**`curl healthz` 无响应？**

- Docker 部署：检查容器状态 `docker compose ps`，确认所有容器为 `healthy`
- 查看 Server 日志：`docker compose logs server-1 server-2`
- 确认端口 28080 未被占用：`lsof -i :28080`

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
