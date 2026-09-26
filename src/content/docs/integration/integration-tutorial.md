---
title: 接入实战
description: 从零开始在 Astro 文档站点中集成 RTC Agent Web Component 的完整实战指南
---

本文档以本项目的 docs 站点为例，演示如何在 Astro 文档站点中集成 RTC Agent Web Component。

## 环境信息

- **框架**: Astro 7.x + Starlight
- **集成方式**: CDN（jsdelivr）
- **组件版本**: @rtc-agent/component@0.2.3

## 为什么选择 CDN？

RTC Agent 组件内部使用 SharedWorker 实现多 Tab WebSocket 复用。通过 CDN 加载可以确保 Worker 文件路径正确解析，无需额外配置 Vite 或构建工具。

| 方式 | 优点 | 缺点 |
| --- | --- | --- |
| **CDN（推荐）** | 零配置、Worker 自动解析 | 依赖外部 CDN |
| npm install | 本地开发、类型提示 | 需要配置 Vite 处理 Worker |

## 第一步：通过 CDN 加载组件

在 `astro.config.mjs` 的 `head` 中注入 CDN 脚本，全局加载组件：

**文件**: `astro.config.mjs`

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
        // 加载 RTC Agent 组件
        {
          tag: 'script',
          attrs: {
            type: 'module',
            src: 'https://cdn.jsdelivr.net/npm/@rtc-agent/component@0.2.3/dist/index.js',
          },
        },
        // 初始化全局悬浮窗
        {
          tag: 'script',
          attrs: { type: 'module' },
          content: `
            document.addEventListener('DOMContentLoaded', () => {
              const agent = document.createElement('rtc-agent');
              agent.setAttribute('server-url', 'https://rtc-agent.cherish.chat');
              agent.setAttribute('app-label', 'RTC Agent 助手');
              agent.setAttribute('theme', 'system');
              agent.setAttribute('redirect-uri', '/docs/auth/callback.html');

              const container = document.createElement('div');
              container.id = 'rtc-agent-global';
              container.appendChild(agent);
              document.body.appendChild(container);

              // 配置悬浮窗
              agent.addEventListener('rtc-agent-ready', () => {
                agent.windowConfig = {
                  defaultMode: 'minimized',
                  draggable: true,
                  resizable: true,
                  bubblePosition: {
                    corner: 'bottom-right',
                    offset: { x: -24, y: 24 },
                  },
                };
              }, { once: true });

              // 全局样式
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
            });
          `,
        },
      ],
    }),
  ],
});
```

## 第二步：创建 OAuth 回调页面

如果需要使用 GitHub 登录，创建回调页面处理 OAuth 回调。

**文件**: `public/auth/callback.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>授权完成</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 48px;
      text-align: center;
      max-width: 400px;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon" id="icon">⏳</div>
    <h1 id="title">处理中...</h1>
    <p id="message">请稍候，正在完成授权</p>
  </div>

  <script>
    (function() {
      var params = new URLSearchParams(window.location.search);
      var code = params.get('code');
      var state = params.get('state');
      var error = params.get('error');

      var icon = document.getElementById('icon');
      var title = document.getElementById('title');
      var message = document.getElementById('message');

      if (error) {
        icon.textContent = '✕';
        title.textContent = '授权失败';
        message.textContent = error;
        return;
      }

      if (code && state) {
        var target = window.opener || window.parent;
        if (target) {
          target.postMessage({
            type: 'oauth-callback',
            code: code,
            state: state,
          }, window.location.origin);
          icon.textContent = '✓';
          title.textContent = '授权成功';
          message.textContent = '正在返回应用...';
          setTimeout(function() { window.close(); }, 2000);
        }
      }
    })();
  </script>
</body>
</html>
```

## 第三步：配置 OAuth 回调地址

在 GitHub OAuth App 中设置回调地址：

- **开发环境**: `http://localhost:4321/docs/auth/callback.html`
- **生产环境**: `https://your-site.github.io/docs/auth/callback.html`

