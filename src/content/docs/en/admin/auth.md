---
title: Admin Authentication
description: Authentication mechanisms for Admin service, including Email OTP login, JWT Tokens, and permission system
---

# Admin Authentication

The Admin service uses an independent authentication system, separate from the main RTC Agent Server's OAuth2 authentication.

## Authentication Methods

The Admin service supports the following authentication methods:

| Method | Description | Use Case |
|--------|-------------|----------|
| Email OTP | Email verification code login | Primary method |
| Password Login | Traditional username/password (optional) | Development |

**Production recommendation**: Enable only Email OTP, disable password login.

## Email OTP Login Flow

### 1. Send Verification Code

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

**Limits**:
- Code TTL: 5 minutes (configurable)
- Send cooldown: 60 seconds
- Max 5 sends per IP per minute
- Code length: 6 digits

### 2. Verify and Login

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

### 3. Refresh Token

After Access Token expires, use Refresh Token to get a new one:

```http
POST /api/auth/refresh
Content-Type: application/json
Cookie: refresh_token=eyJhbGciOiJSUzI1NiIs...

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

### 4. Logout

```http
POST /api/auth/logout
Authorization: Bearer <access_token>
```

## JWT Token Mechanism

The Admin service uses JWT (JSON Web Token) for authentication:

### Token Types

| Token Type | TTL | Purpose |
|------------|-----|---------|
| Access Token | 1 hour | API request authentication |
| Refresh Token | 7 days | Refresh Access Token |

### Token Structure

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

**Key Claims**:
- `iss` (Issuer): Admin service URL
- `aud` (Audience): RTC Server URL (for Token Exchange)
- `sub` (Subject): Admin user ID

### Key Management

The Admin service uses asymmetric encryption (RS256/ES256/EdDSA):

```bash
# Generate key pair
rtc-agent admin keygen

# Key file locations
etc/keys/admin-private.pem  # Private key (signing)
etc/keys/admin-public.pem   # Public key (verification)
```

**Token Verification Flow**:
1. Admin service signs Token with private key
2. RTC Server verifies Token with Admin's public key
3. After verification, RTC Server creates corresponding session for user

## Login Protection

### Rate Limiting

| Config | Default | Description |
|--------|---------|-------------|
| `security.rate_limit_per_minute` | 100 | Max requests per minute (global) |
| `security.login_max_attempts` | 5 | Max failed login attempts |
| `security.login_lock_duration` | 900 | Account lockout duration (seconds) |

### Account Lockout

After 5 consecutive failed login attempts, the account is locked for 15 minutes:

```
Failed attempt 1 → Continue
Failed attempt 2 → Continue
Failed attempt 3 → Continue
Failed attempt 4 → Continue
Failed attempt 5 → Account locked for 15 minutes
```

### OTP Send Limits

| Limit | Default | Description |
|-------|---------|-------------|
| `otp.send_cooldown` | 60 seconds | Cooldown between sends to same email |
| `otp.max_send_per_ip` | 5 per minute | Max sends per IP |
| `otp.max_verify_attempts` | 5 attempts | Max verification attempts |
| `otp.lock_duration` | 900 seconds | Lockout duration after failed verification |

## Cookie Security

The Admin service uses HTTP-Only Cookies to store Refresh Token:

| Cookie Attribute | Value | Description |
|------------------|-------|-------------|
| `HttpOnly` | `true` | Prevents JavaScript access |
| `Secure` | `true` (production) | HTTPS only |
| `SameSite` | `Strict` | Prevents CSRF |
| `Path` | `/` | All paths |

**Production configuration**:
```yaml
security:
  cookie_secure: true  # Must enable for HTTPS environments
```

## Permission System

The Admin service uses Casbin RBAC (Role-Based Access Control) permission system:

### Core Concepts

| Concept | Description |
|---------|-------------|
| Subject | User (admin) |
| Role | Role (e.g., admin, viewer) |
| Object | Resource (e.g., users, sessions) |
| Action | Operation (e.g., read, write, delete) |
| Policy | Policy rule (role, object, action) |

### Default Roles

| Role | Permissions |
|------|-------------|
| `admin` | All permissions |
| `viewer` | Read-only permissions |

### Policy Example

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

### User Role Assignment

```http
POST /api/admin/users/:id/roles
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "role_ids": ["role-uuid-1", "role-uuid-2"]
}
```

## Authentication API

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/otp/send` | POST | Send verification code | No |
| `/api/auth/otp/verify` | POST | OTP login | No |
| `/api/auth/refresh` | POST | Refresh Token | No (uses Cookie) |
| `/api/auth/logout` | POST | Logout | Yes |
| `/api/auth/me` | GET | Get current user info | Yes |

## Relationship with RTC Server Authentication

Admin and RTC Server use independent authentication systems but achieve mutual recognition through Token Exchange:

```
┌──────────────┐    Admin JWT     ┌──────────────┐
│   Admin UI   │ ───────────────► │ Admin Server │
│              │                  │              │
│              │    RTC JWT       │              │
│              │ ◄────────────── │              │
──────────────┘                  └──────┬───────┘
                                         │
                              Token Exchange
                                         │
                                         ▼
                                  ┌──────────────┐
                                  │  RTC Server  │
                                  │              │
                                  │  Verifies    │
                                  │  Admin JWT   │
                                  └──────────────┘
```

**Flow**:
1. Admin authenticates via Admin Server, gets Admin JWT
2. Admin UI uses Admin JWT to access Admin Server API
3. When accessing RTC Server, Admin Server uses Token Exchange to get RTC JWT
4. Admin UI uses RTC JWT to access RTC Server API

## Related Documentation

- [Admin Service Overview](/en/admin/overview/)
- [Deployment & Operations](/en/admin/deployment/)
- [User Management](/en/admin/user-management/)
