---
title: Authentication & Authorization
description: RTC Agent's OAuth2 login flow, dual-token mechanism, device management, and security constraints — sign in once, use seamlessly across devices.
---

**Authentication & Authorization** is the security foundation of RTC Agent. Users log in via the OAuth2 authorization code flow, and the system maintains sessions using dual tokens (Access + Refresh). It supports parallel multi-device logins and automatic token refresh — users only need to sign in once for long-term use.

## Login Flow

```mermaid
flowchart TD
    A["👤 User clicks login"] --> B["🪟 Login dialog appears"]
    B --> C["🔗 OAuth2 Provider authorization page displayed"]
    C --> D["🔐 User authorizes on Provider page"]
    D --> E["📩 Authorization successful, authorization code obtained"]
    E --> F["🔄 Exchange authorization code for tokens"]
    F --> G{"Success?"}
    G -->|"✅ Yes"| H["🎉 Login complete, enter main interface"]
    G -->|"❌ No"| I["⚠️ Error displayed, retry available"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style D fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style H fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
    style I fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

| Step | Description |
|:----:|------|
| 1 | User clicks the login button, and a login dialog appears |
| 2 | The dialog displays the OAuth2 Provider's authorization page via an iframe |
| 3 | User completes authorization on the Provider page (e.g., GitHub, Google) |
| 4 | After successful authorization, the system obtains the authorization code and exchanges it for tokens |
| 5 | Tokens are stored in the browser locally, and login is complete |

> 💡 **Design Principle**: The login flow is fully delegated to the OAuth2 Provider — RTC Agent never handles user passwords; security is guaranteed by the Provider.

## Dual-Token Mechanism

```mermaid
flowchart LR
    subgraph TOKENS["🔑 Token System"]
        direction TB
        A["Access Token<br/>⏱️ 1 hour"] -->|"Access API"| API["🔌 REST / WebSocket"]
        B["Refresh Token<br/>📅 30 days"] -->|"Refresh"| A
    end

    subgraph STORAGE["💾 Storage Strategy"]
        direction TB
        C["Access Token<br/>Stored in plaintext"]
        D["Refresh Token<br/>Hash only"]
    end

    style TOKENS fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style STORAGE fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

| Token | Validity | Purpose | Storage |
|:----:|:------:|:----:|:--------:|
| 🔑 Access Token | 1 hour | Access API and WebSocket | Plaintext (short validity, manageable risk) |
| 🔄 Refresh Token | 30 days | Refresh Access Token | Hash only (plaintext returned once at issuance, then discarded) |

> 📌 **Security Key Point**: The Refresh Token's plaintext is only returned once at issuance; afterward, the server stores only the hash. Even if browser storage is compromised, attackers cannot impersonate the user long-term.

## Automatic Refresh

The system automatically refreshes tokens at multiple trigger points, completely transparent to the user:

```mermaid
flowchart TD
    A["🔍 Check refresh timing"] --> B{"Token about to expire?<br/>(5 minutes early)"}
    B -->|"✅ Yes"| C["🔄 Refresh using Refresh Token"]
    B -->|"❌ No"| D["⏳ Continue using current token"]
    C --> E{"Refresh successful?"}
    E -->|"✅ Yes"| F["🎉 New Access Token obtained"]
    E -->|"❌ No"| G["🚪 Log out, require re-authentication"]

    style A fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style C fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style F fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
    style G fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

| Trigger | Description |
|:--------:|------|
| ⏱️ Token about to expire | Automatically refreshed 5 minutes before expiration to avoid request interruption |
| 📱 Page returns to foreground | Token status is checked when switching back from background; refresh immediately if expired |
| 🔌 Establishing WebSocket | Ensure token is valid before connecting |

> 💡 Refresh failures don't leave users in a "half-dead" state — the system logs them out directly and guides them to re-authenticate.

## Device Management

```mermaid
flowchart LR
    subgraph DEVICE1["📱 Device A"]
        direction TB
        DA["Device ID: uuid-aaa"]
        DB["Device name: Mac Chrome"]
    end

    subgraph DEVICE2["💻 Device B"]
        direction TB
        DC["Device ID: uuid-bbb"]
        DD["Device name: Windows PC"]
    end

    USER["👤 User"] --> DEVICE1
    USER --> DEVICE2

    style DEVICE1 fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style DEVICE2 fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
```

| Concept | Description |
|------|------|
| 🔖 Device ID | Unique browser identifier (UUID), automatically generated on first visit |
| 📛 Device Name | Automatically inferred from browser type and OS (e.g., "Mac Chrome", "Windows PC") |
| 🔀 Multi-device | The same user can log in independently on multiple devices without interference |

> 📌 Tokens are independent per device — logging out on Device A does not affect the session on Device B.

## WebSocket Authentication

```mermaid
sequenceDiagram
    actor User as 👤 User
    participant FE as 🖥️ Frontend
    participant WS as 🔌 WebSocket
    participant Server as ⚙️ Server
    participant Redis as 📦 Redis

    User->>FE: Send message
    FE->>WS: Establish connection (with Access Token)
    WS->>Server: Authenticate token
    Server->>Server: Verify token validity
    Server->>Redis: Subscribe to user-specific channel
    Server-->>FE: Connection successful
    Server-->>FE: Push real-time messages
```

| Phase | Description |
|:----:|------|
| 🔗 Connect | WebSocket connection carries the Access Token for authentication |
| ✅ Verify | Server validates token validity; invalid tokens are rejected |
| 📡 Subscribe | After authentication, subscribe to the user-specific channel to receive real-time messages |
| 🔁 Disconnect | Reconnection requires re-authentication to ensure security |

> 💡 **Channel Isolation**: Each user can only receive messages from their own channel and cannot access other users' data.

## Security Constraints

```mermaid
flowchart TD
    subgraph SECURITY["🛡️ Security Defenses"]
        direction TB
        A["🔒 CSRF Protection<br/>OAuth2 state parameter"]
        B["🏷️ Channel Isolation<br/>Users can only receive their own messages"]
        C["💾 Token Storage<br/>Stored in browser locally, not sent to third parties"]
        D["🔑 Refresh Token<br/>Hash only, plaintext returned once"]
    end

    style SECURITY fill:#fce4ec,stroke:#c62828,stroke-width:2px
```

| Constraint | Mechanism | Purpose |
|:----:|:----:|:----:|
| 🛡️ CSRF Protection | Use `state` parameter during OAuth2 authorization | Prevent cross-site request forgery attacks |
| 🏷️ Channel Isolation | Users can only subscribe to their own dedicated channel | Prevent data leaks and unauthorized access |
| 💾 Token Storage | Tokens stored only in browser locally | Not sent to third parties, reducing leak risk |
| 🔑 Refresh Token | Plaintext returned once; server stores hash only | Cannot be used long-term even if storage is compromised |

## Error Handling

| Scenario | User-facing behavior |
|:----:|:-------------:|
| ❌ Authorization failed | Login dialog shows error message; retry is available |
| ⏱️ Token expired and refresh failed | Automatically logged out; login page displayed |
| 🔌 WebSocket authentication failed | Connection disconnected; user prompted to log in again |

## Next Steps

- [Web Component API](/docs/en/integration/component-api/) — Learn how to integrate RTC Agent via the `<rtc-agent>` component
- [Function Registration Guide](/docs/en/integration/function-registration/) — Register custom functions to extend AI capabilities
- [Core Protocol RTC](/docs/en/concepts/rtc/) — Learn about the full lifecycle of Remote Tool Calling
