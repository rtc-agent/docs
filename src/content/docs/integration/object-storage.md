---
title: 对象存储 (OSS/S3)
description: RTC Agent 的对象存储服务——兼容 S3 协议，支持客户端使用标准 S3 SDK 进行文件上传、下载和管理。
---

RTC Agent 提供完整的 S3 兼容对象存储服务，客户端可以使用标准的 AWS S3 SDK 直接访问服务器端的存储资源。本文档介绍如何获取临时凭证、配置 S3 Client SDK，以及常见的文件操作示例。

## 架构概览

```mermaid
flowchart TB
    subgraph CLIENT["🖥️ 客户端"]
        APP[应用代码]
        S3SDK[S3 Client SDK]
    end
    
    subgraph SERVER["⚙️ RTC Agent Server"]
        STS[STS API<br/>/api/credentials/temporary]
        S3EP[S3 Endpoint<br/>/s3/{bucket}/{key}]
    end
    
    subgraph STORAGE["💾 存储后端"]
        MINIO[(MinIO/S3)]
    end
    
    APP -->|1. JWT 认证| STS
    STS -->|2. 返回临时凭证| APP
    APP -->|3. 配置 SDK| S3SDK
    S3SDK -->|4. SigV4 签名请求| S3EP
    S3EP -->|5. 转发请求| STORAGE
    
    style CLIENT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style SERVER fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style STORAGE fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

> 💡 **设计要点**：客户端通过 STS API 获取临时凭证后，可直接使用标准 S3 SDK 与服务器通信，无需经过 RTC Agent 应用层，实现高效的文件传输。

---

## 获取临时凭证

### POST /api/credentials/temporary

通过 JWT 认证获取临时 S3 凭证，用于配置 S3 Client SDK。

**请求头**：

```http
Authorization: Bearer <jwt_token>
```

**响应**：

```json
{
  "access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "session_token": "AQoDYXdzEPT//////////wEXAMPLEtc=",
  "expires_at": "2026-10-01T23:00:00Z"
}
```

| 字段 | 类型 | 说明 |
|------|:----:|------|
| `access_key_id` | string | 临时访问密钥 ID |
| `secret_access_key` | string | 临时访问密钥 Secret |
| `session_token` | string | 会话令牌（必须包含在 SDK 配置中） |
| `expires_at` | string | 凭证过期时间（UTC，RFC 3339 格式） |

> ⚠️ **安全提示**：临时凭证具有时效性，过期后自动失效。请勿将凭证硬编码到客户端代码中，应在运行时动态获取。

---

## S3 Client SDK 配置

### 连接信息

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **Endpoint** | `http://<server-host>:8888/s3/` | S3 服务端点（集成在主服务器，路径前缀 `/s3/`） |
| **Region** | `us-east-1` | S3 区域（默认值，可在服务器配置中修改） |
| **Bucket** | `rtc-agent` | 存储桶名称（可在服务器配置中修改） |
| **Path Style** | `true` | 必须使用路径风格（非虚拟主机风格） |

### 路径格式

S3 对象的路径格式为：

```
/s3/{bucket}/user-{user-id}/{md5-hash}.{ext}
```

例如：`/s3/rtc-agent/user-550e8400-e29b-41d4-a716-446655440000/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.txt`

**严格的路径验证规则**：

服务器对对象键（Key）实施严格的格式验证，必须满足以下正则表达式：

```
^user-[a-f0-9-]{36}/[a-f0-9]{32}\.[a-zA-Z0-9]{1,10}$
```

- `user-{user-id}`：`user-` 前缀 + 标准 UUID 格式（36 个字符，包含连字符，如 `550e8400-e29b-41d4-a716-446655440000`）
- `{md5-hash}`：32 个十六进制字符（小写 `a-f` 或数字 `0-9`）的文件内容 MD5 哈希值
- `{ext}`：1-10 个字母数字字符的文件扩展名（如 `txt`、`jpg`、`pdf`）

**常见错误示例**：

```
✅ 正确: user-550e8400-e29b-41d4-a716-446655440000/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.txt
❌ 错误: user-550e8400e29b41d4a716446655440000/a1b2c3d4... (缺少连字符的 UUID)
❌ 错误: user-550e8400-e29b-41d4-a716-446655440000/myfile.txt (MD5 格式错误)
❌ 错误: user-550e8400-e29b-41d4-a716-446655440000/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6 (缺少扩展名)
❌ 错误: user-550e8400-e29b-41d4-a716-446655440000/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.toolong (扩展名超过 10 字符)
```

