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

### Turn 执行指标 (rtc_turn_*)

追踪 Turn（AI 推理轮次）的执行情况。

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_turn_total` | Counter | `work_kind`, `status` | Turn 执行总数（按工作类型和状态分布） |
| `rtc_turn_duration_seconds` | Histogram | — | Turn 执行耗时分布（桶：0.1s ~ 204.8s） |

> 💡 Turn 是 AI 推理的一个完整轮次（从 LLM 调用到工具执行完成）。`work_kind` 区分不同的工作类型，`status` 区分成功/失败。

### LLM 调用指标 (rtc_llm_*)

追踪 LLM API 调用和 Token 消耗。

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_llm_tokens_total` | Counter | `model`, `type` (input/output) | LLM Token 消耗总数 |
| `rtc_llm_request_duration_seconds` | Histogram | — | LLM API 请求耗时分布（桶：0.5s ~ 256s） |
| `rtc_llm_http_requests_total` | Counter | — | LLM HTTP 请求总数 |
| `rtc_llm_http_request_duration_seconds` | Histogram | — | LLM HTTP 请求耗时分布 |
| `rtc_llm_http_tokens_total` | Counter | — | LLM HTTP 传输 Token 总数 |

> 💡 `rtc_llm_tokens_total` 是成本核算的核心指标。`type` 标签区分 input token 和 output token，结合 `model` 标签可计算各模型的消耗占比。

### 中断指标 (rtc_interrupt_*)

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_interrupt_total` | Counter | `reason` | 中断总数（按原因分布） |

### Checkpoint 指标 (rtc_checkpoint_*)

追踪 RTC Checkpoint 的存取操作。

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_checkpoint_operations_total` | Counter | — | Checkpoint 操作总数（保存/恢复） |
| `rtc_checkpoint_data_bytes` | Counter | — | Checkpoint 数据量（字节） |

### 附件处理指标 (rtc_attachment_*)

追踪多模态附件（图片、文本文件）的处理情况。

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_attachment_tokens_total` | Counter | — | 附件 Token 消耗总数（图片 base64 编码后注入 LLM 的 token） |
| `rtc_attachment_build_duration_seconds` | Histogram | — | 附件构建耗时分布 |
| `rtc_attachment_operations_total` | Counter | — | 附件操作总数 |
| `rtc_attachment_budget_truncated_total` | Counter | — | 附件 Token 预算截断总数（超出预算时被裁剪的附件） |

### Script 执行指标 (rtc_script_*)

追踪脚本执行的情况。

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_script_executions_total` | Counter | — | 脚本执行总数 |
| `rtc_script_execution_duration_seconds` | Histogram | — | 脚本执行耗时分布 |
| `rtc_script_result_size_bytes` | Histogram | — | 脚本执行结果大小分布 |
| `rtc_script_code_size_bytes` | Histogram | — | 脚本代码大小分布 |

> 💡 Script 指标与 [Script 可观测性](/docs/operations/script-observability/) 日志互补——指标用于趋势监控，日志用于详细排查。

### 恢复指标 (rtc_recovery_*)

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_recovery_stale_turns_recovered_total` | Counter | — | 过时 Turn 恢复总数（服务端重启后自动恢复的卡死 Turn） |

### 限流指标 (rtc_ratelimit_*, rtc_ip_ratelimit_*)

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_ratelimit_rejected_total` | Counter | — | OAuth2 限流拒绝总数 |
| `rtc_ip_ratelimit_rejected_total` | Counter | — | IP 限流拒绝总数 |

> 💡 限流指标突增可能表示遭受暴力攻击或客户端行为异常。

