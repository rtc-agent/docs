---
title: 快速开始
description: 部署 RTC Agent Server — 源码构建、Docker 单实例、Docker 分布式集群
---

RTC Agent Server 提供三种部署方式，按场景选择：

| 部署方式 | 适用场景 | 依赖 |
|---------|---------|------|
| [源码构建](#源码构建) | 本地开发调试 | Go 1.27, PostgreSQL, Redis |
| [Docker 单实例](#docker-单实例) | 快速体验、小规模部署 | Docker |
| [Docker 分布式](#docker-分布式集群) | 生产验证、多 Worker 测试 | Docker |

## 前置条件

所有部署方式都需要以下基础设施：

- **PostgreSQL 17+**（需 pgvector 扩展）— 推荐使用 `pgvector/pgvector:pg17` 镜像
- **Redis 7+** — 用于消息队列、缓存、Worker 协调
- **LLM API** — Claude 或 OpenAI 兼容接口

## 源码构建

### 1. 克隆代码

```bash
git clone https://github.com/rtc-agent/server.git
cd server
```

### 2. 启动基础设施

使用开发 Docker Compose 启动 PostgreSQL、Redis 等：

```bash
# 启动开发依赖（PostgreSQL:15432, Redis:16379, Jaeger, Mock OAuth2 等）
go run main.go dev dependencies start
```

或手动启动 Docker：

```bash
docker compose -f etc/dev/docker-compose.yml up -d
```

### 3. 配置

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

> **配置合并机制**：Server 启动时自动加载 `etc/config.yaml`（基线）+ `etc/config.local.yaml`（覆盖）。
> `config.local.yaml` 已在 `.gitignore` 中，不会被提交。只需写差异项。

### 4. 构建 & 运行

```bash
# 构建
go build -o bin/rtc-agent .

# 数据库迁移（首次部署）
./bin/rtc-agent migrate

# 启动服务
./bin/rtc-agent serve
```

服务启动在 `http://localhost:8888`。

### 5. 验证

```bash
curl http://localhost:8888/healthz
# {"status":"ok"}
```

## Docker 单实例

最简单的 Docker 部署方式 — 一个 Server 容器 + PostgreSQL + Redis。

### 1. 准备配置

```bash
cp etc/config.example.yaml etc/config.docker.yaml
```

编辑 `etc/config.docker.yaml`，将连接地址改为 Docker 服务名：

```yaml
database:
  dsn: "postgres://rtc_agent:rtc_agent@postgres:5432/rtc_agent?sslmode=disable"
  auto_migrate: true

redis:
  addr: "redis:6379"

llm:
  provider: "claude"
  api_key: "your-api-key"
  model: "claude-sonnet-4-20250514"
```

### 2. 启动

```bash
docker compose up -d
```

Compose 会自动：
1. 启动 PostgreSQL 和 Redis（端口 15432 / 16379）
2. 运行数据库迁移（init 容器）
3. 启动 Server 容器（端口 8888）

### 3. 验证

```bash
curl http://localhost:8888/healthz
# {"status":"ok"}
```

### 4. 停止 & 清理

```bash
docker compose down            # 停止容器
docker compose down -v         # 同时删除数据卷
```

## Docker 分布式集群

验证多 Worker 分布式部署能力 — 2 个 Server 容器 + Nginx 负载均衡 + 完整可观测性栈。

### 架构

```mermaid
flowchart TB
    subgraph "客户端层"
        Client[浏览器/Web Component]
    end

    subgraph "接入层"
        Nginx[Nginx<br/>:28080<br/>负载均衡]
    end

    subgraph "应用层"
        Server1[Server-1<br/>:8888]
        Server2[Server-2<br/>:8888]
    end

    subgraph "数据层"
        PostgreSQL[(PostgreSQL<br/>:25432<br/>pgvector)]
        Redis[(Redis<br/>:26379<br/>队列/缓存)]
    end

    subgraph "可观测性栈"
        Jaeger[Jaeger<br/>UI:26686<br/>OTLP:24317]
        Prometheus[Prometheus<br/>:29090]
        Grafana[Grafana<br/>:23001]
        Loki[Loki<br/>:23100]
        Promtail[Promtail]
        Pyroscope[Pyroscope<br/>:24040]
        Alertmanager[Alertmanager<br/>:29093]
    end

    subgraph "认证服务"
        OAuth2[Mock OAuth2<br/>:20060]
    end

    Client --> Nginx
    Nginx --> Server1
    Nginx --> Server2

    Server1 --> PostgreSQL
    Server1 --> Redis
    Server2 --> PostgreSQL
    Server2 --> Redis

    Server1 -.->|traces| Jaeger
    Server2 -.->|traces| Jaeger

    Server1 -.->|metrics| Prometheus
    Server2 -.->|metrics| Prometheus

    Promtail -.->|logs| Loki
    Grafana --> Prometheus
    Grafana --> Loki
    Grafana --> Pyroscope
    Prometheus -.->|alerts| Alertmanager

    Server1 -.->|auth| OAuth2
    Server2 -.->|auth| OAuth2

    style Client fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    style Nginx fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style Server1 fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style Server2 fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    style PostgreSQL fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    style Redis fill:#ffebee,stroke:#b71c1c,stroke-width:2px
    style Jaeger fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style Prometheus fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style Grafana fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style Loki fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style Promtail fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style Pyroscope fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style Alertmanager fill:#fff9c4,stroke:#f57f17,stroke-width:2px
    style OAuth2 fill:#fce4ec,stroke:#880e4f,stroke-width:2px
```

### 端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx | 28080 | 负载均衡入口 |
| Server 1 & 2 | 内部 8888 | 不直接暴露 |
| PostgreSQL | 25432 | 带 pgvector |
| Redis | 26379 | Worker 协调 |
| Jaeger UI | 26686 | 追踪可视化 |
| Jaeger OTLP | 24317 | gRPC 接入 |
| Prometheus | 29090 | 指标采集 |
| Grafana | 23001 | 仪表盘（admin/admin） |
| Loki | 23100 | 日志聚合 |
| Pyroscope | 24040 | 持续性能分析 |
| Alertmanager | 29093 | 告警路由 |
| Mock OAuth2 | 20060 | 开发用 OAuth2 |

> **端口设计**：所有端口与开发环境（15432/16379/80）不冲突，可同时运行。

### 1. 准备配置

```bash
cp etc/config.example.yaml etc/config.docker-full.yaml
```

编辑 `etc/config.docker-full.yaml`：

```yaml
database:
  dsn: "postgres://rtc_agent:rtc_agent@postgres:5432/rtc_agent?sslmode=disable"
  auto_migrate: true

redis:
  addr: "redis:6379"

tracing:
  enabled: true
  endpoint: "jaeger:4317"
  sample_rate: 1.0

providers:
  mock:
    enabled: true
    url: "http://mock-oauth2:10060"

llm:
  provider: "claude"
  api_key: "your-api-key"
  model: "claude-sonnet-4-20250514"
```

### 2. 启动

```bash
docker compose -f docker-compose.full.yml up -d
```

启动顺序：PostgreSQL/Redis → migrate（一次性容器）→ Server-1 & Server-2 → Nginx

### 3. 验证

```bash
# 健康检查（通过 Nginx 负载均衡）
curl http://localhost:28080/healthz
# {"status":"ok"}

# 查看容器状态 — 所有容器应为 healthy/running
docker compose -f docker-compose.full.yml ps

# Jaeger 追踪面板
open http://localhost:26686
```

### 4. 分布式验证

两个 Server 共享同一个 PostgreSQL 和 Redis。当用户请求通过 Nginx 分发到不同 Server 时：

- **Session Affinity**：通过 Redis 分布式锁（`SET NX`）实现，同一时刻只有一个 Worker 处理某个 Session 的工作
- **RTC Checkpoint**：Agent 执行远程工具调用时，检查点存在 Redis 中，任何 Worker 可恢复
- **Worker 心跳**：各 Worker 独立向 Redis 注册、心跳、竞争任务

## 配置参考

完整配置项参见 [etc/config.example.yaml](https://github.com/rtc-agent/server/blob/main/etc/config.example.yaml)。

关键配置项：

| 配置 | 说明 | 必填 |
|------|------|------|
| `database.dsn` | PostgreSQL 连接字符串 | ✅ |
| `redis.addr` | Redis 地址 | ✅ |
| `auth.jwt_secret` | JWT 签名密钥（生产环境用强随机值） | ✅ |
| `llm.provider` | 模型提供商：`claude` 或 `openai` | ✅ |
| `llm.api_key` | LLM API 密钥 | ✅ |
| `llm.model` | 模型名称 | ✅ |
| `tracing.enabled` | 启用 OpenTelemetry 追踪 | 可选 |
| `embedding.enabled` | 启用向量检索（User Memory） | 可选 |

## 下一步

- [什么是 RTC Agent](/docs/introduction/) — 了解核心概念和架构
- [协议参考](/docs/protocol/) — HTTP API 和 WebSocket RPC 文档（即将推出）
