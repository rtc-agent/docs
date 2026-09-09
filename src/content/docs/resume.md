---
title: 马守越 — 全栈 AI 工程师
description: 自由职业 · AI Agent 基础设施设计与实现 · 全栈开发
---

> **7 年后端经验，从 20 万并发的 IM 系统到 100% AI 编写的 Agent 平台。一个经历过产品失败、也独立完成过完整系统的全栈工程师。**

**标签：** `马守越` `27 岁` `全栈工程师` `AI Agent` `自由职业` `远程可用`

---

## 我的故事

### 时间线

| 时间 | 事件 | 关键成长 |
|------|------|----------|
| 2019 | 毕业，北京某公司开发智能停车系统 | 硬件接入、后端 CRUD、业务理解 |
| 2020 | 跳槽到北京某互联网公司，开发电商系统 | K8S、Golang、微服务治理、可观测性、灰度发布 |
| 2023 | 成为 OpenAI ChatGPT 早期用户，使用 GitHub Copilot | AI 辅助编程的先驱实践者 |
| 2023 | 开源项目 zero-im 发布（基于 Go Zero 框架的 IM 系统） | 开源社区影响力积累 |
| 2024 | 公司倒闭，因开源项目获得客户，开始自由职业 | 从打工人到独立开发者 |
| 2024 | 基于 teamgram-server 开发 Telegram 私人服务器，支持 ~20 万并发用户 | 大规模分布式系统实战、IM 架构深度理解 |
| 2025 | 炒股炒币失败，存款亏光，但深入实践 Vibe Coding | 产品思维觉醒：技术不是关键，产品才是 |
| 2026 | 重走开源路，发布 RTC-Agent（100% Claude Code 编写） | 第一个产品思维驱动的 Vibe Coding 作品 |

### 从 CRUD 到 AI Agent：一个程序员的觉醒

2019 年毕业到北京，第一份工作是做智能停车系统。项目要接入硬件，但更多的工作还是 CRUD。那时候我认为，后端程序员就是把业务逻辑翻译成代码。

2020 年跳槽到一家互联网公司做电商系统。在这里被带着学会了 K8S、Golang，以及之前根本用不到的开源组件：消息队列、微服务治理、可观测性、监控告警、灰度发布。但实际上，对于后端程序员来说，更多的还是 CRUD，对业务的理解。

**2023 年，是我职业生涯的分水岭。**

那一年，我成为了 OpenAI ChatGPT 的早期用户。当时第一个最火的 OpenAI 应用是 GitHub Copilot，我就已经开始用了。记得那时候还需要人工去点 Tab 键，但那种「AI 帮你写代码」的震撼，让我意识到：**编程这件事，要变天了。**

也是在那一年，Go Zero 框架开始流行，我基于它写了一个开源的 IM 系统：**zero-im**。同事编写前端 + SDK，我负责后端。这个项目让我第一次尝到开源的甜头——不是因为技术多牛逼，而是因为有人真的在用。

**2024 年，人生给我开了一个玩笑。**

公司倒闭了。但幸运的是，我的开源项目火起来了。有人找我定制 IM 系统，我也就顺理成章地成为了自由职业者。

那一年，我又做了一个全新的 IM——Telegram 私人服务器，兼容 Telegram 客户端。有人用 Golang 开源了 teamgram-server，我在它的基础上做修改，支持了大多数的 Telegram 功能。也了解到了 Telegram 是怎么做 IM 的：**就是 update 机制。**

当时我帮客户维护这个系统，最高承载 **~20 万人同时在线**。一个 Go Zero 微服务集群，部署在 K8S 上。

那是我的高光时刻：开源项目 + 商业定制 + 大规模系统实战。我觉得自己找到了方向。

**然后，2025 年，我崩了。**

我开始炒股、炒币，期间使用 Vibe Coding 编写交易系统。结果可想而知——都失败了，存款也亏光了。

但那段日子给了我一个重要的领悟：

> **Vibe Coding 的关键不在技术，而在产品。**
> 
> 如果一个产品自己都没有想好需求，没有想好"这是给谁用的？别人凭什么用？"那么这个产品就做不出来。
> 
> 我总是在 Vibe Coding 开始做一个产品的时候，就想着技术该怎么样——不要屎山代码，要像雷军学习写诗一样写代码。这就是典型的技术人员通病。**一个产品不能第一时间做得完美，当你发现做到一半走不通的时候，就会很迷茫。之前我都是这样的。**

