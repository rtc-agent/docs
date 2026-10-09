---
title: Quick Try
description: Try RTC Agent AI assistant with minimal changes.
---

For: Try RTC Agent's capabilities with minimal changes. You only need a static page (even just an HTML file) — no backend APIs required.

## Prerequisites

- ✅ Completed [Getting Started](/en/getting-started/)
- GitHub account (for login)

## Step 1: Configure GitHub OAuth2

### 1.1 Create a GitHub OAuth App

1. Visit [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the information:
   - **Application name**: Any name, e.g. `RTC Agent Demo`
   - **Homepage URL**: `http://localhost:28080` (Server address)
   - **Authorization callback URL**: `http://localhost:28080/auth/callback.html`
4. Click **Register application**
5. Generate a new **Client Secret**

> 💡 **Port note**: Examples above assume your site runs at `localhost:28080` (same port as Server). If your app runs on a different port (e.g. `3000`, `5173`), replace `localhost:28080` in GitHub OAuth config and code below with your actual address. For production, use `https://your-app.com`.

### 1.2 Configure Server

Edit `.env`:

```bash
PROVIDERS__GITHUB__ENABLED=true
PROVIDERS__GITHUB__CLIENT_ID=your-client-id
PROVIDERS__GITHUB__CLIENT_SECRET=your-client-secret
```

> 💡 **Config files**: Docker Compose uses `etc/config.docker.yaml` for Server and `etc/admin.docker.yaml` for Admin Server (auto-mounted to containers). Edit these for advanced settings (LLM model, CORS, etc.). For local development, use `etc/config.yaml.example` (copy to `config.yaml`) and `etc/admin.yaml`.

Restart the Server:

```bash
docker compose restart server
```

### 1.3 Create OAuth Callback Page

Create a callback page in your **host application** (not the server repo). For example, if your site runs at `http://localhost:28080`, create `public/auth/callback.html`:

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
          }, '*');  // In production, replace with specific origin, e.g. 'https://your-app.com'
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

> 💡 **File location**: This file should be placed in your host application's static resource directory (e.g. `public/`), accessible at `http://localhost:28080/auth/callback.html`.

## Step 2: Embed Frontend Component

Choose a method to embed RTC Agent in your page:

### Method A: CDN (Simplest)

Add to your HTML page:

```html
<!-- Import component -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@rtc-agent/component@latest/dist/index.js"></script>

<!-- Configure using factory function -->
<script type="module">
  import { createRtcAgent } from 'https://cdn.jsdelivr.net/npm/@rtc-agent/component@latest/dist/index.js';

  const agent = createRtcAgent({
    appLabel: 'My AI Assistant',
    server: {
      url: 'http://localhost:28080',
      redirectUri: '/auth/callback.html',  // Callback page from Step 1.3
    },
    workerURL: '/rtc-agent/shared-worker.js',  // SharedWorker file path, see note below
  });

  document.body.appendChild(agent);
</script>
```

Refresh the page to see the AI assistant bubble in the bottom-right corner.

> 💡 **SharedWorker file**: CDN method also requires the SharedWorker file. Download from GitHub: [shared-worker.js](https://raw.githubusercontent.com/rtc-agent/web-components/main/packages/component/dist/shared-worker.js), and place it at `public/rtc-agent/shared-worker.js` on your site.

### Method B: NPM

**Install dependency**:

```bash
pnpm add @rtc-agent/component
```

**Configure SharedWorker**:

Add `postinstall` script in `package.json`:

```json
{
  "scripts": {
    "postinstall": "rtc-agent-setup"
  }
}
```

> ⚠️ **Important**: Each time you upgrade `@rtc-agent/component`, you need to re-run `rtc-agent-setup` to update the SharedWorker file. Using `postinstall` automates this process. You can also manually run `npx rtc-agent-setup`.

Run for the first time:

```bash
npx rtc-agent-setup
```

**Use the component**:

```typescript
import { createRtcAgent } from '@rtc-agent/component';

const agent = createRtcAgent({
  appLabel: 'My AI Assistant',
  server: { url: 'http://localhost:28080' },
  workerURL: '/rtc-agent/shared-worker.js',
});

document.body.appendChild(agent);
```

## Step 3: Verify

Open your page and click the AI assistant bubble in the bottom-right:

1. Click the **Login** button
2. Authorize with your GitHub account
3. Start chatting with AI!

## Example Projects

| Example | Integration | Auth | Description | Code |
| :--- | :--- | :--- | :--- | :--- |
| Official Docs | CDN | GitHub OAuth2 | Astro + Starlight docs site | [astro.config.mjs](https://github.com/rtc-agent/docs/blob/main/astro.config.mjs) |
| Mermaid Live Editor | NPM | GitHub OAuth2 | SvelteKit diagram editor | [+layout.svelte](https://github.com/rtc-agent/mermaid-live-editor/blob/main/src/routes/+layout.svelte) |

## FAQ

**GitHub OAuth authorization fails after login?**

- Check `.env` has `PROVIDERS__GITHUB__ENABLED=true` and correct Client ID/Secret
- Confirm GitHub OAuth App callback URL matches `redirectUri` configuration
- Restart Server: `docker compose restart server`

**No AI assistant bubble on the page?**

- Check browser console for JavaScript errors
- Confirm CDN script loads: `https://cdn.jsdelivr.net/npm/@rtc-agent/component@latest/dist/index.js`
- Confirm `server.url` points to the correct Server address

**SharedWorker 404 error (NPM method)?**

- Confirm you ran `npx rtc-agent-setup`
- Check `public/rtc-agent/shared-worker.js` file exists
- Confirm `workerURL` path matches actual file location

## Next Steps

- [Web Component API](/en/integration/component-api/) — Learn all configuration options
- [Function Registration](/en/integration/function-registration/) — Let AI call your business APIs
- [Scenario Authoring](/en/integration/scenario-authoring/) — Provide business context to AI
- [Integration Guide](/en/integration-guide/) — Integrate RTC Agent into production app
