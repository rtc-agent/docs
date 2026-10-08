---
title: Admin 部署与运维
description: Admin 服务的部署方式、运维操作和故障排查指南
---

# Admin 部署与运维

本文档介绍 Admin 服务的部署方式、运维操作和故障排查方法。

## 部署方式

### Docker 部署（推荐）

使用 `docker-compose.yml` 中的 `admin-server` 服务：

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

**关键依赖**：
- `migrate`：数据库迁移必须在 Admin 启动前完成
- `postgres`：共享数据库
- `redis`：用于速率限制、登录保护、OTP 存储、策略同步

### 本地开发部署

```bash
# 1. 生成 JWT 密钥对
rtc-agent admin keygen

# 2. 创建配置文件
cp etc/admin.example.yaml etc/admin.yaml
# 编辑 etc/admin.yaml 配置数据库、Redis、SMTP 等

# 3. 运行数据库迁移（如果尚未运行）
rtc-agent migrate

# 4. 启动 Admin 服务
rtc-agent admin serve
```

## 配置项说明

### 服务器配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `server.host` | 监听地址 | `0.0.0.0` |
| `server.port` | 监听端口 | `8081` |
| `server.env` | 运行环境（`development`/`production`） | `development` |

### 数据库配置

| 配置项 | 说明 |
|--------|------|
| `database.dsn` | PostgreSQL 连接字符串 |

### Redis 配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `redis.addr` | Redis 地址 | `localhost:6379` |
| `redis.password` | Redis 密码 | 空 |
| `redis.db` | Redis 数据库编号 | `0` |

**注意**：Redis 是可选的，但以下功能需要 Redis：
- JWKS 缓存
- 分布式速率限制
- 登录保护
- OTP 存储
- 策略同步（多实例部署）

### JWT 配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `jwt.algorithm` | 签名算法（RS256/ES256/EdDSA） | `RS256` |
| `jwt.issuer` | Token 签发者 | `http://localhost:8081` |
| `jwt.audience` | Token 受众（RTC Server 地址） | `http://localhost:8888` |
| `jwt.private_key_path` | 私钥路径 | `etc/keys/admin-private.pem` |
| `jwt.public_key_path` | 公钥路径 | `etc/keys/admin-public.pem` |
| `jwt.access_token_ttl` | Access Token 有效期（秒） | `3600` |
| `jwt.refresh_token_ttl` | Refresh Token 有效期（秒） | `604800` |

### 安全配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `security.rate_limit_per_minute` | 每分钟最大请求数 | `100` |
| `security.login_max_attempts` | 最大登录失败次数 | `5` |
| `security.login_lock_duration` | 账户锁定时长（秒） | `900` |
| `security.cookie_secure` | Cookie Secure 标志（HTTPS 环境启用） | `true` |

### 邮件配置（OTP 登录）

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `email.smtp_host` | SMTP 服务器 | `smtp.qq.com` |
| `email.smtp_port` | SMTP 端口 | `587` |
| `email.smtp_user` | SMTP 用户名 | 通过环境变量 `EMAIL__SMTP_USER` 设置 |
| `email.smtp_password` | SMTP 密码 | 通过环境变量 `EMAIL__SMTP_PASSWORD` 设置 |
| `email.from_address` | 发件人地址 | `admin@example.com` |
| `email.from_name` | 发件人名称 | `RTC Agent` |

### OTP 配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `otp.ttl` | 验证码有效期（秒） | `300` |
| `otp.length` | 验证码位数 | `6` |
| `otp.send_cooldown` | 发送冷却时间（秒） | `60` |
| `otp.max_send_per_ip` | 每 IP 每分钟最大发送次数 | `5` |
| `otp.max_verify_attempts` | 最大验证失败次数 | `5` |
| `otp.lock_duration` | 锁定时长（秒） | `900` |

### 功能开关

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `features.permission_system` | 启用 Casbin RBAC 权限系统 | `true` |
| `features.password_enabled` | 启用密码登录（生产环境建议关闭） | `false` |

### 可观测性服务地址

| 配置项 | 说明 |
|--------|------|
| `prometheus_url` | Prometheus 地址 |
| `grafana_url` | Grafana 地址 |
| `jaeger_url` | Jaeger 地址 |
| `pyroscope_url` | Pyroscope 地址 |

## 运维操作

### JWT 密钥生成

```bash
# 生成默认 RS256 密钥
rtc-agent admin keygen

# 生成 ES256 密钥
rtc-agent admin keygen --algorithm ES256

# 生成到指定目录
rtc-agent admin keygen --output-dir /app/etc/keys

# 强制覆盖现有密钥
rtc-agent admin keygen --force
```

