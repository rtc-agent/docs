---
title: Object Storage (OSS/S3)
description: RTC Agent's object storage service — S3 protocol compatible, supporting client-side file upload, download, and management using standard S3 SDKs.
---

RTC Agent provides a full-featured S3-compatible object storage service. Clients can use standard AWS S3 SDKs to directly access storage resources on the server. This document covers how to obtain temporary credentials, configure S3 Client SDKs, and common file operation examples.

## Architecture Overview

```mermaid
flowchart TB
    subgraph CLIENT["🖥️ Client"]
        APP[Application Code]
        S3SDK[S3 Client SDK]
    end
    
    subgraph SERVER["⚙️ RTC Agent Server"]
        STS[STS API<br/>/api/credentials/temporary]
        S3EP[S3 Endpoint<br/>/s3/{bucket}/{key}]
    end
    
    subgraph STORAGE["💾 Storage Backend"]
        MINIO[(MinIO/S3)]
    end
    
    APP -->|1. JWT Auth| STS
    STS -->|2. Return Temporary Credentials| APP
    APP -->|3. Configure SDK| S3SDK
    S3SDK -->|4. SigV4 Signed Requests| S3EP
    S3EP -->|5. Forward Requests| STORAGE
    
    style CLIENT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style SERVER fill:#fff3e0,stroke:#e65100,stroke-width:2px
    style STORAGE fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

> 💡 **Design Point**: After obtaining temporary credentials via the STS API, clients can communicate directly with the server using standard S3 SDKs, bypassing the RTC Agent application layer for efficient file transfers.

---

## Obtaining Temporary Credentials

### POST /api/credentials/temporary

Obtain temporary S3 credentials via JWT authentication for configuring S3 Client SDKs.

**Request Headers**:

```http
Authorization: Bearer <jwt_token>
```

**Response**:

```json
{
  "access_key_id": "AKIAIOSFODNN7EXAMPLE",
  "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "session_token": "AQoDYXdzEPT//////////wEXAMPLEtc=",
  "expires_at": "2026-10-01T23:00:00Z"
}
```

| Field | Type | Description |
|-------|:----:|-------------|
| `access_key_id` | string | Temporary access key ID |
| `secret_access_key` | string | Temporary secret access key |
| `session_token` | string | Session token (must be included in SDK configuration) |
| `expires_at` | string | Credential expiration time (UTC, RFC 3339 format) |

> ⚠️ **Security Note**: Temporary credentials are time-limited and automatically expire. Do not hardcode credentials into client code; obtain them dynamically at runtime.

---

## S3 Client SDK Configuration

### Connection Information

| Configuration | Value | Description |
|---------------|-------|-------------|
| **Endpoint** | `http://<server-host>:8888/s3/` | S3 service endpoint (integrated in main server with `/s3/` prefix) |
| **Region** | `us-east-1` | S3 region (default value, configurable on server) |
| **Bucket** | `rtc-agent` | Bucket name (configurable on server) |
| **Path Style** | `true` | Must use path-style (not virtual-hosted-style) |

### Path Format

S3 object paths follow this format:

```
/s3/{bucket}/user-{user-id}/{md5-hash}.{ext}
```

Example: `/s3/rtc-agent/user-550e8400-e29b-41d4-a716-446655440000/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.txt`

**Strict path validation rules**:

The server enforces strict validation on object keys using this regular expression:

```
^user-[a-f0-9-]{36}/[a-f0-9]{32}\.[a-zA-Z0-9]{1,10}$
```

- `user-{user-id}`: `user-` prefix + standard UUID format (36 characters with hyphens, e.g., `550e8400-e29b-41d4-a716-446655440000`)
- `{md5-hash}`: 32 hexadecimal characters (lowercase `a-f` or digits `0-9`) representing the file content's MD5 hash
- `{ext}`: 1-10 alphanumeric characters for the file extension (e.g., `txt`, `jpg`, `pdf`)

**Common error examples**:

```
✅ Valid: user-550e8400-e29b-41d4-a716-446655440000/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.txt
❌ Invalid: user-550e8400e29b41d4a716446655440000/a1b2c3d4... (UUID missing hyphens)
❌ Invalid: user-550e8400-e29b-41d4-a716-446655440000/myfile.txt (MD5 format incorrect)
❌ Invalid: user-550e8400-e29b-41d4-a716-446655440000/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6 (missing extension)
❌ Invalid: user-550e8400-e29b-41d4-a716-446655440000/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.toolong (extension >10 chars)
```

