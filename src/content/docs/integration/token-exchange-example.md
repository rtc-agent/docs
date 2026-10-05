---
title: Token Exchange 完整示例
description: 一个完整的端到端示例，展示如何将 RTC Agent 通过 Token Exchange 集成到你的应用中。包含 Server 端 JWT 签发、JWKS 端点、前端配置等所有环节。
---

# Token Exchange 完整示例

本文提供一个完整的端到端示例，演示如何通过 Token Exchange 将 RTC Agent 集成到你的应用中。示例包含 Server 端 JWT 签发、JWKS 端点实现、前端配置等所有环节。

## 场景说明

假设我们要为一个企业管理系统（Admin UI）集成 RTC Agent：
- **后端**：Express.js + TypeScript，负责用户认证和 JWT 签发
- **前端**：React 应用，使用 `@rtc-agent/component` 集成 RTC Agent
- **RTC Agent Server**：已部署，配置为信任我们的 JWT 签发方

## 完整代码

### 1. Server 端实现

#### 1.1 生成密钥对

```bash
# 生成 RSA 私钥（2048 位）
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048

# 从私钥提取公钥
openssl rsa -pubout -in private.pem -out public.pem
```

#### 1.2 JWT 签发服务

```typescript
// src/services/jwt-service.ts
import { SignJWT, importPKCS8, exportJWK } from 'jose';
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

// 加载私钥（生产环境应从安全存储中读取）
const privateKeyPem = readFileSync('./keys/private.pem', 'utf8');
const privateKey = await importPKCS8(privateKeyPem, 'RS256');

// 加载公钥
const publicKeyPem = readFileSync('./keys/public.pem', 'utf8');
const publicKey = await importSPKI(publicKeyPem, 'RS256');

// 密钥 ID（用于 JWKS）
const KEY_ID = 'admin-key-1';

export interface JWTClaims {
  sub: string;      // 用户 ID
  email: string;    // 邮箱
  name: string;     // 显示名称
  picture?: string; // 头像 URL
}

/**
 * 签发 JWT
 */
export async function signJWT(claims: JWTClaims): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const token = await new SignJWT({
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
    picture: claims.picture,
  })
    .setProtectedHeader({ 
      alg: 'RS256',
      kid: KEY_ID,
    })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)  // 1 小时
    .setIssuer('https://your-app.com')  // 必须与 RTC Agent 配置一致
    .sign(privateKey);
  
  return token;
}

/**
 * 获取 JWKS（JSON Web Key Set）
 */
export async function getJWKS() {
  const jwk = await exportJWK(publicKey);
  jwk.kid = KEY_ID;
  jwk.alg = 'RS256';
  jwk.use = 'sig';
  
  return {
    keys: [jwk],
  };
}
```

#### 1.3 Express 路由

```typescript
// src/routes/auth.ts
import express from 'express';
import { signJWT, getJWKS } from '../services/jwt-service';
import { verifyPassword } from '../services/auth-service';
import { getJWKS } from '../services/jwt-service';

const router = express.Router();

/**
 * POST /api/auth/login
 * 用户登录，签发 JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 验证用户名密码
    const user = await verifyPassword(email, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        errorCode: 'invalid_credentials',
        errorMessage: '邮箱或密码错误',
      });
    }
    
    // 签发 JWT
    const accessToken = await signJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.avatar_url,
    });
    
    // 签发 refresh token（简化示例，实际应该更复杂）
    const refreshToken = uuidv4();
    
    res.json({
      success: true,
      data: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600,
        token_type: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      errorCode: 'server_error',
      errorMessage: '服务器内部错误',
    });
  }
});

/**
 * GET /.well-known/jwks.json
 * JWKS 端点，返回公钥集合
 */
router.get('/.well-known/jwks.json', async (req, res) => {
  try {
    const jwks = await getJWKS();
    
    // 设置缓存头（1 小时）
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', 'application/json');
    res.json(jwks);
  } catch (error) {
    console.error('JWKS error:', error);
    res.status(500).json({
      success: false,
      errorCode: 'server_error',
      errorMessage: '无法获取 JWKS',
    });
  }
});

export default router;
```

#### 1.4 主应用

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 2. RTC Agent Server 配置

在 RTC Agent Server 的 `config.yaml` 中添加：

