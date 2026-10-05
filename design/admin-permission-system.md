# RTC Agent Admin 权限系统设计文档

> **版本**: v2.7  
> **日期**: 2026-10-05  
> **状态**: Draft  
> **参考项目**: [Casdoor](https://github.com/casdoor/casdoor)  
> **最后更新**: 第 21 次迭代 — 新增开发者速查卡、最佳实践指南、扩展 FAQ、补充边界验收标准  
> **修订摘要**:
>
> **v2.7（本次）**:
>
> - 新增 Ch.29 开发者速查卡：项目结构总览、关键文件索引、常用命令速查、错误码映射表、API 模板、Git 提交规范
> - 新增 Ch.30 最佳实践指南：后端开发实践（错误处理、事务管理、日志规范、Repo 模式）、前端开发实践（权限组件复用、状态管理、性能优化）、安全实践（输入校验、Token 管理、CSP 配置）
> - 扩展 Ch.27.4 FAQ：新增 5 个常见问题（密码策略适用场景、角色继承权限计算、审计日志查询、权限变更回退、批量操作性能）
> - 补充 Ch.19.5.4 边界验收标准：覆盖已禁用角色、过期 Token 并发刷新、批量分配混合有效/无效角色 ID 场景
> - 修正 Ch.8.2 迁移代码注释：明确 `model.AutoMigrate(db)` 迁移主系统表、`db.AutoMigrate(...)` 迁移 admin 表（与 [`migrate.go`](../server/cmd/migrate.go) 实际代码一致）
> - 修正 Ch.4.3.1 后端模块文件列表：补充 `audit_log.go` 模型文件、`policy_watcher.go` 基础设施文件
> - TOC 新增 Ch.29-30 条目
>
> **v2.6（前次）**:
>
> - 修复 Ch.25 前端检查清单交叉引用：`app.tsx` 引用 7.2 节、`routes.ts` 引用 7.4 节、按钮权限引用 7.5 节（原先指向整章或错误章节）
> - 修复 Ch.27.3 场景 1 标题层级：将 4 个加粗步骤标签（`**步骤 N：**`）改为 h5 标题，消除 MD036 警告
> - 新增 Ch.28.6 故障排除指南：运行时问题诊断表（12 项）、权限异常排查决策树、数据不一致修复流程、紧急回滚操作手册
> - 新增 Ch.28.7 性能调优指南：后端调优（Enforcer 缓存、数据库连接池、索引优化）、前端调优（Set vs Array、permissionSet 生命周期）、监控与告警阈值配置
> - 细化 Ch.18.5.1 阶段一和阶段二任务分解：每个任务增加子步骤（如 T2 拆分为 4 个子任务、T5 拆分为 3 个子任务）
> - 新增 Ch.18.11 合规性考虑：数据保护（GDPR/个保法）、审计合规（SOC 2/等保）、隐私设计（PIPL）
>
> **v2.5（前次）**:
>
> - 新增 ADR-006：多实例策略同步使用 Redis Pub/Sub（含完整伪代码和消息格式设计）
> - 新增 ADR-007：Token 存储方案选择 localStorage 的安全缓解措施
> - 新增 ADR-008：引导数据使用代码内嵌（非配置文件）的决策记录
> - 新增 ADR-009：Casbin 策略与角色表的冗余存储策略（业务表为主、Casbin 表为辅）
> - 新增 Ch.27 快速入门指南：5 分钟搭建本地环境、第一次 API 调用、常见开发场景（新增受保护 API、排查权限问题、前端权限控制）、FAQ（7 个常见问题）
> - 新增 Ch.28 实施经验总结：实施顺序 Mermaid 图、常见陷阱与避免方法（10 项）、PR 描述模板、性能优化经验、安全审计检查清单（10 项）
> - 修复 MD036 警告：将加粗步骤标签（`**步骤 X：**`）改为四级标题，将方案标签改为五级标题
>
> **v2.4（前次）**:
>
> - 修复 Ch.23 版本历史排序：v1.9 条目从 v2.3 之后移至 v2.0 之前（恢复时间线顺序）
> - 修复 Ch.11.4 SQL 注入测试注释：`返回 400 Bad Request` → `返回 HTTP 200 + errorCode: "validation_error"`（与 [2.2.1](#221-error-始终返回-http-200) 一致）
> - 修复 Ch.12.11 边界情况总结：`curl -X DELETE .../admin → 403` → `→ HTTP 200 + errorCode: "cannot_delete_system_role"`（与统一响应格式一致）
> - 补充 Ch.2.2.4 sentinel errors 清单：新增 `ErrCannotRemoveSelfAdmin`（用户自删除 admin 角色保护），与 Ch.19.5.4 和 Ch.25 检查清单保持一致
> - 修复 Ch.12.1 角色删除描述矛盾：标题"软删除"改为"禁用 + 级联清理"，与代码实际行为（`is_enabled = false`）一致
> - 增强 Ch.14.2 Casbin 中间件安全说明：明确 `allow-by-default` 行为的安全风险和缓解措施（新路由未注册时的默认放行问题）
> - 补充 Ch.14.2 `routeResourceMap`：新增 `/api/audit-logs` 路由映射（参见 [14.1.3](#1413-审计日志查询-api)）
> - 新增 Ch.19.5.6 权限变更场景验收：活跃会话中权限变更、并发角色修改、Token 撤销级联
> - 新增 Ch.26 决策记录（ADR）：记录 RBAC 模型选择、UUID v7 主键、allow-by-default 中间件等关键架构决策
>
> **v2.3（前次）**:
>
> - 修复全部 17 处 MD040 警告（代码围栏缺少语言标记）：目录树/HTTP 路由/Casbin 策略/CSP 头 → `text`
> - 修复全部 25 处 MD031 警告（代码围栏前缺少空行）：列表项内代码围栏统一添加空行
> - 修复 2 处 MD051 警告（无效链接锚点）：`#73-修改-accessts--基于角色和权限` → `#sec-7-3`，并在 Ch.7.3 标题添加显式锚点 `{#sec-7-3}`
> - 修复 Ch.6.0 JSON 示例无效注释：`//` 注释不是合法 JSON，拆分为独立代码块
> - 修复 Ch.19.5.3 安全验收测试用例：`400 Bad Request` → HTTP 200 + `errorCode: "validation_error"`，与统一响应格式一致
> - 新增 Ch.19.5.4 边界情况验收标准：最后一个 admin 角色删除保护、自删除 admin 保护、重复角色名、不存在的角色分配
> - 新增 Ch.19.5.5 多实例与缓存一致性验收标准：Redis Pub/Sub 策略同步、Token 刷新权限更新、重启策略重加载
> - Ch.25 检查清单补充：最后 admin 保护、自删除保护、Redis Pub/Sub 多实例同步任务项
> - Ch.25 前端任务引用统一添加锚点链接（`[7.3 节](#sec-7-3)` 等）
> - 版本历史表（Ch.23）补充 v2.2 和 v2.3 条目
> - 代码调查确认：server 端无权限系统代码（`ErrPermissionDenied` 仅用于资源归属校验，非 RBAC），与文档设计一致
>
> **v2.2（前次）**:
>
> - 修复全部 27 处 MD032 警告（列表前后空行），涉及 Ch.11/12/13/14/15/18/19/20
> - 整合 Ch.7.8.1 重复的 `access.ts` 函数定义 → 引用 [7.3 节](#sec-7-3) 的规范定义 + 仅展示增量
> - 整合 Ch.12.10（权限变更通知）重复的 `access.ts` 函数 → 修正为在 layout 层检测权限变化（`access.ts` 是纯函数，不能使用 hooks）
> - 整合 Ch.12.6 重复的 `Role` 结构体 → 引用 [5.4.2 节](#542-roles-表新增) 规范定义
> - 整合 Ch.13.1 重复的 `Role`/`UserRole` 结构体 → 引用 [5.4.2](#542-roles-表新增) / [5.4.3](#543-user_roles-表新增) + 补充索引标签说明
> - 整合 Ch.12.4（性能优化缓存）重复的 `getInitialState` → 引用 7.2 节 + 强调 Set 结构性能要点
> - 整合 Ch.22.2.2 多租户扩展的 `Role` 结构体 → 引用 [5.4.2 节](#542-roles-表新增) 规范定义 + 展示 TenantID 增量
> - 新增 Ch.2.2.6 代码现状说明：`requestErrorConfig.ts` 存在两套并行 401 处理逻辑（middleware + responseInterceptors），实际生效的是后者
>
> **v2.1（前次）**:
>
> - 修复 Ch.21 术语表 Access Token TTL："15 分钟"→"1 小时"，与实际 `admin.yaml` 配置 `access_token_ttl: 3600` 一致
> - 修复 Ch.7.6 Token 刷新同步延迟："最多 15 分钟"→"最多 1 小时"，与 access token TTL 保持一致
> - 修复 Ch.25 检查清单 sentinel errors：`ErrLastAdminRole`→`ErrCannotRemoveLastAdmin`，补全 5 个新增错误（与 Ch.2.2.4 一致）
> - 修复 Ch.14.4.2 DebugHandler.RegisterRoutes：传入 `jwtAuth gin.HandlerFunc` 参数，替代不存在的 `h.JWTAuthMiddleware()`
> - 修复 Ch.2.1 配置文件引用：`admin.go`→`admin_config.go` + `admin_config_loader.go`
> - 修复 Ch.4.3.1 后端目录树：合并重复 `repo/` 段
> - 修复 Ch.18.5.1 重复章节号 → 18.5.2
> - 修复 v2.0 摘要 sentinel errors 数量：3→5
>
> **v2.0（前次）**:
>
> - 修复 Ch.4.2 / Ch.18.4 Go 版本：go.mod 实际为 `go 1.27.0`，文档原先写的 `Go 1.22+` 不准确
> - 修复 Ch.2.2.4 sentinel errors 列表：补充完整清单（`ErrRefreshTokenNotFound`、`ErrOAuth2UserNotFound` 等），明确权限系统需新增的 3 个 sentinel errors（`ErrConflict`、`ErrDuplicateName`、`ErrLastAdminRole`）
> - 修复 Ch.12.2 `repo.ErrDuplicateName`：明确标注为需新增的 sentinel error，并提供与 `repo.IsDuplicateKeyError()` 的配合用法
> - 新增 Ch.18.5.1 实施任务依赖图：Mermaid 图表展示关键路径、并行可能性、阻塞依赖
> - 新增 Ch.18.10 非功能性需求清单：可观测性（OpenTelemetry 集成）、可追溯性（审计链）、合规性考虑
> - 修复 Ch.25 检查清单：补充遗漏的验收标准交叉引用
>
> **v1.9（前次）**:
>
> - 修复 Ch.2.3 前端目录树：移除重复的 `src/access.ts` 条目
> - 修复 Ch.4.2 后端依赖：明确标注 Casbin v2 / gorm-adapter v3 为"待添加"（当前 go.mod 中不存在），补充具体版本号（Gin v1.12、GORM v1.30 等）和配置加载库（viper）
> - 修复 Ch.14.4.2 调试 API 代码：`handler.Error()`/`handler.Success()` → 同包内直接调用 `Error()`/`Success()`；添加 `NewDebugHandler` 构造函数；错误消息使用 `sanitizeBindingError()` 避免泄露内部字段名；添加结构化日志
> - 修复 Ch.12.6 乐观锁代码：补充 `repo.ErrConflict` sentinel error 需在 `repo/errors.go` 新增的说明；错误包装使用 `fmt.Errorf("...: %w", repo.ErrConflict)` 遵循项目约定
> - 修复 Ch.18.2.2 灰度配置：补充 `AdminConfig` 需新增 `Features` 段的代码示例（当前配置结构体不包含此段）
> - 扩展 Ch.2.2.4 Repo 接口模式：补充完整 sentinel errors 列表（`ErrNotFound`、`ErrAlreadyExists`、`ErrPermissionDenied`）、`IsDuplicateKeyError()` 检测 PG 23505、`ErrDuplicateEmail` 定义位置（`user_repo.go` 而非 `errors.go`）
>
> **v1.8（前次）**:
>
> - 新增 Section 0（文档约定）— 引用格式、代码示例分类、状态标记、术语约定
> - 修复 Ch.3.5.1/3.5.2 误导性：明确标注 Casdoor casbin.js 代码"仅供参考"，非我们方案
> - 修复 Ch.20.1 向后兼容性代码逻辑错误：`'admin' : 'admin'` → 正确的三元表达式
> - 更新 Ch.2.3 前端技术栈：React 19 + Umi Max v4 + antd v6 + Tailwind CSS v4 + Biome + Vitest
> - 新增质量控制与代码审查机制（18.8）— PR 流程、自动化检查、人工审查清单
> - 新增灰度发布详细设计（18.2 扩展）— Feature Flag、流量切换、监控指标、回滚触发条件
> - 新增文档维护计划（18.9）— 文档与代码同步机制、变更触发更新规则
> - 增强验收标准（Ch.19）— 补充量化指标和自动化验证命令
> - 补充 Ch.4.3.1 前端模块结构（与 admin-ui 实际目录一致）
>
> **v1.7（前次）**:
>
> - 修复 Chapter 19（验收标准）缺失 H2 标题头的问题
> - 消除 12.5 与 6.0.1 的错误码表重复，改为交叉引用
> - 修复破损的交叉引用（18.3 中 "20.1" → "8.5.2"）
> - 消除 20.1 与 8.5 的数据迁移重复，20.1 改为引用 8.5
> - 新增版本历史章节，完整记录 v1.0 → v1.7 变更
> - 新增并发控制与分布式锁设计（12.6）
> - 改进目录导航，增加分层子章节链接
> - 修复审计日志表 `gen_random_uuid()` 与 GORM 兼容性问题
> - 合并 13.2.1 与 16.5 的重复基准测试内容
> - 完善附录检查清单，增加自动化验证项
> - 新增文档约定章节（0.1），说明引用格式与伪代码说明
> - 补充 Casbin 中间件 `routeResourceMap`/`methodActionMap` 的位置说明（避免 14.2 重复定义）
>
> **v1.6（前次）**:
>
> - 修复验收标准章节（Ch.19）的子章节编号错误（17.x.x → 19.x.x）
> - 修复数据库设计章节（Ch.5）的子章节编号错误（5.3.x → 5.4.x）
> - 新增前端权限缓存刷新策略（7.7：token 刷新同步、多标签页 BroadcastChannel）
> - 新增前端权限控制高级场景（7.8：复合权限条件、按钮降级显示、动态菜单图标）
> - 新增权限变更通知机制（7.9：MVP 被动刷新 + 后续 SSE/WebSocket 方案）
> - 新增国际化 i18n 支持设计（7.10：i18n key 规范、后端错误码前端映射、角色名称翻译）
> - 大幅扩展审计日志设计（14.1：事件分类、字段规范、审计表 schema、查询 API、归档策略）
> - 新增团队分工与协作方案（18.6：角色分工、并行开发流程、接口契约、代码审查 checklist）
> - 新增权限系统可配置性分析（18.7：二维模型 vs ABAC、配置项清单）
> - **新增数据迁移详细设计**（8.5：现有系统迁移步骤、数据清理、回滚方案）
> - **新增权限调试与排查工具**（14.4：CLI 命令、API 端点、诊断流程）
> - **新增性能基准测试详细设计**（13.1：Casbin enforcer 基准、数据库查询性能、并发测试）
> - **新增扩展性设计**（22.1：新权限维度、多租户支持、自定义 matcher）
> - 修复多处 Markdown lint 警告（MD036/MD040/MD051）
>
> **v1.5（前次）**:
>
> - 新增完整的 RESTful API 设计规范与请求/响应示例
> - 新增统一的错误码体系（按严重程度分级）
> - 补充数据库迁移的详细步骤与版本控制策略
> - 新增完整的测试策略（单元测试、集成测试、E2E 测试）
> - 补充前端权限控制的详细实现（路由守卫、按钮级权限、动态菜单）
> - 新增与 RTC Agent 主系统的集成点说明
> - 补充实施计划中的风险点与缓解措施
> - 新增术语表与交叉引用

---

## 📋 目录

> **导航说明**：带 **★** 的章节为实施阶段最关键的内容；带 📊 标记的章节包含 Mermaid 图表。

**按角色推荐阅读路径**：

| 角色 | 必读章节 | 选读章节 |
| --- | --- | --- |
| **后端开发** | 4→5→6→8→9→12→14 | 2→3→10→11→13→17 |
| **前端开发** | 4→7→16.2.2→19.2 | 3→11.5→17 |
| **QA / 测试** | 16→19 | 11→12→13→14 |
| **运维 / DevOps** | 8→14→15→18.2 | 10→13→17 |
| **技术负责人 / 架构师** | 全文通读 | — |
| **产品经理** | 1→4→7→18→19 | 9→11 |

0. [文档约定](#0-文档约定) — 引用格式、代码示例说明、状态标记
1. [背景与目标](#1-背景与目标)
2. [现有系统分析](#2-现有系统分析) ★ — 含 OAuth2、Error() 行为、Refresh Token 机制
3. [参考架构：Casdoor](#3-参考架构casdoor)
4. [系统设计方案](#4-系统设计方案) 📊 ★ — 整体架构、权限模型、核心流程
5. [数据库设计](#5-数据库设计) 📊 ★ — 迁移策略、Casbin 模型、表结构详情
6. [API 设计](#6-api-设计) ★ — 含 RESTful 规范、错误码体系、请求/响应示例
7. [前端集成方案](#7-前端集成方案) ★ — 路由守卫、按钮级权限、动态菜单、缓存策略、i18n、权限通知
8. [部署与迁移](#8-部署与迁移) 📊 ★ — 含数据库迁移版本控制、数据迁移详细设计
9. [引导数据策略](#9-引导数据策略) 📊 — 首次部署的角色/权限初始化
10. [策略同步与多实例](#10-策略同步与多实例)
11. [安全策略](#11-安全策略) — 密码策略、登录保护、CSRF/XSS 防护、Rate Limiting
12. [错误处理与边界情况](#12-错误处理与边界情况) — 级联删除、并发处理、用户禁用、分布式锁、用户删除清理、角色禁用、批量分配、缓存失效
13. [性能优化](#13-性能优化) — 索引、缓存、批量操作、性能基准测试
14. [监控与日志](#14-监控与日志) ★ — 审计日志详细设计、查询 API、归档策略、Prometheus 指标、调试工具
15. [灾难恢复](#15-灾难恢复) — 备份方案、恢复流程
16. [测试策略](#16-测试策略) 📊 — 单元测试、集成测试、E2E 测试
17. [与 RTC Agent 主系统集成](#17-与-rtc-agent-主系统集成) 📊 — 集成点、数据流、共享基础设施
18. [实施计划](#18-实施计划) 📊 ★ — 含灰度发布（Feature Flag）、风险点、团队分工、可配置性、质量控制、文档维护、非功能性需求、合规性考虑
19. [验收标准](#19-验收标准) ★
20. [向后兼容性](#20-向后兼容性)
21. [术语表](#21-术语表)
22. [扩展性设计](#22-扩展性设计) — 权限维度扩展、多租户支持
23. [版本历史](#23-版本历史)
24. [参考资料](#24-参考资料)
25. [附录：检查清单](#25-附录检查清单)
26. [附录：决策记录（ADR）](#26-附录决策记录adr) — RBAC 引擎选择、UUID v7 主键、中间件策略、统一响应格式、软删除约定、Redis Pub/Sub 同步、Token 存储、引导数据、冗余策略
27. [附录：快速入门指南](#27-附录快速入门指南) — 5 分钟环境搭建、第一次 API 调用、常见开发场景、FAQ
28. [附录：实施经验总结](#28-附录实施经验总结) — 实施顺序、常见陷阱、PR 模板、性能优化、安全审计、故障排除指南、性能调优指南
29. [附录：开发者速查卡](#29-附录开发者速查卡) — 项目结构总览、关键文件索引、常用命令速查、错误码映射、API 模板、Git 提交规范
30. [附录：最佳实践指南](#30-附录最佳实践指南) — 后端实践（错误处理、事务管理、日志规范）、前端实践（权限组件、状态管理）、安全实践（输入校验、Token 管理）

---

## 0. 文档约定

> 本章说明文档中使用的引用格式、伪代码说明和术语规范，帮助读者正确理解文档内容。

### 0.1 文件引用格式

文档中的文件引用使用以下格式：

| 格式 | 含义 | 示例 |
| --- | --- | --- |
| [`path/to/file`](relative/path) | 链接到仓库中的文件 | [`server/cmd/admin/serve.go`](../server/cmd/admin/serve.go) |
| [`path/to/file:L42`](relative/path#L42) | 链接到文件的具体行 | [`serve.go:86-98`](../server/cmd/admin/serve.go#L86-L98) |
| `path/to/file` | 未 hyperlink 的文件路径引用 | `server/internal/model/user.go` |
| **参考文件**：`path` | 表示该段落的设计参考了此文件 | **参考现有实现**：[`server/cmd/migrate.go`](../server/cmd/migrate.go) |

### 0.2 代码示例说明

文档中的代码示例分为三类：

| 类型 | 标记 | 说明 |
| --- | --- | --- |
| **实际代码** | 无特殊标记 | 直接从现有代码库摘录，可作为实现参考 |
| **伪代码** | 标题或注释中标注"伪代码" | 描述逻辑流程，不是可直接编译的代码。实现时需根据实际框架 API 调整 |
| **设计示意** | 标题中标注"示例" | 展示设计意图的简化代码，仅用于说明概念 |

### 0.3 状态标记

| 标记 | 含义 |
| --- | --- |
| ✅ | 已实现 / 已完成 / 正确 |
| ❌ | 缺失 / 未完成 / 错误 |
| ⚠️ | 需要注意 / 有条件限制 |
| 📊 | 包含 Mermaid 图表 |
| ★ | 实施阶段最关键的内容 |

### 0.4 章节交叉引用

- 章节编号格式：`章.节.小节`（如 `8.5.2`）
- 交叉引用格式：`参见 [章节号](#anchor)` 或 `参见 [章节标题](#anchor)`
- 如果引用的章节在文档其他地方有详细描述，使用"**请参见**"而非重复内容

### 0.5 术语约定

- **admin-server**：专指后台管理系统的 Go 后端服务（`server/cmd/admin/serve.go`）
- **admin-ui**：专指后台管理系统的前端 SPA（`web-components/packages/admin-ui`）
- **主系统** / **RTC Agent 主系统**：指 `server-1` / `server-2`，负责 RTC 会话管理
- **Enforcer**：Casbin Enforcer 的简称
- **策略**：Casbin Policy 的中文翻译

---

## 1. 背景与目标

### 1.1 现状问题

**Server 端**（[`server/cmd/admin/serve.go`](../server/cmd/admin/serve.go)）：

- ✅ 已实现基础认证 API（login、refresh、me、logout）
- ✅ 已集成 Gin + GORM + PostgreSQL
- ❌ **缺失**：没有权限系统，所有用户权限相同
- ❌ **缺失**：没有角色管理功能

**前端**（[`web-components/packages/admin-ui`](../web-components/packages/admin-ui)）：

- ✅ 基于 Ant Design Pro 框架
- ✅ 有基础权限框架（`access.ts`）
- ❌ **硬编码**：所有用户硬编码为 `access: 'admin'`（[app.tsx:62](../web-components/packages/admin-ui/src/app.tsx#L62)）
- ❌ **缺失**：没有动态权限控制

### 1.2 设计目标

1. **后端**：
   - 集成 Casbin 权限框架
   - 实现 RBAC（基于角色的访问控制）
   - 支持动态权限管理（运行时增删改策略）
   - 权限数据持久化到 PostgreSQL

2. **前端**：
   - 从 `/api/auth/me` 获取用户角色和权限列表
   - 动态菜单渲染（根据用户权限，使用 Ant Design Pro 内置 `access` 机制）
   - 按钮级权限控制（使用 `useAccess` + `<Access>` 组件）
   - 权限管理 UI（角色管理、权限分配）
   - **不引入 casbin.js**，直接使用角色/权限数据驱动

3. **参考标准**：
   - 学习 Casdoor 的核心设计
   - 简化为适合 RTC Agent 的轻量级方案

---

## 2. 现有系统分析

### 2.1 Server 端现有架构

**目录结构**：

```text
server/
├── cmd/admin/
│   ├── serve.go          # Admin Server 入口
│   └── account.go        # 账户管理命令
├── internal/
│   ├── handler/http/
│   │   ├── admin_auth.go     # 认证 Handler
│   │   └── admin_types.go    # 请求/响应类型
│   ├── usecase/
│   │   └── admin_auth.go     # 认证业务逻辑
│   ├── repo/
│   │   └── admin_refresh_token_repo.go
│   ├── model/
│   │   ├── user.go           # 用户模型
│   │   └── admin_refresh_token.go
│   └── infra/
│       ├── auth/
│       │   └── admin_jwt.go  # JWT 签名器
│       └── config/
│           ├── admin_config.go        # AdminConfig 结构体定义
│           └── admin_config_loader.go # 配置加载、默认值、校验
```

**关键文件**：

1. **入口文件**：[`server/cmd/admin/serve.go`](../server/cmd/admin/serve.go)

   ```go
   // 已集成组件
   - Gin (HTTP 框架)
   - GORM (ORM)
   - PostgreSQL (数据库)
   - JWT (认证)
   ```

2. **用户模型**：[`server/internal/model/user.go`](../server/internal/model/user.go)

   ```go
   // 实际代码（含 OAuth2 支持）
   type User struct {
       ID           uuid.UUID
       Email        string
       Name         string
       AvatarURL    string
       PasswordHash string          // 本地密码登录
       Provider        string       // OAuth2 provider（如 "google"），本地用户为空
       ProviderSubject string       // OAuth2 唯一标识
       CreatedAt    time.Time
       UpdatedAt    time.Time
       DeletedAt    *time.Time      // 软删除
       // ❌ 缺失：Role、Permissions 字段
   }
   ```

   **注意**：User 已支持双认证模式 — 本地密码 + OAuth2/OIDC（参见 [`usecase/admin_auth.go:FindOrCreateUser`](../server/internal/usecase/admin_auth.go)）。权限系统必须与此兼容。

3. **认证 Handler**：[`server/internal/handler/http/admin_auth.go`](../server/internal/handler/http/admin_auth.go)
   - ✅ 已实现：Login、RefreshToken、GetCurrentUser、Logout
   - ❌ 缺失：权限检查、角色管理

### 2.2 关键发现与约束

> 以下是从现有代码中提炼的关键行为，设计方案必须遵循这些约束。

#### 2.2.1 Error() 始终返回 HTTP 200

**参考文件**：[`server/internal/handler/http/response.go`](../server/internal/handler/http/response.go)

```go
func Error(c *gin.Context, statusCode int, errorCode, errorMessage string) {
    // 始终返回 200 状态码，让前端的 response interceptor 能够处理
    c.JSON(http.StatusOK, ResponseStructure{
        Success:      false,
        ErrorCode:    errorCode,
        ErrorMessage: errorMessage,
    })
}
```

**影响**：所有 API 错误（包括 401、403）都通过 HTTP 200 + `{ success: false, errorCode: "..." }` 传达。前端通过 `responseInterceptors` 检查 `errorCode === 'unauthorized'` 来触发 token 刷新。**验收测试不能依赖 HTTP 状态码**，必须检查响应体。

#### 2.2.2 Refresh Token 是不透明字符串（非 JWT）

**参考文件**：[`server/internal/usecase/admin_auth.go`](../server/internal/usecase/admin_auth.go)

```go
// Refresh tokens are opaque: 32 random bytes hex-encoded with "rt_" prefix
// Stored as SHA-256 hash in DB (never plaintext)
refreshPlain := generateRefreshTokenPlain()  // "rt_" + hex(32 random bytes)
refreshHash := hashRefreshToken(refreshPlain) // SHA-256
```

虽然 `AdminJWTSigner.SignRefreshToken()` 存在，但 `AdminAuthUsecase` **未使用它**。Refresh token 是不透明字符串，以 SHA-256 哈希存储，每次刷新时轮转。

#### 2.2.3 统一响应信封

所有 API 返回统一格式：

```json
{
  "success": true/false,
  "data": { ... },
  "errorCode": "...",
  "errorMessage": "..."
}
```

前端 `responseInterceptors` 自动解包：`success: true` 时返回 `data` 字段内容。

#### 2.2.4 Repo 接口模式

**参考文件**：[`server/internal/repo/errors.go`](../server/internal/repo/errors.go)、[`server/internal/repo/admin_refresh_token_repo.go`](../server/internal/repo/admin_refresh_token_repo.go)、[`server/internal/repo/user_repo.go`](../server/internal/repo/user_repo.go)

- Repo 层定义 **interface**（`UserRepo`、`AdminRefreshTokenRepo`），实现为未导出 struct
- 所有查询使用 `DBFromContext(ctx, r.db).WithContext(ctx)` 支持事务传播
- Sentinel errors 集中在 `repo/errors.go` 定义，**完整清单**如下（参见 [`repo/errors.go`](../server/internal/repo/errors.go)）：
  - 通用：`ErrNotFound`、`ErrAlreadyExists`
  - 权限：`ErrPermissionDenied`（已定义，尚未被 admin auth 使用）
  - Session 相关：`ErrSessionNotFound`、`ErrSessionClosed`、`ErrSessionClosedOrNotFound`
  - Turn/Message/Rtc/Device/Goal/Loop/File 等：各领域 `*NotFound` 变体
  - RefreshToken：`ErrRefreshTokenNotFound`
  - OAuth2User：`ErrOAuth2UserNotFound`
  - 包级特定：`ErrDuplicateEmail`（定义在 `user_repo.go:95-96`，非 `errors.go`）
- 调用方通过 `repo.IsNotFound(err)` 判断 not-found 类错误（内部聚合检查所有 `*NotFound` 变体）
- 通过 `repo.IsDuplicateKeyError(err)` 检测 PostgreSQL 唯一约束冲突（错误码 23505）
- 新 Repo 必须遵循此模式。权限系统需新增以下 sentinel errors 到 `errors.go`：

  - `ErrConflict = errors.New("resource conflict (optimistic lock)")` — 乐观锁冲突（参见 [12.6](#126-并发控制与分布式锁)）
  - `ErrDuplicateName = errors.New("role name already exists")` — 角色名重复（参见 [12.2](#122-并发创建角色)）
  - `ErrCannotRemoveLastAdmin = errors.New("cannot remove the last admin role from user")` — 移除最后一个管理员角色（参见 [12.1](#121-角色删除的级联处理)）
  - `ErrCannotDeleteSystemRole = errors.New("cannot delete system reserved role")` — 删除系统保留角色（参见 [12.8](#128-角色禁用后的权限检查)）
  - `ErrRoleDisabled = errors.New("role is disabled")` — 角色已禁用（参见 [12.9](#129-批量分配角色的性能与一致性)）
  - `ErrCannotRemoveSelfAdmin = errors.New("cannot remove admin role from yourself")` — 用户移除自己的 admin 角色（参见 [12.1](#121-角色删除的级联处理)）

#### 2.2.5 `admin/account.go` CLI 命令

**参考文件**：[`server/cmd/admin/account.go`](../server/cmd/admin/account.go)

该文件提供了 `rtc-agent admin account create` CLI 命令，用于创建初始管理员用户。权限系统需要扩展此命令以支持角色分配。

#### 2.2.6 前端 Token 刷新机制

**参考文件**：[`src/requestErrorConfig.ts`](../web-components/packages/admin-ui/src/requestErrorConfig.ts)

- 请求拦截器：从 `localStorage` 读取 `admin_access_token` 注入 `Authorization` header
- 响应拦截器：检查 `errorCode === 'unauthorized'`，自动刷新 token 并重试
- 使用 `isRefreshing` 标志 + `refreshSubscribers` 队列防止并发刷新
- `isInitializing` 标志防止 `getInitialState` 期间误跳转登录页

> **注意（代码现状）**：`requestErrorConfig.ts` 中存在**两套并行的 401 处理逻辑** — 一个在 Umi request 的 `middleware` 中（检查 HTTP 401 状态码），另一个在 `responseInterceptors` 中（检查 `data?.errorCode === 'unauthorized'`）。由于项目的 `Error()` 始终返回 HTTP 200，实际生效的是 `responseInterceptors` 分支。`middleware` 分支是死代码，但可能在某些边界情况（如网络错误返回真实 401）被触发。权限系统实现时应保留 `responseInterceptors` 方案，并在后续迭代中清理 `middleware` 中的重复逻辑。

#### 2.2.7 admin-server 静态文件服务

**参考文件**：[`server/cmd/admin/serve.go:200`](../server/cmd/admin/serve.go#L200)

`setupRouter` 最后调用 `ServeStaticFiles(router)` 服务 admin-ui SPA。前端构建产物嵌入 admin-server 二进制，无需独立前端服务器。

### 2.3 前端现有架构

**目录结构**：

```text
web-components/packages/admin-ui/
├── config/
│   ├── config.ts              # Umi Max 主配置
│   ├── routes.ts              # 声明式路由（含 access 字段）
│   └── proxy.ts               # 开发代理配置
├── src/
│   ├── access.ts              # 权限定义（❌ 极简，仅 canAdmin 一个布尔标志）
│   ├── app.tsx                # 运行时配置（getInitialState, layout, request）
│   ├── requestErrorConfig.ts  # 请求错误处理 + 401 token 刷新
│   ├── services/
│   │   ├── admin-auth.ts      # 手写认证 API（login, refresh, me, logout）
│   │   └── ant-design-pro/    # OpenAPI 自动生成（禁止手改）
│   ├── utils/
│   │   ├── auth-storage.ts    # Token localStorage 管理
│   │   └── rtc-auth-provider.ts
│   ├── components/
│   │   ├── index.ts           # barrel 导出
│   │   └── GlobalRtcAgent/    # 全局 RTC Agent 浮窗
│   └── locales/               # 国际化（8 种语言）
└── tests/                     # E2E 测试（Playwright）
```

**技术栈**：

| 层级 | 技术 | 说明 |
| --- | --- | --- |
| 框架 | React 19 + Umi Max v4 | Ant Design Pro v6 |
| UI 组件 | antd v6 + pro-components v3 | 含 `<Access>` 权限组件 |
| 样式 | Tailwind CSS v4 > antd-style v4 > CSS Modules | Tailwind 优先级最高 |
| 状态管理 | Umi `@@initialState` + `useModel` + `@tanstack/react-query` | 全局状态 + 服务端状态 |
| 请求 | Umi 内置 `request`（基于 axios） | 自动解包统一响应格式 |
| 国际化 | Umi locale 插件（8 种语言） | `useIntl().formatMessage()` |
| Lint | Biome（格式化 + lint） | 无 ESLint / Prettier |
| 测试 | Vitest + Testing Library（单元）+ Playwright（E2E） | |
| 部署 | 嵌入 admin-server 二进制（静态文件服务） | 无独立前端服务器 |

**关键文件**：

1. **权限定义**：[`src/access.ts`](../web-components/packages/admin-ui/src/access.ts)

   ```typescript
   export default function access(initialState) {
     const { currentUser } = initialState ?? {};
     return {
       canAdmin: currentUser && currentUser.access === 'admin',  // ❌ 只有一个布尔标志
     };
   }
   ```

2. **硬编码权限**：[`src/app.tsx`](../web-components/packages/admin-ui/src/app.tsx)（`getInitialState` 函数中）

   ```typescript
   return {
     userid: userInfo.id,
     name: userInfo.name,
     avatar: userInfo.avatar_url || '',
     email: userInfo.email,
     access: 'admin', // ❌ 硬编码：所有用户都是管理员
   } as API.CurrentUser;
   ```

3. **Token 刷新**：[`src/requestErrorConfig.ts`](../web-components/packages/admin-ui/src/requestErrorConfig.ts)
   - 响应拦截器检查 `errorCode === 'unauthorized'`
   - 使用 `isRefreshing` + `refreshSubscribers` 队列防止并发刷新（参见 [2.2.6](#226-前端-token-刷新机制)）

4. **路由配置**：[`config/routes.ts`](../web-components/packages/admin-ui/config/routes.ts)
   - 已有 `access: 'canAdmin'` 路由（如 `/admin`）
   - 使用 `name` 字段映射到 `menu.xxx` 国际化 key

---

## 3. 参考架构：Casdoor

### 3.1 Casdoor 项目结构

**克隆位置**：`~/Workspaces/rtc-agent/casdoor`

> **技术栈差异说明**：Casdoor 使用 **beego v2 + Xorm ORM**，而 RTC Agent 使用 **Gin + GORM**。以下 Casdoor 代码仅作架构参考，实际实现需使用 RTC Agent 的技术栈。

**核心目录**：

```text
casdoor/
├── object/                    # 核心业务逻辑（模型 + Casbin 集成）
│   ├── user.go               # 用户模型
│   ├── role.go               # 角色模型
│   ├── permission.go         # 权限模型
│   ├── application.go        # 应用模型
│   ├── adapter.go            # Casbin Adapter
│   ├── enforcer.go           # Casbin Enforcer
│   └── permission_enforcer.go # 权限 Enforcer（按 Permission 动态创建）
├── controllers/               # API Handler（注意：不是 routers/）
│   ├── role.go               # 角色管理 API Handler
│   ├── permission.go         # 权限管理 API Handler
│   └── user.go               # 用户管理 API Handler
├── routers/                   # 路由定义（仅 URL → Handler 映射）
│   └── router.go             # 所有路由集中注册
├── authz/                     # 权限检查（内联 Casbin 策略）
│   └── authz.go              # Casbin 权限过滤逻辑
└── web/                       # 前端（React + shadcn/Tailwind）
    ├── src/
    │   ├── pages/
    │   │   ├── roles/        # 角色管理页面
    │   │   ├── permissions/  # 权限管理页面
    │   │   └── users/        # 用户管理页面
    │   └── components/
    │       └── Permission/   # 权限组件
```

> **注意**：Casdoor 的 API Handler 在 `controllers/` 目录，而非 `routers/`。`routers/router.go` 仅做 URL 到 Handler 的路由映射。Casbin 策略规则内联在 `authz/authz.go` 中，不使用独立的 `.conf` 模型文件。

### 3.2 Casdoor 核心数据模型

#### 3.2.1 User 模型

**参考文件**：[`casdoor/object/user.go:62-150`](../casdoor/object/user.go#L62-L150)

```go
type User struct {
    Owner       string `xorm:"varchar(100) notnull pk" json:"owner"`
    Name        string `xorm:"varchar(255) notnull pk" json:"name"`
    Id          string `xorm:"varchar(100) index" json:"id"`
    Email       string `xorm:"varchar(100) index" json:"email"`
    DisplayName string `xorm:"varchar(100)" json:"displayName"`
    Avatar      string `xorm:"text" json:"avatar"`
    IsAdmin     bool   `json:"isAdmin"`           // ✅ 是否是管理员
    IsForbidden bool   `json:"isForbidden"`       // ✅ 是否被禁用
    // ... 更多字段
}
```

#### 3.2.2 Role 模型

**参考文件**：[`casdoor/object/role.go:29-44`](../casdoor/object/role.go#L29-L44)

```go
type Role struct {
    Owner       string   `xorm:"varchar(100) notnull pk" json:"owner"`
    Name        string   `xorm:"varchar(100) notnull pk" json:"name"`
    DisplayName string   `xorm:"varchar(100)" json:"displayName"`
    Description string   `xorm:"mediumtext" json:"description"`
    
    Users     []string `xorm:"mediumtext" json:"users"`     // ✅ 用户列表
    Roles     []string `xorm:"mediumtext" json:"roles"`     // ✅ 子角色（角色继承）
    IsEnabled bool     `json:"isEnabled"`
}
```

#### 3.2.3 Permission 模型

**参考文件**：[`casdoor/object/permission.go:26-60`](../casdoor/object/permission.go#L26-L60)

```go
type Permission struct {
    Owner       string   `xorm:"varchar(100) notnull pk" json:"owner"`
    Name        string   `xorm:"varchar(100) notnull pk" json:"name"`
    DisplayName string   `xorm:"varchar(100)" json:"displayName"`
    Description string   `xorm:"mediumtext" json:"description"`
    
    Users   []string `xorm:"mediumtext" json:"users"`     // ✅ 直接分配给用户
    Roles   []string `xorm:"mediumtext" json:"roles"`     // ✅ 分配给角色
    Resources []string `xorm:"mediumtext" json:"resources"` // ✅ 资源列表
    Actions   []string `xorm:"mediumtext" json:"actions"`   // ✅ 操作列表
    
    Model     string `xorm:"varchar(100)" json:"model"`    // ✅ Casbin 模型
    IsEnabled bool   `json:"isEnabled"`
}
```

### 3.3 Casdoor 的 Casbin 集成

#### 3.3.1 Casbin Enforcer 初始化

**参考文件**：[`casdoor/object/adapter.go`](../casdoor/object/adapter.go)

```go
// Casbin 策略存储在数据库表中
// 表名：casbin_rule
// 字段：ptype, v0, v1, v2, v3, v4, v5

// 初始化 Enforcer
adapter, _ := gormadapter.NewAdapter("postgres", dsn, true)
model := casbin.GetDefaultModel()  // 或从文件加载
enforcer, _ := casbin.NewEnforcer(model, adapter)

// 加载策略
enforcer.LoadPolicy()

// 检查权限
allowed, _ := enforcer.Enforce("user1", "data1", "read")
```

#### 3.3.2 Casbin 模型配置

> **注意**：Casdoor **不使用**独立的 `.conf` 文件定义 Casbin 模型。它在 Go 代码中内联定义策略规则（参见 [`casdoor/authz/authz.go`](../casdoor/authz/authz.go)），并通过数据库动态创建 Enforcer。以下配置仅作 RBAC 模型概念说明。

**参考文件**：[`casdoor/authz/authz.go`](../casdoor/authz/authz.go)（内联策略定义）、[`casdoor/object/permission_enforcer.go`](../casdoor/object/permission_enforcer.go)（Enforcer 初始化）

```ini
# Casbin 默认模型（RBAC）
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

#### 3.3.3 权限检查流程

**参考文件**：[`casdoor/authz/authz.go`](../casdoor/authz/authz.go)（Casbin 权限过滤逻辑）

```go
// 1. 获取当前用户
user := getUserFromContext(c)

// 2. 获取 Enforcer
enforcer := getEnforcer()

// 3. 检查权限
allowed, _ := enforcer.Enforce(
    user.GetId(),      // 主体（用户 ID）
    resourceId,        // 客体（资源 ID）
    action,            // 操作（read/write/delete）
)

// 4. 返回结果
if !allowed {
    c.JSON(403, gin.H{"error": "Forbidden"})
    return
}
```

### 3.4 Casdoor API 设计

#### 3.4.1 角色管理 API

**参考文件**：路由定义 [`casdoor/routers/router.go:195-200`](../casdoor/routers/router.go)，Handler [`casdoor/controllers/role.go`](../casdoor/controllers/role.go)

```text
GET    /api/get-roles              # 获取角色列表
GET    /api/get-role?id=org/role1  # 获取单个角色
POST   /api/update-role            # 更新角色
POST   /api/add-role               # 创建角色
POST   /api/delete-role            # 删除角色
```

#### 3.4.2 权限管理 API

**参考文件**：路由定义 [`casdoor/routers/router.go:202-210`](../casdoor/routers/router.go)，Handler [`casdoor/controllers/permission.go`](../casdoor/controllers/permission.go)

```text
GET    /api/get-permissions              # 获取权限列表
GET    /api/get-permission?id=org/perm1  # 获取单个权限
POST   /api/update-permission            # 更新权限
POST   /api/add-permission               # 创建权限
POST   /api/delete-permission            # 删除权限
```

#### 3.4.3 用户权限查询

**参考文件**：路由定义 [`casdoor/routers/router.go`](../casdoor/routers/router.go)，Handler [`casdoor/controllers/user.go`](../casdoor/controllers/user.go)

```text
GET    /api/get-account            # 获取当前用户信息（含权限）
POST   /api/update-user            # 更新用户（含角色分配）
```

### 3.5 Casdoor 前端集成

> ⚠️ **注意**：以下 3.5 节描述的是 **Casdoor 项目自身的前端实现方式**（使用 `casbin.js`），仅供架构参考。
> RTC Agent admin-ui **不采用此方案** — 我们使用 Ant Design Pro 内置的 `@umijs/plugin-access` + `access.ts` 机制（详见 [第7章](#7-前端集成方案)）。

#### 3.5.1 权限组件（Casdoor 方案，仅供参考）

**参考目录**：[`casdoor/web/src/components/Permission/`](../casdoor/web/src/components/Permission/)

```typescript
// ❌ 这是 Casdoor 的方式（使用 casbin.js），不是我们的方式
// 我们的方式参见 7.3 节 access.ts
import { useAuth } from 'casbin.js';

function RoleList() {
    const { can, cannot } = useAuth();
    
    return (
        <div>
            {can('read', 'role') && <RoleTable />}
            {can('write', 'role') && <EditButton />}
            {cannot('delete', 'role') && <DeleteDisabled />}
        </div>
    );
}
```

#### 3.5.2 动态菜单渲染（Casdoor 方案，仅供参考）

**参考文件**：[`casdoor/web/src/App.js`](../casdoor/web/src/App.js)

```javascript
// ❌ 这是 Casdoor 的方式，不是我们的方式
// 我们的方式参见 7.4 节 config/routes.ts 的 access 字段
const menuItems = routes
    .filter(route => user.can(route.access))
    .map(route => ({
        key: route.path,
        icon: route.icon,
        label: route.name,
    }));
```

---

## 4. 系统设计方案

### 4.1 整体架构

```mermaid
graph TB
    subgraph "前端层 - Admin UI"
        A[React + Ant Design Pro]
        B[useAccess 权限检查]
        C[动态菜单渲染]
        D[按钮级权限控制]
    end
    
    subgraph "应用层 - Admin Server"
        E[Gin HTTP Framework]
        F[JWT 认证中间件]
        G[Casbin 权限中间件]
        H[角色管理 Handler]
        I[权限管理 Handler]
        J[用户管理 Handler]
    end
    
    subgraph "业务层 - Use Cases"
        K[AdminAuthUsecase]
        L[RoleUsecase]
        M[PermissionUsecase]
        N[UserRoleUsecase]
    end
    
    subgraph "数据层 - Repository"
        O[UserRepo]
        P[RoleRepo]
        Q[PermissionRepo]
        R[UserRoleRepo]
    end
    
    subgraph "基础设施层"
        S[Casbin Enforcer]
        T[JWT Signer]
        U[(PostgreSQL)]
        V[(Redis)]
    end
    
    A -->|HTTP API| E
    B -->|权限检查| S
    C -->|菜单过滤| B
    D -->|按钮控制| B
    
    E -->|认证| F
    F -->|授权| G
    G -->|路由分发| H & I & J
    
    H --> L
    I --> M
    J --> N
    
    L --> P & R
    M --> S
    N --> R
    
    P --> U
    Q --> U
    R --> U
    S -->|策略存储| U
    T -->|JWT 签名| U
```

**架构说明**：

- **前端层**：基于 React + Ant Design Pro，使用 `useAccess` + `<Access>` 组件实现前端权限控制
- **应用层**：Gin HTTP 框架，集成 JWT 认证和 Casbin 权限中间件
- **业务层**：实现角色、权限、用户-角色关联的业务逻辑
- **数据层**：GORM Repository 模式，访问 PostgreSQL
- **基础设施层**：Casbin Enforcer 执行权限检查，JWT Signer 处理 Token

**数据流向**：

1. 用户请求 → JWT 中间件验证 → Casbin 中间件授权 → Handler 处理
2. Casbin Enforcer 从数据库加载策略，执行 RBAC 匹配
3. 角色、权限、用户-角色关系持久化到 PostgreSQL
4. 前端通过 `/api/auth/me` 获取权限数据，实现动态菜单和按钮控制

### 4.2 技术栈

**后端**（参考 [`server/go.mod`](../server/go.mod)）：

- HTTP 框架：Gin v1.12（`go.mod` 确认：`github.com/gin-gonic/gin v1.12.0`）
- ORM：GORM v1.30（`go.mod` 确认：`gorm.io/gorm v1.30.0`）
- 数据库：PostgreSQL 17+（`pgvector/pgvector:pg17`）
- 权限框架：Casbin v2（**待添加** — `go get github.com/casbin/casbin/v2`，当前 go.mod 中不存在）
- 适配器：gorm-adapter v3（**待添加** — `go get github.com/casbin/gorm-adapter/v3`）
- 认证：JWT (RS256，已实现，`golang-jwt/jwt/v5 v5.3.1`)
- 日志：zap v1.28（结构化日志，`go.uber.org/zap v1.28.0`）
- CLI：cobra v1.10（`github.com/spf13/cobra v1.10.2`）
- 缓存/限流：Redis 7+（`go-redis/v9 v9.22.0`）
- 配置加载：viper v1.18（`github.com/spf13/viper v1.18.2`，通过 `mapstructure` tag）
- 可观测性：OpenTelemetry（`go.opentelemetry.io/otel v1.46.0`，已集成 Jaeger 导出）

**前端**（参考 [`web-components/packages/admin-ui/package.json`](../web-components/packages/admin-ui/package.json)）：

- 框架：React 19 + Umi Max v4（Ant Design Pro v6）
- UI：antd v6 + `@ant-design/pro-components` v3
- 权限库：`@umijs/plugin-access`（Ant Design Pro 内置）+ `<Access>` 组件
- 状态管理：Umi `@@initialState` + `@tanstack/react-query`
- 样式：Tailwind CSS v4（优先级最高）+ antd-style v4
- Lint：Biome（格式化 + lint，无 ESLint/Prettier）
- 测试：Vitest + Testing Library（单元）+ Playwright（E2E）
- 国际化：Umi locale 插件（8 种语言）

### 4.3 核心模块

#### 4.3.1 后端模块

**新增文件**：

```text
server/
├── internal/
│   ├── model/
│   │   ├── role.go              # ✅ 新增：角色模型
│   │   ├── user_role.go         # ✅ 新增：用户-角色关联模型
│   │   └── permission.go        # ✅ 新增：权限模型（可选，如使用 Casbin 原生策略则不需要）
│   ├── handler/http/
│   │   ├── role.go              # ✅ 新增：角色管理 API
│   │   ├── permission.go        # ✅ 新增：权限管理 API
│   │   ├── user_role.go         # ✅ 新增：用户-角色关联 API
│   │   ├── audit_log.go         # ✅ 新增：审计日志查询 API
│   │   ├── casbin_middleware.go # ✅ 新增：Casbin 权限检查中间件 + routeResourceMap
│   │   └── debug.go             # ✅ 新增：权限调试 API（参见 14.4.2）
│   ├── usecase/
│   │   ├── role.go              # ✅ 新增：角色业务逻辑
│   │   ├── permission.go        # ✅ 新增：权限业务逻辑
│   │   └── audit_log.go         # ✅ 新增：审计日志业务逻辑
│   ├── repo/
│   │   ├── role_repo.go         # ✅ 新增：角色仓库
│   │   ├── user_role_repo.go    # ✅ 新增：用户-角色关联仓库
│   │   ├── audit_log_repo.go    # ✅ 新增：审计日志仓库
│   │   └── errors.go            # ✅ 修改：新增 ErrConflict、ErrDuplicateName 等 sentinel errors
│   └── infra/
│       └── auth/
│           ├── casbin.go        # ✅ 新增：Casbin Enforcer 初始化
│           └── policy_watcher.go # ✅ 新增：Redis Pub/Sub 策略同步（参见 ADR-006）
└── cmd/
    ├── admin/
    │   ├── serve.go             # ✅ 修改：集成 Casbin Enforcer + 中间件
    │   └── debug.go             # ✅ 新增：调试 CLI 命令（参见 14.4.1）
    └── migrate.go               # ✅ 修改：添加 Role/UserRole AutoMigrate
```

> **文件位置说明**：
>
> - `infra/auth/casbin.go`：Enforcer 初始化逻辑（与 `admin_jwt.go` 同目录，遵循 auth 基础设施集中放置的约定）
> - `handler/http/casbin_middleware.go`：Gin 中间件（与 `admin_auth.go` 同目录，需要使用同包的 `Error()` 响应函数；这与 `JWTAuthMiddleware` 放在 `admin_auth.go` 的约定一致）
> - `repo/errors.go`：Sentinel errors 集中定义（参见 [2.2.4](#224-repo-接口模式)）
> - Handler 层 **不可** 直接 import Repo 层（由 `.golangci.yml` depguard 规则强制执行），必须通过 Usecase 层传递

#### 4.3.2 前端模块

**新增/修改文件**（遵循 admin-ui 的 co-location 模式）：

```text
web-components/packages/admin-ui/
├── config/
│   └── routes.ts                    # ✅ 修改：添加系统管理路由 + access 字段
├── src/
│   ├── pages/
│   │   └── system/                  # ✅ 新增：系统管理模块
│   │       ├── roles/               # ✅ 新增：角色管理页面
│   │       │   ├── index.tsx        # ProTable 列表 + CRUD
│   │       │   ├── service.ts       # 页面级 API
│   │       │   └── components/      # 页面私有组件（表单、详情等）
│   │       └── permissions/         # ✅ 新增：权限管理页面
│   │           ├── index.tsx
│   │           └── service.ts
│   ├── access.ts                    # ✅ 修改：基于角色的动态权限定义
│   ├── app.tsx                      # ✅ 修改：从 API 获取角色/权限（不再硬编码）
│   ├── requestErrorConfig.ts        # ✅ 修改：Token 刷新时同步刷新权限
│   ├── locales/
│   │   └── zh-CN/
│   │       └── permission.ts        # ✅ 新增：权限相关 i18n 文案
│   └── utils/
│       └── permission-sync.ts       # ✅ 新增：多标签页权限同步（BroadcastChannel）
└── tests/
    └── permission-flow.spec.ts      # ✅ 新增：权限管理 E2E 测试
```

**注意**：

- 不引入 `casbin.js` 依赖。前端权限完全通过 Ant Design Pro 内置的 `@umijs/plugin-access` + `access.ts` 机制实现（参见 [第7章](#7-前端集成方案)）
- 页面组件遵循 co-location 模式：`index.tsx` + `service.ts` + `components/`
- 使用 ProTable / ProForm 实现 CRUD 页面（参考 `pages/table-list/` 的模式）
- 写操作使用 `@tanstack/react-query` 的 `useMutation`（参考现有代码模式）
- 样式优先使用 Tailwind CSS v4

### 4.4 权限模型设计

#### 4.4.1 RBAC 模型

**采用标准 RBAC 模型**：

```text
用户 (User) ←→ 角色 (Role) ←→ 权限 (Permission)
                ↓
           资源 (Resource) + 操作 (Action)
```

**Casbin 策略示例**：

```text
# 角色定义（g 类型）
g, user1, admin      # user1 是 admin 角色
g, user2, operator   # user2 是 operator 角色

# 权限定义（p 类型）
p, admin, user, read        # admin 可以读取用户
p, admin, user, write       # admin 可以写入用户
p, admin, role, read        # admin 可以读取角色
p, admin, role, write       # admin 可以写入角色
p, operator, user, read     # operator 只能读取用户
```

#### 4.4.2 数据库表设计

**表结构**：

```sql
-- 用户表（已存在，保持不变）
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    avatar_url VARCHAR(500),
    password_hash VARCHAR(60),
    provider VARCHAR(50),               -- OAuth2 provider
    provider_subject VARCHAR(255),      -- OAuth2 subject
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP
    -- ✅ 不添加 is_admin / is_forbidden，通过 RBAC 角色管理权限
);

-- 角色表（✅ 新增）
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100),
    description TEXT,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- 用户-角色关联表（✅ 新增）
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id),
    role_id UUID REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

-- Casbin 策略表（✅ 新增，由 gorm-adapter 自动创建）
CREATE TABLE casbin_rule (
    id SERIAL PRIMARY KEY,
    ptype VARCHAR(10),
    v0 VARCHAR(100),
    v1 VARCHAR(100),
    v2 VARCHAR(100),
    v3 VARCHAR(100),
    v4 VARCHAR(100),
    v5 VARCHAR(100)
);
```

### 4.5 核心流程

#### 4.5.1 登录流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant F as 前端
    participant A as Admin Server
    participant DB as PostgreSQL
    participant J as JWT Signer
    
    U->>F: 输入邮箱、密码
    F->>A: POST /api/auth/login
    A->>DB: 查询用户
    DB-->>A: 返回用户数据
    A->>A: 验证密码（bcrypt）
    A->>J: 生成 access_token
    J-->>A: 返回 token
    A->>DB: 创建 refresh_token（不透明字符串，SHA-256 哈希存储）
    A-->>F: 返回 tokens + 基础用户信息
    F->>F: 存储 tokens
    F->>A: GET /api/auth/me（获取角色和权限）
    A->>DB: 查询用户角色 + Casbin 策略
    A-->>F: 返回用户 + roles[] + permissions[]
    F->>F: 构建 permissionSet，渲染菜单
```

#### 4.5.2 权限检查流程

**后端权限检查**：

```mermaid
sequenceDiagram
    participant C as 客户端
    participant M as JWT 中间件
    participant P as Casbin 中间件
    participant H as Handler
    participant E as Casbin Enforcer
    participant DB as PostgreSQL
    
    C->>M: HTTP 请求 + Authorization Header
    M->>M: 解析 JWT Token
    M->>M: 提取 user_id
    M->>P: 传递 user_id
    P->>P: 提取 resource, action
    P->>E: Enforce(user_id, resource, action)
    E->>DB: 查询策略（casbin_rule）
    DB-->>E: 返回策略列表
    E->>E: 执行匹配逻辑
    alt 权限通过
        E-->>P: allowed = true
        P->>H: 继续执行 Handler
        H-->>C: HTTP 200 + { success: true, data: ... }
    else 权限拒绝
        E-->>P: allowed = false
        P-->>C: HTTP 200 + { success: false, errorCode: "forbidden" }
    end
```

**前端权限检查**：

```mermaid
sequenceDiagram
    participant U as 用户
    participant R as React 组件
    participant A as useAccess Hook
    participant S as Admin Server
    
    U->>R: 点击按钮
    R->>A: access.canUserEdit
    A->>A: 检查 permissionSet（Set 结构）
    alt 有权限
        A-->>R: true
        R->>S: 发送 HTTP 请求
        S->>S: 后端 Casbin 中间件检查
        S-->>R: { success: true, data: ... }
        R->>U: 显示结果
    else 无权限
        A-->>R: false
        R->>R: 隐藏按钮（Access accessible=false）
        R->>U: 按钮不可见
    end
```

#### 4.5.3 角色分配流程

```mermaid
sequenceDiagram
    participant A as 管理员
    participant F as 前端
    participant API as Admin Server API
    participant DB as PostgreSQL
    participant E as Casbin Enforcer
    
    A->>F: 选择用户，分配角色
    F->>API: POST /api/users/:id/roles
    API->>DB: 插入 user_roles 记录
    DB-->>API: 创建成功
    API->>E: 获取用户新角色列表
    E->>DB: 查询 user_roles + roles
    DB-->>E: 返回角色列表
    API->>E: 更新 Casbin 策略（g 类型）
    E->>DB: 更新 casbin_rule
    API-->>F: 返回成功
    F->>A: 显示分配成功
    F->>F: 更新用户权限缓存
```

---

## 5. 数据库设计

### 5.1 迁移策略

**参考现有实现**：[`server/cmd/migrate.go`](../server/cmd/migrate.go)

**迁移方式**：使用 GORM AutoMigrate，通过独立的 `migrate` 服务执行

```yaml
# docker-compose.yml 中的 migrate 服务
migrate:
  build:
    context: .
    dockerfile: Dockerfile
  entrypoint: ["./rtc-agent", "migrate"]
  depends_on:
    postgres:
      condition: service_healthy
  restart: "no"

# admin-server 依赖 migrate 服务
admin-server:
  depends_on:
    migrate:
      condition: service_completed_successfully
```

**迁移流程**：

1. `migrate` 服务启动，等待 PostgreSQL 健康检查通过
2. 执行 `./rtc-agent migrate` 命令
3. 调用 `model.AutoMigrate(db)` 自动创建/更新表结构
4. 执行自定义迁移逻辑（如索引创建、数据转换等）
5. `migrate` 服务退出
6. `admin-server` 启动，依赖 `migrate` 服务成功完成

**实施要求**：

- ✅ 新增的模型必须添加到 `model.AutoMigrate()` 或 admin-server 的迁移逻辑中
- ✅ 在 `server/cmd/migrate.go` 的 admin 迁移部分添加新模型

### 5.2 Casbin 模型配置

**关键文件**：`server/internal/infra/auth/casbin.go`（新增）

**RBAC 模型定义**：

```ini
# Casbin RBAC 模型配置文件
# 参考：https://casbin.org/docs/syntax/

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

**模型说明**：

- `request_definition`: 请求格式为 `(用户, 资源, 操作)`
- `policy_definition`: 策略格式为 `(角色, 资源, 操作)`
- `role_definition`: 角色继承关系 `g(用户, 角色)`
- `policy_effect`: 只要有一条策略允许，就允许访问
- `matchers`: 用户属于角色，且角色有权限访问资源

**Go 初始化代码**：

```go
// server/internal/infra/auth/casbin.go

package auth

import (
    "github.com/casbin/casbin/v2"
    gormadapter "github.com/casbin/gorm-adapter/v3"
    "gorm.io/gorm"
)

// NewAdminCasbinEnforcer creates a new Casbin Enforcer for admin-server.
func NewAdminCasbinEnforcer(db *gorm.DB) (*casbin.Enforcer, error) {
    // 使用 gorm-adapter 自动创建 casbin_rule 表
    adapter, err := gormadapter.NewAdapterByDB(db)
    if err != nil {
        return nil, err
    }

    // 加载 RBAC 模型（从字符串或文件）
    modelText := `
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
`

    enforcer, err := casbin.NewEnforcer(casbin.NewModelFromString(modelText), adapter)
    if err != nil {
        return nil, err
    }

    // 从数据库加载策略
    if err := enforcer.LoadPolicy(); err != nil {
        return nil, err
    }

    return enforcer, nil
}
```

**策略示例**：

```text
# 角色定义（g 类型）：用户-角色映射
g, user1-uuid, admin-role-uuid
g, user2-uuid, operator-role-uuid

# 权限定义（p 类型）：角色-资源-操作映射
p, admin-role-uuid, user, read
p, admin-role-uuid, user, write
p, admin-role-uuid, user, delete
p, admin-role-uuid, role, read
p, admin-role-uuid, role, write
p, operator-role-uuid, user, read
```

**注意**：

- 策略中的 `sub` 使用角色 UUID（不是角色名称）
- `obj` 和 `act` 使用字符串（如 `user`, `read`, `write`）
- `g` 类型定义用户-角色关系
- `p` 类型定义角色-权限关系

### 5.3 表关系图

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : "has"
    ROLES ||--o{ USER_ROLES : "assigned to"
    ROLES ||--o{ CASBIN_RULE : "defines"
    
    USERS {
        uuid id PK
        string email
        string name
        string avatar_url
        string password_hash
        string provider
        string provider_subject
        timestamp created_at
        timestamp updated_at
    }
    
    ROLES {
        uuid id PK
        string name UK
        string display_name
        text description
        bool is_enabled
        timestamp created_at
        timestamp updated_at
    }
    
    USER_ROLES {
        uuid user_id FK
        uuid role_id FK
    }
    
    CASBIN_RULE {
        int id PK
        string ptype
        string v0
        string v1
        string v2
        string v3
        string v4
        string v5
    }
```

### 5.4 表结构详情

#### 5.4.1 users 表（保持现状，不扩展）

**参考现有文件**：[`server/internal/model/user.go`](../server/internal/model/user.go)

**设计决策**：不在 User 表添加 `is_admin` / `is_forbidden` 字段。原因：

1. **`is_admin` 与 RBAC 冲突**：如果用角色做权限，`is_admin` 就是冗余的并行权限轨道。管理员身份通过分配 `admin` 角色实现。
2. **`is_forbidden` 可替代**：通过撤销用户所有角色/策略实现禁用效果，或在 JWT 中间件查询用户状态。
3. **OAuth2 兼容**：User 模型已有 `Provider`/`ProviderSubject` 字段支持 OAuth2，新增字段需确保不影响现有逻辑。

**唯一例外**：引导期（bootstrap）可使用 `is_admin` 标记第一个用户，引导完成后即废弃。但这不是必须的 — 引导脚本可以直接创建角色并分配。

**结论**：users 表保持现状，不添加新字段。

#### 5.4.2 roles 表（新增）

**参考 Casdoor**：[`casdoor/object/role.go:29-44`](../casdoor/object/role.go#L29-L44)  
**遵循项目规范**：参考 [`server/internal/model/admin_refresh_token.go`](../server/internal/model/admin_refresh_token.go)

```go
// server/internal/model/role.go
package model

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

// Role represents a permission role in the admin system.
type Role struct {
    ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
    Name        string    `gorm:"size:100;not null;uniqueIndex" json:"name"`
    DisplayName string    `gorm:"size:100" json:"display_name,omitempty"`
    Description string    `gorm:"type:text" json:"description,omitempty"`
    IsEnabled   bool      `gorm:"not null;default:true" json:"is_enabled"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

// TableName specifies the database table name for Role.
func (Role) TableName() string {
    return "roles"
}

// BeforeCreate generates a UUID v7 identifier if one is not already set.
func (r *Role) BeforeCreate(tx *gorm.DB) error {
    if r.ID == uuid.Nil {
        id, err := uuid.NewV7()
        if err != nil {
            return err
        }
        r.ID = id
    }
    return nil
}
```

**关键规范**：

- ✅ 使用 UUID v7 作为主键
- ✅ 实现 `TableName()` 方法
- ✅ 实现 `BeforeCreate()` 钩子生成 UUID
- ✅ 使用 `gorm:"type:uuid"` 标签
- ✅ 使用 `uniqueIndex` 约束

#### 5.4.3 user_roles 表（新增）

**遵循项目规范**：多对多关联表

```go
// server/internal/model/user_role.go
package model

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

// UserRole represents the many-to-many relationship between users and roles.
type UserRole struct {
    UserID    uuid.UUID `gorm:"type:uuid;primaryKey" json:"user_id"`
    RoleID    uuid.UUID `gorm:"type:uuid;primaryKey" json:"role_id"`
    AssignedAt time.Time `json:"assigned_at"`
}

// TableName specifies the database table name for UserRole.
func (UserRole) TableName() string {
    return "user_roles"
}

// BeforeCreate sets the AssignedAt timestamp.
func (ur *UserRole) BeforeCreate(tx *gorm.DB) error {
    if ur.AssignedAt.IsZero() {
        ur.AssignedAt = time.Now()
    }
    return nil
}
```

**关键规范**：

- ✅ 复合主键 `(user_id, role_id)`
- ✅ 使用 `BeforeCreate()` 设置时间戳
- ✅ 明确的表名定义

#### 5.4.4 casbin_rule 表（自动创建）

**由 gorm-adapter 自动创建**，无需手动定义。

表结构：

```sql
CREATE TABLE casbin_rule (
    id SERIAL PRIMARY KEY,
    ptype VARCHAR(10),
    v0 VARCHAR(100),
    v1 VARCHAR(100),
    v2 VARCHAR(100),
    v3 VARCHAR(100),
    v4 VARCHAR(100),
    v5 VARCHAR(100)
);
```

**注意**：此表由 `gorm-adapter` 管理，不要直接操作。

---

## 6. API 设计

### 6.0 RESTful 设计规范

> **设计原则**：所有新增 API 遵循 RESTful 规范，与项目现有 API 风格保持一致。

**URL 设计**：

| 规则 | 示例 | 说明 |
| --- | --- | --- |
| 名词复数 | `/api/roles`, `/api/users` | 资源名使用复数形式 |
| 连字符分隔 | `/api/user-roles`（如有） | URL 中使用连字符，不用下划线 |
| 层级关系 | `/api/users/:id/roles` | 子资源通过路径嵌套 |
| 避免动词 | `POST /api/roles`（创建） | HTTP 方法表达动作，URL 只用名词 |
| 特殊动作 | `POST /api/permissions/check` | 非 CRUD 操作可用动词后缀 |

**HTTP 方法约定**：

| 方法 | 用途 | 幂等性 | 示例 |
| --- | --- | --- | --- |
| GET | 查询 | ✅ 幂等 | `GET /api/roles/:id` |
| POST | 创建 | ❌ 非幂等 | `POST /api/roles` |
| PUT | 全量更新 | ✅ 幂等 | `PUT /api/roles/:id` |
| DELETE | 删除 | ✅ 幂等 | `DELETE /api/roles/:id` |

**统一响应格式**（参见 [2.2.3](#223-统一响应信封)）：

```json
{
  "success": true,
  "data": { "id": "...", "name": "admin" }
}
```

```json
{
  "success": false,
  "errorCode": "role_name_exists",
  "errorMessage": "角色名称 'admin' 已存在"
}
```

> **关键约束**：由于 `Error()` 始终返回 HTTP 200（参见 [2.2.1](#221-error-始终返回-http-200)），前端通过 `errorCode` 判断错误类型，而非 HTTP 状态码。

### 6.0.1 统一错误码体系

**错误码分级**：

| 级别 | 错误码前缀 | 描述 | 处理策略 |
| --- | --- | --- | --- |
| 认证错误 | `unauthorized`, `token_*` | 未认证或 token 问题 | 前端自动刷新 token 或跳转登录 |
| 授权错误 | `forbidden` | 已认证但无权限 | 前端显示 403 页面 |
| 参数错误 | `validation_*`, `*_not_found` | 请求参数问题 | 前端显示错误提示 |
| 业务错误 | `role_*`, `permission_*`, `user_*` | 业务逻辑错误 | 前端显示具体错误信息 |
| 限流错误 | `rate_limit_*`, `account_locked` | 频率限制 | 前端显示"请稍后再试" |
| 系统错误 | `internal_error` | 服务器内部错误 | 前端显示通用错误页面 |

**完整错误码列表**：

| 错误码 | 描述 | 触发场景 |
| --- | --- | --- |
| `unauthorized` | 未认证 | Token 缺失、无效或过期 |
| `forbidden` | 无权限 | 已认证但 Casbin 拒绝 |
| `token_expired` | Token 已过期 | Access token 超过有效期（当前 1 小时，参见 [`admin.yaml`](../server/etc/admin.yaml)） |
| `token_invalid` | Token 无效 | Token 格式错误或签名验证失败 |
| `refresh_token_expired` | Refresh token 过期 | Refresh token 超过 7 天 |
| `refresh_token_revoked` | Refresh token 已撤销 | Token 已被轮转或登出撤销 |
| `role_not_found` | 角色不存在 | 查询/更新/删除不存在的角色 ID |
| `role_name_exists` | 角色名称已存在 | 创建角色时名称重复 |
| `role_disabled` | 角色已禁用 | 角色 `is_enabled = false` |
| `cannot_remove_last_admin` | 不能移除最后一个管理员 | 移除用户的最后一个 admin 角色 |
| `cannot_delete_system_role` | 不能删除系统角色 | 删除 admin/owner 等系统保留角色 |
| `permission_not_found` | 权限策略不存在 | 查询不存在的权限策略 |
| `permission_exists` | 权限策略已存在 | 创建重复的（角色, 资源, 操作）组合 |
| `user_not_found` | 用户不存在 | 查询/操作用户 ID 不存在 |
| `user_disabled` | 用户已禁用 | `users.deleted_at IS NOT NULL` |
| `invalid_credentials` | 登录凭据错误 | 邮箱或密码错误 |
| `account_locked` | 账户已锁定 | 15 分钟内登录失败 ≥ 5 次 |
| `rate_limit_exceeded` | 请求过于频繁 | 超过 IP 级限流阈值 |
| `password_too_weak` | 密码强度不足 | 密码不满足复杂度要求 |
| `password_too_short` | 密码长度不足 | 密码长度 < 8 字符 |
| `validation_error` | 参数校验失败 | 请求参数格式错误 |
| `internal_error` | 服务器内部错误 | 未预期的异常 |

### 6.1 认证 API（已实现）

**文件**：[`server/internal/handler/http/admin_auth.go`](../server/internal/handler/http/admin_auth.go)

```text
POST   /api/auth/login       # 登录（已实现）
POST   /api/auth/refresh     # 刷新 token（已实现）
GET    /api/auth/me          # 获取当前用户（✅ 需扩展：返回角色信息）
POST   /api/auth/logout      # 登出（已实现）
```

### 6.2 角色管理 API（新增）

**参考 Casdoor**：路由定义 [`casdoor/routers/router.go`](../casdoor/routers/router.go)，Handler [`casdoor/controllers/role.go`](../casdoor/controllers/role.go)

```text
GET    /api/roles              # 获取角色列表（支持分页）
GET    /api/roles/:id          # 获取单个角色
POST   /api/roles              # 创建角色
PUT    /api/roles/:id          # 更新角色
DELETE /api/roles/:id          # 删除角色
GET    /api/roles/:id/users    # 获取角色下的用户（支持分页）
```

**分页约定**（遵循项目现有 API 规范）：

列表 API 统一使用 `page` + `page_size` 分页参数：

```text
GET /api/roles?page=1&page_size=20
GET /api/roles/:id/users?page=1&page_size=20
```

响应格式：

```typescript
// Response (data 字段)
{
    "items": [ /* 当前页数据 */ ],
    "total": 42,        // 总记录数
    "page": 1,          // 当前页码
    "page_size": 20     // 每页大小
}
```

> **默认值**：`page=1`, `page_size=20`, 最大 `page_size=100`。Repo 层使用 GORM 的 `Offset((page-1)*page_size).Limit(page_size)` 实现。

**请求/响应示例**：

```typescript
// POST /api/roles
{
    "name": "admin",
    "display_name": "管理员",
    "description": "系统管理员，拥有所有权限"
}

// Response
{
    "success": true,
    "data": {
        "id": "uuid",
        "name": "admin",
        "display_name": "管理员",
        "description": "系统管理员，拥有所有权限",
        "is_enabled": true,
        "created_at": "2026-10-05T08:00:00Z",
        "updated_at": "2026-10-05T08:00:00Z"
    }
}
```

### 6.3 权限管理 API（新增）

**参考 Casdoor**：路由定义 [`casdoor/routers/router.go`](../casdoor/routers/router.go)，Handler [`casdoor/controllers/permission.go`](../casdoor/controllers/permission.go)

```text
POST   /api/permissions              # 创建权限策略
DELETE /api/permissions              # 删除权限策略
GET    /api/permissions              # 获取权限列表
POST   /api/permissions/check        # 检查权限
```

**请求/响应示例**：

```typescript
// POST /api/permissions
{
    "role": "admin",
    "resource": "user",
    "action": "write"
}

// POST /api/permissions/check
{
    "user_id": "uuid",
    "resource": "user",
    "action": "write"
}

// Response
{
    "success": true,
    "data": {
        "allowed": true
    }
}
```

### 6.4 用户-角色关联 API（新增）

**参考 Casdoor**：路由定义 [`casdoor/routers/router.go`](../casdoor/routers/router.go)，Handler [`casdoor/controllers/user.go`](../casdoor/controllers/user.go)

```text
GET    /api/users/:id/roles          # 获取用户角色
POST   /api/users/:id/roles          # 分配角色
DELETE /api/users/:id/roles/:roleId  # 移除角色
```

**请求/响应示例**：

```typescript
// POST /api/users/:id/roles
{
    "role_ids": ["uuid1", "uuid2"]
}

// Response
{
    "success": true,
    "data": {
        "user_id": "uuid",
        "roles": [
            {
                "id": "uuid1",
                "name": "admin",
                "display_name": "管理员"
            },
            {
                "id": "uuid2",
                "name": "operator",
                "display_name": "运营"
            }
        ]
    }
}
```

### 6.5 前端权限查询（合并到 `/api/auth/me`）

**设计决策**：不单独提供 `/api/casbin` 端点。用户权限通过 `/api/auth/me` 一并返回（参见 [7.1](#71-后端-api-返回角色与权限)）。

`/api/auth/me` 的 `data` 字段扩展为：

```typescript
{
  "id": "uuid",
  "email": "admin@example.com",
  "name": "Admin",
  "avatar_url": "https://...",
  "roles": [
    { "id": "uuid1", "name": "admin", "display_name": "管理员" }
  ],
  "permissions": [
    { "resource": "user", "action": "read" },
    { "resource": "user", "action": "write" },
    { "resource": "role", "action": "read" }
  ]
}
```

前端在 `getInitialState()` 中调用一次 `/api/auth/me`，即可获得用户信息、角色和权限，无需额外的权限查询请求。

---

## 7. 前端集成方案

> **设计决策**：不引入 casbin.js，采用**角色驱动**的简化方案。
>
> 原因：
>
> 1. Ant Design Pro 已有 `@umijs/plugin-access` + `access.ts` 机制，天然支持角色权限
> 2. casbin.js 前端版本维护不活跃，API 不稳定
> 3. 前端只需控制 UI 可见性（非安全边界），后端权限中间件才是安全防线
> 4. 减少前端依赖体积和复杂度

### 7.1 后端 API 返回角色与权限

**修改 `/api/auth/me` 响应**，返回用户的角色列表和权限列表：

```typescript
// GET /api/auth/me 响应（data 字段）
{
  "id": "uuid",
  "email": "admin@example.com",
  "name": "Admin",
  "avatar_url": "https://...",
  "roles": [
    { "id": "uuid1", "name": "admin", "display_name": "管理员" }
  ],
  "permissions": [
    { "resource": "user", "action": "read" },
    { "resource": "user", "action": "write" },
    { "resource": "role", "action": "read" },
    { "resource": "role", "action": "write" }
  ]
}
```

后端实现伪代码（在 `AdminAuthUsecase.GetCurrentUser` 中）：

```go
// 伪代码：获取用户角色和权限
func (uc *AdminAuthUsecase) GetCurrentUserWithPermissions(ctx, userID) (*UserWithPerms, error) {
    user := uc.userRepo.GetByID(ctx, userID)
    roles := uc.userRoleRepo.GetRolesByUserID(ctx, userID)
    
    // 从 Casbin Enforcer 获取该用户所有角色的权限
    var permissions []Permission
    for _, role := range roles {
        policies := enforcer.GetFilteredPolicy(0, role.ID.String())
        for _, p := range policies {
            permissions = append(permissions, Permission{Resource: p[1], Action: p[2]})
        }
    }
    
    return &UserWithPerms{User: user, Roles: roles, Permissions: permissions}, nil
}
```

### 7.2 修改 `app.tsx` — 从 API 获取权限

**修改文件**：[`src/app.tsx`](../web-components/packages/admin-ui/src/app.tsx)

```typescript
export async function getInitialState() {
  const fetchUserInfo = async () => {
    if (!isAuthenticated()) return undefined;
    try {
      const userInfo = await getCurrentUser();
      if (!userInfo) return undefined;

      // ✅ 从 API 响应构建权限集合
      const permissionSet = new Set(
        (userInfo.permissions || []).map(
          (p: {resource: string, action: string}) => `${p.resource}:${p.action}`
        )
      );
      const roleNames = (userInfo.roles || []).map((r: any) => r.name);

      return {
        userid: userInfo.id,
        name: userInfo.name,
        avatar: userInfo.avatar_url || '',
        email: userInfo.email,
        // ✅ 不再硬编码，基于角色判断
        access: roleNames.includes('admin') ? 'admin' : 'user',
        // ✅ 新增：角色列表和权限集合
        roles: roleNames,
        permissions: permissionSet,
      } as API.CurrentUser;
    } catch {
      return undefined;
    }
  };
  // ... 后续逻辑不变
}
```

### 7.3 修改 `access.ts` — 基于角色和权限 {#sec-7-3}

**修改文件**：[`src/access.ts`](../web-components/packages/admin-ui/src/access.ts)

```typescript
export default function access(initialState: { currentUser?: API.CurrentUser }) {
  const { currentUser } = initialState ?? {};
  if (!currentUser) return {};

  const perms = currentUser.permissions as Set<string> | undefined;
  const has = (resource: string, action: string) =>
    perms?.has(`${resource}:${action}`) ?? false;

  return {
    // 管理员角色
    canAdmin: currentUser.access === 'admin',
    // 细粒度权限（基于后端返回的 permissions）
    canUserView: has('user', 'read'),
    canUserEdit: has('user', 'write'),
    canUserDelete: has('user', 'delete'),
    canRoleView: has('role', 'read'),
    canRoleEdit: has('role', 'write'),
    canPermissionView: has('permission', 'read'),
    canPermissionEdit: has('permission', 'write'),
  };
}
```

### 7.4 路由配置 — 使用 `access` 字段

**修改文件**：[`config/routes.ts`](../web-components/packages/admin-ui/config/routes.ts)

```typescript
// 新增系统管理路由
{
  path: '/system',
  name: 'system',
  icon: 'setting',
  routes: [
    {
      path: '/system/roles',
      name: 'roles',
      component: './system/roles',
      access: 'canRoleView',    // ✅ 需要 canRoleView 权限才可见
    },
    {
      path: '/system/permissions',
      name: 'permissions',
      component: './system/permissions',
      access: 'canPermissionView',
    },
  ],
},
```

### 7.5 按钮级权限控制 — 使用 `useAccess`

**无需自定义权限组件**，直接使用 Ant Design Pro 内置的 `useAccess` hook：

```typescript
import { useAccess } from '@umijs/max';
import { Access } from '@ant-design/pro-components';

function UserList() {
  const access = useAccess();

  return (
    <div>
      <h1>用户列表</h1>
      {/* 使用 ProComponents 的 Access 组件 */}
      <Access accessible={access.canUserEdit}>
        <Button>编辑</Button>
      </Access>
      <Access accessible={access.canUserDelete}>
        <Button danger>删除</Button>
      </Access>
    </div>
  );
}
```

### 7.6 前端权限初始化流程

```mermaid
sequenceDiagram
    participant A as 应用启动
    participant AI as getInitialState
    participant API as Admin Server

    A->>AI: 调用 getInitialState()
    AI->>AI: isAuthenticated() 检查 localStorage
    AI->>API: GET /api/auth/me
    API-->>AI: { user, roles[], permissions[] }
    AI->>AI: 构建 permissionSet（Set 结构）
    AI->>AI: 返回 currentUser（含 roles + permissions）
    A->>A: access.ts 计算权限布尔值
    A->>A: 渲染应用（路由 + 按钮级控制）
```

> **注意**：前端权限控制只是 **UI 可见性**，不是安全边界。后端 Casbin 中间件才是真正的权限检查点。

### 7.7 前端权限缓存刷新策略

**问题**：用户权限数据缓存在 `initialState.currentUser.permissions`（Set 结构），什么时候需要刷新？

**刷新触发点**：

| 触发场景 | 刷新方式 | 说明 |
| --- | --- | --- |
| 应用启动 | `getInitialState()` 调用 `/api/auth/me` | 初始加载，已在 [7.6](#76-前端权限初始化流程) 中描述 |
| Token 刷新后 | 重新调用 `/api/auth/me` | Token 刷新时顺带刷新权限数据 |
| 管理员修改了当前用户的权限 | 后端推送通知 or 用户手动刷新 | 见 [7.9](#79-权限变更通知机制) |
| 用户手动刷新页面 | 浏览器刷新 → `getInitialState()` 重新执行 | 最简单可靠的刷新方式 |

**Token 刷新时的权限同步**：

```mermaid
sequenceDiagram
    participant F as 前端
    participant I as requestInterceptors
    participant API as Admin Server

    F->>API: 发起 API 请求
    API-->>F: { success: false, errorCode: "unauthorized" }
    F->>I: responseInterceptors 检测 unauthorized
    I->>I: isRefreshing = true，排队当前请求
    I->>API: POST /api/auth/refresh
    API-->>I: 新 access_token + refresh_token
    I->>API: GET /api/auth/me（🔄 同时刷新权限数据）
    API-->>I: { user, roles[], permissions[] }
    I->>I: 更新 initialState.currentUser
    I->>I: 重建 permissionSet（Set 结构）
    I->>I: isRefreshing = false，通知排队的请求重试
    I->>API: 重试之前失败的请求
```

**关键实现**：

```typescript
// web-components/packages/admin-ui/src/requestErrorConfig.ts
// 在 token 刷新成功后，同时刷新权限数据

async function handleTokenRefresh() {
  const tokens = await refreshToken();
  saveTokens(tokens);

  // ✅ 同时刷新权限数据
  const userInfo = await getCurrentUser();
  const permissionSet = new Set(
    (userInfo.permissions || []).map(
      (p: {resource: string, action: string}) => `${p.resource}:${p.action}`
    )
  );
  const roleNames = (userInfo.roles || []).map((r: any) => r.name);

  // 更新 initialState（通过 Umi 的 setInitialState）
  setInitialState(prev => ({
    ...prev,
    currentUser: {
      ...prev.currentUser,
      ...userInfo,
      access: roleNames.includes('admin') ? 'admin' : 'user',
      roles: roleNames,
      permissions: permissionSet,
    },
  }));
}
```

**多标签页同步**：

当用户在多个标签页打开 admin-ui 时，权限变更需要同步：

```typescript
// web-components/packages/admin-ui/src/utils/permission-sync.ts

// 使用 BroadcastChannel API 实现多标签页权限同步
const permChannel = new BroadcastChannel('admin-permissions');

// 监听权限变更通知
permChannel.onmessage = (event) => {
  if (event.data.type === 'permissions_changed') {
    // 重新获取权限数据
    refreshPermissions();
  }
};

// 当权限发生变更时，通知其他标签页
function notifyPermissionChange() {
  permChannel.postMessage({ type: 'permissions_changed' });
}
```

**缓存失效保护**：

- 权限数据不存储在 `localStorage`（仅存在于内存中的 `initialState`）
- 页面刷新即重新获取，避免缓存过期问题
- 如果 `/api/auth/me` 返回 401，自动触发 token 刷新流程

### 7.8 前端权限控制高级场景

#### 7.8.1 复合权限条件

某些 UI 元素需要组合多个权限条件。在 [7.3 节](#sec-7-3) 定义的 `access.ts` 基础上，添加复合权限和角色检查辅助函数：

```typescript
// 在 7.3 节 access.ts 的基础上添加

// 辅助函数：检查用户是否具有指定角色
const hasRole = (role: string) =>
  (currentUser.roles as string[] | undefined)?.includes(role) ?? false;

// 在 return 对象中添加复合权限：
return {
  // ... 7.3 节已定义的基础权限（canAdmin、canUserView 等）...

  // 复合权限：编辑其他用户（不能编辑自己 + 需要 edit 权限）
  canEditOtherUsers: has('user', 'write'),

  // 角色管理高级操作：需要 admin 角色 + permission 写权限
  canManagePermissions: hasRole('admin') && has('permission', 'write'),

  // 删除用户：需要 delete 权限 + 不能是最后一个 admin
  canDeleteUser: has('user', 'delete'),
};
```

#### 7.8.2 按钮级权限的降级显示

当用户无权限时，按钮的显示策略：

```typescript
import { Access } from '@ant-design/pro-components';
import { Tooltip } from 'antd';

function PermissionButton({ access, children, fallback }: {
  access: boolean;
  children: React.ReactNode;
  fallback?: 'hide' | 'disable' | 'tooltip';
}) {
  // 策略 1：隐藏（默认，用于敏感操作如删除）
  if (fallback === 'hide' || !fallback) {
    return (
      <Access accessible={access}>
        {children}
      </Access>
    );
  }

  // 策略 2：禁用（用于常用操作，让用户知道功能存在但无权限）
  if (fallback === 'disable') {
    return access
      ? <>{children}</>
      : <Button disabled>{children}</Button>;
  }

  // 策略 3：禁用 + 提示（用于需要引导用户申请权限的场景）
  if (fallback === 'tooltip') {
    return access
      ? <>{children}</>
      : (
        <Tooltip title="暂无权限，请联系管理员">
          <Button disabled>{children}</Button>
        </Tooltip>
      );
  }

  return <>{children}</>;
}

// 使用示例
<PermissionButton access={access.canUserDelete} fallback="hide">
  <Button danger>删除</Button>
</PermissionButton>

<PermissionButton access={access.canRoleEdit} fallback="tooltip">
  <Button>编辑角色</Button>
</PermissionButton>
```

#### 7.8.3 动态菜单渲染详细设计

Ant Design Pro 的菜单渲染基于 `config/routes.ts` 中路由配置的 `access` 字段。`@umijs/plugin-access` 会自动过滤无权限的路由。

**菜单可见性规则**：

| 路由 access 值 | 行为 | 示例 |
| --- | --- | --- |
| 未设置 | 所有用户可见 | 首页、个人中心 |
| `canAdmin` | 仅管理员可见 | 系统设置 |
| `canRoleView` | 有角色查看权限的用户可见 | 角色管理 |
| `canPermissionView` | 有权限查看权限的用户可见 | 权限管理 |
| 函数 `(access) => boolean` | 动态计算 | 复杂条件判断 |

**菜单图标与 Badge**：

```typescript
// config/routes.ts 中的菜单增强配置
{
  path: '/system',
  name: 'system',
  icon: 'SettingOutlined',
  access: 'canAdmin',  // 整个系统管理模块需要 admin 权限
  routes: [
    {
      path: '/system/roles',
      name: 'roles',
      icon: 'TeamOutlined',
      component: './system/roles',
      access: 'canRoleView',
    },
    {
      path: '/system/permissions',
      name: 'permissions',
      icon: 'SafetyCertificateOutlined',
      component: './system/permissions',
      access: 'canPermissionView',
    },
    {
      path: '/system/audit-logs',
      name: 'audit-logs',
      icon: 'FileSearchOutlined',
      component: './system/audit-logs',
      access: 'canAdmin',  // 审计日志仅管理员可见
    },
  ],
}
```

### 7.9 权限变更通知机制

**问题**：当管理员修改了用户 A 的权限后，用户 A 的前端如何感知？

**方案对比**：

| 方案 | 优点 | 缺点 | 推荐度 |
| --- | --- | --- | --- |
| A. 被动刷新 | 实现简单，无额外依赖 | 用户需手动刷新页面 | MVP 阶段 |
| B. WebSocket 推送 | 实时通知，用户体验好 | 需要维护 WebSocket 连接 | 后续升级 |
| C. 轮询 `/api/auth/me` | 实现较简单 | 浪费带宽，有延迟 | 不推荐 |
| D. Token 刷新时同步 | 利用已有机制 | 延迟较长（最多 1 小时，与 access token TTL 一致） | 可接受兜底 |

MVP 阶段方案：A + D 组合

- 管理员修改权限后，前端显示"权限已更新，请刷新页面"提示
- Token 刷新时自动同步权限数据（见 [7.7](#77-前端权限缓存刷新策略)）
- 用户手动刷新页面也能获取最新权限

**后续升级方案 B（WebSocket）**：

> **参考现有实现**：RTC Agent 主系统已使用 Centrifuge 作为 WebSocket 基础设施。admin-server 可复用此基础设施，或通过轻量级 SSE 实现。

```mermaid
sequenceDiagram
    participant A as 管理员
    participant API as Admin Server
    participant WS as SSE/WebSocket 通道
    participant U as 被修改权限的用户

    A->>API: POST /api/users/:id/roles（修改权限）
    API->>API: Casbin 策略更新
    API->>WS: 发送权限变更通知
    Note over WS: { type: "permission_changed",<br/>user_id: "uuid",<br/>new_roles: [...],<br/>new_permissions: [...] }
    WS->>U: 推送通知
    U->>U: 收到通知
    alt 用户在线
        U->>API: GET /api/auth/me（刷新权限）
        U->>U: 更新 permissionSet，重新渲染
    else 用户离线
        U->>U: 下次上线时 token 刷新自动同步
    end
```

**SSE 实现伪代码**（轻量级替代 WebSocket）：

```go
// server/internal/handler/http/permission_event.go

func (h *PermissionHandler) ServePermissionEvents(c *gin.Context) {
    userID := c.GetString("user_id")

    c.Header("Content-Type", "text/event-stream")
    c.Header("Cache-Control", "no-cache")
    c.Header("Connection", "keep-alive")

    // 注册 SSE 客户端
    ch := h.eventBus.Subscribe(userID)
    defer h.eventBus.Unsubscribe(userID)

    for event := range ch {
        fmt.Fprintf(c.Writer, "data: %s\n\n", event.JSON())
        c.Writer.(http.Flusher).Flush()
    }
}
```

```typescript
// web-components/packages/admin-ui/src/utils/permission-event-source.ts

const eventSource = new EventSource('/api/permissions/events', {
  headers: { Authorization: `Bearer ${getAccessToken()}` },
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'permission_changed') {
    // 重新获取权限数据
    refreshPermissions();
    // 提示用户
    message.info('您的权限已更新');
  }
};
```

### 7.10 国际化（i18n）支持

**现状**：admin-ui 基于 Ant Design Pro，已内置完整的 i18n 支持（`@umijs/plugin-locale`）。

**参考现有文件**：`web-components/packages/admin-ui/src/locales/`

当前支持的语言：

- `zh-CN`（简体中文）
- `zh-TW`（繁体中文）
- `en-US`（英语）
- `ja-JP`（日语）
- `pt-BR`（巴西葡萄牙语）
- `id-ID`（印尼语）
- `bn-BD`（孟加拉语）
- `fa-IR`（波斯语）

**需要国际化的权限相关文案**：

| 类别 | 文案 | i18n key 示例 |
| --- | --- | --- |
| 角色名称 | 管理员、运营、观察者 | `role.name.admin`, `role.name.operator`, `role.name.viewer` |
| 权限动作 | 查看、编辑、删除 | `permission.action.read`, `permission.action.write`, `permission.action.delete` |
| 资源名称 | 用户、角色、权限 | `permission.resource.user`, `permission.resource.role`, `permission.resource.permission` |
| 错误提示 | 无权限、角色已存在、不能移除最后一个管理员 | `error.forbidden`, `error.role_name_exists`, `error.cannot_remove_last_admin` |
| 操作确认 | 确定删除此角色吗？ | `confirm.delete_role` |
| 菜单项 | 系统管理、角色管理、权限管理 | `menu.system`, `menu.system.roles`, `menu.system.permissions` |

**i18n 文件结构**：

```typescript
// src/locales/zh-CN/permission.ts（新增）
export default {
  'role.name.admin': '管理员',
  'role.name.operator': '运营',
  'role.name.viewer': '观察者',

  'permission.action.read': '查看',
  'permission.action.write': '编辑',
  'permission.action.delete': '删除',

  'permission.resource.user': '用户',
  'permission.resource.role': '角色',
  'permission.resource.permission': '权限',

  'error.forbidden': '暂无权限执行此操作',
  'error.role_name_exists': '角色名称已存在',
  'error.cannot_remove_last_admin': '不能移除最后一个管理员角色',
  'error.cannot_delete_system_role': '不能删除系统保留角色',

  'confirm.delete_role': '确定要删除角色 "{name}" 吗？此操作将移除所有用户的该角色。',
  'confirm.remove_role_from_user': '确定要移除用户 "{user}" 的 "{role}" 角色吗？',

  'menu.system': '系统管理',
  'menu.system.roles': '角色管理',
  'menu.system.permissions': '权限管理',
  'menu.system.audit_logs': '审计日志',
};
```

**后端错误提示的多语言处理**：

后端始终返回英文 `errorCode`，前端根据 `errorCode` 映射到对应语言的提示文案：

```typescript
// src/utils/errorMessage.ts（新增）
import { useIntl } from '@umijs/max';

function useErrorMessage() {
  const intl = useIntl();

  return (errorCode: string) => {
    const messageKey = `error.${errorCode}`;
    // 如果有对应的 i18n key，使用翻译；否则显示原始 errorCode
    return intl.formatMessage(
      { id: messageKey, defaultMessage: errorCode }
    );
  };
}

// 使用示例
const getErrorMessage = useErrorMessage();
message.error(getErrorMessage('cannot_remove_last_admin'));
// 中文环境显示：不能移除最后一个管理员角色
// 英文环境显示：Cannot remove the last admin role
```

**角色显示名称的 i18n**：

后端 `Role` 模型有 `display_name` 字段（如"管理员"），但这是存储在后端的固定字符串。两种处理方案：

| 方案 | 描述 | 推荐度 |
| --- | --- | --- |
| A. 前端映射 | 后端只存 `name`（如 "admin"），前端通过 `role.name.admin` 映射到当前语言 | 推荐 |
| B. 后端多语言 | 后端 `display_name` 存 JSON（如 `{"zh-CN": "管理员", "en-US": "Administrator"}`） | 复杂但灵活 |

**MVP 阶段使用方案 A**：

```typescript
// 前端根据 role.name 映射显示名称
function useRoleDisplayName(roleName: string) {
  const intl = useIntl();
  return intl.formatMessage({
    id: `role.name.${roleName}`,
    defaultMessage: roleName, // 没有翻译时显示原始 name
  });
}
```

---

## 8. 部署与迁移

### 8.1 docker-compose.yml 配置

**参考现有配置**：[`server/docker-compose.yml`](../server/docker-compose.yml)

**关键配置点**：

```yaml
# server/docker-compose.yml

services:
  # ===========================================================================
  # 数据库迁移（一次性容器，server 启动前执行）
  # ===========================================================================

  migrate:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: rtc-full-migrate
    entrypoint: ["./rtc-agent", "migrate"]
    volumes:
      - ./etc/config.docker.yaml:/app/etc/config.yaml:ro
    depends_on:
      postgres:
        condition: service_healthy
    restart: "no"

  # ===========================================================================
  # Admin Server（后台管理系统）
  # ===========================================================================

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
    expose:
      - "8081"
    ports:
      - "28081:8081"
    volumes:
      - ./etc/admin.docker.yaml:/app/etc/admin.yaml:ro
      - full-admin-server-keys:/app/etc/keys  # JWT 密钥对（自动生成）
    depends_on:
      migrate:
        condition: service_completed_successfully  # 关键：等待迁移完成
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
```

**部署流程**：

```mermaid
sequenceDiagram
    participant DC as Docker Compose
    participant PG as PostgreSQL
    participant MG as migrate 容器
    participant AS as admin-server
    
    DC->>PG: 启动 postgres 服务
    PG-->>DC: 健康检查通过 (service_healthy)
    
    DC->>MG: 启动 migrate 容器
    MG->>MG: 执行 ./rtc-agent migrate
    MG->>PG: 连接数据库
    MG->>PG: AutoMigrate (users, roles, user_roles, casbin_rule)
    MG->>PG: 执行自定义迁移 (索引、数据转换)
    MG-->>DC: 迁移完成，退出 (service_completed_successfully)
    
    DC->>AS: 启动 admin-server
    AS->>AS: 加载配置 (admin.yaml)
    AS->>PG: 连接数据库
    AS->>AS: 初始化 Casbin Enforcer
    AS->>AS: 加载权限策略
    AS-->>AS: 启动 HTTP 服务 (0.0.0.0:8081)
```

**关键点**：

- ✅ `migrate` 服务在 `admin-server` 之前执行
- ✅ `admin-server` 依赖 `migrate` 服务成功完成
- ✅ 迁移是一次性任务（`restart: "no"`）
- ✅ PostgreSQL 必须健康后才执行迁移

### 8.2 数据库迁移适配

**参考现有实现**：[`server/cmd/migrate.go`](../server/cmd/migrate.go)

**需要修改**：在 `migrate.go` 中添加新模型的迁移

```go
// server/cmd/migrate.go
// 参考现有实现：https://github.com/rtc-agent/server/blob/main/cmd/migrate.go

func runMigrate(cmd *cobra.Command, args []string) error {
    // ... 现有代码（加载配置、连接数据库）

    // Migrate main server tables (sessions, messages, goals, files, owners, ...)
    if err := model.AutoMigrate(db); err != nil {
        return fmt.Errorf("auto migrate: %w", err)
    }

    // Migrate admin-server tables (users, admin_refresh_tokens, ...)
    // ✅ 新增 Role 和 UserRole
    if err := db.AutoMigrate(
        &model.User{},                  // 已存在（保持不变，不添加新字段）
        &model.AdminRefreshToken{},     // 已存在
        &model.Role{},                  // ✅ 新增
        &model.UserRole{},              // ✅ 新增
        // casbin_rule 表由 gorm-adapter 自动创建，不需要在这里迁移
    ); err != nil {
        return fmt.Errorf("admin auto migrate: %w", err)
    }

    // 执行自定义迁移逻辑
    // ... 现有代码（MigrateOwnerStages1And2、MigrateOwnerStage3、MigrateOwnerStage4 等）
}
```

**注意**：

- ✅ `User` 模型保持不变，不添加 `is_admin`/`is_forbidden`
- ✅ 新增的 `Role` 和 `UserRole` 模型需要添加到 admin 迁移块
- ✅ `casbin_rule` 表由 `gorm-adapter` 在初始化时自动创建，不需要在 migrate.go 中显式迁移

### 8.2.1 数据库迁移版本控制策略

> **设计原则**：当前项目使用 GORM AutoMigrate，不需要手动编写迁移脚本。但需要遵循版本控制规范，确保迁移的安全性和可追溯性。

**迁移流程**：

```mermaid
sequenceDiagram
    participant DEV as 开发者
    participant GIT as Git 仓库
    participant CI as CI/CD
    participant MG as migrate 容器
    participant DB as PostgreSQL
    
    DEV->>DEV: 修改 GORM 模型（添加字段/表）
    DEV->>GIT: 提交代码（含模型变更）
    GIT->>CI: 触发 CI pipeline
    CI->>CI: 运行单元测试 + 集成测试
    CI->>MG: 构建 Docker 镜像
    MG->>DB: 执行 AutoMigrate
    DB->>DB: 创建/修改表结构
    MG->>DB: 执行 BootstrapAdmin（如首次部署）
    MG-->>CI: 迁移成功
    CI->>CI: 部署 admin-server
```

**迁移规范**：

| 规则 | 说明 | 示例 |
| --- | --- | --- |
| 只做 additive 变更 | AutoMigrate 只做新增（表、列、索引），不做删除 | 添加新表 `roles`、添加新列 `is_enabled` |
| 不删除列/表 | 废弃的字段保留，通过代码层面忽略 | 不删除 `users.is_admin`，而是代码不使用 |
| 不修改列类型 | 类型变更需要手动 SQL，不在 AutoMigrate 中 | 不修改 `varchar(100)` → `varchar(200)` |
| 向后兼容 | 新代码必须兼容旧表结构，旧代码必须不报错 | 新列使用 `default` 值或允许 `NULL` |
| 测试迁移 | CI 中测试空数据库迁移 + 从旧版本迁移 | `docker-compose run migrate` |

**迁移版本追踪**：

当前 GORM AutoMigrate 不提供版本追踪。如果需要更严格的版本控制，可以考虑以下方案（未来扩展）：

| 方案 | 描述 | 优缺点 |
| --- | --- | --- |
| A. GORM AutoMigrate（当前） | 自动检测模型变更并执行 | ✅ 简单；❌ 无版本记录，不可回滚 |
| B. golang-migrate | 手动编写 SQL 迁移文件 | ✅ 有版本号，可回滚；❌ 需要额外学习成本 |
| C. goose | 类似 golang-migrate，Go 原生 | ✅ 支持 Go 代码迁移；❌ 引入新依赖 |

**当前选择方案 A**，因为：

- 项目处于早期阶段，表结构变更频繁
- AutoMigrate 足够满足需求
- 生产环境部署前通过数据库备份保证安全

**未来升级路径**：当表结构稳定后（如 v2.0），可以引入 golang-migrate 进行版本控制。

### 8.2.2 迁移测试

**CI 中的迁移测试**：

```yaml
# .github/workflows/ci.yml（参考）

test-migration:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: pgvector/pgvector:pg17
      env:
        POSTGRES_USER: rtc_agent
        POSTGRES_PASSWORD: rtc_agent
        POSTGRES_DB: rtc_agent_test
      ports:
        - 5432:5432
  steps:
    - uses: actions/checkout@v4
    
    # 测试 1：空数据库迁移
    - name: Run migration on empty database
      run: go run . migrate
      env:
        DATABASE__DSN: postgres://rtc_agent:rtc_agent@localhost:5432/rtc_agent_test
    
    # 测试 2：验证表结构
    - name: Verify table structure
      run: |
        psql -h localhost -U rtc_agent -d rtc_agent_test -c "\d roles"
        psql -h localhost -U rtc_agent -d rtc_agent_test -c "\d user_roles"
    
    # 测试 3：验证引导数据
    - name: Verify bootstrap data
      run: |
        psql -h localhost -U rtc_agent -d rtc_agent_test -c \
          "SELECT name FROM roles WHERE name IN ('admin', 'operator', 'viewer')"
```

### 8.3 Casbin 初始化

**参考现有实现**：[`server/cmd/admin/serve.go:86-98`](../server/cmd/admin/serve.go#L86-L98)

**需要添加**：在 `admin/serve.go` 中初始化 Casbin Enforcer

```go
// server/cmd/admin/serve.go

func runServe(cmd *cobra.Command, args []string) {
    // ... 现有代码（加载配置、初始化数据库等）

    // Init JWT signer (已存在)
    jwtSigner, err := auth.NewAdminJWTSigner(...)
    if err != nil {
        logger.Fatal(context.Background(), "admin.jwt_signer_init_failed", zap.Error(err))
    }

    // ✅ 新增：Init Casbin Enforcer
    casbinEnforcer, err := auth.NewAdminCasbinEnforcer(db)
    if err != nil {
        logger.Fatal(context.Background(), "admin.casbin_enforcer_init_failed", zap.Error(err))
    }

    // Init repositories
    userRepo := repo.NewUserRepo(db)
    refreshTokenRepo := repo.NewAdminRefreshTokenRepo(db)
    roleRepo := repo.NewRoleRepo(db)           // ✅ 新增
    userRoleRepo := repo.NewUserRoleRepo(db)   // ✅ 新增

    // Init usecase
    adminAuthUsecase := usecase.NewAdminAuthUsecase(userRepo, refreshTokenRepo, jwtSigner)
    roleUsecase := usecase.NewRoleUsecase(roleRepo, userRoleRepo, casbinEnforcer)  // ✅ 新增

    // Init handler
    adminAuthHandler := httphandler.NewAdminAuthHandler(adminAuthUsecase, jwtSigner, db)
    roleHandler := httphandler.NewRoleHandler(roleUsecase)  // ✅ 新增

    // Setup router
    router := setupRouter(adminAuthHandler, roleHandler, cfg.CORS.AllowedOrigins)  // ✅ 修改

    // ... 后续代码（启动 HTTP 服务）
}
```

### 8.4 环境变量配置

**参考现有配置**：[`server/etc/admin.docker.yaml`](../server/etc/admin.docker.yaml)

**无需额外配置**：Casbin 使用相同的数据库连接，不需要额外的环境变量。

### 8.5 数据迁移详细设计

> **目标**：从现有系统（无权限系统）平滑迁移到新权限系统，确保数据完整性、业务连续性和可回滚性。

#### 8.5.1 迁移场景分析

| 场景 | 描述 | 迁移策略 |
| --- | --- | --- |
| **全新部署** | 新环境首次部署 admin-server | 执行 `migrate` + `BootstrapAdmin`（见 [第9章](#9-引导数据策略)） |
| **现有环境升级** | 已有 admin-server 和 users 表，升级到权限系统 | 执行增量迁移脚本（本节重点） |
| **跨版本升级** | 从旧版本权限系统升级 | 遵循版本迁移路径（如 v1.0 → v1.5 → v1.6） |

#### 8.5.2 现有环境升级流程

**前置条件检查**：

```mermaid
sequenceDiagram
    participant OPS as 运维人员
    participant DB as PostgreSQL
    participant MIG as migrate 容器
    participant AS as admin-server

    OPS->>OPS: 1. 备份数据库
    Note over OPS: pg_dump -U rtc_agent rtc_agent > backup_$(date +%Y%m%d).sql
    OPS->>DB: 2. 验证备份完整性
    DB-->>OPS: 备份文件大小、行数校验

    OPS->>MIG: 3. 执行迁移容器
    MIG->>MIG: 4. 前置检查
    MIG->>DB: 检查 users 表是否存在
    MIG->>DB: 检查 roles 表是否存在
    MIG->>DB: 检查现有用户数量
    
    alt roles 表不存在（首次升级）
        MIG->>DB: 5a. AutoMigrate 创建新表
        MIG->>DB: 创建 roles, user_roles, casbin_rule
        MIG->>MIG: 5b. 执行数据迁移
        MIG->>DB: 查询所有现有用户
        MIG->>DB: 创建默认角色 (admin, operator, viewer)
        MIG->>DB: 为所有现有用户分配 admin 角色
        MIG->>DB: 生成 Casbin 策略 (g 类型)
    else roles 表已存在（重复执行）
        MIG->>MIG: 跳过（幂等性）
    end
    
    MIG-->>OPS: 迁移完成
    OPS->>AS: 6. 启动 admin-server
    AS->>DB: 7. 验证权限数据
    AS-->>OPS: 服务正常启动
```

**迁移脚本伪代码**：

```go
// server/internal/model/migrate_permissions.go（新增）

// MigrateToPermissionSystem 从现有系统迁移到权限系统
func MigrateToPermissionSystem(db *gorm.DB, enforcer *casbin.Enforcer) error {
    // 1. 前置检查：roles 表是否已存在
    if !db.Migrator().HasTable("roles") {
        return fmt.Errorf("roles table not found, run AutoMigrate first")
    }
    
    // 2. 检查是否已经迁移过（roles 表非空）
    var roleCount int64
    db.Model(&Role{}).Count(&roleCount)
    if roleCount > 0 {
        logger.Info(context.Background(), "permission_system_already_migrated")
        return nil // 已迁移，跳过
    }
    
    // 3. 开启事务（保证原子性）
    return db.Transaction(func(tx *gorm.DB) error {
        // 3.1 创建默认角色
        adminRole := Role{Name: "admin", DisplayName: "管理员", Description: "系统管理员（默认分配）"}
        if err := tx.Create(&adminRole).Error; err != nil {
            return fmt.Errorf("create admin role: %w", err)
        }
        
        // 3.2 查询所有现有用户
        var users []User
        if err := tx.Find(&users).Error; err != nil {
            return fmt.Errorf("query existing users: %w", err)
        }
        
        logger.Info(context.Background(), "migrating_existing_users",
            zap.Int("user_count", len(users)))
        
        // 3.3 为所有现有用户分配 admin 角色
        for _, user := range users {
            userRole := UserRole{
                UserID: user.ID,
                RoleID: adminRole.ID,
            }
            if err := tx.Create(&userRole).Error; err != nil {
                if !errors.Is(err, gorm.ErrDuplicatedKey) {
                    return fmt.Errorf("create user_role for %s: %w", user.ID, err)
                }
                // 重复键：跳过（幂等性）
            }
        }
        
        // 3.4 生成 Casbin 策略
        // 3.4.1 为 admin 角色添加所有权限
        resources := []string{"user", "role", "permission"}
        actions := []string{"read", "write", "delete"}
        for _, resource := range resources {
            for _, action := range actions {
                if _, err := enforcer.AddPolicy(adminRole.ID.String(), resource, action); err != nil {
                    return fmt.Errorf("add policy: %w", err)
                }
            }
        }
        
        // 3.4.2 为所有用户添加角色继承关系 (g 类型)
        for _, user := range users {
            if _, err := enforcer.AddGroupingPolicy(user.ID.String(), adminRole.ID.String()); err != nil {
                return fmt.Errorf("add grouping policy: %w", err)
            }
        }
        
        // 3.5 记录迁移日志
        logger.Info(context.Background(), "permission_migration_completed",
            zap.Int("users_migrated", len(users)),
            zap.String("admin_role_id", adminRole.ID.String()))
        
        return nil
    })
}
```

**调用时机**（修改 [`server/cmd/migrate.go`](../server/cmd/migrate.go)）：

```go
// server/cmd/migrate.go

func runMigrate(cmd *cobra.Command, args []string) error {
    // ... 现有代码 ...
    
    // Migrate admin-server tables
    if err := db.AutoMigrate(
        &model.User{},
        &model.AdminRefreshToken{},
        &model.Role{},          // ✅ 新增
        &model.UserRole{},      // ✅ 新增
    ); err != nil {
        return fmt.Errorf("admin auto migrate: %w", err)
    }
    
    // ✅ 新增：初始化 Casbin Enforcer（用于数据迁移）
    casbinEnforcer, err := auth.NewAdminCasbinEnforcer(db)
    if err != nil {
        return fmt.Errorf("init casbin enforcer: %w", err)
    }
    
    // ✅ 新增：执行权限系统迁移（从现有系统升级）
    if err := model.MigrateToPermissionSystem(db, casbinEnforcer); err != nil {
        return fmt.Errorf("migrate permission system: %w", err)
    }
    
    // ✅ 新增：执行引导数据策略（首次部署）
    if err := model.BootstrapAdmin(db, casbinEnforcer); err != nil {
        return fmt.Errorf("bootstrap admin: %w", err)
    }
    
    // ... 后续代码 ...
}
```

#### 8.5.3 数据清理与修复

**问题场景**：迁移过程中可能遇到数据不一致。

| 问题 | 症状 | 修复方案 |
| --- | --- | --- |
| 用户没有角色 | 用户无法登录或权限检查失败 | 运行修复脚本，为无角色用户分配默认角色 |
| Casbin 策略缺失 | `casbin_rule` 表为空 | 重建策略（从 `roles` 和 `user_roles` 表推导） |
| 重复的角色分配 | `user_roles` 表有重复记录 | 删除重复记录，保留最早的一条 |

**修复脚本**：

```bash
# CLI 命令：修复权限数据
./rtc-agent admin repair-permissions \
    --fix-orphan-users \        # 修复无角色用户
    --rebuild-casbin-policies \ # 重建 Casbin 策略
    --remove-duplicates         # 删除重复记录
```

**修复脚本伪代码**：

```go
// server/cmd/admin/repair_permissions.go（新增）

func runRepairPermissions(cmd *cobra.Command, args []string) {
    // 初始化数据库和 Enforcer
    db := initDB()
    enforcer := initCasbinEnforcer(db)
    
    if fixOrphanUsers {
        // 1. 查询没有角色的用户
        var orphanUsers []User
        db.Raw(`
            SELECT u.* FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            WHERE ur.user_id IS NULL AND u.deleted_at IS NULL
        `).Scan(&orphanUsers)
        
        // 2. 为每个用户分配 admin 角色
        adminRole := getAdminRole(db)
        for _, user := range orphanUsers {
            db.Create(&UserRole{UserID: user.ID, RoleID: adminRole.ID})
            enforcer.AddGroupingPolicy(user.ID.String(), adminRole.ID.String())
        }
        
        logger.Info(ctx, "fixed_orphan_users", zap.Int("count", len(orphanUsers)))
    }
    
    if rebuildCasbinPolicies {
        // 清空现有策略
        enforcer.ClearPolicy()
        
        // 从 roles 表重建 p 类型策略
        var roles []Role
        db.Find(&roles)
        for _, role := range roles {
            // 根据角色类型分配默认权限
            if role.Name == "admin" {
                // admin 拥有所有权限
                addAllPermissions(enforcer, role.ID.String())
            } else if role.Name == "operator" {
                // operator 拥有用户管理权限
                addOperatorPermissions(enforcer, role.ID.String())
            }
            // ... 其他角色
        }
        
        // 从 user_roles 表重建 g 类型策略
        var userRoles []UserRole
        db.Find(&userRoles)
        for _, ur := range userRoles {
            enforcer.AddGroupingPolicy(ur.UserID.String(), ur.RoleID.String())
        }
        
        // 保存策略到数据库
        enforcer.SavePolicy()
        
        logger.Info(ctx, "rebuilt_casbin_policies",
            zap.Int("roles", len(roles)),
            zap.Int("user_roles", len(userRoles)))
    }
    
    if removeDuplicates {
        // 删除 user_roles 表的重复记录
        result := db.Exec(`
            DELETE FROM user_roles
            WHERE ctid NOT IN (
                SELECT MIN(ctid)
                FROM user_roles
                GROUP BY user_id, role_id
            )
        `)
        logger.Info(ctx, "removed_duplicate_user_roles",
            zap.Int64("deleted", result.RowsAffected))
    }
}
```

#### 8.5.4 回滚方案

**问题**：迁移失败或发现严重问题，需要回滚到迁移前状态。

**回滚步骤**：

```bash
# 1. 停止 admin-server
docker-compose stop admin-server

# 2. 从备份恢复数据库
docker-compose exec -T postgres psql -U rtc_agent rtc_agent < backup_20261005.sql

# 3. 验证恢复结果
docker-compose exec postgres psql -U rtc_agent -c \
    "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM roles;"

# 4. 重启 admin-server（旧版本，不含权限系统）
docker-compose start admin-server
```

**回滚注意事项**：

| 注意点 | 说明 |
| --- | --- |
| **备份必须在迁移前执行** | 迁移后无法物理删除新表（`roles`、`user_roles`、`casbin_rule`） |
| **API 兼容性** | 旧版本 admin-server 不识别 `roles` 字段，但 `/api/auth/me` 会忽略未知字段 |
| **前端兼容性** | 旧版本前端硬编码 `access: 'admin'`，不受影响 |
| **数据丢失风险** | 迁移后创建的角色、权限数据在回滚后会丢失 |

---

## 9. 引导数据策略

### 9.1 问题

首次部署时，数据库中没有角色、权限策略、用户-角色关系。系统需要一个引导（bootstrap）机制来初始化基础权限数据。

### 9.2 方案

**在 `migrate` 服务中执行引导逻辑**，利用 `migrate.go` 已有的迁移流程：

```mermaid
sequenceDiagram
    participant M as migrate 容器
    participant DB as PostgreSQL
    participant E as Casbin Enforcer

    M->>DB: AutoMigrate (users, roles, user_roles)
    M->>DB: 检查 roles 表是否为空
    alt 首次部署（roles 为空）
        M->>DB: 插入默认角色 (admin, operator, viewer)
        M->>E: 初始化 Enforcer
        M->>E: 添加默认权限策略 (p 类型)
        M->>E: 添加引导管理员 (g 类型)
        Note over M: 引导管理员 = 第一个 User 记录<br/>（通过 admin account create 预先创建）
    end
    M->>M: 退出
```

### 9.3 引导伪代码

```go
// server/internal/model/bootstrap.go（新增）

func BootstrapAdmin(db *gorm.DB, enforcer *casbin.Enforcer) error {
    // 1. 检查是否需要引导（roles 表为空）
    var count int64
    db.Model(&Role{}).Count(&count)
    if count > 0 {
        return nil // 非首次部署，跳过
    }

    // 2. 创建默认角色
    adminRole := Role{Name: "admin", DisplayName: "管理员", Description: "拥有所有权限"}
    operatorRole := Role{Name: "operator", DisplayName: "运营", Description: "只读权限 + 用户管理"}
    viewerRole := Role{Name: "viewer", DisplayName: "观察者", Description: "只读权限"}
    db.Create(&adminRole)
    db.Create(&operatorRole)
    db.Create(&viewerRole)

    // 3. 创建默认权限策略
    // admin: 所有资源的所有操作
    enforcer.AddPolicy(adminRole.ID.String(), "user", "read")
    enforcer.AddPolicy(adminRole.ID.String(), "user", "write")
    enforcer.AddPolicy(adminRole.ID.String(), "user", "delete")
    enforcer.AddPolicy(adminRole.ID.String(), "role", "read")
    enforcer.AddPolicy(adminRole.ID.String(), "role", "write")
    enforcer.AddPolicy(adminRole.ID.String(), "permission", "read")
    enforcer.AddPolicy(adminRole.ID.String(), "permission", "write")

    // operator: 用户管理（只读 + 写入）
    enforcer.AddPolicy(operatorRole.ID.String(), "user", "read")
    enforcer.AddPolicy(operatorRole.ID.String(), "user", "write")

    // viewer: 所有资源只读
    enforcer.AddPolicy(viewerRole.ID.String(), "user", "read")
    enforcer.AddPolicy(viewerRole.ID.String(), "role", "read")

    // 4. 将第一个用户（如果存在）分配为 admin
    var firstUser User
    if err := db.First(&firstUser).Error; err == nil {
        db.Create(&UserRole{UserID: firstUser.ID, RoleID: adminRole.ID})
        enforcer.AddGroupingPolicy(firstUser.ID.String(), adminRole.ID.String())
    }

    return nil
}
```

### 9.4 调用时机

在 `migrate.go` 的 admin 迁移块之后调用：

```go
// server/cmd/migrate.go
// ... 现有迁移逻辑 ...

// Bootstrap admin permissions (idempotent)
if err := model.BootstrapAdmin(db, casbinEnforcer); err != nil {
    return fmt.Errorf("bootstrap admin: %w", err)
}
```

**注意**：`migrate.go` 当前使用 `config.Load(cfgFile)`（主服务器配置），不加载 admin 配置。但 Casbin Enforcer 只需要 `*gorm.DB`，而 migrate.go 已经连接了数据库，所以可以在 migrate 中初始化 Enforcer。

---

## 10. 策略同步与多实例

### 10.1 问题

Casbin Enforcer 默认将策略加载到内存中。当多个 admin-server 实例运行时，一个实例修改策略后，其他实例的内存缓存不会自动更新。

### 10.2 方案对比

| 方案 | 优点 | 缺点 | 推荐度 |
| ---- | ---- | ---- | ------ |
| **A. 每次请求从 DB 加载** | 始终一致，无同步问题 | 每次 Enforce 都要查 DB，性能差 | 不推荐（除非策略量极小） |
| **B. Casbin Watcher（Redis）** | 实时同步，性能好 | 需要额外依赖 casbin-redis-watcher | 推荐 |
| **C. 定时轮询 DB** | 简单，无需额外依赖 | 有延迟（取决于轮询间隔） | 可接受 |
| **D. 单实例部署** | 无同步问题 | 不可扩展 | 适合 MVP |

### 10.3 推荐方案：MVP 阶段使用 D，后续升级到 B

**MVP 阶段（单实例）**：admin-server 只部署一个实例，无需策略同步。Enforcer 在启动时从 DB 加载策略，内存中缓存。策略修改时直接操作 Enforcer（它会自动持久化到 DB）。

**后续升级（多实例）**：引入 `casbin-redis-watcher`，利用已有的 Redis 基础设施：

```go
import rediswatcher "github.com/casbin/redis-watcher/v2"

watcher, _ := rediswatcher.NewWatcher(cfg.Redis.Addr, rediswatcher.WatcherOptions{})
enforcer.SetWatcher(watcher, func(err error) {
    // 回调：其他实例修改了策略
})
// 修改策略时，watcher 会自动通知其他实例
enforcer.AddPolicy("role", "resource", "action")
```

### 10.4 性能考虑

- Casbin Enforce 操作在内存中执行（策略已加载），单次延迟 < 1ms
- 策略量 < 1000 条时，内存占用可忽略
- 策略修改（AddPolicy/RemovePolicy）会同步写入 DB + 通知其他实例

---

## 11. 安全策略

> **设计原则**：权限系统本身的安全性必须得到保障，防止未授权访问、暴力破解、数据泄露等攻击。

### 11.1 密码策略

**参考标准**：NIST SP 800-63B（数字身份验证指南）

**密码要求**：

- **最小长度**：8 个字符（推荐 12+）
- **复杂度**：至少包含以下 3 类字符中的 2 类：

  - 大写字母 (A-Z)
  - 小写字母 (a-z)
  - 数字 (0-9)
  - 特殊字符 (!@#$%^&*等)

- **禁止弱密码**：常见密码黑名单（如 "password123", "admin123"）
- **密码历史**：不能与最近 5 次密码相同
- **有效期**：90 天强制更换（可选，根据安全级别配置）

> **OAuth2 用户说明**：通过 OAuth2/OIDC 登录的用户（`Provider` 和 `ProviderSubject` 非空）的 `PasswordHash` 为空（参见 [`usecase/admin_auth.go:FindOrCreateUser`](../server/internal/usecase/admin_auth.go)）。密码策略仅适用于本地密码登录用户。OAuth2 用户无法通过 `POST /api/auth/login` 登录（密码为空，bcrypt 比对必然失败）。密码修改、密码历史等策略不适用于 OAuth2 用户。CLI `admin account create` 创建的用户始终为本地密码用户。

**实现伪代码**：

```go
// server/internal/usecase/admin_auth.go

func ValidatePassword(password string) error {
    // 1. 检查长度
    if len(password) < 8 {
        return ErrPasswordTooShort
    }
    
    // 2. 检查复杂度（至少 2 类字符）
    var categories int
    if strings.ContainsAny(password, "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
        categories++
    }
    if strings.ContainsAny(password, "abcdefghijklmnopqrstuvwxyz") {
        categories++
    }
    if strings.ContainsAny(password, "0123456789") {
        categories++
    }
    if strings.ContainsAny(password, "!@#$%^&*()_+-=[]{}|;:,.<>?") {
        categories++
    }
    if categories < 2 {
        return ErrPasswordTooSimple
    }
    
    // 3. 检查弱密码黑名单
    if isWeakPassword(password) {
        return ErrPasswordTooWeak
    }
    
    return nil
}

func isWeakPassword(password string) bool {
    weakPasswords := []string{
        "password123", "admin123", "12345678", "qwerty123",
        // ... 更多常见密码
    }
    lower := strings.ToLower(password)
    for _, weak := range weakPasswords {
        if lower == weak {
            return true
        }
    }
    return false
}
```

**bcrypt 成本因子**：

**参考现有代码**：[`server/internal/usecase/admin_auth.go:34`](../server/internal/usecase/admin_auth.go#L34)

```go
// bcryptCost is the computational cost factor for password hashing.
// Higher values increase security but also increase CPU time for hashing.
const bcryptCost = 12
```

**说明**：成本因子 12 表示 2^12 = 4096 次迭代，符合当前安全标准（2026年）。建议每 2-3 年评估一次是否需要提升。

> **已知差异**：CLI 命令 `admin account create`（[`server/cmd/admin/account.go:83`](../server/cmd/admin/account.go#L83)）使用 `bcrypt.DefaultCost`（值为 10），而 usecase 层的 `HashPassword()` 使用 `bcryptCost = 12`。新创建的权限系统 CLI 命令应统一使用 `usecase.HashPassword()` 或至少使用 `bcryptCost = 12`，确保所有密码哈希强度一致。

### 11.2 登录保护机制

#### 11.2.1 登录失败锁定

**问题**：防止暴力破解攻击

**方案**：基于 IP + 邮箱的双重锁定机制

```mermaid
sequenceDiagram
    participant C as 客户端
    participant R as Rate Limiter
    participant A as AdminAuthUsecase
    participant DB as PostgreSQL
    
    C->>R: POST /api/auth/login (email, password)
    R->>R: 检查 IP 失败次数
    alt IP 被锁定（5分钟内失败 >= 10次）
        R-->>C: HTTP 200 + { success: false, errorCode: "rate_limit_exceeded" }
    else IP 未锁定
        R->>R: 检查邮箱失败次数
        alt 邮箱被锁定（15分钟内失败 >= 5次）
            R-->>C: HTTP 200 + { success: false, errorCode: "account_locked" }
        else 邮箱未锁定
            R->>A: 继续验证
            A->>DB: 查询用户 + 验证密码
            alt 登录失败
                A->>DB: 记录失败次数
                A-->>C: HTTP 200 + { success: false, errorCode: "invalid_credentials" }
            else 登录成功
                A->>DB: 重置失败次数
                A-->>C: HTTP 200 + { success: true, data: tokens }
            end
        end
    end
```

**实现要点**：

```go
// server/internal/infra/ratelimit/login.go

type LoginRateLimiter struct {
    redis *redis.Client
}

// CheckLoginRate 检查登录频率限制
func (r *LoginRateLimiter) CheckLoginRate(ctx context.Context, ip, email string) error {
    // 1. 检查 IP 限制（5分钟内最多 10 次失败）
    ipKey := fmt.Sprintf("login:ip:%s", ip)
    ipFails, _ := r.redis.Get(ctx, ipKey).Int()
    if ipFails >= 10 {
        return ErrTooManyRequests
    }
    
    // 2. 检查邮箱限制（15分钟内最多 5 次失败）
    emailKey := fmt.Sprintf("login:email:%s", email)
    emailFails, _ := r.redis.Get(ctx, emailKey).Int()
    if emailFails >= 5 {
        return ErrAccountLocked
    }
    
    return nil
}

// RecordLoginFailure 记录登录失败
func (r *LoginRateLimiter) RecordLoginFailure(ctx context.Context, ip, email string) {
    // IP 失败计数（5分钟过期）
    ipKey := fmt.Sprintf("login:ip:%s", ip)
    r.redis.Incr(ctx, ipKey)
    r.redis.Expire(ctx, ipKey, 5*time.Minute)
    
    // 邮箱失败计数（15分钟过期）
    emailKey := fmt.Sprintf("login:email:%s", email)
    r.redis.Incr(ctx, emailKey)
    r.redis.Expire(ctx, emailKey, 15*time.Minute)
}

// ResetLoginFailures 登录成功后重置失败计数
func (r *LoginRateLimiter) ResetLoginFailures(ctx context.Context, ip, email string) {
    ipKey := fmt.Sprintf("login:ip:%s", ip)
    emailKey := fmt.Sprintf("login:email:%s", email)
    r.redis.Del(ctx, ipKey, emailKey)
}
```

**集成到现有代码**：

```go
// server/internal/usecase/admin_auth.go

func (uc *AdminAuthUsecase) Login(ctx context.Context, ip, email, password string) (*LoginResult, error) {
    // 1. 检查登录频率
    if err := uc.rateLimiter.CheckLoginRate(ctx, ip, email); err != nil {
        logger.Warn(ctx, "admin_auth.login_rate_limited",
            zap.String("ip", ip), zap.String("email", email))
        return nil, err
    }
    
    // 2. 查找用户
    user, err := uc.userRepo.GetByEmail(ctx, email)
    if err != nil {
        uc.rateLimiter.RecordLoginFailure(ctx, ip, email)
        return nil, ErrInvalidCredentials
    }
    
    // 3. 验证密码
    if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
        uc.rateLimiter.RecordLoginFailure(ctx, ip, email)
        return nil, ErrInvalidCredentials
    }
    
    // 4. 登录成功，重置失败计数
    uc.rateLimiter.ResetLoginFailures(ctx, ip, email)
    
    // ... 后续 token 生成逻辑
}
```

#### 11.2.2 CAPTCHA 集成

**触发条件**：

- 连续 3 次登录失败后，要求输入 CAPTCHA
- 从高风险 IP（海外、代理）登录时，要求 CAPTCHA

**推荐方案**：Google reCAPTCHA v3（无感知验证）或 Cloudflare Turnstile

### 11.3 CSRF 防护

**现状**：当前 admin-server 使用 JWT + `Authorization` header，不依赖 Cookie，**天然免疫 CSRF**（CSRF 攻击依赖浏览器自动发送 Cookie）。

**但仍需注意**：

- 如果未来引入 Cookie 认证，必须添加 CSRF Token
- 前端 `localStorage` 存储 token 存在 XSS 风险（见 [11.5](#115-xss-防护)）

### 11.4 SQL 注入防护

**参考现有代码**：所有数据库操作通过 GORM ORM，**自动防止 SQL 注入**。

**额外防护**：

- 禁止使用 `db.Raw()` 或 `db.Exec()` 拼接 SQL
- 所有输入通过 GORM 的查询构建器传递
- 代码审查时重点检查 Raw SQL

**验收测试**：

```bash
# SQL 注入测试用例
curl -X POST http://localhost:28081/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"admin\" OR \"1\"=\"1","display_name":"测试"}'

# 预期：返回 HTTP 200 + errorCode: "validation_error"（参数校验失败）或 success: true（名称被转义为字面值）
# 注意：admin-server 统一使用 HTTP 200 + errorCode 响应格式，不返回真实 HTTP 状态码（参见 2.2.1）
```

### 11.5 XSS 防护

**前端 XSS 风险**：

- Token 存储在 `localStorage`，如果前端存在 XSS 漏洞，token 会被窃取
- 用户输入的角色名称、描述可能包含恶意脚本

**防护措施**：

1. **输入过滤**：后端对所有用户输入进行转义

   ```go
   // 过滤 HTML 特殊字符
   func sanitizeInput(s string) string {
       return template.HTMLEscapeString(s)
   }
   ```

2. **输出转义**：前端使用 React 的 JSX 自动转义（默认行为）

   ```typescript
   // React 自动转义变量
   <div>{role.name}</div>  // 安全：自动转义 HTML
   <div dangerouslySetInnerHTML={{__html: role.name}} />  // 危险：手动渲染 HTML
   ```

3. **Content Security Policy (CSP)**：通过 HTTP header 限制脚本来源

   ```text
   Content-Security-Policy: default-src 'self'; script-src 'self'
   ```

4. **HttpOnly Cookie（可选）**：将 token 存储在 HttpOnly Cookie 中，防止 JavaScript 访问
   - 需要后端配合修改认证逻辑
   - 当前方案（localStorage）在 XSS 防护上较弱，但实现简单

### 11.6 Rate Limiting（全局限流）

**参考现有配置**：[`server/cmd/admin/serve.go`](../server/cmd/admin/serve.go) 未实现全局 Rate Limiting

**方案**：基于 IP 的全局请求限制

```go
// server/internal/infra/middleware/rate_limit.go

func RateLimitMiddleware(redisClient *redis.Client) gin.HandlerFunc {
    return func(c *gin.Context) {
        ip := c.ClientIP()
        key := fmt.Sprintf("ratelimit:%s", ip)
        
        // 1分钟内最多 100 次请求
        count, _ := redisClient.Incr(c.Request.Context(), key).Result()
        if count == 1 {
            redisClient.Expire(c.Request.Context(), key, time.Minute)
        }
        
        if count > 100 {
            c.JSON(http.StatusOK, gin.H{
                "success": false,
                "errorCode": "rate_limit_exceeded",
                "errorMessage": "请求过于频繁，请稍后再试",
            })
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

**配置建议**：

- 普通 API：100 次/分钟/IP
- 登录 API：10 次/分钟/IP（更严格）
- 权限检查 API：200 次/分钟/IP（较宽松）

### 11.7 Token 安全

**参考现有实现**：[`server/internal/usecase/admin_auth.go`](../server/internal/usecase/admin_auth.go)

**Access Token（JWT）**：

- 有效期：1 小时（`access_token_ttl: 3600`，参见 [`server/etc/admin.yaml`](../server/etc/admin.yaml)）
- 签名算法：RS256（非对称加密）
- 存储在前端 `localStorage`（存在 XSS 风险，见 [11.5](#115-xss-防护)）

> **安全建议**：当前 1 小时有效期偏长。生产环境建议缩短至 15 分钟，配合 refresh token 轮转使用。修改方式：将 `admin.yaml` 中 `jwt.access_token_ttl` 改为 `900`。

**Refresh Token**：

- 有效期：7 天（长效）
- 存储为 SHA-256 哈希（数据库不保存明文）
- 每次刷新时轮转（rotation），防止重放攻击
- 支持撤销（revocation）

**安全措施**：

1. Refresh Token 轮转：每次刷新后旧 token 立即失效
2. Token 撤销：登出时撤销 refresh token
3. 设备绑定（可选）：在 JWT 中添加 `device_id`，绑定设备

**代码示例**（已在现有代码中实现）：

```go
// server/internal/usecase/admin_auth.go:141-205

func (uc *AdminAuthUsecase) RefreshToken(ctx context.Context, refreshTokenPlain string) (*RefreshTokenResult, error) {
    // 1. Hash the refresh token and look it up
    refreshHash := hashRefreshToken(refreshTokenPlain)
    rt, err := uc.refreshTokenRepo.FindByHash(ctx, refreshHash)
    if err != nil {
        return nil, ErrInvalidRefreshToken
    }
    
    // 2. Check if token is revoked
    if rt.Revoked {
        logger.Warn(ctx, "admin_auth.refresh_token_reuse_detected",
            zap.String("token_hash_prefix", refreshHash[:16]))
        return nil, ErrRefreshTokenRevoked
    }
    
    // 3. Check if token is expired
    if time.Now().After(rt.ExpiresAt) {
        return nil, ErrRefreshTokenExpired
    }
    
    // 4. Revoke the old refresh token (rotation)
    if err := uc.refreshTokenRepo.Revoke(ctx, rt.ID); err != nil {
        return nil, fmt.Errorf("admin auth revoke old refresh token: %w", err)
    }
    
    // 5. Generate and store new refresh token
    // ...
}
```

---

## 12. 错误处理与边界情况

### 12.1 角色删除的级联处理

**问题**：删除角色时，需要处理 `user_roles` 表中的关联记录和 `casbin_rule` 表中的策略。

**方案**：禁用（`is_enabled = false`）+ 级联清理（删除 `user_roles` 关联 + 移除 Casbin 策略）

> **注意**：此处"禁用"不是 GORM 软删除（不设置 `deleted_at`），而是将 `is_enabled` 标志置为 `false`。角色记录保留在数据库中，但不再参与权限检查。这与 12.8 节角色禁用逻辑一致。

```go
// server/internal/usecase/role.go

func (uc *RoleUsecase) DeleteRole(ctx context.Context, roleID uuid.UUID) error {
    // 1. 查询角色
    role, err := uc.roleRepo.GetByID(ctx, roleID)
    if err != nil {
        return fmt.Errorf("get role: %w", err)
    }
    
    // 2. 软删除角色（标记为禁用）
    role.IsEnabled = false
    if err := uc.roleRepo.Update(ctx, role); err != nil {
        return fmt.Errorf("disable role: %w", err)
    }
    
    // 3. 删除 user_roles 关联
    if err := uc.userRoleRepo.DeleteByRoleID(ctx, roleID); err != nil {
        return fmt.Errorf("delete user_roles: %w", err)
    }
    
    // 4. 删除 Casbin 策略
    // 4.1 删除 p 类型策略（角色-权限）
    _, err = uc.enforcer.RemoveFilteredPolicy(0, roleID.String())
    if err != nil {
        logger.Warn(ctx, "role.remove_policy_failed",
            zap.String("role_id", roleID.String()), zap.Error(err))
    }
    
    // 4.2 删除 g 类型策略（用户-角色）
    _, err = uc.enforcer.RemoveFilteredGroupingPolicy(1, roleID.String())
    if err != nil {
        logger.Warn(ctx, "role.remove_grouping_policy_failed",
            zap.String("role_id", roleID.String()), zap.Error(err))
    }
    
    logger.Info(ctx, "role.deleted",
        zap.String("role_id", roleID.String()),
        zap.String("role_name", role.Name))
    
    return nil
}
```

**边界情况**：

> **注意**：`ErrCannotRemoveLastAdmin` 是需新增的 sentinel error（参见 [2.2.4](#224-repo-接口模式) 中的"权限系统需新增"清单），定义在 `repo/errors.go`：
>
> ```go
> // 在 repo/errors.go 中新增
> ErrCannotRemoveLastAdmin = errors.New("cannot remove the last admin role from user")
> ```

1. **删除最后一个 admin 角色的用户**：

   - 禁止删除 `admin` 角色（系统保留）
   - 或者：禁止移除用户的最后一个 `admin` 角色

   ```go
   func (uc *UserRoleUsecase) RemoveUserRole(ctx context.Context, userID, roleID uuid.UUID) error {
       // 检查是否是 admin 角色
       role, err := uc.roleRepo.GetByID(ctx, roleID)
       if err != nil {
           return fmt.Errorf("get role: %w", err)
       }
       
       if role.Name == "admin" {
           // 检查用户是否还有其他 admin 角色
           userRoles, err := uc.userRoleRepo.GetRolesByUserID(ctx, userID)
           if err != nil {
               return fmt.Errorf("get user roles: %w", err)
           }
           
           adminCount := 0
           for _, r := range userRoles {
               if r.Name == "admin" {
                   adminCount++
               }
           }
           
           if adminCount == 1 {
               return ErrCannotRemoveLastAdmin
           }
       }
       
       // 删除 user_role
       return uc.userRoleRepo.Delete(ctx, userID, roleID)
   }
   ```

2. **删除有用户的角色**：
   - 方案 A：禁止删除（返回错误提示"该角色下还有用户"）
   - 方案 B：级联删除（先移除所有用户的该角色，再删除角色）
   - **推荐方案 B**，因为管理员可能希望批量清理

### 12.2 并发创建角色

**问题**：多个管理员同时创建同名角色时，可能违反唯一性约束。

**方案**：捕获唯一性约束错误，返回友好提示

> **注意**：`repo.ErrDuplicateName` 是需新增的 sentinel error（参见 [2.2.4](#224-repo-接口模式) 中的"权限系统需新增"清单），定义在 `repo/errors.go`：
>
> ```go
> // 在 repo/errors.go 中新增
> ErrDuplicateName = errors.New("role name already exists")
> ```
>
> 下面的 `roleRepo.Create()` 使用项目已有的 `repo.IsDuplicateKeyError(err)` 工具函数（参见 [`repo/errors.go:84-90`](../server/internal/repo/errors.go#L84-L90)）来检测 PG 23505 错误，而非直接解析 `pgconn.PgError`。

```go
// server/internal/usecase/role.go

func (uc *RoleUsecase) CreateRole(ctx context.Context, req *CreateRoleRequest) (*model.Role, error) {
    role := &model.Role{
        Name:        req.Name,
        DisplayName: req.DisplayName,
        Description: req.Description,
        IsEnabled:   true,
    }
    
    if err := uc.roleRepo.Create(ctx, role); err != nil {
        // 检查是否是唯一性约束错误
        if errors.Is(err, repo.ErrDuplicateName) {
            return nil, fmt.Errorf("role name '%s' already exists", req.Name)
        }
        return nil, fmt.Errorf("create role: %w", err)
    }
    
    return role, nil
}

// server/internal/repo/role_repo.go

func (r *roleRepo) Create(ctx context.Context, role *model.Role) error {
    err := DBFromContext(ctx, r.db).WithContext(ctx).Create(role).Error
    if err != nil {
        // 使用项目已有的 IsDuplicateKeyError() 检测 PG 23505 唯一约束冲突
        // （与 user_repo.go 中 ErrDuplicateEmail 的处理方式一致）
        if IsDuplicateKeyError(err) {
            return fmt.Errorf("create role: %w", ErrDuplicateName)
        }
        return fmt.Errorf("create role: %w", err)
    }
    return nil
}
```

### 12.3 用户禁用后的权限处理

**问题**：用户被禁用后，如何处理其权限？

> **重要约束**：当前 User 模型使用 `DeletedAt *time.Time`（非 `gorm.DeletedAt`），GORM **不会**自动过滤 `DeletedAt IS NOT NULL` 的记录。因此 `userRepo.GetByID()` 会返回已软删除的用户，JWT 中间件必须显式检查 `DeletedAt`。

**方案**：JWT 中间件检查用户状态

```go
// server/internal/handler/http/admin_auth.go 中 JWTAuthMiddleware 的扩展
// （或在 handler/http/ 下新建中间件文件，必须与 Error() 同包）

func (h *AdminAuthHandler) JWTAuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // 1. 解析 JWT
        token := extractToken(c)
        claims, err := h.jwtSigner.ParseAccessToken(token)
        if err != nil {
            Error(c, http.StatusUnauthorized, "unauthorized", "令牌无效或已过期")
            c.Abort()
            return
        }
        
        // 2. 查询用户
        // 注意：User.DeletedAt 是 *time.Time，GORM 不会自动过滤软删除记录
        user, err := h.adminAuthUsecase.GetCurrentUser(c.Request.Context(), claims.UserID)
        if err != nil {
            if usecase.IsUserNotFound(err) {
                Error(c, http.StatusUnauthorized, "unauthorized", "用户不存在")
                c.Abort()
                return
            }
            logger.Error(c.Request.Context(), "admin_auth.user_lookup_failed", zap.Error(err))
            Error(c, http.StatusInternalServerError, "internal_error", "服务器内部错误")
            c.Abort()
            return
        }
        
        // 3. 检查用户是否被禁用（DeletedAt 非空表示已禁用）
        // 因为 GORM 不会自动过滤（*time.Time vs gorm.DeletedAt），必须显式检查
        if user.DeletedAt != nil {
            Error(c, http.StatusUnauthorized, "user_disabled", "用户已被禁用")
            c.Abort()
            return
        }
        
        // 4. 设置用户上下文
        c.Set("user_id", user.ID.String())
        c.Next()
    }
}
```

**禁用用户的实现**：

目前 admin-server 没有提供禁用用户的 API。需要新增管理员操作端点来设置 `users.deleted_at = NOW()`。在此之前，可通过数据库直接操作：

```sql
-- 禁用用户（设置 deleted_at）
UPDATE users SET deleted_at = NOW() WHERE id = '<user-uuid>';

-- 恢复用户（清除 deleted_at）
UPDATE users SET deleted_at = NULL WHERE id = '<user-uuid>';
```

> **设计决策**：使用 `*time.Time` 而非 `gorm.DeletedAt` 是项目现有约定（参见 [`server/internal/model/user.go`](../server/internal/model/user.go) 和 [`server/internal/model/admin_refresh_token.go`](../server/internal/model/admin_refresh_token.go)）。新模型 `Role`、`UserRole` 应保持一致，不使用 GORM 软删除特性。

### 12.4 权限缓存失效

**问题**：用户权限变更后，内存中的 Casbin Enforcer 缓存不会自动更新（多实例场景）。

**方案**：

1. **单实例**：直接操作 Enforcer，自动持久化到 DB
2. **多实例**：使用 Redis Watcher 同步（见 [第10章](#10-策略同步与多实例)）

**前端权限更新**：

- 用户权限变更后，前端需要重新调用 `/api/auth/me` 获取最新权限
- 或者：权限变更时，通过 WebSocket 通知前端刷新

### 12.5 错误码规范

> **注意**：完整的错误码定义和分级体系请参见 [6.0.1 统一错误码体系](#601-统一错误码体系)。本节仅补充权限系统特有的错误处理注意事项。

**权限系统特有的错误处理**：

| 场景 | 错误码 | 处理策略 |
| --- | --- | --- |
| Casbin Enforcer 内部错误 | `internal_error` | 默认拒绝（fail-close），记录错误日志 |
| 角色不存在 | `role_not_found` | 返回 404 级别错误，前端显示"角色不存在" |
| 并发创建同名角色 | `role_name_exists` | 捕获 PostgreSQL 23505 错误，返回友好提示 |
| 移除最后一个 admin | `cannot_remove_last_admin` | 拒绝操作，前端显示"不能移除最后一个管理员" |
| 删除系统保留角色 | `cannot_delete_system_role` | 拒绝操作，admin/viewer/operator 为系统保留 |

### 12.6 并发控制与分布式锁

> **问题**：多个 admin-server 实例或多个管理员同时操作时，可能出现数据竞争。

**并发场景分析**：

| 场景 | 风险 | 解决方案 |
| --- | --- | --- |
| 同时创建同名角色 | 唯一性约束冲突 | PostgreSQL `UNIQUE` 约束 + 错误捕获（见 [12.2](#122-并发创建角色)） |
| 同时修改同一角色 | 丢失更新 | **乐观锁**：使用 `updated_at` 字段检查冲突 |
| 同时分配/移除同一用户角色 | 重复分配或误删 | 复合主键 `(user_id, role_id)` 天然防重 |
| 多实例同时修改 Casbin 策略 | 策略不一致 | MVP 单实例无此问题；多实例使用 Redis Watcher（见 [10.3](#103-推荐方案mvp-阶段使用-d后续升级到-b)） |
| Bootstrap 并发执行 | 重复初始化 | 幂等检查：`roles 表是否为空` + 事务保证原子性 |

**乐观锁实现**：

> **注意**：`repo.ErrConflict` 是新增的 sentinel error，需要在 [`repo/errors.go`](../server/internal/repo/errors.go) 中添加：
>
> `ErrConflict = errors.New("resource conflict (optimistic lock)")`
>
> 现有的 sentinel errors（`ErrNotFound`、`ErrAlreadyExists`、`ErrPermissionDenied` 等）均在 `errors.go` 集中定义（参见 [2.2.4](#224-repo-接口模式)）。

```go
// Role 模型完整定义参见 [5.4.2 roles 表](#542-roles-表新增)
// 乐观锁利用已有的 UpdatedAt 字段（time.Time）实现

// 更新时检查 updated_at 是否被其他请求修改
func (r *roleRepo) Update(ctx context.Context, role *model.Role, expectedUpdatedAt time.Time) error {
    result := DBFromContext(ctx, r.db).WithContext(ctx).
        Model(&model.Role{}).
        Where("id = ? AND updated_at = ?", role.ID, expectedUpdatedAt).
        Updates(map[string]interface{}{
            "display_name": role.DisplayName,
            "description":  role.Description,
            "is_enabled":   role.IsEnabled,
            "updated_at":   time.Now(),
        })
    if result.RowsAffected == 0 {
        return fmt.Errorf("update role %s: %w", role.ID, repo.ErrConflict)
    }
    return nil
}
```

**MVP 阶段的简化处理**：

当前 admin-server 为单实例部署，且管理员用户数量少（< 100），并发冲突概率极低。MVP 阶段采用以下简化策略：

1. **数据库约束**：依赖 `UNIQUE`、`PRIMARY KEY` 等数据库约束防止数据不一致
2. **最后写入者胜出**：角色更新不做版本检查，后写入的覆盖先写入的
3. **Casbin 单实例**：Enforcer 内存缓存即权威数据，无同步问题

> **升级到多实例时**：必须引入乐观锁 + Redis Watcher + 分布式锁（如 Redis `SETNX`）来保证一致性。

### 12.7 用户删除时的角色清理

**问题**：当用户被删除（软删除，`deleted_at` 非空）时，需要清理其在 `user_roles` 表和 `casbin_rule` 表中的关联数据。

**方案**：级联清理 + 审计日志

```go
// server/internal/usecase/user.go

func (uc *UserUsecase) DeleteUser(ctx context.Context, userID uuid.UUID, operatorID uuid.UUID) error {
    // 1. 查询用户
    user, err := uc.userRepo.GetByID(ctx, userID)
    if err != nil {
        return fmt.Errorf("get user: %w", err)
    }
    
    // 2. 检查是否是最后一个 admin
    userRoles, err := uc.userRoleRepo.GetRolesByUserID(ctx, userID)
    if err != nil {
        return fmt.Errorf("get user roles: %w", err)
    }
    
    for _, role := range userRoles {
        if role.Name == "admin" {
            // 检查是否是最后一个 admin
            adminCount := uc.countAdminUsers(ctx)
            if adminCount == 1 {
                return repo.ErrCannotRemoveLastAdmin
            }
        }
    }
    
    // 3. 开启事务
    return uc.db.Transaction(func(tx *gorm.DB) error {
        // 3.1 软删除用户
        user.DeletedAt = timePtr(time.Now())
        if err := tx.Save(user).Error; err != nil {
            return fmt.Errorf("soft delete user: %w", err)
        }
        
        // 3.2 删除 user_roles 关联
        if err := tx.Where("user_id = ?", userID).Delete(&UserRole{}).Error; err != nil {
            return fmt.Errorf("delete user_roles: %w", err)
        }
        
        // 3.3 删除 Casbin 策略（g 类型）
        _, err := uc.enforcer.RemoveFilteredGroupingPolicy(0, userID.String())
        if err != nil {
            logger.Warn(ctx, "user.remove_grouping_policy_failed",
                zap.String("user_id", userID.String()), zap.Error(err))
        }
        
        // 3.4 撤销所有 refresh tokens
        if err := tx.Where("user_id = ?", userID).Delete(&AdminRefreshToken{}).Error; err != nil {
            return fmt.Errorf("delete refresh tokens: %w", err)
        }
        
        // 3.5 记录审计日志
        uc.auditLogger.Log(ctx, AuditEvent{
            Type:       "user.deleted",
            OperatorID: operatorID,
            TargetType: "user",
            TargetID:   userID.String(),
            Details: map[string]interface{}{
                "user_email":    user.Email,
                "roles_removed": roleNames(userRoles),
            },
        })
        
        return nil
    })
}
```

**验收测试**：

```bash
# 测试用户删除后的级联清理
curl -X DELETE http://localhost:28081/api/users/$USER_ID \
  -H "Authorization: Bearer $TOKEN"

# 验证 user_roles 表已清理
docker-compose exec postgres psql -U rtc_agent -c \
  "SELECT COUNT(*) FROM user_roles WHERE user_id = '$USER_ID'"
# 预期：0

# 验证 Casbin 策略已清理
./rtc-agent admin debug list-policies --type=g | grep $USER_ID
# 预期：无输出

# 验证 refresh tokens 已撤销
docker-compose exec postgres psql -U rtc_agent -c \
  "SELECT COUNT(*) FROM admin_refresh_tokens WHERE user_id = '$USER_ID'"
# 预期：0
```

### 12.8 角色禁用后的权限检查

**问题**：当角色被禁用（`is_enabled = false`）时，该角色下的用户是否还能访问？

**设计决策**：禁用角色 = 立即撤销该角色的所有权限

**实现**：

```go
// server/internal/usecase/role.go

func (uc *RoleUsecase) DisableRole(ctx context.Context, roleID uuid.UUID, operatorID uuid.UUID) error {
    // 1. 查询角色
    role, err := uc.roleRepo.GetByID(ctx, roleID)
    if err != nil {
        return fmt.Errorf("get role: %w", err)
    }
    
    // 2. 检查是否是系统角色
    if isSystemRole(role.Name) {
        return repo.ErrCannotDeleteSystemRole
    }
    
    // 3. 开启事务
    return uc.db.Transaction(func(tx *gorm.DB) error {
        // 3.1 禁用角色
        role.IsEnabled = false
        if err := tx.Save(role).Error; err != nil {
            return fmt.Errorf("disable role: %w", err)
        }
        
        // 3.2 删除该角色下的所有 user_roles 关联
        result := tx.Where("role_id = ?", roleID).Delete(&UserRole{})
        if result.Error != nil {
            return fmt.Errorf("delete user_roles: %w", result.Error)
        }
        
        // 3.3 删除 Casbin 策略
        // 3.3.1 删除 p 类型策略（角色-权限）
        _, err := uc.enforcer.RemoveFilteredPolicy(0, roleID.String())
        if err != nil {
            logger.Warn(ctx, "role.remove_policy_failed",
                zap.String("role_id", roleID.String()), zap.Error(err))
        }
        
        // 3.3.2 删除 g 类型策略（用户-角色）
        _, err = uc.enforcer.RemoveFilteredGroupingPolicy(1, roleID.String())
        if err != nil {
            logger.Warn(ctx, "role.remove_grouping_policy_failed",
                zap.String("role_id", roleID.String()), zap.Error(err))
        }
        
        // 3.4 记录审计日志
        uc.auditLogger.Log(ctx, AuditEvent{
            Type:       "role.disabled",
            OperatorID: operatorID,
            TargetType: "role",
            TargetID:   roleID.String(),
            Details: map[string]interface{}{
                "role_name":      role.Name,
                "affected_users": result.RowsAffected,
            },
        })
        
        return nil
    })
}

// isSystemRole 检查是否是系统保留角色
func isSystemRole(name string) bool {
    systemRoles := map[string]bool{
        "admin":    true,
        "operator": true,
        "viewer":   true,
    }
    return systemRoles[name]
}
```

**前端用户体验**：

当管理员尝试禁用角色时，前端显示确认对话框：

```typescript
// web-components/packages/admin-ui/src/pages/system/roles/components/DisableRoleModal.tsx

import { Modal, Alert } from 'antd';
import { useIntl } from '@umijs/max';

function DisableRoleModal({ role, visible, onConfirm, onCancel }) {
  const intl = useIntl();
  
  return (
    <Modal
      title={intl.formatMessage({ id: 'confirm.disable_role' })}
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="确认禁用"
      cancelText="取消"
    >
      <Alert
        type="warning"
        showIcon
        message="禁用角色将立即撤销该角色下所有用户的权限"
        description={
          <div>
            <p>角色：<strong>{role.display_name}</strong></p>
            <p>当前用户数：<strong>{role.user_count}</strong></p>
            <p>禁用后，这些用户将无法访问相关功能。</p>
          </div>
        }
      />
    </Modal>
  );
}
```

### 12.9 批量分配角色的性能与一致性

**问题**：批量为多个用户分配同一角色时，如何保证性能和数据一致性？

**方案**：批量插入 + 事务保证

```go
// server/internal/usecase/user_role.go

func (uc *UserRoleUsecase) BatchAssignRole(
    ctx context.Context, 
    userIDs []uuid.UUID, 
    roleID uuid.UUID, 
    operatorID uuid.UUID,
) (*BatchAssignResult, error) {
    // 1. 检查角色存在且启用
    role, err := uc.roleRepo.GetByID(ctx, roleID)
    if err != nil {
        return nil, fmt.Errorf("get role: %w", err)
    }
    if !role.IsEnabled {
        return nil, repo.ErrRoleDisabled
    }
    
    // 2. 开启事务
    var result BatchAssignResult
    err = uc.db.Transaction(func(tx *gorm.DB) error {
        // 2.1 批量插入 user_roles（跳过已存在的）
        userRoles := make([]*UserRole, 0, len(userIDs))
        for _, userID := range userIDs {
            userRoles = append(userRoles, &UserRole{
                UserID: userID,
                RoleID: roleID,
            })
        }
        
        // 使用 CreateInBatches 批量插入（每批 100 条）
        tx := tx.WithContext(ctx)
        err := tx.Clauses(clause.OnConflict{
            Columns:   []clause.Column{{Name: "user_id"}, {Name: "role_id"}},
            DoNothing: true, // 跳过重复的
        }).Create(&userRoles).Error
        if err != nil {
            return fmt.Errorf("batch create user_roles: %w", err)
        }
        
        result.Created = int(tx.RowsAffected)
        result.Skipped = len(userIDs) - result.Created
        
        // 2.2 批量更新 Casbin 策略
        groupingPolicies := make([][]string, 0, result.Created)
        for _, userID := range userIDs {
            groupingPolicies = append(groupingPolicies, []string{
                userID.String(), 
                roleID.String(),
            })
        }
        
        _, err = uc.enforcer.AddGroupingPolicies(groupingPolicies)
        if err != nil {
            return fmt.Errorf("add grouping policies: %w", err)
        }
        
        // 2.3 记录审计日志
        uc.auditLogger.Log(ctx, AuditEvent{
            Type:       "user_role.batch_assigned",
            OperatorID: operatorID,
            TargetType: "role",
            TargetID:   roleID.String(),
            Details: map[string]interface{}{
                "role_name":   role.Name,
                "user_count":  len(userIDs),
                "created":     result.Created,
                "skipped":     result.Skipped,
            },
        })
        
        return nil
    })
    
    if err != nil {
        return nil, err
    }
    
    return &result, nil
}

// BatchAssignResult 批量分配结果
type BatchAssignResult struct {
    Created int `json:"created"` // 新分配的数量
    Skipped int `json:"skipped"` // 跳过的数量（已存在）
}
```

**性能基准**：

| 用户数量 | 目标耗时 | 实际耗时 | 备注 |
| --- | --- | --- | --- |
| 10 | < 50ms | 待测试 | 小批量 |
| 100 | < 200ms | 待测试 | 中批量 |
| 1000 | < 1s | 待测试 | 大批量 |

### 12.10 权限缓存失效与用户通知

**问题**：当用户的权限被修改后，前端如何感知并更新？

**MVP 方案**：被动刷新 + Token 刷新时同步

1. **被动刷新**：用户手动刷新页面
2. **Token 刷新同步**：每次 Token 刷新时，重新获取 `/api/auth/me`（见 [7.7](#77-前端权限缓存刷新策略)）

**增强方案（后续迭代）**：WebSocket 推送

```go
// server/internal/handler/http/permission_event.go

// PermissionEventHandler 处理权限变更事件
type PermissionEventHandler struct {
    eventBus *EventBus
}

// OnRoleAssigned 当角色被分配给用户时触发
func (h *PermissionEventHandler) OnRoleAssigned(userID uuid.UUID, roleID uuid.UUID) {
    // 通过 WebSocket 推送给该用户
    h.eventBus.Publish(userID.String(), PermissionEvent{
        Type:      "role_assigned",
        RoleID:    roleID,
        Timestamp: time.Now(),
    })
}

// OnPermissionChanged 当用户的权限被修改时触发
func (h *PermissionEventHandler) OnPermissionChanged(userID uuid.UUID) {
    h.eventBus.Publish(userID.String(), PermissionEvent{
        Type:      "permissions_changed",
        Timestamp: time.Now(),
    })
}
```

**前端用户体验优化**：

```typescript
// web-components/packages/admin-ui/src/utils/permission-sync.ts

// 当检测到权限变更时，显示友好的提示
export function showPermissionChangedNotification() {
  const notification = Notification.open({
    message: '权限已更新',
    description: '您的权限已被管理员修改，部分功能可能发生变化。',
    btn: (
      <Space>
        <Button size="small" onClick={() => notification.close()}>
          稍后刷新
        </Button>
        <Button 
          type="primary" 
          size="small" 
          onClick={() => window.location.reload()}
        >
          立即刷新
        </Button>
      </Space>
    ),
    duration: null, // 不自动关闭
  });
}

// 在 access.ts 中检测权限变化（基于 7.3 节定义的 access.ts 扩展）
// 注意：access.ts 本身是纯函数，不能直接使用 hooks（usePrevious/useEffect）。
// 实际实现应在 layout 或 app.tsx 的渲染层检测权限变化：

// src/app.tsx 的 layout 渲染逻辑中
const prevPermissions = usePrevious(initialState?.currentUser?.permissions);
useEffect(() => {
  if (prevPermissions && !isEqual(prevPermissions, initialState?.currentUser?.permissions)) {
    showPermissionChangedNotification();
  }
}, [initialState?.currentUser?.permissions]);
```

### 12.11 边界情况总结与检查清单

| 场景 | 处理策略 | 测试命令 |
| --- | --- | --- |
| 删除最后一个 admin | 拒绝操作，返回 `cannot_remove_last_admin` | 参见 [12.1](#121-角色删除的级联处理) |
| 删除系统角色 | 拒绝操作，返回 `cannot_delete_system_role` | `curl -X DELETE .../admin` → HTTP 200 + `errorCode: "cannot_delete_system_role"` |
| 禁用角色 | 级联删除 user_roles + Casbin 策略 | 参见 [12.8](#128-角色禁用后的权限检查) |
| 用户删除 | 级联清理 user_roles + tokens + Casbin | 参见 [12.7](#127-用户删除时的角色清理) |
| 批量分配角色 | 事务 + 批量插入 + 跳过重复 | 参见 [12.9](#129-批量分配角色的性能与一致性) |
| 权限缓存过期 | Token 刷新时同步 + 手动刷新 | 参见 [7.7](#77-前端权限缓存刷新策略) |

---

## 13. 性能优化

### 13.1 数据库索引

**关键索引**：

```sql
-- roles 表
CREATE UNIQUE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_roles_is_enabled ON roles(is_enabled);

-- user_roles 表
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);

-- casbin_rule 表（由 gorm-adapter 自动创建）
CREATE INDEX idx_casbin_rule_ptype ON casbin_rule(ptype);
CREATE INDEX idx_casbin_rule_v0 ON casbin_rule(v0);  -- 角色 ID
CREATE INDEX idx_casbin_rule_v1 ON casbin_rule(v1);  -- 资源
```

**GORM 模型定义**：

> 完整的 `Role` 和 `UserRole` 结构体定义参见 [5.4.2 roles 表](#542-roles-表新增) 和 [5.4.3 user_roles 表](#543-user_roles-表新增)。
>
> 本节仅补充性能相关的索引标签说明：
>
> - `Role.IsEnabled` 建议添加 `gorm:"...,index"` 标签（按启用状态过滤角色时需要索引）
> - `UserRole` 的 `UserID` 和 `RoleID` 均已标记 `index`（查询用户角色和角色用户时需要）

### 13.2 Casbin Enforcer 缓存

**内存缓存**：Casbin Enforcer 默认将策略加载到内存，单次 Enforce 操作延迟 < 1ms。

**缓存刷新**：

- 策略修改时，Enforcer 自动更新内存
- 多实例场景，使用 Redis Watcher 同步（见 [第10章](#10-策略同步与多实例)）

#### 13.2.1 性能基准测试详细设计

> **目标**：建立 Casbin Enforcer 性能基准，确保在生产负载下权限检查不会成为瓶颈。

**测试场景矩阵**：

| 场景 | 策略数量 | 用户数量 | 目标 QPS | 目标延迟 P99 |
| --- | --- | --- | --- | --- |
| 轻量级 | 10 条 | 5 个 | 200,000 | < 5μs |
| 中等规模 | 100 条 | 50 个 | 100,000 | < 10μs |
| 大规模 | 1000 条 | 500 个 | 50,000 | < 20μs |
| 超大规模 | 10000 条 | 5000 个 | 10,000 | < 100μs |

**基准测试代码**：

```go
// server/internal/infra/auth/casbin_bench_test.go

package auth_test

import (
    "fmt"
    "testing"
    
    "github.com/rtc-agent/server/internal/infra/auth"
    "github.com/stretchr/testify/require"
)

// BenchmarkEnforce_LightLoad 轻量级负载：10条策略，5个用户
func BenchmarkEnforce_LightLoad(b *testing.B) {
    db := setupBenchDB(b)
    enforcer, err := auth.NewAdminCasbinEnforcer(db)
    require.NoError(b, err)
    
    // 添加 10 条策略（3个角色，每个角色3-4条权限）
    setupPolicies(enforcer, 3, 3)  // 3 roles × 3 permissions = 9 policies
    setupUsers(enforcer, 5)         // 5 users
    
    b.ResetTimer()
    b.ReportAllocs()
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            enforcer.Enforce("user-0", "resource-0", "read")
        }
    })
    // 目标：200,000+ ops/sec，P99 < 5μs
}

// BenchmarkEnforce_MediumLoad 中等负载：100条策略，50个用户
func BenchmarkEnforce_MediumLoad(b *testing.B) {
    db := setupBenchDB(b)
    enforcer, err := auth.NewAdminCasbinEnforcer(db)
    require.NoError(b, err)
    
    // 添加 100 条策略（10个角色，每个角色10条权限）
    setupPolicies(enforcer, 10, 10)  // 10 roles × 10 permissions = 100 policies
    setupUsers(enforcer, 50)          // 50 users
    
    b.ResetTimer()
    b.ReportAllocs()
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            enforcer.Enforce("user-25", "resource-5", "read")
        }
    })
    // 目标：100,000+ ops/sec，P99 < 10μs
}

// BenchmarkEnforce_HeavyLoad 大规模负载：1000条策略，500个用户
func BenchmarkEnforce_HeavyLoad(b *testing.B) {
    db := setupBenchDB(b)
    enforcer, err := auth.NewAdminCasbinEnforcer(db)
    require.NoError(b, err)
    
    // 添加 1000 条策略（100个角色，每个角色10条权限）
    setupPolicies(enforcer, 100, 10)  // 100 roles × 10 permissions = 1000 policies
    setupUsers(enforcer, 500)          // 500 users
    
    b.ResetTimer()
    b.ReportAllocs()
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            enforcer.Enforce("user-250", "resource-5", "read")
        }
    })
    // 目标：50,000+ ops/sec，P99 < 20μs
}

// BenchmarkEnforce_Denied 权限拒绝场景（需要遍历所有策略）
func BenchmarkEnforce_Denied(b *testing.B) {
    db := setupBenchDB(b)
    enforcer, err := auth.NewAdminCasbinEnforcer(db)
    require.NoError(b, err)
    
    setupPolicies(enforcer, 10, 10)
    setupUsers(enforcer, 50)
    
    b.ResetTimer()
    b.ReportAllocs()
    for i := 0; i < b.N; i++ {
        // 查询不存在的权限（需要遍历所有策略才能确定拒绝）
        enforcer.Enforce("user-999", "resource-999", "delete")
    }
    // 预期：拒绝场景比允许场景慢 2-3 倍
}

// BenchmarkLoadPolicy 从数据库加载策略的性能
func BenchmarkLoadPolicy(b *testing.B) {
    db := setupBenchDB(b)
    enforcer, err := auth.NewAdminCasbinEnforcer(db)
    require.NoError(b, err)
    
    // 预填充 1000 条策略
    setupPolicies(enforcer, 100, 10)
    enforcer.SavePolicy()
    
    // 创建新的 Enforcer（模拟重启）
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        newEnforcer, _ := auth.NewAdminCasbinEnforcer(db)
        newEnforcer.LoadPolicy()  // 从数据库加载策略
    }
    // 目标：1000 条策略加载时间 < 100ms
}

// setupPolicies 创建测试角色和权限策略
func setupPolicies(enforcer *casbin.Enforcer, roleCount, permPerRole int) {
    for i := 0; i < roleCount; i++ {
        roleID := fmt.Sprintf("role-%d", i)
        for j := 0; j < permPerRole; j++ {
            resource := fmt.Sprintf("resource-%d", j)
            enforcer.AddPolicy(roleID, resource, "read")
        }
    }
}

// setupUsers 创建测试用户和角色分配
func setupUsers(enforcer *casbin.Enforcer, userCount int) {
    roleCount := enforcer.GetRoles()
    for i := 0; i < userCount; i++ {
        userID := fmt.Sprintf("user-%d", i)
        roleID := fmt.Sprintf("role-%d", i%len(roleCount))
        enforcer.AddGroupingPolicy(userID, roleID)
    }
}
```

**预期结果与阈值**：

| 测试项 | 预期结果 | 告警阈值 | 说明 |
| --- | --- | --- | --- |
| `BenchmarkEnforce_LightLoad` | 200,000 ops/sec | < 150,000 | 内存操作，极快 |
| `BenchmarkEnforce_MediumLoad` | 100,000 ops/sec | < 80,000 | 策略量增加，影响小 |
| `BenchmarkEnforce_HeavyLoad` | 50,000 ops/sec | < 40,000 | 1000 条策略仍可接受 |
| `BenchmarkEnforce_Denied` | 30,000 ops/sec | < 20,000 | 拒绝场景需遍历所有策略 |
| `BenchmarkLoadPolicy` | 100ms/1000条 | > 200ms | 数据库查询是瓶颈 |

**性能优化建议**：

1. **策略量控制**：单个角色权限不超过 50 条，总策略量不超过 5000 条
2. **角色继承深度**：RBAC 继承层级不超过 3 层（`g = _, _`）
3. **批量操作**：使用 `AddPolicies` / `AddGroupingPolicies` 批量添加，而非逐条 `AddPolicy`
4. **缓存预热**：服务启动时调用 `enforcer.LoadPolicy()`，避免首次请求延迟

### 13.3 批量操作优化

**问题**：批量分配角色时，逐条插入性能差。

**方案**：使用 GORM 的批量插入

```go
// server/internal/repo/user_role_repo.go

func (r *userRoleRepo) BatchCreate(ctx context.Context, userRoles []*model.UserRole) error {
    // 批量插入（每批 100 条）
    return DBFromContext(ctx, r.db).WithContext(ctx).
        CreateInBatches(userRoles, 100).Error
}

// server/internal/usecase/user_role.go

func (uc *UserRoleUsecase) AssignRoles(ctx context.Context, userID uuid.UUID, roleIDs []uuid.UUID) error {
    // 1. 构建 user_role 列表
    userRoles := make([]*model.UserRole, 0, len(roleIDs))
    for _, roleID := range roleIDs {
        userRoles = append(userRoles, &model.UserRole{
            UserID: userID,
            RoleID: roleID,
        })
    }
    
    // 2. 批量插入
    if err := uc.userRoleRepo.BatchCreate(ctx, userRoles); err != nil {
        return fmt.Errorf("batch create user_roles: %w", err)
    }
    
    // 3. 批量更新 Casbin 策略
    groupingPolicies := make([][]string, 0, len(roleIDs))
    for _, roleID := range roleIDs {
        groupingPolicies = append(groupingPolicies, []string{userID.String(), roleID.String()})
    }
    _, err := uc.enforcer.AddGroupingPolicies(groupingPolicies)
    if err != nil {
        return fmt.Errorf("add grouping policies: %w", err)
    }
    
    return nil
}
```

### 13.4 权限查询优化

**问题**：`/api/auth/me` 需要查询用户角色和权限，可能涉及多次数据库查询。

**方案**：使用 JOIN 查询一次性获取

```go
// server/internal/repo/user_role_repo.go

func (r *userRoleRepo) GetUserWithRolesAndPermissions(ctx context.Context, userID uuid.UUID) (*UserWithPerms, error) {
    var result UserWithPerms
    
    // 1. 查询用户信息
    err := DBFromContext(ctx, r.db).WithContext(ctx).
        Table("users").
        Where("id = ?", userID).
        First(&result.User).Error
    if err != nil {
        return nil, err
    }
    
    // 2. 查询用户角色（JOIN）
    err = DBFromContext(ctx, r.db).WithContext(ctx).
        Table("roles").
        Joins("INNER JOIN user_roles ON user_roles.role_id = roles.id").
        Where("user_roles.user_id = ? AND roles.is_enabled = ?", userID, true).
        Find(&result.Roles).Error
    if err != nil {
        return nil, err
    }
    
    // 3. 查询角色权限（从 casbin_rule 表）
    roleIDs := make([]string, 0, len(result.Roles))
    for _, role := range result.Roles {
        roleIDs = append(roleIDs, role.ID.String())
    }
    
    err = DBFromContext(ctx, r.db).WithContext(ctx).
        Table("casbin_rule").
        Where("ptype = ? AND v0 IN ?", "p", roleIDs).
        Find(&result.Permissions).Error
    if err != nil {
        return nil, err
    }
    
    return &result, nil
}
```

#### 13.4.1 数据库查询性能基准

> **目标**：确保权限相关数据库查询在合理时间内完成，识别慢查询并优化。

**测试场景**：

| 查询场景 | 数据量 | 目标延迟 P95 | 优化手段 |
| --- | --- | --- | --- |
| 查询用户角色列表 | 1000 用户 × 平均 2 角色 | < 50ms | 索引 `user_roles(user_id)` |
| 查询角色权限列表 | 100 角色 × 平均 20 权限 | < 100ms | 索引 `casbin_rule(v0, ptype)` |
| 查询用户完整权限 | JOIN users + user_roles + roles + casbin_rule | < 200ms | 复合索引 + 查询缓存 |
| 批量插入用户角色 | 1000 条 user_roles | < 500ms | `CreateInBatches` 批量插入 |
| 分页查询角色列表 | 1000 角色，分页 20 条 | < 100ms | 索引 + 分页优化 |

**基准测试代码**：

```go
// server/internal/integration/performance_test.go

func BenchmarkGetUserRoles(b *testing.B) {
    db := setupBenchDB(b)
    repo := repo.NewUserRoleRepo(db)
    
    // 准备测试数据：1000 个用户，每个用户 2 个角色
    setupTestData(db, 1000, 2)
    
    userID := generateTestUserID(500)  // 查询中间的用户
    
    b.ResetTimer()
    b.ReportAllocs()
    for i := 0; i < b.N; i++ {
        roles, err := repo.GetUserRoles(context.Background(), userID)
        require.NoError(b, err)
        require.Len(b, roles, 2)
    }
    // 目标：P95 < 50ms
}

func BenchmarkGetUserWithPermissions(b *testing.B) {
    db := setupBenchDB(b)
    repo := repo.NewUserRoleRepo(db)
    
    // 准备测试数据
    setupTestData(db, 1000, 2)
    
    userID := generateTestUserID(500)
    
    b.ResetTimer()
    b.ReportAllocs()
    for i := 0; i < b.N; i++ {
        user, err := repo.GetUserWithRolesAndPermissions(context.Background(), userID)
        require.NoError(b, err)
        require.NotNil(b, user)
        require.Greater(b, len(user.Roles), 0)
        require.Greater(b, len(user.Permissions), 0)
    }
    // 目标：P95 < 200ms
}

func BenchmarkBatchCreateUserRoles(b *testing.B) {
    db := setupBenchDB(b)
    repo := repo.NewUserRoleRepo(db)
    
    // 准备 1000 条 user_role 记录
    userRoles := generateTestUserRoles(1000)
    
    b.ResetTimer()
    b.ReportAllocs()
    err := repo.BatchCreate(context.Background(), userRoles)
    require.NoError(b, err)
    // 目标：< 500ms
}

func BenchmarkListRolesWithPagination(b *testing.B) {
    db := setupBenchDB(b)
    repo := repo.NewRoleRepo(db)
    
    // 准备 1000 个角色
    setupTestRoles(db, 1000)
    
    b.ResetTimer()
    b.ReportAllocs()
    for i := 0; i < b.N; i++ {
        roles, total, err := repo.List(context.Background(), ListRoleOptions{
            Page:     1,
            PageSize: 20,
        })
        require.NoError(b, err)
        require.Len(b, roles, 20)
        require.Equal(b, int64(1000), total)
    }
    // 目标：P95 < 100ms
}
```

**慢查询监控**：

```go
// server/internal/infra/middleware/slow_query.go

// SlowQueryLogger GORM 插件：记录慢查询
type SlowQueryLogger struct {
    logger.NewGormLogger
    threshold time.Duration  // 慢查询阈值（默认 200ms）
}

func (l *SlowQueryLogger) Trace(ctx context.Context, begin time.Time, fc func() (sql string, rows int64), err error) {
    duration := time.Since(begin)
    sql, rows := fc()
    
    if duration > l.threshold {
        logger.Warn(ctx, "slow_query_detected",
            zap.Duration("duration", duration),
            zap.String("sql", sql),
            zap.Int64("rows", rows),
        )
        
        // Prometheus 指标
        slowQueryCounter.Inc()
        slowQueryDuration.Observe(duration.Seconds())
    }
    
    // 调用父类方法（继续原有逻辑）
    l.GormLogger.Trace(ctx, begin, fc, err)
}
```

**慢查询告警阈值**：

| 查询类型 | 慢查询阈值 | 告警级别 | 说明 |
| --- | --- | --- | --- |
| 单表查询 | > 100ms | Warning | 检查索引 |
| JOIN 查询 | > 200ms | Warning | 检查 JOIN 条件 |
| 批量插入 | > 500ms | Info | 检查批量大小 |
| 复杂查询 | > 1s | Critical | 必须优化 |

### 13.5 前端权限缓存

**问题**：每次渲染都计算权限，性能浪费。

**方案**：在 `getInitialState` 中缓存权限集合（Set 结构）

> 完整的 `getInitialState` 函数定义参见 7.2 节。本节仅强调性能要点：
>
> - `permissions` 字段使用 `Set<string>` 结构（而非数组），查询复杂度 O(1)
> - `Set` 的构建在 `getInitialState` 中完成（应用启动时），后续 `access.ts` 的 `has()` 调用直接查 Set
> - `roles` 字段使用 `string[]`（角色名列表），用于 `includes()` 判断
>
> 这两个集合在每次 `getInitialState()` 执行时重新构建（应用启动、页面刷新、Token 刷新后），确保权限数据始终与后端同步。

---

## 14. 监控与日志

### 14.1 审计日志

**参考现有代码**：[`server/internal/usecase/admin_auth.go`](../server/internal/usecase/admin_auth.go) — 已使用结构化日志（zap）记录认证事件。

#### 14.1.1 审计事件分类

**认证类事件**（已在现有代码中实现）：

| 事件 | 描述 | 日志级别 | 关键日志字段 |
| --- | --- | --- | --- |
| `admin_auth.login_succeeded` | 登录成功 | INFO | `email`, `user_id`, `ip` |
| `admin_auth.login_failed` | 登录失败 | WARN | `email`, `ip`, `reason` |
| `admin_auth.login_rate_limited` | 登录频率限制 | WARN | `ip`, `email` |
| `admin_auth.token_refreshed` | Token 刷新 | INFO | `user_id` |
| `admin_auth.logout` | 登出 | INFO | `user_id` |
| `admin_auth.oauth_user_created` | OAuth2 用户创建 | INFO | `provider`, `email`, `user_id` |
| `admin_auth.refresh_token_reuse_detected` | Refresh token 重用检测 | WARN | `token_hash_prefix` |

**权限管理类事件**（新增）：

| 事件 | 描述 | 日志级别 | 关键日志字段 |
| --- | --- | --- | --- |
| `role.created` | 创建角色 | INFO | `role_id`, `role_name`, `operator_id`, `operator_ip` |
| `role.updated` | 更新角色 | INFO | `role_id`, `changed_fields[]`, `operator_id` |
| `role.deleted` | 删除角色 | WARN | `role_id`, `role_name`, `operator_id`, `affected_users[]` |
| `user_role.assigned` | 分配角色 | INFO | `user_id`, `role_id`, `role_name`, `operator_id` |
| `user_role.removed` | 移除角色 | WARN | `user_id`, `role_id`, `role_name`, `operator_id` |
| `permission.created` | 创建权限策略 | INFO | `role_id`, `resource`, `action`, `operator_id` |
| `permission.deleted` | 删除权限策略 | WARN | `role_id`, `resource`, `action`, `operator_id` |
| `user.disabled` | 禁用用户 | WARN | `user_id`, `operator_id`, `reason` |
| `user.enabled` | 恢复用户 | INFO | `user_id`, `operator_id` |

**安全类事件**（新增）：

| 事件 | 描述 | 日志级别 | 关键日志字段 |
| --- | --- | --- | --- |
| `security.forbidden_access` | 权限拒绝 | WARN | `user_id`, `resource`, `action`, `ip` |
| `security.suspicious_login` | 可疑登录（异常 IP/设备） | WARN | `user_id`, `ip`, `user_agent`, `reason` |
| `security.bulk_role_changes` | 批量角色变更（>5 用户） | WARN | `operator_id`, `affected_count`, `role_id` |

#### 14.1.2 审计日志格式规范

遵循项目现有日志格式（参见 [`server/pkg/logger/`](../server/pkg/logger/)）：

```go
// 正确的日志格式 — 遵循项目的 dot-separated hierarchy 命名
logger.Info(ctx, "role.created",
    zap.String("role_id", role.ID.String()),
    zap.String("role_name", role.Name),
    zap.String("operator_id", operatorID.String()),
    zap.String("operator_ip", c.ClientIP()),
    zap.String("trace_id", traceID),  // 自动注入，见 logger 包
)

// ❌ 错误格式：不使用 message 字符串，用结构化字段
logger.Info(ctx, "created role admin", ...)  // 错误
logger.Info(ctx, "Role created successfully", ...)  // 错误
```

**日志字段命名约定**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `operator_id` | string (UUID) | 操作者的用户 ID |
| `operator_ip` | string | 操作者 IP 地址 |
| `user_id` | string (UUID) | 被操作的用户 ID |
| `role_id` | string (UUID) | 角色 ID |
| `role_name` | string | 角色名称（便于人类阅读） |
| `resource` | string | Casbin 资源名 |
| `action` | string | Casbin 动作名 |
| `changed_fields[]` | []string | 变更的字段名列表 |
| `affected_users[]` | []string | 受影响的用户 ID 列表 |
| `trace_id` | string | OpenTelemetry 追踪 ID（logger 自动注入） |

#### 14.1.3 审计日志查询 API

对于需要在前端展示审计日志的场景（如"谁在什么时候修改了我的权限"），需要提供查询 API。

**方案选择**：

| 方案 | 优点 | 缺点 | 推荐度 |
| --- | --- | --- | --- |
| A. 直接查询日志文件（Loki） | 无需额外表 | 查询能力受限，格式不友好 | 不推荐 |
| B. 数据库审计表 | 查询灵活，可关联业务数据 | 增加写压力 | 推荐用于关键操作 |
| C. 独立审计数据库 | 不影响业务库 | 架构复杂 | 未来扩展 |

**MVP 阶段使用方案 B — 关键操作写入审计表**：

```sql
-- audit_logs 表（新增）
-- 注意：id 由 GORM BeforeCreate 钩子生成 UUID v7（与项目其他模型一致），
-- 不使用 gen_random_uuid()，确保与 GORM 模型定义保持统一。
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,                 -- GORM BeforeCreate 生成 UUID v7
    event_type VARCHAR(100) NOT NULL,    -- 如 "role.created", "user_role.assigned"
    operator_id UUID,                    -- 操作者 ID（可为 NULL 表示系统操作）
    operator_ip VARCHAR(45),             -- IPv4/IPv6
    target_type VARCHAR(50),             -- 操作对象类型："user", "role", "permission"
    target_id VARCHAR(100),              -- 操作对象 ID
    details JSONB DEFAULT '{}',          -- 变更详情（灵活存储）
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 按事件类型和时间查询的索引
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_operator_id ON audit_logs(operator_id);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);

-- 分区策略：按月分区，便于归档
-- （实际部署时可使用 PostgreSQL 原生分区）
```

**审计日志 API**：

```text
GET /api/audit-logs                    # 查询审计日志列表（支持过滤）
GET /api/audit-logs/:id                # 查询单条审计日志详情
```

**查询参数**：

```text
GET /api/audit-logs?event_type=role.*&operator_id=xxx&target_id=yyy&from=2026-10-01&to=2026-10-05&page=1&page_size=20
```

**响应格式**：

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "event_type": "user_role.assigned",
        "operator_id": "uuid",
        "operator_name": "管理员",
        "operator_ip": "192.168.1.1",
        "target_type": "user",
        "target_id": "uuid",
        "target_name": "user@example.com",
        "details": {
          "role_id": "uuid",
          "role_name": "admin"
        },
        "created_at": "2026-10-05T08:00:00Z"
      }
    ],
    "total": 42,
    "page": 1,
    "page_size": 20
  }
}
```

**写入伪代码**：

```go
// server/internal/usecase/audit.go（新增）

type AuditLogger struct {
    db *gorm.DB
}

func (a *AuditLogger) Log(ctx context.Context, event AuditEvent) error {
    log := &AuditLog{
        ID:         uuid.Must(uuid.NewV7()),
        EventType:  event.Type,
        OperatorID: event.OperatorID,
        OperatorIP: event.OperatorIP,
        TargetType: event.TargetType,
        TargetID:   event.TargetID,
        Details:    event.Details,  // JSONB
        CreatedAt:  time.Now(),
    }
    return a.db.WithContext(ctx).Create(log).Error
}

// 在 RoleUsecase 中调用
func (uc *RoleUsecase) CreateRole(ctx context.Context, req *CreateRoleRequest, operatorID uuid.UUID, operatorIP string) (*model.Role, error) {
    role, err := uc.roleRepo.Create(ctx, ...)
    if err != nil { return nil, err }

    // 写入审计日志
    uc.auditLogger.Log(ctx, AuditEvent{
        Type:       "role.created",
        OperatorID: operatorID,
        OperatorIP: operatorIP,
        TargetType: "role",
        TargetID:   role.ID.String(),
        Details: map[string]interface{}{
            "role_name":  role.Name,
            "display_name": role.DisplayName,
        },
    })

    return role, nil
}
```

#### 14.1.4 审计日志归档策略

**保留期限**：

| 日志级别 | 在线保留 | 归档保留 | 归档存储 |
| --- | --- | --- | --- |
| INFO（正常操作） | 90 天 | 1 年 | 压缩文件（gzip） |
| WARN（安全事件） | 180 天 | 3 年 | 压缩文件 |
| ERROR（系统错误） | 90 天 | 1 年 | 压缩文件 |

**归档流程**：

```mermaid
sequenceDiagram
    participant CRON as 定时任务（每日）
    participant DB as PostgreSQL
    participant S3 as 对象存储（MinIO/S3）

    CRON->>DB: 查询超过 90 天的 INFO 日志
    DB-->>CRON: 返回日志数据（JSON 格式）
    CRON->>CRON: 压缩为 gzip
    CRON->>S3: 上传到 audit-logs/2026/10/05.json.gz
    CRON->>DB: 删除已归档的日志记录
    Note over CRON: WARN 级别日志保留 180 天后归档
```

**实现方式**：

- 开发环境：不归档，定期清理
- 生产环境：通过 cron job 执行归档脚本
- 归档脚本：`server/cmd/admin/archive_audit_logs.go`（新增 CLI 命令）

```bash
# 手动执行归档
./rtc-agent admin archive-audit-logs --before=2026-07-05 --level=INFO
```

### 14.2 Prometheus 指标

**关键指标**：

```go
// server/internal/infra/metrics/admin.go

import "github.com/prometheus/client_golang/prometheus"

var (
    // 登录请求计数
    loginRequests = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "admin_login_requests_total",
            Help: "Total number of login requests",
        },
        []string{"status"},  // success, failed, rate_limited
    )
    
    // 权限检查延迟
    permissionCheckDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "admin_permission_check_duration_seconds",
            Help:    "Duration of permission check",
            Buckets: prometheus.DefBuckets,
        },
        []string{"resource", "action"},
    )
    
    // 角色管理操作计数
    roleOperations = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "admin_role_operations_total",
            Help: "Total number of role operations",
        },
        []string{"operation"},  // create, update, delete
    )
    
    // 活跃会话数
    activeSessions = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "admin_active_sessions",
            Help: "Number of active admin sessions",
        },
    )
)

func init() {
    prometheus.MustRegister(loginRequests, permissionCheckDuration, roleOperations, activeSessions)
}
```

**集成到代码**：

```go
// server/internal/usecase/admin_auth.go

func (uc *AdminAuthUsecase) Login(ctx context.Context, ip, email, password string) (*LoginResult, error) {
    // ... 登录逻辑
    
    if err != nil {
        metrics.LoginRequests.WithLabelValues("failed").Inc()
        return nil, err
    }
    
    metrics.LoginRequests.WithLabelValues("success").Inc()
    return result, nil
}

// server/internal/handler/http/casbin_middleware.go（新增）
//
// 注意：Casbin 中间件放在 handler/http/ 而非 infra/middleware/，
// 因为它需要使用同包的 Error() 响应函数（admin-server 统一响应格式）。
// 这与 JWTAuthMiddleware 放在 admin_auth.go 中的约定一致。

// routeResourceMap maps Gin route patterns to Casbin resource names.
// This mapping bridges the gap between HTTP routes (e.g. /api/roles/:id)
// and abstract Casbin resources (e.g. "role").
var routeResourceMap = map[string]string{
    "/api/roles":       "role",
    "/api/roles/:id":   "role",
    "/api/roles/:id/users": "role",
    "/api/permissions": "permission",
    "/api/users/:id/roles": "user",
    "/api/audit-logs":  "audit_log",      // 审计日志只读查询（参见 14.1.3）
    "/api/audit-logs/:id": "audit_log",
}

// methodActionMap maps HTTP methods to Casbin action names.
var methodActionMap = map[string]string{
    "GET":    "read",
    "POST":   "write",
    "PUT":    "write",
    "DELETE": "delete",
}

func CasbinMiddleware(enforcer *casbin.Enforcer) gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        
        userID := c.GetString("user_id")
        
        // Map Gin route pattern -> Casbin resource
        resource, ok := routeResourceMap[c.FullPath()]
        if !ok {
            // No mapping found -- skip permission check (allow by default)
            // This handles public routes and routes not yet mapped
            c.Next()
            return
        }
        
        // Map HTTP method -> Casbin action
        action, ok := methodActionMap[c.Request.Method]
        if !ok {
            Error(c, http.StatusBadRequest, "forbidden", "不支持的 HTTP 方法")
            c.Abort()
            return
        }
        
        allowed, err := enforcer.Enforce(userID, resource, action)
        
        duration := time.Since(start).Seconds()
        metrics.PermissionCheckDuration.WithLabelValues(resource, action).Observe(duration)
        
        if err != nil {
            // Casbin 内部错误 — 默认拒绝（fail-close）
            logger.Error(c.Request.Context(), "casbin.enforce_failed", zap.Error(err))
            Error(c, http.StatusInternalServerError, "internal_error", "权限检查失败")
            c.Abort()
            return
        }
        
        if !allowed {
            logger.Info(c.Request.Context(), "casbin.access_denied",
                zap.String("user_id", userID),
                zap.String("resource", resource),
                zap.String("action", action))
            Error(c, http.StatusForbidden, "forbidden", "权限不足")
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

> **安全警告 — allow-by-default 行为**：当路由未出现在 `routeResourceMap` 中时，中间件跳过权限检查（`c.Next()`）。这是有意设计（公共路由如 `/health`、`/api/auth/login` 不需要权限检查），但**新增的管理 API 路由必须在 `routeResourceMap` 中注册**，否则会默认放行。
>
> **缓解措施**：
>
> 1. **代码审查清单**（参见 [18.8.3](#1883-人工审查清单)）：每个新增路由必须确认是否在 `routeResourceMap` 中注册
> 2. **单元测试**：验证所有受保护路由都在 `routeResourceMap` 中有对应映射
> 3. **启动时日志**：admin-server 启动时输出 `routeResourceMap` 的全部映射项，便于人工检查
> 4. **未来改进方向**：可考虑反转策略（默认拒绝 + 显式白名单放行公共路由），但 MVP 阶段保持当前方案以减少开发阻力

**Grafana 仪表盘**：

- 登录成功率
- 权限检查延迟（P50/P95/P99）
- 活跃会话数
- 角色管理操作频率

### 14.3 告警规则

**Prometheus AlertManager 配置**：

```yaml
# etc/dev/prometheus/alerts.yml

groups:
  - name: admin-server
    rules:
      # 登录失败率过高
      - alert: HighLoginFailureRate
        expr: rate(admin_login_requests_total{status="failed"}[5m]) > 0.2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High login failure rate"
          description: "Login failure rate is {{ $value }} per second"
      
      # 权限检查延迟过高
      - alert: HighPermissionCheckLatency
        expr: histogram_quantile(0.95, rate(admin_permission_check_duration_seconds_bucket[5m])) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High permission check latency"
          description: "P95 permission check latency is {{ $value }}s"
      
      # 活跃会话数异常
      - alert: UnusualActiveSessions
        expr: admin_active_sessions > 100
        for: 10m
        labels:
          severity: info
        annotations:
          summary: "Unusual number of active sessions"
          description: "{{ $value }} active sessions"
```

### 14.4 权限调试与排查工具

> **目标**：提供一套调试和排查工具，帮助开发和运维人员快速诊断权限问题。

#### 14.4.1 CLI 调试命令

**新增 CLI 命令**：

```bash
# 1. 查询用户的权限
./rtc-agent admin debug user-permissions \
    --user-id=<uuid> \
    --format=table  # 或 json

# 输出示例：
# User: admin@example.com (ID: 01912345-...)
# Roles: admin, operator
# Permissions:
#   - user:read (via admin)
#   - user:write (via admin)
#   - user:delete (via admin)
#   - role:read (via admin)
#   - role:write (via admin)

# 2. 查询角色的权限
./rtc-agent admin debug role-permissions \
    --role-name=admin

# 输出示例：
# Role: admin (ID: 01912345-...)
# Permissions (7):
#   - user:read
#   - user:write
#   - user:delete
#   - role:read
#   - role:write
#   - permission:read
#   - permission:write
# Users with this role (3):
#   - admin@example.com
#   - operator@example.com
#   - test@example.com

# 3. 检查特定权限
./rtc-agent admin debug check-permission \
    --user-id=<uuid> \
    --resource=user \
    --action=write

# 输出示例：
# Permission check:
#   User: admin@example.com
#   Resource: user
#   Action: write
#   Result: ALLOWED
#   Reason: Role "admin" has permission "user:write"

# 4. 列出所有 Casbin 策略
./rtc-agent admin debug list-policies \
    --type=p  # 或 g（角色继承）

# 5. 重建 Casbin 策略（从 roles/user_roles 表推导）
./rtc-agent admin debug rebuild-policies \
    --dry-run  # 先预览，不实际执行
    --force    # 确认后执行

# 6. 诊断常见问题
./rtc-agent admin debug diagnose \
    --user-id=<uuid>  # 可选，诊断特定用户

# 输出示例：
# Diagnostics:
#   ✓ User exists and is active
#   ✓ User has 2 roles assigned
#   ✓ Casbin policies loaded (15 total)
#   ✓ User has grouping policies in Casbin
#   ✓ All assigned roles exist and are enabled
#   ⚠ Warning: User has role "test-role" which has no permissions
```

**CLI 实现伪代码**：

```go
// server/cmd/admin/debug.go（新增）

var debugCmd = &cobra.Command{
    Use:   "debug",
    Short: "Permission system debugging tools",
}

var debugUserPermissionsCmd = &cobra.Command{
    Use:   "user-permissions",
    Short: "List all permissions for a user",
    Run: func(cmd *cobra.Command, args []string) {
        // 初始化数据库和 Enforcer
        db := initDB()
        enforcer := initCasbinEnforcer(db)
        
        userID := cmd.Flag("user-id").Value.String()
        
        // 1. 查询用户信息
        var user model.User
        db.Where("id = ?", userID).First(&user)
        fmt.Printf("User: %s (ID: %s)\n", user.Email, user.ID)
        
        // 2. 查询用户角色
        var roles []model.Role
        db.Joins("INNER JOIN user_roles ON user_roles.role_id = roles.id").
            Where("user_roles.user_id = ?", userID).
            Find(&roles)
        fmt.Printf("Roles: %s\n", roleNames(roles))
        
        // 3. 查询用户权限（通过 Casbin）
        permissions := enforcer.GetPermissionsForUser(userID)
        fmt.Printf("Permissions (%d):\n", len(permissions))
        for _, perm := range permissions {
            // perm = [roleID, resource, action]
            roleName := findRoleName(roles, perm[0])
            fmt.Printf("  - %s:%s (via %s)\n", perm[1], perm[2], roleName)
        }
    },
}

var debugCheckPermissionCmd = &cobra.Command{
    Use:   "check-permission",
    Short: "Check if a user has a specific permission",
    Run: func(cmd *cobra.Command, args []string) {
        db := initDB()
        enforcer := initCasbinEnforcer(db)
        
        userID := cmd.Flag("user-id").Value.String()
        resource := cmd.Flag("resource").Value.String()
        action := cmd.Flag("action").Value.String()
        
        // 执行权限检查
        allowed, reason := checkPermissionDetailed(enforcer, userID, resource, action)
        
        fmt.Printf("Permission check:\n")
        fmt.Printf("  User: %s\n", getUserEmail(db, userID))
        fmt.Printf("  Resource: %s\n", resource)
        fmt.Printf("  Action: %s\n", action)
        fmt.Printf("  Result: %s\n", boolToAllowed(allowed))
        fmt.Printf("  Reason: %s\n", reason)
    },
}

// checkPermissionDetailed 返回详细的权限检查结果和原因
func checkPermissionDetailed(enforcer *casbin.Enforcer, userID, resource, action string) (bool, string) {
    // 1. 检查用户是否有直接权限
    allowed, _ := enforcer.Enforce(userID, resource, action)
    if allowed {
        // 找出是通过哪个角色获得的权限
        roles := enforcer.GetRolesForUser(userID)
        for _, role := range roles {
            if enforcer.HasPolicy(role, resource, action) {
                return true, fmt.Sprintf("Role %q has permission %q", role, resource+":"+action)
            }
        }
        return true, "Direct permission grant"
    }
    
    // 2. 检查用户是否有任何角色
    roles := enforcer.GetRolesForUser(userID)
    if len(roles) == 0 {
        return false, "User has no roles assigned"
    }
    
    // 3. 检查角色是否有相关权限
    for _, role := range roles {
        rolePerms := enforcer.GetPermissionsForUser(role)
        for _, perm := range rolePerms {
            if perm[1] == resource {
                return false, fmt.Sprintf("Role %q has permissions for %q, but not action %q", 
                    role, resource, action)
            }
        }
    }
    
    return false, fmt.Sprintf("No role has permission for resource %q", resource)
}
```

#### 14.4.2 调试 API 端点

**新增调试 API**（仅开发环境或管理员可访问）：

> **注意**：`Success()` 和 `Error()` 是同包内的包级函数（参见 [`response.go`](../server/internal/handler/http/response.go)），无需通过包名前缀调用。错误消息不应泄露内部结构字段名（参见 `sanitizeBindingError()` 约定，[2.2](#22-关键发现与约束)）。

```go
// server/internal/handler/http/debug.go（新增）

// DebugHandler 提供权限调试 API
type DebugHandler struct {
    db       *gorm.DB
    enforcer *casbin.Enforcer
}

// NewDebugHandler creates a new DebugHandler.
func NewDebugHandler(db *gorm.DB, enforcer *casbin.Enforcer) *DebugHandler {
    return &DebugHandler{db: db, enforcer: enforcer}
}

// RegisterRoutes 注册调试 API 路由（挂载到 /api 下）
// jwtAuth 由调用方传入（来自 AdminAuthHandler.JWTAuthMiddleware()）
func (h *DebugHandler) RegisterRoutes(r *gin.Engine, jwtAuth gin.HandlerFunc) {
    debug := r.Group("/api/debug")
    debug.Use(jwtAuth)               // 需要认证
    // debug.Use(requireAdminRole()) // 可选：仅管理员可访问
    
    debug.GET("/user/:id/permissions", h.GetUserPermissions)
    debug.GET("/role/:id/permissions", h.GetRolePermissions)
    debug.POST("/check-permission", h.CheckPermission)
    debug.GET("/policies", h.ListPolicies)
    debug.POST("/rebuild-policies", h.RebuildPolicies)
}

// GetUserPermissions 查询用户的权限
// GET /api/debug/user/:id/permissions
func (h *DebugHandler) GetUserPermissions(c *gin.Context) {
    userID := c.Param("id")
    
    // 查询用户信息
    var user model.User
    if err := h.db.Where("id = ?", userID).First(&user).Error; err != nil {
        Error(c, http.StatusNotFound, "user_not_found", "用户不存在")
        return
    }
    
    // 查询用户角色
    var roles []model.Role
    h.db.Joins("INNER JOIN user_roles ON user_roles.role_id = roles.id").
        Where("user_roles.user_id = ?", userID).
        Find(&roles)
    
    // 查询用户权限（通过 Casbin）
    permissions := h.enforcer.GetPermissionsForUser(userID)
    
    // 构建响应
    response := map[string]interface{}{
        "user": map[string]interface{}{
            "id":    user.ID,
            "email": user.Email,
            "name":  user.Name,
        },
        "roles": roles,
        "permissions": permissions,
        "raw_casbin_policies": h.enforcer.GetImplicitPermissionsForUser(userID),
    }
    
    Success(c, response)
}

// CheckPermission 检查特定权限
// POST /api/debug/check-permission
func (h *DebugHandler) CheckPermission(c *gin.Context) {
    var req struct {
        UserID   string `json:"user_id" binding:"required"`
        Resource string `json:"resource" binding:"required"`
        Action   string `json:"action" binding:"required"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        Error(c, http.StatusBadRequest, "validation_error", sanitizeBindingError(err))
        return
    }
    
    // 执行权限检查
    allowed, err := h.enforcer.Enforce(req.UserID, req.Resource, req.Action)
    if err != nil {
        logger.Error(c.Request.Context(), "debug.check_permission_failed", zap.Error(err))
        Error(c, http.StatusInternalServerError, "internal_error", "权限检查失败")
        return
    }
    
    // 获取详细信息
    details := getPermissionCheckDetails(h.enforcer, req.UserID, req.Resource, req.Action)
    
    Success(c, map[string]interface{}{
        "allowed": allowed,
        "details": details,
    })
}
```

**调试 API 使用示例**：

```bash
# 查询用户的权限
curl -H "Authorization: Bearer $TOKEN" \
    http://localhost:28081/api/debug/user/$USER_ID/permissions

# 检查特定权限
curl -X POST -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"user_id":"xxx","resource":"user","action":"write"}' \
    http://localhost:28081/api/debug/check-permission

# 列出所有 Casbin 策略
curl -H "Authorization: Bearer $TOKEN" \
    http://localhost:28081/api/debug/policies?type=p
```

#### 14.4.3 常见权限问题诊断流程

```mermaid
flowchart TD
    A[用户报告权限问题] --> B{问题类型?}
    
    B -->|无法登录| C[检查用户状态]
    B -->|无法访问功能| D[检查权限分配]
    B -->|前端显示异常| E[检查权限缓存]
    
    C --> C1[用户是否存在?]
    C1 -->|否| C2[创建用户]
    C1 -->|是| C3{deleted_at 是否为空?}
    C3 -->|否| C4[用户已禁用<br/>恢复用户]
    C3 -->|是| C5[检查密码/OAuth2]
    
    D --> D1[调用 /api/debug/user/:id/permissions]
    D1 --> D2{用户有角色吗?}
    D2 -->|否| D3[分配角色给用户]
    D2 -->|是| D4{角色有权限吗?}
    D4 -->|否| D5[为角色添加权限]
    D4 -->|是| D6{Casbin 策略同步?}
    D6 -->|否| D7[执行 rebuild-policies]
    D6 -->|是| D8[检查 Casbin 中间件配置]
    
    E --> E1[清除浏览器 localStorage]
    E1 --> E2[重新登录]
    E2 --> E3[检查 /api/auth/me 返回]
    E3 --> E4{permissions 字段正确?}
    E4 -->|否| E5[检查后端 /api/auth/me 逻辑]
    E4 -->|是| E6[检查前端 access.ts 计算]
    
    style A fill:#f96,stroke:#333
    style C2 fill:#9f9,stroke:#333
    style C4 fill:#9f9,stroke:#333
    style D3 fill:#9f9,stroke:#333
    style D5 fill:#9f9,stroke:#333
    style D7 fill:#9f9,stroke:#333
```

**诊断检查清单**：

| 检查项 | 命令/API | 预期结果 | 故障排除 |
| --- | --- | --- | --- |
| 用户存在且激活 | `GET /api/debug/user/:id` | 用户信息，`deleted_at: null` | 恢复用户或创建新用户 |
| 用户有角色 | `GET /api/debug/user/:id/permissions` | `roles` 数组非空 | 分配角色给用户 |
| 角色有权限 | `GET /api/debug/role/:id/permissions` | `permissions` 数组非空 | 为角色添加权限策略 |
| Casbin 策略已加载 | `GET /api/debug/policies` | `p` 和 `g` 类型策略存在 | 重建策略 |
| 权限检查通过 | `POST /api/debug/check-permission` | `allowed: true` | 检查中间件配置 |
| 前端权限正确 | 浏览器 DevTools | `permissions` Set 非空 | 清除缓存重新登录 |

---

## 15. 灾难恢复

### 15.1 数据库备份策略

**备份内容**：

- `users` 表
- `roles` 表
- `user_roles` 表
- `casbin_rule` 表
- `admin_refresh_tokens` 表

**备份方案**：

1. **自动备份**（生产环境）：

   ```bash
   # 每日凌晨 2:00 备份
   0 2 * * * /usr/bin/pg_dump -U rtc_agent rtc_agent | gzip > /backup/rtc_agent_$(date +\%Y\%m\%d).sql.gz
   ```

2. **手动备份**（开发环境）：

   ```bash
   # 导出数据库
   docker-compose exec postgres pg_dump -U rtc_agent rtc_agent > backup.sql
   
   # 恢复数据库
   docker-compose exec -T postgres psql -U rtc_agent rtc_agent < backup.sql
   ```

3. **冷备份**：定期将备份文件复制到异地存储（S3、OSS）

### 15.2 权限数据恢复

**场景**：误删角色或权限策略，需要恢复。

**恢复流程**：

1. **从备份恢复整个数据库**：

   ```bash
   # 停止服务
   docker-compose stop admin-server
   
   # 恢复数据库
   docker-compose exec -T postgres psql -U rtc_agent rtc_agent < backup_20261005.sql
   
   # 重启服务
   docker-compose start admin-server
   ```

2. **从备份恢复特定表**：

   ```bash
   # 恢复 roles 表
   docker-compose exec -T postgres psql -U rtc_agent rtc_agent -c "\copy roles from 'roles_backup.csv' with CSV"
   ```

3. **重新初始化 Casbin 策略**：

   ```go
   // 如果 casbin_rule 表损坏，可以重新生成
   func RebuildCasbinPolicies(db *gorm.DB, enforcer *casbin.Enforcer) error {
       // 1. 清空 casbin_rule 表
       enforcer.ClearPolicy()
       
       // 2. 从 roles 和 user_roles 表重新生成策略
       var roles []model.Role
       db.Find(&roles)
       
       for _, role := range roles {
           // 从业务表重建 p 类型策略
           // ...
       }
       
       // 3. 重建 g 类型策略
       var userRoles []model.UserRole
       db.Find(&userRoles)
       
       for _, ur := range userRoles {
           enforcer.AddGroupingPolicy(ur.UserID.String(), ur.RoleID.String())
       }
       
       // 4. 保存策略到数据库
       enforcer.SavePolicy()
       
       return nil
   }
   ```

### 15.3 服务降级策略

**场景**：权限系统故障（如 Casbin Enforcer 初始化失败）。

**降级方案**：

1. **只读模式**：允许登录和查询，禁止修改

   ```go
   if casbinEnforcer == nil {
       logger.Warn(ctx, "casbin_enforcer_unavailable_readonly_mode")
       // 所有写操作返回 503 Service Unavailable
   }
   ```

2. **默认拒绝**：权限检查失败时，拒绝所有请求

   ```go
   allowed, err := enforcer.Enforce(userID, resource, action)
   if err != nil {
       logger.Error(ctx, "permission_check_failed", zap.Error(err))
       allowed = false  // 默认拒绝
   }
   ```

3. **缓存降级**：如果 Redis 不可用，使用本地内存缓存

   ```go
   if redisClient == nil {
       // 使用本地内存缓存（单实例）
       enforcer.LoadPolicy()
   }
   ```

---

## 16. 测试策略

> **设计原则**：权限系统是安全关键组件，测试必须覆盖正确性、安全性、边界情况和性能。采用三层测试金字塔：单元测试（底层）→ 集成测试（中层）→ E2E 测试（顶层）。

### 16.1 测试分层

```mermaid
graph TB
    subgraph "E2E 测试（顶层）"
        E1[登录→角色分配→权限生效]
        E2[动态菜单渲染]
        E3[按钮级权限控制]
    end
    
    subgraph "集成测试（中层）"
        I1[Casbin Enforcer 初始化]
        I2[API 权限中间件]
        I3[角色管理 CRUD]
        I4[用户-角色关联]
        I5[引导数据策略]
    end
    
    subgraph "单元测试（底层）"
        U1[密码强度校验]
        U2[access.ts 权限计算]
        U3[Role 模型验证]
        U4[Repo 错误处理]
        U5[Rate Limiter 逻辑]
    end
    
    E1 --> I2
    E2 --> I1
    E3 --> I2
    I2 --> U1
    I2 --> U4
    I3 --> U4
    I5 --> U3
```

### 16.2 单元测试

#### 16.2.1 后端单元测试

**关键文件与测试用例**：

| 测试对象 | 文件 | 关键用例 |
| --- | --- | --- |
| 密码校验 | `usecase/admin_auth_test.go` | 弱密码拒绝、长度不足、复杂度不够、OAuth2 用户跳过密码策略 |
| 角色模型 | `model/role_test.go` | UUID v7 生成、TableName、BeforeCreate |
| Repo 错误映射 | `repo/role_repo_test.go` | PostgreSQL 唯一性约束 → `ErrDuplicateName` |
| Casbin Enforcer | `infra/auth/casbin_test.go` | Enforce 匹配逻辑、策略增删、角色继承 |
| Rate Limiter | `infra/ratelimit/login_test.go` | IP 锁定、邮箱锁定、成功后重置 |

**示例单元测试**：

```go
// server/internal/usecase/admin_auth_test.go

func TestValidatePassword(t *testing.T) {
    tests := []struct {
        name    string
        pwd     string
        wantErr error
    }{
        {"strong password", "MyP@ssw0rd!", nil},
        {"too short", "Ab1!", ErrPasswordTooShort},
        {"too simple", "abcdefgh", ErrPasswordTooSimple},
        {"weak password", "password123", ErrPasswordTooWeak},
        {"no uppercase", "myp@ssw0rd", ErrPasswordTooSimple},
        {"no lowercase", "MYP@SSW0RD", ErrPasswordTooSimple},
        {"no digit", "MyP@ssword", ErrPasswordTooSimple},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidatePassword(tt.pwd)
            assert.ErrorIs(t, err, tt.wantErr)
        })
    }
}

func TestValidatePassword_OAuth2User(t *testing.T) {
    // OAuth2 用户不走密码策略（PasswordHash 为空）
    // 此测试验证密码策略不适用于空密码场景
    // 实际 OAuth2 用户不会调用 Login()，这里只验证逻辑边界
}
```

```go
// server/internal/infra/auth/casbin_test.go

func TestEnforce_RBAC(t *testing.T) {
    db := setupTestDB(t)
    enforcer, err := auth.NewAdminCasbinEnforcer(db)
    require.NoError(t, err)

    // 添加策略
    _, err = enforcer.AddPolicy("admin-role", "user", "read")
    require.NoError(t, err)
    _, err = enforcer.AddPolicy("admin-role", "user", "write")
    require.NoError(t, err)
    _, err = enforcer.AddPolicy("viewer-role", "user", "read")
    require.NoError(t, err)

    // 添加用户-角色关系
    _, err = enforcer.AddGroupingPolicy("user1", "admin-role")
    require.NoError(t, err)
    _, err = enforcer.AddGroupingPolicy("user2", "viewer-role")
    require.NoError(t, err)

    // 测试权限检查
    allowed, _ := enforcer.Enforce("user1", "user", "read")
    assert.True(t, allowed, "admin should be able to read users")

    allowed, _ = enforcer.Enforce("user1", "user", "write")
    assert.True(t, allowed, "admin should be able to write users")

    allowed, _ = enforcer.Enforce("user2", "user", "read")
    assert.True(t, allowed, "viewer should be able to read users")

    allowed, _ = enforcer.Enforce("user2", "user", "write")
    assert.False(t, allowed, "viewer should NOT be able to write users")

    allowed, _ = enforcer.Enforce("user3", "user", "read")
    assert.False(t, allowed, "user without role should be denied")
}
```

#### 16.2.2 前端单元测试

**关键文件与测试用例**：

| 测试对象 | 文件 | 关键用例 |
| --- | --- | --- |
| access.ts | `src/access.test.ts` | 有权限/无权限/未登录 场景 |
| app.tsx | `src/app.test.tsx` | getInitialState 权限数据构建 |
| 权限组件 | `src/components/Access.test.tsx` | Access 组件显隐逻辑 |

```typescript
// web-components/packages/admin-ui/src/access.test.ts

import access from './access';

describe('access', () => {
  it('should grant admin permissions for admin user', () => {
    const result = access({
      currentUser: {
        access: 'admin',
        roles: ['admin'],
        permissions: new Set(['user:read', 'user:write', 'role:read', 'role:write']),
      },
    });
    expect(result.canAdmin).toBe(true);
    expect(result.canUserView).toBe(true);
    expect(result.canUserEdit).toBe(true);
    expect(result.canRoleView).toBe(true);
    expect(result.canRoleEdit).toBe(true);
  });

  it('should grant limited permissions for operator', () => {
    const result = access({
      currentUser: {
        access: 'user',
        roles: ['operator'],
        permissions: new Set(['user:read', 'user:write']),
      },
    });
    expect(result.canAdmin).toBe(false);
    expect(result.canUserView).toBe(true);
    expect(result.canUserEdit).toBe(true);
    expect(result.canRoleView).toBe(false);
    expect(result.canRoleEdit).toBe(false);
  });

  it('should deny all for undefined user', () => {
    const result = access({ currentUser: undefined });
    expect(result.canAdmin).toBeFalsy();
    expect(result.canUserView).toBe(false);
  });

  it('should handle empty permissions gracefully', () => {
    const result = access({
      currentUser: { access: 'user', roles: [], permissions: new Set() },
    });
    expect(result.canUserView).toBe(false);
  });
});
```

### 16.3 集成测试

#### 16.3.1 后端集成测试

**测试范围**：验证多个模块协同工作的正确性。

| 测试场景 | 验证点 |
| --- | --- |
| 角色 CRUD 全流程 | 创建→查询→更新→删除→验证级联清理 |
| 用户-角色分配 | 分配→查询→移除→验证 Casbin 策略同步 |
| 权限中间件 | 有权限用户放行、无权限用户拒绝、未认证用户拦截 |
| 引导数据策略 | 首次迁移创建默认角色、重复迁移幂等 |
| Token 刷新 + 权限 | 刷新后权限信息不丢失 |

```go
// server/internal/integration/role_management_test.go

func TestRoleManagement_FullLifecycle(t *testing.T) {
    // Setup: 初始化测试服务器 + 数据库
    srv := setupIntegrationTest(t)
    defer srv.Teardown()

    // 1. 创建角色
    role := srv.CreateRole(t, &CreateRoleRequest{
        Name:        "test-admin",
        DisplayName: "测试管理员",
        Description: "用于集成测试",
    })
    assert.NotEmpty(t, role.ID)

    // 2. 查询角色
    fetched := srv.GetRole(t, role.ID)
    assert.Equal(t, "test-admin", fetched.Name)

    // 3. 更新角色
    updated := srv.UpdateRole(t, role.ID, &UpdateRoleRequest{
        DisplayName: "更新后的名称",
    })
    assert.Equal(t, "更新后的名称", updated.DisplayName)

    // 4. 分配给用户
    srv.AssignRoleToUser(t, srv.testUser.ID, role.ID)

    // 5. 验证 Casbin 策略已同步
    allowed := srv.CheckPermission(t, srv.testUser.ID, "user", "read")
    // 需要先为该角色添加权限策略
    srv.CreatePermission(t, role.ID, "user", "read")
    allowed = srv.CheckPermission(t, srv.testUser.ID, "user", "read")
    assert.True(t, allowed)

    // 6. 删除角色
    srv.DeleteRole(t, role.ID)

    // 7. 验证级联清理
    userRoles := srv.GetUserRoles(t, srv.testUser.ID)
    assert.NotContains(t, userRoles, role.ID)
}

func TestPermissionMiddleware(t *testing.T) {
    srv := setupIntegrationTest(t)
    defer srv.Teardown()

    // 创建角色 + 权限
    role := srv.CreateRole(t, &CreateRoleRequest{Name: "viewer"})
    srv.CreatePermission(t, role.ID, "user", "read")

    // 分配给用户
    srv.AssignRoleToUser(t, srv.testUser.ID, role.ID)

    // 获取该用户的 token
    token := srv.LoginAs(t, srv.testUser.Email, "password123")

    // 测试有权限的请求
    resp := srv.Request(t, "GET", "/api/roles", token)
    assert.Equal(t, true, resp.Success)

    // 测试无权限的请求（写操作）
    resp = srv.Request(t, "POST", "/api/roles", token,
        `{"name":"new-role","display_name":"新角色"}`)
    assert.Equal(t, false, resp.Success)
    assert.Equal(t, "forbidden", resp.ErrorCode)
}
```

#### 16.3.2 前端集成测试

```typescript
// web-components/packages/admin-ui/tests/permission-flow.spec.ts

import { test, expect } from '@playwright/test';

test.describe('权限管理流程', () => {
  test.beforeEach(async ({ page }) => {
    // 登录管理员账号
    await page.goto('/user/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('角色创建 → 权限分配 → 用户分配 完整流程', async ({ page }) => {
    // 1. 创建角色
    await page.goto('/system/roles');
    await page.click('button:has-text("新建角色")');
    await page.fill('#name', 'test-operator');
    await page.fill('#displayName', '测试运营');
    await page.click('button:has-text("确定")');
    await expect(page.locator('.ant-message-success')).toBeVisible();

    // 2. 为该角色分配权限
    await page.goto('/system/permissions');
    await page.click('button:has-text("新建权限")');
    await page.selectOption('#roleId', 'label=测试运营');
    await page.fill('#resource', 'user');
    await page.selectOption('#action', 'read');
    await page.click('button:has-text("确定")');

    // 3. 将角色分配给用户
    await page.goto('/system/users');
    await page.click('tr:has-text("testuser@example.com") button:has-text("分配角色")');
    await page.check('input[type="checkbox"][aria-label="test-operator"]');
    await page.click('button:has-text("确定")');

    // 4. 验证用户权限生效（通过 API 检查）
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('admin_access_token')}` },
      });
      return res.json();
    });
    expect(response.data.permissions).toContainEqual(
      expect.objectContaining({ resource: 'user', action: 'read' })
    );
  });
});
```

### 16.4 E2E 测试

> **参考**：[`web-components/packages/admin-ui/tests/rtc-agent.spec.ts`](../web-components/packages/admin-ui/tests/rtc-agent.spec.ts)

E2E 测试使用 Playwright，模拟真实用户操作。

| 测试场景 | 步骤 | 预期结果 |
| --- | --- | --- |
| 管理员登录 + 菜单可见 | 登录 → 查看侧边栏 | 看到"角色管理"、"权限管理" |
| 普通用户登录 + 菜单隐藏 | 登录 → 查看侧边栏 | 看不到"权限管理" |
| 无权限按钮不可见 | 登录 → 进入角色页 | "删除"按钮不可见 |
| Token 过期自动刷新 | 等待 token 过期 → 操作 | 自动刷新 token，操作继续 |
| 并发角色创建 | 两个标签页同时创建同名角色 | 一个成功，一个提示已存在 |

### 16.5 性能测试

> **完整的性能基准测试代码和预期结果**请参见 [13.2.1 性能基准测试详细设计](#1321-性能基准测试详细设计)。

**本节补充测试策略层面的性能验证要求**：

| 测试项 | 验证目标 | 失败处理 |
| --- | --- | --- |
| Casbin Enforce 基准 | 轻量级负载 > 200K ops/sec，P99 < 5μs | 检查策略量，优化 matcher |
| 数据库查询基准 | 用户角色查询 P95 < 50ms | 检查索引，优化查询 |
| 批量插入基准 | 1000 条 user_roles < 500ms | 调整批量大小 |
| 并发权限检查 | 100 并发，0 错误率 | 检查连接池配置 |
| API 响应时间 | 角色列表 < 200ms，权限分配 < 300ms | 添加缓存或优化查询 |

**性能回归测试**：CI pipeline 中集成 `go test -bench` 基准测试，当性能退化超过 20% 时触发告警。

### 16.6 测试覆盖率要求

| 模块 | 最低覆盖率 | 说明 |
| --- | --- | --- |
| `usecase/` | 90% | 核心业务逻辑，必须高覆盖 |
| `repo/` | 80% | 重点是错误处理路径 |
| `infra/auth/` | 85% | Casbin 集成是关键路径 |
| `handler/http/` | 70% | 集成测试覆盖主要场景 |
| 前端 `access.ts` | 100% | 权限逻辑必须全覆盖 |
| 前端页面组件 | 60% | 重点覆盖交互逻辑 |

---

## 17. 与 RTC Agent 主系统集成

> **设计原则**：admin-server 与 RTC Agent 主系统（`server-1`、`server-2`）共享基础设施（PostgreSQL、Redis），但业务逻辑完全独立。权限系统仅服务于 admin-server，不影响 RTC Agent 的会话管理、消息路由等核心功能。

### 17.1 集成架构

```mermaid
graph TB
    subgraph "RTC Agent 主系统"
        S1[server-1 :8888]
        S2[server-2 :8888]
        NGINX[nginx :28080 LB]
    end
    
    subgraph "Admin 系统"
        AS[admin-server :28081]
        AUI[admin-ui SPA]
    end
    
    subgraph "共享基础设施"
        PG[(PostgreSQL :25432)]
        RD[(Redis :26379)]
        MN[(MinIO :29000)]
    end
    
    subgraph "可观测性"
        JG[Jaeger]
        PM[Prometheus]
        GK[Grafana]
    end
    
    NGINX --> S1 & S2
    AS --> AUI
    S1 & S2 --> PG & RD & MN
    AS --> PG & RD
    S1 & S2 & AS --> JG & PM
    PM --> GK
```

### 17.2 共享基础设施

| 组件 | 主系统用法 | admin-server 用法 | 隔离方式 |
| --- | --- | --- | --- |
| PostgreSQL | 会话、消息、用户数据 | 管理员用户、角色、权限 | 不同表集合，通过 GORM 模型隔离 |
| Redis | 会话缓存、RTC 信令 | Rate Limiting、Token 缓存 | 不同 key prefix（`admin:` vs 无前缀） |
| MinIO | 文件存储 | 不使用 | 无需隔离 |
| Jaeger | 分布式追踪 | 审计日志追踪 | 不同 service name |
| Prometheus | 业务指标 | 权限系统指标 | 不同 metric prefix（`admin_`） |

### 17.3 数据隔离

**PostgreSQL 表隔离**：

```text
主系统表（model.AutoMigrate）：
  - sessions, messages, goals, files, owners, turns, ...
  - 由 model.AutoMigrate(db) 迁移

admin-server 表（独立迁移）：
  - users, admin_refresh_tokens, roles, user_roles, casbin_rule
  - 由 db.AutoMigrate(&model.User{}, ...) 迁移
```

**关键约束**：

- admin-server 的表不能与主系统的表有外键关联
- 两边的 `users` 表概念不同：主系统没有 `users` 表（使用 `owners`），admin-server 的 `users` 表专指管理员用户
- 如果未来需要关联（如"RTC Agent 用户的角色"），需要通过应用层 JOIN，不能通过数据库外键

### 17.4 Redis Key 命名规范

| 用途 | Key 格式 | 示例 |
| --- | --- | --- |
| admin-server 登录限流 | `admin:login:ip:{ip}` | `admin:login:ip:192.168.1.1` |
| admin-server 邮箱限流 | `admin:login:email:{email}` | `admin:login:email:admin@example.com` |
| admin-server 全局限流 | `admin:ratelimit:{ip}` | `admin:ratelimit:192.168.1.1` |
| admin-server 权限缓存 | `admin:perm:{userID}` | `admin:perm:01912345-...` |
| 主系统会话 | `session:{sessionID}` | `session:abc123` |
| 主系统 RTC | `rtc:{roomID}` | `rtc:room456` |

**前缀 `admin:`** 确保不与主系统的 key 冲突。

### 17.5 部署拓扑

```mermaid
graph LR
    subgraph "Docker Compose"
        PG[postgres]
        RD[redis]
        MN[minio]
        JG[jaeger]
        PM[prometheus]
        MG[migrate]
        
        S1[server-1]
        S2[server-2]
        NG[nginx]
        
        AS[admin-server]
    end
    
    MG -->|schema migration| PG
    S1 & S2 -->|depends_on| MG
    AS -->|depends_on| MG
    NG --> S1 & S2
    
    AS -.->|共享| PG & RD
    S1 & S2 -.->|共享| PG & RD & MN & JG & PM
```

**要点**：

- `migrate` 服务统一迁移主系统 + admin-server 的表（见 [8.2](#82-数据库迁移适配)）
- `admin-server` 与 `server-1/2` 并行运行，互不依赖
- `nginx` 只代理主系统（`:28080`），admin-server 独立暴露（`:28081`）
- admin-server 不接入 `minio`、`mock-oauth2`

### 17.6 未来扩展：主系统用户与管理员用户的关联

当前 admin-server 的 `users` 表与主系统的 `owners` 表完全独立。未来如果需要让 RTC Agent 的主系统用户也能登录 admin-server（如"查看自己的会话数据"），有以下方案：

| 方案 | 描述 | 优缺点 |
| --- | --- | --- |
| A. 独立用户池（推荐） | 保持独立，管理员通过 admin UI 手动创建 | 简单、安全隔离；缺点是需要重复创建 |
| B. 共享用户 ID | `users.id` = `owners.id`，通过应用层关联 | 统一身份；缺点是耦合增加 |
| C. OAuth2 互通 | admin-server 作为 OAuth2 client，主系统作为 provider | 标准化；缺点是实现复杂 |

**当前选择方案 A**，保持简单和安全隔离。

---

## 18. 实施计划

### 18.1 阶段划分（增加缓冲时间）

| 阶段 | 任务 | 预估时间 | 缓冲 | 总计 |
| --- | --- | --- | --- | --- |
| 阶段一 | 后端基础设施 | 2-3 天 | 1 天 | 3-4 天 |
| 阶段二 | 角色管理 API | 2-3 天 | 1 天 | 3-4 天 |
| 阶段三 | 权限管理 API | 2-3 天 | 1 天 | 3-4 天 |
| 阶段四 | 前端集成 | 3-4 天 | 1 天 | 4-5 天 |
| 阶段五 | 安全加固 | 2 天 | 1 天 | 3 天 |
| 阶段六 | 测试与优化 | 2-3 天 | 2 天 | 4-5 天 |
| **总计** | | **13-18 天** | **7 天** | **20-25 天** |

### 18.2 灰度发布策略

#### 18.2.1 发布阶段

**阶段一**：内部测试环境（1 周）

- 部署到开发环境
- 内部用户测试（开发团队）
- 收集反馈，修复问题
- **进入下一阶段的条件**：所有 P0/P1 Bug 已修复，单元测试和集成测试 100% 通过

**阶段二**：预发布环境（1 周）

- 部署到预发布环境（staging）
- 邀请 10-20 个内部用户测试
- 监控性能指标和错误率
- **进入下一阶段的条件**：无 P0/P1 Bug，权限检查 P99 < 10ms，登录成功率 > 99%

**阶段三**：生产环境灰度

```mermaid
graph LR
    A[10% 用户] -->|监控 1 周<br/>无 P0 问题| B[50% 用户]
    B -->|监控 1 周<br/>指标正常| C[100% 全量]
    
    A -->|出现 P0 问题| D[回滚到旧版本]
    B -->|出现 P0 问题| D
    C -->|出现 P0 问题| D
    
    style D fill:#f66,stroke:#333,color:#fff
```

#### 18.2.2 灰度策略实现

**方案**：通过 `admin.yaml` 配置文件控制权限系统开关

> **注意**：当前 `AdminConfig`（参见 [`admin_config.go`](../server/internal/infra/config/admin_config.go)）不包含 `features` 段，需要新增：
>
> ```go
> // 在 admin_config.go 的 AdminConfig 结构体中添加
> Features AdminFeaturesConfig `mapstructure:"features"`
>
> type AdminFeaturesConfig struct {
>     PermissionSystem bool `mapstructure:"permission_system"` // 灰度开关
> }
> ```

```yaml
# etc/admin.yaml
features:
  permission_system: true  # 灰度开关：false = 旧模式（所有用户 admin），true = 新权限模式
```

**后端逻辑**：

```go
// 伪代码：灰度开关控制 /api/auth/me 行为
func (uc *AdminAuthUsecase) GetCurrentUser(ctx, userID) (*CurrentUserResponse, error) {
    user := uc.userRepo.GetByID(ctx, userID)
    
    if cfg.Features.PermissionSystem {
        // 新模式：返回实际角色和权限
        roles := uc.getRolesByUserID(ctx, userID)
        permissions := uc.getPermissionsByRoles(ctx, roles)
        return &CurrentUserResponse{
            User: user,
            Roles: roles,
            Permissions: permissions,
        }, nil
    }
    
    // 旧模式：所有用户返回 admin（向后兼容）
    return &CurrentUserResponse{
        User: user,
        Roles: []Role{{Name: "admin"}},  // 模拟 admin 角色
        Permissions: allPermissions,      // 所有权限
    }, nil
}
```

**前端兼容**：

```typescript
// app.tsx — 无论后端是否启用灰度，前端代码都能正常工作
access: roleNames.includes('admin') ? 'admin' : 'user',
// 灰度关闭时，后端返回 admin 角色 → access = 'admin'（旧行为）
// 灰度开启时，后端返回实际角色 → access 根据实际角色决定
```

#### 18.2.3 监控指标与回滚触发条件

| 指标 | 正常范围 | 回滚触发条件 | 监控方式 |
| --- | --- | --- | --- |
| 登录成功率 | > 99% | < 95% 持续 5 分钟 | Prometheus `admin_login_requests_total` |
| 权限检查延迟 P99 | < 10ms | > 100ms 持续 5 分钟 | Prometheus histogram |
| 权限拒绝率 | < 5% | > 20% 持续 10 分钟（可能是策略配置错误） | Prometheus counter |
| `/api/auth/me` 错误率 | < 0.1% | > 1% 持续 5 分钟 | Prometheus counter |
| 前端 403 页面触发率 | < 2% | > 10% 持续 10 分钟 | 前端埋点 |

**回滚操作**：

```bash
# 1. 修改配置文件，关闭权限系统
docker-compose exec admin-server sed -i 's/permission_system: true/permission_system: false/' /app/etc/admin.yaml

# 2. 重启 admin-server（零停机：docker-compose rolling restart）
docker-compose restart admin-server

# 3. 验证回滚成功
curl -s http://localhost:28081/api/auth/me -H "Authorization: Bearer $TOKEN" | jq .
# 预期：所有用户返回 admin 角色
```

**回滚影响**：

| 影响 | 说明 |
| --- | --- |
| 已创建的角色/权限 | 保留在数据库中，不影响旧版本运行 |
| 已分配的用户角色 | 保留，灰度重新开启后自动恢复 |
| 审计日志 | 保留，不受回滚影响 |
| 前端 | 无需回滚前端代码（兼容性设计） |

### 18.3 风险点与缓解措施

| 风险 | 概率 | 影响 | 缓解措施 |
| --- | --- | --- | --- |
| Casbin 策略与业务逻辑不一致 | 中 | 高 | 在 Casbin 中间件上方添加 routeResourceMap 显式映射表，每个新路由必须注册映射；代码审查 checklist 包含权限检查 |
| 引导数据策略幂等性失败 | 低 | 高 | BootstrapAdmin 先检查 roles 表是否为空，使用事务保证原子性；CI 中测试重复执行迁移 |
| 多实例 Casbin 策略不同步 | 中 | 高 | MVP 阶段限制为单实例部署；后续引入 Redis Watcher 前，不部署多实例 |
| 前端权限缓存过期 | 中 | 中 | 每次 token 刷新时重新调用 `/api/auth/me`；权限变更后后端主动通知前端（可选 WebSocket） |
| GORM AutoMigrate 数据丢失 | 低 | 极高 | 生产环境部署前必须备份数据库；AutoMigrate 只做 additive 变更（新增表/列），不做 destructive 变更 |
| admin-server 与主系统数据库表冲突 | 低 | 高 | 两边使用独立的 GORM 模型集合，无外键关联；迁移脚本分开执行（先主系统后 admin） |
| 现有用户缺少角色导致无法登录 | 中 | 高 | 迁移脚本自动为所有现有用户分配 admin 角色（见 [8.5.2 现有环境升级流程](#852-现有环境升级流程)） |
| Casbin Enforcer 初始化失败 | 低 | 高 | 初始化失败时 admin-server 拒绝启动（fail-fast）；降级方案：只读模式（见 [15.3](#153-服务降级策略)） |
| JWT Token 泄露（XSS 攻击） | 中 | 高 | Token 存储在 localStorage（有 XSS 风险）；缓解：CSP header + 输入过滤 + React 自动转义；长期方案：HttpOnly Cookie |
| 性能退化（Casbin 策略量过大） | 低 | 中 | 策略量 < 1000 条时内存占用可忽略；监控策略数量，超过阈值告警；考虑分片或精简策略 |

### 18.4 依赖项与前置条件

| 依赖项 | 说明 | 当前状态 |
| --- | --- | --- |
| PostgreSQL 17+ | 需要 UUID 类型支持 | ✅ 已满足（pgvector/pgvector:pg17） |
| Redis 7+ | Rate Limiting + 未来 Casbin Watcher | ✅ 已满足（redis:7-alpine） |
| Go 1.27+ | Casbin v2 + gorm-adapter v3 需要（`go.mod` 当前为 `go 1.27.0`） | ✅ 已满足 |
| Node.js 22+ | admin-ui 构建需要 | ✅ 已满足 |
| Casbin Go 依赖 | `github.com/casbin/casbin/v2` + `github.com/casbin/gorm-adapter/v3` | ❌ 需要 `go get` |
| 前端依赖 | `@umijs/plugin-access`（已内置于 Ant Design Pro） | ✅ 已满足 |

### 18.5 关键里程碑

> **完成标准（Definition of Done）**：每个任务必须满足以下条件才算完成：
>
> - ✅ 代码已实现并通过本地测试
> - ✅ 单元测试已编写（覆盖率 ≥ 80%）
> - ✅ 文档已更新（如适用）
> - ✅ 通过 Code Review
> - ✅ 合并到 main 分支

```mermaid
gantt
    title 权限系统实施里程碑
    dateFormat  YYYY-MM-DD
    section 后端
    Casbin 集成 + 数据库迁移     :a1, 2026-10-06, 3d
    角色管理 API                :a2, after a1, 3d
    权限管理 API                :a3, after a2, 3d
    用户-角色 API               :a4, after a3, 2d
    section 前端
    access.ts + app.tsx 改造    :b1, after a4, 2d
    角色管理页面                :b2, after b1, 3d
    权限管理页面                :b3, after b2, 2d
    动态菜单 + 按钮权限          :b4, after b3, 2d
    section 测试与安全
    单元 + 集成测试              :c1, after b4, 3d
    安全加固                    :c2, after c1, 2d
    E2E 测试                    :c3, after c2, 2d
    section 部署
    灰度发布                    :d1, after c3, 3d
    全量上线                    :milestone, after d1, 0d
```

#### 18.5.1 任务完成标准详细列表

##### 阶段一：后端基础设施

| 任务 | 完成标准 | 验收命令 |
| --- | --- | --- |
| **T1: 添加 Casbin 依赖** | ✅ `go.mod` 包含 `casbin/v2` 和 `gorm-adapter/v3`；✅ `go build ./...` 编译通过 | `grep casbin go.mod` |
| **T2: 创建数据模型** | | |
| T2.1: `model/role.go` | ✅ Role 结构体含 ID/Name/DisplayName/Description/IsEnabled/CreatedAt/UpdatedAt；✅ `TableName()` 返回 `"roles"`；✅ `BeforeCreate()` 生成 UUID v7 | `go test ./internal/model/... -run TestRole` |
| T2.2: `model/user_role.go` | ✅ UserRole 结构体含 UserID/RoleID/AssignedAt；✅ 复合主键 `(user_id, role_id)`；✅ `TableName()` 返回 `"user_roles"` | `go test ./internal/model/... -run TestUserRole` |
| T2.3: Sentinel errors | ✅ `repo/errors.go` 新增 `ErrConflict`、`ErrDuplicateName`、`ErrCannotRemoveLastAdmin`、`ErrCannotDeleteSystemRole`、`ErrRoleDisabled`、`ErrCannotRemoveSelfAdmin` | `grep -c "ErrCannot" internal/repo/errors.go` → ≥ 2 |
| T2.4: 模型单元测试 | ✅ UUID v7 生成正确；✅ TableName 返回值正确；✅ BeforeCreate 不覆盖已设置的 ID；✅ 覆盖率 100% | `go test ./internal/model/... -cover -v` |
| **T3: Enforcer 初始化** | | |
| T3.1: `infra/auth/casbin.go` | ✅ `NewAdminCasbinEnforcer(db)` 函数已创建；✅ 使用 gorm-adapter 自动创建 `casbin_rule` 表；✅ RBAC 模型从字符串加载 | `go test ./internal/infra/auth/... -run TestNewAdminCasbinEnforcer` |
| T3.2: Enforcer 单元测试 | ✅ 测试 `Enforce(user, resource, action)` 允许/拒绝逻辑；✅ 测试角色继承（`g` 类型策略）；✅ 测试策略持久化 | `go test ./internal/infra/auth/... -v` |
| **T4: 数据库迁移** | | |
| T4.1: AutoMigrate | ✅ `cmd/migrate.go` 的 admin 迁移块包含 `&model.Role{}` 和 `&model.UserRole{}` | `grep -A 5 "admin auto migrate" cmd/migrate.go` |
| T4.2: 引导数据 | ✅ `BootstrapAdmin()` 在 `roles` 表为空时创建 3 个默认角色（admin、operator、viewer）和权限策略 | `docker-compose run migrate` → `psql -c "SELECT name FROM roles"` → admin, operator, viewer |
| T4.3: 迁移集成测试 | ✅ 空数据库迁移成功；✅ 重复执行迁移不报错（幂等性）；✅ `casbin_rule` 表包含预期策略 | `docker-compose run migrate && docker-compose run migrate`（第二次应跳过） |

##### 阶段二：角色管理 API

| 任务 | 完成标准 | 验收命令 |
| --- | --- | --- |
| **T5: RoleRepo + UserRoleRepo** | | |
| T5.1: Repo 接口定义 | ✅ `RoleRepo` 接口含 Create/GetByID/GetByName/List/Update/Delete 方法；✅ `UserRoleRepo` 接口含 Create/BatchCreate/GetByUserID/DeleteByUserRole 方法；✅ 所有查询使用 `DBFromContext(ctx, r.db)` | `grep "type RoleRepo interface" internal/repo/role_repo.go` |
| T5.2: Repo 实现 | ✅ 实现类为未导出 struct（`type roleRepo struct`）；✅ `NewRoleRepo(db)` 导出构造函数；✅ `IsDuplicateKeyError(err)` 检测 PG 23505 | `go test ./internal/repo/... -cover` |
| T5.3: Repo 单元测试 | ✅ 测试 CRUD 操作；✅ 测试重复名称返回 `ErrDuplicateName`；✅ 测试 NotFound 场景；✅ 覆盖率 ≥ 80% | `go test ./internal/repo/... -cover -v` |
| **T6: RoleUsecase** | | |
| T6.1: 角色 CRUD | ✅ Create/GetByID/List/Update 业务逻辑已实现；✅ 参数校验（名称非空、长度限制）；✅ 统一响应格式 | `go test ./internal/usecase/... -run TestRoleUsecase_Create` |
| T6.2: 角色删除（含级联） | ✅ 删除前检查系统角色保护（`ErrCannotDeleteSystemRole`）；✅ 删除前检查最后 admin 保护（`ErrCannotRemoveLastAdmin`）；✅ 级联删除 `user_roles` + Casbin `g` 策略 | `go test ./internal/usecase/... -run TestRoleUsecase_Delete` |
| T6.3: 审计日志 | ✅ 角色创建/更新/删除操作记录审计日志；✅ 审计日志包含 `operator_id`、`event_type`、`details` | `grep "auditLogger.Log" internal/usecase/role.go` |
| **T7: RoleHandler** | | |
| T7.1: RESTful API | ✅ RegisterRoutes 注册所有角色管理路由；✅ GET/POST/PUT/DELETE 方法正确映射；✅ 分页参数 `page`/`page_size` 支持 | `curl -s http://localhost:8081/api/roles -H "Authorization: Bearer $TOKEN"` → 200 + items/total |
| T7.2: 请求校验 | ✅ 使用 `binding:"required"` 校验必填字段；✅ `sanitizeBindingError()` 过滤内部字段名；✅ 参数错误返回 `validation_error` | `curl -X POST .../api/roles -d '{}'` → `errorCode: "validation_error"` |
| T7.3: Casbin 中间件保护 | ✅ 角色管理 API 受 Casbin 中间件保护；✅ 无权限用户返回 `forbidden` | `curl .../api/roles -H "Authorization: Bearer $VIEWER_TOKEN"` → `errorCode: "forbidden"` |

##### 阶段三:权限管理 API

| 任务 | 完成标准 | 验收命令 |
| --- | --- | --- |
| **T8: Casbin 中间件** | ✅ `routeResourceMap` 已定义;✅ 权限检查逻辑已实现;✅ 默认拒绝(fail-close)策略已实现 | 无 Token 访问 → `errorCode: "unauthorized"` |
| **T9: PermissionUsecase** | ✅ 策略增删查逻辑已实现;✅ 批量操作已优化;✅ 单元测试覆盖率 ≥ 80% | `go test ./internal/usecase/... -run TestPermissionUsecase` |
| **T10: 扩展 /api/auth/me** | ✅ 返回 `roles[]` 和 `permissions[]`;✅ 向后兼容(`omitempty`)；✅ 集成测试验证响应格式 | `curl .../api/auth/me` → 包含 roles 和 permissions |

##### 阶段四:前端集成

| 任务 | 完成标准 | 验收命令 |
| --- | --- | --- |
| **T11: access.ts 改造** | ✅ 基于 `permissions` Set 计算权限;✅ 单元测试覆盖率 100%;✅ 向后兼容旧后端 | `npm run test -- access.test.ts` |
| **T12: 角色管理页面** | ✅ ProTable 列表展示;✅ ProForm 创建/编辑表单;✅ 删除确认对话框;✅ 表单验证 | 手动测试：创建/编辑/删除角色 |
| **T13: 权限管理页面** | ✅ 权限策略列表展示;✅ 创建权限策略表单;✅ 角色-资源-操作选择器 | 手动测试：创建/删除权限 |
| **T14: 动态菜单 + 按钮权限** | ✅ 菜单根据权限动态渲染;✅ 按钮级权限控制(`<Access>`)；✅ 无权限时按钮隐藏 | 登录 viewer 用户 → 看不到"权限管理"菜单 |

##### 阶段五:测试与安全

| 任务 | 完成标准 | 验收命令 |
| --- | --- | --- |
| **T15: 单元/集成测试** | ✅ 后端覆盖率 ≥ 80%;✅ 前端覆盖率 ≥ 60%;✅ 所有测试通过 | `go test ./... -cover` 和 `npm run test` |
| **T16: 集成测试** | ✅ 角色 CRUD 全流程测试;✅ 权限中间件测试;✅ 引导数据策略测试 | `go test ./internal/integration/...` |
| **T17: 安全加固** | ✅ Rate Limiting 已实现;✅ 登录保护已实现;✅ SQL 注入测试通过;✅ XSS 测试通过 | 参见 [19.5](#195-安全验收标准) |

##### 阶段六:部署上线

| 任务 | 完成标准 | 验收命令 |
| --- | --- | --- |
| **T18: E2E 测试** | ✅ Playwright 测试脚本已编写;✅ 覆盖登录、菜单、按钮权限;✅ 测试通过 | `npx playwright test` |
| **T19: 灰度发布** | ✅ 灰度开关已配置;✅ 监控指标已配置;✅ 回滚脚本已准备 | 参见 [18.2.3](#1823-监控指标与回滚触发条件) |
| **T20: 全量上线** | ✅ 所有验收测试通过;✅ 性能指标达标;✅ 无 P0/P1 Bug | 参见 [19.0](#190-快速验证脚本) |

#### 18.5.2 任务依赖图与关键路径

> 下图展示任务间的依赖关系和并行可能性。**红色节点**为关键路径（决定项目最短工期），任何延迟都会推迟上线日期。

```mermaid
flowchart LR
    subgraph "阶段一：后端基础设施 🔴"
        T1["T1: 添加 Casbin 依赖<br/>go get casbin + gorm-adapter"]
        T2["T2: 创建数据模型<br/>model/role.go + user_role.go"]
        T3["T3: Enforcer 初始化<br/>infra/auth/casbin.go"]
        T4["T4: 数据库迁移<br/>cmd/migrate.go 适配"]
        T1 --> T2 --> T3 --> T4
    end

    subgraph "阶段二：角色管理 API 🔴"
        T5["T5: RoleRepo + UserRoleRepo<br/>接口 + sentinel errors"]
        T6["T6: RoleUsecase<br/>CRUD + 级联处理"]
        T7["T7: RoleHandler<br/>RESTful API"]
        T5 --> T6 --> T7
    end

    subgraph "阶段三：权限管理 API 🔴"
        T8["T8: Casbin 中间件<br/>routeResourceMap"]
        T9["T9: PermissionUsecase<br/>策略增删查"]
        T10["T10: 扩展 /api/auth/me<br/>返回 roles + permissions"]
        T8 --> T9 --> T10
    end

    subgraph "阶段四：前端集成 🔴"
        T11["T11: access.ts 改造<br/>permissionSet 构建"]
        T12["T12: 角色管理页面<br/>ProTable + ProForm"]
        T13["T13: 权限管理页面"]
        T14["T14: 动态菜单 + 按钮权限"]
        T11 --> T12 --> T13 --> T14
    end

    subgraph "阶段五：测试与安全"
        T15["T15: 单元测试<br/>usecase + repo + casbin"]
        T16["T16: 集成测试<br/>API + 中间件"]
        T17["T17: 安全加固<br/>Rate Limit + 登录保护"]
        T15 --> T16 --> T17
    end

    subgraph "阶段六：部署上线 🔴"
        T18["T18: E2E 测试"]
        T19["T19: 灰度发布"]
        T20["T20: 全量上线"]
        T18 --> T19 --> T20
    end

    %% 跨阶段依赖
    T4 --> T5
    T7 --> T8
    T10 --> T11
    T14 --> T15
    T17 --> T18

    %% 并行可能性（虚线）
    T7 -.->|"可并行"| T11
    T15 -.->|"可并行"| T17

    classDef critical fill:#ff6b6b,stroke:#c92a2a,color:#fff
    classDef parallel fill:#69db7c,stroke:#2b8a3e,color:#fff
    class T1,T2,T3,T4,T5,T6,T7,T8,T9,T10,T11,T12,T13,T14,T18,T19,T20 critical
    class T15,T17 parallel
```

**关键路径分析**：

| 关键路径节点 | 前置依赖 | 阻塞影响 | 并行可能性 |
| --- | --- | --- | --- |
| T1 → T4 | 无 | 阻塞所有后端工作 | — |
| T5 → T7 | T4 完成 | 阻塞角色 API | — |
| T8 → T10 | T7 完成 | 阻塞权限 API 和 /api/auth/me | T11（前端改造）可与 T8-T9 并行启动 |
| T11 → T14 | T10 完成（需 API 返回权限数据） | 阻塞所有前端功能 | T12-T13 页面骨架可提前搭建（使用 Mock 数据） |
| T15 → T17 | T14 完成 | 阻塞测试和安全加固 | T15（单元/集成测试）可与 T17（安全加固）并行 |
| T18 → T20 | T17 完成 | 阻塞上线 | — |

**缩短工期的策略**：

1. **前后端并行**：T10（/api/auth/me 扩展）完成后，T11 立即启动；同时 T12-T13 可用 Mock 数据提前搭建页面骨架
2. **测试左移**：T15 的单元测试可在 T5-T7 开发过程中同步编写，不必等到 T14
3. **安全提前**：T17 的 Rate Limiting 和登录保护可独立于权限系统实现，提前开发

### 18.6 团队分工与协作

> **前提假设**：项目由 1 名全栈开发者主导，可调配 0.5 名前端 + 0.5 名后端协助。若只有 1 名开发者，则按时间线顺序执行所有任务。

**角色分工**：

| 角色 | 职责 | 人数 | 主要交付物 |
| --- | --- | --- | --- |
| 技术负责人（全栈） | 架构设计、后端核心、集成测试 | 1 | 后端全部代码、数据库设计、Casbin 集成 |
| 前端开发 | 页面实现、权限组件 | 0.5 | 角色/权限管理页面、access.ts 改造 |
| QA | 测试用例、E2E 测试、安全测试 | 0.5 | 测试报告、E2E 脚本 |

**协作流程**：

```mermaid
sequenceDiagram
    participant TL as 技术负责人
    participant FE as 前端开发
    participant QA as QA

    Note over TL: 阶段一 ~ 阶段三（后端）
    TL->>TL: 设计数据库模型 + Casbin 集成
    TL->>TL: 实现角色/权限 API
    TL->>QA: 提供 API 文档（Swagger/手动）
    QA->>QA: 编写 API 测试用例

    Note over TL,FE: 阶段四（前端集成 — 并行）
    TL->>FE: 交付 API 接口 + Mock 数据
    TL->>TL: 实现审计日志 + 安全加固
    FE->>FE: access.ts + app.tsx 改造
    FE->>FE: 角色/权限管理页面
    QA->>QA: E2E 测试脚本

    Note over TL,QA: 阶段五 ~ 阶段六（测试优化）
    TL->>QA: 联调完成，交付测试环境
    QA->>QA: 功能测试 + 安全测试 + 性能测试
    QA-->>TL: 反馈 Bug
    TL->>TL: 修复 Bug
    QA->>QA: 回归测试

    Note over TL: 部署上线
    TL->>TL: 灰度发布 + 全量上线
```

**接口契约管理**：

前后端并行开发时，需要提前约定 API 接口：

1. **OpenAPI 规范**：后端先实现 API，自动生成 OpenAPI spec
2. **Mock 数据**：前端使用 OpenAPI spec 生成 Mock 数据（通过 `@umijs/max` 内置 mock 或 `msw`）
3. **类型同步**：前端通过 `npm run openapi` 自动生成 TypeScript 类型（已有此脚本）

**代码审查 Checklist**：

| 审查点 | 说明 | 负责 |
| --- | --- | --- |
| Casbin 中间件路由映射 | 每个新路由必须在 `routeResourceMap` 注册 | 技术负责人 |
| 权限边界测试 | 无权限用户访问受保护 API 返回 `forbidden` | QA |
| 向后兼容 | `/api/auth/me` 新字段使用 `omitempty` | 技术负责人 |
| 前端权限不依赖前端数据 | 所有权限判断基于后端返回的 `permissions[]` | 前端开发 |
| SQL 注入 / XSS | 所有用户输入经过 GORM 参数化 + React 自动转义 | 技术负责人 |
| 日志完整性 | 所有权限变更操作记录审计日志 | 技术负责人 |

### 18.7 权限系统可配置性

**问题**：当前设计使用固定的 `(resource, action)` 二维权限模型。未来是否需要支持自定义权限维度？

**方案对比**：

| 方案 | 描述 | 复杂度 | 推荐度 |
| --- | --- | --- | --- |
| A. 固定二维模型（当前） | `(resource, action)` — 如 `(user, read)` | 低 | MVP 推荐 |
| B. Casbin 自定义 matcher | 在 matcher 中添加条件（如数据归属、时间段） | 中 | 按需扩展 |
| C. ABAC 混合模型 | 属性基访问控制（用户属性 + 环境属性） | 高 | 未来扩展 |

**MVP 阶段使用方案 A**，原因：

1. 管理员系统的权限需求简单，不需要细粒度的数据级权限
2. Casbin 的 RBAC 模型已满足"角色 → 资源 → 操作"的映射需求
3. 代码复杂度低，易于理解和维护

**未来扩展路径（方案 B）**：

如果未来需要"用户只能编辑自己创建的资源"，可以通过 Casbin 自定义 matcher 实现：

```ini
# 扩展的 Casbin 模型（未来）
[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act && (r.owner == r.sub || p.obj == "admin")
```

**当前不需要方案 C（ABAC）的原因**：

- RTC Agent admin 系统的用户数量少（< 100）
- 权限维度固定（管理员/运营/观察者）
- 不需要基于时间段、IP 等环境属性的动态权限

**可配置项清单**（通过配置文件调整，无需改代码）：

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `jwt.access_token_ttl` | 3600s (1h) | Access token 有效期 |
| `jwt.refresh_token_ttl` | 7d | Refresh token 有效期 |
| `security.login_max_attempts` | 5 | 登录失败锁定阈值 |
| `security.login_lock_duration` | 15m | 登录锁定持续时间 |
| `security.rate_limit_per_minute` | 100 | 每分钟请求限制 |
| `bootstrap.create_default_roles` | true | 是否创建默认角色 |
| `features.permission_system` | true | 权限系统灰度开关（见 [18.2.2](#1822-灰度策略实现)） |

### 18.8 质量控制与代码审查

> **目标**：确保权限系统代码的质量、安全性和一致性，减少上线后问题。

#### 18.8.1 PR 流程

```mermaid
sequenceDiagram
    participant DEV as 开发者
    participant CI as CI Pipeline
    participant REV as 审查者
    participant MAIN as main 分支
    
    DEV->>DEV: 1. 从 main 创建 feature 分支
    DEV->>DEV: 2. 实现功能 + 编写测试
    DEV->>DEV: 3. 本地运行 lint + test
    DEV->>CI: 4. 提交 PR
    CI->>CI: 5. 自动化检查（见下方清单）
    CI-->>DEV: 检查结果
    DEV->>REV: 6. 请求 Code Review
    REV->>REV: 7. 人工审查（见审查清单）
    REV-->>DEV: 审查意见
    DEV->>DEV: 8. 修改代码
    REV->>MAIN: 9. Approve + Merge
```

#### 18.8.2 自动化检查清单（CI Pipeline）

| 检查项 | 命令 | 失败处理 |
| --- | --- | --- |
| Go 编译 | `go build ./...` | 修复编译错误 |
| Go vet | `go vet ./...` | 修复代码问题 |
| 单元测试 | `go test ./internal/... -race -coverprofile=coverage.out` | 修复失败的测试 |
| 覆盖率检查 | `go tool cover -func=coverage.out` ≥ 80% | 补充测试用例 |
| 前端编译 | `cd web-components && npm run build` | 修复编译错误 |
| 前端 lint | `cd web-components && npm run lint`（Biome） | 修复 lint 问题 |
| 前端单元测试 | `cd web-components && npx vitest run` | 修复失败的测试 |
| 迁移测试 | `go run . migrate`（空数据库） | 修复迁移问题 |
| SQL 注入测试 | `curl` 发送特殊字符（见 [19.5.3](#1953-数据安全)） | 确认 GORM 参数化 |

#### 18.8.3 人工审查清单

| 审查维度 | 检查点 | 重点文件 |
| --- | --- | --- |
| **权限安全** | 新增路由是否在 `routeResourceMap` 注册？ | `handler/http/casbin_middleware.go` |
| **权限安全** | 受保护 API 是否正确经过 Casbin 中间件？ | `cmd/admin/serve.go` setupRouter + `handler/http/casbin_middleware.go` |
| **向后兼容** | `/api/auth/me` 新字段是否使用 `omitempty`？ | `handler/http/admin_auth.go` |
| **数据安全** | 用户输入是否通过 GORM 参数化查询？ | 所有 `repo/` 文件 |
| **错误处理** | 错误是否使用 `Error()` + 统一错误码？ | 所有 `handler/` 文件 |
| **日志完整性** | 权限变更操作是否记录审计日志？ | 所有 `usecase/` 文件 |
| **测试覆盖** | 核心逻辑是否有单元测试？ | `*_test.go` 文件 |
| **前端安全** | 用户输入是否通过 React JSX 自动转义？ | 所有 `.tsx` 文件 |
| **前端权限** | 权限控制是否基于后端 `permissions[]` 而非前端硬编码？ | `access.ts`, `app.tsx` |
| **性能** | 是否有 N+1 查询？是否使用 JOIN 优化？ | `repo/` 文件 |
| **命名规范** | 新增 API 是否遵循 RESTful 规范（见 [6.0](#60-restful-设计规范)）？ | `handler/` 文件 |

#### 18.8.4 安全检查专项

> 权限系统是安全关键组件，以下检查必须由**至少两人**确认：

| 检查项 | 验证方法 | 通过标准 |
| --- | --- | --- |
| 未认证用户无法访问受保护 API | 无 Token 调用 API，验证返回 `errorCode: "unauthorized"` | 所有受保护路由均拦截 |
| 无权限用户无法越权 | 创建 viewer 用户，尝试调用写 API | 返回 `errorCode: "forbidden"` |
| SQL 注入无效 | 发送 `' OR 1=1 --` 等 payload | 被 GORM 参数化拦截 |
| XSS 无效 | 发送 `<script>alert(1)</script>` | 被 React 转义 |
| 最后一个 admin 不可移除 | 尝试移除用户的最后一个 admin 角色 | 返回 `errorCode: "cannot_remove_last_admin"` |
| 系统角色不可删除 | 尝试删除 admin 角色 | 返回 `errorCode: "cannot_delete_system_role"` |
| Refresh Token 轮转 | 连续刷新两次，验证旧 token 失效 | 旧 token 返回 `refresh_token_revoked` |

### 18.9 文档维护计划

> **目标**：保持本文档与实际代码的长期一致性，避免文档腐化。

#### 18.9.1 文档与代码同步规则

| 代码变更类型 | 需要更新的文档章节 | 负责人 |
| --- | --- | --- |
| 新增/修改 API 端点 | Ch.6（API 设计）+ Ch.19（验收标准）+ Ch.25（检查清单） | PR 作者 |
| 新增/修改数据库模型 | Ch.5（数据库设计）+ Ch.8（部署与迁移） | PR 作者 |
| 修改 Casbin 模型/策略 | Ch.5.2（Casbin 模型配置）+ Ch.14.2（Prometheus） | PR 作者 |
| 修改前端权限逻辑 | Ch.7（前端集成）+ Ch.19.2（前端验收） | PR 作者 |
| 新增中间件 | Ch.12（错误处理）+ Ch.14.2（监控） | PR 作者 |
| 安全策略变更 | Ch.11（安全策略）+ Ch.19.5（安全验收） | PR 作者 |
| 新增配置项 | Ch.18.7（可配置性） | PR 作者 |
| 架构变更 | Ch.4（系统设计）+ Ch.17（主系统集成） | 技术负责人 |

#### 18.9.2 文档审查触发条件

以下事件发生时，必须审查并更新本文档：

1. **每个权限系统相关 PR 合并后**：检查本文档是否有内容需要更新
2. **每月一次文档审查**（建议月初）：通读全文，修正过时内容
3. **重大架构变更后**：如引入新组件、修改数据流、变更部署拓扑
4. **生产事故后**：如果事故暴露了文档未覆盖的场景，补充到文档

#### 18.9.3 文档质量指标

| 指标 | 目标 | 检查方式 |
| --- | --- | --- |
| 交叉引用有效性 | 100% 的 `#anchor` 链接可达 | 手动检查或 CI 脚本 |
| 代码示例准确性 | 所有"实际代码"示例与真实代码一致 | 月度对比审查 |
| 术语一致性 | 术语表（Ch.21）覆盖文档所有专业术语 | 人工审查 |
| 验收标准覆盖率 | 每个 API 端点至少有一个验收测试 | 检查清单对照 |

### 18.10 非功能性需求

> 权限系统作为安全关键组件，除功能正确性外，必须满足以下非功能性需求。

#### 18.10.1 可观测性（Observability）

| 维度 | 当前状态 | 权限系统补充 |
| --- | --- | --- |
| **Tracing** | ✅ 已集成 OpenTelemetry + Jaeger（`go.opentelemetry.io/otel v1.46.0`） | 权限检查中间件添加 Span 属性（`user_id`、`resource`、`action`、`allowed`），便于追踪单次请求的授权决策链路 |
| **Metrics** | ✅ 已集成 Prometheus（`prometheus/client_golang v1.24.1`） | 新增 `admin_permission_check_duration_seconds`、`admin_login_requests_total` 等指标（参见 [14.2](#142-prometheus-指标)） |
| **Logging** | ✅ 已使用 zap 结构化日志（`go.uber.org/zap v1.28.0`） | 所有权限变更操作写入审计日志（参见 [14.1](#141-审计日志)） |

**权限检查 Span 示例**：

```go
// server/internal/handler/http/casbin_middleware.go

func CasbinMiddleware(enforcer *casbin.Enforcer) gin.HandlerFunc {
    return func(c *gin.Context) {
        tracer := otel.Tracer("admin-server")
        ctx, span := tracer.Start(c.Request.Context(), "casbin.enforce")
        defer span.End()
        
        // ... 权限检查逻辑 ...
        
        span.SetAttributes(
            attribute.String("user.id", userID),
            attribute.String("casbin.resource", resource),
            attribute.String("casbin.action", action),
            attribute.Bool("casbin.allowed", allowed),
        )
        
        if !allowed {
            span.SetStatus(codes.Error, "permission denied")
        }
        
        c.Next()
    }
}
```

#### 18.10.2 可追溯性（Traceability）

| 要求 | 实现方式 | 验收标准 |
| --- | --- | --- |
| **操作审计** | 所有角色/权限变更写入 `audit_logs` 表（参见 [14.1.3](#1413-审计日志查询-api)） | 每条审计记录包含 `operator_id`、`operator_ip`、`event_type`、`details` |
| **变更追踪** | 审计日志的 `details` 字段记录变更前后的值 | 角色更新日志包含 `changed_fields[]` 和 `old_values`/`new_values` |
| **决策链路** | OpenTelemetry Span 关联 JWT 解析 → Casbin 检查 → 响应返回 | 通过 `trace_id` 可在 Jaeger 中查看完整授权链路 |
| **Token 溯源** | Refresh Token 以 SHA-256 哈希存储，每次轮转记录日志 | `admin_auth.refresh_token_reuse_detected` 日志可追溯可疑重放 |

#### 18.10.3 合规性考虑

> 当前 RTC Agent admin 系统面向内部使用，合规要求较低。但若未来对外开放或处理敏感数据，需考虑以下合规要求。

| 合规要求 | 当前满足度 | 未来需要的措施 |
| --- | --- | --- |
| **GDPR 数据最小化** | ⚠️ 部分 — 审计日志可能包含个人信息（IP 地址、邮箱） | 审计日志中的个人信息需设置保留期限（参见 [14.1.4](#1414-审计日志归档策略)）；支持"被遗忘权"（删除用户时同步清理审计日志中的个人信息） |
| **SOC 2 访问控制** | ✅ 已满足 — RBAC + 审计日志 + Token 轮转 | 定期审查权限分配；启用 MFA（多因子认证） |
| **密码合规** | ⚠️ 部分 — bcrypt cost 12 符合当前标准 | 如面向欧盟用户，需符合 BSI TR-02102-1 标准（bcrypt cost ≥ 13） |
| **数据驻留** | ✅ 满足 — PostgreSQL 本地部署 | 如需多云部署，确保权限数据存储在同一地域 |
| **密钥管理** | ⚠️ 部分 — JWT 密钥通过文件挂载 | 生产环境应使用 Vault 或云 KMS 管理 JWT 密钥对 |

### 18.11 合规性详细设计

> **目标**：明确权限系统在数据保护、审计合规、隐私设计方面的合规要求与实现方案。当前面向内部使用，合规要求较低，但需为未来扩展做好准备。

#### 18.11.1 数据保护（GDPR / 个人信息保护法）

**适用范围**：admin-server 处理的个人信息包括管理员邮箱、姓名、IP 地址、登录日志。

| 合规要求 | 当前实现 | 差距 | 改进措施 | 优先级 |
| --- | --- | --- | --- | --- |
| **数据最小化** | 审计日志记录 `operator_id`、`operator_ip` | IP 地址可能超出必要范围 | 开发环境不记录 IP；生产环境仅记录操作日志 | P3 |
| **保留期限** | 审计日志永久保留 | 不符合 GDPR 保留期限要求 | 实现自动归档（参见 [14.1.4](#1414-审计日志归档策略)），默认保留 90 天 | P2 |
| **被遗忘权** | 用户删除时软删除 | 审计日志中的个人信息未清理 | 删除用户时，审计日志中的 `operator_id` 替换为匿名标识 | P3 |
| **数据导出** | 无 | 用户无法导出自己的数据 | 提供 `GET /api/users/:id/export` API，返回用户所有数据 | P3 |
| **加密传输** | HTTPS（由 nginx 或反向代理提供） | admin-server 本身不强制 | 生产环境配置 TLS 证书 | P1 |

**用户删除时的数据清理流程**：

```mermaid
flowchart TD
    A[删除用户请求] --> B{用户有审计日志?}
    B -->|否| C[直接软删除用户]
    B -->|是| D{是否要求 GDPR 合规?}
    D -->|否| E[软删除用户<br/>保留审计日志]
    D -->|是| F[匿名化审计日志<br/>operator_id → anonymous]
    F --> G[清理 user_roles]
    G --> H[清理 Casbin 策略]
    H --> I[清理 refresh_tokens]
    I --> J[软删除用户记录]
    E --> J
    C --> J
    
    style A fill:#f96,stroke:#333
    style J fill:#9f9,stroke:#333
```

#### 18.11.2 审计合规（SOC 2 / 等保 2.0）

| 合规要求 | 实现方式 | 验证方法 |
| --- | --- | --- |
| **唯一身份标识** | 每个管理员使用独立账号（`users.email` 唯一） | 检查 `users` 表无共享账号 |
| **最小权限原则** | RBAC 角色系统，按需分配权限 | 定期审查角色分配（参见 [28.5](#285-安全审计检查清单)） |
| **操作审计** | 所有权限变更写入 `audit_logs` 表 | 审计日志覆盖所有 CRUD 操作 |
| **访问控制** | Casbin 中间件 + JWT 认证 | 无 Token 访问返回 `unauthorized` |
| **会话管理** | Access Token 1h + Refresh Token 7d 轮转 | Token 过期后自动刷新或跳转登录 |
| **异常检测** | 登录失败锁定（5 次 / 15 分钟） | 连续失败后账户锁定 |

#### 18.11.3 隐私设计（PIPL / 个保法）

**当前状态**：admin-server 仅处理管理员账号数据，不涉及 C 端用户个人信息。

**未来注意事项**：

- 如果 admin 系统管理 C 端用户数据，需遵守《个人信息保护法》
- 敏感操作（如批量导出用户数据）需记录审计日志并限制权限
- 个人信息跨境传输需通过安全评估

## 19. 验收标准

> **验收原则**：所有验收测试必须**可执行、可测量、可重复**。由于项目的 `Error()` 函数始终返回 HTTP 200（参见 [2.2.1](#221-error-始终返回-http-200)），前端通过 `errorCode` 判断错误类型，验收测试不能依赖 HTTP 状态码，必须检查响应体。

### 19.0 快速验证脚本

> **用途**：一键执行所有关键验收测试，生成验证报告。

**脚本位置**：`scripts/verify-permission-system.sh`

```bash
#!/bin/bash
# 权限系统验收测试脚本

set -e

BASE_URL="http://localhost:28081"
REPORT_FILE="permission-verification-report.md"

echo "# 权限系统验收测试报告" > $REPORT_FILE
echo "**生成时间**: $(date '+%Y-%m-%d %H:%M:%S')" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# 1. 数据库迁移验证
echo "## 1. 数据库迁移" >> $REPORT_FILE
docker-compose exec postgres psql -U rtc_agent -c "\d roles" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "- ✅ roles 表存在" >> $REPORT_FILE
else
  echo "- ❌ roles 表不存在" >> $REPORT_FILE
fi

# 2. 角色管理 API 验证
echo "" >> $REPORT_FILE
echo "## 2. 角色管理 API" >> $REPORT_FILE

# 创建角色
RESPONSE=$(curl -s -X POST $BASE_URL/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"test-role","display_name":"测试角色"}')
  
if echo $RESPONSE | jq -e '.success == true' > /dev/null; then
  echo "- ✅ POST /api/roles 创建角色成功" >> $REPORT_FILE
  ROLE_ID=$(echo $RESPONSE | jq -r '.data.id')
else
  echo "- ❌ POST /api/roles 创建角色失败" >> $REPORT_FILE
fi

# 查询角色列表
RESPONSE=$(curl -s $BASE_URL/api/roles -H "Authorization: Bearer $TOKEN")
if echo $RESPONSE | jq -e '.success == true and (.data.items | length) > 0' > /dev/null; then
  echo "- ✅ GET /api/roles 查询角色列表成功" >> $REPORT_FILE
else
  echo "- ❌ GET /api/roles 查询角色列表失败" >> $REPORT_FILE
fi

# 删除角色
RESPONSE=$(curl -s -X DELETE $BASE_URL/api/roles/$ROLE_ID \
  -H "Authorization: Bearer $TOKEN")
if echo $RESPONSE | jq -e '.success == true' > /dev/null; then
  echo "- ✅ DELETE /api/roles/:id 删除角色成功" >> $REPORT_FILE
else
  echo "- ❌ DELETE /api/roles/:id 删除角色失败" >> $REPORT_FILE
fi

# 3. 权限检查验证
echo "" >> $REPORT_FILE
echo "## 3. 权限检查" >> $REPORT_FILE

# 无 Token 访问
RESPONSE=$(curl -s $BASE_URL/api/roles)
if echo $RESPONSE | jq -e '.success == false and .errorCode == "unauthorized"' > /dev/null; then
  echo "- ✅ 未认证用户被拦截（unauthorized）" >> $REPORT_FILE
else
  echo "- ❌ 未认证用户未被拦截" >> $REPORT_FILE
fi

# 4. 性能验证
echo "" >> $REPORT_FILE
echo "## 4. 性能验证" >> $REPORT_FILE

# Casbin Enforce 性能
cd server
go test -bench=BenchmarkEnforce_MediumLoad -benchmem -run=^$ ./internal/infra/auth/... > /tmp/bench.log 2>&1
if grep -q "BenchmarkEnforce_MediumLoad.*100000" /tmp/bench.log; then
  echo "- ✅ Casbin Enforce 性能达标（>100K ops/sec）" >> $REPORT_FILE
else
  echo "- ⚠️ Casbin Enforce 性能未达标，需要优化" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE
echo "**验证完成**，详细报告见 $REPORT_FILE"
```

**使用方法**：

```bash
# 1. 确保服务已启动
docker-compose up -d admin-server

# 2. 设置 Token 环境变量
export TOKEN=$(curl -s -X POST http://localhost:28081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}' | jq -r '.data.access_token')

# 3. 执行验收测试
chmod +x scripts/verify-permission-system.sh
./scripts/verify-permission-system.sh

# 4. 查看报告
cat permission-verification-report.md
```

### 19.1 后端验收标准

#### 19.1.1 数据库迁移

- ✅ `migrate` 服务能够成功执行 `./rtc-agent migrate`
- ✅ `users` 表保持不变（不添加新字段）
- ✅ `roles` 表创建成功，包含正确的字段和索引
- ✅ `user_roles` 表创建成功，包含正确的复合主键
- ✅ `casbin_rule` 表由 gorm-adapter 自动创建
- ✅ 引导数据策略执行成功（默认角色和权限已初始化）
- ✅ 迁移脚本可重复执行（幂等性）

**测试用例**：

```bash
# 执行迁移
cd /Users/leichujun/Workspaces/rtc-agent/server
docker-compose run migrate

# 验证表结构
docker-compose exec postgres psql -U rtc_agent -c "\d users"
docker-compose exec postgres psql -U rtc_agent -c "\d roles"
docker-compose exec postgres psql -U rtc_agent -c "\d user_roles"
docker-compose exec postgres psql -U rtc_agent -c "\d casbin_rule"
```

#### 19.1.2 Casbin Enforcer

- ✅ Enforcer 初始化成功
- ✅ 能够从数据库加载策略
- ✅ 能够添加/删除策略
- ✅ 权限检查功能正确

**测试用例**：

```go
// 初始化 Enforcer
enforcer, err := auth.NewAdminCasbinEnforcer(db)
require.NoError(t, err)

// 添加策略
_, err = enforcer.AddPolicy("admin", "user", "read")
require.NoError(t, err)

// 检查权限
allowed, err := enforcer.Enforce("user1", "user", "read")
require.NoError(t, err)
assert.True(t, allowed)
```

#### 19.1.3 角色管理 API

- ✅ `POST /api/roles` 创建角色成功
- ✅ `GET /api/roles` 查询角色列表成功
- ✅ `GET /api/roles/:id` 查询单个角色成功
- ✅ `PUT /api/roles/:id` 更新角色成功
- ✅ `DELETE /api/roles/:id` 删除角色成功
- ✅ 角色名称唯一性约束生效

**测试用例**：

```bash
# 创建角色
curl -X POST http://localhost:28081/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"admin","display_name":"管理员","description":"系统管理员"}'

# 查询角色列表
curl http://localhost:28081/api/roles \
  -H "Authorization: Bearer $TOKEN"

# 更新角色
curl -X PUT http://localhost:28081/api/roles/$ROLE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"display_name":"超级管理员"}'

# 删除角色
curl -X DELETE http://localhost:28081/api/roles/$ROLE_ID \
  -H "Authorization: Bearer $TOKEN"
```

#### 19.1.4 用户-角色关联 API

- ✅ `POST /api/users/:id/roles` 分配角色成功
- ✅ `DELETE /api/users/:id/roles/:roleId` 移除角色成功
- ✅ `GET /api/users/:id/roles` 查询用户角色成功
- ✅ `GET /api/roles/:id/users` 查询角色下的用户成功

**测试用例**：

```bash
# 分配角色
curl -X POST http://localhost:28081/api/users/$USER_ID/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role_ids":["$ROLE_ID1","$ROLE_ID2"]}'

# 查询用户角色
curl http://localhost:28081/api/users/$USER_ID/roles \
  -H "Authorization: Bearer $TOKEN"

# 移除角色
curl -X DELETE http://localhost:28081/api/users/$USER_ID/roles/$ROLE_ID \
  -H "Authorization: Bearer $TOKEN"
```

#### 19.1.5 权限管理 API

- ✅ `POST /api/permissions` 创建权限策略成功
- ✅ `DELETE /api/permissions` 删除权限策略成功
- ✅ `GET /api/permissions` 查询权限列表成功
- ✅ `POST /api/permissions/check` 检查权限成功

**测试用例**：

```bash
# 创建权限策略
curl -X POST http://localhost:28081/api/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin","resource":"user","action":"write"}'

# 检查权限
curl -X POST http://localhost:28081/api/permissions/check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"$USER_ID","resource":"user","action":"write"}'
```

#### 19.1.6 扩展的认证 API

- ✅ `GET /api/auth/me` 返回用户角色信息和权限列表
- ✅ 权限列表格式为 `[{resource, action}]`

**测试用例**：

```bash
# 获取当前用户信息（含角色和权限）
curl -s http://localhost:28081/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .

# 预期响应（data 字段）
{
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
    {"resource": "role", "action": "read"},
    {"resource": "role", "action": "write"}
  ]
}
```

### 19.2 前端验收标准

#### 19.2.1 access.ts 权限计算

- ✅ `access.ts` 基于 `currentUser.permissions` 正确计算权限布尔值
- ✅ 无权限的用户所有权限标志为 `false`
- ✅ 权限数据变化时（如 token 刷新后重新获取用户信息），权限自动更新

**测试用例**：

```typescript
import access from '@/access';

// 有权限的用户
const result = access({
  currentUser: {
    access: 'admin',
    permissions: new Set(['user:read', 'user:write', 'role:read']),
  },
});
expect(result.canAdmin).toBe(true);
expect(result.canUserView).toBe(true);
expect(result.canUserEdit).toBe(true);
expect(result.canUserDelete).toBe(false);
expect(result.canRoleView).toBe(true);
expect(result.canRoleEdit).toBe(false);

// 无权限的用户
const result2 = access({ currentUser: undefined });
expect(result2.canAdmin).toBeFalsy();
```

#### 19.2.2 权限组件（使用 ProComponents Access）

- ✅ `<Access accessible={...}>` 组件正确渲染子元素
- ✅ `accessible=false` 时隐藏内容
- ✅ 与 `useAccess()` hook 配合正确

**测试用例**：

```typescript
import { render, screen } from '@testing-library/react';
import { Access } from '@ant-design/pro-components';

// 测试有权限
render(
  <Access accessible={true}>
    <button>编辑</button>
  </Access>
);
expect(screen.getByText('编辑')).toBeInTheDocument();

// 测试无权限
render(
  <Access accessible={false}>
    <button>删除</button>
  </Access>
);
expect(screen.queryByText('删除')).not.toBeInTheDocument();
```

#### 19.2.3 动态菜单

- ✅ 根据用户权限动态渲染菜单
- ✅ 无权限的菜单项不显示
- ✅ 菜单图标和名称正确

**测试用例**：

```typescript
// 模拟不同角色的用户
const adminUser = { roles: [{ name: 'admin' }] };
const operatorUser = { roles: [{ name: 'operator' }] };

// 管理员看到所有菜单
render(<Menu user={adminUser} />);
expect(screen.getByText('角色管理')).toBeInTheDocument();
expect(screen.getByText('权限管理')).toBeInTheDocument();

// 运营只看到部分菜单
render(<Menu user={operatorUser} />);
expect(screen.getByText('用户列表')).toBeInTheDocument();
expect(screen.queryByText('权限管理')).not.toBeInTheDocument();
```

#### 19.2.4 角色管理页面

- ✅ 角色列表展示正确
- ✅ 创建角色表单功能完整
- ✅ 编辑角色表单功能完整
- ✅ 删除角色确认对话框正常
- ✅ 表单验证正确

**测试用例**：

```typescript
// 创建角色
user.click(screen.getByText('创建角色'));
user.type(screen.getByLabelText('角色名称'), 'admin');
user.type(screen.getByLabelText('显示名称'), '管理员');
user.click(screen.getByText('确定'));
await waitFor(() => {
  expect(screen.getByText('admin')).toBeInTheDocument();
});

// 编辑角色
user.click(screen.getByText('编辑'));
user.clear(screen.getByLabelText('显示名称'));
user.type(screen.getByLabelText('显示名称'), '超级管理员');
user.click(screen.getByText('确定'));
await waitFor(() => {
  expect(screen.getByText('超级管理员')).toBeInTheDocument();
});

// 删除角色
user.click(screen.getByText('删除'));
expect(screen.getByText('确定要删除这个角色吗？')).toBeInTheDocument();
user.click(screen.getByText('确定'));
await waitFor(() => {
  expect(screen.queryByText('admin')).not.toBeInTheDocument();
});
```

#### 19.2.5 权限管理页面

- ✅ 权限策略列表展示正确
- ✅ 创建权限策略表单功能完整
- ✅ 删除权限策略确认对话框正常
- ✅ 表单验证正确

**测试用例**：

```typescript
// 创建权限策略
user.click(screen.getByText('创建权限'));
user.selectOptions(screen.getByLabelText('角色'), 'admin');
user.type(screen.getByLabelText('资源'), 'user');
user.selectOptions(screen.getByLabelText('操作'), 'write');
user.click(screen.getByText('确定'));
await waitFor(() => {
  expect(screen.getByText('admin')).toBeInTheDocument();
  expect(screen.getByText('user')).toBeInTheDocument();
  expect(screen.getByText('write')).toBeInTheDocument();
});
```

### 19.3 集成验收标准

#### 19.3.1 登录流程

- ✅ 用户登录后获取正确的角色信息
- ✅ Token 刷新后角色信息保持不变
- ✅ 登出后权限信息清除

**测试用例**：

```typescript
// 登录
await page.goto('/user/login');
await page.fill('input[name="email"]', 'admin@example.com');
await page.fill('input[name="password"]', 'password');
await page.click('button[type="submit"]');

// 验证菜单
await page.waitForSelector('.ant-menu');
expect(await page.textContent('.ant-menu')).toContain('角色管理');

// 验证权限
await page.goto('/system/roles');
expect(await page.textContent('body')).toContain('角色列表');
```

#### 19.3.2 权限分配流程

- ✅ 管理员创建角色
- ✅ 管理员分配权限策略
- ✅ 管理员分配角色给用户
- ✅ 用户刷新页面后权限生效

**测试用例**：

```typescript
// 管理员创建角色
await page.goto('/system/roles');
await page.click('button:has-text("创建角色")');
await page.fill('input[name="name"]', 'operator');
await page.fill('input[name="displayName"]', '运营');
await page.click('button:has-text("确定")');

// 管理员分配权限
await page.goto('/system/permissions');
await page.click('button:has-text("创建权限")');
await page.selectOption('select[name="role"]', 'operator');
await page.fill('input[name="resource"]', 'user');
await page.selectOption('select[name="action"]', 'read');
await page.click('button:has-text("确定")');

// 用户刷新页面
await page.reload();
await page.waitForSelector('.ant-menu');

// 验证用户看到正确的菜单
expect(await page.textContent('.ant-menu')).toContain('用户列表');
expect(await page.textContent('.ant-menu')).not.toContain('权限管理');
```

### 19.4 性能验收标准

#### 19.4.1 权限检查性能

| 指标 | 目标值 | 测量方法 | 失败处理 |
| --- | --- | --- | --- |
| 单次 Enforce 延迟 | < 1ms（P99） | `go test -bench=BenchmarkEnforce` | 检查策略量，优化 matcher |
| Enforce 吞吐量 | > 100,000 ops/sec | `go test -bench=BenchmarkEnforce -benchtime=10s` | 检查内存分配 |
| Enforcer 初始化 | < 500ms（100 条策略） | `time.Now()` 前后差值 | 检查数据库连接 |
| 策略加载（LoadPolicy） | < 100ms（100 条策略） | `go test -bench=BenchmarkLoadPolicy` | 优化数据库索引 |
| 内存占用 | < 10MB（1000 条策略） | `runtime.MemStats` | 精简策略 |

**自动化验证命令**：

```bash
# 在 CI 中运行性能基准测试
cd server
go test -bench=BenchmarkEnforce -benchmem -run=^$ ./internal/infra/auth/... | \
  grep "BenchmarkEnforce" | \
  awk '{if ($3 > 1000) exit 1}'  # P99 < 1ms (1000 ns/op)
```

#### 19.4.2 API 响应时间

| API 端点 | 目标 P95 | 目标 P99 | 测量方法 |
| --- | --- | --- | --- |
| `GET /api/roles`（20 条/页） | < 100ms | < 200ms | `ab -n 1000 -c 10` 或 k6 |
| `GET /api/roles/:id` | < 50ms | < 100ms | `curl -w '%{time_total}'` |
| `POST /api/roles` | < 200ms | < 300ms | `curl -w '%{time_total}'` |
| `POST /api/users/:id/roles` | < 200ms | < 300ms | `curl -w '%{time_total}'` |
| `GET /api/auth/me`（含权限数据） | < 100ms | < 200ms | `curl -w '%{time_total}'` |
| `GET /api/permissions` | < 100ms | < 200ms | `curl -w '%{time_total}'` |

**自动化验证命令**：

```bash
# 使用 Apache Bench 进行压力测试
ab -n 1000 -c 10 -H "Authorization: Bearer $TOKEN" \
   http://localhost:28081/api/roles

# 预期结果：
# Requests per second: > 100
# Time per request (mean): < 10ms
# Time per request (P95): < 100ms

# 使用 k6 进行更精确的测试
k6 run --vus 10 --duration 30s tests/k6/api-performance.js
```

#### 19.4.3 并发性能

| 场景 | 并发数 | 目标成功率 | 目标 P99 延迟 |
| --- | --- | --- | --- |
| 权限检查（Enforce） | 100 并发 | 100% | < 5ms |
| API 请求（混合读写） | 50 并发 | > 99.9% | < 500ms |
| 批量角色分配（100 用户） | 10 并发 | 100% | < 2s |
| 登录（含密码校验） | 20 并发 | 100% | < 1s |

**前端性能指标**：

| 指标 | 目标值 | 测量方式 |
| --- | --- | --- |
| 首次加载时间（FCP） | < 2s | Lighthouse |
| 可交互时间（TTI） | < 3s | Lighthouse |
| 权限切换延迟（Set 查询） | < 1ms | `performance.now()` |
| Token 刷新 + 权限同步 | < 500ms | `performance.now()` |

### 19.5 安全验收标准

#### 19.5.1 认证安全

- ✅ JWT Token 正确验证
- ✅ 未认证用户无法访问受保护 API
- ✅ Token 过期后自动刷新或跳转登录

**测试用例**：

> **注意**：由于 `Error()` 始终返回 HTTP 200（参见 [2.2.1](#221-error-始终返回-http-200)），测试需检查响应体的 `success` 和 `errorCode` 字段。

```bash
# 无 Token 访问
curl -s http://localhost:28081/api/roles | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "unauthorized" }

# 无效 Token 访问
curl -s -H "Authorization: Bearer invalid" \
   http://localhost:28081/api/roles | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "unauthorized" }

# 过期 Token 访问
curl -s -H "Authorization: Bearer expired" \
   http://localhost:28081/api/roles | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "unauthorized" }
```

#### 19.5.2 授权安全

- ✅ 普通用户无法访问管理员 API
- ✅ 用户无法访问未授权的资源
- ✅ 权限检查中间件正确拦截

**测试用例**：

> **注意**：权限拒绝也通过 HTTP 200 + `success: false` 返回。

```bash
# 普通用户（无 admin 角色）访问管理员 API
curl -s -H "Authorization: Bearer $USER_TOKEN" \
   http://localhost:28081/api/roles | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "forbidden" }

# 用户访问未授权资源（有角色但无对应权限）
curl -s -H "Authorization: Bearer $USER_TOKEN" \
   -X DELETE http://localhost:28081/api/roles/$ROLE_ID | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "forbidden" }
```

#### 19.5.3 数据安全

- ✅ 敏感数据不泄露（密码、Token）
- ✅ SQL 注入防护
- ✅ XSS 防护

**测试用例**：

```bash
# SQL 注入测试
curl -s -X POST http://localhost:28081/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"admin'\'' OR '\''1'\''='\''1","display_name":"测试"}' | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "validation_error", "errorMessage": "..." }

# XSS 测试
curl -s -X POST http://localhost:28081/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","display_name":"测试"}' | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "validation_error", "errorMessage": "..." }
```

#### 19.5.4 边界情况与安全守卫

- ✅ 删除最后一个 admin 角色时，后端返回 `cannot_remove_last_admin` 错误
- ✅ 用户移除自己的 admin 角色时，后端返回 `cannot_remove_self_admin` 错误
- ✅ 创建已存在名称的角色时，后端返回 `role_name_exists` 错误
- ✅ 分配不存在的角色给用户时，后端返回 `role_not_found` 错误
- ✅ 为不存在的角色创建权限策略时，后端返回 `role_not_found` 错误

**测试用例**：

```bash
# 1. 删除最后一个 admin 角色 — 应被拒绝
# 先确保只有一个 admin 用户
ADMIN_ROLE_ID=$(curl -s http://localhost:28081/api/roles \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data.items[] | select(.name=="admin") | .id')

# 尝试删除 admin 角色（当仍有用户持有时）
curl -s -X DELETE "http://localhost:28081/api/roles/$ADMIN_ROLE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "cannot_remove_last_admin" }

# 2. 用户移除自己的 admin 角色 — 应被拒绝
USER_ID=$(curl -s http://localhost:28081/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data.id')

curl -s -X DELETE "http://localhost:28081/api/users/$USER_ID/roles/$ADMIN_ROLE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "cannot_remove_self_admin" }

# 3. 创建重复角色名称 — 应被拒绝
curl -s -X POST http://localhost:28081/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"admin","display_name":"重复管理员"}' | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "role_name_exists" }

# 4. 分配不存在的角色 — 应被拒绝
curl -s -X POST "http://localhost:28081/api/users/$USER_ID/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role_ids":["00000000-0000-0000-0000-000000000000"]}' | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "role_not_found" }
```

#### 19.5.5 多实例与缓存一致性

- ✅ Casbin 策略变更后，其他 admin-server 实例在 30 秒内同步（Redis Pub/Sub）
- ✅ 前端权限缓存在 Token 刷新后自动更新（通过 `/api/auth/me` 重新获取）
- ✅ 管理员修改他人权限后，被修改用户的下次请求即生效（无需等待缓存过期）
- ✅ admin-server 重启后能从数据库重新加载全部 Casbin 策略

**测试用例**：

```bash
# 多实例策略同步验证（需要 2 个 admin-server 实例）

# 实例 1：创建新权限策略
curl -s -X POST http://localhost:28081/api/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"operator","resource":"report","action":"read"}'

# 实例 2：立即检查权限（< 30 秒内应生效）
sleep 2
curl -s -X POST http://localhost:28082/api/permissions/check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"$OPERATOR_USER_ID","resource":"report","action":"read"}' | jq .
# 预期：HTTP 200, { "success": true, "data": { "allowed": true } }

# 前端权限缓存验证
# 1. 管理员在后台给 operator 添加 "user:write" 权限
# 2. operator 用户触发 Token 刷新（等待 access_token 过期或手动 refresh）
# 3. 验证 operator 前端出现编辑按钮
```

#### 19.5.6 权限变更场景与并发操作

- ✅ 用户活跃会话中权限被修改后，下次请求即被正确拦截或放行
- ✅ 管理员并发修改用户角色时，不会出现中间态（事务保证）
- ✅ Token 刷新后权限立即更新（通过 `/api/auth/me` 重新获取角色和权限）
- ✅ Refresh Token 被撤销后，依赖该 Token 的 Access Token 在 TTL 内自然过期
- ✅ 多实例环境下，策略同步延迟 ≤ 30 秒（Redis Pub/Sub）

**测试用例**：

```bash
# 1. 活跃会话权限变更验证
# 步骤 1：用户 A 登录，持有 admin 角色，Token 有效
TOKEN_A=$(curl -s -X POST http://localhost:28081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"userA@example.com","password":"Admin@123"}' | jq -r '.data.access_token')

# 步骤 2：管理员移除用户 A 的 admin 角色
curl -s -X DELETE "http://localhost:28081/api/users/$USER_A_ID/roles/$ADMIN_ROLE_ID" \
  -H "Authorization: Bearer $TOKEN"

# 步骤 3：用户 A 立即尝试访问管理 API（旧 Token 仍有效但权限已变）
sleep 1
curl -s http://localhost:28081/api/roles \
  -H "Authorization: Bearer $TOKEN_A" | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "forbidden" }
# 说明：Casbin Enforcer 内存中的策略已更新（事务内删除了 grouping policy）

# 2. 并发角色修改验证
# 同时为两个用户分配同一角色（并发请求）
(
  curl -s -X POST "http://localhost:28081/api/users/$USER1_ID/roles" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"role_ids":["'$OPERATOR_ROLE_ID'"]}' &
  curl -s -X POST "http://localhost:28081/api/users/$USER2_ID/roles" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"role_ids":["'$OPERATOR_ROLE_ID'"]}' &
  wait
)

# 验证两个用户都正确分配了角色
curl -s "http://localhost:28081/api/roles/$OPERATOR_ROLE_ID/users" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.items | length'
# 预期：包含 user1 和 user2

# 3. Refresh Token 撤销后验证
# 用户 B 登出（撤销 refresh token）
curl -s -X POST http://localhost:28081/api/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$USER_B_REFRESH_TOKEN\"}"

# 用户的 access token 在 TTL（1 小时）内仍可使用（自然过期）
# 但无法刷新新的 access token
sleep 1
curl -s -X POST http://localhost:28081/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$USER_B_REFRESH_TOKEN\"}" | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "refresh_token_revoked" }
```

#### 19.5.7 边界场景补充验收

- ✅ 已禁用角色不能被分配给用户（`POST /api/users/:id/roles` 返回 `role_disabled`）
- ✅ 过期 Refresh Token 并发刷新时，只有一个请求成功返回新 Token，其余返回 `refresh_token_expired` 或 `refresh_token_revoked`
- ✅ 批量分配角色时，如果 `role_ids` 中混有有效和无效 ID，整个请求回滚并返回 `role_not_found`（事务原子性）
- ✅ 并发删除同一角色时，第二次删除返回 `record not found`（幂等保护）
- ✅ 用户持有多个角色时，禁用其中一个角色不影响其他角色的权限

**测试用例**：

```bash
# 1. 已禁用角色不能被分配
# 先禁用 operator 角色
curl -s -X PATCH "http://localhost:28081/api/roles/$OPERATOR_ROLE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_enabled":false}'

# 尝试为已禁用角色分配给用户
curl -s -X POST "http://localhost:28081/api/users/$USER_ID/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"role_ids\":[\"$OPERATOR_ROLE_ID\"]}" | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "role_disabled" }

# 2. 过期 Refresh Token 并发刷新
# 等待 refresh token 过期后，并发发起两次刷新
(
  curl -s -X POST http://localhost:28081/api/auth/refresh \
    -H "Content-Type: application/json" \
    -d "{\"refresh_token\":\"$EXPIRED_REFRESH\"}" &
  curl -s -X POST http://localhost:28081/api/auth/refresh \
    -H "Content-Type: application/json" \
    -d "{\"refresh_token\":\"$EXPIRED_REFRESH\"}" &
  wait
)
# 预期：两次均返回 HTTP 200, { "success": false, "errorCode": "refresh_token_expired" }

# 3. 批量分配混合有效/无效角色 ID — 整个请求应回滚
curl -s -X POST "http://localhost:28081/api/users/$USER_ID/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role_ids":["'$VALID_ROLE_ID'","00000000-0000-0000-0000-000000000000"]}' | jq .
# 预期：HTTP 200, { "success": false, "errorCode": "role_not_found" }
# 验证：VALID_ROLE_ID 也不应被分配（事务回滚）
curl -s "http://localhost:28081/api/users/$USER_ID/roles" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.items[] | select(.id=="'$VALID_ROLE_ID'")'
# 预期：无输出（未被分配）

# 4. 多角色用户禁用其中一个角色
# 用户持有 admin + operator 两个角色
# 禁用 operator 角色
curl -s -X PATCH "http://localhost:28081/api/roles/$OPERATOR_ROLE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_enabled":false}'

# 验证 admin 角色的权限仍然有效
curl -s http://localhost:28081/api/roles \
  -H "Authorization: Bearer $TOKEN" | jq .
# 预期：HTTP 200, { "success": true, ... }（admin 权限未受影响）
```

---

## 20. 向后兼容性

### 20.1 现有用户迁移

> **完整的迁移方案**请参见 [8.5 数据迁移详细设计](#85-数据迁移详细设计)，包括：
>
> - [8.5.1 迁移场景分析](#851-迁移场景分析) — 全新部署 vs 现有环境升级 vs 跨版本升级
> - [8.5.2 现有环境升级流程](#852-现有环境升级流程) — 前置检查、AutoMigrate、数据迁移、Casbin 策略生成
> - [8.5.3 数据清理与修复](#853-数据清理与修复) — 孤儿用户修复、策略重建、重复记录清理
> - [8.5.4 回滚方案](#854-回滚方案) — 从备份恢复、API 兼容性、前端兼容性

**本节仅补充向后兼容层面的考虑**：

**API 向后兼容**：

- `/api/auth/me` 新增 `roles` 和 `permissions` 字段，使用 `omitempty`，旧客户端忽略即可
- 前端 `app.tsx` 使用可选链操作符兼容无 `roles` 字段的场景（默认 `access: 'admin'`）

```typescript
// web-components/packages/admin-ui/src/app.tsx
// 向后兼容：如果没有 roles 字段（旧后端），默认 admin（过渡期所有用户都有完整权限）
access: userInfo.roles
  ? (userInfo.roles.some((r: any) => r.name === 'admin') ? 'admin' : 'user')
  : 'admin',  // 旧后端不返回 roles，默认 admin（权限系统上线前）
// 注：权限系统上线后，后端始终返回 roles 字段，走上面的 some() 分支
```

### 20.2 API 版本管理

**当前方案**：所有 API 都在 `/api/` 路径下，无版本号。

**未来扩展**：如果需要破坏性变更，可以引入 `/api/v2/` 路径。

**向后兼容原则**：

- 新增字段：直接添加，不影响旧客户端
- 删除字段：先标记为 `deprecated`，保留 6 个月
- 修改字段：创建新字段，保留旧字段

### 20.3 前端 Token 刷新兼容性

**问题**：旧版本前端可能没有处理新的 `/api/auth/me` 响应格式。

**方案**：

- 后端保持 `/api/auth/me` 的 `roles` 和 `permissions` 字段为可选
- 前端 `app.tsx` 使用可选链操作符（`?.`）访问新字段

---

## 21. 术语表

| 术语 | 英文 | 定义 |
| --- | --- | --- |
| RBAC | Role-Based Access Control | 基于角色的访问控制。用户通过角色获得权限，角色是用户和权限之间的中间层 |
| Casbin | - | 开源的访问控制框架，支持 RBAC、ABAC 等多种模型。本项目使用 Casbin v2 Go 版本 |
| Enforcer | - | Casbin 的核心组件，负责加载策略并执行权限检查。策略存储在内存中，通过 Adapter 持久化 |
| gorm-adapter | - | Casbin 的 GORM 适配器，将策略存储到关系数据库（PostgreSQL）的 `casbin_rule` 表 |
| Policy | - | Casbin 中的权限策略，格式为 `(角色, 资源, 操作)`，存储在 `casbin_rule` 表的 `p` 类型行 |
| Grouping Policy | - | Casbin 中的角色继承关系，格式为 `(用户, 角色)`，存储在 `casbin_rule` 表的 `g` 类型行 |
| Access Token | - | JWT 格式的短效令牌（当前配置 1 小时，生产环境建议缩短至 15 分钟），存储在 `localStorage`，每次请求通过 `Authorization` header 发送 |
| Refresh Token | - | 不透明字符串（非 JWT），32 字节随机数 + `rt_` 前缀，以 SHA-256 哈希存储，7 天有效期，每次刷新轮转 |
| Bootstrap | - | 引导数据策略。首次部署时自动创建默认角色（admin、operator、viewer）和权限策略 |
| admin-server | - | 后台管理系统的 Go 后端服务，监听 `:8081`，提供用户、角色、权限管理 API |
| admin-ui | - | 后台管理系统的前端 SPA，基于 React + Ant Design Pro + Umi Max |
| routeResourceMap | - | Casbin 中间件的路由→资源映射表，将 Gin 路由模式（如 `/api/roles/:id`）映射为 Casbin 资源名（如 `role`） |
| methodActionMap | - | Casbin 中间件的 HTTP 方法→动作映射表，将 HTTP 方法（GET/POST/PUT/DELETE）映射为 Casbin 动作（read/write/delete） |
| permissionSet | - | 前端缓存的权限集合（`Set<string>`），格式为 `resource:action`，用于 O(1) 权限查询 |
| `access.ts` | - | Ant Design Pro 的权限定义文件，导出一个函数，根据 `currentUser` 计算权限布尔值 |
| `useAccess` | - | Ant Design Pro 的权限检查 Hook，返回 `access.ts` 定义的权限布尔值 |
| `<Access>` | - | Ant Design Pro 的权限组件，根据 `accessible` prop 控制子元素的显隐 |
| Error() | - | 项目的统一错误响应函数，始终返回 HTTP 200 + `{ success: false, errorCode, errorMessage }` |
| UUID v7 | - | 基于时间戳的 UUID，具有时间排序性。项目约定所有新模型使用 UUID v7 作为主键 |
| 软删除 | Soft Delete | 通过 `deleted_at` 字段标记删除，而非物理删除。注意：项目的 `*time.Time` 类型不会被 GORM 自动过滤 |

---

## 22. 扩展性设计

> **目标**：当前权限系统采用固定的 `(resource, action)` 二维模型，满足 MVP 需求。本章讨论未来可能的扩展方向，包括权限维度扩展、多租户支持、自定义 matcher 等。

### 22.1 权限维度扩展

#### 22.1.1 当前模型限制

**当前权限模型**（二维）：

```text
Permission = (Role, Resource, Action)
示例: (admin, user, read)
```

**限制场景**：

- ❌ 无法表达"用户只能编辑自己创建的资源"
- ❌ 无法表达"只能在工作时间访问"
- ❌ 无法表达"只能从公司 IP 访问"
- ❌ 无法表达"每个部门只能访问自己的数据"

#### 22.1.2 扩展方案对比

| 方案 | 描述 | 复杂度 | 适用场景 | 推荐度 |
| --- | --- | --- | --- | --- |
| A. 固定二维模型（当前） | `(resource, action)` | 低 | 简单权限需求 | ✅ MVP 推荐 |
| B. Casbin 自定义 matcher | 在 matcher 中添加条件 | 中 | 数据级权限 | ✅ 按需扩展 |
| C. ABAC 混合模型 | 属性基访问控制 | 高 | 复杂环境权限 | ⚠️ 未来扩展 |
| D. 外部授权服务 | 独立的授权服务（如 OPA） | 极高 | 微服务架构 | ❌ 过度设计 |

#### 22.1.3 方案 B：Casbin 自定义 matcher（推荐扩展路径）

**场景**：用户只能编辑自己创建的资源。

**Casbin 模型扩展**：

```ini
# conf/casbin_model_with_owner.conf

[request_definition]
r = sub, obj, act, owner  # ✅ 新增 owner 字段

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
# ✅ 自定义 matcher：允许 owner 访问自己的资源
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act && (r.owner == r.sub || p.sub == "admin")
```

**代码实现**：

```go
// server/internal/infra/auth/casbin.go

// EnforceWithOwner 检查权限时传入资源所有者
func EnforceWithOwner(enforcer *casbin.Enforcer, userID, resource, action, resourceOwner string) (bool, error) {
    return enforcer.Enforce(userID, resource, action, resourceOwner)
}

// 使用示例
func UpdateArticle(ctx context.Context, userID uuid.UUID, articleID uuid.UUID, data *Article) error {
    // 1. 查询文章
    article, err := articleRepo.GetByID(ctx, articleID)
    if err != nil {
        return err
    }
    
    // 2. 权限检查（传入文章所有者）
    allowed, _ := enforcer.Enforce(
        userID.String(),      // 当前用户
        "article",            // 资源类型
        "write",              // 操作
        article.OwnerID.String(), // 资源所有者
    )
    
    if !allowed {
        return ErrForbidden
    }
    
    // 3. 更新文章
    return articleRepo.Update(ctx, articleID, data)
}
```

**优势**：

- ✅ 复用 Casbin 基础设施，无需引入新组件
- ✅ 灵活的 matcher 表达式，可支持多种场景
- ✅ 性能影响小（matcher 在内存中执行）

**劣势**：

- ⚠️ Casbin 模型定义复杂度增加
- ⚠️ 需要修改 Enforce 调用，传入额外参数

#### 22.1.4 方案 C：ABAC 混合模型（未来扩展）

**场景**：基于用户属性、环境属性的动态权限。

**ABAC 模型示例**：

```go
// ABAC 属性定义
type AccessContext struct {
    // 用户属性
    UserID       string
    UserRoles    []string
    Department   string
    Level        int
    
    // 资源属性
    ResourceType string
    ResourceID   string
    OwnerID      string
    Sensitivity  string  // "public", "internal", "confidential"
    
    // 环境属性
    Time         time.Time
    IP           string
    Location     string
}

// ABAC 策略引擎
func EvaluateABAC(ctx *AccessContext) (bool, error) {
    // 规则 1：工作时间（9:00-18:00）才允许访问
    hour := ctx.Time.Hour()
    if hour < 9 || hour >= 18 {
        return false, nil
    }
    
    // 规则 2：机密资源只有高级用户可以访问
    if ctx.Sensitivity == "confidential" && ctx.Level < 5 {
        return false, nil
    }
    
    // 规则 3：只能从公司 IP 访问
    if !isCompanyIP(ctx.IP) {
        return false, nil
    }
    
    // 规则 4：部门隔离（只能访问自己部门的数据）
    if ctx.ResourceType == "department_data" && ctx.OwnerID != ctx.Department {
        return false, nil
    }
    
    return true, nil
}
```

**推荐框架**：

- [Casbin ABAC](https://casbin.org/docs/abac)
- [Open Policy Agent (OPA)](https://www.openpolicyagent.org/)

**实施建议**：

- 当二维模型无法满足需求时，先尝试方案 B（自定义 matcher）
- 只有当需要复杂的环境属性（时间、IP、位置）时，才考虑方案 C（ABAC）
- ABAC 建议引入独立的授权服务，而非嵌入 Casbin

### 22.2 多租户支持

#### 22.2.1 当前架构限制

**当前架构**：单租户（所有用户共享同一权限空间）。

**限制**：

- ❌ 无法支持 SaaS 模式（多个组织共用 admin-server）
- ❌ 无法实现组织间数据隔离
- ❌ 无法为不同组织定制权限模型

#### 22.2.2 多租户扩展方案

##### 方案 A：逻辑隔离（推荐）

在现有表中添加 `tenant_id` 字段，通过应用层过滤实现隔离。

**数据模型变更**：

```go
// 在 [5.4.2 节](#542-roles-表新增) Role 模型基础上添加 TenantID 字段
type Role struct {
    ID          uuid.UUID
    TenantID    string    `gorm:"size:100;not null;index"` // ✅ 新增：租户 ID
    Name        string    `gorm:"size:100;not null"`
    DisplayName string
    // ... 其他字段与 5.4.2 节一致
}

// 唯一性约束变为：(tenant_id, name)
// CREATE UNIQUE INDEX idx_roles_tenant_name ON roles(tenant_id, name);
```

**查询变更**：

```go
// 所有查询都需要带 tenant_id 过滤
func (r *roleRepo) List(ctx context.Context, tenantID string) ([]Role, error) {
    var roles []Role
    err := DBFromContext(ctx, r.db).
        Where("tenant_id = ?", tenantID).  // ✅ 租户隔离
        Find(&roles).Error
    return roles, err
}
```

**优势**：

- ✅ 实现简单，改动量小
- ✅ 性能影响小（索引优化）
- ✅ 适合中小规模（< 1000 租户）

**劣势**：

- ⚠️ 应用层必须始终过滤 `tenant_id`（容易遗漏）
- ⚠️ 数据隔离依赖应用逻辑，非数据库层面

##### 方案 B：物理隔离

每个租户独立的数据库 schema 或独立的数据库实例。

**优势**：

- ✅ 强隔离，数据安全
- ✅ 可独立备份和恢复

**劣势**：

- ❌ 实现复杂，需要动态数据源
- ❌ 资源消耗大（每租户一个连接池）
- ❌ 运维成本高

**推荐**：

- MVP 和中小规模：方案 A（逻辑隔离）
- 大型企业或合规要求：方案 B（物理隔离）

#### 22.2.3 Casdoor 的多租户设计参考

**参考**：[`casdoor/object/role.go`](../casdoor/object/role.go)

```go
// Casdoor Role 模型
type Role struct {
    Owner       string   `json:"owner"`       // ✅ 组织 ID（租户）
    Name        string   `json:"name"`
    DisplayName string   `json:"displayName"`
    Domains     []string `json:"domains"`     // ✅ 域（进一步细分）
    // ... 其他字段
}

// 查询时过滤 Owner
func GetRoles(owner string) ([]*Role, error) {
    roles := []*Role{}
    err := adapter.Engine.Where("owner = ?", owner).Find(&roles)
    return roles, err
}
```

**可借鉴**：

- `Owner` 字段作为租户标识
- `Domains` 字段支持更细粒度的隔离（可选）

### 22.3 角色继承与层级

#### 22.3.1 当前模型

**当前**：支持单级角色继承（通过 Casbin `g` 类型）。

```text
g, user1, roleA  # user1 拥有 roleA
g, roleA, roleB  # roleA 继承 roleB（roleA 拥有 roleB 的权限）
```

**限制**：

- ❌ 没有显式的继承层级管理
- ❌ 无法查询"角色的子角色有哪些"
- ❌ 无法限制继承深度

#### 22.3.2 扩展方案

**数据模型**（添加角色继承表）：

```go
// RoleInheritance 角色继承关系
type RoleInheritance struct {
    ParentRoleID uuid.UUID `gorm:"type:uuid;primaryKey"`
    ChildRoleID  uuid.UUID `gorm:"type:uuid;primaryKey"`
    InheritedAt  time.Time `json:"inherited_at"`
}

// 示例：admin 继承 operator，operator 继承 viewer
// (admin, operator), (operator, viewer)
```

**管理 API**：

```text
POST   /api/roles/:id/children        # 添加子角色
DELETE /api/roles/:id/children/:childId # 移除子角色
GET    /api/roles/:id/descendants      # 查询所有后代角色
GET    /api/roles/:id/ancestors        # 查询所有祖先角色
```

**限制继承深度**：

```go
// 防止循环继承和过深继承
const MaxInheritanceDepth = 3

func (uc *RoleUsecase) AddChildRole(ctx context.Context, parentID, childID uuid.UUID) error {
    // 1. 检查是否形成循环
    if isCycle(uc.db, parentID, childID) {
        return ErrCycleInheritance
    }
    
    // 2. 检查继承深度
    depth := calculateDepth(uc.db, childID)
    if depth >= MaxInheritanceDepth {
        return ErrInheritanceTooDeep
    }
    
    // 3. 添加继承关系
    return uc.db.Create(&RoleInheritance{
        ParentRoleID: parentID,
        ChildRoleID:  childID,
    }).Error
}
```

### 22.4 权限过期与临时权限

#### 22.4.1 场景

- 临时授予某人管理员权限（24小时后自动撤销）
- 项目期间授予访问权限（项目结束后自动撤销）
- 紧急访问权限（需要审批，72小时后失效）

#### 22.4.2 数据模型扩展

```go
// UserRole 添加过期时间
type UserRole struct {
    UserID     uuid.UUID  `gorm:"type:uuid;primaryKey"`
    RoleID     uuid.UUID  `gorm:"type:uuid;primaryKey"`
    AssignedAt time.Time  `json:"assigned_at"`
    ExpiresAt  *time.Time `json:"expires_at,omitempty"` // ✅ 过期时间（NULL 表示永不过期）
}
```

**自动过期任务**：

```go
// server/internal/usecase/permission_expiry.go（新增）

// PermissionExpiryChecker 定期检查过期的权限
type PermissionExpiryChecker struct {
    db       *gorm.DB
    enforcer *casbin.Enforcer
    ticker   *time.Ticker
}

func (c *PermissionExpiryChecker) Start() {
    c.ticker = time.NewTicker(1 * time.Hour)  // 每小时检查一次
    go func() {
        for range c.ticker.C {
            c.checkExpiredPermissions()
        }
    }()
}

func (c *PermissionExpiryChecker) checkExpiredPermissions() {
    now := time.Now()
    
    // 查询已过期的 user_roles
    var expired []UserRole
    c.db.Where("expires_at IS NOT NULL AND expires_at < ?", now).Find(&expired)
    
    for _, ur := range expired {
        // 1. 删除 user_role 记录
        c.db.Delete(&ur)
        
        // 2. 删除 Casbin 策略
        c.enforcer.RemoveGroupingPolicy(ur.UserID.String(), ur.RoleID.String())
        
        // 3. 记录审计日志
        logger.Info(context.Background(), "permission_expired",
            zap.String("user_id", ur.UserID.String()),
            zap.String("role_id", ur.RoleID.String()),
            zap.Time("expired_at", *ur.ExpiresAt),
        )
    }
}
```

**分配临时权限 API**：

```bash
# 分配角色，24小时后过期
POST /api/users/:id/roles
Content-Type: application/json

{
    "role_ids": ["<role-uuid>"],
    "expires_in": "24h"  // ✅ 可选：过期时间（相对时间或绝对时间）
}

# 或指定绝对时间
{
    "role_ids": ["<role-uuid>"],
    "expires_at": "2026-10-06T18:00:00Z"
}
```

### 22.5 扩展性决策清单

**何时考虑扩展**：

| 需求 | 当前方案是否满足 | 扩展建议 |
| --- | --- | --- |
| 数据级权限（用户只能访问自己的数据） | ❌ | 方案 B：自定义 matcher |
| 时间/环境权限（工作时间、公司 IP） | ❌ | 方案 C：ABAC 模型 |
| 多租户（SaaS 模式） | ❌ | 逻辑隔离（tenant_id） |
| 角色层级管理 | ⚠️ 部分 | 添加角色继承表 |
| 临时权限 | ❌ | 添加 expires_at 字段 |

**扩展优先级**：

1. **短期（6个月内）**：如果需要数据级权限，实施方案 B（自定义 matcher）
2. **中期（6-12个月）**：如果需要多租户，实施逻辑隔离
3. **长期（1年后）**：根据业务发展决定是否引入 ABAC

**扩展时的注意事项**：

- ✅ 保持向后兼容：新字段使用可选（`omitempty`）或默认值
- ✅ 数据库迁移：使用 GORM AutoMigrate，只做 additive 变更
- ✅ 性能测试：扩展后重新运行性能基准测试
- ✅ 文档更新：更新本文档的相应章节

---

## 23. 版本历史

> 本文档从 v1.0 开始，经过多次迭代不断完善。每轮迭代聚焦特定主题，逐步覆盖权限系统设计的各个方面。

| 版本 | 日期 | 主要变更 |
| --- | --- | --- |
| v1.0 | 2026-10-04 | 初始版本：背景与目标、现有系统分析、Casdoor 参考架构、系统设计方案、数据库设计、API 设计、前端集成方案、部署与迁移、引导数据策略 |
| v1.1 | 2026-10-04 | 修复章节编号错误和重复章节；修复 Mermaid 图中 HTTP 状态码、OAuth2 密码策略描述；补充 GORM 软删除行为说明 |
| v1.2 | 2026-10-05 | 补充 Casbin 中间件资源/动作映射表（`routeResourceMap`/`methodActionMap`）；完善引导数据策略的幂等性保证 |
| v1.3 | 2026-10-05 | 新增安全策略（Ch.11）：密码策略、登录保护、CSRF/XSS 防护、Rate Limiting；新增错误处理与边界情况（Ch.12）；新增性能优化（Ch.13）；新增监控与日志（Ch.14）；新增灾难恢复（Ch.15） |
| v1.4 | 2026-10-05 | 新增测试策略（Ch.16）；新增与 RTC Agent 主系统集成（Ch.17）；补充实施计划的风险点与缓解措施；新增术语表（Ch.21） |
| v1.5 | 2026-10-05 | 新增完整的 RESTful API 设计规范与请求/响应示例；新增统一的错误码体系（按严重程度分级）；补充数据库迁移的详细步骤与版本控制策略；补充前端权限控制的详细实现 |
| v1.6 | 2026-10-05 | 新增数据迁移详细设计（8.5）；新增权限调试与排查工具（14.4）；新增性能基准测试详细设计（13.2.1）；新增扩展性设计（22.1-22.5）；新增前端权限缓存刷新策略（7.7）；新增前端权限控制高级场景（7.8）；新增权限变更通知机制（7.9）；新增国际化 i18n 支持设计（7.10）；大幅扩展审计日志设计（14.1）；新增团队分工与协作方案（18.6）；新增权限系统可配置性分析（18.7） |
| v1.7 | 2026-10-05 | 修复 Chapter 19 缺失 H2 标题头；消除 12.5 与 6.0.1 错误码表重复（改为交叉引用）；修复破损交叉引用（18.3 中 "20.1" → "8.5.2"）；消除 20.1 与 8.5 数据迁移重复；改进目录导航；修复审计日志表 UUID 生成与 GORM 兼容性；合并 13.2.1 与 16.5 重复基准测试内容；新增并发控制与分布式锁设计（12.6）；完善附录检查清单（增加自动化验证项）；补充章节编号（24-25） |
| v1.8 | 2026-10-05 | 新增 Section 0（文档约定）；修复 Ch.3.5 casbin.js 误导性标注；修复 Ch.20.1 向后兼容代码逻辑错误；更新 Ch.2.3 前端技术栈（React 19 + antd v6 + Biome + Vitest）；增强灰度发布详细设计（Feature Flag + 监控指标 + 回滚触发条件）；新增质量控制与代码审查机制（18.8）；新增文档维护计划（18.9）；增强验收标准量化指标 |
| v1.9 | 2026-10-05 | 修复 Ch.2.3 前端目录树重复条目；修复 Ch.4.2 后端依赖（明确 Casbin 为"待添加"+ 具体版本号）；修复 Ch.14.4.2 调试 API 代码（同包函数调用、sanitizeBindingError、结构化日志）；修复 Ch.12.6 乐观锁（ErrConflict sentinel error 需新增说明、错误包装格式）；修复 Ch.18.2.2 灰度配置（AdminConfig 需新增 Features 段）；扩展 Ch.2.2.4 Repo 模式（完整 sentinel errors 列表、IsDuplicateKeyError） |
| **v2.0** | **2026-10-05** | **修复 Ch.4.2/Ch.18.4 Go 版本（1.27.0）；扩展 Ch.2.2.4 sentinel errors 完整清单（5 个新增错误）；修复 Ch.3.3.2/3.3.3/3.4.1-3.4.3 Casdoor 文件引用（authz/ + controllers/）；修复 Ch.12.2 并发创建使用 IsDuplicateKeyError() 项目约定；新增 Ch.18.5.1 任务依赖图与关键路径分析；新增 Ch.18.10 非功能性需求（可观测性/可追溯性/合规性）** |
| v2.1 | 2026-10-05 | 修复 Ch.21 术语表 Access Token TTL（"15 分钟"→"1 小时"，与实际 `admin.yaml` 配置一致）；修复 Ch.7.6 Token 刷新同步延迟（"15 分钟"→"1 小时"）；修复 Ch.25 检查清单 sentinel errors（`ErrLastAdminRole`→`ErrCannotRemoveLastAdmin`，补全 5 个新增错误）；修复 Ch.14.4.2 DebugHandler.RegisterRoutes（传入 jwtAuth 参数替代不存在的 `h.JWTAuthMiddleware()`）；修复 Ch.18.5.1 重复章节号 → 18.5.2；修复 Ch.2.1 配置文件引用（`admin.go`→`admin_config.go`+`admin_config_loader.go`）；修复 Ch.4.3.1 目录树重复 `repo/` 段 |
| v2.2 | 2026-10-05 | 修复全部 27 处 MD032 警告（列表前后空行）；整合重复代码（`access.ts`、`Role` 结构体、`getInitialState`）改为交叉引用；新增 Ch.2.2.6 代码现状说明（`requestErrorConfig.ts` 两套 401 处理逻辑） |
| **v2.3** | **2026-10-05** | **修复全部 17 处 MD040 + 25 处 MD031 + 2 处 MD051 警告；修复 Ch.6.0 JSON 无效注释；修复 Ch.19.5.3 错误预期响应（`400` → HTTP 200 + `errorCode`）；新增 Ch.19.5.4 边界情况验收（最后 admin 保护、自删除保护）；新增 Ch.19.5.5 多实例与缓存一致性验收；Ch.25 检查清单补充 3 项任务 + 前端锚点链接统一** |
| **v2.4** | **2026-10-05** | **修复 Ch.23 版本历史排序（v1.7-v1.9 移至正确位置）；修复 Ch.11.4/Ch.12.11 HTTP 状态码错误（→ HTTP 200 + errorCode）；补充 Ch.2.2.4 sentinel error `ErrCannotRemoveSelfAdmin`；修复 Ch.12.1 角色删除矛盾（软删除→禁用+级联清理）；增强 Ch.14.2 中间件安全说明；补充 Ch.14.2 audit-logs 路由映射；新增 Ch.19.5.6 权限变更场景验收；新增 Ch.26 决策记录** |
| **v2.5** | **2026-10-05** | **新增 ADR-006~009（Redis Pub/Sub 同步、Token 存储方案、引导数据策略、冗余存储）；新增 Ch.27 快速入门指南（5 分钟环境搭建、API 调用示例、3 个开发场景、7 个 FAQ）；新增 Ch.28 实施经验总结（实施顺序图、10 项常见陷阱、PR 模板、性能优化、安全审计清单）；修复 10 处 MD036 警告** |
| **v2.6** | **2026-10-05** | **修复 Ch.25 前端检查清单交叉引用（7.2/7.4/7.5 节）；修复 Ch.27.3 标题层级（MD036）；新增 Ch.28.6 故障排除指南（12 项运行时问题诊断表 + 权限异常排查决策树 + 数据不一致修复流程 + 紧急回滚操作手册）；新增 Ch.28.7 性能调优指南（Enforcer 缓存、数据库连接池、索引优化、前端 Set 数据结构、监控告警配置）；新增 Ch.18.11 合规性详细设计（GDPR 数据保护 + SOC 2 审计合规 + PIPL 隐私设计）；细化 Ch.18.5.1 阶段一/二任务分解** |
| **v2.7** | **2026-10-05** | **新增 Ch.29 开发者速查卡（项目结构总览、关键文件索引、常用命令、错误码映射表、API 模板、Git 提交规范）；新增 Ch.30 最佳实践指南（后端错误处理/事务管理/日志规范/Repo 模式、前端权限组件复用/状态管理/性能优化、安全实践输入校验/Token 管理/CSP 配置）；扩展 Ch.27.4 FAQ 新增 5 个问题（Q8-Q12：OAuth2 密码策略、角色继承权限计算、审计日志查询、权限变更回退、批量操作性能）；新增 Ch.19.5.7 边界场景补充验收（已禁用角色分配、并发刷新、批量混合 ID、多角色禁用）；修正 Ch.8.2 迁移代码注释；修正 Ch.4.3.1 后端模块文件列表** |

---

## 24. 参考资料

### Casbin 官方文档

- 官网：<https://casbin.org/>
- GitHub：<https://github.com/casbin/casbin>
- Go 文档：<https://pkg.go.dev/github.com/casbin/casbin/v2>

### Casdoor 项目

- GitHub：<https://github.com/casdoor/casdoor>
- 本地路径：`~/Workspaces/rtc-agent/casdoor`
- 核心代码：
  - 数据模型：[`casdoor/object/`](../casdoor/object/)
  - API 路由：[`casdoor/routers/`](../casdoor/routers/)
  - 权限检查：[`casdoor/authz/`](../casdoor/authz/)

### gorm-adapter

- GitHub：<https://github.com/casbin/gorm-adapter>

### casbin.js（参考，不直接使用）

- GitHub：<https://github.com/casbin/casbin.js>
- 文档：<https://casbin.org/docs/frontend/>
- **备注**：本项目前端权限使用 Ant Design Pro 内置的 `@umijs/plugin-access`，不直接依赖 casbin.js

---

## 25. 附录：检查清单

> 此清单用于实施阶段追踪进度。每项任务完成后勾选，并在 PR 描述中注明对应的验收标准章节号。

### 后端

- [ ] 添加 Casbin 依赖（`go get github.com/casbin/casbin/v2`、`go get github.com/casbin/gorm-adapter/v3`）
- [ ] 新增 sentinel errors 到 `repo/errors.go`（`ErrConflict`、`ErrDuplicateName`、`ErrCannotRemoveLastAdmin`、`ErrCannotDeleteSystemRole`、`ErrRoleDisabled`、`ErrCannotRemoveSelfAdmin`）— 参见 [2.2.4](#224-repo-接口模式)
- [ ] 实现最后一个 admin 角色删除保护（`ErrCannotRemoveLastAdmin`）— 参见 [19.5.4](#195-安全验收标准)
- [ ] 实现用户自删除 admin 角色保护（`ErrCannotRemoveSelfAdmin`）— 参见 [19.5.4](#195-安全验收标准)
- [ ] 实现 Redis Pub/Sub 策略同步（`PolicyWatcher`：订阅 + 发布 + 重加载）— 参见 [26 ADR-006](#adr-006多实例策略同步使用-redis-pubsub)
- [ ] 创建 `model/role.go`（UUID v7、TableName、BeforeCreate）— 参见 [5.4.2](#542-roles-表新增)
- [ ] 创建 `model/user_role.go`（复合主键）— 参见 [5.4.3](#543-user_roles-表新增)
- [ ] 创建 `infra/auth/casbin.go`（Enforcer 初始化）— 参见 [5.2](#52-casbin-模型配置)
- [ ] 修改 `cmd/migrate.go`（添加 Role/UserRole AutoMigrate + BootstrapAdmin）— 参见 [8.2](#82-数据库迁移适配)
- [ ] 创建 `repo/role_repo.go`、`repo/user_role_repo.go`（接口模式 + sentinel errors）— 参见 [2.2.4](#224-repo-接口模式)
- [ ] 创建 `usecase/role.go`、`usecase/permission.go`
- [ ] 创建 `handler/http/role.go`、`handler/http/permission.go`、`handler/http/user_role.go`
- [ ] 创建 `handler/http/casbin_middleware.go`（权限检查中间件 + `routeResourceMap`）— 参见 [14.2](#142-prometheus-指标)
- [ ] 扩展 `/api/auth/me` 返回 `roles[]` + `permissions[]` — 参见 [6.5](#65-前端权限查询合并到-apiauthme)
- [ ] 实现 `BootstrapAdmin()`（幂等引导策略）— 参见 [9.3](#93-引导伪代码)
- [ ] 实现 `MigrateToPermissionSystem()`（现有系统升级）— 参见 [8.5.2](#852-现有环境升级流程)
- [ ] 实现审计日志写入（关键操作）— 参见 [14.1.3](#1413-审计日志查询-api)
- [ ] 实现 Rate Limiting 中间件 — 参见 [11.6](#116-rate-limiting全局限流)
- [ ] 实现登录保护（IP + 邮箱双重锁定）— 参见 [11.2.1](#1121-登录失败锁定)
- [ ] 单元测试（覆盖率 ≥ 90% usecase，≥ 80% repo）— 参见 [16.2](#162-单元测试)
- [ ] 集成测试（角色 CRUD 全流程、权限中间件）— 参见 [16.3](#163-集成测试)
- [ ] 性能基准测试（Enforce > 100K ops/sec）— 参见 [13.2.1](#1321-性能基准测试详细设计)
- [ ] Casbin 中间件添加 OpenTelemetry Span（`user_id`/`resource`/`action`/`allowed`）— 参见 [18.10.1](#18101-可观测性observability)
- [ ] 实现 Redis Pub/Sub 多实例策略同步（策略变更后 30 秒内全实例生效）— 参见 [19.5.5](#195-安全验收标准)

### 前端

- [ ] 修改 `app.tsx`（从 API 获取角色/权限，构建 permissionSet）— 参见 [7.2 节](#72-修改-apptsx--从-api-获取权限)
- [ ] 修改 `access.ts`（基于角色的动态权限定义）— 参见 [7.3 节](#sec-7-3)
- [ ] 修改 `config/routes.ts`（添加系统管理路由 + access 字段）— 参见 [7.4 节](#74-路由配置--使用-access-字段)
- [ ] 实现角色管理页面（`pages/system/roles/`）— 参见 [19.2.4 节](#19-验收标准)
- [ ] 实现权限管理页面（`pages/system/permissions/`）— 参见 [19.2.5 节](#19-验收标准)
- [ ] 实现按钮级权限控制（`useAccess` + `<Access>`）— 参见 [7.5 节](#75-按钮级权限控制--使用-useaccess)
- [ ] 实现 Token 刷新时的权限同步 — 参见 [7.7](#77-前端权限缓存刷新策略)
- [ ] 添加 i18n 翻译文件（`locales/zh-CN/permission.ts`）— 参见 [7.10](#710-国际化i18n支持)
- [ ] 前端单元测试（`access.test.ts` 覆盖率 100%）— 参见 [16.2.2](#1622-前端单元测试)

### 部署与运维

- [ ] 更新 `docker-compose.yml`（admin-server depends_on migrate）— 参见 [8.1 节](#81-docker-composeyml-配置)
- [ ] 验证迁移流程（空数据库 + 现有环境升级）— 参见 [8.5.2](#852-现有环境升级流程)
- [ ] 配置 Prometheus 告警规则 — 参见 [14.3](#143-告警规则)
- [ ] 配置 Grafana 仪表盘 — 参见 [14.2](#142-prometheus-指标)
- [ ] 编写回滚脚本 — 参见 [8.5.4](#854-回滚方案)
- [ ] E2E 测试（Playwright）— 参见 [16.4](#164-e2e-测试)

### 质量控制（参见 [18.8](#188-质量控制与代码审查)）

- [ ] CI Pipeline 配置自动化检查（编译、lint、测试、覆盖率）— 参见 [18.8.2](#1882-自动化检查清单ci-pipeline)
- [ ] PR 模板包含权限系统审查清单 — 参见 [18.8.3](#1883-人工审查清单)
- [ ] 安全检查由至少两人确认 — 参见 [18.8.4](#1884-安全检查专项)
- [ ] 性能基准测试集成到 CI（退化 >20% 告警）— 参见 [13.2.1](#1321-性能基准测试详细设计)

### 灰度发布（参见 [18.2](#182-灰度发布策略)）

- [ ] 配置 `features.permission_system` 灰度开关 — 参见 [18.2.2](#1822-灰度策略实现)
- [ ] 配置监控指标告警规则（登录成功率、权限检查延迟）— 参见 [18.2.3](#1823-监控指标与回滚触发条件)
- [ ] 编写回滚操作手册 — 参见 [18.2.3](#1823-监控指标与回滚触发条件)
- [ ] 验证灰度开关关闭时旧模式正常工作

### 文档维护（参见 [18.9](#189-文档维护计划)）

- [ ] 本文档通过团队 review
- [ ] 建立文档更新提醒（每个权限系统 PR 合并后检查本文档）
- [ ] 交叉引用有效性检查（所有 `#anchor` 链接可达）

---

## 26. 附录：决策记录（ADR）

> 本章记录权限系统设计过程中的关键架构决策，采用 [Architecture Decision Record](https://adr.github.io/) 格式。每个决策记录包含：背景、决策、替代方案、后果。

### ADR-001：选择 Casbin 作为权限引擎

**状态**：已接受

**背景**：RTC Agent admin 系统需要 RBAC 权限控制，支持角色管理、权限分配、权限检查。需要选择一个 Go 语言的权限引擎。

**决策**：使用 Casbin v2 + gorm-adapter v3。

**替代方案**：

| 方案 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- |
| Casbin v2（选择） | 成熟稳定、文档丰富、支持多种模型、社区活跃 | 学习成本中等 | **采用** |
| OPA（Open Policy Agent） | 表达能力极强、独立于语言 | 引入额外服务、复杂度过高 | 过度设计 |
| 自研 RBAC | 完全控制 | 开发周期长、容易出错 | 不值得 |
| go-policy | 轻量 | 不成熟、文档少 | 风险高 |

**后果**：

- Casbin 策略存储在 `casbin_rule` 表，通过 gorm-adapter 持久化
- Enforcer 内存加载策略，性能 > 100K ops/sec
- 未来如需更复杂的权限模型（如 ABAC），Casbin 支持自定义 matcher 扩展

### ADR-002：使用 UUID v7 作为所有新模型主键

**状态**：已接受

**背景**：权限系统新增 `roles`、`user_roles`、`audit_logs` 等表，需要确定主键策略。

**决策**：所有新模型使用 UUID v7 作为主键，通过 GORM `BeforeCreate` 钩子自动生成。

**替代方案**：

| 方案 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- |
| UUID v7（选择） | 时间有序、分布式生成、与现有模型一致 | 占用 16 字节 | **采用** |
| 自增整数 | 占用小、查询快 | 分布式困难、信息泄露 | 不适合 |
| ULID | 时间有序、更短 | 生态不如 UUID | 不一致 |

**后果**：

- 主键生成在应用层（`BeforeCreate`），无需数据库序列
- UUID v7 的时间有序性保证 B-tree 索引效率
- 与现有 `User`、`AdminRefreshToken` 等模型保持一致

### ADR-003：Casbin 中间件 allow-by-default 策略

**状态**：已接受（附安全警告）

**背景**：Casbin 权限中间件需要处理路由映射：当路由不在 `routeResourceMap` 中时，应该默认允许还是默认拒绝？

**决策**：选择 allow-by-default（默认允许）。未映射的路由跳过权限检查。

**替代方案**：

| 方案 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- |
| Allow-by-default（选择） | 公共路由无需配置、开发便利 | 新路由忘记注册则默认放行 | **采用**（MVP） |
| Deny-by-default | 更安全、fail-close | 每个新路由必须先注册映射 | 未来改进方向 |

**后果**：

- 公共路由（`/health`、`/api/auth/login`、`/api/auth/refresh`）无需在 `routeResourceMap` 注册
- **风险**：新增管理 API 路由如果忘记在 `routeResourceMap` 中注册，会默认放行
- **缓解**：代码审查清单、启动时日志、单元测试覆盖（参见中间件代码旁的安全警告）
- **未来**：权限系统稳定后可考虑切换到 deny-by-default

### ADR-004：Error() 始终返回 HTTP 200

**状态**：已接受（项目约定）

**背景**：admin-server 的 `Error()` 函数接受 `statusCode int` 参数但始终返回 HTTP 200，将真实错误状态放在 JSON body 的 `errorCode` 字段中。

**决策**：遵循项目约定，所有 API 错误响应使用 HTTP 200 + `{ success: false, errorCode, errorMessage }`。

**替代方案**：

| 方案 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- |
| HTTP 200 + errorCode（选择） | 前端统一处理、无需处理多种 HTTP 状态码 | 不符合 REST 惯例、HTTP 缓存不友好 | **采用**（项目约定） |
| 真实 HTTP 状态码 | 符合 REST 惯例 | 需要改前端拦截器、与现有代码不一致 | 破坏兼容性 |

**后果**：

- 前端 `responseInterceptors` 统一检查 `data?.errorCode` 处理错误
- 文档中所有 curl 示例和验收测试用例必须使用 HTTP 200 + errorCode 格式
- 文档中 `Error(c, http.StatusForbidden, ...)` 的 `statusCode` 参数仅作语义标注，实际不生效

### ADR-005：软删除使用 `*time.Time` 而非 `gorm.DeletedAt`

**状态**：已接受（项目约定）

**背景**：项目的 `User`、`AdminRefreshToken` 等模型使用 `DeletedAt *time.Time` 字段标记软删除。

**决策**：继续使用 `*time.Time` 类型，不使用 GORM 内置的 `gorm.DeletedAt` 类型。

**后果**：

- GORM **不会自动过滤**已软删除的记录（`DeletedAt` 为 `*time.Time` 时不触发软删除过滤）
- 查询时必须手动添加 `WHERE deleted_at IS NULL` 条件
- 权限系统新增的 `roles` 表不使用软删除，使用 `is_enabled` 标志位替代
- 这是项目已有约定（参见 `model/user.go`、`model/admin_refresh_token.go`）

### ADR-006：多实例策略同步使用 Redis Pub/Sub

**状态**：已接受

**背景**：admin-server 可能部署多个实例（如 Docker Swarm 或 Kubernetes），每个实例的 Casbin Enforcer 在内存中维护策略副本。当管理员在一个实例上修改策略时，其他实例需要同步更新。

**决策**：使用 Redis Pub/Sub 进行策略变更通知，每个实例订阅 `casbin:policy:changes` channel。

**替代方案**：

| 方案 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- |
| Redis Pub/Sub（选择） | 实现简单、延迟低（< 100ms）、Redis 已有 | 消息不持久化（实例宕机期间丢失） | **采用** |
| Redis Stream | 消息持久化、支持消费者组 | 实现复杂、需要处理消费确认 | 过度设计 |
| 数据库轮询 | 无额外依赖 | 延迟高（秒级）、数据库压力大 | 性能差 |
| 分布式锁 + 数据库 | 强一致 | 实现复杂、性能瓶颈 | 不值得 |

**后果**：

- 策略变更流程：实例 A 写 DB → 发布消息 → 实例 B/C 收到消息 → 重新加载策略
- **消息丢失场景**：如果实例在宕机期间有策略变更，重启后需从数据库全量重新加载（实现为启动时 `enforcer.LoadPolicy()`）
- 消息格式：JSON `{ "action": "add_policy" | "remove_policy", "policy": [...], "timestamp": "..." }`
- 参考实现：Casbin 官方 [redis-watcher](https://github.com/casbin/redis-watcher)

**伪代码**：

```go
// server/internal/infra/auth/policy_watcher.go

type PolicyWatcher struct {
    rdb      *redis.Client
    enforcer *casbin.Enforcer
    channel  string
}

func NewPolicyWatcher(rdb *redis.Client, enforcer *casbin.Enforcer) *PolicyWatcher {
    return &PolicyWatcher{
        rdb:      rdb,
        enforcer: enforcer,
        channel:  "casbin:policy:changes",
    }
}

// Subscribe 监听策略变更（后台 goroutine）
func (w *PolicyWatcher) Subscribe(ctx context.Context) {
    sub := w.rdb.Subscribe(ctx, w.channel)
    ch := sub.Channel()
    
    for msg := range ch {
        var event PolicyChangeEvent
        if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
            logger.Error(ctx, "policy_watcher.invalid_message", zap.Error(err))
            continue
        }
        
        // 重新加载策略（简单但有效）
        if err := w.enforcer.LoadPolicy(); err != nil {
            logger.Error(ctx, "policy_watcher.reload_failed", zap.Error(err))
        } else {
            logger.Info(ctx, "policy_watcher.policy_reloaded",
                zap.String("action", event.Action),
                zap.Time("timestamp", event.Timestamp),
            )
        }
    }
}

// Publish 发布策略变更（在策略修改后调用）
func (w *PolicyWatcher) Publish(ctx context.Context, action string, policy []string) error {
    event := PolicyChangeEvent{
        Action:    action,
        Policy:    policy,
        Timestamp: time.Now(),
    }
    data, _ := json.Marshal(event)
    return w.rdb.Publish(ctx, w.channel, data).Err()
}
```

### ADR-007：Token 存储在 localStorage（非 HttpOnly Cookie）

**状态**：已接受（附带安全缓解措施）

**背景**：admin-server 需要将 Access Token 存储在客户端。常见选择：localStorage 或 HttpOnly Cookie。

**决策**：使用 localStorage 存储 Access Token，通过 `Authorization: Bearer <token>` header 发送。

**替代方案**：

| 方案 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- |
| localStorage（选择） | 实现简单、无 CSRF 风险、跨域友好 | XSS 风险（Token 可被 JavaScript 读取） | **采用** |
| HttpOnly Cookie | 防 XSS（JavaScript 无法读取） | 需要 CSRF 防护、跨域配置复杂 | 复杂度高 |

**后果**：

- **XSS 缓解措施**（必须实施）：
  1. 严格的 CSP header（参见 [11.5](#115-xss-防护)）
  2. React JSX 自动转义（默认行为，禁止 `dangerouslySetInnerHTML`）
  3. 输入过滤（后端对所有用户输入进行转义）
  4. 定期安全审计（检查 XSS 漏洞）
- **Access Token TTL 建议**：生产环境缩短至 15 分钟（当前 1 小时），减少 XSS 攻击窗口
- **未来改进**：如果安全要求提升，可迁移到 HttpOnly Cookie + CSRF Token 方案

### ADR-008：引导数据使用代码内嵌（非配置文件）

**状态**：已接受

**背景**：首次部署时需要创建默认角色（admin、operator、viewer）和权限策略。引导数据的定义方式有两种：代码内嵌或配置文件。

**决策**：使用代码内嵌（Go 常量 + 函数），不使用外部配置文件（YAML/JSON）。

**替代方案**：

| 方案 | 优点 | 缺点 | 结论 |
| --- | --- | --- | --- |
| 代码内嵌（选择） | 类型安全、编译检查、与迁移一起执行 | 修改需要重新编译 | **采用** |
| YAML/JSON 配置文件 | 无需重新编译 | 无类型检查、需要额外加载逻辑、容易出错 | 复杂度高 |
| SQL 脚本 | 数据库层面保证 | 不便携、难以维护、与 GORM 不一致 | 不适合 |

**后果**：

- 引导数据定义在 `server/internal/usecase/bootstrap.go`（常量 + `BootstrapAdmin()` 函数）
- 在 `cmd/migrate.go` 的 `runMigrate()` 末尾调用（参见 [8.2](#82-数据库迁移适配)）
- 幂等性保证：先检查 `roles` 表是否为空，只在空表时执行（参见 [9.3](#93-引导伪代码)）
- **修改引导数据**：修改代码后重新构建二进制，下次迁移时自动应用（对已有数据无影响）

### ADR-009：Casbin 策略与角色表的冗余存储

**状态**：已接受

**背景**：权限数据存在两个地方：`roles`/`user_roles` 业务表 + `casbin_rule` Casbin 策略表。两者存在数据冗余。

**决策**：采用"业务表为主、Casbin 表为辅"的冗余策略。业务表存储角色和用户关系，Casbin 表存储权限检查所需的策略。

**理由**：

| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| 只用 Casbin 表 | 无冗余、简单 | 无法查询角色详情、无法管理用户关系、无法审计 |
| 只用业务表 | 业务友好 | 需要自己实现 Enforce 逻辑、重复造轮子 |
| **两者结合（选择）** | 业务表管理、Casbin 检查 | 需要保证一致性（事务） |

**后果**：

- **数据一致性**：角色/权限变更必须在**同一事务**内同时更新 `roles`/`user_roles` 和 `casbin_rule`
- **查询路径**：
  - 管理页面：查询 `roles`/`user_roles` 表（业务友好）
  - 权限检查：查询 Casbin Enforcer 内存（高性能）
- **引导策略**：`BootstrapAdmin()` 同时创建业务数据和 Casbin 策略
- **同步机制**：策略变更时，先更新业务表 → 再更新 Casbin 策略 → 发布 Redis Pub/Sub 通知（参见 ADR-006）

---

## 27. 附录：快速入门指南

> **目标**：为开发者提供 5 分钟快速上手权限系统的指南。涵盖本地开发环境搭建、第一次 API 调用、常见开发场景。

### 27.1 本地环境搭建

**前置条件**：

- Docker + Docker Compose
- Go 1.27+
- Node.js 22+

#### 步骤 1：启动基础设施

```bash
cd /Users/leichujun/Workspaces/rtc-agent/server

# 启动 PostgreSQL + Redis（后台）
docker-compose up -d postgres redis

# 等待数据库健康检查通过
docker-compose ps  # 确认 postgres 和 redis 状态为 "healthy"
```

#### 步骤 2：执行数据库迁移

```bash
# 运行迁移（创建表 + 引导数据）
go run . migrate

# 验证表已创建
docker-compose exec postgres psql -U rtc_agent -c "\dt"
# 应该看到：users, roles, user_roles, casbin_rule, audit_logs
```

#### 步骤 3：启动 admin-server

```bash
# 启动服务
go run . admin serve

# 服务启动在 http://localhost:8081
```

#### 步骤 4：创建第一个管理员

```bash
# 创建 admin 用户（使用 CLI）
go run . admin account create \
  --email=admin@example.com \
  --password=Admin@123 \
  --name=Admin
```

#### 步骤 5：登录并获取 Token

```bash
# 调用登录 API
curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}' | jq .

# 保存 access_token 供后续使用
export TOKEN=$(curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}' | jq -r '.data.access_token')
```

### 27.2 第一次 API 调用

**创建角色**：

```bash
curl -s -X POST http://localhost:8081/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"operator","display_name":"操作员","description":"负责日常运营"}' | jq .

# 预期响应：
# {
#   "success": true,
#   "data": {
#     "id": "01912345-...",
#     "name": "operator",
#     "display_name": "操作员",
#     "is_enabled": true
#   }
# }
```

**查询角色列表**：

```bash
curl -s http://localhost:8081/api/roles \
  -H "Authorization: Bearer $TOKEN" | jq .

# 预期：返回 admin + operator 两个角色（admin 是引导数据自动创建的）
```

**为用户分配角色**：

```bash
# 先查询用户 ID
USER_ID=$(curl -s http://localhost:8081/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data.id')

# 分配 operator 角色
OPERATOR_ROLE_ID=$(curl -s http://localhost:8081/api/roles \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data.items[] | select(.name=="operator") | .id')

curl -s -X POST "http://localhost:8081/api/users/$USER_ID/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"role_ids\":[\"$OPERATOR_ROLE_ID\"]}" | jq .
```

**检查权限**：

```bash
curl -s -X POST http://localhost:8081/api/permissions/check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"$USER_ID\",\"resource\":\"user\",\"action\":\"read\"}" | jq .

# 预期：{ "success": true, "data": { "allowed": true } }
```

### 27.3 常见开发场景

#### 场景 1：新增一个受保护的 API

假设要新增"导出用户数据"API `GET /api/users/export`。

##### 步骤 1：在 `routeResourceMap` 注册路由映射

```go
// server/internal/handler/http/casbin_middleware.go

var routeResourceMap = map[string]string{
    // ... 现有映射
    "/api/users/export": "user",  // ✅ 新增
}
```

##### 步骤 2：在 `methodActionMap` 确认 HTTP 方法映射

```go
// server/internal/handler/http/casbin_middleware.go

var methodActionMap = map[string]string{
    "GET":    "read",   // ✅ GET 映射为 read
    "POST":   "write",
    "PUT":    "write",
    "DELETE": "delete",
}
```

##### 步骤 3：创建角色权限策略

```bash
# 为 admin 角色添加 user:read 权限（导出是 read 操作）
curl -s -X POST http://localhost:8081/api/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin","resource":"user","action":"read"}'
```

##### 步骤 4：代码审查检查

- ✅ 路由是否在 `routeResourceMap` 注册？
- ✅ 受保护 API 是否经过 Casbin 中间件？
- ✅ 单元测试覆盖权限检查？

#### 场景 2：排查用户权限问题

用户反馈"我无法访问角色管理页面"。

**排查步骤**：

```bash
# 1. 查询用户的角色
./rtc-agent admin debug user-permissions --user-id=<用户ID>

# 2. 检查特定权限
./rtc-agent admin debug check-permission \
  --user-id=<用户ID> \
  --resource=role \
  --action=read

# 3. 查看 Casbin 策略列表
./rtc-agent admin debug list-policies --type=p

# 4. 重建策略（如果策略不同步）
./rtc-agent admin debug rebuild-policies --dry-run
```

#### 场景 3：前端权限控制

在 admin-ui 中新增"删除用户"按钮，仅 admin 可见。

```typescript
// src/pages/users/index.tsx
import { useAccess, Access } from '@umijs/max';

export default function UsersPage() {
  const access = useAccess();
  
  return (
    <div>
      <h1>用户管理</h1>
      
      {/* 删除按钮：仅 admin 可见 */}
      <Access accessible={access.canDeleteUser} fallback={null}>
        <Button danger onClick={handleDelete}>
          删除用户
        </Button>
      </Access>
    </div>
  );
}
```

```typescript
// src/access.ts — 定义 canDeleteUser
export default function access(initialState) {
  const { currentUser } = initialState ?? {};
  const permissionSet = new Set(currentUser?.permissions || []);
  
  return {
    canAdmin: permissionSet.has('user:write'),
    canDeleteUser: permissionSet.has('user:delete'),
    // ... 其他权限
  };
}
```

### 27.4 常见开发问题 FAQ

#### Q1：为什么我新增的 API 没有被权限检查拦截？

**原因**：API 路由没有在 `routeResourceMap` 中注册，导致 Casbin 中间件默认放行（allow-by-default）。

**解决**：在 [`casbin_middleware.go`](../server/internal/handler/http/casbin_middleware.go) 的 `routeResourceMap` 中添加路由映射。

#### Q2：为什么我修改了权限，但用户仍然可以访问？

**原因**：多实例环境下，其他实例的 Casbin 策略未同步。

**解决**：检查 Redis Pub/Sub 是否正常工作。重启实例或调用 `/api/debug/rebuild-policies` 强制重新加载策略。

#### Q3：为什么 `DELETE /api/users/:id/roles/:roleId` 返回 `cannot_remove_last_admin`？

**原因**：用户只有一个 admin 角色，移除后系统将没有管理员。

**解决**：先为其他用户分配 admin 角色，或禁用角色而非直接移除。参见 [12.1](#121-角色删除的级联处理)。

#### Q4：为什么前端菜单没有根据权限显示？

**原因**：`access.ts` 的权限定义与后端返回的 `permissions[]` 不匹配。

**解决**：检查 `access.ts` 中的权限 key（如 `user:read`）是否与后端一致。使用浏览器 DevTools 查看 `/api/auth/me` 返回的 `permissions[]`。

#### Q5：如何在不重启服务的情况下更新权限策略？

**方案**：权限变更会立即生效（同一实例内），多实例环境通过 Redis Pub/Sub 同步（≤ 30 秒）。无需重启服务。

#### Q6：引导数据策略什么时候执行？

**回答**：在 `rtc-agent migrate` 命令执行时，如果 `roles` 表为空，则自动创建默认角色和权限。如果表非空，跳过引导。参见 [9.3](#93-引导伪代码)。

#### Q7：如何调试 Casbin 权限检查？

**方案**：使用调试 CLI 命令或调试 API。参见 [14.4](#144-权限调试与排查工具)。

```bash
# CLI 命令
./rtc-agent admin debug check-permission --user-id=<ID> --resource=user --action=write

# 调试 API
curl -X POST http://localhost:8081/api/debug/check-permission \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"user_id":"<ID>","resource":"user","action":"write"}'
```

#### Q8：通过 OAuth2 登录的用户需要设置密码吗？密码策略是否适用？

**回答**：OAuth2 用户（`provider` + `subject` 认证）不需要设置密码，`password_hash` 字段为空。密码策略（最小长度 8、复杂度要求、bcrypt cost 12）仅适用于邮箱+密码登录的本地用户。

**扩展场景**：如果 OAuth2 用户需要降级为本地登录（解除 OAuth2 绑定），管理员需先为其设置密码（`PATCH /api/users/:id/password`），密码需满足标准密码策略。

#### Q9：角色继承场景下，如何计算用户的最终权限？

**回答**：当前设计（v2.7）采用扁平 RBAC 模型，不支持角色继承。用户的最终权限是其所有启用角色权限的**并集**。

```text
用户权限 = ⋃ { role.permissions | role ∈ user.roles AND role.is_enabled = true }
```

**示例**：用户持有 `operator`（`user:read`, `user:write`）和 `auditor`（`audit_log:read`）两个角色，最终权限为 `{user:read, user:write, audit_log:read}`。

**未来扩展**：如需角色继承（层级 RBAC），Casbin 原生支持 `role_hierarchy` 模型。实现路径：

1. 在 `roles` 表添加 `parent_id` 字段
2. Casbin 模型增加 `[role_definition]` 的 `g = _, _` 层次关系
3. 详见 [22.2 多租户支持](#222-多租户支持) 中的扩展性说明

#### Q10：如何查询审计日志？支持哪些筛选条件？

**回答**：审计日志通过 `GET /api/audit-logs` 查询，支持以下筛选条件：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `actor_id` | UUID | 操作者 ID |
| `resource_type` | string | 资源类型（`role`, `user`, `permission`） |
| `action` | string | 操作类型（`create`, `update`, `delete`, `assign`, `revoke`） |
| `target_id` | UUID | 目标资源 ID |
| `start_time` | RFC3339 | 时间范围起点 |
| `end_time` | RFC3339 | 时间范围终点 |
| `page` / `page_size` | int | 分页参数 |

**示例**：

```bash
# 查询过去 7 天所有角色删除操作
curl -s "http://localhost:8081/api/audit-logs?resource_type=role&action=delete&start_time=2026-09-28T00:00:00Z" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

**注意**：审计日志表（`audit_logs`）数据量可能较大，建议配合时间范围查询，避免全表扫描。参见 [14.1.3](#1413-审计日志查询-api)。

#### Q11：权限变更后发现问题，如何快速回退？

**回答**：权限系统提供三种回退机制：

1. **Casbin 策略重建**（推荐）：通过 Debug API 或 CLI 重建所有策略

```bash
# 从业务表（roles/user_roles）重建全部 Casbin 策略
./rtc-agent admin debug rebuild-policies --dry-run  # 先预览差异
./rtc-agent admin debug rebuild-policies             # 执行重建
```

1. **数据库备份恢复**：如果策略重建无法解决问题（如数据被误删），从最近的数据库备份恢复

```bash
# 恢复前备份当前数据
pg_dump -U rtc_agent rtc_agent > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复（危险！会覆盖所有数据）
psql -U rtc_agent rtc_agent < backup_20261005_120000.sql
```

1. **审计日志追踪**：通过 `audit_logs` 表查找变更历史，手动逆转操作

```bash
# 查询最近的角色权限变更
curl -s "http://localhost:8081/api/audit-logs?resource_type=permission&action=update" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.items'
```

#### Q12：批量操作（如分配 100 个用户角色）性能如何优化？

**回答**：批量操作需注意以下性能要点：

| 批量规模 | 推荐方式 | 预期耗时 |
| --- | --- | --- |
| ≤ 10 条 | 单个 API 请求（`role_ids` 数组） | < 100ms |
| 10-100 条 | 循环调用单条 API + 适当间隔（10ms） | 1-10s |
| > 100 条 | 批量 API（`POST /api/users/batch-roles`） | < 5s |

**批量 API 设计**（待实现，参见 [6.4 用户-角色关联 API](#64-用户-角色关联-api新增)）：

```bash
# 为多个用户批量分配角色
curl -s -X POST "http://localhost:8081/api/users/batch-roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_ids": ["uuid1", "uuid2", "..."],
    "role_ids": ["role-uuid1", "role-uuid2"]
  }'
```

**性能注意事项**：

- 批量操作在单个数据库事务中执行，保证原子性
- Casbin 策略同步通过 Redis Pub/Sub 仅发送一次通知（非逐条通知）
- 前端批量操作建议显示进度条，避免用户重复提交

---

## 28. 附录：实施经验总结

> **目标**：总结权限系统实施过程中的经验教训，帮助后续开发者避免常见陷阱。

### 28.1 实施顺序建议

**推荐的实施顺序**（按依赖关系）：

```mermaid
graph TD
    A[1. 数据库表创建] --> B[2. 引导数据策略]
    B --> C[3. 角色管理 API]
    C --> D[4. 权限管理 API]
    D --> E[5. Casbin 中间件]
    E --> F[6. 用户-角色关联 API]
    F --> G[7. 前端权限集成]
    G --> H[8. 审计日志]
    H --> I[9. 调试工具]
    I --> J[10. 安全加固]
    
    style A fill:#90EE90
    style E fill:#FFD700
    style J fill:#FFB6C1
```

**关键路径**：1 → 2 → 3 → 5 → 7（后端基础设施 → 前端集成）

**并行开发机会**：

- 4（权限管理）和 6（用户-角色关联）可以并行
- 8（审计日志）和 9（调试工具）可以在后期并行
- 10（安全加固）必须在所有功能完成后进行

### 28.2 常见陷阱与避免方法

| 陷阱 | 后果 | 避免方法 |
| --- | --- | --- |
| 忘记在 `routeResourceMap` 注册新路由 | 新 API 默认放行（安全风险） | 代码审查清单 + 单元测试覆盖 |
| 业务表和 Casbin 表不一致 | 权限检查错误 | 同一事务内更新两者 + 定期重建策略 |
| 前端权限缓存未刷新 | 用户看到过期权限 | Token 刷新时重新获取 `/api/auth/me` |
| 多实例策略不同步 | 不同实例权限不一致 | Redis Pub/Sub + 重启时全量加载 |
| 引导数据幂等性失败 | 重复创建角色 | 检查表是否为空 + 事务保证原子性 |
| 最后一个 admin 被移除 | 系统无法管理 | 代码守卫（`ErrCannotRemoveLastAdmin`） |
| 自删除 admin 角色 | 管理员锁定自己 | 代码守卫（`ErrCannotRemoveSelfAdmin`） |
| SQL 注入（拼接 SQL） | 数据泄露 | 始终使用 GORM 参数化查询 |
| XSS（`dangerouslySetInnerHTML`） | Token 被窃取 | 禁止使用 + CSP header |
| 性能退化（策略量过大） | 权限检查变慢 | 监控策略数量 + 定期清理 |

### 28.3 代码审查最佳实践

**每个权限系统 PR 必须检查**：

1. **安全性**：新增路由是否在 `routeResourceMap` 注册？
2. **一致性**：业务表和 Casbin 表是否同时更新？
3. **错误处理**：是否使用 `Error()` + 统一错误码？
4. **日志完整性**：权限变更操作是否记录审计日志？
5. **测试覆盖**：核心逻辑是否有单元测试？
6. **向后兼容**：新字段是否使用 `omitempty`？
7. **前端权限**：权限控制是否基于后端 `permissions[]`？

**示例 PR 描述模板**：

```markdown
## 变更描述
新增"导出用户数据"API（GET /api/users/export）

## 权限检查
- ✅ 已在 `routeResourceMap` 注册（映射到 `user:read`）
- ✅ 已在 Casbin 中间件保护下
- ✅ 已添加单元测试（`TestExportUsers_Permission`）
- ✅ 已记录审计日志

## 向后兼容
- ✅ 新增 API，不影响现有功能

## 验收标准
- ✅ admin 角色可以导出
- ✅ viewer 角色无法导出（返回 `forbidden`）
- ✅ 无 Token 访问返回 `unauthorized`

## 文档更新
- ✅ 已更新 Ch.6（API 设计）
- ✅ 已更新 Ch.19（验收标准）
```

### 28.4 性能优化经验

**Casbin Enforcer 性能**：

- 策略量 < 1000 条：内存占用 < 1MB，检查延迟 < 1ms
- 策略量 1000-10000 条：内存占用 < 10MB，检查延迟 < 5ms
- 策略量 > 10000 条：考虑分片或精简策略

**数据库查询优化**：

- 使用 JOIN 查询用户角色（避免 N+1）
- 为 `user_roles.user_id` 和 `user_roles.role_id` 添加索引
- 定期清理过期的审计日志

**前端性能**：

- 使用 `Set<string>` 存储权限（O(1) 查询）
- 避免在 render 循环中计算权限
- 使用 `useMemo` 缓存权限计算结果

### 28.5 安全审计检查清单

**每季度进行一次安全审计**：

- [ ] 检查所有 admin 用户的角色分配（是否有不必要的权限）
- [ ] 审查审计日志（是否有异常操作）
- [ ] 验证 Token 轮转机制正常工作
- [ ] 检查 SQL 注入防护（所有查询是否参数化）
- [ ] 检查 XSS 防护（是否有 `dangerouslySetInnerHTML`）
- [ ] 验证 CSP header 配置正确
- [ ] 检查 rate limiting 配置是否合理
- [ ] 审查角色权限分配（是否有过度授权）
- [ ] 验证最后一个 admin 保护正常工作
- [ ] 检查 Casbin 策略与业务表一致性

### 28.6 故障排除指南

> **目标**：为运维和开发人员提供运行时常见问题的快速诊断与修复方案。本节补充 [14.4.3](#1443-常见权限问题诊断流程) 的诊断流程图，聚焦于实际操作。

#### 28.6.1 运行时问题诊断表

| 问题现象 | 可能原因 | 诊断命令 | 修复方案 | 严重程度 |
| --- | --- | --- | --- | --- |
| 所有用户无法登录 | DB 连接失败或 Redis 不可用 | `docker-compose ps` 检查 postgres/redis 状态 | 重启基础设施服务 | P0 |
| 特定用户无法登录 | 用户被软删除或密码错误 | `./rtc-agent admin debug user-permissions --user-id=<ID>` | 恢复用户或重置密码 | P1 |
| 登录后菜单为空 | `/api/auth/me` 未返回 `roles`/`permissions` | `curl -s /api/auth/me -H "Authorization: Bearer $TOKEN" \| jq '.data.roles'` | 检查引导数据是否执行、用户是否分配角色 | P1 |
| 管理员无法创建角色 | Casbin Enforcer 初始化失败 | 检查 admin-server 启动日志 `casbin_enforcer_init_failed` | 重启 admin-server | P1 |
| 角色创建成功但权限不生效 | 业务表与 Casbin 表不一致 | `./rtc-agent admin debug rebuild-policies --dry-run` | `./rtc-agent admin debug rebuild-policies --force` | P2 |
| 多实例权限不一致 | Redis Pub/Sub 消息丢失或延迟 | 检查 Redis `SUBSCRIBE casbin:policy:changes` | 重启实例触发全量加载 | P2 |
| 前端按钮显示但操作被拒 | 前端 `access.ts` 与后端权限不同步 | 浏览器 DevTools 查看 `/api/auth/me` 返回 | 清除 localStorage 重新登录 | P2 |
| Token 刷新失败 | Refresh Token 被撤销或过期 | `curl -s /api/auth/refresh -d '{"refresh_token":"..."}'` | 用户重新登录 | P1 |
| 删除角色报 `cannot_remove_last_admin` | 尝试删除最后一个 admin 角色的最后一个用户 | `./rtc-agent admin debug role-permissions --role-name=admin` | 先为其他用户分配 admin 角色 | P3 |
| API 响应慢（> 1s） | 数据库慢查询或 Casbin 策略量过大 | `EXPLAIN ANALYZE` 查询 + `GET /api/debug/policies` | 优化索引或精简策略 | P2 |
| 内存占用持续增长 | Casbin 策略泄漏或数据库连接池未释放 | `runtime.MemStats` + `SHOW STAT` | 重启服务 + 检查连接池配置 | P1 |
| 审计日志查询超时 | 审计表数据量过大未归档 | `SELECT COUNT(*) FROM audit_logs` | 执行归档（参见 [14.1.4](#1414-审计日志归档策略)） | P3 |

#### 28.6.2 权限异常排查决策树

```mermaid
flowchart TD
    A[收到权限问题报告] --> B{用户能否登录?}
    
    B -->|不能| C{所有用户还是特定用户?}
    C -->|所有| C1[检查基础设施<br/>postgres/redis 是否健康]
    C -->|特定| C2[检查用户状态<br/>deleted_at 是否为空]
    C2 --> C3{用户存在?}
    C3 -->|否| C4[创建用户]
    C3 -->|是| C5{deleted_at 为空?}
    C5 -->|否| C6[恢复用户<br/>UPDATE users SET deleted_at = NULL]
    C5 -->|是| C7[检查密码/OAuth2]
    
    B -->|能| D{后端返回正确权限?}
    D -->|否| D1[检查 roles/user_roles 表<br/>SELECT * FROM user_roles WHERE user_id = ?]
    D1 --> D2{有角色?}
    D2 -->|否| D3[分配角色]
    D2 -->|是| D4[检查 Casbin 策略<br/>GET /api/debug/policies]
    D4 --> D5{策略完整?}
    D5 -->|否| D6[重建策略<br/>./rtc-agent admin debug rebuild-policies --force]
    D5 -->|是| D7[检查 /api/auth/me 逻辑<br/>是否正确查询角色和权限]
    
    D -->|是| E{前端正确渲染?}
    E -->|否| E1[清除 localStorage<br/>重新登录]
    E1 --> E2{仍异常?}
    E2 -->|是| E3[检查 access.ts<br/>权限 key 是否匹配]
    E2 -->|否| E4[缓存问题<br/>已解决]
    E -->|是| F[检查 Casbin 中间件<br/>routeResourceMap 是否包含路由]
    
    style A fill:#f96,stroke:#333
    style C4 fill:#9f9,stroke:#333
    style C6 fill:#9f9,stroke:#333
    style D3 fill:#9f9,stroke:#333
    style D6 fill:#9f9,stroke:#333
    style E4 fill:#9f9,stroke:#333
```

#### 28.6.3 数据不一致修复流程

当业务表（`roles`/`user_roles`）与 Casbin 策略表（`casbin_rule`）不一致时，需要执行修复。

**检测不一致**：

```bash
# 1. 从业务表推导预期策略数量
docker-compose exec postgres psql -U rtc_agent -c "
  SELECT 'expected_g_policies' AS metric, COUNT(*) FROM user_roles
  UNION ALL
  SELECT 'actual_g_policies', COUNT(*) FROM casbin_rule WHERE ptype = 'g'
"

# 2. 如果不一致，执行重建
./rtc-agent admin debug rebuild-policies --dry-run   # 先预览差异
./rtc-agent admin debug rebuild-policies --force     # 确认后执行
```

**修复伪代码**（参见 [8.5.3](#853-数据清理与修复)）：

```go
func RebuildCasbinPolicies(db *gorm.DB, enforcer *casbin.Enforcer) error {
    // 1. 清空现有策略
    enforcer.ClearPolicy()
    
    // 2. 从 roles 表重建 p 类型策略
    var roles []Role
    db.Find(&roles)
    for _, role := range roles {
        policies := getDefaultPoliciesForRole(role.Name)
        for _, p := range policies {
            enforcer.AddPolicy(role.ID.String(), p.Resource, p.Action)
        }
    }
    
    // 3. 从 user_roles 表重建 g 类型策略
    var userRoles []UserRole
    db.Find(&userRoles)
    for _, ur := range userRoles {
        enforcer.AddGroupingPolicy(ur.UserID.String(), ur.RoleID.String())
    }
    
    // 4. 持久化到数据库
    return enforcer.SavePolicy()
}
```

#### 28.6.4 紧急回滚操作手册

**场景**：权限系统上线后发现严重问题，需要快速回滚到无权限系统状态。

**回滚步骤**：

```bash
# 1. 关闭权限系统灰度开关（零停机）
docker-compose exec admin-server \
  sed -i 's/permission_system: true/permission_system: false/' /app/etc/admin.yaml
docker-compose restart admin-server

# 2. 验证回滚生效
curl -s http://localhost:28081/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq '.data.roles'
# 预期：所有用户返回 [{ "name": "admin" }]

# 3. 如果需要完全回滚（回滚代码版本）
docker-compose stop admin-server
docker-compose run --rm admin-server-old ./rtc-agent admin serve
# 使用旧版本镜像（不含权限系统代码）

# 4. 数据库不需要回滚（新表不影响旧版本运行）
# roles、user_roles、casbin_rule 表保留，灰度重新开启后自动恢复
```

**回滚检查清单**：

- ✅ 灰度开关已关闭（`features.permission_system: false`）
- ✅ 所有用户恢复 admin 权限
- ✅ 前端功能正常（旧前端硬编码 `access: 'admin'`）
- ✅ 数据库新表保留（不影响旧版本）
- ✅ 通知团队回滚完成

### 28.7 性能调优指南

> **目标**：提供权限系统的性能调优实践，确保在生产环境下权限检查不会成为系统瓶颈。

#### 28.7.1 后端调优

**Casbin Enforcer 缓存优化**：

```go
// server/internal/infra/auth/casbin.go

// 启用自动保存（策略修改自动持久化到数据库）
enforcer.EnableAutoSave(true)

// 启用策略缓存（避免重复 Enforce 计算）
// Casbin v2 默认将策略加载到内存，单次 Enforce < 1ms
// 如果策略量大（> 5000 条），考虑使用 RBAC with domains 模型减少匹配开销

// 缓存预热：服务启动时预加载策略
func initCasbinEnforcer(db *gorm.DB) (*casbin.Enforcer, error) {
    enforcer, err := NewAdminCasbinEnforcer(db)
    if err != nil {
        return nil, err
    }
    // 启动时加载策略，避免首次请求延迟
    if err := enforcer.LoadPolicy(); err != nil {
        return nil, fmt.Errorf("warm up casbin policy: %w", err)
    }
    return enforcer, nil
}
```

**数据库连接池调优**：

```yaml
# etc/admin.yaml（建议配置）
database:
  dsn: "postgres://rtc_agent:rtc_agent@localhost:5432/rtc_agent"
  max_idle_conns: 10      # 空闲连接数（减少连接建立开销）
  max_open_conns: 50      # 最大连接数（根据 PostgreSQL max_connections 调整）
  conn_max_lifetime: 3600 # 连接最大存活时间（秒），避免长连接泄漏
```

**索引优化**：

```sql
-- 检查缺失索引（PostgreSQL 慢查询日志）
-- 如果 casbin_rule 查询慢，添加复合索引
CREATE INDEX IF NOT EXISTS idx_casbin_rule_ptype_v0 
  ON casbin_rule(ptype, v0);

-- 如果 user_roles 按用户查询慢，确认索引存在
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id 
  ON user_roles(user_id);

-- 分析查询性能
EXPLAIN ANALYZE 
SELECT r.* FROM roles r
INNER JOIN user_roles ur ON ur.role_id = r.id
WHERE ur.user_id = '00000000-0000-0000-0000-000000000001'
  AND r.is_enabled = true;
```

**策略量控制**：

| 策略量 | 内存占用 | Enforce 延迟 | 建议 |
| --- | --- | --- | --- |
| < 100 条 | < 100KB | < 1μs | 正常范围 |
| 100-1000 条 | 100KB-1MB | 1-5μs | 正常范围 |
| 1000-5000 条 | 1-5MB | 5-20μs | 监控策略增长 |
| 5000-10000 条 | 5-10MB | 20-50μs | 考虑精简策略 |
| > 10000 条 | > 10MB | > 50μs | 必须优化（分片或合并） |

#### 28.7.2 前端调优

**permissionSet 数据结构选择**：

```typescript
// ✅ 推荐：使用 Set<string>（O(1) 查询）
const permissionSet = new Set(['user:read', 'user:write', 'role:read']);
permissionSet.has('user:read'); // O(1)，极快

// ❌ 不推荐：使用 Array<string>（O(n) 查询）
const permissions = ['user:read', 'user:write', 'role:read'];
permissions.includes('user:read'); // O(n)，权限多时慢

// ❌ 不推荐：使用 Object（key 查找有原型链开销）
const perms = { 'user:read': true, 'user:write': true };
perms['user:read']; // 快但有原型链风险
```

**permissionSet 生命周期管理**：

```typescript
// ✅ 推荐：在 getInitialState 和 Token 刷新时构建
// 避免在每次 render 中重新构建 Set
export async function getInitialState() {
  const userInfo = await getCurrentUser();
  const permissionSet = new Set(
    (userInfo.permissions || []).map(
      (p: { resource: string; action: string }) => `${p.resource}:${p.action}`
    )
  );
  return { currentUser: { ...userInfo, permissions: permissionSet } };
}

// ✅ 推荐：在 access.ts 中使用 useMemo 缓存计算结果
// access.ts 是纯函数，Umi 框架会自动缓存其返回值
export default function access(initialState) {
  const { currentUser } = initialState ?? {};
  const perms = currentUser?.permissions as Set<string>;
  return {
    canUserView: perms?.has('user:read') ?? false,
    canUserEdit: perms?.has('user:write') ?? false,
    // ...
  };
}
```

**Token 刷新时的权限同步优化**：

```typescript
// ✅ 推荐：Token 刷新成功后，立即刷新权限数据
// 参见 requestErrorConfig.ts 的 handleTokenRefresh
async function handleTokenRefresh() {
  const tokens = await refreshToken();
  saveTokens(tokens);
  
  // 同时刷新权限数据（避免权限过期）
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

#### 28.7.3 监控与告警阈值配置

**Prometheus 指标**（参见 [14.2](#142-prometheus-指标)）：

```yaml
# etc/dev/prometheus/alerts.yml — 权限系统告警规则

groups:
  - name: admin-permission-system
    rules:
      # 权限检查延迟过高
      - alert: HighPermissionCheckLatency
        expr: histogram_quantile(0.99, rate(admin_permission_check_duration_seconds_bucket[5m])) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 permission check latency > 50ms"
          description: "Current P99: {{ $value }}s"
      
      # Casbin 策略量过大
      - alert: CasbinPolicyCountHigh
        expr: admin_casbin_policy_count > 5000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Casbin policy count > 5000"
          description: "Current count: {{ $value }}"
      
      # 策略同步延迟
      - alert: PolicySyncDelayHigh
        expr: admin_policy_sync_delay_seconds > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Policy sync delay > 30s"
          description: "Current delay: {{ $value }}s"
      
      # 权限拒绝率异常
      - alert: PermissionDenialRateHigh
        expr: rate(admin_permission_check_total{result="denied"}[5m]) / rate(admin_permission_check_total[5m]) > 0.2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Permission denial rate > 20%"
          description: "Current rate: {{ $value }}"
```

**Grafana 仪表盘关键面板**：

| 面板 | 指标 | 正常范围 | 告警阈值 |
| --- | --- | --- | --- |
| 权限检查延迟 P99 | `histogram_quantile(0.99, ...)` | < 10ms | > 50ms |
| 权限检查 QPS | `rate(admin_permission_check_total[5m])` | 根据业务量 | 突增 300% |
| Casbin 策略数量 | `admin_casbin_policy_count` | < 1000 | > 5000 |
| 活跃会话数 | `admin_active_sessions` | < 100 | > 500 |
| 策略同步延迟 | `admin_policy_sync_delay_seconds` | < 1s | > 30s |
| 权限拒绝率 | `denied / total` | < 5% | > 20% |

---

## 29. 附录：开发者速查卡 {#29-附录开发者速查卡}

> **目标**：为开发者提供一页式速查参考，减少文档翻阅时间。涵盖项目结构、关键文件索引、常用命令、错误码映射、API 模板、Git 提交规范。

### 29.1 项目结构总览

```text
rtc-agent/
├── server/                        # Go 后端（admin-server + RTC server）
│   ├── cmd/
│   │   ├── admin/
│   │   │   ├── serve.go           # admin-server 启动入口
│   │   │   ├── keygen.go          # JWT 密钥对生成
│   │   │   ├── account.go         # 管理员账号 CLI
│   │   │   └── debug.go           # 权限调试 CLI
│   │   ├── migrate.go             # 数据库迁移（统一入口）
│   │   └── root.go                # Cobra 根命令
│   ├── internal/
│   │   ├── model/                 # 数据模型（GORM）
│   │   ├── handler/http/          # HTTP Handler（Gin）
│   │   ├── usecase/               # 业务逻辑层
│   │   ├── repo/                  # 数据访问层（Repository 模式）
│   │   └── infra/                 # 基础设施（auth, config, middleware）
│   ├── pkg/logger/                # 统一日志包（zap 封装）
│   ├── etc/                       # 配置文件
│   │   ├── admin.yaml             # admin-server 本地配置
│   │   └── admin.docker.yaml      # admin-server Docker 配置
│   └── docker-compose.yml         # 完整部署（2 Server + Nginx + 可观测性栈）
├── web-components/
│   └── packages/admin-ui/         # React 19 + Umi Max v4 + antd v6 前端
│       ├── config/
│       │   ├── config.ts          # Umi 配置
│       │   ├── routes.ts          # 路由配置（含 access 权限控制）
│       │   └── defaultSettings.ts # ProLayout 配置
│       └── src/
│           ├── access.ts          # 权限定义（@umijs/plugin-access）
│           ├── app.tsx            # 全局入口（initialState + layout）
│           ├── access.test.ts     # 权限单元测试
│           ├── requestErrorConfig.ts # 请求拦截器（401 自动刷新）
│           ├── pages/             # 页面（文件系统路由）
│           ├── services/          # API 服务
│           ├── utils/             # 工具函数（auth-storage 等）
│           └── locales/           # i18n 翻译（8 种语言）
└── docs/
    └── design/
        └── admin-permission-system.md  # 本文档
```

### 29.2 关键文件索引

| 文件 | 说明 | 参考章节 |
| --- | --- | --- |
| [`server/cmd/admin/serve.go`](../server/cmd/admin/serve.go) | admin-server 启动入口、依赖初始化 | [4.3.1](#431-后端模块) |
| [`server/cmd/migrate.go`](../server/cmd/migrate.go) | 数据库迁移入口 | [8.2](#82-数据库迁移适配) |
| [`server/internal/repo/errors.go`](../server/internal/repo/errors.go) | Sentinel errors 集中定义 | [2.2.4](#224-repo-接口模式) |
| `server/internal/infra/auth/casbin.go` | Casbin Enforcer 初始化 | [5.2](#52-casbin-模型配置) |
| `server/internal/infra/auth/policy_watcher.go` | Redis Pub/Sub 策略同步 | [ADR-006](#adr-006多实例策略同步使用-redis-pubsub) |
| `server/internal/handler/http/casbin_middleware.go` | 权限检查中间件 + routeResourceMap | [ADR-003](#adr-003casbin-中间件-allow-by-default-策略) |
| `server/etc/admin.yaml` | admin-server 配置（JWT TTL、Redis、CORS） | [8.4](#84-环境变量配置) |
| [`web-components/packages/admin-ui/src/access.ts`](../web-components/packages/admin-ui/src/access.ts) | 前端权限定义 | [7.3](#sec-7-3) |
| [`web-components/packages/admin-ui/src/app.tsx`](../web-components/packages/admin-ui/src/app.tsx) | 全局入口（initialState、layout） | [7.2](#72-修改-apptsx--从-api-获取权限) |
| [`web-components/packages/admin-ui/config/routes.ts`](../web-components/packages/admin-ui/config/routes.ts) | 路由配置（access 字段） | [7.4](#74-路由配置--使用-access-字段) |
| [`web-components/packages/admin-ui/src/utils/auth-storage.ts`](../web-components/packages/admin-ui/src/utils/auth-storage.ts) | Token 存储（localStorage） | [ADR-007](#adr-007token-存储在-localstorage非-httponly-cookie) |

### 29.3 常用命令速查

**后端**：

```bash
# 启动开发环境
cd server
docker-compose up -d postgres redis          # 基础设施
go run . migrate                              # 数据库迁移
go run . admin serve                          # 启动 admin-server（:8081）

# 管理员操作
go run . admin account create --email=admin@example.com --password=Admin@123 --name=Admin
go run . admin keygen --algorithm=RS256       # 生成 JWT 密钥对

# 调试命令
go run . admin debug user-permissions --user-id=<UUID>
go run . admin debug check-permission --user-id=<UUID> --resource=role --action=read
go run . admin debug list-policies --type=p   # 列出所有 p 策略
go run . admin debug rebuild-policies --dry-run  # 预览策略差异

# 测试
go test ./internal/usecase/... -v -count=1    # usecase 单元测试
go test ./internal/repo/... -v -count=1       # repo 单元测试
go test ./internal/handler/http/... -v        # handler 集成测试

# 完整部署（含可观测性栈）
docker-compose up -d                          # 启动全部服务
docker-compose ps                             # 查看服务状态
docker-compose logs -f admin-server           # 查看 admin-server 日志
```

**前端**：

```bash
cd web-components/packages/admin-ui

npm start                                     # 启动开发服务器
npm run build                                 # 生产构建
npm run lint                                  # Biome + TypeScript 检查
npm run test                                  # Vitest 单元测试
npm run openapi                               # 从 OpenAPI 规范重新生成 services
```

### 29.4 错误码映射表

> **注意**：所有 API 返回 HTTP 200，错误通过 `errorCode` 字段区分。参见 [2.2.1](#221-error-始终返回-http-200)。

| errorCode | HTTP 状态码 | 含义 | 触发场景 |
| --- | --- | --- | --- |
| `unauthorized` | 200 | 未认证 | 无 Token / Token 过期 / Token 无效 |
| `forbidden` | 200 | 无权限 | 用户无对应 Casbin 策略 |
| `validation_error` | 200 | 参数校验失败 | 请求体不符合约束 |
| `invalid_credentials` | 200 | 凭证错误 | 邮箱或密码错误 |
| `role_not_found` | 200 | 角色不存在 | 操作目标角色 ID 无效 |
| `role_name_exists` | 200 | 角色名重复 | 创建角色名称已存在 |
| `role_disabled` | 200 | 角色已禁用 | 尝试分配或启用已禁用角色 |
| `cannot_remove_last_admin` | 200 | 最后管理员保护 | 移除最后一个 admin 角色 |
| `cannot_remove_self_admin` | 200 | 自删除管理员保护 | 用户移除自己的 admin 角色 |
| `cannot_delete_system_role` | 200 | 系统角色保护 | 删除 admin 等系统内置角色 |
| `refresh_token_expired` | 200 | 刷新令牌过期 | Refresh Token 超过 TTL |
| `refresh_token_revoked` | 200 | 刷新令牌已撤销 | Token 已被撤销（登出） |

### 29.5 API 请求模板

**登录**：

```bash
curl -s -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin@123"}'
# 响应：{ "success": true, "data": { "access_token": "...", "refresh_token": "...", "expires_in": 3600 } }
```

**刷新 Token**：

```bash
curl -s -X POST http://localhost:8081/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<REFRESH_TOKEN>"}'
# 响应：{ "success": true, "data": { "access_token": "...", "expires_in": 3600 } }
# 注意：旧 refresh_token 被撤销，响应中返回新的 refresh_token
```

**创建角色**：

```bash
curl -s -X POST http://localhost:8081/api/roles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"operator","display_name":"操作员","description":"日常运营"}'
```

**分配角色给用户**：

```bash
curl -s -X POST "http://localhost:8081/api/users/$USER_ID/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role_ids":["<ROLE_UUID>"]}'
```

**创建权限策略**：

```bash
curl -s -X POST http://localhost:8081/api/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"operator","resource":"user","action":"read"}'
```

### 29.6 Git 提交规范

**格式**：`<type>(<scope>): <subject>`

**Type 列表**：

| Type | 说明 | 示例 |
| --- | --- | --- |
| `feat` | 新功能 | `feat(admin): add role CRUD API` |
| `fix` | 修复 Bug | `fix(auth): prevent concurrent token refresh` |
| `refactor` | 重构（不改变外部行为） | `refactor(repo): extract error wrapping helpers` |
| `docs` | 文档变更 | `docs(design): update permission system v2.7` |
| `test` | 测试相关 | `test(access): add permission unit tests` |
| `chore` | 构建/工具/依赖 | `chore(deps): add casbin v2 dependency` |
| `perf` | 性能优化 | `perf(casbin): optimize policy reload on startup` |
| `ci` | CI/CD 配置 | `ci(docker): add admin-server healthcheck` |

**Scope 约定**：

| Scope | 说明 |
| --- | --- |
| `admin` | admin-server 整体 |
| `auth` | 认证相关（JWT、Token） |
| `rbac` | 权限相关（角色、策略、Casbin） |
| `frontend` | admin-ui 前端 |
| `migrate` | 数据库迁移 |
| `deploy` | Docker/部署 |
| `design` | 设计文档 |

**提交示例**：

```text
feat(rbac): implement Casbin enforcer with Redis policy sync

- Initialize Casbin Enforcer with gorm-adapter on startup
- Add PolicyWatcher for Redis Pub/Sub multi-instance sync (ADR-006)
- Register routeResourceMap for all admin API routes
- Add unit tests for policy reload and sync logic

Closes #123
```

---

## 30. 附录：最佳实践指南 {#30-附录最佳实践指南}

> **目标**：总结权限系统开发过程中的最佳实践，涵盖后端、前端、安全三个维度。帮助开发者写出高质量、可维护的代码。

### 30.1 后端开发实践

#### 30.1.1 错误处理规范

**原则**：使用 sentinel errors + `fmt.Errorf` 包装，上层通过 `errors.Is()` 判断。

```go
// ✅ 推荐：sentinel error + 上下文包装
func (r *roleRepo) Delete(ctx context.Context, id uuid.UUID) error {
    db := DBFromContext(ctx, r.db)
    result := db.Where("id = ?", id).Delete(&model.Role{})
    if result.RowsAffected == 0 {
        return fmt.Errorf("delete role %s: %w", id, repo.ErrNotFound)
    }
    return result.Error
}

// ❌ 避免：直接返回裸错误
func (r *roleRepo) Delete(ctx context.Context, id uuid.UUID) error {
    // ... 直接返回 gorm.ErrRecordNotFound，上层无法判断
}
```

**Handler 层错误映射**：

```go
// handler 层统一映射 sentinel errors 到 errorCode
result, err := h.roleUsecase.Delete(ctx, id)
if err != nil {
    switch {
    case errors.Is(err, repo.ErrNotFound):
        Error(c, http.StatusOK, "role_not_found", "角色不存在")
    case errors.Is(err, repo.ErrCannotRemoveLastAdmin):
        Error(c, http.StatusOK, "cannot_remove_last_admin", "不能移除最后一个管理员角色")
    case errors.Is(err, repo.ErrCannotDeleteSystemRole):
        Error(c, http.StatusOK, "cannot_delete_system_role", "不能删除系统内置角色")
    default:
        logger.Error(ctx, "role.delete_failed", zap.Error(err))
        Error(c, http.StatusOK, "server_error", "服务器内部错误")
    }
    return
}
Success(c, result)
```

#### 30.1.2 事务管理

**原则**：使用 `DBFromContext` 透明传递事务，保证跨 repo 操作的原子性。

```go
// usecase 层开启事务
func (uc *RoleUsecase) DeleteWithCascade(ctx context.Context, roleID uuid.UUID) error {
    return uc.repo.WithTx(ctx, func(txRepo repo.Repos) error {
        db := repo.DBFromContext(ctx, txRepo.DB())

        // 1. 删除角色
        if err := txRepo.Role().Delete(ctx, roleID); err != nil {
            return fmt.Errorf("delete role: %w", err)
        }

        // 2. 删除用户-角色关联
        if err := txRepo.UserRole().DeleteByRoleID(ctx, roleID); err != nil {
            return fmt.Errorf("delete user roles: %w", err)
        }

        // 3. 删除 Casbin 策略
        if err := txRepo.Permission().DeleteByRole(ctx, roleID); err != nil {
            return fmt.Errorf("delete casbin policies: %w", err)
        }

        return nil
    })
}
```

#### 30.1.3 日志规范

**原则**：使用结构化日志（zap），包含上下文信息，区分日志级别。

```go
// ✅ 推荐：结构化日志 + 上下文
logger.Info(ctx, "role.created",
    zap.String("role_id", role.ID.String()),
    zap.String("role_name", role.Name),
    zap.String("operator_id", operatorID.String()),
)

// ✅ 错误日志包含 error 字段
logger.Error(ctx, "role.delete_failed",
    zap.String("role_id", id.String()),
    zap.Error(err),
)

// ❌ 避免：无结构化的 fmt.Print
fmt.Printf("role created: %s\n", role.ID)
```

**日志级别使用指南**：

| 级别 | 使用场景 | 示例 |
| --- | --- | --- |
| `Debug` | 开发调试信息 | SQL 语句、请求/响应体 |
| `Info` | 正常业务事件 | 角色创建、权限变更、Token 刷新 |
| `Warn` | 可恢复的异常 | Redis 不可达、策略同步延迟 |
| `Error` | 需要关注的错误 | 数据库操作失败、权限检查异常 |
| `Fatal` | 不可恢复的致命错误 | 数据库连接失败、JWT 签名初始化失败 |

#### 30.1.4 Repository 模式约定

**原则**：接口 + 未导出结构体 + `DBFromContext`。

```go
// ✅ 标准 Repository 结构
type RoleRepo interface {
    Create(ctx context.Context, role *model.Role) error
    GetByID(ctx context.Context, id uuid.UUID) (*model.Role, error)
    GetByName(ctx context.Context, name string) (*model.Role, error)
    List(ctx context.Context, filter RoleFilter) ([]*model.Role, int64, error)
    Update(ctx context.Context, role *model.Role) error
    Delete(ctx context.Context, id uuid.UUID) error
}

type roleRepo struct {
    db *gorm.DB
}

func NewRoleRepo(db *gorm.DB) RoleRepo {
    return &roleRepo{db: db}
}

// 每个方法都使用 DBFromContext 支持事务
func (r *roleRepo) GetByID(ctx context.Context, id uuid.UUID) (*model.Role, error) {
    db := DBFromContext(ctx, r.db)
    var role model.Role
    if err := db.Where("id = ?", id).First(&role).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, fmt.Errorf("get role by id %s: %w", id, ErrNotFound)
        }
        return nil, fmt.Errorf("get role by id %s: %w", id, err)
    }
    return &role, nil
}
```

### 30.2 前端开发实践

#### 30.2.1 权限组件复用

**原则**：使用 `useAccess()` + `<Access>` 组件，避免在每个页面重复编写权限判断逻辑。

```tsx
// ✅ 推荐：使用 useAccess hook
import { useAccess, Access } from '@umijs/max';

export default function UserListPage() {
  const access = useAccess();

  return (
    <div>
      <h1>用户列表</h1>

      {/* 按钮级权限控制 */}
      <Access accessible={access.canUserEdit} fallback={null}>
        <Button type="primary">编辑用户</Button>
      </Access>

      {/* 整块区域权限控制 */}
      <Access accessible={access.canUserDelete} fallback={<NoPermission />}>
        <DeleteButton />
      </Access>
    </div>
  );
}

// ❌ 避免：手动检查权限
const permissions = initialState?.currentUser?.permissions ?? [];
if (permissions.includes('user:edit')) {
  // ...
}
```

#### 30.2.2 状态管理最佳实践

**原则**：全局状态使用 `@@initialState`，服务端状态使用 React Query，页面状态使用 `useState`。

```tsx
// ✅ 全局状态：用户信息 + 权限
const { initialState } = useModel('@@initialState');
const currentUser = initialState?.currentUser;
const permissions = currentUser?.permissions as Set<string>;

// ✅ 服务端状态：使用 React Query 管理复杂数据
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => request('/api/roles').then(res => res.data.items),
  });
}

function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoleRequest) =>
      request('/api/roles', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      message.success('角色创建成功');
    },
  });
}
```

#### 30.2.3 性能优化要点

1. **权限集使用 Set 而非 Array**：`O(1)` 查找 vs `O(n)` 遍历

```tsx
// ✅ Set — O(1) 查找
const permissionSet = new Set(permissions);
const canEdit = permissionSet.has('user:edit');

// ❌ Array — O(n) 遍历
const canEdit = permissions.includes('user:edit');
```

1. **避免不必要的重新渲染**：使用 `useMemo` 缓存权限计算结果

```tsx
const accessRules = useMemo(() => {
  const perms = new Set(currentUser?.permissions ?? []);
  return {
    canUserView: perms.has('user:read'),
    canUserEdit: perms.has('user:write'),
    canUserDelete: perms.has('user:delete'),
    canRoleManage: perms.has('role:read') && perms.has('role:write'),
  };
}, [currentUser?.permissions]);
```

1. **Token 刷新防抖**：避免多个并发请求同时触发 Token 刷新

```typescript
// requestErrorConfig.ts 中已有实现
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}
```

### 30.3 安全实践

#### 30.3.1 输入校验

**原则**：所有用户输入必须校验，使用 Gin binding + 自定义验证器。

```go
// ✅ 定义验证标签
type CreateRoleRequest struct {
    Name        string `json:"name" binding:"required,min=2,max=50,alphanum"`
    DisplayName string `json:"display_name" binding:"required,min=1,max=100"`
    Description string `json:"description" binding:"max=500"`
}

// ✅ 使用统一错误响应
if err := c.ShouldBindJSON(&req); err != nil {
    Error(c, http.StatusOK, "validation_error", sanitizeBindingError(err))
    return
}
```

**前端校验**：

```tsx
// antd Form 校验规则
const rules = [
  { required: true, message: '请输入角色名称' },
  { min: 2, max: 50, message: '角色名称长度为 2-50 个字符' },
  { pattern: /^[a-z][a-z0-9_]*$/, message: '角色名称只能包含小写字母、数字和下划线' },
];
```

#### 30.3.2 Token 管理

**原则**：Access Token 存 localStorage（配合 CSP 缓解 XSS），Refresh Token 轮换存储。

```typescript
// auth-storage.ts 关键实践

// 1. Token 存储带过期时间
export function setTokens(accessToken: string, refreshToken: string, expiresIn: number) {
  localStorage.setItem('admin_access_token', accessToken);
  localStorage.setItem('admin_refresh_token', refreshToken);
  localStorage.setItem('admin_token_expiry', String(Date.now() + expiresIn * 1000));
}

// 2. 登出时清除所有 Token
export function clearAuth() {
  localStorage.removeItem('admin_access_token');
  localStorage.removeItem('admin_refresh_token');
  localStorage.removeItem('admin_token_expiry');
  localStorage.removeItem('admin_user_info');
}

// 3. 检查 Token 是否即将过期（提前 5 分钟刷新）
export function isTokenExpiringSoon(): boolean {
  const expiry = localStorage.getItem('admin_token_expiry');
  if (!expiry) return true;
  return Date.now() > Number(expiry) - 5 * 60 * 1000; // 提前 5 分钟
}
```

#### 30.3.3 CSP 配置

**原则**：通过 HTTP 头限制资源加载，防止 XSS 攻击。

```go
// security.go 中间件
func SecurityHeaders() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Content-Security-Policy
        c.Header("Content-Security-Policy",
            "default-src 'self'; "+
            "script-src 'self'; "+         // 禁止内联脚本
            "style-src 'self' 'unsafe-inline'; "+ // antd 需要 inline style
            "img-src 'self' data: https:; "+
            "connect-src 'self' https://admin.example.com; "+
            "font-src 'self' data:; "+
            "object-src 'none'; "+          // 禁止 Flash
            "frame-ancestors 'none'")       // 禁止 iframe 嵌入

        // 其他安全头
        c.Header("X-Content-Type-Options", "nosniff")
        c.Header("X-Frame-Options", "DENY")
        c.Header("X-XSS-Protection", "1; mode=block")
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

        c.Next()
    }
}
```

#### 30.3.4 密码策略实施

```go
// usecase/admin_auth.go
const (
    bcryptCost       = 12
    minPasswordLen   = 8
)

func validatePassword(password string) error {
    if len(password) < minPasswordLen {
        return fmt.Errorf("password must be at least %d characters", minPasswordLen)
    }
    // 至少包含：大写字母、小写字母、数字、特殊字符中的 3 种
    var complexity int
    if regexp.MustCompile(`[A-Z]`).MatchString(password) { complexity++ }
    if regexp.MustCompile(`[a-z]`).MatchString(password) { complexity++ }
    if regexp.MustCompile(`[0-9]`).MatchString(password) { complexity++ }
    if regexp.MustCompile(`[!@#$%^&*()]`).MatchString(password) { complexity++ }
    if complexity < 3 {
        return errors.New("password must contain at least 3 of: uppercase, lowercase, digit, special character")
    }
    return nil
}
```

---

文档结束