**今天，我重走老路，继续开源产品。**

**RTC-Agent** 是我领悟之后的第一个产品。这是一个纯 Vibe Coding 的产品：**0% 人工编写，100% Claude Code 编写**。现在已经实现 MVP 版本的全部功能。

这一次，我不再纠结代码优不优雅，架构完不完美。我想的是：**这个产品解决什么问题？谁会用？为什么用它？**

如果你也在寻找一个能**独立交付 AI Agent 系统**的全栈工程师，欢迎联系我。

---

## 核心能力

### 协议与系统设计

三层协议架构：认证层 (OAuth2/HTTP) → 操作层 (WebSocket RPC, 16 个方法) → 事件层 (双通道 Pub/Sub)。

分布式部署方案：Nginx 负载均衡 + 有状态/无状态服务分离。

### AI Agent 引擎

基于 Anthropic SDK + Eino 构建，支持 Claude 和 OpenAI 兼容模型。

远程工具调用状态机 + Redis Checkpoint 崩溃恢复 + 无限重试 + 指数退避，保证 100% 工具投递。

### 前端工程化

Lit Web Components：16+ 子组件，9+ Controllers，`@lit/context` 状态分发。

IndexedDB 虚拟文件系统 + Babel AST 脚本沙箱，双层安全隔离。

### 安全与可观测性

OAuth2 双 Token 机制，脚本沙箱 AST 级 API 阻断。

OpenTelemetry + Jaeger + Prometheus + Grafana + Loki 全链路追踪。

---

## 技术栈

### 后端 & AI

| 领域 | 技术 |
|------|------|
| 语言 | Go 1.27 |
| ORM | GORM |
| 向量搜索 | pgvector |
| AI 框架 | Anthropic SDK, Eino |
| 脚本沙箱 | Babel AST 变换 |

### 前端

| 领域 | 技术 |
|------|------|
| 组件库 | Lit Web Components |
| 语言 | TypeScript |
| 状态管理 | `@lit/context` |
| 前端存储 | IndexedDB (Dexie.js) |
| 文档站 | Astro 7, Starlight |

### 基础设施

| 领域 | 技术 |
|------|------|
| 数据库 | PostgreSQL 17+ |
| 缓存 | Redis 7+ |
| 实时通信 | Centrifuge WebSocket |
| 认证 | OAuth2 授权码流程 |
| 可观测性 | OpenTelemetry, Jaeger, Prometheus, Grafana, Loki |
| 部署 | Docker Compose, Nginx |

---

## 代表项目：RTC Agent

> **一句话**：开源 Web AI 助手后端，通过标准化的 Remote Tool Calling 协议，让网站用几行代码集成透明、高效、低成本的 AI 助手。

### 核心创新

AI 在服务端推理，但**工具在用户浏览器中执行**。数据不离开用户设备。

| 指标 | 数值 | 说明 |
|------|------|------|
| 集成成本 | **3 行代码** | 快速接入 |
| Token 节省 | **70%+** | 比截图+OCR 方案 |
| 错误率降低 | **50%+** | 比服务端 DOM 抓取 |
| 隐私保护 | **100%** | 数据始终在浏览器 |

### 技术亮点

#### 1. Remote Tool Calling 协议

- 6 个内置工具：`ls` / `read` / `write` / `grep` / `find` / `script`
- 完整状态机：Pending → Sent → Executing → Completed/Failed/Timeout/Rejected
- Redis Checkpoint 崩溃恢复，无限重试 + 指数退避
- 100% 工具投递保证

#### 2. 虚拟文件系统

- IndexedDB 实现，Dexie.js 封装
- 目录结构：`/functions/` `/scenarios/` `/scripts/` `/AGENT.md`
- 路径穿越防护，大文件分页读取
- 文件类型自动推断

#### 3. 脚本执行引擎

- Babel AST 变换 + 运行时权限确认，双层安全隔离
- 静态 API 阻断：Storage / Network / DOM / eval 全部拦截
- 纯计算标准库注入，内置系统工具 (delay / uuid / now / random / time)
- 三种模式：save / run / eval

#### 4. 双通道实时通信

