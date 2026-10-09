---
title: 真实接入
description: 将 RTC Agent 集成到你的生产应用，让 AI 助手调用你的业务 API。
---

适合：想将 RTC Agent 深度集成到生产应用，让 AI 助手调用你的业务 API。

## 前置条件

- ✅ 完成[快速入门](/getting-started/)
- 你的后端需要暴露一些 API

## Step 1: 宿主应用需要暴露的 API

RTC Agent 需要与你的应用交互。你的后端需要暴露以下 API：

### 1.1 认证 API（必需）

前端组件需要获取 JWT Token 来连接 RTC Agent Server。你的后端需要提供：

| 端点 | 方法 | 用途 | 调用者 |
| :--- | :--- | :--- | :--- |
| `/api/auth/token` | POST | 签发 RTC Agent 的 JWT Token | 前端组件 |
| `/api/auth/refresh` | POST | 刷新 Token | 前端组件 |

**Token 签发请求示例**：

```http
POST /api/auth/token
Content-Type: application/json
Authorization: Bearer <用户已有的认证 token>

{
  "user_id": "user-123",
  "expires_in": 3600
}
```

**响应示例**：

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJ..."
}
```

> 💡 **Token Exchange 模式**：如果你的应用已有 JWT 认证系统，可以使用 Token Exchange 模式（RFC 8693），直接交换现有 JWT，无需额外实现 Token 签发逻辑。详见 [认证与授权](/integration/auth/) 和 [Token Exchange 示例](/integration/token-exchange-example/)。

### 1.2 业务 Function API（可选）

如果你想让 AI 调用你的业务功能，需要在前端注册 Function。Function 的 handler 会调用你的后端 API：

```typescript
import { createRtcAgent, z } from '@rtc-agent/component';

const agent = createRtcAgent({
  // ...
  groups: [{
    name: 'myApp',
    functions: [
      {
        name: 'getUserProfile',
        description: '获取当前用户信息',
        handler: () => fetch('/api/user/profile').then(r => r.json()),
      },
      {
        name: 'createOrder',
        description: '创建订单',
        zodSchema: z.object({
          productId: z.string(),
          quantity: z.number(),
        }),
        // handler 接收 zodSchema 校验后的参数，返回 Promise<any> 或普通对象
        handler: (params: { productId: string; quantity: number }) => fetch('/api/orders', {
          method: 'POST',
          body: JSON.stringify(params),
        }).then(r => r.json()),
      },
    ],
  }],
});
```

> 💡 `z` 来自 [Zod](https://zod.dev/) 校验库，用于定义函数参数的类型和校验规则。`withMeta` 可以为参数添加示例值和描述，帮助 AI 更好地理解如何使用你的函数。

## Step 2: 配置 Server

### 2.1 环境变量

编辑 `.env`：

```bash
# 必填
LLM__API_KEY=sk-ant-xxx...
# ⚠️ 此 secret 必须与你后端签发 JWT 时使用的 secret 一致，否则 Token 验证失败
AUTH__JWT_SECRET=your-strong-secret  # openssl rand -base64 32

# 可选：GitHub OAuth2
PROVIDERS__GITHUB__ENABLED=true
PROVIDERS__GITHUB__CLIENT_ID=xxx
PROVIDERS__GITHUB__CLIENT_SECRET=xxx
```

> 💡 **配置优先级**：环境变量 > config.yaml > 默认值。敏感信息（如 API Key、密钥）建议通过 `.env` 配置，其他配置可以写在 `config.yaml` 中。

### 2.2 Server 配置

在 server 仓库根目录，编辑 `etc/config.yaml`（Docker Compose 部署时编辑 `etc/config.docker.yaml`）：

```yaml
# LLM 配置
llm:
  provider: "claude"
  model: "claude-sonnet-4-20250514"

# CORS（允许前端域名访问）
cors:
  allow_origins:
    - "https://your-app.com"

# Token Exchange（企业集成推荐）
# 如果你的应用已有 JWT 认证系统（如 Auth0、Clerk、自建 Auth Server），
# 可以使用 Token Exchange 模式：用户登录后，前端用你应用的 JWT 换取 RTC Agent 的 JWT，
# 无需用户再次登录。
#
# 需要你的 Auth Server 提供 JWKS（JSON Web Key Set）公钥端点。
# JWKS 是一组用于验证 JWT 签名的公钥，大多数认证服务（Auth0、Clerk 等）自动提供。
# 例如：Auth0 的 JWKS 端点通常是 https://YOUR_DOMAIN/.well-known/jwks.json
token_exchange:
  external_issuers:
    - name: "your-auth-server"
      issuer: "https://auth.your-app.com"
      jwks_uri: "https://auth.your-app.com/.well-known/jwks.json"
      allowed_algorithms: ["RS256"]
      cache_ttl: 3600
