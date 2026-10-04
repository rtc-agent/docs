---
title: 源码构建
description: 从源码构建 RTC Agent Server，适合本地开发调试。
---

源码构建适合需要在 Server 侧开发调试的场景。

## 前置条件

- **Go 1.27+**
- **PostgreSQL 17+**（需 pgvector 扩展）— 推荐 `pgvector/pgvector:pg17` 镜像
- **Redis 7+**
- **LLM API** — Claude 或 OpenAI 兼容接口

## 1. 克隆代码

```bash
git clone https://github.com/rtc-agent/server.git
cd server
```

## 2. 启动基础设施

使用根目录的 `docker-compose.yml` 启动 PostgreSQL、Redis 等依赖服务：

```bash
# 只启动开发所需的基础设施（PostgreSQL:25432, Redis:26379 等）
docker compose up -d postgres redis
```

## 3. 配置

复制配置模板并编辑：

```bash
cp etc/config.yaml.example etc/config.local.yaml
```

编辑 `etc/config.local.yaml`，至少修改以下字段：

```yaml
database:
  dsn: "postgres://rtc_agent:rtc_agent@localhost:25432/rtc_agent?sslmode=disable"

redis:
  addr: "localhost:26379"

llm:
  provider: "claude"           # 或 "openai"
  # api_key 通过环境变量 LLM__API_KEY 配置，不在 YAML 中写明文
  model: "claude-sonnet-4-20250514"  # 示例：使用 Claude 模型，实际默认配置可能不同（如 qwen3.7-plus）
```

配置 LLM API Key（环境变量方式）：

```bash
# 设置环境变量（本地运行不会自动读取 .env 文件）
export LLM__API_KEY=your-api-key-here
```

> 💡 也可以复制 `.env.example` 为 `.env` 后 `source .env` 加载，然后 `export` 所需变量。Docker 部署中 docker-compose 会自动读取 `.env`（通过 `env_file`），但本地 Go 运行需要手动导出。
>
> 💡 **环境变量命名规则**：大写字母 + 双下划线 `__` 分隔层级，对应 YAML 配置的层级结构。例如 `llm.api_key` → `LLM__API_KEY`。这种映射由 Viper 的 `SetEnvKeyReplacer(".", "__")` 实现。
>
> ⚠️ **敏感字段处理**：敏感字段（如 `api_key`、`password`）建议不在 YAML 中写明文，而是通过环境变量配置。环境变量优先级高于配置文件，可以安全地覆盖 YAML 中的值。

## 4. 构建 & 运行

```bash
# 构建
go build -o bin/rtc-agent .

# 数据库迁移（首次部署）
./bin/rtc-agent migrate

# 启动服务
./bin/rtc-agent serve
```

服务启动在 `http://localhost:8888`。

## 5. 验证

```bash
curl http://localhost:8888/healthz
# {"status":"ok"}
```

## 6. 启动 Admin-server（可选）

Admin-server 是独立的管理服务，与主服务器使用同一个二进制文件。提供管理员登录、用户管理等功能，通过 RFC 8693 Token Exchange 与主服务器集成。

### 配置

复制 admin 配置模板并编辑：

```bash
cp etc/admin.yaml etc/admin.local.yaml
```

编辑 `etc/admin.local.yaml`，至少修改以下字段：

```yaml
server:
  host: "0.0.0.0"
  port: 8081
  env: "development"  # 生产环境务必设为 "production"

database:
  dsn: "postgres://rtc_agent:rtc_agent@localhost:25432/rtc_agent?sslmode=disable"

# Redis 配置（开发环境可选，生产多实例部署必填，用于 JWKS 缓存和限流）
# redis:
#   addr: "localhost:6379"

cors:
  allowed_origins: ["http://localhost:23001"]  # 管理后台地址，生产环境务必显式指定

jwt:
  algorithm: "RS256"
  issuer: "http://localhost:8081"
  audience: "http://localhost:8888"
  private_key_path: "./etc/keys/admin-private.pem"
  public_key_path: "./etc/keys/admin-public.pem"
  access_token_ttl: 3600      # 1 小时
  refresh_token_ttl: 604800   # 7 天
```

### 生成 JWT 密钥对

Admin-server 使用非对称密钥签名 JWT。源码构建部署时，需要**在首次启动前**手动生成密钥对（admin-server 不会在启动时自动生成密钥文件，密钥路径对应的文件不存在时启动会失败）：

```bash
# 生成密钥对（推荐 ES256）
./bin/rtc-agent admin keygen --algorithm ES256

# 或 RSA（默认）
./bin/rtc-agent admin keygen --algorithm RS256

# 或 EdDSA (Ed25519)
./bin/rtc-agent admin keygen --algorithm EdDSA

# 强制覆盖已有密钥
./bin/rtc-agent admin keygen --force
```

密钥默认存储在 `etc/keys/` 目录（已在 `.gitignore` 中排除 `*.pem`）。

> 💡 Docker 部署时，`docker-entrypoint.sh` 会自动在 named volume 中生成持久化密钥，无需手动操作。源码构建如果不配置密钥路径（`private_key_path` 和 `public_key_path` 均留空），admin-server 会生成临时内存密钥用于开发调试，但重启后密钥会丢失，已签发的 JWT 也将失效。

### 创建管理员账号

```bash
./bin/rtc-agent admin account create \
  --email admin@example.com \
  --password your-password \
  --name "Admin"
```

### 启动服务

```bash
# 启动 admin-server（默认端口 8081）
./bin/rtc-agent admin serve --config etc/admin.local.yaml
```

> 💡 Admin-server 需要与主服务器连接同一个 PostgreSQL 数据库。主服务器需在 `config.yaml` 中配置 `token_exchange.external_issuers` 以信任 admin-server 签发的 JWT。详见 [HTTP API - Admin-server 认证](/docs/protocol/http-api/#admin-server-认证)。

## 7. 嵌入前端

Server 启动后，在你的网页中添加 `<rtc-agent>` 组件：

```html
<script type="module" src="https://cdn.example.com/rtc-agent/index.js"></script>
<rtc-agent></rtc-agent>
```

详见 [Web Component API](/docs/integration/component-api/)。

## 下一步

- [快速开始](/docs/getting-started/) — 返回总览
- [分布式集群部署](/docs/deployment/distributed-deploy/) — 多 Worker 部署
- [配置参考](/docs/getting-started/#配置参考) — 完整配置项说明