不符合格式的路径会返回 `400 Bad Request` 和 `InvalidKeyFormat` 错误码。

> 💡 **用户隔离**：每个用户只能访问以 `user-{user-id}/` 为前缀的对象，服务器会在 SigV4 中间件层验证权限。

---

## 客户端集成示例

### TypeScript / JavaScript (AWS SDK v3)

```typescript
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// 1. 获取临时凭证
async function getCredentials() {
  const response = await fetch('http://server:8888/api/credentials/temporary', {
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    }
  });
  return response.json();
}

// 2. 初始化 S3 Client
async function createS3Client() {
  const creds = await getCredentials();
  
  const client = new S3Client({
    endpoint: 'http://server:8888/s3/',
    region: 'us-east-1',
    credentials: {
      accessKeyId: creds.access_key_id,
      secretAccessKey: creds.secret_access_key,
      sessionToken: creds.session_token
    },
    forcePathStyle: true // 必须使用路径风格
  });
  
  return client;
}

// 3. 上传文件
async function uploadFile(userId: string, md5Hash: string, ext: string, file: File) {
  const client = await createS3Client();
  const key = `user-${userId}/${md5Hash}.${ext}`;
  
  const upload = new Upload({
    client,
    params: {
      Bucket: 'rtc-agent',
      Key: key,
      Body: file,
      ContentType: file.type
    }
  });
  
  await upload.done();
  console.log(`上传完成: ${key}`);
}

// 4. 下载文件
async function downloadFile(userId: string, md5Hash: string, ext: string) {
  const client = await createS3Client();
  const key = `user-${userId}/${md5Hash}.${ext}`;
  
  const response = await client.send(new GetObjectCommand({
    Bucket: 'rtc-agent',
    Key: key
  }));
  
  return response.Body;
}
```

### Python (boto3)

```python
import boto3
import requests

# 1. 获取临时凭证
def get_credentials():
    response = requests.post(
        'http://server:8888/api/credentials/temporary',
        headers={'Authorization': f'Bearer {jwt_token}'}
    )
    return response.json()

# 2. 初始化 S3 Client
def create_s3_client():
    creds = get_credentials()
    
    client = boto3.client(
        's3',
        endpoint_url='http://server:8888/s3/',
        region_name='us-east-1',
        aws_access_key_id=creds['access_key_id'],
        aws_secret_access_key=creds['secret_access_key'],
        aws_session_token=creds['session_token'],
        config=boto3.session.Config(s3={'addressing_style': 'path'})
    )
    
    return client

# 3. 上传文件
def upload_file(user_id: str, md5_hash: str, ext: str, file_path: str):
    client = create_s3_client()
    key = f'user-{user_id}/{md5_hash}.{ext}'
    
    client.upload_file(file_path, 'rtc-agent', key)
    print(f'上传完成: {key}')

# 4. 下载文件
def download_file(user_id: str, md5_hash: str, ext: str, download_path: str):
    client = create_s3_client()
    key = f'user-{user_id}/{md5_hash}.{ext}'
    
    client.download_file('rtc-agent', key, download_path)
```

### Go (AWS SDK Go v2)

```go
package main

import (
    "context"
    "github.com/aws/aws-sdk-go-v2/aws"
    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/credentials"
    "github.com/aws/aws-sdk-go-v2/service/s3"
)

// 1. 获取临时凭证（省略 HTTP 请求代码）
type Credentials struct {
    AccessKeyID     string `json:"access_key_id"`
    SecretAccessKey string `json:"secret_access_key"`
    SessionToken    string `json:"session_token"`
}

// 2. 初始化 S3 Client
func createS3Client(creds Credentials) *s3.Client {
    cfg, _ := config.LoadDefaultConfig(context.TODO(),
        config.WithRegion("us-east-1"),
        config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
            creds.AccessKeyID,
            creds.SecretAccessKey,
            creds.SessionToken,
        )),
    )
    
    client := s3.NewFromConfig(cfg, func(o *s3.Options) {
        o.BaseEndpoint = aws.String("http://server:8888/s3/")
        o.UsePathStyle = true // 必须使用路径风格
    })
    
    return client
}

// 3. 上传文件
func uploadFile(client *s3.Client, userID, md5Hash, ext string, body io.Reader) error {
    key := fmt.Sprintf("user-%s/%s.%s", userID, md5Hash, ext)
    
    _, err := client.PutObject(context.TODO(), &s3.PutObjectInput{
        Bucket: aws.String("rtc-agent"),
        Key:    aws.String(key),
        Body:   body,
    })
    
    return err
}
```

