---
title: Integration Guide
description: Integrate RTC Agent into your production application with AI assistant calling your business APIs.
---

For: Deep integration of RTC Agent into production apps, letting AI assistant call your business APIs.

## Prerequisites

- ✅ Completed [Getting Started](/en/getting-started/)
- Your backend needs to expose some APIs

## Step 1: Host Application APIs

RTC Agent needs to interact with your app. Your backend needs to expose the following APIs:

### 1.1 Authentication API (Required)

The frontend component needs a JWT Token to connect to RTC Agent Server. Your backend needs to provide:

| Endpoint | Method | Purpose | Caller |
| :--- | :--- | :--- | :--- |
| `/api/auth/token` | POST | Issue RTC Agent JWT Token | Frontend component |
| `/api/auth/refresh` | POST | Refresh Token | Frontend component |

**Token request example**:

```http
POST /api/auth/token
Content-Type: application/json
Authorization: Bearer <user's existing auth token>

{
  "user_id": "user-123",
  "expires_in": 3600
}
```

**Response example**:

```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJ..."
}
```

> 💡 **Token Exchange mode**: If your app already has JWT authentication, you can use Token Exchange mode (RFC 8693) to directly exchange existing JWTs without implementing additional token issuance logic. See [Authentication](/en/integration/auth/) and [Token Exchange Example](/en/integration/token-exchange-example/) for details.

### 1.2 Business Function API (Optional)

If you want AI to call your business features, register Functions on the frontend. Function handlers will call your backend APIs:

```typescript
import { createRtcAgent, z } from '@rtc-agent/component';

const agent = createRtcAgent({
  // ...
  groups: [{
    name: 'myApp',
    functions: [
      {
        name: 'getUserProfile',
        description: 'Get current user info',
        handler: () => fetch('/api/user/profile').then(r => r.json()),
      },
      {
        name: 'createOrder',
        description: 'Create an order',
        zodSchema: z.object({
          productId: z.string(),
          quantity: z.number(),
        }),
        // handler receives params validated by zodSchema, returns Promise<any> or plain object
        handler: (params: { productId: string; quantity: number }) => fetch('/api/orders', {
          method: 'POST',
          body: JSON.stringify(params),
        }).then(r => r.json()),
      },
    ],
  }],
});
```

