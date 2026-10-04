---
title: 可观测性监控
description: RTC Agent 的 Prometheus 指标、Grafana 仪表盘和告警规则 — 全面掌握系统运行状态。
---

RTC Agent 内置了完整的可观测性基础设施：通过 Prometheus 采集指标、Grafana 可视化仪表盘、Alertmanager 告警通知。本文档列出所有可用的指标、仪表盘和预置告警规则。

## 指标体系

所有 Prometheus 指标通过 `GET /metrics` 端点暴露（`text/plain` 格式），命名遵循 `{namespace}_{subsystem}_{name}` 规范，统一使用 `rtc_` 前缀。

### 数据库指标 (rtc_db_*)

通过 GORM 插件自动采集所有 SQL 操作的指标。

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_db_queries_total` | Counter | `operation` (select/insert/update/delete/raw), `status` (success/error) | 数据库查询总次数 |
| `rtc_db_query_duration_seconds` | Histogram | `operation` | 数据库查询耗时分布（桶：1ms ~ 4.096s） |

> 💡 这些指标帮助识别慢查询和数据库瓶颈。`operation` 标签区分 CRUD 操作类型。

### 队列生命周期指标 (rtc_queue_*)

追踪 work item 从发布到完成的全生命周期。

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_queue_publish_total` | Counter | `status` (success/error) | 发布的 work item 总数 |
| `rtc_queue_claim_total` | Counter | `status` (success/empty/error) | 领取的 work item 总数 |
| `rtc_queue_complete_total` | Counter | `status` (success/error) | 完成的 work item 总数 |
| `rtc_queue_cancel_total` | Counter | `reason` | 取消的 work item 总数 |
| `rtc_queue_wait_duration_seconds` | Histogram | — | 等待时间（发布到领取） |
| `rtc_queue_processing_duration_seconds` | Histogram | — | 处理时间（领取到完成） |

> 💡 队列指标是排查 Worker 负载和任务延迟的关键。`wait_duration` 反映调度效率，`process_duration` 反映处理能力。

### 熔断器指标 (rtc_circuitbreaker_*)

监控 WebFetch 等模块的熔断器状态。

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_circuitbreaker_state_changes_total` | Counter | `name`, `from_state`, `to_state` | 状态变更总次数 |
| `rtc_circuitbreaker_state` | Gauge | `name`, `state` (closed/open/half_open) | 当前状态（1=激活，0=未激活） |

### WebSocket / Centrifuge 指标 (rtc_centrifuge_*)

监控实时连接、RPC 调用和频道订阅。

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_centrifuge_connections_total` | Counter | `status` (connected/disconnected) | 连接事件总数 |
| `rtc_centrifuge_disconnect_reason_total` | Counter | `reason` (slow/normal/error) | 断连原因分布 |
| `rtc_centrifuge_rpc_requests_total` | Counter | `method`, `status` (success/error) | RPC 调用总数 |
| `rtc_centrifuge_rpc_duration_seconds` | Histogram | `method` | RPC 调用耗时分布（桶：1ms ~ 4s） |
| `rtc_centrifuge_subscriptions_total` | Counter | `channel_type` (user/topic/live) | 频道订阅总数 |
| `rtc_centrifuge_connecting_duration_seconds` | Histogram | `status` (success/error) | JWT 验证耗时（OnConnecting 阶段） |

### 认证指标 (rtc_auth_*)

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_auth_failures_total` | Counter | `type` (jwt/oauth/centrifuge), `reason` (expired/invalid/missing/signature/claims) | 认证失败总次数 |

> 💡 认证失败速率突增可能表示暴力攻击或配置错误。

### 业务事件指标 (rtc_session_*, rtc_message_*)

追踪核心业务事件（Session 生命周期和消息发送）。

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_session_created_total` | Counter | — | Session 创建总数 |
| `rtc_session_closed_total` | Counter | `reason` (normal/error/stopped_by_parent) | Session 关闭总数（按原因分布） |
| `rtc_messages_sent_total` | Counter | `type` (user/assistant/system) | 消息发送总数（按类型分布） |

