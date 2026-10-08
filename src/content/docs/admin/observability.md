---
title: 可观测性集成
description: Admin 服务集成的可观测性工具，包括 Grafana、Prometheus、Jaeger 和 Pyroscope
---

# 可观测性集成

Admin 服务集成了完整的可观测性工具链，通过反向代理和 iframe 嵌入方式提供统一的监控界面。

## 架构概述

```
┌──────────────┐     ┌──────────────┐     ──────────────┐
│   Admin UI   │────►│ Admin Server │────►│  Monitoring  │
│  (iframe)    │     │   (Proxy)    │     │   Services   │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   Grafana    │ │  Prometheus  │ │    Jaeger    │
    │  (Dashboards)│ │  (Metrics)   │ │  (Tracing)   │
    └──────────────┘ └──────────────┘ └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  Pyroscope   │
                    │ (Profiling)  │
                    ──────────────┘
```

## 集成方式

### 反向代理

Admin Server 作为反向代理，将监控服务的请求转发到对应的后端：

| 代理路径 | 目标服务 | 用途 |
|----------|----------|------|
| `/api/grafana/*` | Grafana | 仪表板展示 |
| `/api/metrics/*` | Prometheus | 指标查询 |
| `/api/jaeger/*` | Jaeger | 分布式追踪 |
| `/api/pyroscope/*` | Pyroscope | 性能剖析 |

### iframe 嵌入

Grafana 仪表板通过 iframe 嵌入到 Admin UI 中：

```html
<iframe
  src="/api/grafana/d/rtc-agent/rtc-agent"
  frameborder="0"
  width="100%"
  height="600px"
></iframe>
```

## Grafana 集成

### 配置

在 `admin.yaml` 中配置 Grafana 地址：

```yaml
grafana_url: "http://grafana:3000"
```

**Grafana 环境配置**（docker-compose.yml）：

```yaml
grafana:
  image: grafana/grafana:11.1.0
  environment:
    # 禁用自带鉴权，允许 Admin Server 通过 iframe 嵌入访问
    - GF_AUTH_ANONYMOUS_ENABLED=true
    - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
    - GF_AUTH_BASIC_ENABLED=false
    - GF_AUTH_DISABLE_LOGIN_FORM=true
    # 反向代理子路径配置
    - GF_SERVER_ROOT_URL=http://localhost:8000/api/grafana
    - GF_SERVER_SERVE_FROM_SUB_PATH=true
    # 允许 iframe 嵌入
    - GF_SECURITY_ALLOW_EMBEDDING=true
    - GF_SECURITY_CSRF_TRUSTED_ORIGINS=http://localhost:8000,http://localhost:28081
    - GF_SECURITY_CSRF_ENABLED=false
    - GF_SERVER_ALLOWED_ORIGINS=http://localhost:8000 http://localhost:28081
  ports:
    - "23001:3000"
  volumes:
    - ./etc/dev/grafana/provisioning/datasources:/etc/grafana/provisioning/datasources:ro
    - ./etc/dev/grafana/provisioning/dashboards:/etc/grafana/provisioning/dashboards:ro
    - ./etc/dev/grafana/dashboards:/var/lib/grafana/dashboards:ro
```

### 数据源配置

Grafana 预配置以下数据源：

| 数据源 | 类型 | 地址 |
|--------|------|------|
| Prometheus | Prometheus | `http://prometheus:9090` |
| Loki | Loki | `http://loki:3100` |
| Jaeger | Jaeger | `http://jaeger:16686` |
| Pyroscope | Pyroscope | `http://pyroscope:4040` |

### 预置仪表板

Admin UI 提供以下预置仪表板：

#### 1. RTC Agent

监控 RTC Agent 核心指标：
- LLM 用量（Token 消耗速率、累计消耗）
- LLM 请求延迟（p50/p95/p99）
- LLM 错误率
- LLM HTTP 层监控（请求速率、Token 消耗速率）

#### 2. Go Runtime

监控 Go 运行时指标：
- Goroutine 数量
- 内存使用（Heap、Stack）
- GC 暂停时间
- 系统调用

#### 3. HTTP Server

监控 HTTP 服务指标：
- 请求速率
- 请求延迟分布
- 错误率
- 活跃连接数

#### 4. 错误反馈

展示应用错误和异常：
- 错误类型分布
- 错误趋势
- 错误详情

#### 5. 日志总览

通过 Loki 查询日志：
- 日志级别分布
- 日志趋势
- 日志搜索

#### 6. OSS3 存储

监控对象存储指标：
- 存储使用量
- 请求速率
- 错误率

#### 7. MinIO 存储

监控 MinIO 特定指标：
- 磁盘使用
- 存储桶统计
- 操作统计

### 访问方式

```
Admin UI → 监控面板 → RTC Agent
                   → Go Runtime
                   → HTTP Server
                   → 错误反馈
                   → 日志总览
                   → OSS3 存储
                   → MinIO 存储
```

## Prometheus 集成

### 配置

