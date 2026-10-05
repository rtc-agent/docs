# RTC Agent Admin 权限系统 — 开发摘要

> **源文档**: [admin-permission-system.md](./admin-permission-system.md) (v2.7, ~10000 行)  
> **本摘要**: 提取对开发有用的核心设计，≤2000 行

---

## 目录

0. [Casdoor 参考项目索引](#0-casdoor-参考项目索引)
1. [设计目标](#1-设计目标)
2. [关键约束](#2-关键约束)
3. [系统架构](#3-系统架构)
4. [数据库设计](#4-数据库设计)
5. [API 设计](#5-api-设计)
6. [前端集成](#6-前端集成)
7. [安全规则](#7-安全规则)
8. [部署配置](#8-部署配置)
9. [验收标准](#9-验收标准)
10. [实施清单](#10-实施清单)

---

## 0. Casdoor 参考项目索引

> 本项目参考了 [Casdoor](https://github.com/casdoor/casdoor) 的核心设计，以下是关键的参考文件路径。

**本地路径**：`~/Workspaces/rtc-agent/casdoor`（已通过 git submodule 引入）

### 核心参考文件

| 模块 | 文件路径 | 参考内容 |
| --- | --- | --- |
| **数据模型** | [`casdoor/object/`](../../casdoor/object/) | 角色、用户、权限的数据结构定义 |
| ↳ 角色模型 | [`casdoor/object/role.go`](../../casdoor/object/role.go) | Role 结构体、角色继承、组织隔离 |
| ↳ 用户模型 | [`casdoor/object/user.go`](../../casdoor/object/user.go) | User 结构体、OAuth2 集成 |
| ↳ 权限模型 | [`casdoor/object/permission.go`](../../casdoor/object/permission.go) | Permission 结构体、策略定义 |
| **API 路由** | [`casdoor/routers/`](../../casdoor/routers/) | RESTful API 设计模式 |
| ↳ 路由定义 | [`casdoor/routers/router.go`](../../casdoor/routers/router.go) | 路由注册、中间件配置 |
| ↳ 角色 API | [`casdoor/routers/role_api.go`](../../casdoor/routers/role_api.go) | 角色 CRUD 接口实现 |
| ↳ 权限 API | [`casdoor/routers/permission_api.go`](../../casdoor/routers/permission_api.go) | 权限管理接口实现 |
| **权限检查** | [`casdoor/authz/`](../../casdoor/authz/) | Casbin 集成、权限检查逻辑 |
| ↳ Casbin 初始化 | [`casdoor/authz/casbin.go`](../../casdoor/authz/casbin.go) | Enforcer 初始化、模型加载 |
| ↳ 权限验证 | [`casdoor/authz/authz.go`](../../casdoor/authz/authz.go) | Enforce 调用、中间件实现 |
| **前端集成** | [`casdoor/web/`](../../casdoor/web/) | React 前端权限控制 |
| ↳ 权限组件 | [`casdoor/web/src/PermissionEdit.tsx`](../../casdoor/web/src/PermissionEdit.tsx) | 权限编辑 UI |
| ↳ 角色管理 | [`casdoor/web/src/RoleEditPage.tsx`](../../casdoor/web/src/RoleEditPage.tsx) | 角色管理页面 |

### 关键设计参考

**Casbin 模型配置**（参考 [`casdoor/conf/app.conf`](../../casdoor/conf/app.conf)）：

```ini
# Casdoor 使用的 Casbin 模型
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

**角色模型**（参考 [`casdoor/object/role.go:25-50`](../../casdoor/object/role.go#L25-L50)）：

```go
type Role struct {
    Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
    Name        string `xorm:"varchar(100) notnull pk" json:"name"`
    DisplayName string `xorm:"varchar(100)" json:"displayName"`
    Description string `xorm:"varchar(255)" json:"description"`
    Roles       []string `xorm:"mediumtext" json:"roles"`       // 继承的角色
    Domains     []string `xorm:"mediumtext" json:"domains"`     // 域隔离
    IsEnabled   bool   `json:"isEnabled"`
}
```

**权限检查中间件**（参考 [`casdoor/authz/authz.go:50-100`](../../casdoor/authz/authz.go#L50-L100)）：

```go
func Enforce(authToken string, method string, path string) (bool, error) {
    // 从 JWT 解析用户信息
    claims, err := ParseJwt(authToken)
    
    // 调用 Casbin Enforce
    allowed, err := enforcer.Enforce(claims.User, path, method)
    return allowed, err
}
```

### 我们方案的差异

| 维度 | Casdoor | RTC Agent（我们的方案） |
| --- | --- | --- |
| 框架 | Beego + Xorm | Gin + GORM |
| 前端 | 自建 React 应用 | Ant Design Pro + Umi Max |
| 多租户 | Organization + Domain 隔离 | MVP 单租户，未来扩展 |
| 权限模型 | 支持 ABAC、RBAC 多种 | MVP 使用 RBAC，按需扩展 |
| 用户认证 | 完整 OAuth2/OIDC 流程 | 复用现有认证（JWT + Refresh Token） |

---

## 1. 设计目标

**后端**：集成 Casbin v2，实现 RBAC 权限控制，支持动态权限管理，数据持久化到 PostgreSQL。

**前端**：从 `/api/auth/me` 获取角色和权限列表，动态菜单渲染，按钮级权限控制。**不引入 casbin.js**，使用 Ant Design Pro 内置 `access` 机制。

---

## 2. 关键约束

> 以下是从现有代码中提炼的硬约束，设计方案必须遵循。

### 2.1 Error() 始终返回 HTTP 200

**参考**：[`server/internal/handler/http/response.go`](../../../server/internal/handler/http/response.go)

```go
func Error(c *gin.Context, statusCode int, errorCode, errorMessage string) {
    c.JSON(http.StatusOK, ResponseStructure{
        Success:      false,
        ErrorCode:    errorCode,
        ErrorMessage: errorMessage,
    })
}
```

**影响**：所有 API 错误通过 HTTP 200 + `{ success: false, errorCode: "..." }` 传达。验收测试不能依赖 HTTP 状态码，必须检查响应体。

### 2.2 Refresh Token 是不透明字符串（非 JWT）

**参考**：[`server/internal/usecase/admin_auth.go`](../../../server/internal/usecase/admin_auth.go)

Refresh token 是不透明字符串 `rt_` + hex(32 random bytes)，以 SHA-256 哈希存储，每次刷新轮转。

### 2.3 统一响应信封

```json
{
  "success": true/false,
  "data": { ... },
  "errorCode": "...",
  "errorMessage": "..."
}
```

前端 `responseInterceptors` 自动解包：`success: true` 时返回 `data` 字段。

### 2.4 Repo 接口模式

**参考**：[`server/internal/repo/errors.go`](../../server/internal/repo/errors.go)

- Repo 层定义 **interface**，实现为未导出 struct
- 所有查询使用 `DBFromContext(ctx, r.db)` 支持事务传播
- Sentinel errors 集中在 `repo/errors.go`

**现有 sentinel errors**：

| Error | 说明 |
| --- | --- |
| `ErrNotFound` | 记录不存在 |
| `ErrAlreadyExists` | 记录已存在 |
| `ErrPermissionDenied` | 权限不足（已定义，尚未被 admin auth 使用） |
| `ErrRefreshTokenNotFound` | Refresh token 不存在 |
| `ErrOAuth2UserNotFound` | OAuth2 用户不存在 |
| `ErrDuplicateEmail` | 邮箱重复（定义在 `user_repo.go`） |

**权限系统需新增**：

| Error | 说明 |
| --- | --- |
| `ErrConflict` | 乐观锁冲突 |
| `ErrDuplicateName` | 角色名重复 |
| `ErrCannotRemoveLastAdmin` | 移除最后一个 admin 角色 |
| `ErrCannotDeleteSystemRole` | 删除系统保留角色 |
| `ErrRoleDisabled` | 角色已禁用 |
| `ErrCannotRemoveSelfAdmin` | 用户移除自己的 admin 角色 |

- `IsDuplicateKeyError(err)` 检测 PostgreSQL 唯一约束冲突（错误码 23505）

### 2.5 User 模型已支持 OAuth2

**参考**：[`server/internal/model/user.go`](../../server/internal/model/user.go)

```go
type User struct {
    ID              uuid.UUID
    Email           string
    Name            string
    AvatarURL       string
    PasswordHash    string     // 本地密码
    Provider        string     // OAuth2 provider（如 "google"），本地用户为空
    ProviderSubject string     // OAuth2 唯一标识
    CreatedAt       time.Time
    UpdatedAt       time.Time
    DeletedAt       *time.Time // 软删除
}
```

权限系统必须与此兼容。

### 2.6 前端 Token 刷新机制

**参考**：[`src/requestErrorConfig.ts`](../../web-components/packages/admin-ui/src/requestErrorConfig.ts)

- 请求拦截器：从 `localStorage` 读取 `admin_access_token` 注入 `Authorization` header
- 响应拦截器：检查 `errorCode === 'unauthorized'`，自动刷新 token 并重试
- `isRefreshing` 标志 + `refreshSubscribers` 队列防止并发刷新

### 2.7 admin-server 静态文件服务

**参考**：[`server/cmd/admin/serve.go:200`](../../server/cmd/admin/serve.go#L200)

前端构建产物嵌入 admin-server 二进制，`ServeStaticFiles(router)` 服务 admin-ui SPA。

---

## 3. 系统架构

### 3.1 技术栈

| 层级 | 技术 | 说明 |
| --- | --- | --- |
| 后端框架 | Gin + GORM + PostgreSQL | Go 1.27+ |
| 权限引擎 | Casbin v2 + gorm-adapter v3 | 内存策略，> 100K ops/sec |
| 前端框架 | React 19 + Umi Max v4 | Ant Design Pro v6 |
| UI 组件 | antd v6 + pro-components v3 | 含 `<Access>` 权限组件 |
| 样式 | Tailwind CSS v4 | 优先级最高 |
| 状态管理 | `@@initialState` + `@tanstack/react-query` | 全局 + 服务端状态 |

### 3.2 后端模块

**现有文件**（需修改）：

```text
server/
├── cmd/
│   ├── admin/
│   │   ├── serve.go          # 启动入口 [修改：初始化 Casbin Enforcer]
│   │   ├── keygen.go          # JWT 密钥对生成
│   │   └── account.go         # 管理员 CLI [修改：支持角色分配]
│   ├── migrate.go             # 数据库迁移 [修改：添加 Role/UserRole 迁移]
│   └── root.go                # Cobra 根命令
├── internal/
│   ├── handler/http/
│   │   ├── admin_auth.go      # 认证 Handler [修改：扩展 /api/auth/me]
│   │   ├── admin_types.go     # 请求/响应类型 [修改：添加角色/权限字段]
│   │   └── response.go        # 统一响应 [参考]
│   ├── usecase/
│   │   ├── admin_auth.go      # 认证业务逻辑 [参考]
│   │   └── errors.go          # 业务错误 [修改：添加权限相关错误]
│   ├── repo/
│   │   ├── errors.go          # Sentinel errors [修改：添加权限相关 errors]
│   │   └── user_repo.go       # 用户数据访问 [参考]
│   ├── model/
│   │   ├── user.go            # 用户模型 [参考]
│   │   └── admin_refresh_token.go
│   └── infra/
│       ├── auth/
│       │   ├── admin_jwt.go   # JWT 签名器 [参考]
│       │   └── auth.go        # 认证基础设施 [参考]
│       └── config/
│           ├── admin_config.go        # 配置结构 [修改：添加 Features 段]
│           └── admin_config_loader.go
└── etc/
    └── admin.yaml             # 配置文件 [修改：添加 features.permission_system]
```

**新增文件**：

```text
server/
├── cmd/admin/
│   └── debug.go           # 权限调试 CLI [新增]
├── internal/
│   ├── handler/http/
│   │   ├── role.go               # 角色管理 Handler [新增]
│   │   ├── permission.go         # 权限管理 Handler [新增]
│   │   ├── user_role.go          # 用户-角色关联 Handler [新增]
│   │   └── casbin_middleware.go   # 权限检查中间件 [新增]
│   ├── usecase/
│   │   ├── role.go               # 角色 CRUD [新增]
│   │   ├── permission.go         # 权限策略管理 [新增]
│   │   └── bootstrap.go          # 引导数据策略 [新增]
│   ├── repo/
│   │   ├── role_repo.go          # 角色数据访问 [新增]
│   │   └── user_role_repo.go     # 用户-角色关联 [新增]
│   ├── model/
│   │   ├── role.go               # 角色模型 [新增]
│   │   ├── user_role.go          # 用户-角色关联模型 [新增]
│   │   └── audit_log.go          # 审计日志模型 [新增]
│   └── infra/
│       └── auth/
│           ├── casbin.go         # Casbin Enforcer [新增]
│           └── policy_watcher.go # Redis Pub/Sub 同步 [新增]
```

### 3.3 前端模块

```text
web-components/packages/admin-ui/
├── config/
│   ├── config.ts              # Umi Max 主配置
│   ├── routes.ts              # 声明式路由（含 access 字段）
│   └── proxy.ts
├── src/
│   ├── access.ts              # 权限定义 [改造]
│   ├── app.tsx                # 运行时配置 [改造]
│   ├── requestErrorConfig.ts  # 请求错误处理 + 401 刷新
│   ├── pages/
│   │   └── system/
│   │       ├── roles/         # 角色管理页面 [新增]
│   │       └── permissions/   # 权限管理页面 [新增]
│   ├── services/
│   │   ├── admin-auth.ts      # 认证 API
│   │   ├── role.ts            # 角色管理 API [新增]
│   │   └── permission.ts      # 权限管理 API [新增]
│   └── utils/
│       └── auth-storage.ts    # Token localStorage 管理
```

### 3.4 权限模型

**Casbin RBAC**：

- `g` 类型（Grouping Policy）：用户-角色映射 → `g, userID, roleID`
- `p` 类型（Policy）：角色-资源-操作映射 → `p, roleID, resource, action`

**示例**：

```text
# 用户 user1 拥有角色 admin
g, user1-uuid, admin-uuid

# admin 角色可以读写 user 资源
p, admin-uuid, user, read
p, admin-uuid, user, write
```

**权限检查流程**：

```
请求 → JWT 解析 → Casbin 中间件 → Enforce(userID, resource, action) → 允许/拒绝
```

**中间件映射**：

| 路由 | 资源 | HTTP 方法 | 操作 |
| --- | --- | --- | --- |
| `/api/roles` | `role` | GET | read |
| `/api/roles` | `role` | POST | write |
| `/api/roles/:id` | `role` | PUT | write |
| `/api/roles/:id` | `role` | DELETE | delete |
| `/api/permissions` | `permission` | GET/POST | read/write |
| `/api/users/:id/roles` | `user_role` | GET/POST/DELETE | read/write/delete |
| `/api/audit-logs` | `audit_log` | GET | read |

**安全注意**：当前为 allow-by-default — 未映射的路由跳过权限检查。新增 API 必须在 `routeResourceMap` 注册。

---

## 4. 数据库设计

### 4.1 迁移策略

- 主系统表：`model.AutoMigrate(db)` — sessions, messages, goals, files, owners, turns...
- admin-server 表：`db.AutoMigrate(&model.User{}, &model.Role{}, ...)` — users, roles, user_roles, casbin_rule, audit_logs
- **约束**：admin-server 表不能与主系统表有外键关联
- 迁移入口：[`server/cmd/migrate.go`](../../server/cmd/migrate.go)

### 4.2 Casbin 模型配置

```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

### 4.3 表结构

#### users 表（已存在）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | UUID v7 | 主键 |
| email | VARCHAR(255) | 唯一，非空 |
| name | VARCHAR(100) | |
| avatar_url | TEXT | |
| password_hash | VARCHAR(255) | 本地密码，bcrypt cost 12 |
| provider | VARCHAR(50) | OAuth2 provider |
| provider_subject | VARCHAR(255) | OAuth2 subject |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| deleted_at | TIMESTAMP | 软删除（*time.Time，GORM 不自动过滤） |

#### roles 表（新增）

```go
type Role struct {
    ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
    Name        string    `gorm:"size:100;uniqueIndex;not null"`
    DisplayName string    `gorm:"size:200;not null"`
    Description string    `gorm:"size:500"`
    IsSystem    bool      `gorm:"default:false"`   // 系统内置角色不可删除
    IsEnabled   bool      `gorm:"default:true"`    // 禁用后不生效
    CreatedAt   time.Time
    UpdatedAt   time.Time
}

func (r *Role) TableName() string { return "roles" }

func (r *Role) BeforeCreate(tx *gorm.DB) error {
    if r.ID == uuid.Nil {
        r.ID = uuid.Must(uuid.NewV7())
    }
    return nil
}
```

#### user_roles 表（新增）

```go
type UserRole struct {
    UserID     uuid.UUID `gorm:"type:uuid;primaryKey"`
    RoleID     uuid.UUID `gorm:"type:uuid;primaryKey"`
    AssignedAt time.Time
}

func (ur *UserRole) TableName() string { return "user_roles" }
```

**索引**：

```sql
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_roles_name ON roles(name);
```

#### casbin_rule 表（gorm-adapter 自动创建）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | SERIAL | 主键 |
| ptype | VARCHAR(10) | `p` 或 `g` |
| v0 | VARCHAR(100) | subject (role ID for p, user ID for g) |
| v1 | VARCHAR(100) | object (resource for p, role ID for g) |
| v2 | VARCHAR(100) | action (for p type) |
| v3 | VARCHAR(100) | 预留 |
| v4 | VARCHAR(100) | 预留 |
| v5 | VARCHAR(100) | 预留 |

#### audit_logs 表（新增）

```go
type AuditLog struct {
    ID           uuid.UUID      `gorm:"type:uuid;primaryKey"`
    OperatorID   uuid.UUID      `gorm:"type:uuid;not null;index"`
    OperatorIP   string         `gorm:"size:45"`
    EventType    string         `gorm:"size:50;not null;index"` // create_role, update_role, delete_role, assign_role, revoke_role, create_permission, delete_permission
    ResourceType string         `gorm:"size:50;not null;index"` // role, user, permission
    ResourceID   uuid.UUID      `gorm:"type:uuid;index"`
    Details      postgres.Jsonb `gorm:"type:jsonb"`             // 变更详情
    CreatedAt    time.Time      `gorm:"not null;index"`
}

func (a *AuditLog) TableName() string { return "audit_logs" }
```

### 4.4 引导数据策略

首次部署时，如果 `roles` 表为空，自动创建：

| 角色 | Name | DisplayName | IsSystem | 默认权限 |
| --- | --- | --- | --- | --- |
| 管理员 | `admin` | 管理员 | true | `(user, read/write/delete), (role, read/write/delete), (permission, read/write/delete), (user_role, read/write/delete), (audit_log, read)` |
| 运营 | `operator` | 运营 | false | `(user, read/write), (role, read), (user_role, read/write)` |
| 观察者 | `viewer` | 观察者 | false | `(user, read)` |

**权限数量**：admin 13 条，operator 5 条，viewer 1 条。

**说明**：user_role 权限用于管理用户-角色关联 API（见 5.5 节），admin 和 operator 需要这些权限来执行角色分配操作。

实现：[`server/internal/usecase/bootstrap.go`](../../server/internal/usecase/bootstrap.go)

```go
func BootstrapAdmin(db *gorm.DB, enforcer *casbin.Enforcer) error {
    var count int64
    db.Model(&model.Role{}).Count(&count)
    if count > 0 {
        return nil // 已有数据，跳过
    }
    
    return db.Transaction(func(tx *gorm.DB) error {
        // 创建角色 + Casbin 策略（同一事务）
        roles := []model.Role{
            {Name: "admin", DisplayName: "管理员", IsSystem: true, IsEnabled: true},
            {Name: "operator", DisplayName: "运营", IsSystem: false, IsEnabled: true},
            {Name: "viewer", DisplayName: "观察者", IsSystem: false, IsEnabled: true},
        }
        for i := range roles {
            roles[i].ID = uuid.Must(uuid.NewV7())
            if err := tx.Create(&roles[i]).Error; err != nil {
                return err
            }
        }
        
        // 添加权限策略
        adminPolicies := [][]string{
            {roles[0].ID.String(), "user", "read"},
            {roles[0].ID.String(), "user", "write"},
            {roles[0].ID.String(), "user", "delete"},
            {roles[0].ID.String(), "role", "read"},
            {roles[0].ID.String(), "role", "write"},
            {roles[0].ID.String(), "role", "delete"},
            {roles[0].ID.String(), "permission", "read"},
            {roles[0].ID.String(), "permission", "write"},
            {roles[0].ID.String(), "permission", "delete"},
            {roles[0].ID.String(), "audit_log", "read"},
        }
        // ... operator 和 viewer 策略类似
        
        if _, err := enforcer.AddPolicies(adminPolicies); err != nil {
            return err
        }
        // ... 其他角色的策略
        
        return nil
    })
}
```

### 4.5 表关系图

```mermaid
erDiagram
    users ||--o{ user_roles : "has"
    roles ||--o{ user_roles : "assigned to"
    roles ||--o{ casbin_rule : "p type (role_id, resource, action)"
    users ||--o{ casbin_rule : "g type (user_id, role_id)"
    users ||--o{ audit_logs : "operates"
    
    users {
        uuid id PK
        string email UK
        string password_hash
        string provider
        string provider_subject
    }
    
    roles {
        uuid id PK
        string name UK
        string display_name
        bool is_system
        bool is_enabled
    }
    
    user_roles {
        uuid user_id PK,FK
        uuid role_id PK,FK
        timestamp assigned_at
    }
    
    casbin_rule {
        int id PK
        string ptype
        string v0
        string v1
        string v2
    }
    
    audit_logs {
        uuid id PK
        uuid operator_id FK
        string event_type
        string resource_type
        uuid resource_id
        jsonb details
        timestamp created_at
    }
```

---

## 5. API 设计

### 5.1 通用规则

- 基础路径：`/api/`
- 认证：`Authorization: Bearer <access_token>`
- 分页：`?page=1&page_size=20`，响应包含 `{ items: [...], total: N }`
- 错误码：见 [2.1](#21-error-始终返回-http-200)

### 5.2 认证 API（已实现）

| 方法 | 路径 | 说明 | 认证 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 登录 | 否 |
| POST | `/api/auth/refresh` | 刷新 Token | 否 |
| GET | `/api/auth/me` | 当前用户信息（含角色和权限） | 是 |
| POST | `/api/auth/logout` | 登出 | 是 |

#### GET /api/auth/me（扩展）

**响应**：

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin",
    "avatar_url": "https://...",
    "roles": [
      {"id": "uuid", "name": "admin", "display_name": "管理员"}
    ],
    "permissions": [
      {"resource": "user", "action": "read"},
      {"resource": "user", "action": "write"},
      {"resource": "role", "action": "read"}
    ]
  }
}
```

**注意**：`roles` 和 `permissions` 字段使用 `omitempty`，向后兼容旧客户端。

### 5.3 角色管理 API

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/api/roles` | 查询角色列表 | role:read |
| GET | `/api/roles/:id` | 查询单个角色 | role:read |
| POST | `/api/roles` | 创建角色 | role:write |
| PUT | `/api/roles/:id` | 更新角色 | role:write |
| PATCH | `/api/roles/:id` | 部分更新（如禁用） | role:write |
| DELETE | `/api/roles/:id` | 删除角色 | role:delete |

#### POST /api/roles

**请求**：

```json
{
  "name": "operator",
  "display_name": "运营",
  "description": "负责日常运营"
}
```

**响应**：

```json
{
  "success": true,
  "data": {
    "id": "01912345-...",
    "name": "operator",
    "display_name": "运营",
    "description": "负责日常运营",
    "is_system": false,
    "is_enabled": true,
    "created_at": "2026-10-05T10:00:00Z"
  }
}
```

**错误码**：

| errorCode | 说明 |
| --- | --- |
| `validation_error` | 参数校验失败 |
| `role_name_exists` | 角色名已存在 |

#### DELETE /api/roles/:id

**错误码**：

| errorCode | 说明 |
| --- | --- |
| `role_not_found` | 角色不存在 |
| `cannot_delete_system_role` | 系统内置角色不可删除 |
| `cannot_remove_last_admin` | 最后一个 admin 角色的最后一个用户 |

### 5.4 权限管理 API

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/api/permissions` | 查询权限策略列表 | permission:read |
| POST | `/api/permissions` | 创建权限策略 | permission:write |
| DELETE | `/api/permissions` | 删除权限策略 | permission:delete |
| POST | `/api/permissions/check` | 检查用户权限 | permission:read |

#### POST /api/permissions

**请求**：

```json
{
  "role": "operator",
  "resource": "user",
  "action": "read"
}
```

#### POST /api/permissions/check

**请求**：

```json
{
  "user_id": "uuid",
  "resource": "user",
  "action": "write"
}
```

**响应**：

```json
{
  "success": true,
  "data": {
    "allowed": true
  }
}
```

### 5.5 用户-角色关联 API

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/api/users/:id/roles` | 查询用户角色 | user_role:read |
| POST | `/api/users/:id/roles` | 分配角色（批量） | user_role:write |
| DELETE | `/api/users/:id/roles/:roleId` | 移除角色 | user_role:delete |
| GET | `/api/roles/:id/users` | 查询角色下的用户 | user_role:read |

#### POST /api/users/:id/roles

**请求**：

```json
{
  "role_ids": ["uuid1", "uuid2"]
}
```

**错误码**：

| errorCode | 说明 |
| --- | --- |
| `role_not_found` | 角色 ID 不存在 |
| `role_disabled` | 角色已禁用 |
| `cannot_remove_last_admin` | 移除最后一个 admin 角色 |
| `cannot_remove_self_admin` | 用户移除自己的 admin 角色 |

### 5.6 审计日志 API

| 方法 | 路径 | 说明 | 权限 |
| --- | --- | --- | --- |
| GET | `/api/audit-logs` | 查询审计日志 | audit_log:read |

**查询参数**：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| actor_id | UUID | 操作者 ID |
| resource_type | string | 资源类型 |
| action | string | 操作类型 |
| target_id | UUID | 目标资源 ID |
| start_time | RFC3339 | 时间范围起点 |
| end_time | RFC3339 | 时间范围终点 |
| page / page_size | int | 分页 |

### 5.7 统一错误码体系

| errorCode | 含义 | 触发场景 |
| --- | --- | --- |
| `unauthorized` | 未认证 | 无 Token / Token 过期 / Token 无效 |
| `forbidden` | 无权限 | 用户无对应 Casbin 策略 |
| `validation_error` | 参数校验失败 | 请求体不符合约束 |
| `invalid_credentials` | 凭证错误 | 邮箱或密码错误 |
| `role_not_found` | 角色不存在 | 操作目标角色 ID 无效 |
| `role_name_exists` | 角色名重复 | 创建角色名称已存在 |
| `role_disabled` | 角色已禁用 | 尝试分配已禁用角色 |
| `cannot_remove_last_admin` | 最后管理员保护 | 移除最后一个 admin 角色 |
| `cannot_remove_self_admin` | 自删除管理员保护 | 用户移除自己的 admin 角色 |
| `cannot_delete_system_role` | 系统角色保护 | 删除系统内置角色 |
| `refresh_token_expired` | 刷新令牌过期 | Refresh Token 超过 TTL |
| `refresh_token_revoked` | 刷新令牌已撤销 | Token 已被撤销（登出） |

---

## 6. 前端集成

### 6.1 修改 `app.tsx` — 从 API 获取权限

**参考**：[`web-components/packages/admin-ui/src/app.tsx`](../../web-components/packages/admin-ui/src/app.tsx)

```typescript
// src/app.tsx
export async function getInitialState() {
  const userInfo = await getCurrentUser(); // 调用 /api/auth/me
  
  // 构建 permissionSet（Set<string>，O(1) 查询）
  const permissionSet = new Set(
    (userInfo.permissions || []).map(
      (p: { resource: string; action: string }) => `${p.resource}:${p.action}`
    )
  );
  
  const roleNames = (userInfo.roles || []).map((r: any) => r.name);
  
  return {
    currentUser: {
      ...userInfo,
      // 向后兼容：旧后端不返回 roles，默认 admin
      access: userInfo.roles
        ? (roleNames.includes('admin') ? 'admin' : 'user')
        : 'admin',
      permissions: permissionSet,
    },
  };
}
```

### 6.2 修改 `access.ts` — 基于角色和权限

**参考**：[`web-components/packages/admin-ui/src/access.ts`](../../web-components/packages/admin-ui/src/access.ts)

```typescript
// src/access.ts
export default function access(initialState: { currentUser?: API.CurrentUser } | undefined) {
  const { currentUser } = initialState ?? {};
  const perms = currentUser?.permissions as Set<string> | undefined;
  
  return {
    // 管理员
    canAdmin: perms?.has('user:write') ?? false,
    
    // 用户管理
    canUserView: perms?.has('user:read') ?? false,
    canUserEdit: perms?.has('user:write') ?? false,
    canUserDelete: perms?.has('user:delete') ?? false,
    
    // 角色管理
    canRoleView: perms?.has('role:read') ?? false,
    canRoleEdit: perms?.has('role:write') ?? false,
    
    // 权限管理
    canPermissionView: perms?.has('permission:read') ?? false,
    canPermissionEdit: perms?.has('permission:write') ?? false,
    
    // 审计日志
    canAuditLogView: perms?.has('audit_log:read') ?? false,
  };
}
```

### 6.3 路由配置 — 使用 `access` 字段

**参考**：[`web-components/packages/admin-ui/config/routes.ts`](../../web-components/packages/admin-ui/config/routes.ts)

```typescript
// config/routes.ts
export default [
  {
    path: '/system',
    name: '系统管理',
    icon: 'setting',
    access: 'canAdmin', // 需要 canAdmin 权限
    routes: [
      {
        path: '/system/roles',
        name: '角色管理',
        component: './system/roles',
        access: 'canRoleView',
      },
      {
        path: '/system/permissions',
        name: '权限管理',
        component: './system/permissions',
        access: 'canPermissionView',
      },
    ],
  },
];
```

### 6.4 按钮级权限控制 — 使用 `useAccess`

```tsx
import { useAccess, Access } from '@umijs/max';

export default function UserListPage() {
  const access = useAccess();
  
  return (
    <div>
      <h1>用户管理</h1>
      
      {/* 按钮级权限控制 */}
      <Access accessible={access.canUserEdit} fallback={null}>
        <Button type="primary">编辑用户</Button>
      </Access>
      
      <Access accessible={access.canUserDelete} fallback={null}>
        <Button danger>删除用户</Button>
      </Access>
    </div>
  );
}
```

### 6.5 权限刷新策略

Token 刷新时，重新获取 `/api/auth/me` 更新权限：

```typescript
// requestErrorConfig.ts
async function handleTokenRefresh() {
  const tokens = await refreshToken();
  saveTokens(tokens);
  
  // 同时刷新权限数据
  const userInfo = await getCurrentUser();
  const permissionSet = new Set(
    (userInfo.permissions || []).map(
      (p: { resource: string; action: string }) => `${p.resource}:${p.action}`
    )
  );
  
  setInitialState(prev => ({
    ...prev,
    currentUser: {
      ...prev.currentUser,
      ...userInfo,
      permissions: permissionSet,
    },
  }));
}
```

---

## 7. 安全规则

### 7.1 密码策略

- 最小长度：8 字符
- 复杂度：至少包含大写、小写、数字、特殊字符中的 3 种
- 存储：bcrypt cost 12
- 适用：仅本地密码登录用户，OAuth2 用户不需要密码

### 7.2 登录保护

- 失败锁定：5 次失败后锁定 15 分钟
- 锁定维度：IP + 邮箱双重锁定
- Redis Key：`admin:login:ip:{ip}` 和 `admin:login:email:{email}`

### 7.3 Rate Limiting

- 全局限流：100 请求/分钟/IP
- Redis Key：`admin:ratelimit:{ip}`

### 7.4 Token 安全

- Access Token TTL：1 小时（生产环境建议 15 分钟）
- Refresh Token TTL：7 天，每次刷新轮转
- 存储：localStorage（配合 CSP 缓解 XSS）

### 7.5 CSP Header

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'
```

### 7.6 边界保护

| 场景 | 保护 | errorCode |
| --- | --- | --- |
| 删除最后一个 admin 角色 | 拒绝 | `cannot_remove_last_admin` |
| 用户移除自己的 admin 角色 | 拒绝 | `cannot_remove_self_admin` |
| 删除系统内置角色（admin） | 拒绝 | `cannot_delete_system_role` |
| 创建重复名称的角色 | 拒绝 | `role_name_exists` |
| 分配不存在的角色 | 拒绝 | `role_not_found` |
| 分配已禁用的角色 | 拒绝 | `role_disabled` |
| 批量分配混合有效/无效 ID | 整个请求回滚 | `role_not_found` |

---

## 8. 部署配置

### 8.1 docker-compose.yml

```yaml
services:
  admin-server:
    build: .
    ports:
      - "28081:8081"
    depends_on:
      migrate:
        condition: service_completed_successfully
    volumes:
      - ./etc/admin.yaml:/app/etc/admin.yaml:ro
    environment:
      - ADMIN_DATABASE_DSN=postgres://rtc_agent:rtc_agent@postgres:5432/rtc_agent
      - ADMIN_REDIS_ADDR=redis:6379
  
  migrate:
    build: .
    command: ["./rtc-agent", "migrate"]
    depends_on:
      postgres:
        condition: service_healthy
```

### 8.2 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `ADMIN_DATABASE_DSN` | PostgreSQL 连接字符串 | |
| `ADMIN_REDIS_ADDR` | Redis 地址 | `localhost:6379` |
| `ADMIN_JWT_ACCESS_TTL` | Access Token TTL | `3600` (1h) |
| `ADMIN_JWT_REFRESH_TTL` | Refresh Token TTL | `604800` (7d) |
| `ADMIN_SECURITY_LOGIN_MAX_ATTEMPTS` | 登录失败锁定阈值 | `5` |
| `ADMIN_SECURITY_LOGIN_LOCK_DURATION` | 锁定持续时间 | `900` (15m) |
| `ADMIN_SECURITY_RATE_LIMIT_PER_MINUTE` | 每分钟请求限制 | `100` |
| `ADMIN_FEATURES_PERMISSION_SYSTEM` | 权限系统灰度开关 | `true` |

### 8.3 灰度发布

通过 `admin.yaml` 控制权限系统开关：

```yaml
features:
  permission_system: true  # false = 旧模式（所有用户 admin）
```

关闭灰度时，`/api/auth/me` 返回 `roles: [{name: "admin"}]`，所有用户拥有完整权限。

---

## 9. 验收标准

### 9.1 后端验收

#### 数据库迁移

```bash
docker-compose run migrate
docker-compose exec postgres psql -U rtc_agent -c "\d roles"
docker-compose exec postgres psql -U rtc_agent -c "\d user_roles"
docker-compose exec postgres psql -U rtc_agent -c "\d casbin_rule"
```

- ✅ `roles` 表创建成功
- ✅ `user_roles` 表创建成功
- ✅ `casbin_rule` 表由 gorm-adapter 自动创建
- ✅ 引导数据策略执行成功（默认角色已初始化）
- ✅ 迁移可重复执行（幂等性）

#### 角色管理 API

```bash
# 创建角色
curl -X POST http://localhost:28081/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"operator","display_name":"运营"}'

# 查询角色列表
curl http://localhost:28081/api/roles -H "Authorization: Bearer $TOKEN"

# 更新角色
curl -X PUT http://localhost:28081/api/roles/$ROLE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"超级管理员"}'

# 删除角色
curl -X DELETE http://localhost:28081/api/roles/$ROLE_ID \
  -H "Authorization: Bearer $TOKEN"
```

- ✅ CRUD 操作正常
- ✅ 角色名称唯一性约束
- ✅ 系统角色不可删除
- ✅ 最后一个 admin 不可移除

#### 权限检查

```bash
# 无 Token 访问
curl -s http://localhost:28081/api/roles | jq .
# 预期：{ "success": false, "errorCode": "unauthorized" }

# 无权限用户访问
curl -s -H "Authorization: Bearer $VIEWER_TOKEN" \
  -X DELETE http://localhost:28081/api/roles/$ROLE_ID | jq .
# 预期：{ "success": false, "errorCode": "forbidden" }
```

### 9.2 前端验收

#### access.ts 权限计算

```typescript
import access from '@/access';

const result = access({
  currentUser: {
    access: 'admin',
    permissions: new Set(['user:read', 'user:write', 'role:read']),
  },
});
expect(result.canAdmin).toBe(true);
expect(result.canUserView).toBe(true);
expect(result.canUserEdit).toBe(true);
expect(result.canRoleEdit).toBe(false);
```

#### 动态菜单

- ✅ 管理员看到所有菜单
- ✅ 运营只看到用户列表
- ✅ 观察者看不到管理菜单

#### 按钮权限

- ✅ 无权限的按钮隐藏
- ✅ 有权限的按钮显示

### 9.3 性能验收

| 指标 | 目标值 | 测量方法 |
| --- | --- | --- |
| 单次 Enforce 延迟 | < 1ms (P99) | `go test -bench=BenchmarkEnforce` |
| Enforce 吞吐量 | > 100,000 ops/sec | `go test -bench=BenchmarkEnforce -benchtime=10s` |
| Enforcer 初始化 | < 500ms (100 条策略) | `time.Now()` |
| API 响应时间 P95 | < 100ms | `ab -n 1000 -c 10` |

### 9.4 安全验收

```bash
# SQL 注入测试
curl -X POST http://localhost:28081/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"admin'\'' OR '\''1'\''='\''1"}'
# 预期：{ "success": false, "errorCode": "validation_error" }

# XSS 测试
curl -X POST http://localhost:28081/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>"}'
# 预期：{ "success": false, "errorCode": "validation_error" }
```

- ✅ SQL 注入无效（GORM 参数化）
- ✅ XSS 无效（React 自动转义 + CSP）

---

## 10. 实施清单

### 后端任务

- [ ] 添加 Casbin 依赖：`go get github.com/casbin/casbin/v2`、`go get github.com/casbin/gorm-adapter/v3`
- [ ] 新增 sentinel errors 到 `repo/errors.go`
- [ ] 创建 `model/role.go`（UUID v7、TableName、BeforeCreate）
- [ ] 创建 `model/user_role.go`（复合主键）
- [ ] 创建 `infra/auth/casbin.go`（Enforcer 初始化）
- [ ] 修改 `cmd/migrate.go`（添加 Role/UserRole AutoMigrate + BootstrapAdmin）
- [ ] 创建 `repo/role_repo.go`、`repo/user_role_repo.go`
- [ ] 创建 `usecase/role.go`、`usecase/permission.go`
- [ ] 创建 `handler/http/role.go`、`handler/http/permission.go`、`handler/http/user_role.go`
- [ ] 创建 `handler/http/casbin_middleware.go`（权限检查中间件 + routeResourceMap）
- [ ] 扩展 `/api/auth/me` 返回 `roles[]` + `permissions[]`
- [ ] 实现 `BootstrapAdmin()`（幂等引导策略）
- [ ] 实现审计日志写入（关键操作）
- [ ] 实现 Rate Limiting 中间件
- [ ] 实现登录保护（IP + 邮箱双重锁定）
- [ ] 单元测试（覆盖率 ≥ 80%）

### 前端任务

- [ ] 修改 `app.tsx`（从 API 获取角色/权限，构建 permissionSet）
- [ ] 修改 `access.ts`（基于角色的动态权限定义）
- [ ] 修改 `config/routes.ts`（添加系统管理路由 + access 字段）
- [ ] 实现角色管理页面（`pages/system/roles/`）
- [ ] 实现权限管理页面（`pages/system/permissions/`）
- [ ] 实现按钮级权限控制（`useAccess` + `<Access>`）
- [ ] 实现 Token 刷新时的权限同步
- [ ] 前端单元测试（`access.test.ts` 覆盖率 100%）

### 部署任务

- [ ] 更新 `docker-compose.yml`（admin-server depends_on migrate）
- [ ] 验证迁移流程（空数据库 + 现有环境升级）
- [ ] 配置灰度开关（`features.permission_system`）
- [ ] E2E 测试（Playwright）

---

**文档结束**  
完整设计细节请参见 [admin-permission-system.md](./admin-permission-system.md)。
