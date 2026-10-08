---
title: 系统配置管理
description: Admin 服务的动态配置系统，支持配置查询、修改和审计
---

# 系统配置管理

Admin 服务提供动态配置管理系统，允许管理员在运行时修改系统配置，无需重启服务。

## 架构概述

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Admin UI   │────►│ Admin Server │────►│   Database   │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   Config     │
                    │   Registry   │
                    └──────────────┘
```

**核心组件**：
- **Config Registry**：配置项注册表，定义所有可用的配置项
- **Database**：存储配置值（包括用户自定义覆盖）
- **Admin Server**：处理配置查询和修改请求
- **Admin UI**：提供图形化配置界面

## 配置层级

系统配置支持三层覆盖机制：

```
┌─────────────────────────────────────────┐
│              最终配置值                   │
│  (YamlDefault → RegistryDefault → User) │
└─────────────────────────────────────────

优先级（从高到低）：
1. User Override    - 用户自定义覆盖
2. RegistryDefault  - 代码中注册的默认值
3. YamlDefault      - YAML 配置文件中的值
```

### 配置来源

| 来源 | 说明 | 优先级 |
|------|------|--------|
| `YamlDefault` | `etc/config.yaml` 中的配置值 | 低 |
| `RegistryDefault` | 代码中通过 `config.Register()` 注册的默认值 | 中 |
| `User Override` | 通过 Admin UI 修改的配置值 | 高 |

## 配置项分类

### LLM 配置

| 配置项 | 说明 | 类型 |
|--------|------|------|
| `llm.model` | 默认 LLM 模型 | string |
| `llm.api_key` | LLM API 密钥 | string (secret) |
| `llm.base_url` | LLM API 地址 | string |
| `llm.temperature` | 温度参数 | float |
| `llm.max_tokens` | 最大 Token 数 | int |

### 认证配置

| 配置项 | 说明 | 类型 |
|--------|------|------|
| `auth.jwt_secret` | JWT 密钥 | string (secret) |
| `auth.token_ttl` | Token 有效期 | int |
| `auth.refresh_token_ttl` | Refresh Token 有效期 | int |

### 存储配置

| 配置项 | 说明 | 类型 |
|--------|------|------|
| `storage.provider` | 存储提供商（s3/minio） | string |
| `storage.endpoint` | S3 端点 | string |
| `storage.bucket` | 存储桶名称 | string |
| `storage.encryption.session_token_key` | 会话加密密钥 | string (secret) |

### 功能开关

| 配置项 | 说明 | 类型 |
|--------|------|------|
| `features.skill_system` | Skill 系统开关 | bool |
| `features.memory` | 记忆系统开关 | bool |
| `features.notifications` | 通知系统开关 | bool |

## API 端点

### 列出所有配置

```http
GET /api/server-configs
Authorization: Bearer <access_token>
```

**响应**：
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "key": "llm.model",
        "description": "默认 LLM 模型",
        "value": "claude-sonnet-5",
        "yaml_default": "claude-sonnet-5",
        "registry_default": "claude-sonnet-5",
        "user_override": null,
        "type": "string",
        "updated_at": null
      },
      {
        "key": "llm.temperature",
        "description": "温度参数",
        "value": "0.7",
        "yaml_default": "0.7",
        "registry_default": "0.7",
        "user_override": "0.9",
        "type": "float",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 获取单个配置

```http
GET /api/server-configs/:key
Authorization: Bearer <access_token>
```

**响应**：
```json
{
  "success": true,
  "data": {
    "key": "llm.model",
    "description": "默认 LLM 模型",
    "value": "claude-sonnet-5",
    "yaml_default": "claude-sonnet-5",
    "registry_default": "claude-sonnet-5",
    "user_override": null,
    "type": "string",
    "updated_at": null
  }
}
```

### 更新配置

```http
PUT /api/server-configs/:key
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "value": "claude-opus-5"
}
```

**乐观锁机制**：

配置更新使用 `updated_at` 字段实现乐观锁，防止并发修改冲突：

```http
PUT /api/server-configs/:key
Authorization: Bearer <access_token>
Content-Type: application/json
If-Match: "2024-01-01T00:00:00Z"

{
  "value": "claude-opus-5"
}
```

**冲突响应**：
```json
{
  "success": false,
  "error": "config_conflict",
  "message": "Configuration has been modified by another user",
  "current_value": {
    "updated_at": "2024-01-01T00:01:00Z"
  }
}
```

### 删除用户覆盖

```http
DELETE /api/server-configs/:key
Authorization: Bearer <access_token>
```

删除后，配置值将回退到 `RegistryDefault` 或 `YamlDefault`。

## Per-User 配置覆盖

系统支持为特定用户设置配置覆盖：

### 获取用户配置

```http
GET /api/user-configs?user_id=:user_id
Authorization: Bearer <access_token>
```

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

### 删除用户配置

```http
DELETE /api/user-configs/:key?user_id=:user_id
Authorization: Bearer <access_token>
```

## 配置变更审计

所有配置修改都会记录到审计日志：

```http
GET /api/audit-logs?resource=config
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
        "action": "update_config",
        "resource": "config",
        "resource_id": "llm.model",
        "details": {
          "old_value": "claude-sonnet-5",
          "new_value": "claude-opus-5"
        },
        "created_at": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

## Admin UI 操作

### 配置列表页面

![系统配置界面](/docs/demo-screenshot/admin-overview.png)

**功能**：
- 按分类筛选配置项
- 搜索配置项
- 查看配置的当前值、默认值和覆盖值
- 编辑配置值

### 编辑配置

1. 点击配置项进入编辑模式
2. 修改配置值
3. 点击保存

**验证**：
- 类型验证（string/int/float/bool）
- 范围验证（如温度参数 0-2）
- 格式验证（如 URL 格式）

## 动态配置注册

开发者可以通过代码注册新的配置项：

```go
package config

func init() {
    Register(ConfigItem{
        Key:         "llm.model",
        Description: "默认 LLM 模型",
        Type:        "string",
        Default:     "claude-sonnet-5",
        Category:    "llm",
        Secret:      false,
    })
}
```

**配置项属性**：
- `Key`：配置键（点分格式）
- `Description`：配置描述
- `Type`：配置类型（string/int/float/bool）
- `Default`：默认值
- `Category`：配置分类
- `Secret`：是否为敏感值（敏感值在 API 响应中隐藏）

## 配置生效机制

### 立即生效

大部分配置修改后立即生效，无需重启服务：
- LLM 模型切换
- 功能开关
- 速率限制参数

### 需要重启

少数配置修改后需要重启服务：
- 数据库连接配置
- Redis 连接配置
- JWT 密钥

## 相关文档

- [Admin 服务概述](/admin/overview/)
- [部署与运维](/admin/deployment/)
- [API 参考](/admin/api-reference/)
