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

使用开发 Docker Compose 启动 PostgreSQL、Redis 等：

```bash
# 启动开发依赖（PostgreSQL:15432, Redis:16379, Jaeger, Mock OAuth2 等）
go run main.go dev dependencies start
```

或手动启动 Docker：

```bash
docker compose -f etc/dev/docker-compose.yml up -d
```

## 3. 配置

复制配置模板并编辑：

```bash
cp etc/config.example.yaml etc/config.local.yaml
```

编辑 `etc/config.local.yaml`，至少修改以下字段：

```yaml
database:
  dsn: "postgres://rtc_agent:rtc_agent@localhost:15432/rtc_agent?sslmode=disable"

redis:
  addr: "localhost:16379"

llm:
  provider: "claude"           # 或 "openai"
  api_key: "your-api-key"      # 替换为实际 API Key
  model: "claude-sonnet-4-20250514"
```

> **配置合并机制**：Server 启动时自动加载 `etc/config.yaml`（基线）+ `etc/config.local.yaml`（覆盖）。`config.local.yaml` 已在 `.gitignore` 中，不会被提交。只需写差异项。

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
