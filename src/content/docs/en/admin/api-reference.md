---
title: API Reference
description: Complete API endpoint reference for Admin service
---

# API Reference

This document lists all HTTP API endpoints for the Admin service.

## Base Information

- **Base URL**: `http://localhost:28081/api`
- **Authentication**: Bearer Token (JWT)
- **Content-Type**: `application/json`

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": "error_code",
  "message": "Human-readable error message"
}
```

### Paginated Response

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

## Authentication API

### Send OTP Code

```http
POST /api/auth/otp/send
Content-Type: application/json

{
  "email": "admin@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Verification code sent"
}
```

**Errors**:
| Error Code | Description |
|------------|-------------|
| `invalid_email` | Invalid email format |
| `email_not_registered` | Email not registered |
| `rate_limited` | Too many requests |
| `cooldown_not_elapsed` | Send cooldown not elapsed |

### Verify OTP and Login

```http
POST /api/auth/otp/verify
Content-Type: application/json

{
  "email": "admin@example.com",
  "code": "123456"
}
```

**Response**:
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

**Errors**:
| Error Code | Description |
|------------|-------------|
| `invalid_code` | Invalid verification code |
| `code_expired` | Code expired |
| `account_locked` | Account locked |
| `max_attempts_exceeded` | Max verification attempts exceeded |

### Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJSUzI1NiIs..."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIs...",
    "expires_in": 3600
  }
}
```

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "success": true
}
```

### Get Current User Info

```http
GET /api/auth/me
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "admin@example.com",
    "name": "Admin",
    "roles": [
      { "id": "role-uuid", "name": "admin", "code": "admin" }
    ]
  }
}
```

## Admin User API

### Create Admin

```http
POST /api/admin/users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "name": "New Admin",
  "role_ids": ["role-uuid"]
}
```

**Permission**: `admin:write`

### Admin List

```http
GET /api/admin/users?page=1&page_size=20
Authorization: Bearer <access_token>
```

**Permission**: `admin:read`

### Admin Details

```http
GET /api/admin/users/:id
Authorization: Bearer <access_token>
```

**Permission**: `admin:read`

### Update Admin

```http
PUT /api/admin/users/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "New Name",
  "role_ids": ["role-uuid"]
}
```

**Permission**: `admin:write`

### Delete Admin

```http
DELETE /api/admin/users/:id
Authorization: Bearer <access_token>
```

**Permission**: `admin:delete`

## Role Management API

### Create Role

```http
POST /api/admin/roles
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Custom Role",
  "code": "custom_role",
  "description": "Role description"
}
```

**Permission**: `role:write`

### Role List

```http
GET /api/admin/roles
Authorization: Bearer <access_token>
```

**Permission**: `role:read`

### Role Details

```http
GET /api/admin/roles/:id
Authorization: Bearer <access_token>
```

**Permission**: `role:read`

### Update Role

```http
PUT /api/admin/roles/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "New Role Name",
  "description": "New description"
}
```

**Permission**: `role:write`

### Delete Role

```http
DELETE /api/admin/roles/:id
Authorization: Bearer <access_token>
```

**Permission**: `role:delete`

### Get Role Permissions

```http
GET /api/admin/roles/:id/permissions
Authorization: Bearer <access_token>
```

**Permission**: `role:read`

### Set Role Permissions

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

**Permission**: `role:write`

## User Role Assignment API

### Assign User Roles

```http
POST /api/admin/users/:id/roles
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "role_ids": ["role-uuid-1", "role-uuid-2"]
}
```

**Permission**: `admin:write`

### Get User Roles

```http
GET /api/admin/users/:id/roles
Authorization: Bearer <access_token>
```

**Permission**: `admin:read`

## RTC User API

### RTC User List

```http
GET /api/rtc-users?page=1&page_size=20
Authorization: Bearer <access_token>
```

**Permission**: `user:read`

### RTC User Details

```http
GET /api/rtc-users/:id
Authorization: Bearer <access_token>
```

**Permission**: `user:read`

### Ban User

```http
POST /api/rtc-users/:id/ban
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "Terms of Service violation",
  "duration": 86400
}
```

**Permission**: `user:write`

**Parameters**:
- `reason`: Ban reason
- `duration`: Ban duration in seconds (omit for permanent ban)

### Unban User

```http
POST /api/rtc-users/:id/unban
Authorization: Bearer <access_token>
```

**Permission**: `user:write`

### Get User Devices

```http
GET /api/rtc-users/:id/devices
Authorization: Bearer <access_token>
```

**Permission**: `user:read`

### Delete User Device

```http
DELETE /api/rtc-users/:user_id/devices/:device_id
Authorization: Bearer <access_token>
```

**Permission**: `user:write`

## Session Management API

### Session List

```http
GET /api/rtc-sessions?user_id=:user_id&page=1&page_size=20
Authorization: Bearer <access_token>
```

**Permission**: `session:read`

### Session Details

```http
GET /api/rtc-sessions/:id
Authorization: Bearer <access_token>
```

**Permission**: `session:read`

### Delete Session

```http
DELETE /api/rtc-sessions/:id
Authorization: Bearer <access_token>
```

**Permission**: `session:delete`

## Message Management API

### Message List

```http
GET /api/rtc-messages?session_id=:session_id&page=1&page_size=50
Authorization: Bearer <access_token>
```

**Permission**: `message:read`

## System Configuration API

### List All Configurations

```http
GET /api/server-configs
Authorization: Bearer <access_token>
```

**Permission**: `config:read`

### Get Single Configuration

```http
GET /api/server-configs/:key
Authorization: Bearer <access_token>
```

**Permission**: `config:read`

### Update Configuration

```http
PUT /api/server-configs/:key
Authorization: Bearer <access_token>
Content-Type: application/json
If-Match: "2024-01-01T00:00:00Z"