### OSS3 对象存储指标 (rtc_oss3_*)

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_oss3_requests_total` | Counter | `operation` (PutObject/GetObject/...), `status` | S3 请求总数 |
| `rtc_oss3_request_duration_seconds` | Histogram | `operation` | S3 请求耗时分布 |
| `rtc_oss3_quota_usage_bytes` | Gauge | `user_id` | 用户配额使用量（字节） |
| `rtc_oss3_multipart_uploads_active` | Gauge | — | 活跃的分片上传数 |
| `rtc_oss3_backend_errors_total` | Counter | — | 后端（MinIO）错误总数 |

### HTTP 指标

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `http_requests_total` | Counter | `code`, `method` | HTTP 请求总数（含状态码） |
| `http_request_duration_seconds` | Histogram | — | HTTP 请求耗时分布 |

### Go 运行时指标

| 指标名 | 类型 | 说明 |
| --- | --- | --- |
| `go_goroutines` | Gauge | 当前 Goroutine 数量 |
| `go_memstats_heap_alloc_bytes` | Gauge | 堆内存使用量（字节） |
| `process_start_time_seconds` | Gauge | 进程启动时间 |

## Grafana 仪表盘

分布式部署自带预配置的 Grafana（端口 23001，默认账号 admin/admin）。以下仪表盘通过 Provisioning 自动加载：

| 仪表盘 | 说明 | 关键面板 |
| --- | --- | --- |
| **RTC Agent** | 核心业务仪表盘 | Session 活跃数、Turn 执行、LLM 调用、Token 消耗、缓存命中率 |
| **OSS3 Overview** | 对象存储概览 | 上传/下载吞吐量、配额使用、分片上传状态、后端健康 |
| **MinIO Overview** | MinIO 后端详情 | 磁盘使用率、S3 请求率、节点状态 |
| **HTTP Server** | HTTP 层监控 | 请求率、延迟分布、状态码分布 |
| **Go Runtime** | Go 运行时 | Goroutine 数量、GC 暂停时间、内存使用 |
| **System Health Watchdog** | 系统健康看门狗 | 综合健康评分、资源使用趋势 |
| **Logs** | 日志聚合（Loki） | 结构化日志查询、错误日志过滤 |
| **Error Feedback Overview** | 错误反馈概览 | 错误消息创建率、Reactive Compact 状态 |

访问 Grafana：`http://localhost:23001`（分布式部署）或自定义端口。

## 告警规则

分布式部署通过 `etc/dev/prometheus/alerts.yml` 预配置了 Alertmanager 告警规则。告警分为以下组：

### rtc-agent-alerts — 核心服务告警

| 告警名 | 条件 | 严重度 | 说明 |
| --- | --- | --- | --- |
| `ServerDown` | `up == 0` 持续 30s | critical | 服务不可达 |
| `HighHTTPErrorRate` | 5xx 错误率 > 5% 持续 2m | warning | HTTP 错误率异常 |
| `HighHTTPLatency` | p95 延迟 > 2s 持续 5m | warning | HTTP 延迟过高 |
| `LLMHighErrorRate` | LLM 调用错误率 > 10% 持续 2m | warning | LLM 服务异常 |
| `HighTokenConsumptionRate` | Token 消耗 > 100k/s 持续 1m | warning | Token 消耗异常 |
| `HighReasoningTokenRatio` | Reasoning Token 占比 > 50% 持续 5m | warning | 模型配置可能异常 |
| `GoroutineLeak` | Goroutine > 5000 持续 10m | warning | 可能存在 Goroutine 泄漏 |
| `HighMemoryUsage` | 堆内存 > 1GB 持续 5m | warning | 内存压力 |
| `ContainerRestarting` | 10 分钟内重启 > 2 次 | critical | 容器频繁重启 |
| `ScriptExecutionHighErrorRate` | Script 错误率 > 10% 持续 2m | warning | 脚本执行异常 |
| `ScriptExecutionSlow` | Script p95 延迟 > 30s 持续 5m | warning | 脚本执行缓慢 |

### error-feedback-alerts — 错误反馈告警

| 告警名 | 条件 | 严重度 | 说明 |
| --- | --- | --- | --- |
| `StaleTurnRecoveryActive` | 15 分钟内有 stale turn 恢复 | warning | 自动恢复已触发 |
| `StaleTurnRecoveryHighRate` | 恢复速率 > 0.1/s 持续 5m | warning | 大量 turn 卡死 |
| `ErrorMessageRateSpike` | 错误消息创建速率 > 0.5/s | warning | 错误消息突增 |
| `ReactiveCompactExhausted` | Level-3 压缩全部失败 | critical | 自动恢复机制耗尽 |
| `ErrorFeedbackSLABreach` | P99 延迟 > 10s | warning | 错误反馈 SLA 违反 |

### new-metrics-alerts — 扩展指标告警

#### Centrifuge / WebSocket

| 告警名 | 条件 | 严重度 |
| --- | --- | --- |
| `CentrifugeHighErrorDisconnectRate` | error 类型断连占比 > 20% | warning |
| `CentrifugeRPCHighErrorRate` | RPC 错误率 > 10% | warning |
| `CentrifugeRPCHighLatency` | RPC p95 延迟 > 1s | warning |

#### Queue 生命周期

| 告警名 | 条件 | 严重度 |
| --- | --- | --- |
| `QueueHighWaitDuration` | 等待时间 p95 > 30s | warning |
| `QueueHighProcessingDuration` | 处理时间 p95 > 5min | warning |
| `QueueHighCompleteFailureRate` | complete 失败率 > 10% | warning |
| `QueueHighCancelRate` | 取消率 > 20% | warning |

#### Auth 认证

| 告警名 | 条件 | 严重度 |
| --- | --- | --- |
| `AuthFailuresSpike` | 认证失败 > 1/s 持续 2m | warning |