```yaml
prometheus_url: "http://prometheus:9090"
```

### 指标采集

RTC Agent Server 暴露以下指标端点：

```
GET /metrics
```

**指标类型**：

| 指标 | 类型 | 说明 |
|------|------|------|
| `rtc_agent_http_requests_total` | Counter | HTTP 请求总数 |
| `rtc_agent_http_request_duration_seconds` | Histogram | HTTP 请求延迟 |
| `rtc_agent_llm_tokens_total` | Counter | LLM Token 消耗 |
| `rtc_agent_llm_request_duration_seconds` | Histogram | LLM 请求延迟 |
| `rtc_agent_active_sessions` | Gauge | 活跃会话数 |
| `go_goroutines` | Gauge | Goroutine 数量 |
| `go_memstats_heap_alloc_bytes` | Gauge | Heap 内存使用 |

### PromQL 示例

```promql
# LLM Token 消耗速率
rate(rtc_agent_llm_tokens_total[5m])

# HTTP 请求延迟 p99
histogram_quantile(0.99, rate(rtc_agent_http_request_duration_seconds_bucket[5m]))

# 错误率
rate(rtc_agent_http_requests_total{status=~"5.."}[5m]) / rate(rtc_agent_http_requests_total[5m])
```

## Jaeger 集成

### 配置

```yaml
jaeger_url: "http://jaeger:16686"
```

### 分布式追踪

RTC Agent 使用 OpenTelemetry 生成追踪数据：

**追踪链路**：
```
User Request → Nginx → RTC Server → LLM API
                              ↓
                         Database
                              ↓
                         Redis
```

**Span 属性**：
- `http.method`：HTTP 方法
- `http.url`：请求 URL
- `http.status_code`：响应状态码
- `db.statement`：SQL 语句
- `llm.model`：LLM 模型名称
- `llm.tokens`：Token 消耗

### 访问方式

```
Admin UI → 分布式追踪 → Jaeger UI（iframe 嵌入）
```

或在 Admin Server 反向代理中访问：
```
http://localhost:28081/api/jaeger/search
```

## Pyroscope 集成

### 配置

```yaml
pyroscope_url: "http://pyroscope:4040"
```

### 性能剖析

Pyroscope 提供持续性能剖析：

**剖析类型**：
- CPU 剖析
- 内存剖析
- Goroutine 剖析
- 阻塞剖析

**应用场景**：
- 识别 CPU 热点
- 检测内存泄漏
- 分析 Goroutine 阻塞

### 访问方式

```
Admin UI → 性能剖析 → Pyroscope UI（iframe 嵌入）
```

或在 Admin Server 反向代理中访问：
```
http://localhost:28081/api/pyroscope/
```

## Admin UI 监控面板

### 左侧导航

```
监控面板
├── RTC Agent        # LLM 用量、延迟、错误率
├── Go Runtime       # Go 运行时指标
├── HTTP Server      # HTTP 服务指标
├── 错误反馈         # 错误和异常
├── 日志总览         # 日志查询
├── OSS3 存储        # 对象存储监控
└── MinIO 存储       # MinIO 特定指标
```

### 面板功能

**时间范围选择**：
- 最近 15 分钟
- 最近 1 小时
- 最近 6 小时
- 最近 24 小时
- 自定义范围

**自动刷新**：
- 关闭
- 5 秒
- 10 秒
- 30 秒
- 1 分钟

**面板操作**：
- 全屏显示
- 编辑面板
- 导出面板
- 分享链接

## 告警配置

### Prometheus 告警规则

在 `etc/dev/prometheus/alerts.yml` 中配置：

```yaml
groups:
  - name: rtc-agent-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(rtc_agent_http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} for the last 5 minutes"

      - alert: HighLatency
        expr: histogram_quantile(0.99, rate(rtc_agent_http_request_duration_seconds_bucket[5m])) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "p99 latency is {{ $value }}s for the last 10 minutes"
```

### Alertmanager 配置

```yaml
alertmanager:
  image: prom/alertmanager:v0.27.0
  ports:
    - "29093:9093"
  volumes:
    - ./etc/dev/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
```

## 日志系统

### Loki 日志聚合

```yaml
loki:
  image: grafana/loki:3.1.0
  ports:
    - "23100:3100"
```

### Promtail 日志收集

```yaml
promtail:
  image: grafana/promtail:3.1.0
  volumes:
    - ./etc/dev/promtail/promtail.yml:/etc/promtail/config.yml:ro
    - /var/run/docker.sock:/var/run/docker.sock:ro
```

### LogQL 查询示例

```logql
# 查询错误日志
{app="rtc-agent"} |= "error"

# 查询特定会话的日志
{app="rtc-agent"} |~ "session_id=abc123"

# 日志速率统计
rate({app="rtc-agent"} |= "error"[5m])
```

## 相关文档

- [Admin 服务概述](/admin/overview/)
- [部署与运维](/admin/deployment/)
- [API 参考](/admin/api-reference/)
