---
title: Complete Token Exchange Example
description: A complete end-to-end example showing how to integrate RTC Agent into your application using Token Exchange. Includes Server-side JWT signing, JWKS endpoint, frontend configuration, and all other components.
---

# Complete Token Exchange Example

This provides a complete end-to-end example demonstrating how to integrate RTC Agent into your application using Token Exchange. The example includes all components: Server-side JWT signing, JWKS endpoint implementation, and frontend configuration.

## Scenario

Suppose we want to integrate RTC Agent into an enterprise management system (Admin UI):
- **Backend**: Express.js + TypeScript, responsible for user authentication and JWT signing
- **Frontend**: React application using `@rtc-agent/component` to integrate RTC Agent
- **RTC Agent Server**: Already deployed, configured to trust our JWT issuer

## Complete Code

### 1. Server Implementation

#### 1.1 Generate Key Pair

```bash
# Generate RSA private key (2048 bits)
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048

# Extract public key from private key
openssl rsa -pubout -in private.pem -out public.pem
```

#### 1.2 JWT Signing Service

```typescript
// src/services/jwt-service.ts
import { SignJWT, importPKCS8, exportJWK } from 'jose';
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Load private key (in production, should read from secure storage)
const privateKeyPem = readFileSync('./keys/private.pem', 'utf8');
const privateKey = await importPKCS8(privateKeyPem, 'RS256');

// Load public key
const publicKeyPem = readFileSync('./keys/public.pem', 'utf8');
const publicKey = await importSPKI(publicKeyPem, 'RS256');

// Key ID (for JWKS)
const KEY_ID = 'admin-key-1';

export interface JWTClaims {
  sub: string;      // User ID
  email: string;    // Email
  name: string;     // Display name
  picture?: string; // Avatar URL
}

/**
 * Sign JWT
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
    .setExpirationTime(now + 3600)  // 1 hour
    .setIssuer('https://your-app.com')  // Must match RTC Agent config
    .sign(privateKey);
  
  return token;
}

/**
 * Get JWKS (JSON Web Key Set)
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

#### 1.3 Express Routes

```typescript
// src/routes/auth.ts
import express from 'express';
import { signJWT, getJWKS } from '../services/jwt-service';
import { verifyPassword } from '../services/auth-service';
import { getJWKS } from '../services/jwt-service';

const router = express.Router();

/**
 * POST /api/auth/login
 * User login, issue JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Verify username and password
    const user = await verifyPassword(email, password);
    if (!user) {
      return res.status(401).json({
        success: false,
        errorCode: 'invalid_credentials',
        errorMessage: 'Invalid email or password',
      });
    }
    
    // Sign JWT
    const accessToken = await signJWT({
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.avatar_url,
    });
    
    // Issue refresh token (simplified example, actual implementation should be more complex)
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
      errorMessage: 'Internal server error',
    });
  }
});

/**
 * GET /.well-known/jwks.json
 * JWKS endpoint, returns public key set
 */
router.get('/.well-known/jwks.json', async (req, res) => {
  try {
    const jwks = await getJWKS();
    
    // Set cache header (1 hour)
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', 'application/json');
    res.json(jwks);
  } catch (error) {
    console.error('JWKS error:', error);
    res.status(500).json({
      success: false,
      errorCode: 'server_error',
      errorMessage: 'Unable to get JWKS',
    });
  }
});

export default router;
```

#### 1.4 Main Application

```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 2. RTC Agent Server Configuration

Add the following to RTC Agent Server's `config.yaml`:

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

### 3. Client Implementation

#### 3.1 Auth Storage

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
 * Store tokens
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
 * Get access token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Get refresh token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Check if token is expired
 */
export function isTokenExpired(): boolean {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() >= parseInt(expiry);
}

/**
 * Check if token is about to expire (5 minutes early)
 */
export function isTokenExpiringSoon(): boolean {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() >= parseInt(expiry) - 5 * 60 * 1000;
}

/**
 * Store user information
 */
export function setUserInfo(userInfo: UserInfo): void {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
}

/**
 * Get user information
 */
export function getUserInfo(): UserInfo | null {
  const data = localStorage.getItem(USER_INFO_KEY);
  return data ? JSON.parse(data) : null;
}

/**
 * Clear all auth information
 */