```

> 💡 **Admin Server 配置**：如果你部署了 Admin 后台（用户管理、权限管理），需要额外配置 `etc/admin.yaml`（本地）或 `etc/admin.docker.yaml`（Docker）。Admin Server 使用 RS256 JWT 算法，需要生成 RSA 密钥对。详见 [Admin Server 配置参考](https://github.com/rtc-agent/server/blob/main/etc/admin.yaml)。

## Step 3: 嵌入前端组件

### 方式 A：CDN 接入

```html
<!-- 引入组件 -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@rtc-agent/component@latest/dist/index.js"></script>

<!-- 使用工厂函数配置 -->
<script type="module">
  import { createRtcAgent } from 'https://cdn.jsdelivr.net/npm/@rtc-agent/component@latest/dist/index.js';

  // 设备 ID 生成：每个浏览器/设备需要一个唯一标识，用于多设备区分会话和安全审计
  // 建议由后端生成并下发，或前端使用 crypto.randomUUID() 生成后持久化
  function getOrCreateDeviceId() {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('device_id', id);
    }
    return id;
  }

  const agent = createRtcAgent({
    appLabel: '我的应用 AI 助手',
    server: {
      url: 'https://rtc-agent.your-app.com',
      redirectUri: '/auth/callback.html',  // 仅在使用 GitHub/Google OAuth2 时需要，纯 Token Exchange 模式可省略
    },
    // Token Exchange 模式（企业集成推荐）
    auth: {
      type: 'token-exchange',
      getExchangeToken: async () => {
        const res = await fetch('/api/auth/exchange-token');
        const data = await res.json();
        return data.token;
      },
      isLoggedIn: () => !!localStorage.getItem('user'),
      logout: async () => { localStorage.clear(); },
      getUserId: () => localStorage.getItem('user_id'),
      deviceId: getOrCreateDeviceId(),
    },
    workerURL: '/rtc-agent/shared-worker.js',
    groups: [{
      name: 'myApp',
      functions: [
        // 你的业务 Function
      ],
    }],
  });

  document.body.appendChild(agent);
</script>
```

### 方式 B：NPM 接入

**安装依赖**：

```bash
pnpm add @rtc-agent/component
```

**配置 SharedWorker（重要）**：

在 `package.json` 中添加 `postinstall` 脚本，确保安装和升级时自动配置 SharedWorker：

```json
{
  "scripts": {
    "postinstall": "rtc-agent-setup"
  }
}
```

> ⚠️ **必须配置**：每次升级 `@rtc-agent/component` 时，需要重新运行 `rtc-agent-setup` 来更新 SharedWorker 文件。使用 `postinstall` 脚本可以自动化这个过程。如果已有 `postinstall`，可以追加：`"postinstall": "your-script && rtc-agent-setup"`。也可以手动运行 `npx rtc-agent-setup`。

首次运行：

```bash
npx rtc-agent-setup
```

**使用组件**：

```typescript
import { createRtcAgent, z, withMeta } from '@rtc-agent/component';

// authStore 示例：替换为你的实际认证库（Auth0、Clerk、自定义等）
// const authStore = { user: true, userId: 'user-123', deviceId: 'device-456', signOut: async () => {} };

const agent = createRtcAgent({
  appLabel: '我的应用 AI 助手',
  server: {
    url: 'https://rtc-agent.your-app.com',
    redirectUri: '/auth/callback.html',  // 仅在使用 GitHub/Google OAuth2 时需要，纯 Token Exchange 模式可省略
  },
  auth: {
    type: 'token-exchange',
    getExchangeToken: async () => {
      const res = await fetch('/api/auth/exchange-token');
      const data = await res.json();
      return data.token;
    },
    isLoggedIn: () => !!authStore.user,
    logout: async () => authStore.signOut(),
    getUserId: () => authStore.userId,
    deviceId: authStore.deviceId,
  },
  workerURL: '/rtc-agent/shared-worker.js',
  groups: [{
    name: 'myApp',
    functions: [
      {
        name: 'getUserProfile',
        description: '获取当前用户信息',
        handler: () => fetch('/api/user/profile').then(r => r.json()),
        returns: { zodSchema: z.object({ name: z.string(), email: z.string() }) },
      },
      {
        name: 'createOrder',
        description: '创建新订单',
        zodSchema: z.object({
          productId: withMeta(z.string(), { example: 'prod-123' }).describe('商品 ID'),
          quantity: withMeta(z.number(), { example: 2 }).describe('数量'),
        }),
        handler: async (params) => {
          const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
          });
          return res.json();
        },
      },
    ],
  }],
});

