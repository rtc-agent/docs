---
title: Integration Tutorial
description: A complete hands-on guide to integrating RTC Agent Web Component into an Astro documentation site from scratch
---

This document uses this project's own docs site as an example to demonstrate how to integrate the RTC Agent Web Component into an Astro documentation site.

## Environment

- **Framework**: Astro 7.x + Starlight
- **Integration**: CDN (jsdelivr)
- **Component version**: @rtc-agent/component@0.1.0

## Why CDN?

The RTC Agent component uses a SharedWorker internally to multiplex WebSocket connections across browser tabs. Loading via CDN ensures Worker file paths resolve correctly, with no extra Vite or build-tool configuration needed.

| Method | Pros | Cons |
| --- | --- | --- |
| **CDN (recommended)** | Zero config, Workers resolve automatically | Depends on external CDN |
| npm install | Local development, type hints | Requires configuring Vite to handle Workers |

## Step 1: Load the Component via CDN

Inject the CDN script in the `head` of `astro.config.mjs` to load the component globally:

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
        // Load RTC Agent component
        {
          tag: 'script',
          attrs: {
            type: 'module',
            src: 'https://cdn.jsdelivr.net/npm/@rtc-agent/component@0.1.0/dist/index.js',
          },
        },
        // Initialize global floating widget
        {
          tag: 'script',
          attrs: { type: 'module' },
          content: `
            document.addEventListener('DOMContentLoaded', () => {
              const agent = document.createElement('rtc-agent');
              agent.setAttribute('server-url', 'https://rtc-agent.cherish.chat');
              agent.setAttribute('app-label', 'RTC Agent Assistant');
              agent.setAttribute('theme', 'system');
              agent.setAttribute('redirect-uri', '/docs/auth/callback.html');

              const container = document.createElement('div');
              container.id = 'rtc-agent-global';
              container.appendChild(agent);
              document.body.appendChild(container);

              // Configure floating window
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
            });
          `,
        },
      ],
    }),
  ],
});
```

## Step 2: Create the OAuth Callback Page

If you need GitHub login, create a callback page to handle the OAuth redirect.

**File**: `public/auth/callback.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Authorization Complete</title>
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
    <h1 id="title">Processing...</h1>
    <p id="message">Please wait, completing authorization</p>
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
        title.textContent = 'Authorization Failed';
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
          title.textContent = 'Authorization Successful';
          message.textContent = 'Returning to app...';
          setTimeout(function() { window.close(); }, 2000);
        }
      }
    })();
  </script>
</body>
</html>
```

## Step 3: Configure the OAuth Callback URL

Set the callback URL in your GitHub OAuth App:

- **Development**: `http://localhost:4321/docs/auth/callback.html`
- **Production**: `https://your-site.github.io/docs/auth/callback.html`

:::note[Important]
The callback URL must match the `redirect-uri` in `astro.config.mjs`.
:::

## Verify the Integration

Start the dev server:

```bash
pnpm dev
```

Visit `http://localhost:4321/docs/` — you should see the RTC Agent floating widget in the bottom-right corner.

## Key Takeaways

### 1. Use CDN instead of npm install

CDN delivery ensures SharedWorker file paths resolve correctly with no build-tool configuration required.

### 2. Use the `rtc-agent-ready` event

```javascript
agent.addEventListener('rtc-agent-ready', () => {
  // Safely access component properties
  agent.windowConfig = { ... };
}, { once: true });
```

### 3. Use `client:only` in Astro

```astro
<!-- Skip SSR, render client-side only -->
<rtc-agent client:only="astro"></rtc-agent>
```

### 4. Style Isolation

The component uses Shadow DOM, so its styles are isolated and won't conflict with the Starlight theme.

## Complete Example Project

This project's docs site is already integrated — you can refer to these files:

- [astro.config.mjs](https://github.com/rtc-agent/rtc-agent/blob/main/docs/astro.config.mjs) — CDN injection config
- [public/auth/callback.html](https://github.com/rtc-agent/rtc-agent/blob/main/docs/public/auth/callback.html) — OAuth callback page

## Next Steps

- [FAQ](/en/integration/faq/) — Solve common integration issues
- [Web Component API](/en/integration/component-api/) — Full API reference
