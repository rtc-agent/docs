---
title: Integration Tutorial
description: A complete hands-on guide to integrating RTC Agent Web Component into your web application — from quick CDN setup to full NPM integration with SharedWorker configuration
---

This guide demonstrates how to integrate the RTC Agent Web Component into your web application, covering both quick CDN setup and full NPM integration with SharedWorker configuration.

## Integration Methods

| Method | Use Case | Pros | Cons |
| --- | --- | --- | --- |
| **CDN (quick start)** | Documentation sites, demos, prototypes | Zero config, Workers resolve automatically | Depends on external CDN, limited customization |
| **NPM + createRtcAgent() (recommended)** | Production applications, full control | Type safety, tree-shaking, SharedWorker for multi-tab | Requires SharedWorker setup (one-time) |

## Quick Start: CDN Integration

For documentation sites or quick demos, load via CDN and use the `createRtcAgent()` factory function:

```html
<!-- Import and configure in one step -->
<script type="module">
  import { createRtcAgent } from 'https://cdn.jsdelivr.net/npm/@rtc-agent/component@0.2.6-rc.1/dist/index.js';

  const agent = createRtcAgent({
    server: { url: 'https://rtc-agent.cherish.chat' },
  });

  document.body.appendChild(agent);
</script>
```

The component automatically connects to the Server on the current page's domain.

### Example: Astro Documentation Site

**File**: `astro.config.mjs`

```javascript
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://your-site.github.io',
  base: '/docs',
  integrations: [
    starlight({
      title: 'Your Site',
      head: [
        // Load and configure RTC Agent using factory function
        {
          tag: 'script',
          attrs: { type: 'module' },
          content: `
            import { z, withMeta, createRtcAgent } from 'https://cdn.jsdelivr.net/npm/@rtc-agent/component@0.2.6-rc.1/dist/index.js';

            const initRtcAgent = async () => {
              if (document.querySelector('#rtc-agent-global')) return;

              const agent = createRtcAgent({
                appLabel: 'RTC Agent Assistant',
                theme: 'system',
                server: {
                  url: 'https://rtc-agent.cherish.chat',
                  redirectUri: '/docs/auth/callback.html',
                },
                window: {
                  defaultMode: 'minimized',
                  draggable: true,
                  resizable: true,
                  bubblePosition: {
                    corner: 'bottom-right',
                    offset: { x: -24, y: 24 },
                  },
                },
                agentName: 'DocsAssistant',
                persona: 'You are a helpful documentation assistant.',
                groups: [{
                  name: 'docs',
                  description: 'Documentation functions',
                  functions: [
                    {
                      name: 'searchDocs',
                      description: 'Search documentation by keywords',
                      zodSchema: z.object({
                        query: withMeta(z.string(), { example: 'RTC Agent setup' })
                          .describe('Search keywords')
                      }),
                      handler: async ({ query }) => {
                        // Your search implementation
                        return [{ path: '/getting-started/', title: 'Quick Start' }];
                      },
                    },
                  ],
                }],
              });

              const container = document.createElement('div');
              container.id = 'rtc-agent-global';
              container.appendChild(agent);
              document.body.appendChild(container);

              // Global styles
              const style = document.createElement('style');
              style.textContent = \`
                #rtc-agent-global {
                  position: fixed;
                  bottom: 0;
                  right: 0;
                  z-index: 9999;
                  pointer-events: none;
                }
                #rtc-agent-global rtc-agent {
                  pointer-events: auto;
                }
              \`;
              document.head.appendChild(style);
            };

            document.addEventListener('DOMContentLoaded', () => initRtcAgent());
          `,
        },
      ],
    }),
  ],
});
```

**Key differences from the old pattern:**

- ✅ Import `createRtcAgent`, `z`, `withMeta` from CDN
- ✅ Use factory function instead of manual element creation
- ✅ All configuration in one declarative object
- ✅ No need to wait for `rtc-agent-ready` event
- ✅ Function registration uses `zodSchema` with `withMeta` examples

## Production Integration: NPM + createRtcAgent()

For production applications, use the `createRtcAgent()` factory function with full type safety and SharedWorker support for multi-tab synchronization.

### Step 1: Install the Package

```bash
pnpm add @rtc-agent/component
# or
npm install @rtc-agent/component
# or
yarn add @rtc-agent/component
```

### Step 2: Setup SharedWorker (Required for Multi-Tab)

RTC Agent uses a SharedWorker to multiplex WebSocket connections across browser tabs. The worker file must be accessible from the browser's public directory.

#### Automatic Setup (Recommended)

Run the CLI tool to automatically copy SharedWorker files to the correct location:

```bash
npx rtc-agent-setup
```

The tool automatically:
- Detects your project type (Vite, Webpack, SvelteKit, etc.)
- Copies SharedWorker files to the correct directory (`static/rtc-agent/` or `public/rtc-agent/`)
- Creates a stable filename `shared-worker.js` for easy reference
- Generates `manifest.json` with version information
- Cleans up old worker files to prevent accumulation

#### Automatic Setup on Install (Best Practice)

Add the setup tool to your `postinstall` script to run automatically after `npm install`:

```json
{
  "scripts": {
    "postinstall": "rtc-agent-setup"
  }
}
```

This ensures:
- SharedWorker files are set up automatically for new developers
- Worker files are updated when upgrading `@rtc-agent/component`
- No manual steps required after dependency changes

> 💡 If you already have a `postinstall` script, append `&& rtc-agent-setup` to it:
> ```json
> {
>   "scripts": {
>     "postinstall": "your-existing-script && rtc-agent-setup"
>   }
> }
> ```

#### Manual Setup

If the CLI tool doesn't work for your setup, manually copy the worker files:

```bash
# Create target directory
mkdir -p public/rtc-agent