> 💡 `z` comes from the [Zod](https://zod.dev/) validation library for defining parameter types and validation rules. `withMeta` adds example values and descriptions to help AI better understand how to use your functions.

## Step 2: Configure Server

### 2.1 Environment Variables

Edit `.env`:

```bash
# Required
LLM__API_KEY=sk-ant-xxx...
# ⚠️ This secret must match the one your backend uses to sign JWTs, otherwise token verification will fail
AUTH__JWT_SECRET=your-strong-secret  # openssl rand -base64 32

# Optional: GitHub OAuth2
PROVIDERS__GITHUB__ENABLED=true
PROVIDERS__GITHUB__CLIENT_ID=xxx
PROVIDERS__GITHUB__CLIENT_SECRET=xxx
```

> 💡 **Config priority**: Environment variables > config.yaml > defaults. Sensitive info (API keys, secrets) should be in `.env`; other config can go in `config.yaml`.

### 2.2 Server Configuration

In the server repo root, edit `etc/config.yaml` (or `etc/config.docker.yaml` when using Docker Compose):

```yaml
# LLM config
llm:
  provider: "claude"
  model: "claude-sonnet-4-20250514"

# CORS (allow frontend domain access)
cors:
  allow_origins:
    - "https://your-app.com"

# Token Exchange (recommended for enterprise integration)
# If your app already has JWT auth (Auth0, Clerk, custom Auth Server),
# you can use Token Exchange: after user login, frontend exchanges your app's JWT for RTC Agent JWT,
# no re-login needed.
#
# Your Auth Server needs to provide a JWKS (JSON Web Key Set) public key endpoint.
# JWKS is a set of public keys used to verify JWT signatures. Most auth services
# (Auth0, Clerk, etc.) provide this automatically.
# Example: Auth0's JWKS endpoint is typically https://YOUR_DOMAIN/.well-known/jwks.json
token_exchange:
  external_issuers:
    - name: "your-auth-server"
      issuer: "https://auth.your-app.com"
      jwks_uri: "https://auth.your-app.com/.well-known/jwks.json"
      allowed_algorithms: ["RS256"]
      cache_ttl: 3600
```

> 💡 **Admin Server config**: If you deploy the Admin dashboard (user management, permissions), you need to configure `etc/admin.yaml` (local) or `etc/admin.docker.yaml` (Docker). Admin Server uses RS256 JWT algorithm and requires RSA key pair generation. See [Admin Server config reference](https://github.com/rtc-agent/server/blob/main/etc/admin.yaml) for details.

## Step 3: Embed Frontend Component

### Method A: CDN

```html
<!-- Import component -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@rtc-agent/component@latest/dist/index.js"></script>

<!-- Configure using factory function -->
<script type="module">
  import { createRtcAgent } from 'https://cdn.jsdelivr.net/npm/@rtc-agent/component@latest/dist/index.js';

  // Device ID generation: each browser/device needs a unique identifier for multi-device session tracking and security audits
  // Recommend getting from backend, or generate locally with crypto.randomUUID() and persist
  function getOrCreateDeviceId() {
    let id = localStorage.getItem('device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('device_id', id);
    }
    return id;
  }

  const agent = createRtcAgent({
    appLabel: 'My App AI Assistant',
    server: {
      url: 'https://rtc-agent.your-app.com',
      redirectUri: '/auth/callback.html',  // Only needed for GitHub/Google OAuth2; can be omitted for pure Token Exchange
    },
    // Token Exchange mode (recommended for enterprise integration)
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
        // Your business Functions
      ],
    }],
  });

  document.body.appendChild(agent);
</script>
```

### Method B: NPM

**Install dependency**:

```bash
pnpm add @rtc-agent/component
```

**Configure SharedWorker (Important)**:

Add `postinstall` script in `package.json` to ensure SharedWorker is configured on install and upgrade:

```json
{
  "scripts": {
    "postinstall": "rtc-agent-setup"
  }
}
```

> ⚠️ **Required**: Each time you upgrade `@rtc-agent/component`, you need to re-run `rtc-agent-setup` to update the SharedWorker file. Using `postinstall` automates this. If you already have `postinstall`, append: `"postinstall": "your-script && rtc-agent-setup"`. You can also manually run `npx rtc-agent-setup`.

Run for the first time:

```bash
npx rtc-agent-setup
```

**Use the component**:

```typescript
import { createRtcAgent, z, withMeta } from '@rtc-agent/component';

// authStore example: Replace with your actual auth library (Auth0, Clerk, custom, etc.)
// const authStore = { user: true, userId: 'user-123', deviceId: 'device-456', signOut: async () => {} };

const agent = createRtcAgent({
  appLabel: 'My App AI Assistant',
  server: {
    url: 'https://rtc-agent.your-app.com',
    redirectUri: '/auth/callback.html',  // Only needed for GitHub/Google OAuth2; can be omitted for pure Token Exchange
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
  groups: [{
    name: 'myApp',
    functions: [
      {
        name: 'getUserProfile',
        description: 'Get current user info',
        handler: () => fetch('/api/user/profile').then(r => r.json()),
        returns: { zodSchema: z.object({ name: z.string(), email: z.string() }) },
      },
      {
        name: 'createOrder',
        description: 'Create a new order',
        zodSchema: z.object({
          productId: withMeta(z.string(), { example: 'prod-123' }).describe('Product ID'),
          quantity: withMeta(z.number(), { example: 2 }).describe('Quantity'),
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

> 💡 **SharedWorker explanation**: `rtc-agent-setup` copies the SharedWorker file to `public/rtc-agent/`. SharedWorker is used to share WebSocket connections across multiple browser tabs, avoiding duplicate connections and authentication. `workerURL` must point to this file.

## Framework Integration Examples

### React

```tsx
import { useEffect, useRef } from 'react';
import { createRtcAgent } from '@rtc-agent/component';
import type { RtcAgentWithLifecycle } from '@rtc-agent/component';

// authStore example: Replace with your actual auth library (Auth0, Clerk, custom, etc.)
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

// authStore example: Replace with your actual auth library (Auth0, Clerk, custom, etc.)
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

## Permission-Aware Function Registration

For production apps, different users may have different permissions, requiring dynamic decisions about which Functions are visible to which users. The admin-ui project demonstrates a complete permission-aware registration pattern:

### Core Concept

```text
All Function Groups → Filter by user permissions → Only register permitted Functions
```

### Example Code (referencing admin-ui implementation)

> ⚠️ `requiredPermission` is a developer-defined custom field. RTC Agent does **not** have built-in permission filtering. You need to implement filtering logic yourself (like `filterGroupsByPermissions` below) to filter out unauthorized functions before registering them.

```typescript
import { createRtcAgent, z } from '@rtc-agent/component';

// 1. Define all Function Groups
const allGroups = [
  {
    name: 'userManagement',
    description: 'User management operations',
    functions: [
      {
        name: 'listUsers',
        description: 'List all users',
        requiredPermission: 'user:read',  // Custom permission identifier
        handler: () => fetch('/api/users').then(r => r.json()),
      },
      {
        name: 'deleteUser',
        description: 'Delete a user',
        requiredPermission: 'user:delete',  // Requires higher permission
        zodSchema: z.object({ userId: z.string() }),
        handler: (params) => fetch(`/api/users/${params.userId}`, { method: 'DELETE' }),
      },
    ],
  },
  {
    name: 'reports',
    description: 'Report operations',
    functions: [
      {
        name: 'generateReport',
        description: 'Generate a report',
        requiredPermission: 'report:write',
        handler: () => fetch('/api/reports/generate', { method: 'POST' }),
      },
    ],
  },
];

// 2. Filter Function Groups by user permissions
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
    .filter(group => group.functions.length > 0);  // Remove empty groups
}

// 3. Create agent, only register permitted Functions
const userPermissions = ['user:read', 'report:write'];  // Get from backend

const agent = createRtcAgent({
  appLabel: 'Admin Dashboard',
  server: { url: 'https://rtc-agent.your-app.com' },
  auth: { /* ... */ },
  workerURL: '/rtc-agent/shared-worker.js',
  groups: filterGroupsByPermissions(allGroups, userPermissions),
});
```

> 💡 **admin-ui implementation**: For complete permission-aware registration, see [admin-ui source code](https://github.com/rtc-agent/web-components/blob/main/packages/admin-ui/src/rtc-agent/index.ts). It filters Functions based on Casbin RBAC permission system — administrators with different roles see different AI capabilities.

## Example Projects

| Example | Framework | Integration | Auth | Key Files |
| :--- | :--- | :--- | :--- | :--- |
| Admin UI | React (Umi Max) | NPM | Token Exchange | [rtc-agent-manager.ts](https://github.com/rtc-agent/web-components/blob/main/packages/admin-ui/src/utils/rtc-agent-manager.ts), [rtc-auth-provider.ts](https://github.com/rtc-agent/web-components/blob/main/packages/admin-ui/src/utils/rtc-auth-provider.ts) |
| Mermaid Live Editor | SvelteKit | NPM | GitHub OAuth2 | [+layout.svelte](https://github.com/rtc-agent/mermaid-live-editor/blob/main/src/routes/+layout.svelte) |
| Official Docs | Astro | CDN | GitHub OAuth2 | [astro.config.mjs](https://github.com/rtc-agent/docs/blob/main/astro.config.mjs) |

> 💡 **Admin UI** is a complete Token Exchange implementation: admin-server issues admin JWT → `getExchangeToken()` returns admin JWT → RTC Agent component internally calls `OAuth2Client.tokenExchange()` to exchange for RTC JWT → used for WebSocket connection authentication.

## FAQ

**Token Exchange returns 401?**

- Check `token_exchange.external_issuers` `issuer` matches your app JWT's `iss` claim exactly
- Confirm `jwks_uri` is publicly accessible and returns correct public keys
- Check JWT algorithm is in `allowed_algorithms`

**CORS error?**

- Configure `cors.allow_origins` in `config.yaml`, add your frontend domain
- In development mode without configuration, defaults to allowing all origins; production mode requires explicit configuration

**Function call fails?**

- Check `zodSchema` is correctly defined and parameter types match
- Check browser console for errors
- Confirm handler function returns correct data format

**SharedWorker not working?**

- Confirm you ran `npx rtc-agent-setup`
- Check `public/rtc-agent/shared-worker.js` file exists
- Confirm `workerURL` path matches actual file location

## Next Steps

- [Authentication](/en/integration/auth/) — Deep dive into Token Exchange mechanism
- [Scenario Authoring](/en/integration/scenario-authoring/) — Provide business context to AI
- [Function Registration](/en/integration/function-registration/) — Detailed documentation
- [Web Component API](/en/integration/component-api/) — Complete component API reference