### Goroutine 状态指标

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_goroutines_by_state` | Gauge | `state` (running/runnable/syscall/waiting 等) | 按状态分布的 Goroutine 数量（每 10 秒采样） |

> 💡 与 `go_goroutines`（总数）互补，此指标帮助定位 Goroutine 泄漏的具体状态——例如大量 `waiting` 通常表示锁竞争或 IO 阻塞。

### OSS3 对象存储指标 (rtc_oss3_*)

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_oss3_requests_total` | Counter | `operation` (PutObject/GetObject/...), `status` | S3 请求总数 |
| `rtc_oss3_request_duration_seconds` | Histogram | `operation` | S3 请求耗时分布 |
| `rtc_oss3_quota_usage_bytes` | Gauge | — | 当前配额使用量（字节） |
| `rtc_oss3_multipart_uploads_active` | Gauge | — | 活跃的分片上传数 |
| `rtc_oss3_backend_errors_total` | Counter | `operation`, `error_type` | 后端（MinIO）错误总数 |
| `rtc_oss3_upload_bytes_total` | Counter | `bucket` | 上传字节总数（按存储桶） |
| `rtc_oss3_download_bytes_total` | Counter | `bucket` | 下载字节总数（按存储桶） |
| `rtc_oss3_instant_upload_total` | Counter | `type` (db_hit/minio_repair/multipart) | 即时上传命中总数（按类型） |
| `rtc_oss3_instant_upload_repair_error_total` | Counter | — | 即时上传 DB 修复失败总数 |
| `rtc_oss3_consistency_violation_total` | Counter | `type` (db_has_minio_missing/minio_has_db_missing) | DB/MinIO 一致性违反总数 |
| `rtc_oss3_orphaned_record_total` | Counter | `operation` (delete_failed/copy_failed) | 孤立记录总数（后端已删除但 DB 删除失败） |
| `rtc_oss3_orphaned_quota_commits_total` | Counter | — | 孤立配额提交总数（上传成功但配额提交失败，需对账） |
| `rtc_oss3_quota_commit_retry_total` | Counter | — | 配额提交重试总数（Redis 瞬时错误） |

> 💡 OSS3 指标覆盖了对象存储的完整生命周期，包括请求统计、配额管理、即时上传优化、一致性检查和错误追踪。`instant_upload` 指标帮助评估去重优化效果，`consistency_violation` 指标用于监控 DB 和 MinIO 之间的数据一致性。

### HTTP 指标

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `http_requests_total` | Counter | `code`, `method` | HTTP 请求总数（含状态码） |
| `http_request_duration_seconds` | Histogram | — | HTTP 请求耗时分布 |
| `http_request_size_bytes` | Histogram | — | HTTP 请求体大小分布 |
| `http_response_size_bytes` | Histogram | — | HTTP 响应体大小分布 |
| `http_in_flight_requests` | Gauge | — | 当前正在处理的 HTTP 请求数 |

### WebFetch 指标 (rtc_agent_webfetch_*)

追踪内置 WebFetch 工具（网页抓取）的请求情况。

| 指标名 | 类型 | 标签 | 说明 |
| --- | --- | --- | --- |
| `rtc_agent_webfetch_requests_total` | Counter | `status` | WebFetch 请求总数 |
| `rtc_agent_webfetch_errors_total` | Counter | `error_type` | WebFetch 错误总数 |
| `rtc_agent_webfetch_duration_seconds` | Histogram | `domain_type` | WebFetch 请求耗时分布 |
| `rtc_agent_webfetch_cache_hits_total` | Counter | — | WebFetch 缓存命中总数 |
| `rtc_agent_webfetch_cache_misses_total` | Counter | — | WebFetch 缓存未命中总数 |

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
| **RTC Agent** | 核心业务仪表盘 | Session 活跃数、Turn 执行（耗时/成功率）、LLM 调用（Token 消耗/请求耗时/HTTP 传输）、Script 执行（次数/耗时/结果大小）、Interrupt/Checkpoint/Attachment 指标、恢复统计；WebSocket/Centrifuge 连接与 RPC 监控、Queue 生命周期、认证与安全、限流统计、熔断器状态、Goroutine 状态分布、数据库查询、业务事件（Session/消息） |
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
