---
title: API 参考
description: Admin 服务的完整 API 端点参考
---

# API 参考

本文档列出 Admin 服务的所有 HTTP API 端点。

## 基础信息

- **Base URL**: `http://localhost:28081/api`
- **认证**: Bearer Token（JWT）
- **Content-Type**: `application/json`

## 响应格式

### 成功响应

```json
{
  "success": true,
  "data": { ... }
}
```

### 错误响应

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message"
}
```

### 分页响应

```json
{
  "success": true,
  "data": {
    "list": [ ... ],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

## 认证 API

### 发送 OTP 验证码

```http
POST /api/auth/otp/send
Content-Type: application/json

{
  "email": "admin@example.com"
}
```

**响应**：
```json
{
  "success": true,
  "message": "Verification code sent"
}
```

**错误**：
| 错误码 | 说明 |
|--------|------|
| `invalid_email` | 邮箱格式无效 |
| `email_not_registered` | 邮箱未注册 |
| `rate_limited` | 请求过于频繁 |
| `cooldown_not_elapsed` | 发送冷却时间未结束 |

### 验证 OTP 并登录

```http
POST /api/auth/otp/verify
Content-Type: application/json

{
  "email": "admin@example.com",
  "code": "123456"
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJSUzI1NiIs...",
    "expires_in": 3600
  }
}
```

**错误**：
| 错误码 | 说明 |
|--------|------|
| `invalid_code` | 验证码错误 |
| `code_expired` | 验证码已过期 |
| `account_locked` | 账户已锁定 |
| `max_attempts_exceeded` | 超过最大验证次数 |

### 刷新 Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "expires_in": 3600
  }
}
```

### 登出

```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

**响应**：
```json
{
  "success": true
}
```

### 获取当前用户信息

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "admin@example.com",
    "name": "管理员",
    "roles": [
      { "id": "role-uuid", "name": "admin", "code": "admin" }
    ]
  }
}
```

## 管理员用户 API

### 创建管理员

```http
POST /api/admin/users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "name": "新管理员",
  "role_ids": ["role-uuid"]
}
```

**权限**: `admin:write`

### 管理员列表

```http
GET /api/admin/users?page=1&page_size=20
Authorization: Bearer <access_token>
```

**权限**: `admin:read`

### 管理员详情

```http
GET /api/admin/users/:id
Authorization: Bearer <access_token>
```

**权限**: `admin:read`

### 更新管理员

```http
PUT /api/admin/users/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "新名称",
  "role_ids": ["role-uuid"]
}
```

**权限**: `admin:write`

### 删除管理员

```http
DELETE /api/admin/users/:id
Authorization: Bearer <access_token>
```

**权限**: `admin:delete`

## 角色管理 API

### 创建角色

```http
POST /api/admin/roles
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "自定义角色",
  "code": "custom_role",
  "description": "角色描述"
}
```

**权限**: `role:write`

### 角色列表

```http
GET /api/admin/roles
Authorization: Bearer <access_token>
```

**权限**: `role:read`

### 角色详情

```http
GET /api/admin/roles/:id
Authorization: Bearer <access_token>
```

**权限**: `role:read`

### 更新角色

```http
PUT /api/admin/roles/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "新角色名称",
  "description": "新描述"
}
```

**权限**: `role:write`

### 删除角色

```http
DELETE /api/admin/roles/:id
Authorization: Bearer <access_token>
```

**权限**: `role:delete`

### 获取角色权限

```http
GET /api/admin/roles/:id/permissions
Authorization: Bearer <access_token>
```

**权限**: `role:read`

### 设置角色权限

```http
PUT /api/admin/roles/:id/permissions
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "permissions": [
    { "object": "users", "action": "read" },
    { "object": "users", "action": "write" }
  ]
}
```

**权限**: `role:write`

## 用户角色分配 API

### 分配用户角色

```http
POST /api/admin/users/:id/roles
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "role_ids": ["role-uuid-1", "role-uuid-2"]
}
```

**权限**: `admin:write`

### 获取用户角色

```http
GET /api/admin/users/:id/roles
Authorization: Bearer <access_token>
```

**权限**: `admin:read`

## RTC 用户 API

### RTC 用户列表

```http
GET /api/rtc-users?page=1&page_size=20
Authorization: Bearer <access_token>
```

**权限**: `user:read`

### RTC 用户详情

```http
GET /api/rtc-users/:id
Authorization: Bearer <access_token>
```

**权限**: `user:read`

### 封禁用户

```http
POST /api/rtc-users/:id/ban
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "违反服务条款",
  "duration": 86400
}
```

**权限**: `user:write`

**参数**：
- `reason`：封禁原因
- `duration`：封禁时长（秒），不传表示永久封禁

### 解封用户

```http
POST /api/rtc-users/:id/unban
Authorization: Bearer <access_token>
```

**权限**: `user:write`

### 获取用户设备

```http
GET /api/rtc-users/:id/devices
Authorization: Bearer <access_token>
```

**权限**: `user:read`

### 删除用户设备

```http
DELETE /api/rtc-users/:user_id/devices/:device_id
Authorization: Bearer <access_token>
```

**权限**: `user:write`

## 会话管理 API

### 会话列表

```http
GET /api/rtc-sessions?user_id=:user_id&page=1&page_size=20
Authorization: Bearer <access_token>
```

**权限**: `session:read`

### 会话详情

```http
GET /api/rtc-sessions/:id
Authorization: Bearer <access_token>
```

**权限**: `session:read`

### 删除会话

```http
DELETE /api/rtc-sessions/:id
Authorization: Bearer <access_token>
```

**权限**: `session:delete`

## 消息管理 API

### 消息列表

```http
GET /api/rtc-messages?session_id=:session_id&page=1&page_size=50
Authorization: Bearer <access_token>
```

**权限**: `message:read`

## 系统配置 API

### 列出所有配置

```http
GET /api/server-configs
Authorization: Bearer <access_token>
```

**权限**: `config:read`

### 获取单个配置

```http
GET /api/server-configs/:key
Authorization: Bearer <access_token>
```

**权限**: `config:read`

### 更新配置

```http
PUT /api/server-configs/:key
Authorization: Bearer <access_token>
Content-Type: application/json
If-Match: "2024-01-01T00:00:00Z"

