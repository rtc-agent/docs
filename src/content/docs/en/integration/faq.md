---
title: FAQ
description: Common questions and solutions when integrating the RTC Agent Web Component
---

This document collects common questions and solutions encountered when integrating the RTC Agent Web Component.

## CDN Loading Issues

### Problem 1: SharedWorker 404 Error

**Symptom**:

```
GET https://esm.sh/@rtc-agent/component@0.1.9-rc.0/es2022/assets/shared-worker-xxx.js 404 (Not Found)

[WorkerBridge] Worker initialization failed: HTTP 404
```

**Cause**:

Some CDNs (such as esm.sh) don't correctly preserve SharedWorker files when bundling, causing Worker script paths to return 404.

**Solution**:

Use the **jsdelivr CDN**, which preserves the full build output:

```html
<!-- Wrong ❌ -->
<script src="https://esm.sh/@rtc-agent/component@0.1.9-rc.0"></script>

<!-- Correct ✅ -->
<script src="https://cdn.jsdelivr.net/npm/@rtc-agent/component@0.1.9-rc.0/dist/index.js"></script>
```

### Problem 2: whenReady is not a function

**Symptom**:

```
Uncaught (in promise) TypeError: whenReady is not a function
```

**Cause**:

When loading via CDN, the destructuring of dynamic imports may not work as expected.

**Solution**:

Use the `rtc-agent-ready` event instead of `whenReady()`:

```javascript
// Wrong ❌
import { whenReady } from '@rtc-agent/component';
await whenReady();

// Correct ✅
const agent = document.querySelector('rtc-agent');
agent.addEventListener('rtc-agent-ready', () => {
  // Component is ready, safe to access properties
  agent.windowConfig = { ... };
}, { once: true });
```

## SSR Errors

### Problem: `window is not defined` or `document is not defined`

**Symptom**:

```bash
Error: ReferenceError: window is not defined
    at ...
```

**Cause**:

Web Components rely on browser APIs (`window`, `document`, `customElements`, etc.) and cannot run in a Node.js (SSR) environment.

**Solution**:

In Astro, use the `client:only="astro"` directive to skip the SSR phase:

```astro
<!-- Wrong ❌ -->
<rtc-agent></rtc-agent>

<!-- Correct ✅ -->
<rtc-agent client:only="astro"></rtc-agent>
```

For other frameworks, ensure the component is only rendered on the client.

## OAuth Authentication Issues

### Problem: Cannot complete authorization after login

**Symptom**:

After clicking login, the OAuth window opens, but the app cannot return after authorization completes.

**Checklist**:

1. **Does the callback page exist?**

```bash
# Verify the file exists
ls public/auth/callback.html
```

2. **Is `redirect-uri` correct?**

```javascript
// In astro.config.mjs
agent.setAttribute('redirect-uri', '/docs/auth/callback.html');
```

3. **Does the GitHub OAuth App callback URL match?**

- Development: `http://localhost:4321/docs/auth/callback.html`
- Production: `https://your-site.github.io/docs/auth/callback.html`

### Problem: postMessage fails

**Symptom**:

```
Cannot notify the main window
```

**Cause**:

The origin of the OAuth window doesn't match the main window.

**Solution**:

Ensure `callback.html` uses the correct origin in `postMessage`:

```javascript
target.postMessage({
  type: 'oauth-callback',
  code: code,
  state: state,
}, window.location.origin); // Use current origin
```

## Component Not Displaying

### Problem: RTC Agent is not visible on the page

**Symptom**:

The page is blank — the RTC Agent component is not displayed.

**Possible causes and solutions**:

#### 1. CDN script not loaded

```html
<!-- Check that the CDN script is included -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@rtc-agent/component@0.1.9-rc.0/dist/index.js"></script>
```

#### 2. Accessing properties before the component is ready

```javascript
// Wrong ❌
const agent = document.querySelector('rtc-agent');
agent.theme = 'dark'; // May fail

// Correct ✅
const agent = document.querySelector('rtc-agent');
agent.addEventListener('rtc-agent-ready', () => {
  agent.theme = 'dark';
}, { once: true });
```

#### 3. Incorrect server URL

```html
<!-- Check that the server is reachable -->
<rtc-agent server-url="https://rtc-agent.cherish.chat"></rtc-agent>
```

#### 4. Container height is 0

```css
/* Give the container an explicit height */
rtc-agent {
  display: block;
  width: 100%;
  height: 600px; /* Must have a height */
}
```

## Style Issues

### Problem: Component styles conflict with the page

**Symptom**:

Component styles affect the page, or page styles affect the component.

**Note**:

RTC Agent uses **Shadow DOM** for style isolation, so in theory they shouldn't interfere.

**If there is still an issue**:

Check the container for special styles (such as `overflow: hidden`):

```css
.rtc-agent-container {
  width: 100%;
  height: 600px;
  overflow: hidden; /* Prevent overflow */
}
```

## Performance Issues

### Problem: Slow page load

**Possible causes and solutions**:

#### 1. Slow CDN loading

```html
<!-- Add preconnect hints -->
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link rel="dns-prefetch" href="https://cdn.jsdelivr.net">
```

#### 2. Slow server connection

```html
<!-- Preconnect to the server -->
<link rel="preconnect" href="https://rtc-agent.cherish.chat">
```

## Debugging Tips

### 1. Enable debug logging

```javascript
localStorage.setItem('debug', 'rtc-agent:*');
```

### 2. Inspect component state

```javascript
const agent = document.querySelector('rtc-agent');
console.log({
  theme: agent.theme,
  serverUrl: agent.serverUrl,
  windowConfig: agent.windowConfig,
});
```

### 3. Check network requests

Open the browser developer tools and check the Network panel:

- Check whether the CDN script loads successfully (200 status)
- Check that the SharedWorker file loads (no 404s)
- Check whether the WebSocket connection succeeds
- Check for CORS errors

## Getting Help

If the above solutions don't resolve your issue, you can:

1. Read the [full API documentation](/en/integration/component-api/)
2. Refer to the [Integration Tutorial](/en/integration/integration-tutorial/)
3. Open an issue on [GitHub Issues](https://github.com/rtc-agent/rtc-agent/issues)
