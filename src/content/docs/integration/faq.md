---
title: 常见问题
description: RTC Agent Web Component 集成过程中的常见问题和解决方案
---

本文档收集了集成 RTC Agent Web Component 过程中遇到的常见问题和解决方案。

## CDN 加载问题

### 问题 1：SharedWorker 404 错误

**现象**：

```
GET https://esm.sh/@rtc-agent/component@0.1.9-rc.0/es2022/assets/shared-worker-xxx.js 404 (Not Found)

[WorkerBridge] Worker initialization failed: HTTP 404
```

**原因**：

某些 CDN（如 esm.sh）在打包时没有正确处理 SharedWorker 文件，导致 Worker 脚本路径 404。

**解决方案**：

使用 **jsdelivr CDN**，它完整保留了构建产物：

```html
<!-- 错误 ❌ -->
<script src="https://esm.sh/@rtc-agent/component@0.1.9-rc.0"></script>

<!-- 正确 ✅ -->
<script src="https://cdn.jsdelivr.net/npm/@rtc-agent/component@0.1.9-rc.0/dist/index.js"></script>
```

### 问题 2：whenReady is not a function

**现象**：

```
Uncaught (in promise) TypeError: whenReady is not a function
```

**原因**：

通过 CDN 加载时，动态 import 的解构方式可能有问题。

**解决方案**：

使用 `rtc-agent-ready` 事件替代 `whenReady()`：

```javascript
// 错误 ❌
import { whenReady } from '@rtc-agent/component';
await whenReady();

// 正确 ✅
const agent = document.querySelector('rtc-agent');
agent.addEventListener('rtc-agent-ready', () => {
  // 组件已就绪，安全访问属性
  agent.windowConfig = { ... };
}, { once: true });
```

## SSR 错误

### 问题：`window is not defined` 或 `document is not defined`

**现象**：

```bash
Error: ReferenceError: window is not defined
    at ...
```

**原因**：

Web Components 依赖浏览器 API（`window`、`document`、`customElements` 等），不能在 Node.js 环境（SSR）中运行。

**解决方案**：

Astro 中使用 `client:only="astro"` 指令，跳过 SSR 阶段：

```astro
<!-- 错误 ❌ -->
<rtc-agent></rtc-agent>

<!-- 正确 ✅ -->
<rtc-agent client:only="astro"></rtc-agent>
```

其他框架确保只在客户端渲染组件。

## OAuth 认证问题

### 问题：登录后无法完成授权

**现象**：

点击登录后，OAuth 窗口打开，但授权完成后无法返回应用。

**检查清单**：

1. **回调页面是否存在**

```bash
# 确认文件存在
ls public/auth/callback.html
```

1. **redirect-uri 是否正确**

```javascript
// astro.config.mjs 中
agent.setAttribute('redirect-uri', '/docs/auth/callback.html');
```

1. **GitHub OAuth App 回调地址是否匹配**

- 开发环境：`http://localhost:4321/docs/auth/callback.html`
- 生产环境：`https://your-site.github.io/docs/auth/callback.html`

### 问题：postMessage 失败

**现象**：

```
无法通知主窗口
```

**原因**：

OAuth 窗口与主窗口的 origin 不匹配。

**解决方案**：

确保 `callback.html` 中的 `postMessage` 使用正确的 origin：

```javascript
target.postMessage({
  type: 'oauth-callback',
  code: code,
  state: state,
}, window.location.origin); // 使用当前 origin
```

## 组件不显示

### 问题：页面上看不到 RTC Agent

**现象**：

页面空白，没有显示 RTC Agent 组件。

**可能原因和解决方案**：

#### 1. CDN 脚本未加载

```html
<!-- 检查是否引入了 CDN 脚本 -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@rtc-agent/component@0.1.9-rc.0/dist/index.js"></script>
```

#### 2. 组件未就绪就访问属性

```javascript
// 错误 ❌
const agent = document.querySelector('rtc-agent');
agent.theme = 'dark'; // 可能失败

// 正确 ✅
const agent = document.querySelector('rtc-agent');
agent.addEventListener('rtc-agent-ready', () => {
  agent.theme = 'dark';
}, { once: true });
```

#### 3. 服务端地址错误

```html
<!-- 检查服务端是否可访问 -->
<rtc-agent server-url="https://rtc-agent.cherish.chat"></rtc-agent>
```

#### 4. 容器高度为 0

```css
/* 给容器设置明确的高度 */
rtc-agent {
  display: block;
  width: 100%;
  height: 600px; /* 必须有高度 */
}
```

## 样式问题

### 问题：组件样式与页面冲突

**现象**：

组件样式影响了页面，或者页面样式影响了组件。

**说明**：

RTC Agent 使用 **Shadow DOM** 实现样式隔离，理论上不会互相影响。

**如果确实有问题**：

检查容器是否有特殊样式（如 `overflow: hidden`）：

```css
.rtc-agent-container {
  width: 100%;
  height: 600px;
  overflow: hidden; /* 确保不会溢出 */
}
```

## 性能问题

### 问题：页面加载慢

**可能原因和解决方案**：

#### 1. CDN 加载慢

```html
<!-- 添加预连接 -->
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
```

#### 2. 服务端连接慢

```html
<!-- 预连接服务端 -->
<link rel="preconnect" href="https://rtc-agent.cherish.chat">
```

## 调试技巧

### 1. 开启调试日志

```javascript
localStorage.setItem('debug', 'rtc-agent:*');
```

### 2. 检查组件状态

```javascript
const agent = document.querySelector('rtc-agent');
console.log({
  theme: agent.theme,
  serverUrl: agent.serverUrl,
  windowConfig: agent.windowConfig,
});
```

### 3. 查看网络请求

打开浏览器开发者工具，查看 Network 面板：

- 检查 CDN 脚本是否加载成功（200 状态）
- 检查 SharedWorker 文件是否加载（不应有 404）
- 检查 WebSocket 连接是否成功
- 检查是否有 CORS 错误

## 获取帮助

如果以上方案都无法解决问题，可以：

1. 查看 [完整 API 文档](/docs/integration/component-api/)
2. 参考 [接入实战](/docs/integration/integration-tutorial/)
3. 在 [GitHub Issues](https://github.com/rtc-agent/rtc-agent/issues) 提交问题