document.body.appendChild(agent);
```

> 💡 **SharedWorker 说明**：`npx rtc-agent-setup` 会将 SharedWorker 文件复制到 `public/rtc-agent/` 目录。SharedWorker 用于在多个浏览器标签页之间共享 WebSocket 连接，避免重复连接和认证。`workerURL` 必须指向这个文件。

## 框架集成示例

### React

```tsx
import { useEffect, useRef } from 'react';
import { createRtcAgent } from '@rtc-agent/component';
import type { RtcAgentWithLifecycle } from '@rtc-agent/component';

// authStore 示例：替换为你的实际认证库（Auth0、Clerk、自定义等）
// const authStore = { user: true, userId: 'user-123', deviceId: 'device-456', signOut: async () => {} };

function RtcAgentWrapper() {
  const agentRef = useRef<RtcAgentWithLifecycle | null>(null);

  useEffect(() => {
    agentRef.current = createRtcAgent({
      appLabel: 'My App',
      server: {
        url: 'https://rtc-agent.your-app.com',
        redirectUri: '/auth/callback.html',
      },
      auth: {
        type: 'token-exchange',
        getExchangeToken: async () => {
          const res = await fetch('/api/auth/exchange-token');
          return (await res.json()).token;
        },
        isLoggedIn: () => !!authStore.user,
        logout: async () => authStore.signOut(),
        getUserId: () => authStore.userId,
        deviceId: authStore.deviceId,
      },
      workerURL: '/rtc-agent/shared-worker.js',
    });

    document.body.appendChild(agentRef.current);

    return () => {
      agentRef.current?.destroy();
    };
  }, []);

  return null;
}
```

### Vue

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createRtcAgent } from '@rtc-agent/component';
import type { RtcAgentWithLifecycle } from '@rtc-agent/component';

// authStore 示例：替换为你的实际认证库（Auth0、Clerk、自定义等）
// const authStore = { user: true, userId: 'user-123', deviceId: 'device-456', signOut: async () => {} };

const agentRef = ref<RtcAgentWithLifecycle | null>(null);

onMounted(() => {
  agentRef.value = createRtcAgent({
    appLabel: 'My App',
    server: {
      url: 'https://rtc-agent.your-app.com',
      redirectUri: '/auth/callback.html',
    },
    auth: {
      type: 'token-exchange',
      getExchangeToken: async () => {
        const res = await fetch('/api/auth/exchange-token');
        return (await res.json()).token;
      },
      isLoggedIn: () => !!authStore.user,
      logout: async () => authStore.signOut(),
      getUserId: () => authStore.userId,
      deviceId: authStore.deviceId,
    },
    workerURL: '/rtc-agent/shared-worker.js',
  });
  document.body.appendChild(agentRef.value);
});

onUnmounted(() => {
  agentRef.value?.destroy();
});
</script>
```

## 参考示例