Paths that don't match the format will return `400 Bad Request` with error code `InvalidKeyFormat`.

> 💡 **User Isolation**: Each user can only access objects with the `user-{user-id}/` prefix. The server validates permissions at the SigV4 middleware layer.

---

## Client Integration Examples

### TypeScript / JavaScript (AWS SDK v3)

```typescript
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// 1. Get temporary credentials
async function getCredentials() {
  const response = await fetch('http://server:8888/api/credentials/temporary', {
    headers: {
      'Authorization': `Bearer ${jwtToken}`
    }
  });
  return response.json();
}

// 2. Initialize S3 Client
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
    forcePathStyle: true // Must use path-style
  });
  
  return client;
}

// 3. Upload file
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
  console.log(`Upload complete: ${key}`);
}

// 4. Download file
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

# 1. Get temporary credentials
def get_credentials():
    response = requests.post(
        'http://server:8888/api/credentials/temporary',
        headers={'Authorization': f'Bearer {jwt_token}'}
    )
    return response.json()

# 2. Initialize S3 Client
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

# 3. Upload file
def upload_file(user_id: str, md5_hash: str, ext: str, file_path: str):
    client = create_s3_client()
    key = f'user-{user_id}/{md5_hash}.{ext}'
    
    client.upload_file(file_path, 'rtc-agent', key)
    print(f'Upload complete: {key}')

# 4. Download file
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

// 1. Get temporary credentials (HTTP request code omitted)
type Credentials struct {
    AccessKeyID     string `json:"access_key_id"`
    SecretAccessKey string `json:"secret_access_key"`
    SessionToken    string `json:"session_token"`
}

// 2. Initialize S3 Client
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
        o.UsePathStyle = true // Must use path-style
    })
    
    return client
}

// 3. Upload file
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

## Supported Operations

RTC Agent S3 endpoint supports the following standard S3 operations:

| Operation | HTTP Method | Path | Description |
|-----------|:-----------:|------|-------------|
| **PutObject** | PUT | `/{bucket}/{key}` | Upload object |
| **GetObject** | GET | `/{bucket}/{key}` | Download object |
| **DeleteObject** | DELETE | `/{bucket}/{key}` | Delete single object |
| **HeadObject** | HEAD | `/{bucket}/{key}` | Get object metadata |
| **ListObjects** | GET | `/{bucket}` | List objects (V1 API) |
| **CopyObject** | PUT | `/{bucket}/{key}` | Copy object (with `x-amz-copy-source` header) |
| **CreateMultipartUpload** | POST | `/{bucket}/{key}?uploads` | Initialize multipart upload |
| **UploadPart** | PUT | `/{bucket}/{key}?partNumber=N&uploadId=X` | Upload part |
| **CompleteMultipartUpload** | POST | `/{bucket}/{key}?uploadId=X` | Complete multipart upload |
| **AbortMultipartUpload** | DELETE | `/{bucket}/{key}?uploadId=X` | Abort multipart upload |
| **ListParts** | GET | `/{bucket}/{key}?uploadId=X` | List uploaded parts |

> 💡 **Multipart Upload**: For large files (>100MB), multipart upload is recommended for better performance and reliability.

---

## Presigned URLs

In addition to using S3 SDKs, you can use Presigned URLs for simple upload/download operations.

### POST /api/presigned-url

Generate a presigned URL that allows executing a specific S3 operation within a limited time.

**Request Headers**:

```http
Authorization: Bearer <jwt_token>
```

**Request Body**:

```json
{
  "operation": "put",
  "key": "user-123/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.txt",
  "expires_in": 3600
}
```

| Field | Required | Type | Description |
|-------|:--------:|:----:|-------------|
| `operation` | ✅ | string | Operation type: `"put"` or `"get"` |
| `key` | ✅ | string | Object key (including user ID prefix) |
| `expires_in` | — | integer | Validity period (seconds), default 3600, max 604800 (7 days) |

**Response**:

```json
{
  "url": "http://server:8888/s3/rtc-agent/user-123/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.txt?X-Amz-Algorithm=...",
  "expires_at": "2026-10-01T23:00:00Z"
}
```

### Using Presigned URLs

```typescript
// Upload file
async function uploadWithPresignedUrl(userId: string, md5Hash: string, ext: string, file: File) {
  // 1. Get presigned URL
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
  
  // 2. Upload directly to S3
  await fetch(url, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });
}

