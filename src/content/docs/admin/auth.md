---
title: 管理员认证
description: Admin 服务的认证机制，包括 Email OTP 登录、JWT Token 和权限系统
---

# 管理员认证

Admin 服务使用独立的认证体系，与主 RTC Agent Server 的 OAuth2 认证相互独立。

## 认证方式

Admin 服务支持以下认证方式：

| 认证方式 | 说明 | 适用场景 |
|----------|------|----------|
| Email OTP | 邮箱验证码登录 | 主要认证方式 |
| 密码登录 | 传统用户名密码（可选） | 开发环境 |

**生产环境建议**：仅启用 Email OTP，关闭密码登录。

## Email OTP 登录流程

### 1. 发送验证码

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

**限制**：
- 验证码有效期：5 分钟（可配置）
- 发送冷却时间：60 秒
- 每 IP 每分钟最多发送 5 次
- 验证码长度：6 位数字

### 2. 验证并登录

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

### 3. 刷新 Token

Access Token 过期后，使用 Refresh Token 获取新的 Token：

```http
POST /api/auth/refresh
Content-Type: application/json
Cookie: refresh_token=eyJhbGciOiJSUzI1NiIs...

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

### 4. 登出

```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

## JWT Token 机制

Admin 服务使用 JWT（JSON Web Token）进行身份验证：

### Token 类型

| Token 类型 | 有效期 | 用途 |
|------------|--------|------|
| Access Token | 1 小时 | API 请求认证 |
| Refresh Token | 7 天 | 刷新 Access Token |

### Token 结构

```json
{
  "alg": "RS256",
  "typ": "JWT"
}
{
  "iss": "http://localhost:8081",
  "aud": "http://localhost:8888",
  "sub": "admin-user-id",
  "exp": 1700000000,
  "iat": 1699996400
}
```

**关键声明**：
- `iss`（Issuer）：Admin 服务地址
- `aud`（Audience）：RTC Server 地址（用于 Token Exchange）
- `sub`（Subject）：管理员用户 ID

### 密钥管理

Admin 服务使用非对称加密算法（RS256/ES256/EdDSA）：

```bash
# 生成密钥对
rtc-agent admin keygen

# 密钥文件位置
etc/keys/admin-private.pem  # 私钥（签名）
etc/keys/admin-public.pem   # 公钥（验证）
```

**Token 验证流程**：
1. Admin 服务使用私钥签名 Token
2. RTC Server 使用 Admin 的公钥验证 Token
3. 验证通过后，RTC Server 为用户创建对应的会话

## 登录保护

### 速率限制

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `security.rate_limit_per_minute` | 100 | 每分钟最大请求数（全局） |
| `security.login_max_attempts` | 5 | 最大登录失败次数 |
| `security.login_lock_duration` | 900 | 账户锁定时长（秒） |

### 账户锁定

连续登录失败 5 次后，账户将被锁定 15 分钟：

```
登录失败 1 次 → 允许继续尝试
登录失败 2 次 → 允许继续尝试
登录失败 3 次 → 允许继续尝试
登录失败 4 次 → 允许继续尝试
登录失败 5 次 → 账户锁定 15 分钟
```

### OTP 发送限制

| 限制项 | 默认值 | 说明 |
|--------|--------|------|
| `otp.send_cooldown` | 60 秒 | 同一邮箱发送冷却时间 |
| `otp.max_send_per_ip` | 5 次/分钟 | 每 IP 最大发送次数 |
| `otp.max_verify_attempts` | 5 次 | 验证码最大验证次数 |
| `otp.lock_duration` | 900 秒 | 验证失败锁定时长 |

## Cookie 安全

Admin 服务使用 HTTP-Only Cookie 存储 Refresh Token：

| Cookie 属性 | 值 | 说明 |
|-------------|-----|------|
| `HttpOnly` | `true` | 防止 JavaScript 访问 |
| `Secure` | `true`（生产） | 仅 HTTPS 传输 |
| `SameSite` | `Strict` | 防止 CSRF |
| `Path` | `/` | 所有路径 |

**生产环境配置**：
```yaml
security:
  cookie_secure: true  # HTTPS 环境必须启用
```

## 权限系统

Admin 服务使用 Casbin RBAC（基于角色的访问控制）权限系统：

### 核心概念

| 概念 | 说明 |
|------|------|
| Subject | 用户（管理员） |
| Role | 角色（如 admin、viewer） |
| Object | 资源（如 users、sessions） |
| Action | 操作（如 read、write、delete） |
| Policy | 策略规则（role, object, action） |

### 默认角色

| 角色 | 权限 |
|------|------|
| `admin` | 所有权限 |
| `viewer` | 只读权限 |

### 策略示例

```
p, admin, users, read
p, admin, users, write
p, admin, users, delete
p, admin, sessions, read
p, admin, sessions, delete
p, admin, config, read
p, admin, config, write
p, viewer, users, read
p, viewer, sessions, read
p, viewer, config, read
```

### 用户角色分配

```http
POST /api/admin/users/:id/roles
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "role_ids": ["role-uuid-1", "role-uuid-2"]
}
```

## 认证相关 API

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/auth/otp/send` | POST | 发送验证码 | 否 |
| `/api/auth/otp/verify` | POST | 验证码登录 | 否 |
| `/api/auth/refresh` | POST | 刷新 Token | 否（使用 Cookie） |
| `/api/auth/logout` | POST | 登出 | 是 |
| `/api/auth/me` | GET | 获取当前用户信息 | 是 |

## 与 RTC Server 的认证关系

Admin 和 RTC Server 使用独立的认证体系，但通过 Token Exchange 实现互认：

```
┌──────────────┐    Admin JWT     ┌──────────────┐
│   Admin UI   │ ───────────────► │ Admin Server │
│              │                  │              │
│              │    RTC JWT       │              │
│              │ ─────────────── │              │
──────────────┘                  └──────┬───────┘
                                         │
                              Token Exchange
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │  RTC Server  │
                                  │              │
                                  │  验证 Admin   │
                                  │  JWT 的签名   │
                                  └──────────────┘
```

**流程**：
1. 管理员通过 Admin Server 认证，获取 Admin JWT
2. Admin UI 使用 Admin JWT 访问 Admin Server API
3. 需要访问 RTC Server 时，Admin Server 使用 Token Exchange 获取 RTC JWT
4. Admin UI 使用 RTC JWT 访问 RTC Server API

## 相关文档

- [Admin 服务概述](/admin/overview/)
- [部署与运维](/admin/deployment/)
- [用户管理](/admin/user-management/)