# Copy worker files
cp node_modules/@rtc-agent/component/dist/assets/shared-worker*.js public/rtc-agent/

# Create stable link (optional, but recommended)
cd public/rtc-agent
ln -sf shared-worker-*.js shared-worker.js
```

### Step 3: Configure createRtcAgent()

Use the factory function to create and configure the component:

```typescript
import { z, withMeta, createRtcAgent } from '@rtc-agent/component';
import type { RtcAgentWithLifecycle } from '@rtc-agent/component';

// Create the agent instance
const agent: RtcAgentWithLifecycle = createRtcAgent({
  // Basic configuration
  appLabel: 'My AI Assistant',
  theme: 'system',
  lang: 'en-US',
  
  // Server configuration
  server: {
    url: 'https://rtc-agent.cherish.chat',
    redirectUri: '/auth/callback.html',
  },
  
  // SharedWorker URL (required for multi-tab support)
  workerUrl: '/rtc-agent/shared-worker.js',
  
  // Scenario documentation
  scenariosUrl: '/scenarios/',
  
  // Window configuration
  window: {
    defaultMode: 'normal',
    bubblePosition: {
      corner: 'bottom-right',
      offset: { x: -24, y: 24 },
    },
  },
  
  // Function registration (using Zod schema - recommended)
  agentName: 'MyApp',
  agentDescription: 'AI assistant for my application',
  persona: 'You are a helpful assistant...',
  groups: [
    {
      name: 'editor',
      description: 'Editor operations',
      functions: [
        {
          name: 'getCode',
          description: 'Get the current code',
          handler: () => window.editorAPI.getCode(),
          returns: { schema: { type: 'string' } },
        },
        {
          name: 'setCode',
          description: 'Set the editor code',
          zodSchema: z.object({
            code: withMeta(z.string(), { example: 'console.log("hello")' }).describe('The code to set'),
          }),
          handler: (params) => {
            window.editorAPI.setCode(params.code);
            return { success: true };
          },
        },
      ],
    },
  ],
  
  // Event handlers
  on: {
    ready: () => {
      console.log('RTC Agent is ready');
    },
  },
});

// Append to DOM
document.body.appendChild(agent);

