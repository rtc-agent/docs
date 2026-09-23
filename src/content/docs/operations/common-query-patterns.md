---
title: 通用日志查询模式
description: 按日志级别、Trace ID、Session ID 等通用维度查询 server 日志，适用于所有模块的通用排查场景。
---

除了按业务模块查询，日常排查更多是按日志级别、Trace ID、Session ID 等通用维度进行过滤。本文档提供可直接复用的查询模板。

## 日志格式

所有日志均为 JSON 格式（zap JSON encoding），关键字段：

| 字段 | 说明 | 示例 |
|------|------|------|
| `level` | 日志级别 | `info`, `warn`, `error`, `debug`, `fatal` |
| `time` | ISO8601 时间戳 | `2026-09-22T05:33:26.910Z` |
| `msg` | 事件名称 | `[turnagent] turn.end`, `[RPC] ->` |
| `trace_id` | OpenTelemetry Trace ID（自动注入） | `463b28fa9fd2b71c0c6355247e80f045` |
| `span_id` | OpenTelemetry Span ID（自动注入） | `531f76a1dc491cce` |

## 按日志级别查询

### 查看所有 warn 日志

```logql
{service="server"} | json | level="warn"
```

### 查看所有 error 日志

```logql
{service="server"} | json | level="error"
```

### 查看所有 fatal 日志

```logql
{service="server"} | json | level="fatal"
```

### 查看 warn + error（排除 info 噪音）

```logql
{service="server"} | json | level=~"warn|error"
```

### 按分钟统计 error 日志速率

```logql
sum(count_over_time({service="server"} | json | level="error"[1m]))
```

### 按 msg 分组统计 error 日志 Top 10

```logql
topk(10,
  count by (msg) ({service="server"} | json msg="msg" | level="error")
)
```

### 查看最近 5 分钟的 error 日志（带详情）

```logql
{service="server"} | json | level="error"
```

在 Grafana Explore 中设置时间范围为 `now-5m` 即可。

## 按 Trace ID 查询

每条日志都自动包含 `trace_id` 和 `span_id`（来自 OpenTelemetry context），可以完整追踪一次请求的全链路。

### 通过 Trace ID 查询完整调用链

```logql
{service="server"} | json trace_id="trace_id" | trace_id="463b28fa9fd2b71c0c6355247e80f045"
```

### 从 error 日志中提取 Trace ID，再追踪全链路

1. 先找到 error：
```logql
{service="server"} | json trace_id="trace_id", msg="msg" | level="error"
```

2. 取到 `trace_id` 后，查完整链路：
```logql
{service="server"} | json trace_id="trace_id" | trace_id="<从上面获取的值>"
```

### 跨服务追踪

同一个 `trace_id` 在多个服务间共享。在 Grafana Tempo 中搜索 `trace_id` 可以看到完整的跨服务调用链（HTTP → RPC → Agent → LLM）。

### 追踪某个 RPC 请求的完整日志

从 RPC 日志开始，取 `trace_id`：

```logql
{service="server"} | json trace_id="trace_id", method="method" | msg="[RPC] ->" | method="v1.rtc.submit_result"
```

然后用取到的 `trace_id` 查完整链路：

```logql
{service="server"} | json trace_id="trace_id" | trace_id="e6518062ef5d54ff05961e2a48d3e3c0"
```

## 按 Session ID 查询

`session_id` 是业务维度的核心关联字段。

### 查看某个 Session 的所有日志

```logql
{service="server"} | json session_id="session_id" | session_id="01a0c796-1ecc-72c9-80b9-b214e6ef6d68"
```

### 查看某个 Session 的 error 日志

```logql
{service="server"} | json session_id="session_id" | level="error" | session_id="01a0c796-1ecc-72c9-80b9-b214e6ef6d68"
```

### 查看某个 Session 的所有 warn/error

```logql
{service="server"} | json session_id="session_id" | level=~"warn|error" | session_id="01a0c796-1ecc-72c9-80b9-b214e6ef6d68"
```

