---
title: Docker 分布式集群
description: 2 个 Server + Nginx 负载均衡 + 完整可观测性栈，验证多 Worker 分布式部署能力。
---

分布式集群部署用于验证 RTC Agent 的多 Worker 能力 — 2 个 Server 容器 + Nginx 负载均衡 + 完整可观测性栈（Jaeger、Prometheus、Grafana、Loki 等）。

## 架构

```mermaid
flowchart TB
    subgraph Client["客户端层"]
        Client1[浏览器 / Web Component]
    end

    subgraph Access["接入层"]
        Nginx[Nginx :28080]
    end

    subgraph App["应用层"]
        Server1[Server-1 :8888]
        Server2[Server-2 :8888]
    end

    subgraph Data["数据层"]
        PostgreSQL[(PostgreSQL :25432)]
        Redis[(Redis :26379)]
    end

    subgraph Observability["可观测性栈"]
        Jaeger[Jaeger]
        Prometheus[Prometheus]
        Grafana[Grafana]
        Loki[Loki]
    end

    Client1 --> Nginx
    Nginx --> Server1
    Nginx --> Server2
    Server1 --> PostgreSQL
    Server1 --> Redis
    Server2 --> PostgreSQL
    Server2 --> Redis
    Server1 -.-> Jaeger
    Server2 -.-> Jaeger
    Server1 -.-> Prometheus
    Server2 -.-> Prometheus
    Grafana --> Prometheus
    Grafana --> Loki
```

## 端口分配

| 服务 | 端口 | 说明 |
| --- | --- | --- |
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

## 1. 准备配置

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
  api_key: "${LLM_API_KEY}"   # 通过环境变量注入，启动前 export LLM_API_KEY="your-key"
  model: "claude-sonnet-4-20250514"
```

> ⚠️ **OAuth2 服务地址**：`providers.mock.url` 指向 OAuth2 授权服务。示例中的 `192.168.31.60:20060` 是开发环境的公网 IP 示例。开发者需要部署自己的 OAuth2 服务（协议与 mock-oauth2 兼容），并将此地址替换为实际的服务地址。详见 [认证与授权](/docs/integration/auth/)。

## 2. 启动

```bash
docker compose -f docker-compose.full.yml up -d
```

启动顺序：PostgreSQL/Redis → migrate（一次性容器）→ Server-1 & Server-2 → Nginx

## 3. 验证

```bash
# 健康检查（通过 Nginx 负载均衡）
curl http://localhost:28080/healthz
# {"status":"ok"}

# 查看容器状态 — 所有容器应为 healthy/running
docker compose -f docker-compose.full.yml ps

# Jaeger 追踪面板
open http://localhost:26686
```

## 4. 分布式行为验证

两个 Server 共享同一个 PostgreSQL 和 Redis。当用户请求通过 Nginx 分发到不同 Server 时：

- **Session Affinity**：通过 Redis 分布式锁（`SET NX`）实现，同一时刻只有一个 Worker 处理某个 Session 的工作
- **RTC Checkpoint**：Agent 执行远程工具调用时，检查点存在 Redis 中，任何 Worker 可恢复
- **Worker 心跳**：各 Worker 独立向 Redis 注册、心跳、竞争任务

## 5. 停止 & 清理

```bash
docker compose -f docker-compose.full.yml down      # 停止容器
docker compose -f docker-compose.full.yml down -v   # 同时删除数据卷
```

## 6. 重启恢复机制

Server 在启动时会自动执行 **stale turns 恢复**，确保因崩溃或重启而中断的工作能够继续。

### 恢复流程

```mermaid
flowchart TD
    A["🔄 Server 启动"] --> B["扫描 stale turns"]
    B --> C{"发现 stale turns？"}
    C -->|"❌ 无"| D["正常启动"]
    C -->|"✅ 有"| E["标记为 interrupted"]
    E --> F["重新排队 ghost work"]
    F --> G["发布 resume work item"]
    G --> H["释放 stale session 锁"]
    H --> I["Worker 自动恢复处理"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style E fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style I fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

### 关键概念

| 概念 | 说明 |
| --- | --- |
| **Stale Turn** | 处于非终态（`running` / `pending` / `interrupted`）的 Turn，由上次崩溃或重启遗留 |
| **Ghost Work** | 处于 `processing` 状态的 work item，但 session 锁已过期（Worker 崩溃遗留） |
| **recoverStaleTurns** | Server 启动时的恢复入口，扫描并处理所有 stale turns |
| **RequeueGhostWork** | 将 ghost work item 重新放回队列，以便 Worker 重新领取 |

### 恢复行为

1. **查找 stale turns**：扫描数据库中所有 `running`、`pending`、`interrupted` 状态的 Turn
2. **标记中断**：将 `running` / `pending` 的 Turn 标记为 `interrupted`
3. **重排队 ghost work**：批量检查并重新排队因崩溃遗留的 work item
4. **发布 resume**：为每个 stale Turn 发布 resume work item，触发 Worker 恢复处理
5. **释放 session 锁**：清理过期的 session 分布式锁，使 Worker 可以重新竞争

> 💡 恢复过程对前端用户透明。被中断的 Turn 会通过 `turn.updated` 事件通知前端状态变为 `interrupted`，随后恢复处理时自动继续。RTC Checkpoint 也在此过程中发挥作用——等待前端工具结果的 Turn 可以从 Redis Checkpoint 恢复，无需用户重新操作。

## 下一步

- [快速开始](/docs/getting-started/) — 返回总览
- [源码构建](/docs/deployment/source-build/) — 本地开发调试
- [配置参考](/docs/getting-started/#配置参考) — 完整配置项说明