// Download file
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
  
  // Download directly from S3
  const fileResponse = await fetch(url);
  return fileResponse.blob();
}
```

> 💡 **Selection Guide**:
> - **Presigned URL**: Suitable for simple single upload/download, no S3 SDK required
> - **S3 SDK**: Suitable for frequent operations, batch processing, multipart uploads, and other complex scenarios

---

## Error Handling

### Standard S3 Errors

S3 endpoints return standard S3 XML error responses:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Error>
  <Code>AccessDenied</Code>
  <Message>Access Denied</Message>
  <Resource>/s3/rtc-agent/user-550e8400-e29b-41d4-a716-446655440000/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6.txt</Resource>
  <RequestId>tx_abc123</RequestId>
</Error>
```

Common error codes:

| Error Code | HTTP Status | Description |
|------------|:-----------:|-------------|
| `AccessDenied` | 403 | No permission to access resource (user ID prefix mismatch) |
| `NoSuchKey` | 404 | Object does not exist |
| `NoSuchBucket` | 404 | Bucket does not exist |
| `InvalidArgument` | 400 | Invalid request parameters |
| `InvalidKeyFormat` | 400 | Object key format does not match requirements (must match `user-{uuid}/{md5}.{ext}` format) |
| `EntityTooLarge` | 413 | Object size exceeds limit |
| `SlowDown` | 503 | Request rate too high, please retry later |

### Rate Limiting and Quotas

RTC Agent implements rate limiting and quota controls for S3 APIs (all defaults are configurable on the server):

- **Rate Limit**: Maximum 60 requests per minute per user (configurable via `storage.rate_limit.requests_per_minute`)
- **Storage Quota**: Default 1GB per user (configurable via `storage.quota.max_user_quota_bytes`)
- **Single File Size**: Maximum 100MB (configurable via `storage.quota.max_file_size_bytes`)

When limits are exceeded, the server returns `503 Slow Down` (rate limit) or `413 Entity Too Large` (size limit).

> 💡 **Multipart Upload**: For large files (>10MB), multipart upload is recommended for better performance and reliability.

---

## Best Practices

### 1. Credential Caching

Temporary credentials can be reused within their validity period. Caching is recommended to reduce STS API calls:

```typescript
class S3ClientManager {
  private client: S3Client | null = null;
  private expiresAt: Date | null = null;
  
  async getClient() {
    // Refresh credentials 5 minutes before expiration
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

### 2. Multipart Upload

For large files (>100MB), use multipart upload:

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
  queueSize: 4, // Concurrent uploads
  partSize: 5 * 1024 * 1024 // 5MB per part
});

upload.on('httpUploadProgress', (progress) => {
  console.log(`Progress: ${progress.loaded}/${progress.total}`);
});

await upload.done();
```

### 3. Error Retry

Implement exponential backoff retry for network fluctuations:

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

### 4. User ID Prefix and Path Format

Ensure object keys match the strict format requirements, otherwise the server will return `InvalidKeyFormat` error:

```typescript
// ✅ Valid - matches user-{uuid}/{md5}.{ext} format
const userId = '550e8400-e29b-41d4-a716-446655440000'; // Standard UUID
const md5Hash = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';     // 32 hexadecimal characters
const ext = 'txt';                                       // 1-10 alphanumeric characters
const key = `user-${userId}/${md5Hash}.${ext}`;

// ❌ Invalid - UUID missing hyphens, will return InvalidKeyFormat
const key = `user-550e8400e29b41d4a716446655440000/${md5Hash}.${ext}`;

// ❌ Invalid - MD5 format incorrect (not 32 hexadecimal characters)
const key = `user-${userId}/myfile.${ext}`;

// ❌ Invalid - Missing extension
const key = `user-${userId}/${md5Hash}`;

// ❌ Invalid - Extension exceeds 10 characters
const key = `user-${userId}/${md5Hash}.toolongextension`;
```

> 💡 **Tip**: Since the key format includes the file content's MD5 hash, identical keys imply identical content. This enables "instant upload" — if the file already exists, the server returns success immediately without actual upload.

---

## Next Steps

- [HTTP API](/docs/en/protocol/http-api/) — Learn about the complete HTTP interface, including OAuth2 authentication
- [WebSocket RPC](/docs/en/protocol/rpc/) — Perform business operations via WebSocket
- [Virtual File System](/docs/en/concepts/virtual-fs/) — Understand how clients manage files using IndexedDB
