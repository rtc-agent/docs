---
title: Admin Deployment & Operations
description: Deployment methods, operations, and troubleshooting for Admin service
---

# Admin Deployment & Operations

This document covers deployment methods, operations, and troubleshooting for the Admin service.

## Deployment Methods

### Docker Deployment (Recommended)

Use the `admin-server` service in `docker-compose.yml`:

```yaml
admin-server:
  build:
    context: .
    dockerfile: Dockerfile
  container_name: rtc-full-admin-server
  command: ["./rtc-agent", "admin", "serve"]
  env_file:
    - .env
  environment:
    DEBUG__ENABLED: "true"
  ports:
    - "28081:8081"
  volumes:
    - ./etc/admin.docker.yaml:/app/etc/admin.yaml:ro
    - full-admin-server-keys:/app/etc/keys
  depends_on:
    migrate:
      condition: service_completed_successfully
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  restart: unless-stopped
```

**Key Dependencies**:
- `migrate`: Database migration must complete before Admin starts
- `postgres`: Shared database
- `redis`: Required for rate limiting, login protection, OTP storage, policy sync

### Local Development

```bash
# 1. Generate JWT key pair
rtc-agent admin keygen

# 2. Create configuration file
cp etc/admin.example.yaml etc/admin.yaml
# Edit etc/admin.yaml for database, Redis, SMTP, etc.

# 3. Run database migration (if not already done)
rtc-agent migrate

# 4. Start Admin service
rtc-agent admin serve
```

## Configuration Reference

### Server Configuration

| Config | Description | Default |
|--------|-------------|---------|
| `server.host` | Listen address | `0.0.0.0` |
| `server.port` | Listen port | `8081` |
| `server.env` | Runtime environment (`development`/`production`) | `development` |

### Database Configuration

| Config | Description |
|--------|-------------|
| `database.dsn` | PostgreSQL connection string |

### Redis Configuration

| Config | Description | Default |
|--------|-------------|---------|
| `redis.addr` | Redis address | `localhost:6379` |
| `redis.password` | Redis password | Empty |
| `redis.db` | Redis database number | `0` |

**Note**: Redis is optional, but required for:
- JWKS caching
- Distributed rate limiting
- Login protection
- OTP storage
- Policy sync (multi-instance deployment)

### JWT Configuration

| Config | Description | Default |
|--------|-------------|---------|
| `jwt.algorithm` | Signing algorithm (RS256/ES256/EdDSA) | `RS256` |
| `jwt.issuer` | Token issuer | `http://localhost:8081` |
| `jwt.audience` | Token audience (RTC Server URL) | `http://localhost:8888` |
| `jwt.private_key_path` | Private key path | `etc/keys/admin-private.pem` |
| `jwt.public_key_path` | Public key path | `etc/keys/admin-public.pem` |
| `jwt.access_token_ttl` | Access Token TTL (seconds) | `3600` |
| `jwt.refresh_token_ttl` | Refresh Token TTL (seconds) | `604800` |

### Security Configuration

| Config | Description | Default |
|--------|-------------|---------|
| `security.rate_limit_per_minute` | Max requests per minute | `100` |
| `security.login_max_attempts` | Max failed login attempts | `5` |
| `security.login_lock_duration` | Account lockout duration (seconds) | `900` |
| `security.cookie_secure` | Cookie Secure flag (enable for HTTPS) | `true` |

### Email Configuration (OTP Login)

| Config | Description | Example |
|--------|-------------|---------|
| `email.smtp_host` | SMTP server | `smtp.qq.com` |
| `email.smtp_port` | SMTP port | `587` |
| `email.smtp_user` | SMTP username | Set via env var `EMAIL__SMTP_USER` |
| `email.smtp_password` | SMTP password | Set via env var `EMAIL__SMTP_PASSWORD` |
| `email.from_address` | Sender email | `admin@example.com` |
| `email.from_name` | Sender name | `RTC Agent` |

### OTP Configuration

| Config | Description | Default |
|--------|-------------|---------|
| `otp.ttl` | Verification code TTL (seconds) | `300` |
| `otp.length` | Code length (digits) | `6` |
| `otp.send_cooldown` | Send cooldown (seconds) | `60` |
| `otp.max_send_per_ip` | Max sends per IP per minute | `5` |
| `otp.max_verify_attempts` | Max verification attempts | `5` |
| `otp.lock_duration` | Lockout duration (seconds) | `900` |

### Feature Flags

| Config | Description | Default |
|--------|-------------|---------|
| `features.permission_system` | Enable Casbin RBAC permission system | `true` |
| `features.password_enabled` | Enable password login (disable in production) | `false` |

### Observability Service URLs