#### Circuit Breaker 熔断器

| 告警名 | 条件 | 严重度 |
| --- | --- | --- |
| `CircuitBreakerOpen` | 熔断器处于 open 状态 1m | critical |

#### DB 数据库

| 告警名 | 条件 | 严重度 |
| --- | --- | --- |
| `DBHighQueryLatency` | 查询 p95 延迟 > 1s | warning |
| `DBHighQueryErrorRate` | 查询错误率 > 5% | warning |
| `DBUnavailable` | 查询错误率 > 90% | critical |

#### 业务事件

| 告警名 | 条件 | 严重度 |
| --- | --- | --- |
| `SessionHighErrorCloseRate` | Session 错误关闭率 > 20% | warning |

### minio-alerts — MinIO 存储告警

| 告警名 | 条件 | 严重度 |
| --- | --- | --- |
| `MinIODown` | 服务不可达 30s | critical |
| `MinIODiskUsageHigh` | 磁盘使用 > 85% | warning |
| `MinIODiskUsageCritical` | 磁盘使用 > 95% | critical |
| `MinIOHighErrorRate` | S3 请求错误率 > 5% | warning |
| `MinIOHighLatency` | S3 p95 延迟 > 5s | warning |
| `MinIOOfflineNodes` | 有节点离线 | critical |
| `MinIOQuotaExceeded` | Bucket 使用 > 10GB | warning |

### oss3-alerts — OSS3 对象存储告警

| 告警名 | 条件 | 严重度 |
| --- | --- | --- |
| `OSS3EndpointDown` | S3 端点不可达 | critical |
| `OSS3HighUploadErrorRate` | 上传错误率 > 5% | warning |
| `OSS3HighDownloadLatency` | 下载 p95 > 5s | warning |
| `OSS3QuotaNearLimit` | 用户配额使用 > 90% | warning |
| `OSS3MultipartUploadBacklog` | 活跃分片上传 > 1000 | warning |
| `OSS3BackendError` | 后端错误率异常 | warning |

### infra-alerts — 基础设施告警

| 告警名 | 条件 | 严重度 |
| --- | --- | --- |
| `PostgresDown` | Server 不可达（可能依赖故障） | critical |
| `PrometheusTargetMissing` | 采集目标不可达 | warning |

## 配置

### 启用指标认证

生产环境中，`/metrics` 端点**必须**配置 Basic Auth，否则端点将被禁用：

```yaml
metrics:
  user: "admin"
  password: "${METRICS__PASSWORD}"  # 通过环境变量配置
```

> ⚠️ **生产环境强制认证**：未配置认证时，开发环境仍可按原样访问（兼容本地调试）；但生产环境将直接禁用 `/metrics` 端点，不再提供指标数据。

### 启用 Debug 端点认证

Debug 端点（pprof、goroutines）**默认禁用**（`enabled: false`）。如需启用，必须同时配置认证：

```yaml
debug:
  enabled: true          # 默认 false，需显式开启
  user: "admin"
  password: "${DEBUG__PASSWORD}"
```

> ⚠️ 生产环境未配置 debug 认证时将直接禁用 debug 端点。即使 `enabled: true`，缺少认证配置也会被关闭。

### 安全防护

Server 在生产环境自动启用以下安全防护措施：

| 防护机制 | 说明 |
| --- | --- |
| **OAuth2 IP 限流** | OAuth2 认证端点（`/oauth2/authorize`、`/oauth2/token`、`/oauth2/refresh`）实施每 IP 5 req/s 限流，突发上限 10，防止暴力攻击 |
| **HSTS 头** | 强制 HTTPS 传输，防止协议降级攻击 |
| **Permissions-Policy 头** | 限制浏览器 API 访问权限，缩小攻击面 |
| **Debug 端点默认禁用** | Debug 端点（pprof、goroutines）默认关闭，需显式开启并配置认证 |
| **Redirect URI 白名单** | 生产环境强制校验 OAuth2 redirect_uri 白名单，防止开放重定向攻击 |
| **OSS3 SecretAccessKey 静态加密** | 对象存储的 SecretAccessKey 在数据库中加密存储，防止明文泄露 |
| **Trusted Proxy 支持** | 支持配置可信代理，确保审计日志和限流正确识别客户端真实 IP |

### Alertmanager 集成

分布式部署已预配置 Alertmanager（端口 29093），告警规则通过 Prometheus 的 `rule_files` 加载。自定义告警规则请编辑 `etc/dev/prometheus/alerts.yml`。

## 下一步

- [分布式集群部署](/docs/deployment/distributed-deploy/) — 部署包含完整可观测性栈的分布式集群
- [Agent 与 LLM 可观测性](/docs/operations/agent-llm-observability/) — 深入了解 LLM 调用日志和 Token 消耗
- [Session 日志](/docs/operations/session-logs/) — Session 级别的结构化日志
- [HTTP API](/docs/protocol/http-api/) — 所有 HTTP 端点参考
