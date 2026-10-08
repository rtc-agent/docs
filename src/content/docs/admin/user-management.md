---
title: 用户管理
description: Admin 服务的用户管理功能，包括管理员管理、RTC 用户管理和会话管理
---

# 用户管理

Admin 服务提供完整的用户管理能力，包括管理员账户管理、RTC 用户管理和会话追踪。

## 管理员管理

### 创建管理员

```http
POST /api/admin/users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "name": "新管理员",
  "role_ids": ["admin-role-uuid"]
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "newadmin@example.com",
    "name": "新管理员",
    "roles": [
      {
        "id": "admin-role-uuid",
        "name": "admin",
        "code": "admin"
      }
    ],
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### 管理员列表

```http
GET /api/admin/users?page=1&page_size=20
Authorization: Bearer <access_token>
```

**响应**：
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "user-uuid",
        "email": "admin@example.com",
        "name": "管理员",
        "roles": [
          { "id": "role-uuid", "name": "admin", "code": "admin" }
        ],
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20
  }
}
```

### 更新管理员

```http
PUT /api/admin/users/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "新名称",
  "role_ids": ["admin-role-uuid"]
}
```

### 删除管理员

```http
DELETE /api/admin/users/:id
Authorization: Bearer <access_token>
```

### 管理员详情

```http
GET /api/admin/users/:id
Authorization: Bearer <access_token>
```

## 角色管理

### 创建角色

```http
POST /api/admin/roles
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "自定义角色",
  "code": "custom_role",
  "description": "自定义角色描述"
}
```

### 角色列表

```http
GET /api/admin/roles
Authorization: Bearer <access_token>
```

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

### 删除角色

```http
DELETE /api/admin/roles/:id
Authorization: Bearer <access_token>
```

## 权限管理

### 查看角色权限

```http
GET /api/admin/roles/:id/permissions
Authorization: Bearer <access_token>
```

**响应**：
```json
{
  "success": true,
  "data": {
    "role_id": "role-uuid",
    "role_name": "admin",
    "permissions": [
      { "object": "users", "action": "read" },
      { "object": "users", "action": "write" },
      { "object": "users", "action": "delete" },
      { "object": "sessions", "action": "read" },
      { "object": "sessions", "action": "delete" },
      { "object": "config", "action": "read" },
      { "object": "config", "action": "write" }
    ]
  }
}
```

### 设置角色权限

```http
PUT /api/admin/roles/:id/permissions
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "permissions": [
    { "object": "users", "action": "read" },
    { "object": "users", "action": "write" },
    { "object": "sessions", "action": "read" }
  ]
}
```

## RTC 用户管理

RTC 用户是通过 OAuth2 登录的普通用户，Admin 可以查看和管理这些用户。

### RTC 用户列表

```http
GET /api/rtc-users?page=1&page_size=20
Authorization: Bearer <access_token>
```

**响应**：
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "用户名称",
        "provider": "github",
        "provider_user_id": "github-123",
        "created_at": "2024-01-01T00:00:00Z",
        "last_login_at": "2024-01-02T00:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

### RTC 用户详情

```http
GET /api/rtc-users/:id
Authorization: Bearer <access_token>
```

**响应**：
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "用户名称",
    "provider": "github",
    "provider_user_id": "github-123",
    "created_at": "2024-01-01T00:00:00Z",
    "last_login_at": "2024-01-02T00:00:00Z",
    "devices": [
      {
        "id": "device-uuid",
        "name": "Chrome on macOS",
        "last_active_at": "2024-01-02T10:00:00Z"
      }
    ],
    "stats": {
      "session_count": 50,
      "message_count": 1200
    }
  }
}
```

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

**参数**：
- `reason`：封禁原因
- `duration`：封禁时长（秒），不传表示永久封禁

### 解封用户

```http
POST /api/rtc-users/:id/unban
Authorization: Bearer <access_token>
```

## 会话管理

### 会话列表

```http
GET /api/rtc-sessions?user_id=:user_id&page=1&page_size=20
Authorization: Bearer <access_token>
```

**响应**：
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "session-uuid",
        "user_id": "user-uuid",
        "client_id": "client-uuid",
        "status": "active",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-02T00:00:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "page_size": 20
  }
}
```

### 会话详情

```http
GET /api/rtc-sessions/:id
Authorization: Bearer <access_token>
```

### 删除会话

```http
DELETE /api/rtc-sessions/:id
Authorization: Bearer <access_token>
```

## 消息管理

### 消息列表

```http
GET /api/rtc-messages?session_id=:session_id&page=1&page_size=50
Authorization: Bearer <access_token>
```

**响应**：
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "message-uuid",
        "session_id": "session-uuid",
        "role": "user",
        "content": "你好",
        "created_at": "2024-01-01T00:00:00Z"
      },
      {
        "id": "message-uuid-2",
        "session_id": "session-uuid",
        "role": "assistant",
        "content": "你好！有什么我可以帮助你的？",
        "created_at": "2024-01-01T00:00:01Z"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 50
  }
}
```

## 设备追踪

### 设备列表

```http
GET /api/rtc-users/:id/devices
Authorization: Bearer <access_token>
```

**响应**：
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "device-uuid",
        "user_id": "user-uuid",
        "name": "Chrome on macOS",
        "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
        "ip": "192.168.1.1",
        "last_active_at": "2024-01-02T10:00:00Z"
      }
    ]
  }
}
```

### 删除设备

```http
DELETE /api/rtc-users/:user_id/devices/:device_id
Authorization: Bearer <access_token>
```

## Admin UI 操作

Admin UI 提供图形化界面进行用户管理：

![RTC Agent Admin 用户管理界面](/docs/demo-screenshot/admin-overview.png)

**左侧导航**：
- RTC 用户：查看和管理 RTC 用户
- 用户管理：管理员账户管理
- 对话管理：会话列表和详情
- 消息管理：消息查看

**用户详情抽屉**：
点击用户可打开详情抽屉，查看：
- 用户基本信息
- 会话列表
- 消息记录
- 设备信息

## 审计日志

所有用户管理操作都会记录到审计日志：

```http
GET /api/audit-logs?page=1&page_size=20
Authorization: Bearer <access_token>
```

**响应**：
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "log-uuid",
        "user_id": "admin-uuid",
        "action": "ban_user",
        "resource": "rtc-users",
        "resource_id": "user-uuid",
        "details": {
          "reason": "违反服务条款",
          "duration": 86400
        },
        "created_at": "2024-01-02T00:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

## 相关文档

- [Admin 服务概述](/admin/overview/)
- [管理员认证](/admin/auth/)
- [系统配置](/admin/system-config/)