| Config | Description |
|--------|-------------|
| `prometheus_url` | Prometheus URL |
| `grafana_url` | Grafana URL |
| `jaeger_url` | Jaeger URL |
| `pyroscope_url` | Pyroscope URL |

## Operations

### JWT Key Generation

```bash
# Generate default RS256 keys
rtc-agent admin keygen

# Generate ES256 keys
rtc-agent admin keygen --algorithm ES256

# Generate to specific directory
rtc-agent admin keygen --output-dir /app/etc/keys

# Force overwrite existing keys
rtc-agent admin keygen --force
```

**Key Files**:
- `admin-private.pem`: Private key (must be kept secret)
- `admin-public.pem`: Public key (for token verification)

### Admin Account Management

After initial deployment, you need to create an admin account to log in to the Admin UI.

#### Create Admin Account

```bash
# Basic usage
rtc-agent admin account create --email admin@example.com --password your-password

# With display name
rtc-agent admin account create --email admin@example.com --password your-password --name "Admin"

# Create with role binding
rtc-agent admin account create --email admin@example.com --password your-password --name "Admin" --role admin
```

**Parameters**:

| Parameter | Required | Description |
|-----------|----------|-------------|
| `--email` | Yes | Admin email |
| `--password` | Yes | Login password |
| `--name` | No | Display name |
| `--role` | No | Role to bind (admin/operator/viewer) |

**Example Output**:

```text
✅ Admin user created successfully!
   Email: admin@example.com
   Name:  Admin
   ID:    550e8400-e29b-41d4-a716-446655440000

 Binding role: admin
✅ Role bound successfully: admin
   Please restart the server to reload permissions.
```

> **Note**: After binding a role, restart the Admin Server to load new permissions.

#### Bind Role to Existing Account

If you didn't specify a role during creation, or need to add roles later:

```bash
rtc-agent admin account bind-role --email admin@example.com --role admin
```

**Available Roles**:

| Role | Permissions |
|------|-------------|
| `admin` | All permissions (full control) |
| `operator` | Operations permissions (user management, config modification) |
| `viewer` | Read-only permissions (view monitoring, logs) |

**Example Output**:

```text
✅ Found admin user: admin@example.com (ID: 550e8400-e29b-41d4-a716-446655440000)
✅ Found role: admin (ID: role-uuid)
✅ Created admin_user_role record
✅ Added Casbin grouping policy

 Success! Admin user admin@example.com now has role: admin
   Please restart the server to reload permissions.
```

#### Create Account in Docker Environment

```bash
# Execute inside admin-server container
docker compose exec admin-server ./rtc-agent admin account create \
  --email admin@example.com \
  --password your-password \
  --name "Admin" \
  --role admin
```

### Health Check

```bash
# Check service status
curl http://localhost:28081/ready

# Normal response
{"status":"ready"}

# Degraded mode
{"status":"degraded","error":"bootstrap failed — default roles may be missing"}
```

### Log Viewing

```bash
# Docker environment
docker logs rtc-full-admin-server

# Real-time logs
docker logs -f rtc-full-admin-server
```

### Service Restart

```bash
# Docker environment
docker restart rtc-full-admin-server

# Check status
docker ps | grep admin-server
```

## Multi-Instance Deployment

The Admin service supports multi-instance deployment, but requires Redis:

```yaml
environment:
  INSTANCE_COUNT: "2"  # Number of instances
```

**Redis-dependent features for multi-instance**:
- Distributed rate limiting
- Login protection sync
- OTP storage sync
- Casbin policy sync

**Warning**: Without Redis in multi-instance deployment, these features fall back to per-instance memory mode with inconsistent data across replicas.

## Troubleshooting

### Startup Failures

| Problem | Possible Cause | Solution |
|---------|----------------|----------|
| `database connection failed` | Database not running or misconfigured | Check `database.dsn` |
| `redis unreachable` | Redis not running | Check `redis.addr`; Redis is optional |
| `jwt signer init failed` | Key files missing | Run `rtc-agent admin keygen` |
| `bootstrap failed` | Database migration incomplete | Run `rtc-agent migrate` first |

### Login Failures

| Problem | Possible Cause | Solution |
|---------|----------------|----------|
| `OTP send failed` | SMTP misconfigured | Check `email.*` config |
| `account locked` | Too many failed attempts | Wait for lockout period (default 15 min) |
| `invalid token` | JWT key mismatch | Verify Admin and RTC Server use correct keys |

### Permission Errors

| Problem | Possible Cause | Solution |
|---------|----------------|----------|
| `permission denied` | Role not assigned or policy missing | Check Casbin roles and policies |
| `bootstrap degraded` | Default roles not created | Check startup logs, verify migration completed |

## Related Documentation

- [Admin Service Overview](/en/admin/overview/)
- [Admin Authentication](/en/admin/auth/)
- [API Reference](/en/admin/api-reference/)