---

## 支持的操作

RTC Agent S3 端点支持以下标准 S3 操作：

| 操作 | HTTP 方法 | 路径 | 说明 |
|------|:---------:|------|------|
| **PutObject** | PUT | `/{bucket}/{key}` | 上传对象 |
| **GetObject** | GET | `/{bucket}/{key}` | 下载对象 |
| **DeleteObject** | DELETE | `/{bucket}/{key}` | 删除单个对象 |
| **HeadObject** | HEAD | `/{bucket}/{key}` | 获取对象元数据 |
| **ListObjects** | GET | `/{bucket}` | 列出对象（V1 API） |
| **CopyObject** | PUT | `/{bucket}/{key}` | 复制对象（带 `x-amz-copy-source` 头） |
| **CreateMultipartUpload** | POST | `/{bucket}/{key}?uploads` | 初始化分片上传 |
| **UploadPart** | PUT | `/{bucket}/{key}?partNumber=N&uploadId=X` | 上传分片 |
| **CompleteMultipartUpload** | POST | `/{bucket}/{key}?uploadId=X` | 完成分片上传 |
| **AbortMultipartUpload** | DELETE | `/{bucket}/{key}?uploadId=X` | 中止分片上传 |
| **ListParts** | GET | `/{bucket}/{key}?uploadId=X` | 列出已上传分片 |

> 💡 **分片上传**：对于大文件（>100MB），推荐使用分片上传以获得更好的性能和可靠性。

---

## Presigned URL

除了使用 S3 SDK，还可以使用 Presigned URL 进行简单的上传/下载操作。

### POST /api/presigned-url

生成预签名 URL，允许在限定时间内执行指定的 S3 操作。

**请求头**：

```http
Authorization: Bearer <jwt_token>
```

**请求体**：

```json
{
  "operation": "put",
  "key": "user-123/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.txt",
  "expires_in": 3600
}
```

| 字段 | 必填 | 类型 | 说明 |
|------|:----:|:----:|------|
| `operation` | ✅ | string | 操作类型：`"put"` 或 `"get"` |
| `key` | ✅ | string | 对象键（包含用户 ID 前缀） |
| `expires_in` | — | integer | 有效期（秒），默认 3600，最大 604800（7 天） |

**响应**：

```json
{
  "url": "http://server:8888/s3/rtc-agent/user-123/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.txt?X-Amz-Algorithm=...",
  "expires_at": "2026-10-01T23:00:00Z"
}
```

### 使用 Presigned URL

```typescript
// 上传文件
async function uploadWithPresignedUrl(userId: string, md5Hash: string, ext: string, file: File) {
  // 1. 获取 presigned URL
  const response = await fetch('http://server:8888/api/presigned-url', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      operation: 'put',
      key: `user-${userId}/${md5Hash}.${ext}`
    })
  });
  
  const { url } = await response.json();
  
  // 2. 直接上传到 S3
  await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });
}

// 下载文件
async function downloadWithPresignedUrl(key: string) {
  const response = await fetch('http://server:8888/api/presigned-url', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      operation: 'get',
      key
    })
  });
  
  const { url } = await response.json();
  
  // 直接从 S3 下载
  const fileResponse = await fetch(url);
  return fileResponse.blob();
}
```

> 💡 **选择建议**：
> - **Presigned URL**：适合简单的单次上传/下载，无需引入 S3 SDK
> - **S3 SDK**：适合需要频繁操作、批量处理、分片上传等复杂场景

---

## 错误处理

### S3 标准错误

S3 端点返回标准的 S3 XML 错误响应：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Error>
  <Code>AccessDenied</Code>
  <Message>Access Denied</Message>
  <Resource>/s3/rtc-agent/user-550e8400-e29b-41d4-a716-446655440000/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.txt</Resource>
  <RequestId>tx_abc123</RequestId>