// Cleanup when done
agent.destroy();
```

### Step 3.1: Authentication Configuration

The `auth` property in `createRtcAgent()` controls how the component authenticates with the server. Choose the mode that fits your application:

#### Mode 1: Static Token (Dev / CI / Testing)

Pass a fixed access token directly. Simple but not suitable for production — the token expires and cannot be refreshed.

```typescript
const agent = createRtcAgent({
  server: { url: 'https://rtc-agent.example.com' },
  workerUrl: '/rtc-agent/shared-worker.js',
  auth: {
    accessToken: 'your-jwt-token',
    userId: 'user-123',
  },
});
```

#### Mode 2: Dynamic Token (Recommended for Production)

Provide `getToken` and `refreshToken` callbacks so the component can fetch and renew tokens on demand. This is the recommended approach for most production applications.

```typescript
const agent = createRtcAgent({
  server: { url: 'https://rtc-agent.example.com' },
  workerUrl: '/rtc-agent/shared-worker.js',
  auth: {
    userId: 'user-123',
    getToken: async () => {
      const res = await fetch('/api/auth/token');
      const data = await res.json();
      return data.accessToken;
    },
    refreshToken: async () => {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      return res.json();
    },
  },
});
```

#### Mode 3: Auth Provider (Advanced / Multi-Tenant)

Implement a full auth interface with `isLoggedIn` and `logout` hooks. Use this when you have an existing authentication system or need multi-tenant support.

```typescript
const agent = createRtcAgent({
  server: { url: 'https://rtc-agent.example.com' },
  workerUrl: '/rtc-agent/shared-worker.js',
  auth: {
    getToken: async () => myAuthProvider.getToken(),
    refreshToken: async () => myAuthProvider.refresh(),
    isLoggedIn: () => myAuthProvider.isLoggedIn(),
    logout: async () => myAuthProvider.logout(),
  },
});
```

> See [Authentication & Authorization](/en/integration/auth/) for full details on the login flow, token lifecycle, and security best practices.

### Step 4: Framework Integration

#### SvelteKit Example

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { base } from '$app/paths';
  import { createRtcAgent } from '@rtc-agent/component';
  import type { RtcAgentWithLifecycle } from '@rtc-agent/component';

  let rtcAgent: RtcAgentWithLifecycle | null = null;

  onMount(() => {
    rtcAgent = createRtcAgent({
      appLabel: 'My App',
      theme: 'system',
      server: {
        url: 'https://rtc-agent.cherish.chat',
        redirectUri: `${base}/auth/callback.html`,
      },
      workerUrl: `${base}/rtc-agent/shared-worker.js`,
      scenariosUrl: `${base}/scenarios/`,
      // ... other configuration
    });

    document.body.appendChild(rtcAgent);
  });

  onDestroy(() => {
    if (rtcAgent) {
      rtcAgent.destroy();
      rtcAgent = null;
    }
  });
</script>
```

#### React Example

```tsx
import { useEffect, useRef } from 'react';
import { createRtcAgent } from '@rtc-agent/component';
import type { RtcAgentWithLifecycle } from '@rtc-agent/component';

function RTC AgentWrapper() {
  const agentRef = useRef<RtcAgentWithLifecycle | null>(null);

  useEffect(() => {
    agentRef.current = createRtcAgent({
      appLabel: 'My App',
      theme: 'system',
      server: {
        url: 'https://rtc-agent.cherish.chat',
        redirectUri: '/auth/callback.html',
      },
      workerUrl: '/rtc-agent/shared-worker.js',
      // ... other configuration
    });

    document.body.appendChild(agentRef.current);

    return () => {
      if (agentRef.current) {
        agentRef.current.destroy();
        agentRef.current = null;
      }
    };
  }, []);

  return null;
}
```

#### Vue Example

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { createRtcAgent } from '@rtc-agent/component';
import type { RtcAgentWithLifecycle } from '@rtc-agent/component';

const agentRef = ref<RtcAgentWithLifecycle | null>(null);

onMounted(() => {
  agentRef.value = createRtcAgent({
    appLabel: 'My App',
    theme: 'system',
    server: {
      url: 'https://rtc-agent.cherish.chat',
      redirectUri: '/auth/callback.html',
    },
    workerUrl: '/rtc-agent/shared-worker.js',
    // ... other configuration
  });

  document.body.appendChild(agentRef.value);
});