- **Topic Channel**：持久化事件 + Offset 追踪 + 离线恢复
- **Live Channel**：Redis Pub/Sub 低延迟流式输出
- Epoch 机制清理历史，保证消息不丢失

#### 5. 记忆系统

- **Session Memory**：5 类，最多 20 条，约 12K tokens
- **User Memory**：4 类，最多 1000 条，跨会话持久化
- 混合检索：向量余弦相似度 + 关键词全文搜索，RRF 融合 + 重要性加权

#### 6. 上下文管理

- 三层压缩：Microcompact → Auto Compact → Session Memory Compact
- 配置：25K Token 限制，12K 触发阈值
- Auto Compact 由 LLM 生成 9 部分结构化摘要

#### 7. Skill 系统

- 声明式 (`agentConfig`) + 命令式 (`defineRegistry`) 双注册方式
- Function 分组，命名空间路径
- 自动生成文档，Hook 系统 (onStart / onSuccess / onError / onProgress)
- Scenario 文档：Markdown 业务工作流指南

### 社区展示：Mermaid Live Editor

给 [Mermaid 官方在线编辑器](https://mermaid.live)接入 rtc-agent，**不到 30 行胶水代码**，零修改上游源码：

- 🗣️ 根据自然语言描述生成 Mermaid 代码
- ✍️ 自动写入编辑器并触发实时预览
- ✅ 主动调用语法校验，发现错误后自修复
- 🎨 全程无需用户手写一行代码

### 完整文档

26 个页面，中英文双语，涵盖：

- 架构总览、前端、后端
- 核心概念：RTC、虚拟文件系统、脚本引擎、工作模式
- 特性：Session、消息、Skill、命令、记忆、上下文、实时通信
- 集成指南：认证、组件 API、函数注册、场景编写
- 协议参考：HTTP API、WebSocket RPC、事件
- 部署指南：源码构建、分布式部署

---

## 我能为你做什么

### 💬 IM 系统开发

这是我最有经验的领域。从 zero-im 到 Telegram 私人服务器，我做过完整的 IM 系统：

- 基于 Go Zero 的微服务架构，支持 20 万并发在线
- Telegram 协议兼容（update 机制、消息同步、群组管理）
- K8S 部署与运维，生产级稳定性

### 🤖 AI Agent 系统

RTC-Agent 是我从零独立完成的 AI Agent 平台：

- 自研 Remote Tool Calling 协议，让 AI 在浏览器端执行操作
- Agent 引擎 + 记忆系统 + 上下文管理 + 脚本沙箱
- Anthropic SDK / Eino 集成，支持 Claude 和 OpenAI 兼容模型
- 完整的前端组件库（Lit Web Components）+ 后端服务 + 文档站

### 🔧 Go 微服务 + 基础设施

多年后端实战经验：

- Go + GORM + PostgreSQL + Redis 技术栈
- WebSocket 实时通信（Centrifuge）
- OAuth2 认证、微服务治理、可观测性（OpenTelemetry + Prometheus + Grafana）
- Docker / K8S 部署

### 🌐 全栈开发

- TypeScript 前端 + Lit Web Components 组件库
- IndexedDB 本地存储、Babel AST 脚本沙箱
- Astro 文档站、中英文双语技术文档

---

## 为什么选择我

1. **独立交付能力**：RTC Agent 从协议设计到 UI 组件，从 Agent 引擎到文档站，全部独立完成
2. **深度技术栈**：不只是会调 API，而是理解底层机制（状态机、Checkpoint、AST 变换、双通道通信）
3. **产品思维**：关注用户体验和开发者体验，不只是完成任务
4. **隐私优先**：把隐私作为设计约束而非附加功能
5. **完整文档**：交付的不只是代码，而是完整的文档、示例和集成指南

---

## 联系方式

- 📧 **Email**: [meishouyue@gmail.com]
- 🔗 **GitHub**: [@PineappleBond](https://github.com/PineappleBond)
- 🌐 **网站**: [RTC-Agent](https://rtc-agent.github.io/docs/)
- 💬 **手机号**: [+86 15666355528]

---

如果你正在寻找一位**能独立交付完整系统**的全栈工程师——从协议设计到前端组件，从 Agent 引擎到 K8S 部署——欢迎联系我。
