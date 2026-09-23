---
title: 接入实战
description: 从零开始在 Astro 文档站点中集成 RTC Agent Web Component 的完整实战指南
---

本文档以本项目的 docs 站点为例，演示如何在 Astro 文档站点中集成 RTC Agent Web Component。

## 环境信息

- **框架**: Astro 7.x + Starlight
- **集成方式**: CDN（jsdelivr）
- **组件版本**: @rtc-agent/component@0.1.0

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
            src: 'https://cdn.jsdelivr.net/npm/@rtc-agent/component@0.1.0/dist/index.js',
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

## 下一步

- [常见问题](/docs/integration/faq/) — 解决集成过程中遇到的问题
- [Web Component API](/docs/integration/component-api/) — 完整的 API 参考