### 按 Session 统计 error 数量 Top 10

```logql
topk(10,
  count by (session_id) ({service="server"} | json session_id="session_id" | level="error")
)
```

## 按 Turn ID 查询

`turn_id` 用于追踪单次 Turn 执行的全链路。

### 查看某个 Turn 的所有日志

```logql
{service="server"} | json turn_id="turn_id" | turn_id="01a0c79c-adbb-73ae-818d-9c2b5b95cb5f"
```

### 查看某个 Turn 的执行耗时

```logql
{service="server"} | json turn_id="turn_id", duration_ms="duration_ms" | msg="[turnagent] turn.end" | turn_id="01a0c79c-adbb-73ae-818d-9c2b5b95cb5f"
```

## 按 User ID 查询

### 查看某个用户的所有操作

```logql
{service="server"} | json user="user" | user="01a09047-0f11-7c36-8e08-74e6726fbbd3"
```

### 查看某个用户的 error

```logql
{service="server"} | json user="user" | level="error" | user="01a09047-0f11-7c36-8e08-74e6726fbbd3"
```

## 按时间范围 + 关键词组合

### 查找某个时间段内包含特定关键词的日志

```logql
{service="server"} |= "timeout" | json
```

### 查找包含特定 error message 的日志

```logql
{service="server"} |= "connection refused" | json | level="error"
```

### 排除特定噪音日志

```logql
{service="server"} | json | level="warn" | msg !~ "non-fatal|best effort"
```

## 组合查询模板

### 排查用户问题：按 Session + 时间 + 级别

```logql
{service="server"} | json session_id="session_id", msg="msg" | level=~"warn|error" | session_id="<session-id>"
```

### 排查工具调用失败：按 Session + 关键词

```logql
{service="server"} | json session_id="session_id" | level="warn" | msg=~"tool\\.call_failed|script.*failed" | session_id="<session-id>"
```

### 排查 LLM 异常：按 Session + Token 相关

```logql
{service="server"} | json session_id="session_id" | msg=~"llm\\.complete|llm\\.http\\.error|token_callback" | session_id="<session-id>"
```

### 排查 RTC 全链路：从 Trace ID 追踪

```logql
{service="server"} | json trace_id="trace_id", msg="msg" | trace_id="<trace-id>" | line_format "{{.msg}} | {{.level}}"
```

### 全局健康概览：最近 15 分钟 error 按模块分组

```logql
sum by (msg) (count_over_time({service="server"} | json msg="msg" | level="error"[15m]))
```

## Grafana Explore 技巧

### 使用日志格式化

在 Grafana Explore 中使用 `line_format` 简化输出：

```logql
{service="server"} | json | level="error" | line_format "{{.time}} [{{.level}}] {{.msg}} | session={{.session_id}} | error={{.error}}"
```

### 使用 label_format 提取新标签

```logql
{service="server"}
| json
| label_format level="{{.level}}"
| level="error"
```

### 结合 Tempo 查看 Trace

在 Grafana 中，从 Loki 日志的 `trace_id` 字段可以直接点击跳转到 Tempo 查看完整分布式追踪链路。

## 本地调试日志

开发环境下，日志同时写入 `logs/debug.log`（console 格式，更易读）：

```bash
# 实时查看 error 日志
tail -f logs/debug.log | grep '"level":"error"'

# 按 session_id 过滤
tail -f logs/debug.log | grep '<session-id>'

# 按 trace_id 过滤
tail -f logs/debug.log | grep '<trace-id>'

# 按关键词过滤
tail -f logs/debug.log | grep 'timeout\|failed\|error'
```

LLM 完整请求/响应日志在 `logs/llm-payload.log`：

```bash
# 查看 LLM 请求错误
tail -f logs/llm-payload.log | grep 'llm.http.error'

# 查看特定 URL 的请求
tail -f logs/llm-payload.log | grep 'api.anthropic.com'
```