{
  "value": "new-value"
}
```

**权限**: `config:write`

**乐观锁**：使用 `If-Match` 头传入 `updated_at` 值防止并发冲突

### 删除配置覆盖

```http
DELETE /api/server-configs/:key
Authorization: Bearer <access_token>
```

**权限**: `config:write`

## 用户配置 API

### 获取用户配置

```http
GET /api/user-configs?user_id=:user_id
Authorization: Bearer <access_token>
```

**权限**: `config:read`

### 设置用户配置

```http
PUT /api/user-configs/:key
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "user_id": "user-uuid",
  "value": "custom-value"
}
```

**权限**: `config:write`

### 删除用户配置

```http
DELETE /api/user-configs/:key?user_id=:user_id
Authorization: Bearer <access_token>
```

**权限**: `config:write`

## 审计日志 API

### 审计日志列表

```http
GET /api/audit-logs?page=1&page_size=20&resource=config
Authorization: Bearer <access_token>
```

**权限**: `audit:read`

**查询参数**：
- `resource`：资源类型（可选）
- `resource_id`：资源 ID（可选）
- `user_id`：操作用户 ID（可选）
- `action`：操作类型（可选）

## 可观测性代理 API

### Prometheus 代理

```http
GET /api/metrics/query?query=up
Authorization: Bearer <access_token>
```

**权限**: `metrics:read`

### Grafana 代理

```http
GET /api/grafana/d/rtc-agent/rtc-agent
Authorization: Bearer <access_token>
```

**权限**: `metrics:read`

### Jaeger 代理

```http
GET /api/jaeger/search?service=rtc-agent
Authorization: Bearer <access_token>
```

**权限**: `tracing:read`

### Pyroscope 代理

```http
GET /api/pyroscope/
Authorization: Bearer <access_token>
```

**权限**: `profiling:read`

## 健康检查

### 就绪检查

```http
GET /ready
```

**无需认证**

**正常响应**：
```json
{ "status": "ready" }
```

**降级响应**：
```json
{
  "status": "degraded",
  "error": "bootstrap failed — default roles may be missing"
}
```

## 权限矩阵

| 资源 | Action | 权限代码 |
|------|--------|----------|
| 管理员 | read | `admin:read` |
| 管理员 | write | `admin:write` |
| 管理员 | delete | `admin:delete` |
| 角色 | read | `role:read` |
| 角色 | write | `role:write` |
| 角色 | delete | `role:delete` |
| RTC 用户 | read | `user:read` |
| RTC 用户 | write | `user:write` |
| 会话 | read | `session:read` |
| 会话 | delete | `session:delete` |
| 消息 | read | `message:read` |
| 配置 | read | `config:read` |
| 配置 | write | `config:write` |
| 审计 | read | `audit:read` |
| 指标 | read | `metrics:read` |
| 追踪 | read | `tracing:read` |
| 剖析 | read | `profiling:read` |

## 错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `unauthorized` | 401 | 未认证或 Token 无效 |
| `forbidden` | 403 | 无权限访问 |
| `not_found` | 404 | 资源不存在 |
| `conflict` | 409 | 资源冲突（如乐观锁冲突） |
| `validation_error` | 422 | 请求参数验证失败 |
| `rate_limited` | 429 | 请求过于频繁 |
| `internal_error` | 500 | 服务器内部错误 |

## 相关文档

- [Admin 服务概述](/admin/overview/)
- [管理员认证](/admin/auth/)
- [用户管理](/admin/user-management/)
- [系统配置](/admin/system-config/)