**密钥文件**：
- `admin-private.pem`：私钥（必须保密）
- `admin-public.pem`：公钥（用于验证 Token）

### 管理员账户管理

首次部署后，需要创建管理员账户才能登录 Admin UI。

#### 创建管理员账户

```bash
# 基本用法
rtc-agent admin account create --email admin@example.com --password your-password

# 指定显示名称
rtc-agent admin account create --email admin@example.com --password your-password --name "管理员"

# 创建并绑定角色
rtc-agent admin account create --email admin@example.com --password your-password --name "管理员" --role admin
```

**参数说明**：

| 参数 | 必填 | 说明 |
|------|------|------|
| `--email` | 是 | 管理员邮箱 |
| `--password` | 是 | 登录密码 |
| `--name` | 否 | 显示名称 |
| `--role` | 否 | 绑定的角色名（admin/operator/viewer） |

**输出示例**：

```text
✅ Admin user created successfully!
   Email: admin@example.com
   Name:  管理员
   ID:    550e8400-e29b-41d4-a716-446655440000

 Binding role: admin
✅ Role bound successfully: admin
   Please restart the server to reload permissions.
```

> **注意**：绑定角色后需要重启 Admin Server 才能加载新权限。

#### 绑定角色到现有账户

如果创建账户时未指定角色，或需要后续添加角色：

```bash
rtc-agent admin account bind-role --email admin@example.com --role admin
```

**可用角色**：

| 角色 | 权限 |
|------|------|
| `admin` | 所有权限（完全控制） |
| `operator` | 运维权限（用户管理、配置修改） |
| `viewer` | 只读权限（查看监控、日志） |

**输出示例**：

```text
✅ Found admin user: admin@example.com (ID: 550e8400-e29b-41d4-a716-446655440000)
✅ Found role: admin (ID: role-uuid)
✅ Created admin_user_role record
✅ Added Casbin grouping policy

 Success! Admin user admin@example.com now has role: admin
   Please restart the server to reload permissions.
```

#### Docker 环境中创建账户

```bash
# 进入 admin-server 容器执行
docker compose exec admin-server ./rtc-agent admin account create \
  --email admin@example.com \
  --password your-password \
  --name "管理员" \
  --role admin
```

### 健康检查

```bash
# 检查服务状态
curl http://localhost:28081/ready

# 正常响应
{"status":"ready"}

# 降级模式
{"status":"degraded","error":"bootstrap failed — default roles may be missing"}
```

### 日志查看

```bash
# Docker 环境
docker logs rtc-full-admin-server

# 实时日志
docker logs -f rtc-full-admin-server
```

### 服务重启

```bash
# Docker 环境
docker restart rtc-full-admin-server

# 查看状态
docker ps | grep admin-server
```

## 多实例部署

Admin 服务支持多实例部署，但需要 Redis 支持：

```yaml
environment:
  INSTANCE_COUNT: "2"  # 实例数量
```

**多实例依赖 Redis 的功能**：
- 分布式速率限制
- 登录保护同步
- OTP 存储同步
- Casbin 策略同步

**警告**：如果多实例部署没有 Redis，这些功能将降级为单实例内存模式，各实例间数据不一致。

## 故障排查

### 启动失败

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| `database connection failed` | 数据库未启动或配置错误 | 检查 `database.dsn` 配置 |
| `redis unreachable` | Redis 未启动 | 检查 `redis.addr` 配置，Redis 是可选的 |
| `jwt signer init failed` | 密钥文件不存在 | 运行 `rtc-agent admin keygen` |
| `bootstrap failed` | 数据库迁移未完成 | 先运行 `rtc-agent migrate` |

### 登录失败

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| `OTP send failed` | SMTP 配置错误 | 检查 `email.*` 配置 |
| `account locked` | 登录失败次数过多 | 等待锁定期结束（默认 15 分钟） |
| `invalid token` | JWT 密钥不匹配 | 确认 Admin 和 RTC Server 使用正确的密钥 |

### 权限错误

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| `permission denied` | 角色未分配或策略缺失 | 检查 Casbin 角色和策略配置 |
| `bootstrap degraded` | 默认角色未创建 | 检查启动日志，确认数据库迁移完成 |

## 相关文档

- [Admin 服务概述](/admin/overview/)
- [管理员认证](/admin/auth/)
- [API 参考](/admin/api-reference/)
