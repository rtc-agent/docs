---
title: 源码构建
description: 从源码构建 RTC Agent Server，适合本地开发调试。
---

源码构建适合需要在 Server 侧开发调试的场景。

## 前置条件

- **Go 1.27+**
- **PostgreSQL 17+**（需 pgvector 扩展）— 推荐 `pgvector/pgvector:pg17` 镜像
- **Redis 7+**
- **LLM API** — Claude 或 OpenAI 兼容接口

## 1. 克隆代码

```bash
git clone https://github.com/rtc-agent/server.git
cd server
```

## 2. 启动基础设施

使用根目录的 `docker-compose.yml` 启动 PostgreSQL、Redis 等依赖服务：

```bash
# 只启动开发所需的基础设施（PostgreSQL:25432, Redis:26379 等）
docker compose up -d postgres redis
```

## 3. 配置

复制配置模板并编辑：

```bash
cp etc/config.docker.yaml etc/config.local.yaml
```

编辑 `etc/config.local.yaml`，至少修改以下字段：

```yaml
database:
  dsn: "postgres://rtc_agent:rtc_agent@localhost:25432/rtc_agent?sslmode=disable"

redis:
  addr: "localhost:26379"

llm:
  provider: "claude"           # 或 "openai"
  # api_key 通过环境变量 LLM__API_KEY 配置，不在 YAML 中写明文
  model: "claude-sonnet-4-20250514"  # 示例：使用 Claude 模型，实际默认配置可能不同（如 qwen3.7-plus）
```

配置 LLM API Key（环境变量方式）：

```bash
# 设置环境变量（本地运行不会自动读取 .env 文件）
export LLM__API_KEY=your-api-key-here
```

> 💡 也可以复制 `.env.example` 为 `.env` 后 `source .env` 加载，然后 `export` 所需变量。Docker 部署中 docker-compose 会自动读取 `.env`（通过 `env_file`），但本地 Go 运行需要手动导出。
>
> 💡 **环境变量命名规则**：大写字母 + 双下划线 `__` 分隔层级，对应 YAML 配置的层级结构。例如 `llm.api_key` → `LLM__API_KEY`。这种映射由 Viper 的 `SetEnvKeyReplacer(".", "__")` 实现。
>
> ⚠️ **敏感字段处理**：如果 YAML 配置文件中明确写了某个字段（如 `api_key`），环境变量**不会覆盖**它。因此敏感字段建议不在 YAML 中写明文，而是通过环境变量配置。

## 4. 构建 & 运行

```bash
# 构建
go build -o bin/rtc-agent .

# 数据库迁移（首次部署）
./bin/rtc-agent migrate

# 启动服务
./bin/rtc-agent serve
```

服务启动在 `http://localhost:8888`。

## 5. 验证

```bash
curl http://localhost:8888/healthz
# {"status":"ok"}
```

## 6. 嵌入前端

Server 启动后，在你的网页中添加 `<rtc-agent>` 组件：

```html
<script type="module" src="https://cdn.example.com/rtc-agent/index.js"></script>
<rtc-agent></rtc-agent>
```

详见 [Web Component API](/docs/integration/component-api/)。

## 下一步

- [快速开始](/docs/getting-started/) — 返回总览
- [分布式集群部署](/docs/deployment/distributed-deploy/) — 多 Worker 部署
- [配置参考](/docs/getting-started/#配置参考) — 完整配置项说明
