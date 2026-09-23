---
title: Realtime Communication Logs
description: Troubleshoot issues with WebSocket connections, Centrifuge events, RPC calls, and HTTP requests.
---

The realtime communication layer is built on Centrifuge for WebSocket bidirectional communication. All client interactions are handled through RPC Handlers. These logs cover connection management, RPC call chains, and HTTP requests.

## Log Events

### WebSocket Connections (Centrifuge)

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[Centrifuge] OnConnecting started` | Client initiates connection | `client_id`, `transport` |
| `[Centrifuge] OnConnecting succeeded` | Connection authentication successful | `client_id`, `user_id` |
| `[Centrifuge] JWT verification failed, rejecting connection` | JWT verification failed | `client_id`, `error` |
| `[Centrifuge] OnConnect started` | Connection established | `client_id` |
| `[Centrifuge] client connected` | Client connection ready | `client_id`, `user_id` |
| `[Centrifuge] OnConnect panic` | Connection handling exception | `panic`, `stack` |
| `CheckOrigin: origin allowed` | CORS check passed | `origin` |
| `CheckOrigin: origin NOT allowed` | CORS check rejected | `origin` |

### RPC Calls

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[RPC] ->` | RPC request received | `method`, `user`, `device` |
| `[RPC] <- ok` | RPC response successful | `method`, `elapsed` |
| `[RPC] <- err` | RPC response failed | `method`, `error`, `elapsed` |
| `[RPC] marshal response failed` | RPC response serialization failed | `method`, `error` |
| `RPC handler returned non-API error` | RPC handler returned unexpected error | `method`, `error` |

### HTTP Requests

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `HTTP request` | Request successful (2xx/3xx) | `method`, `path`, `status`, `duration`, `trace_id` |
| `HTTP request client error` | Client error (4xx) | `method`, `path`, `status`, `duration`, `trace_id`, `error_response` |
| `HTTP request failed` | Server error (5xx) | `method`, `path`, `status`, `duration`, `trace_id`, `error_response` |
| `WebSocket upgrade request completed` | WebSocket upgrade request | `method`, `path`, `duration`, `trace_id` |

### Health Checks

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `Readyz: DB check failed` | Database health check failed | `error` |
| `Readyz: Redis check failed` | Redis health check failed | `error` |
| `Readyz: Centrifuge check failed` | Centrifuge health check failed | `error` |
| `Readyz check failed` | Overall health check failed | `checks` |

### Authentication (OAuth2)

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `authorization_code authentication succeeded` | OAuth2 login successful | `provider`, `user_id` |
| `refresh_token refresh succeeded` | Token refresh successful | `user_id` |
| `ExchangeCode failed` | Authorization code exchange failed | `provider`, `error` |
| `findOrCreateUser: concurrent create detected` | Concurrent user creation conflict (auto-handled) | `provider`, `external_id` |

### PubSub Messages

| Event | Description |
|-------|-------------|
| `pubsub message missing meta/data separator` | PubSub message format anomaly |
| `pubsub message invalid meta format` | Metadata parsing failed |
| `failed to handle publication for channel` | Message handling failed |
| `failed to handle join for channel` | Join event handling failed |
| `failed to handle leave for channel` | Leave event handling failed |

### Update Publisher

| Event | Trigger | Key Fields |
|-------|---------|------------|
| `[UpdatePublisher] published update` | Update push successful | `channel`, `update_type` |
| `[UpdatePublisher] push failed` | Push failed (data already committed) | `error` |
| `[UpdatePublisher] publish to centrifuge failed` | Centrifuge publish failed | `error` |
| `[UpdatePublisher] saved user_updates` | User updates persisted | `count` |

## Loki Queries

### View WebSocket connection events

```logql
{service="server"} | json | msg=~"\\[Centrifuge\\] (OnConnecting|OnConnect|client connected|JWT verification failed)"
```

### Trace connection chain for a specific client

```logql
{service="server"} | json client_id="client_id" | msg=~"\\[Centrifuge\\]" | client_id="client-xyz"
```

### View connection authentication failures

```logql
{service="server"} | json | msg="[Centrifuge] JWT verification failed, rejecting connection"
```

### View users with the most active connections

```logql
topk(10, count by (user_id) ({service="server"} | json user_id="user_id" | msg="[Centrifuge] client connected"))
```

### Trace calls for a specific RPC method

```logql
{service="server"} | json method="method" | msg=~"\\[RPC\\] (->|<-)" | method="SendMessage"
```

### View RPC call duration distribution

```logql
{service="server"} | json elapsed="elapsed", method="method" | msg="[RPC] <- ok"
```

### View RPC errors

```logql
{service="server"} | json method="method", error="error" | msg="[RPC] <- err"
```

### View RPC error rate by method

```logql
topk(10,
  count by (method) ({service="server"} | json method="method" | msg="[RPC] <- err")
  /
  count by (method) ({service="server"} | json method="method" | msg=~"\\[RPC\\] <- (ok|err)")
)
```

### View slow RPC calls (elapsed > 1s)

```logql
{service="server"} | json elapsed="elapsed" | msg="[RPC] <- ok" | elapsed > 1000
```

### View 5xx errors

```logql
{service="server"} | json | msg="HTTP request failed"
```

### View requests for a specific path

```logql
{service="server"} | json path="path" | msg=~"HTTP request" | path=~"/api/.*"
```

### View request latency P95

```logql
{service="server"} | json duration="duration" | msg="HTTP request"
```

### View per-minute request volume by path

```logql
sum by (path) (count_over_time({service="server"} | json path="path" | msg="HTTP request"[1m]))
```

### View health check failures

```logql
{service="server"} | json | msg=~"Readyz.*failed"
```

### View authentication events

```logql
{service="server"} | json | msg=~"(authorization_code|refresh_token).*succeeded"
```

### View authentication failures

```logql
{service="server"} | json | msg=~"(ExchangeCode|failed to).*(failed|error)"
```

### View Update Publisher push failures

```logql
{service="server"} | json | msg=~"\\[UpdatePublisher\\].*failed"
```

### View PubSub message anomalies

```logql
{service="server"} | msg=~"pubsub message|failed to handle (publication|join|leave)"
```

### View CORS rejections

```logql
{service="server"} | json origin="origin" | msg="CheckOrigin: origin NOT allowed"
```

### Correlate request Traces

HTTP logs automatically include `trace_id`, which can be used with Tempo:

```logql
{service="server"} | json trace_id="trace_id", path="path" | msg="HTTP request failed" | trace_id="abc123"
```

## Prometheus Metrics

HTTP-related metrics are automatically exposed via middleware (standard Go HTTP metrics).

### Common PromQL

```promql
# HTTP request rate (by status code)
sum by (status) (rate(http_requests_total[5m]))

# HTTP request latency P95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

## Alert Rules

| Alert | Condition | Description |
|-------|-----------|-------------|
| High HTTP 5xx rate | 5xx request ratio > 1% | Server-side anomaly |
| High RPC error rate | RPC error rate > 5% | RPC handler anomaly |
| Health check failure | `Readyz check failed` persists | Dependency service unavailable |
| High WebSocket authentication failure rate | JWT verification failure rate > 10% | Possible attack or token expiration |