```yaml
token_exchange:
  external_issuers:
    - name: "your-app"
      issuer: "https://your-app.com"
      jwks_uri: "https://your-app.com/.well-known/jwks.json"
      allowed_algorithms: ["RS256"]
      cache_ttl: 3600
      claims_mapping:
        sub: "sub"
        email: "email"
        name: "name"
        avatar_url: "picture"
```

### 3. Client 端实现

#### 3.1 认证存储

```typescript
// src/utils/auth-storage.ts
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_INFO_KEY = 'user_info';
const TOKEN_EXPIRY_KEY = 'token_expiry';

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}

/**
 * 存储 tokens
 */
export function setTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
}

/**
 * 获取 access token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * 获取 refresh token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * 检查 token 是否已过期
 */
export function isTokenExpired(): boolean {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() >= parseInt(expiry);
}

/**
 * 检查 token 是否即将过期（提前 5 分钟）
 */
export function isTokenExpiringSoon(): boolean {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() >= parseInt(expiry) - 5 * 60 * 1000;
}

/**
 * 存储用户信息
 */
export function setUserInfo(userInfo: UserInfo): void {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
}

/**
 * 获取用户信息
 */
export function getUserInfo(): UserInfo | null {
  const data = localStorage.getItem(USER_INFO_KEY);
  return data ? JSON.parse(data) : null;
}

/**
 * 清除所有认证信息
 */
export function clearAuth(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * 检查是否已认证
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  return !isTokenExpired();
}
```

#### 3.2 AuthProvider 实现

```typescript
// src/utils/rtc-auth-provider.ts
import type { AuthProvider } from '@rtc-agent/component';
import {
  getAccessToken,
  getRefreshToken,
  getUserInfo,
  isAuthenticated,
  isTokenExpiringSoon,
  setTokens,
  clearAuth,
} from './auth-storage';

const DEVICE_ID_KEY = 'device_id';

/**
 * 获取或生成 Device ID
 */
function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * 刷新 token
 */
async function refreshToken(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const response = await fetch('https://your-app.com/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.errorMessage || 'Failed to refresh token');
  }
  
  setTokens(
    result.data.access_token,
    result.data.refresh_token,
    result.data.expires_in || 3600
  );
  
  return result.data.access_token;
}

/**
 * 创建 AuthProvider
 */
export function createAuthProvider(): AuthProvider {
  return {
    type: 'token-exchange',
    
    getExchangeToken: async (): Promise<string> => {
      // 检查是否需要刷新（提前 5 分钟）
      if (isTokenExpiringSoon()) {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          try {
            return await refreshToken();
          } catch (error) {
            console.error('Failed to refresh token:', error);
            throw error;
          }
        }
      }
      
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token available');
      }
      return token;
    },
    
    isLoggedIn: (): boolean => {
      return isAuthenticated();
    },
    
    logout: async (): Promise<void> => {
      // 调用后端撤销 refresh token（可选）
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          await fetch('https://your-app.com/api/auth/logout', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
        } catch (error) {
          console.warn('Failed to revoke refresh token:', error);
        }
      }
      
      // 清除本地认证信息
      clearAuth();
    },
    
    getUserId: (): string => {
      const userInfo = getUserInfo();
      return userInfo?.id ?? '';
    },
    
    deviceId: getOrCreateDeviceId(),
  };
}
```

#### 3.3 RTC Agent 集成

```typescript
// src/components/RTCIntegration.tsx
import { useEffect, useRef } from 'react';
import { createRtcAgent } from '@rtc-agent/component';
import type { RtcAgentWithLifecycle } from '@rtc-agent/component';
import { createAuthProvider } from '../utils/rtc-auth-provider';

export function RTCIntegration() {
  const agentRef = useRef<RtcAgentWithLifecycle | null>(null);
  
  useEffect(() => {
    // 创建 RTC Agent
    const agent = createRtcAgent({
      server: { url: 'https://rtc-agent.your-app.com' },
      auth: createAuthProvider(),
      workerURL: '/rtc-agent/shared-worker.js',
      databaseName: 'your-app-rtc',
      lang: 'zh-CN',
      
      appLabel: 'AI 助手',
      theme: 'system',
      
      window: {
        defaultMode: 'minimized',
        bubblePosition: {
          corner: 'bottom-right',
          offset: { x: -24, y: 24 },
        },
      },
      
      on: {
        ready: () => {
          console.log('RTC Agent 已就绪');
        },
        authLogin: ({ userId }: { userId: string }) => {
          console.log('已登录，用户 ID:', userId);
        },
        authError: () => {
          console.error('认证错误');
          // 处理认证错误（例如跳转到登录页）
        },
      },
    });
    
    // 添加到 DOM
    document.body.appendChild(agent);
    agentRef.current = agent;
    
    // 清理函数
    return () => {
      if (agentRef.current) {
        agentRef.current.destroy();
        agentRef.current = null;
      }
    };
  }, []);
  
  return null;  // 不渲染任何 UI，RTC Agent 是全局的
}
```