{
  "value": "new-value"
}
```

**Permission**: `config:write`

**Optimistic Lock**: Use `If-Match` header with `updated_at` value to prevent concurrent conflicts

### Delete Configuration Override

```http
DELETE /api/server-configs/:key
Authorization: Bearer <access_token>
```

**Permission**: `config:write`

## User Configuration API

### Get User Configuration

```http
GET /api/user-configs?user_id=:user_id
Authorization: Bearer <access_token>
```

**Permission**: `config:read`

### Set User Configuration

```http
PUT /api/user-configs/:key
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "user_id": "user-uuid",
  "value": "custom-value"
}
```

**Permission**: `config:write`

### Delete User Configuration

```http
DELETE /api/user-configs/:key?user_id=:user_id
Authorization: Bearer <access_token>
```

**Permission**: `config:write`

## Audit Log API

### Audit Log List

```http
GET /api/audit-logs?page=1&page_size=20&resource=config
Authorization: Bearer <access_token>
```

**Permission**: `audit:read`

**Query Parameters**:
- `resource`: Resource type (optional)
- `resource_id`: Resource ID (optional)
- `user_id`: Operator user ID (optional)
- `action`: Action type (optional)

## Observability Proxy API

### Prometheus Proxy

```http
GET /api/metrics/query?query=up
Authorization: Bearer <access_token>
```

**Permission**: `metrics:read`

### Grafana Proxy

```http
GET /api/grafana/d/rtc-agent/rtc-agent
Authorization: Bearer <access_token>
```

**Permission**: `metrics:read`

### Jaeger Proxy

```http
GET /api/jaeger/search?service=rtc-agent
Authorization: Bearer <access_token>
```

**Permission**: `tracing:read`

### Pyroscope Proxy

```http
GET /api/pyroscope/
Authorization: Bearer <access_token>
```

**Permission**: `profiling:read`

## Health Check

### Readiness Check

```http
GET /ready
```

**No authentication required**

**Normal Response**:
```json
{ "status": "ready" }
```

**Degraded Response**:
```json
{
  "status": "degraded",
  "error": "bootstrap failed — default roles may be missing"
}
```

## Permission Matrix

| Resource | Action | Permission Code |
|----------|--------|-----------------|
| Admin | read | `admin:read` |
| Admin | write | `admin:write` |
| Admin | delete | `admin:delete` |
| Role | read | `role:read` |
| Role | write | `role:write` |
| Role | delete | `role:delete` |
| RTC User | read | `user:read` |
| RTC User | write | `user:write` |
| Session | read | `session:read` |
| Session | delete | `session:delete` |
| Message | read | `message:read` |
| Config | read | `config:read` |
| Config | write | `config:write` |
| Audit | read | `audit:read` |
| Metrics | read | `metrics:read` |
| Tracing | read | `tracing:read` |
| Profiling | read | `profiling:read` |

## Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `unauthorized` | 401 | Not authenticated or invalid token |
| `forbidden` | 403 | No permission to access |
| `not_found` | 404 | Resource not found |
| `conflict` | 409 | Resource conflict (e.g., optimistic lock conflict) |
| `validation_error` | 422 | Request parameter validation failed |
| `rate_limited` | 429 | Too many requests |
| `internal_error` | 500 | Internal server error |

## Related Documentation

- [Admin Service Overview](/en/admin/overview/)
- [Admin Authentication](/en/admin/auth/)
- [User Management](/en/admin/user-management/)
- [System Configuration](/en/admin/system-config/)
