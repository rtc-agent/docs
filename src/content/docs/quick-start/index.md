---
title: 快速体验
description: 最小改动，快速体验 RTC Agent 的 AI 助手能力。
---

适合：想用最少的改动体验 RTC Agent 的能力。你只需要一个静态页面（哪怕只是一个 HTML 文件），不需要写后端 API。

## 前置条件

- ✅ 完成[快速入门](/getting-started/)
- GitHub 账号（用于登录体验）

## Step 1: 配置 GitHub OAuth2

### 1.1 创建 GitHub OAuth App

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 **New OAuth App**
3. 填写信息：
   - **Application name**: 任意名称，如 `RTC Agent Demo`
   - **Homepage URL**: `http://localhost:28080`（Server 地址）
   - **Authorization callback URL**: `http://localhost:28080/auth/callback.html`
4. 点击 **Register application**
5. 生成一个新的 **Client Secret**

> 💡 **端口说明**：以上示例假设你的网站运行在 `localhost:28080`（与 Server 同端口）。如果你的应用运行在其他端口（如 `3000`、`5173`），请将 GitHub OAuth 配置和下文代码中的 `localhost:28080` 替换为你的实际地址。生产环境请替换为 `https://your-app.com`。

### 1.2 配置 Server

编辑 `.env`：

```bash
PROVIDERS__GITHUB__ENABLED=true
PROVIDERS__GITHUB__CLIENT_ID=你的 Client ID
PROVIDERS__GITHUB__CLIENT_SECRET=你的 Client Secret
```

> 💡 **配置文件说明**：Docker Compose 部署时，Server 配置使用 `etc/config.docker.yaml`，Admin Server 使用 `etc/admin.docker.yaml`（自动挂载到容器内）。如需修改高级配置（如 LLM 模型、CORS 等），直接编辑这两个文件。本地开发时则使用 `etc/config.yaml.example`（复制为 `config.yaml`）和 `etc/admin.yaml`。

重启 Server：

```bash
docker compose restart server
```

### 1.3 创建 OAuth 回调页面

在你的**宿主应用**（不是 server 仓库）中创建一个回调页面。例如，如果你的网站运行在 `http://localhost:28080`，创建 `public/auth/callback.html`：

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
          }, '*');  // 生产环境建议替换为具体的 origin，如 'https://your-app.com'
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

> 💡 **文件位置**：这个文件应该放在你的宿主应用的静态资源目录中（如 `public/`），确保可以通过 `http://localhost:28080/auth/callback.html` 访问。

## Step 2: 嵌入前端组件

选择一种方式将 RTC Agent 嵌入你的页面：

### 方式 A：CDN 接入（最简单）

在你的 HTML 页面中添加：

```html
<!-- 引入组件 -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@rtc-agent/component@latest/dist/index.js"></script>

<!-- 使用工厂函数配置 -->
<script type="module">
  import { createRtcAgent } from 'https://cdn.jsdelivr.net/npm/@rtc-agent/component@latest/dist/index.js';

  const agent = createRtcAgent({
    appLabel: '我的 AI 助手',
    server: {
      url: 'http://localhost:28080',
      redirectUri: '/auth/callback.html',  // Step 1.3 创建的回调页面
    },
    workerURL: '/rtc-agent/shared-worker.js',  // SharedWorker 文件路径，详见下方说明
  });

  document.body.appendChild(agent);
</script>
```

刷新页面即可看到右下角的 AI 助手气泡。

> 💡 **SharedWorker 文件**：CDN 方式也需要 SharedWorker 文件。从 GitHub 下载：[shared-worker.js](https://raw.githubusercontent.com/rtc-agent/web-components/main/packages/component/dist/shared-worker.js)，放到你网站的 `public/rtc-agent/shared-worker.js` 即可。

### 方式 B：NPM 接入

**安装依赖**：

```bash
pnpm add @rtc-agent/component
```

**配置 SharedWorker**：

在 `package.json` 中添加 `postinstall` 脚本：

```json
{
  "scripts": {
    "postinstall": "rtc-agent-setup"
  }
}
```

> ⚠️ **重要**：每次升级 `@rtc-agent/component` 时，需要重新运行 `rtc-agent-setup` 来更新 SharedWorker 文件。使用 `postinstall` 可以自动化这个过程，也可以手动运行 `npx rtc-agent-setup`。

首次运行：

```bash
npx rtc-agent-setup
```

**使用组件**：

```typescript
import { createRtcAgent } from '@rtc-agent/component';

const agent = createRtcAgent({
  appLabel: '我的 AI 助手',
  server: { url: 'http://localhost:28080' },
  workerURL: '/rtc-agent/shared-worker.js',
});

document.body.appendChild(agent);
```

## Step 3: 验证

打开你的页面，点击右下角的 AI 助手气泡：

1. 点击 **登录** 按钮
2. 使用 GitHub 账号授权
3. 开始与 AI 对话！

## 参考示例

| 示例 | 接入方式 | 认证 | 说明 | 代码 |
| :--- | :--- | :--- | :--- | :--- |
| 官方文档站 | CDN | GitHub OAuth2 | Astro + Starlight 文档站 | [astro.config.mjs](https://github.com/rtc-agent/docs/blob/main/astro.config.mjs) |
| Mermaid Live Editor | NPM | GitHub OAuth2 | SvelteKit 图表编辑器 | [+layout.svelte](https://github.com/rtc-agent/mermaid-live-editor/blob/main/src/routes/+layout.svelte) |

## 常见问题

**GitHub OAuth 授权后无法登录？**

- 检查 `.env` 中 `PROVIDERS__GITHUB__ENABLED=true` 且 Client ID/Secret 正确
- 确认 GitHub OAuth App 的回调地址与 `redirectUri` 配置一致
- 重启 Server：`docker compose restart server`

**前端页面没有显示 AI 助手气泡？**

- 检查浏览器控制台是否有 JavaScript 错误
- 确认 CDN 脚本加载成功：`https://cdn.jsdelivr.net/npm/@rtc-agent/component@latest/dist/index.js`
- 确认 `server.url` 指向正确的 Server 地址

**SharedWorker 404 错误（NPM 方式）？**

- 确认已运行 `npx rtc-agent-setup`
- 检查 `public/rtc-agent/shared-worker.js` 文件是否存在
- 确认 `workerURL` 路径与实际文件位置匹配

## 下一步

- [Web Component API](/integration/component-api/) — 了解全部配置选项
- [Function 注册](/integration/function-registration/) — 让 AI 调用你的业务 API
- [Scenario 编写](/integration/scenario-authoring/) — 给 AI 提供业务上下文
- [真实接入](/integration-guide/) — 将 RTC Agent 集成到生产应用