</Error>
```

常见错误码：

| 错误码                    |  HTTP 状态码 | 说明                                                   |
| :------------------------ | :----------: | :----------------------------------------------------- |
| `AccessDenied`            |     403      | 无权访问该资源（用户 ID 前缀不匹配）                   |
| `NoSuchKey`               |     404      | 对象不存在                                             |
| `NoSuchBucket`            |     404      | 存储桶不存在                                           |
| `InvalidArgument`         |     400      | 请求参数无效                                           |
| `InvalidKeyFormat`        |     400      | 对象键格式不符合要求（必须匹配 `user-{uuid}/{md5}.{ext}` 格式） |
| `EntityTooLarge`          |     413      | 对象大小超出限制                                       |
| `SlowDown`                |     503      | 请求频率过高，请稍后重试                               |

### 限流与配额

RTC Agent 对 S3 API 实施限流和配额控制（以下均为默认值，可在服务器配置中调整）：

- **速率限制**：每个用户每分钟最多 60 次请求（可通过 `storage.rate_limit.requests_per_minute` 配置）
- **存储配额**：每个用户默认 1GB 存储空间（可通过 `storage.quota.max_user_quota_bytes` 配置）
- **单文件大小**：最大 100MB（可通过 `storage.quota.max_file_size_bytes` 配置）

超出限制时，服务器返回 `503 Slow Down`（速率限制）或 `413 Entity Too Large`（大小限制）。

> 💡 **分片上传**：对于大文件（>10MB），推荐使用分片上传以获得更好的性能和可靠性。

---

## 最佳实践

### 1. 凭证缓存

临时凭证有效期内可重复使用，建议缓存以减少 STS API 调用：

```typescript
class S3ClientManager {
  private client: S3Client | null = null;
  private expiresAt: Date | null = null;
  
  async getClient() {
    // 提前 5 分钟刷新凭证
    if (this.client && this.expiresAt && Date.now() < this.expiresAt.getTime() - 300000) {
      return this.client;
    }
    
    const creds = await getCredentials();
    this.client = createS3Client(creds);
    this.expiresAt = new Date(creds.expires_at);
    return this.client;
  }
}
```

### 2. 分片上传

对于大文件（>100MB），使用分片上传：

```typescript
import { Upload } from '@aws-sdk/lib-storage';

const upload = new Upload({
  client,
  params: {
    Bucket: 'rtc-agent',
    Key: 'user-550e8400-e29b-41d4-a716-446655440000/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.zip',
    Body: largeFile,
    ContentType: 'application/zip'
  },
  queueSize: 4, // 并发上传数
  partSize: 5 * 1024 * 1024 // 5MB 每片
});

upload.on('httpUploadProgress', (progress) => {
  console.log(`进度: ${progress.loaded}/${progress.total}`);
});

await upload.done();
```

### 3. 错误重试

网络波动时，建议实现指数退避重试：

```typescript
async function uploadWithRetry(userId: string, md5Hash: string, ext: string, file: File, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await uploadFile(userId, md5Hash, ext, file);
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 4. 用户 ID 前缀和路径格式

确保对象键符合严格的格式要求，否则服务器会返回 `InvalidKeyFormat` 错误：

```typescript
// ✅ 正确 - 符合 user-{uuid}/{md5}.{ext} 格式
const userId = '550e8400-e29b-41d4-a716-446655440000'; // 标准 UUID
const md5Hash = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';     // 32 个十六进制字符
const ext = 'txt';                                       // 1-10 个字母数字字符
const key = `user-${userId}/${md5Hash}.${ext}`;

// ❌ 错误 - UUID 缺少连字符，会返回 InvalidKeyFormat
const key = `user-550e8400e29b41d4a716446655440000/${md5Hash}.${ext}`;

// ❌ 错误 - MD5 格式错误（非 32 个十六进制字符）
const key = `user-${userId}/myfile.${ext}`;

// ❌ 错误 - 缺少扩展名
const key = `user-${userId}/${md5Hash}`;

// ❌ 错误 - 扩展名超过 10 个字符
const key = `user-${userId}/${md5Hash}.toolongextension`;
```

> 💡 **提示**：由于键格式包含文件内容的 MD5 哈希，相同的键意味着相同的内容。这支持"即时上传"功能——如果文件已存在，服务器会立即返回成功而无需实际上传。

---

## 下一步

- [HTTP API](/docs/protocol/http-api/) — 了解完整的 HTTP 接口，包括 OAuth2 认证
- [WebSocket RPC](/docs/protocol/rpc/) — 通过 WebSocket 进行业务操作
- [虚拟文件系统](/docs/concepts/virtual-fs/) — 了解客户端如何使用 IndexedDB 管理文件
