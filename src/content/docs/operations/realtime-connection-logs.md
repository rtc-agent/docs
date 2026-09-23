---
title: 实时通信日志
description: 排查 WebSocket 连接、Centrifuge 事件、RPC 调用和 HTTP 请求中的问题。
---

实时通信层基于 Centrifuge 实现 WebSocket 双向通信，所有客户端交互通过 RPC Handler 处理。这些日志覆盖连接管理、RPC 调用链路和 HTTP 请求。

## 日志事件

### WebSocket 连接（Centrifuge）

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[Centrifuge] OnConnecting started` | 客户端发起连接 | `client_id`, `transport` |
| `[Centrifuge] OnConnecting succeeded` | 连接认证成功 | `client_id`, `user_id` |
| `[Centrifuge] JWT verification failed, rejecting connection` | JWT 验证失败 | `client_id`, `error` |
| `[Centrifuge] OnConnect started` | 连接建立 | `client_id` |
| `[Centrifuge] client connected` | 客户端连接就绪 | `client_id`, `user_id` |
| `[Centrifuge] OnConnect panic` | 连接处理异常 | `panic`, `stack` |
| `CheckOrigin: origin allowed` | CORS 检查通过 | `origin` |
| `CheckOrigin: origin NOT allowed` | CORS 检查拒绝 | `origin` |

### RPC 调用

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[RPC] ->` | RPC 请求接收 | `method`, `user`, `device` |
| `[RPC] <- ok` | RPC 响应成功 | `method`, `elapsed` |
| `[RPC] <- err` | RPC 响应失败 | `method`, `error`, `elapsed` |
| `[RPC] marshal response failed` | RPC 响应序列化失败 | `method`, `error` |
| `RPC handler returned non-API error` | RPC 处理器返回非预期错误 | `method`, `error` |

### HTTP 请求

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `HTTP request` | 请求成功（2xx/3xx） | `method`, `path`, `status`, `duration`, `trace_id` |
| `HTTP request client error` | 客户端错误（4xx） | `method`, `path`, `status`, `duration`, `trace_id`, `error_response` |
| `HTTP request failed` | 服务端错误（5xx） | `method`, `path`, `status`, `duration`, `trace_id`, `error_response` |
| `WebSocket upgrade request completed` | WebSocket 升级请求 | `method`, `path`, `duration`, `trace_id` |

### 健康检查

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `Readyz: DB check failed` | 数据库健康检查失败 | `error` |
| `Readyz: Redis check failed` | Redis 健康检查失败 | `error` |
| `Readyz: Centrifuge check failed` | Centrifuge 健康检查失败 | `error` |
| `Readyz check failed` | 整体健康检查失败 | `checks` |

### 认证（OAuth2）

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `authorization_code authentication succeeded` | OAuth2 登录成功 | `provider`, `user_id` |
| `refresh_token refresh succeeded` | Token 刷新成功 | `user_id` |
| `ExchangeCode failed` | 授权码交换失败 | `provider`, `error` |
| `findOrCreateUser: concurrent create detected` | 并发创建用户冲突（已自动处理） | `provider`, `external_id` |

### PubSub 消息

| 事件 | 说明 |
|------|------|
| `pubsub message missing meta/data separator` | PubSub 消息格式异常 |
| `pubsub message invalid meta format` | 元数据解析失败 |
| `failed to handle publication for channel` | 消息处理失败 |
| `failed to handle join for channel` | Join 事件处理失败 |
| `failed to handle leave for channel` | Leave 事件处理失败 |

### Update Publisher

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `[UpdatePublisher] published update` | 更新推送成功 | `channel`, `update_type` |
| `[UpdatePublisher] push failed` | 推送失败（数据已提交） | `error` |
| `[UpdatePublisher] publish to centrifuge failed` | Centrifuge 发布失败 | `error` |
| `[UpdatePublisher] saved user_updates` | 用户更新持久化 | `count` |