| 示例 | 框架 | 接入方式 | 认证 | 关键文件 |
| :--- | :--- | :--- | :--- | :--- |
| Admin UI | React (Umi Max) | NPM | Token Exchange | [rtc-agent-manager.ts](https://github.com/rtc-agent/web-components/blob/main/packages/admin-ui/src/utils/rtc-agent-manager.ts)、[rtc-auth-provider.ts](https://github.com/rtc-agent/web-components/blob/main/packages/admin-ui/src/utils/rtc-auth-provider.ts) |
| Mermaid Live Editor | SvelteKit | NPM | GitHub OAuth2 | [+layout.svelte](https://github.com/rtc-agent/mermaid-live-editor/blob/main/src/routes/+layout.svelte) |
| 官方文档站 | Astro | CDN | GitHub OAuth2 | [astro.config.mjs](https://github.com/rtc-agent/docs/blob/main/astro.config.mjs) |

> 💡 **Admin UI** 是 Token Exchange 模式的完整实现：admin-server 签发 admin JWT → `getExchangeToken()` 返回 admin JWT → RTC Agent 组件内部调用 `OAuth2Client.tokenExchange()` 交换为 RTC JWT → 用于 WebSocket 连接认证。

## 权限感知的 Function 注册

对于生产应用，不同的用户可能有不同的权限，需要动态决定哪些 Function 对哪些用户可见。admin-ui 项目展示了完整的权限感知注册模式：

### 核心思路

```text
所有 Function Groups → 按用户权限过滤 → 只注册有权限的 Function
```

### 示例代码（参考 admin-ui 实现）

> ⚠️ `requiredPermission` 是开发者自定义的字段，RTC Agent **不内置**权限过滤。你需要像下面的 `filterGroupsByPermissions` 一样自行实现过滤逻辑，在注册 Function 前过滤掉无权限的函数。

```typescript
import { createRtcAgent, z } from '@rtc-agent/component';

// 1. 定义所有 Function Groups
const allGroups = [
  {
    name: 'userManagement',
    description: '用户管理操作',
    functions: [
      {
        name: 'listUsers',
        description: '列出所有用户',
        requiredPermission: 'user:read',  // 自定义权限标识
        handler: () => fetch('/api/users').then(r => r.json()),
      },
      {
        name: 'deleteUser',
        description: '删除用户',
        requiredPermission: 'user:delete',  // 需要更高权限
        zodSchema: z.object({ userId: z.string() }),
        handler: (params) => fetch(`/api/users/${params.userId}`, { method: 'DELETE' }),
      },
    ],
  },
  {
    name: 'reports',
    description: '报表操作',
    functions: [
      {
        name: 'generateReport',
        description: '生成报表',
        requiredPermission: 'report:write',
        handler: () => fetch('/api/reports/generate', { method: 'POST' }),
      },
    ],
  },
];

// 2. 根据用户权限过滤 Function Groups
function filterGroupsByPermissions(
  groups: any[],
  userPermissions: string[]
) {
  return groups
    .map(group => ({
      ...group,
      functions: group.functions.filter(
        fn => !fn.requiredPermission || userPermissions.includes(fn.requiredPermission)
      ),
    }))
    .filter(group => group.functions.length > 0);  // 移除空 group
}

// 3. 创建 agent，只注册有权限的 Function
const userPermissions = ['user:read', 'report:write'];  // 从后端获取

const agent = createRtcAgent({
  appLabel: '管理后台',
  server: { url: 'https://rtc-agent.your-app.com' },
  auth: { /* ... */ },
  workerURL: '/rtc-agent/shared-worker.js',
  groups: filterGroupsByPermissions(allGroups, userPermissions),
});
```

> 💡 **admin-ui 的实现**：完整的权限感知注册可参考 [admin-ui 源码](https://github.com/rtc-agent/web-components/blob/main/packages/admin-ui/src/rtc-agent/index.ts)。它根据 Casbin RBAC 权限系统过滤 Function，不同角色的管理员看到的 AI 能力不同。

## 常见问题

**Token Exchange 返回 401？**

- 检查 `token_exchange.external_issuers` 中的 `issuer` 是否与你应用 JWT 的 `iss` claim 完全一致
- 确认 `jwks_uri` 可公开访问，且返回正确的公钥
- 检查 JWT 算法是否在 `allowed_algorithms` 中

**CORS 报错？**

- 在 `config.yaml` 中配置 `cors.allow_origins`，添加你的前端域名
- 开发模式下未配置时默认允许所有来源，生产模式必须显式配置

**Function 调用失败？**

- 检查 `zodSchema` 是否正确定义，参数类型是否匹配
- 查看浏览器控制台的错误信息
- 确认 handler 函数返回正确的数据格式

**SharedWorker 不工作？**

- 确认已运行 `npx rtc-agent-setup`
- 检查 `public/rtc-agent/shared-worker.js` 文件是否存在
- 确认 `workerURL` 路径与实际文件位置一致

## 下一步

- [认证与授权](/integration/auth/) — 深入了解 Token Exchange 机制
- [Scenario 编写](/integration/scenario-authoring/) — 给 AI 提供业务上下文
- [Function 注册](/integration/function-registration/) — 详细文档
- [Web Component API](/integration/component-api/) — 完整的组件 API 参考