:::note[重要]
回调地址必须与 `astro.config.mjs` 中的 `redirect-uri` 一致。
:::

## 验证集成

启动开发服务器：

```bash
pnpm dev
```

访问 `http://localhost:4321/docs/`，应该能看到右下角的 RTC Agent 悬浮窗。

## 关键要点

### 1. 使用 CDN 而非 npm install

CDN 方式确保 SharedWorker 文件路径正确解析，无需额外配置构建工具。

### 2. 使用 `rtc-agent-ready` 事件

```javascript
agent.addEventListener('rtc-agent-ready', () => {
  // 安全访问组件属性
  agent.windowConfig = { ... };
}, { once: true });
```

### 3. Astro 中使用 `client:only`

```astro
<!-- 跳过 SSR，只在客户端渲染 -->
<rtc-agent client:only="astro"></rtc-agent>
```

### 4. 样式隔离

组件使用 Shadow DOM，样式已隔离，不会与 Starlight 主题冲突。

## 完整示例项目

本项目的 docs 站点已经完成了集成，可以参考以下文件：

- [astro.config.mjs](https://github.com/rtc-agent/rtc-agent/blob/main/docs/astro.config.mjs) — CDN 注入配置
- [public/auth/callback.html](https://github.com/rtc-agent/rtc-agent/blob/main/docs/public/auth/callback.html) — OAuth 回调页面

## 生产级集成：NPM + createRtcAgent()

对于生产应用，使用 `createRtcAgent()` 工厂函数，获得完整类型安全和 SharedWorker 多 Tab 同步支持。

### 第一步：安装包

```bash
pnpm add @rtc-agent/component
# 或
npm install @rtc-agent/component
# 或
yarn add @rtc-agent/component
```

### 第二步：配置 SharedWorker（多 Tab 所需）

RTC Agent 使用 SharedWorker 在浏览器标签页之间复用 WebSocket 连接。Worker 文件必须在浏览器可访问的公共目录中。

#### 自动配置（推荐）

运行 CLI 工具自动将 SharedWorker 文件复制到正确位置：

```bash
npx rtc-agent-setup
```

工具会自动：

- 检测项目类型（Vite、Webpack、SvelteKit 等）
- 将 SharedWorker 文件复制到正确目录（`static/rtc-agent/` 或 `public/rtc-agent/`）
- 创建稳定文件名 `shared-worker.js` 便于引用
- 生成包含版本信息的 `manifest.json`
- 清理旧 Worker 文件防止堆积

#### 安装时自动配置（最佳实践）

将 setup 工具添加到 `postinstall` 脚本，在 `npm install` 后自动运行：

```json
{
  "scripts": {
    "postinstall": "rtc-agent-setup"
  }
}
```

这确保：

- 新开发者克隆项目后自动配置 SharedWorker 文件
- 升级 `@rtc-agent/component` 时 Worker 文件同步更新
- 依赖变更后无需手动操作

> 💡 如果已有 `postinstall` 脚本，在其后追加 `&& rtc-agent-setup`：
>
> ```json
> {
>   "scripts": {
>     "postinstall": "your-existing-script && rtc-agent-setup"
>   }
> }
> ```

#### 手动配置

如果 CLI 工具不适用于你的项目，手动复制 Worker 文件：

```bash
# 创建目标目录
mkdir -p public/rtc-agent

# 复制 Worker 文件
cp node_modules/@rtc-agent/component/dist/assets/shared-worker*.js public/rtc-agent/

# 创建稳定链接（可选，但推荐）
cd public/rtc-agent
ln -sf shared-worker-*.js shared-worker.js
```

### 第三步：配置 createRtcAgent()

使用工厂函数创建并配置组件：

```typescript
import { z, withMeta, createRtcAgent } from '@rtc-agent/component';
import type { RtcAgentWithLifecycle } from '@rtc-agent/component';

// 创建 agent 实例
const agent: RtcAgentWithLifecycle = createRtcAgent({
  // 基础配置
  appLabel: '我的 AI 助手',
  theme: 'system',
  lang: 'zh-CN',
  
  // Server 配置
  server: {
    url: 'https://rtc-agent.cherish.chat',
    redirectUri: '/auth/callback.html',
  },
  
  // SharedWorker URL（多 Tab 支持所需）
  workerUrl: '/rtc-agent/shared-worker.js',
  
  // 场景文档
  scenariosUrl: '/scenarios/',
  
  // 窗口配置
  window: {
    defaultMode: 'normal',
    bubblePosition: {
      corner: 'bottom-right',
      offset: { x: -24, y: 24 },
    },
  },
  
  // 函数注册（使用 Zod schema - 推荐）
  agentName: 'MyApp',
  agentDescription: '我的应用 AI 助手',
  persona: '你是一个有帮助的助手...',
  groups: [
    {
      name: 'editor',
      description: '编辑器操作',
      functions: [
        {
          name: 'getCode',
          description: '获取当前代码',
          handler: () => window.editorAPI.getCode(),
          returns: { schema: { type: 'string' } },
        },
        {
          name: 'setCode',
          description: '设置编辑器代码',
          zodSchema: z.object({
            code: withMeta(z.string(), { example: 'console.log("hello")' }).describe('要设置的代码'),
          }),
          handler: (params) => {
            window.editorAPI.setCode(params.code);
            return { success: true };
          },
        },
      ],
    },
  ],
  
  // 事件处理
  on: {
    ready: () => {
      console.log('RTC Agent 已就绪');
    },
  },
});

// 添加到 DOM
document.body.appendChild(agent);

// 清理
agent.destroy();
```

### 第三步（续）：认证配置

`createRtcAgent()` 中的 `auth` 属性控制组件如何与 Server 进行认证。选择适合你应用的模式：

#### 模式一：静态令牌（开发 / CI / 测试）

直接传入固定的 access token。简单但不适用于生产环境——令牌会过期且无法刷新。

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

#### 模式二：动态令牌（生产环境推荐）

提供 `getToken` 和 `refreshToken` 回调，让组件按需获取和刷新令牌。这是大多数生产应用的推荐方式。

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

#### 模式三：认证提供者（高级 / 多租户）

实现完整的 auth 接口，包含 `isLoggedIn` 和 `logout` 钩子。适用于已有认证系统或需要多租户支持的场景。

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

> 详见 [认证与授权](/docs/integration/auth/) 了解登录流程、令牌生命周期和安全最佳实践的完整说明。

### 第四步：框架集成

#### SvelteKit 示例

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
      // ... 其他配置
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

#### React 示例

```tsx
import { useEffect, useRef } from 'react';
import { createRtcAgent } from '@rtc-agent/component';
import type { RtcAgentWithLifecycle } from '@rtc-agent/component';

function RtcAgentWrapper() {
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
      // ... 其他配置
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

#### Vue 示例

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
    // ... 其他配置
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

## createRtcAgent() 配置参考

### 基础配置

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `appLabel` | `string` | `"RTC Agent"` | 标题栏文字和提示 |
| `theme` | `"light"` \| `"dark"` \| `"system"` | `"system"` | 主题模式 |
| `lang` | `"zh-CN"` \| `"en-US"` | `"zh-CN"` | UI 语言 |
| `databaseName` | `string` | `"rtc-agent"` | IndexedDB 名称前缀 |

### Server 配置

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `server.url` | `string` | `""` | Server 地址（回退到当前域名） |
| `server.redirectUri` | `string` | `"/auth/callback.html"` | OAuth 回调 URL |

### SharedWorker 配置

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `workerUrl` | `string` | `undefined` | SharedWorker 文件 URL（多 Tab 支持所需） |

### 认证配置

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `auth.accessToken` | `string` | — | 静态 JWT 令牌（模式一） |
| `auth.userId` | `string` | — | 用户标识 |
| `auth.getToken` | `() => Promise<string>` | — | 异步获取 access token 的回调（模式二/三） |
| `auth.refreshToken` | `() => Promise<object>` | — | 异步刷新令牌的回调（模式二/三） |
| `auth.isLoggedIn` | `() => boolean` | — | 检查用户是否已认证（模式三） |
| `auth.logout` | `() => Promise<void>` | — | 用户登出（模式三） |

### 窗口配置

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `window.defaultMode` | `"normal"` \| `"maximized"` \| `"minimized"` | `"normal"` | 初始窗口模式 |
| `window.embedded` | `boolean` | `false` | 嵌入模式（无拖拽/缩放/按钮） |
| `window.draggable` | `boolean` | `true` | 是否可拖拽 |
| `window.resizable` | `boolean` | `true` | 是否可缩放 |
| `window.bubblePosition.corner` | `"top-left"` \| `"top-right"` \| `"bottom-left"` \| `"bottom-right"` | `"bottom-right"` | 气泡位置角落 |
| `window.bubblePosition.offset.x` | `number` | `-20` | 水平偏移 |
| `window.bubblePosition.offset.y` | `number` | `20` | 垂直偏移 |

### 函数注册

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `agentName` | `string` | — | 应用名称 |
| `agentDescription` | `string` | — | 应用描述 |
| `persona` | `string` | — | AI 人设/指令 |
| `groups` | `FunctionGroup[]` | `[]` | 函数注册组 |

### 事件处理

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `on.ready` | `() => void` | 组件就绪时调用 |
| `on.destroy` | `() => void` | 组件销毁时调用 |

## 升级 SharedWorker

升级 `@rtc-agent/component` 后，重新运行 setup 工具更新 SharedWorker 文件：

```bash
npx rtc-agent-setup
```

工具会：

1. 复制新的 Worker 文件
2. 更新 `manifest.json` 中的版本信息
3. 覆盖旧的 `shared-worker.js`

### 缓存管理

对于生产部署，使用基于版本的缓存清除：

```typescript
// 读取 manifest.json
const manifest = await fetch('/rtc-agent/manifest.json').then(r => r.json());
const workerUrl = `/rtc-agent/shared-worker.js?v=${manifest.version}`;

// 在 createRtcAgent() 中使用
const agent = createRtcAgent({
  workerUrl,
  // ...
});
```

或配置 Web 服务器对 Worker 文件禁用缓存：

```nginx
location /rtc-agent/shared-worker.js {
  add_header Cache-Control "no-cache, must-revalidate";
}
```

## 常见问题

### SharedWorker 404 错误

**现象**：控制台显示 SharedWorker 文件 404 错误

**解决**：
1. 验证 Worker 文件存在：`ls public/rtc-agent/` 或 `ls static/rtc-agent/`
2. 检查 `workerUrl` 路径与实际文件位置匹配
3. 重启开发服务器
4. 重新运行 `npx rtc-agent-setup`

### 多 Tab 不同步

**现象**：一个标签页的变更不显示在其他标签页

**解决**：
1. 确保 `createRtcAgent()` 中配置了 `workerUrl`
2. 检查浏览器控制台是否有 SharedWorker 错误
3. 验证所有标签页在同一 origin（协议 + 域名 + 端口）
4. 检查 SharedWorker 是否被浏览器扩展阻止

### 导入解析错误

**现象**：`Cannot find module '@rtc-agent/component'`

**解决**：
1. 验证包已安装：`pnpm list @rtc-agent/component`
2. 检查 `node_modules/@rtc-agent/component` 是否存在
3. 重新安装：`pnpm install`

## 下一步

- [常见问题](/docs/integration/faq/) — 解决集成过程中遇到的问题
- [Web Component API](/docs/integration/component-api/) — 完整的 API 参考
- [函数注册指南](/docs/integration/function-registration/) — 通过 `agentConfig` 注册自定义函数
- [Scenario 编写指南](/docs/integration/scenario-authoring/) — 编写场景文档引导 AI 行为
- [认证与授权](/docs/integration/auth/) — 了解登录流程和令牌机制