## Loki 查询

### 查看 WebSocket 连接事件

```logql
{service="server"} | json | msg=~"\\[Centrifuge\\] (OnConnecting|OnConnect|client connected|JWT verification failed)"
```

### 追踪某个客户端的连接链路

```logql
{service="server"} | json client_id="client_id" | msg=~"\\[Centrifuge\\]" | client_id="client-xyz"
```

### 查看连接认证失败

```logql
{service="server"} | json | msg="[Centrifuge] JWT verification failed, rejecting connection"
```

### 查看活跃连接数最多的用户

```logql
topk(10, count by (user_id) ({service="server"} | json user_id="user_id" | msg="[Centrifuge] client connected"))
```

### 追踪某个 RPC 方法的调用

```logql
{service="server"} | json method="method" | msg=~"\\[RPC\\] (->|<-)" | method="SendMessage"
```

### 查看 RPC 调用耗时分布

```logql
{service="server"} | json elapsed="elapsed", method="method" | msg="[RPC] <- ok"
```

### 查看 RPC 错误

```logql
{service="server"} | json method="method", error="error" | msg="[RPC] <- err"
```

### 按方法统计 RPC 错误率

```logql
topk(10,
  count by (method) ({service="server"} | json method="method" | msg="[RPC] <- err")
  /
  count by (method) ({service="server"} | json method="method" | msg=~"\\[RPC\\] <- (ok|err)")
)
```

### 查看慢 RPC 调用（elapsed > 1s）

```logql
{service="server"} | json elapsed="elapsed" | msg="[RPC] <- ok" | elapsed > 1000
```

### 查看 5xx 错误

```logql
{service="server"} | json | msg="HTTP request failed"
```

### 查看特定路径的请求

```logql
{service="server"} | json path="path" | msg=~"HTTP request" | path=~"/api/.*"
```

### 查看请求延迟 P95

```logql
{service="server"} | json duration="duration" | msg="HTTP request"
```

### 按路径统计每分钟请求量

```logql
sum by (path) (count_over_time({service="server"} | json path="path" | msg="HTTP request"[1m]))
```

### 查看健康检查失败

```logql
{service="server"} | json | msg=~"Readyz.*failed"
```

### 查看认证事件

```logql
{service="server"} | json | msg=~"(authorization_code|refresh_token).*succeeded"
```

### 查看认证失败

```logql
{service="server"} | json | msg=~"(ExchangeCode|failed to).*(failed|error)"
```

### 查看 Update Publisher 推送失败

```logql
{service="server"} | json | msg=~"\\[UpdatePublisher\\].*failed"
```

### 查看 PubSub 消息异常

```logql
{service="server"} | msg=~"pubsub message|failed to handle (publication|join|leave)"
```

### 查看 CORS 拒绝

```logql
{service="server"} | json origin="origin" | msg="CheckOrigin: origin NOT allowed"
```

### 关联请求 Trace

HTTP 日志自动包含 `trace_id`，可与 Tempo 联动：

```logql
{service="server"} | json trace_id="trace_id", path="path" | msg="HTTP request failed" | trace_id="abc123"
```

## Prometheus 指标

HTTP 相关指标通过中间件自动暴露（标准 Go HTTP metrics）。

### 常用 PromQL

```promql
# HTTP 请求速率（按状态码）
sum by (status) (rate(http_requests_total[5m]))

# HTTP 请求延迟 P95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

## 告警规则

| 告警 | 条件 | 说明 |
|------|------|------|
| HTTP 5xx 率过高 | 5xx 请求占比 > 1% | 服务端异常 |
| RPC 错误率过高 | RPC 错误率 > 5% | RPC 处理器异常 |
| 健康检查失败 | `Readyz check failed` 持续出现 | 依赖服务不可用 |
| WebSocket 认证失败率高 | JWT 验证失败率 > 10% | 可能遭遇攻击或 Token 过期 |
