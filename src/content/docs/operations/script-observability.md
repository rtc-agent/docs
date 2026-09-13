---
title: Script 可观测性
description: 通过 Loki 日志、Prometheus 指标和 Grafana 面板监控 Script 工具的执行状态。
---

Script 工具每次执行都会产生结构化日志和指标数据，支持通过 Grafana 实时监控和 Loki 查询排查问题。

## 日志事件

每次 Script 执行产生两个日志事件：

| 事件 | 触发时机 | 关键字段 |
|------|---------|---------|
| `script.execution_started` | RTC 创建时（脚本执行前） | `rtc_id`, `session_id`, `title`, `action`, `name` |
| `script.execution_completed` | 结果提交后（脚本执行后） | `rtc_id`, `session_id`, `title`, `action`, `status`, `duration_ms`, `result_size`, `code_size` |

日志格式为 JSON（zap JSON encoding），通过 Promtail 采集到 Loki。

## Loki 查询

在 Grafana Explore 页面（Data source: Loki）或 Logs Dashboard 中使用以下查询：

### 查看所有 Script 执行事件

```logql
{service="server"} | json | msg=~"script\\.execution_(started|completed)"
```

### 只看执行完成的事件

```logql
{service="server"} | json | msg="script.execution_completed"
```

### 提取关键字段

```logql
{service="server"} | json title="title", action="action", status="status", duration_ms="duration_ms" | msg="script.execution_completed"
```

### 只看失败的执行

```logql
{service="server"} | json status="status" | msg="script.execution_completed" | status="failed"
```

### 按 action 统计每分钟执行次数

```logql
sum(count_over_time({service="server"} | json | msg="script.execution_completed"[1m])) by (action)
```

### 查找特定 title 的执行

```logql
{service="server"} | json title="title" | msg="script.execution_completed" | title="分析销售数据趋势"
```

### 查看 started 和 completed 配对（排查超时）

```logql
{service="server"} | json | msg=~"script\\.execution_(started|completed)"
```

按 `rtc_id` 排序，如果有 `started` 但没有对应的 `completed`，说明执行异常。

## Prometheus 指标

| 指标 | 类型 | Labels | 用途 |
|------|------|--------|------|
| `rtc_script_executions_total` | Counter | `action`, `status` | 执行次数统计、成功率计算 |
| `rtc_script_execution_duration_seconds` | Histogram | `action` | 执行耗时分布（P50/P95/P99） |
| `rtc_script_result_size_bytes` | Histogram | `action` | 结果大小分布 |
| `rtc_script_code_size_bytes` | Histogram | `action` | 代码大小分布 |

### 常用 PromQL

```promql
# 执行速率（按 action 和 status）
sum by (action, status) (rate(rtc_script_executions_total[5m]))

# 执行延迟 P95
histogram_quantile(0.95, sum(rate(rtc_script_execution_duration_seconds_bucket[5m])) by (le))

# 错误率
sum(rate(rtc_script_executions_total{status="failed"}[5m])) / sum(rate(rtc_script_executions_total[5m]))
```

## Grafana Dashboard

### Script 执行面板

主 Dashboard（`rtc-agent.json`）包含 "Script 执行" Row，提供 6 个面板：

| 面板 | 说明 |
|------|------|
| 执行速率 | 按 action + status 分组的实时速率 |
| 执行延迟 | P50 / P95 / P99 延迟趋势 |
| 错误率 | 失败占比（阈值：5% 黄色，10% 红色） |
| 结果大小 P95 | 返回数据体积趋势 |
| 代码大小 P95 | 输入代码体积趋势 |
| 累计执行次数 | 按 action 分组的总执行数 |

### 日志面板

Logs Dashboard（`logs.json`）包含 "Script 执行日志" 面板，预配置了 Loki 查询，直接展示 `script.execution_started` 和 `script.execution_completed` 事件。

## 告警规则

| 告警 | 条件 | 持续时间 | 严重性 |
|------|------|---------|--------|
| `ScriptExecutionHighErrorRate` | 失败率 > 10% | 2 分钟 | warning |
| `ScriptExecutionSlow` | P95 延迟 > 30s | 5 分钟 | warning |

告警规则定义在 `server/etc/dev/prometheus/alerts.yml`。
