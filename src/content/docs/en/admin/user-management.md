---
title: User Management
description: User management features of Admin service, including admin management, RTC user management, and session management
---

# User Management

The Admin service provides comprehensive user management capabilities, including admin account management, RTC user management, and session tracking.

## Admin Management

### Create Admin

```http
POST /api/admin/users
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "newadmin@example.com",
  "name": "New Admin",
  "role_ids": ["admin-role-uuid"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "newadmin@example.com",
    "name": "New Admin",
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

### Admin List

```http
GET /api/admin/users?page=1&page_size=20
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "user-uuid",
        "email": "admin@example.com",
        "name": "Admin",
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

### Update Admin

```http
PUT /api/admin/users/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "New Name",
  "role_ids": ["admin-role-uuid"]
}
```

### Delete Admin

```http
DELETE /api/admin/users/:id
Authorization: Bearer <access_token>
```

### Admin Details

```http
GET /api/admin/users/:id
Authorization: Bearer <access_token>
```

## Role Management

### Create Role

```http
POST /api/admin/roles
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Custom Role",
  "code": "custom_role",
  "description": "Custom role description"
}
```

### Role List

```http
GET /api/admin/roles
Authorization: Bearer <access_token>
```

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

### Delete Role

```http
DELETE /api/admin/roles/:id
Authorization: Bearer <access_token>
```

## Permission Management

### View Role Permissions

```http
GET /api/admin/roles/:id/permissions
Authorization: Bearer <access_token>
```

**Response**:
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

### Set Role Permissions

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

## RTC User Management

RTC users are regular users who log in via OAuth2. Admins can view and manage these users.

### RTC User List

```http
GET /api/rtc-users?page=1&page_size=20
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "user-uuid",
        "email": "user@example.com",
        "name": "User Name",
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

### RTC User Details

```http
GET /api/rtc-users/:id
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
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

**Parameters**:
- `reason`: Ban reason
- `duration`: Ban duration in seconds (omit for permanent ban)

### Unban User

```http
POST /api/rtc-users/:id/unban
Authorization: Bearer <access_token>
```

## Session Management

### Session List

```http
GET /api/rtc-sessions?user_id=:user_id&page=1&page_size=20
Authorization: Bearer <access_token>
```

**Response**:
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

### Session Details

```http
GET /api/rtc-sessions/:id
Authorization: Bearer <access_token>
```

### Delete Session

```http
DELETE /api/rtc-sessions/:id
Authorization: Bearer <access_token>
```

## Message Management

### Message List

```http
GET /api/rtc-messages?session_id=:session_id&page=1&page_size=50
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "message-uuid",
        "session_id": "session-uuid",
        "role": "user",
        "content": "Hello",
        "created_at": "2024-01-01T00:00:00Z"
      },
      {
        "id": "message-uuid-2",
        "session_id": "session-uuid",
        "role": "assistant",
        "content": "Hello! How can I help you?",
        "created_at": "2024-01-01T00:00:01Z"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 50
  }
}
```

## Device Tracking

### Device List

```http
GET /api/rtc-users/:id/devices
Authorization: Bearer <access_token>
```

**Response**:
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

### Delete Device

```http
DELETE /api/rtc-users/:user_id/devices/:device_id
Authorization: Bearer <access_token>
```

## Admin UI Operations

The Admin UI provides a graphical interface for user management:

![RTC Agent Admin User Management Interface](/docs/demo-screenshot/admin-overview.png)

**Left Navigation**:
- RTC Users: View and manage RTC users
- User Management: Admin account management
- Session Management: Session list and details
- Message Management: Message viewing

**User Detail Drawer**:
Click on a user to open the detail drawer, showing:
- User basic info
- Session list
- Message records
- Device info

## Audit Logs

All user management operations are recorded in audit logs:

```http
GET /api/audit-logs?page=1&page_size=20
Authorization: Bearer <access_token>
```

**Response**:
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
          "reason": "Terms of Service violation",
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

## Related Documentation

- [Admin Service Overview](/en/admin/overview/)
- [Admin Authentication](/en/admin/auth/)
- [System Configuration](/en/admin/system-config/)