onUnmounted(() => {
  if (agentRef.value) {
    agentRef.value.destroy();
    agentRef.value = null;
  }
});
</script>
```

## createRtcAgent() Configuration Reference

### Basic Configuration

| Property | Type | Default | Description |
|:----:|:----:|:------:|:----:|
| `appLabel` | `string` | `"RTC Agent"` | Title bar text and tooltip |
| `theme` | `"light"` \| `"dark"` \| `"system"` | `"system"` | Theme mode |
| `lang` | `"zh-CN"` \| `"en-US"` | `"zh-CN"` | UI language |
| `databaseName` | `string` | `"rtc-agent"` | IndexedDB name prefix |

### Server Configuration

| Property | Type | Default | Description |
|:----:|:----:|:------:|:----:|
| `server.url` | `string` | `""` | Server address (falls back to current domain) |
| `server.redirectUri` | `string` | `"/auth/callback.html"` | OAuth callback URL |

### SharedWorker Configuration

| Property | Type | Default | Description |
|:----:|:----:|:------:|:----:|
| `workerUrl` | `string` | `undefined` | URL to the SharedWorker file (required for multi-tab support) |

### Authentication Configuration

| Property | Type | Default | Description |
|:----:|:----:|:------:|:----:|
| `auth.accessToken` | `string` | — | Static JWT token (Mode 1) |
| `auth.userId` | `string` | — | User identifier |
| `auth.getToken` | `() => Promise<string>` | — | Async callback to obtain an access token (Mode 2/3) |
| `auth.refreshToken` | `() => Promise<object>` | — | Async callback to refresh the token (Mode 2/3) |
| `auth.isLoggedIn` | `() => boolean` | — | Check whether the user is authenticated (Mode 3) |
| `auth.logout` | `() => Promise<void>` | — | Log the user out (Mode 3) |

### Window Configuration

| Property | Type | Default | Description |
|:----:|:----:|:------:|:----:|
| `window.defaultMode` | `"normal"` \| `"maximized"` \| `"minimized"` | `"normal"` | Initial window mode |
| `window.embedded` | `boolean` | `false` | Embedded mode (no drag/resize/buttons) |
| `window.draggable` | `boolean` | `true` | Whether window can be dragged |
| `window.resizable` | `boolean` | `true` | Whether window can be resized |
| `window.bubblePosition.corner` | `"top-left"` \| `"top-right"` \| `"bottom-left"` \| `"bottom-right"` | `"bottom-right"` | Bubble position corner |
| `window.bubblePosition.offset.x` | `number` | `-20` | Horizontal offset |
| `window.bubblePosition.offset.y` | `number` | `20` | Vertical offset |

### Function Registration

| Property | Type | Default | Description |
|:----:|:----:|:------:|:----:|
| `agentName` | `string` | — | Application name |
| `agentDescription` | `string` | — | Application description |
| `persona` | `string` | — | AI persona/instructions |
| `groups` | `FunctionGroup[]` | `[]` | Function groups for tool registration |

### Event Handlers

| Property | Type | Description |
|:----:|:----:|:----:|
| `on.ready` | `() => void` | Called when component is ready |
| `on.destroy` | `() => void` | Called when component is destroyed |

## Upgrading SharedWorker

When you upgrade `@rtc-agent/component`, re-run the setup tool to update the SharedWorker files:

```bash
npx rtc-agent-setup
```

The tool will:
1. Copy the new worker files
2. Update `manifest.json` with the new version
3. Overwrite the old `shared-worker.js`

### Cache Management

For production deployments, use version-based cache busting:

```typescript
// Read manifest.json
const manifest = await fetch('/rtc-agent/manifest.json').then(r => r.json());
const workerUrl = `/rtc-agent/shared-worker.js?v=${manifest.version}`;

// Use in createRtcAgent()
const agent = createRtcAgent({
  workerUrl,
  // ...
});
```

Or configure your web server to disable caching for the worker file:

```nginx
location /rtc-agent/shared-worker.js {
  add_header Cache-Control "no-cache, must-revalidate";
}
```

## Troubleshooting

### SharedWorker 404 Error

**Symptom**: Console shows 404 error for SharedWorker file

**Solution**:
1. Verify worker files exist: `ls public/rtc-agent/` or `ls static/rtc-agent/`
2. Check `workerUrl` path matches the actual file location
3. Restart the dev server
4. Re-run `npx rtc-agent-setup`

### Multi-Tab Not Syncing

**Symptom**: Changes in one tab don't appear in other tabs

**Solution**:
1. Ensure `workerUrl` is configured in `createRtcAgent()`
2. Check browser console for SharedWorker errors
3. Verify all tabs are on the same origin (protocol + domain + port)
4. Check that SharedWorker is not blocked by browser extensions

### Import Resolution Error

**Symptom**: `Cannot find module '@rtc-agent/component'`

**Solution**:
1. Verify package is installed: `pnpm list @rtc-agent/component`
2. Check `node_modules/@rtc-agent/component` exists
3. Reinstall: `pnpm install`

## Next Steps

- [Web Component API](/en/integration/component-api/) — Full API reference for `<rtc-agent>`
- [Function Registration Guide](/en/integration/function-registration/) — Register custom functions via `agentConfig`
- [Scenario Authoring Guide](/en/integration/scenario-authoring/) — Write scenario documents to guide AI behavior
- [Authentication & Authorization](/en/integration/auth/) — Learn about the login flow and token mechanism