export function clearAuth(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Check if authenticated
 */
export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  return !isTokenExpired();
}
```

#### 3.2 AuthProvider Implementation

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
 * Get or generate Device ID
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
 * Refresh token
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
 * Create AuthProvider
 */
export function createAuthProvider(): AuthProvider {
  return {
    type: 'token-exchange',
    
    getExchangeToken: async (): Promise<string> => {
      // Check if refresh needed (5 minutes early)
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
      // Call backend to revoke refresh token (optional)
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
      
      // Clear local auth information
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

#### 3.3 RTC Agent Integration

```typescript
// src/components/RTCIntegration.tsx
import { useEffect, useRef } from 'react';
import { createRtcAgent } from '@rtc-agent/component';
import type { RtcAgentWithLifecycle } from '@rtc-agent/component';
import { createAuthProvider } from '../utils/rtc-auth-provider';

export function RTCIntegration() {
  const agentRef = useRef<RtcAgentWithLifecycle | null>(null);
  
  useEffect(() => {
    // Create RTC Agent
    const agent = createRtcAgent({
      server: { url: 'https://rtc-agent.your-app.com' },
      auth: createAuthProvider(),
      workerURL: '/rtc-agent/shared-worker.js',
      databaseName: 'your-app-rtc',
      lang: 'en-US',
      
      appLabel: 'AI Assistant',
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
          console.log('RTC Agent is ready');
        },
        authLogin: ({ userId }: { userId: string }) => {
          console.log('Logged in, user ID:', userId);
        },
        authError: () => {
          console.error('Authentication error');
          // Handle authentication error (e.g., redirect to login page)
        },
      },
    });
    
    // Add to DOM
    document.body.appendChild(agent);
    agentRef.current = agent;
    
    // Cleanup function
    return () => {
      if (agentRef.current) {
        agentRef.current.destroy();
        agentRef.current = null;
      }
    };
  }, []);
  
  return null;  // Don't render any UI, RTC Agent is global
}
```

#### 3.4 Main Application Entry

```typescript
// src/App.tsx
import { useEffect, useState } from 'react';
import { RTCIntegration } from './components/RTCIntegration';
import { isAuthenticated } from './utils/auth-storage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  
  // Listen to auth state changes
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
      <RTCIntegration />  {/* Global RTC Agent */}
    </>
  );
}
```

## Testing and Verification

### 1. Verify JWT Signing

```bash
curl -X POST https://your-app.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

Expected response:

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

### 2. Verify JWKS Endpoint

```bash
curl https://your-app.com/.well-known/jwks.json
```

Expected response:

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

### 3. Verify Frontend Integration

1. Open browser, visit `https://your-app.com`
2. Log into the system
3. Open browser console, check:
   - ✅ No CORS errors
   - ✅ No JWT validation errors
   - ✅ WebSocket connection successful
   - ✅ See "RTC Agent is ready" log
4. Should see RTC Agent bubble icon in bottom-right corner

## Production Environment Considerations

### 1. Key Management

- ✅ **Private Key Security**: Store private keys in a secure location (e.g., AWS KMS, Alibaba Cloud Key Management Service, HashiCorp Vault)
- ✅ **Regular Rotation**: Rotate key pairs every 90 days
- ✅ **Key Backup**: Properly backup private keys to prevent loss

### 2. Performance Optimization

- ✅ **JWKS Caching**: Set appropriate cache headers (`Cache-Control: public, max-age=3600`)
- ✅ **Database Indexing**: Add indexes to user tables to speed up login queries
- ✅ **Connection Pooling**: Use database connection pools to reduce connection overhead

### 3. Security Hardening

- ✅ **HTTPS**: Production environments must use HTTPS
- ✅ **CORS**: Restrict allowed origins, don't use `*`
- ✅ **Rate Limiting**: Implement rate limiting on login endpoints
- ✅ **Input Validation**: Validate all inputs to prevent SQL injection and XSS

### 4. Monitoring and Alerting

- ✅ **Logging**: Log all authentication events (login success/failure)
- ✅ **Exception Monitoring**: Monitor JWT validation failures, JWKS fetch failures, etc.
- ✅ **Performance Monitoring**: Monitor API response times, error rates

## Complete Code Repository

The complete code for this example can be found in the following repositories:
- **Server**: [rtc-agent/examples/token-exchange-server](https://github.com/rtc-agent/examples/tree/main/token-exchange-server)
- **Client**: [rtc-agent/examples/token-exchange-client](https://github.com/rtc-agent/examples/tree/main/token-exchange-client)

## Next Steps

- [Authentication & Authorization - Complete Token Exchange Guide](/docs/en/integration/auth/#complete-token-exchange-integration-guide)
- [Web Component API](/docs/en/integration/component-api/)
- [Function Registration Guide](/docs/en/integration/function-registration/)
- [Core Protocol RTC](/docs/en/concepts/rtc/)
