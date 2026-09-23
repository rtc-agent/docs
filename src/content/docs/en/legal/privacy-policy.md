---
title: Privacy Policy
description: RTC Agent component privacy policy — how we collect, use, store, and protect your data.
---

> Last updated: 2026-09-11

This Privacy Policy explains how RTC Agent ("the Service") collects, uses, stores, and protects your personal information. The Service is embedded as a Web Component in third-party websites (such as Mermaid Live Editor) to provide AI assistant capabilities.

## 1. Information We Collect

### 1.1 Account Information

When you use the Service, you must authenticate via OAuth2. We collect:

- **OAuth2 user identifier**: From your identity provider (e.g., GitHub, Google)
- **Device identifiers**: For managing logged-in devices
- **Access and refresh tokens**: For maintaining authentication state

### 1.2 Conversation Data

- **Message records**: Your conversation content with the AI assistant
- **Session metadata**: Session title, creation time, status
- **Turn records**: Records of each interaction turn
- **RTC call records**: Tool call requests and results

### 1.3 Memory Data

- **Session Memory**: Context summary of the current session
- **User Memory**: Long-term cross-session memory (may include vector embeddings)

### 1.4 Data Stored Locally in Browser Only

The following data is **stored only in your browser's IndexedDB** and is never uploaded to our servers:

- **Virtual file system**: All file contents (function definitions, scenarios, scripts, etc.)
- **Script execution**: All scripts execute locally in the browser sandbox
- **Local sync mirrors**: Local copies of sessions/messages/turns (for offline support)

## 2. How We Use Data

We use collected data for the following purposes:

| Purpose | Data Scope | Storage Location |
|---------|-----------|-----------------|
| Provide AI conversation service | Message records | Server |
| Maintain session context | Session memory, Turn records | Server |
| Long-term memory & personalization | User memory | Server |
| Authentication & device management | OAuth2 info, Device IDs | Server |
| Local tool execution | Files, Functions, Scripts | Browser only |

**We do not** upload your local file data to the server. AI tool calls execute in the browser; only execution results (not raw files) are sent back to the server to continue AI reasoning.

## 3. Data Storage & Security

### 3.1 Browser Local Storage

- All file data is stored in your browser via **IndexedDB**
- Databases are prefixed with `rtc-agent-` for user isolation
- You can clear this data at any time through your browser settings

### 3.2 Server-Side Storage

- Conversation records, memory, and other data are stored in a **PostgreSQL** database
- Transport layer uses **WSS/TLS** encryption
- Access tokens are in JWT format; refresh tokens are stored securely

### 3.3 Script Execution Security

Scripts execute in the browser through a sandboxed engine that:

- Blocks access to dangerous APIs: `fetch`, `window`, `document`, `localStorage`, etc.
- Blocks prototype chain escape (`__proto__`, `constructor`)
- Blocks dynamic `import()`
- Blocks unbounded loops
- Allows only pure computation standard library + rtcAgent host APIs

## 4. Third-Party Services

The Service relies on the following third-party services:

| Service | Purpose | Data Flow |
|---------|---------|-----------|
| **LLM API** | AI reasoning | Conversation content sent to AI model provider |
| **OAuth2 providers** | Authentication | Auth info flows to GitHub/Google, etc. |
| **Centrifuge** | Real-time communication | WebSocket message transport |

Please note: When you chat with the AI, your message content is sent to the LLM API for reasoning. Avoid entering highly sensitive information (such as passwords or API keys) in conversations.

## 5. Your Rights

You have the following rights:

- **Access**: View your account information and conversation records
- **Deletion**: Delete your account and all associated data
- **Export**: Export your personal data
- **Local data control**: Clear all locally stored data through browser settings

## 6. Data Retention

- **Account data**: Retained until you actively delete your account
- **Conversation records**: Retained until session closure or deletion
- **Local data**: Retained in your browser until you manually clear it

## 7. Children's Privacy

The Service is not directed to individuals under 18. We do not knowingly collect personal information from minors.

## 8. Policy Updates

We may update this Privacy Policy from time to time. Updated policies will be posted on this page with the last updated date revised.

## 9. Contact Us

If you have questions about this Privacy Policy, please contact us:

- Repository: [https://github.com/rtc-agent/docs](https://github.com/rtc-agent/docs)
- Service URL: `https://rtc-agent.cherish.chat`