#### 3.4 主应用入口

```typescript
// src/App.tsx
import { useEffect, useState } from 'react';
import { RTCIntegration } from './components/RTCIntegration';
import { isAuthenticated } from './utils/auth-storage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  
  // 监听认证状态变化
  useEffect(() => {
    const handleAuthChange = () => {
      setIsLoggedIn(isAuthenticated());
    };
    
    window.addEventListener('auth-state-changed', handleAuthChange);
    return () => {
      window.removeEventListener('auth-state-changed', handleAuthChange);
    };
  }, []);
  
  if (!isLoggedIn) {
    return <LoginPage />;
  }
  
  return (
    <>
      <DashboardPage />
      <RTCIntegration />  {/* 全局 RTC Agent */}
    </>
  );
}
```

## 测试验证

### 1. 验证 JWT 签发

```bash
curl -X POST https://your-app.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

预期响应：

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImFkbWluLWtleS0xIn0...",
    "refresh_token": "uuid-string",
    "expires_in": 3600,
    "token_type": "Bearer",
    "user": {
      "id": "user-123",
      "email": "admin@example.com",
      "name": "Admin",
      "avatar_url": "https://example.com/avatar.png"
    }
  }
}
```

### 2. 验证 JWKS 端点

```bash
curl https://your-app.com/.well-known/jwks.json
```

预期响应：

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "admin-key-1",
      "use": "sig",
      "alg": "RS256",
      "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx...",
      "e": "AQAB"
    }
  ]
}
```

### 3. 验证前端集成

1. 打开浏览器，访问 `https://your-app.com`
2. 登录系统
3. 打开浏览器控制台，检查：
   - ✅ 没有 CORS 错误
   - ✅ 没有 JWT 验证错误
   - ✅ WebSocket 连接成功
   - ✅ 看到 "RTC Agent 已就绪" 日志
4. 右下角应该看到 RTC Agent 气泡图标

## 生产环境注意事项

### 1. 密钥管理

- ✅ **私钥安全**：将私钥存储在安全的地方（如 AWS KMS、阿里云凭据管家、HashiCorp Vault）
- ✅ **定期轮换**：每 90 天轮换密钥对
- ✅ **密钥备份**：妥善备份私钥，防止丢失

### 2. 性能优化

- ✅ **JWKS 缓存**：设置合适的缓存头（`Cache-Control: public, max-age=3600`）
- ✅ **数据库索引**：为用户表添加索引，加速登录查询
- ✅ **连接池**：使用数据库连接池，减少连接开销

### 3. 安全加固

- ✅ **HTTPS**：生产环境必须使用 HTTPS
- ✅ **CORS**：限制允许的源，不要使用 `*`
- ✅ **Rate Limiting**：对登录接口实施速率限制
- ✅ **输入验证**：验证所有输入，防止 SQL 注入和 XSS

### 4. 监控告警

- ✅ **日志记录**：记录所有认证事件（登录成功/失败）
- ✅ **异常监控**：监控 JWT 验证失败、JWKS 获取失败等异常
- ✅ **性能监控**：监控 API 响应时间、错误率

## 完整代码仓库

本示例的完整代码可以在以下仓库找到：
- **Server 端**：[rtc-agent/examples/token-exchange-server](https://github.com/rtc-agent/examples/tree/main/token-exchange-server)
- **Client 端**：[rtc-agent/examples/token-exchange-client](https://github.com/rtc-agent/examples/tree/main/token-exchange-client)

## 下一步

- [认证与授权 - Token Exchange 完整指南](/docs/integration/auth/#token-exchange-完整集成指南)
- [Web Component API](/docs/integration/component-api/)
- [Function 注册指南](/docs/integration/function-registration/)
- [核心协议 RTC](/docs/concepts/rtc/)
