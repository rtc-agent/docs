---
title: System Configuration Management
description: Dynamic configuration system of Admin service, supporting configuration query, modification, and audit
---

# System Configuration Management

The Admin service provides a dynamic configuration management system that allows administrators to modify system configuration at runtime without restarting the service.

## Architecture Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────
│   Admin UI   │────►│ Admin Server │────►│   Database   │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                            ▼
                    ──────────────┐
                    │   Config     │
                    │   Registry   │
                    └──────────────┘
```

**Core Components**:
- **Config Registry**: Configuration item registry, defines all available configuration items
- **Database**: Stores configuration values (including user custom overrides)
- **Admin Server**: Handles configuration query and modification requests
- **Admin UI**: Provides graphical configuration interface

## Configuration Layers

The system configuration supports a three-layer override mechanism:

```
┌─────────────────────────────────────────┐
│              Final Config Value          │
│  (YamlDefault → RegistryDefault → User) │
└─────────────────────────────────────────

Priority (high to low):
1. User Override    - User custom override
2. RegistryDefault  - Default value registered in code
3. YamlDefault      - Value in YAML configuration file
```

### Configuration Sources

| Source | Description | Priority |
|--------|-------------|----------|
| `YamlDefault` | Configuration value in `etc/config.yaml` | Low |
| `RegistryDefault` | Default value registered via `config.Register()` in code | Medium |
| `User Override` | Configuration value modified via Admin UI | High |

## Configuration Categories

### LLM Configuration

| Config Item | Description | Type |
|-------------|-------------|------|
| `llm.model` | Default LLM model | string |
| `llm.api_key` | LLM API key | string (secret) |
| `llm.base_url` | LLM API URL | string |
| `llm.temperature` | Temperature parameter | float |
| `llm.max_tokens` | Max tokens | int |

### Authentication Configuration

| Config Item | Description | Type |
|-------------|-------------|------|
| `auth.jwt_secret` | JWT secret | string (secret) |
| `auth.token_ttl` | Token TTL | int |
| `auth.refresh_token_ttl` | Refresh Token TTL | int |

### Storage Configuration

| Config Item | Description | Type |
|-------------|-------------|------|
| `storage.provider` | Storage provider (s3/minio) | string |
| `storage.endpoint` | S3 endpoint | string |
| `storage.bucket` | Bucket name | string |
| `storage.encryption.session_token_key` | Session encryption key | string (secret) |

### Feature Flags

| Config Item | Description | Type |
|-------------|-------------|------|
| `features.skill_system` | Skill system toggle | bool |
| `features.memory` | Memory system toggle | bool |
| `features.notifications` | Notification system toggle | bool |

## API Endpoints

### List All Configurations

```http
GET /api/server-configs
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "key": "llm.model",
        "description": "Default LLM model",
        "value": "claude-sonnet-5",
        "yaml_default": "claude-sonnet-5",
        "registry_default": "claude-sonnet-5",
        "user_override": null,
        "type": "string",
        "updated_at": null
      },
      {
        "key": "llm.temperature",
        "description": "Temperature parameter",
        "value": "0.9",
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

### Get Single Configuration

```http
GET /api/server-configs/:key
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "key": "llm.model",
    "description": "Default LLM model",
    "value": "claude-sonnet-5",
    "yaml_default": "claude-sonnet-5",
    "registry_default": "claude-sonnet-5",
    "user_override": null,
    "type": "string",
    "updated_at": null
  }
}
```

### Update Configuration

```http
PUT /api/server-configs/:key
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "value": "claude-opus-5"
}
```

**Optimistic Locking**:

Configuration updates use the `updated_at` field for optimistic locking to prevent concurrent modification conflicts:

```http
PUT /api/server-configs/:key
Authorization: Bearer <access_token>
Content-Type: application/json
If-Match: "2024-01-01T00:00:00Z"

{
  "value": "claude-opus-5"
}
```

**Conflict Response**:
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

### Delete User Override

```http
DELETE /api/server-configs/:key
Authorization: Bearer <access_token>
```

After deletion, the configuration value falls back to `RegistryDefault` or `YamlDefault`.

## Per-User Configuration Override

The system supports per-user configuration overrides:

### Get User Configuration

```http
GET /api/user-configs?user_id=:user_id
Authorization: Bearer <access_token>
```

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

### Delete User Configuration

```http
DELETE /api/user-configs/:key?user_id=:user_id
Authorization: Bearer <access_token>
```

## Configuration Change Audit

All configuration modifications are recorded in audit logs:

```http
GET /api/audit-logs?resource=config
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

## Admin UI Operations

### Configuration List Page

![System Configuration Interface](/docs/demo-screenshot/admin-overview.png)

**Features**:
- Filter configuration items by category
- Search configuration items
- View current value, default value, and override value
- Edit configuration value

### Edit Configuration

1. Click on configuration item to enter edit mode
2. Modify configuration value
3. Click save

**Validation**:
- Type validation (string/int/float/bool)
- Range validation (e.g., temperature 0-2)
- Format validation (e.g., URL format)

## Dynamic Configuration Registration

Developers can register new configuration items via code:

```go
package config

func init() {
    Register(ConfigItem{
        Key:         "llm.model",
        Description: "Default LLM model",
        Type:        "string",
        Default:     "claude-sonnet-5",
        Category:    "llm",
        Secret:      false,
    })
}
```

**Configuration Item Properties**:
- `Key`: Configuration key (dot-separated)
- `Description`: Configuration description
- `Type`: Configuration type (string/int/float/bool)
- `Default`: Default value
- `Category`: Configuration category
- `Secret`: Whether it's a sensitive value (sensitive values are hidden in API responses)

## Configuration Effect Mechanism

### Immediate Effect

Most configuration changes take effect immediately without restarting the service:
- LLM model switching
- Feature flags
- Rate limiting parameters

### Requires Restart

Few configuration changes require service restart:
- Database connection configuration
- Redis connection configuration
- JWT keys

## Related Documentation

- [Admin Service Overview](/en/admin/overview/)
- [Deployment & Operations](/en/admin/deployment/)
- [API Reference](/en/admin/api-reference/)
