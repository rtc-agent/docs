---
name: rtc-agent
description: >
  Use when the user's task involves RTC Agent — understanding architecture, integrating
  the web component, developing features, debugging issues, or deploying the server.
  Triggers on rtc-agent questions, Web Component integration, Remote Tool Calling protocol,
  or any rtc-agent documentation lookup.
---

# RTC Agent Documentation Index

You have access to the complete RTC Agent documentation via symlink. All docs are in English and organized by topic. Use this index to navigate the documentation structure.

## Documentation Structure

All documentation files are accessible via the `docs/` symlink pointing to `../../../src/content/docs/en/`.

### Getting Started

| Document | Description |
|----------|-------------|
| [docs/introduction.md](docs/introduction.md) | What is RTC Agent — core capabilities, target users, technical highlights |
| [docs/getting-started.md](docs/getting-started.md) | Quick start — deploy server and embed frontend component in 5 minutes |
| [docs/resume.md](docs/resume.md) | Project resume — tech stack, architecture highlights, use cases |

### Architecture

| Document | Description |
|----------|-------------|
| [docs/architecture/index.md](docs/architecture/index.md) | Architecture overview — three-tier collaboration between browser, server, and LLM |
| [docs/architecture/backend.md](docs/architecture/backend.md) | Backend architecture — Go service layers, WebSocket Gateway, Agent engine, context management, memory system |
| [docs/architecture/frontend.md](docs/architecture/frontend.md) | Frontend architecture — Lit Web Components, 57 sub-components, 23 Controllers, @lit/context state distribution |

### Core Concepts

| Document | Description |
|----------|-------------|
| [docs/concepts/rtc.md](docs/concepts/rtc.md) | Remote Tool Calling — AI reasons on server, tools execute in browser, data never leaves user's device |
| [docs/concepts/script-engine.md](docs/concepts/script-engine.md) | Script Engine — frontend JavaScript/TypeScript sandbox engine extending AI computation capabilities |
| [docs/concepts/virtual-fs.md](docs/concepts/virtual-fs.md) | Virtual File System — IndexedDB-based virtual filesystem, AI operates frontend files directly |
| [docs/concepts/work-modes.md](docs/concepts/work-modes.md) | Work Modes — AI working modes (conversation, autonomous, etc.) and their use cases |

### Features

| Document | Description |
|----------|-------------|
| [docs/features/session.md](docs/features/session.md) | Session management — session tree structure, state, lifecycle |
| [docs/features/messaging.md](docs/features/messaging.md) | Messaging — message types, streaming output, thinking process display, tool call cards |
| [docs/features/commands.md](docs/features/commands.md) | Command System — /command syntax for quick feature triggering |
| [docs/features/context-management.md](docs/features/context-management.md) | Context Management — five-layer compression mechanism ensuring conversations never hit context ceiling |
| [docs/features/memory.md](docs/features/memory.md) | Memory System — OKF unified memory architecture, session-level and user-level memory |
| [docs/features/llm-tools.md](docs/features/llm-tools.md) | LLM Built-in Tools — sub-agent management, user interaction, session hierarchy |
| [docs/features/realtime.md](docs/features/realtime.md) | Real-Time Communication — dual-channel architecture (Topic for reliability, Live for speed) |
| [docs/features/notifications.md](docs/features/notifications.md) | Notification System — sound alerts, Toast notifications, minimized bubble animation |
| [docs/features/settings.md](docs/features/settings.md) | Settings — user settings management, preference configuration |
| [docs/features/skill-system.md](docs/features/skill-system.md) | Skill System — skill registration, capability extension mechanism |

### Integration

| Document | Description |
|----------|-------------|
| [docs/integration/integration-tutorial.md](docs/integration/integration-tutorial.md) | Integration Tutorial — complete guide from CDN quick setup to NPM production integration |
| [docs/integration/component-api.md](docs/integration/component-api.md) | Web Component API — `<rtc-agent>` component API, attributes, events, CSS variables |
| [docs/integration/function-registration.md](docs/integration/function-registration.md) | Function Registration — declarative/imperative function registration, AI auto-learns to call |
| [docs/integration/scenario-authoring.md](docs/integration/scenario-authoring.md) | Scenario Authoring — scenario writing guide, AI behavior configuration |
| [docs/integration/auth.md](docs/integration/auth.md) | Authentication & Authorization — OAuth2 login flow, dual-token mechanism, device management |
| [docs/integration/object-storage.md](docs/integration/object-storage.md) | Object Storage (OSS/S3) — S3 protocol compatible, client file upload/download/management |
| [docs/integration/i18n.md](docs/integration/i18n.md) | Internationalization — i18n integration, runtime language switching |
| [docs/integration/faq.md](docs/integration/faq.md) | FAQ — common issues and solutions (CDN loading, SharedWorker, CORS, etc.) |

### Protocol

| Document | Description |
|----------|-------------|
| [docs/protocol/index.md](docs/protocol/index.md) | Protocol Overview — HTTP API auth, WebSocket RPC business, real-time event sync |
| [docs/protocol/http-api.md](docs/protocol/http-api.md) | HTTP API — OAuth2 endpoints, health checks, interrupt answers, memory export |
| [docs/protocol/rpc.md](docs/protocol/rpc.md) | WebSocket RPC — 17 methods covering session, messaging, Turn control, RTC tool calling |
| [docs/protocol/events.md](docs/protocol/events.md) | Real-Time Events — Topic/Live dual-channel push, Offset guarantees no message loss |

### Deployment

| Document | Description |
|----------|-------------|
| [docs/deployment/cdn.md](docs/deployment/cdn.md) | CDN Integration — CDN distribution, cross-origin configuration, SharedWorker handling |
| [docs/deployment/source-build.md](docs/deployment/source-build.md) | Build from Source — build from source for local development and debugging |
| [docs/deployment/distributed-deploy.md](docs/deployment/distributed-deploy.md) | Docker Distributed Cluster — 2 Servers + Admin-server + Nginx load balancing + full observability |

### Operations

| Document | Description |
|----------|-------------|
| [docs/operations/monitoring.md](docs/operations/monitoring.md) | Monitoring — monitoring system overview, metrics collection, alert configuration |
| [docs/operations/session-logs.md](docs/operations/session-logs.md) | Session Logs — session lifecycle logs, message flow tracking |
| [docs/operations/agent-llm-observability.md](docs/operations/agent-llm-observability.md) | Agent and LLM Observability — LLM call monitoring, token consumption, context compression |
| [docs/operations/script-observability.md](docs/operations/script-observability.md) | Script Observability — script execution monitoring, error tracking |
| [docs/operations/rtc-turn-logs.md](docs/operations/rtc-turn-logs.md) | RTC Turn Logs — Turn execution logs, tool call tracking |
| [docs/operations/realtime-connection-logs.md](docs/operations/realtime-connection-logs.md) | Realtime Connection Logs — WebSocket connection logs, reconnection tracking |
| [docs/operations/recovery-workflow-logs.md](docs/operations/recovery-workflow-logs.md) | Recovery Workflow Logs — recovery workflow logs, fault recovery tracking |
| [docs/operations/cache-analyzer.md](docs/operations/cache-analyzer.md) | LLM Cache Analyzer — cache hit rate analysis, token consumption visualization |
| [docs/operations/common-query-patterns.md](docs/operations/common-query-patterns.md) | Common Query Patterns — common log query patterns, analysis tips |

### Showcase

| Document | Description |
|----------|-------------|
| [docs/showcase/index.mdx](docs/showcase/index.mdx) | Community Showcase — community case studies, integration pattern comparison |
| [docs/showcase/mermaid-live-editor.mdx](docs/showcase/mermaid-live-editor.mdx) | Mermaid Live Editor — official Mermaid online diagram editor, 30-line integration |
| [docs/showcase/peep.mdx](docs/showcase/peep.mdx) | Peep — Chinese metaphysics workbench, npm + embedded maximized mode |
| [docs/showcase/rtc-agent-docs.mdx](docs/showcase/rtc-agent-docs.mdx) | RTC Agent Docs — official docs site, CDN NPM package integration |

### Legal

| Document | Description |
|----------|-------------|
| [docs/legal/privacy-policy.md](docs/legal/privacy-policy.md) | Privacy Policy |
| [docs/legal/terms-of-service.md](docs/legal/terms-of-service.md) | Terms of Service |

## Common Workflows

### 1. Quick Integration

When the user wants to integrate RTC Agent quickly:

1. Read [docs/getting-started.md](docs/getting-started.md) — 5-minute quick start
2. Read [docs/integration/integration-tutorial.md](docs/integration/integration-tutorial.md) — complete integration guide
3. Read [docs/integration/component-api.md](docs/integration/component-api.md) — component API reference

### 2. Understanding RTC Agent Capabilities

When the user wants to understand what RTC Agent can do:

1. Read [docs/introduction.md](docs/introduction.md) — core capabilities overview
2. Read [docs/showcase/index.mdx](docs/showcase/index.mdx) — real-world use cases
3. Read [docs/concepts/rtc.md](docs/concepts/rtc.md) — core protocol explanation

### 3. Deep Dive into Architecture

When the user wants to understand the architecture:

1. Read [docs/architecture/index.md](docs/architecture/index.md) — architecture overview
2. Read [docs/architecture/backend.md](docs/architecture/backend.md) — backend architecture details
3. Read [docs/architecture/frontend.md](docs/architecture/frontend.md) — frontend architecture details

### 4. Custom Function Development

When the user wants to customize functionality:

1. Read [docs/integration/function-registration.md](docs/integration/function-registration.md) — function registration
2. Read [docs/integration/scenario-authoring.md](docs/integration/scenario-authoring.md) — scenario authoring
3. Read [docs/features/skill-system.md](docs/features/skill-system.md) — skill system

### 5. Deployment and Operations

When the user is responsible for deployment and operations:

1. Read [docs/deployment/cdn.md](docs/deployment/cdn.md) — CDN deployment
2. Read [docs/deployment/source-build.md](docs/deployment/source-build.md) — source build
3. Read [docs/deployment/distributed-deploy.md](docs/deployment/distributed-deploy.md) — distributed cluster
4. Read [docs/operations/monitoring.md](docs/operations/monitoring.md) — monitoring system

### 6. Authentication and Authorization

When the user asks about authentication:

1. Read [docs/integration/auth.md](docs/integration/auth.md) — OAuth2 flow, token management
2. Read [docs/protocol/http-api.md](docs/protocol/http-api.md) — OAuth2 endpoints

### 7. Real-Time Communication

When the user asks about real-time features:

1. Read [docs/features/realtime.md](docs/features/realtime.md) — dual-channel architecture
2. Read [docs/protocol/events.md](docs/protocol/events.md) — real-time event push
3. Read [docs/protocol/rpc.md](docs/protocol/rpc.md) — WebSocket RPC

### 8. AI Capabilities

When the user asks about AI features:

1. Read [docs/concepts/rtc.md](docs/concepts/rtc.md) — Remote Tool Calling protocol
2. Read [docs/concepts/script-engine.md](docs/concepts/script-engine.md) — script engine
3. Read [docs/features/llm-tools.md](docs/features/llm-tools.md) — LLM built-in tools
4. Read [docs/features/memory.md](docs/features/memory.md) — memory system
5. Read [docs/features/context-management.md](docs/features/context-management.md) — context management

### 9. Data Storage

When the user asks about data storage:

1. Read [docs/concepts/virtual-fs.md](docs/concepts/virtual-fs.md) — virtual file system
2. Read [docs/integration/object-storage.md](docs/integration/object-storage.md) — object storage

### 10. Observability

When the user asks about monitoring and debugging:

1. Read [docs/operations/agent-llm-observability.md](docs/operations/agent-llm-observability.md) — Agent/LLM monitoring
2. Read [docs/operations/cache-analyzer.md](docs/operations/cache-analyzer.md) — cache analysis
3. Read [docs/operations/session-logs.md](docs/operations/session-logs.md) — session logs

## Key Resources

- **GitHub Repository**: https://github.com/rtc-agent/server
- **Online Documentation**: https://rtc-agent.github.io/docs
- **Live Demos**:
  - Mermaid Live Editor: https://rtc-agent.github.io/mermaid-live-editor
  - Peep: https://pineapplebond.github.io/peep/

## Key Rules

1. **All documentation is in English** — the `docs/` symlink points to the English documentation directory
2. **Use relative paths** — always use `docs/` prefix when referencing documentation files
3. **Read before answering** — when the user asks about RTC Agent, read the relevant documentation first, don't rely on memory
4. **Check showcase examples** — when explaining integration patterns, refer to real-world examples in `docs/showcase/`
5. **Understand the protocol** — for technical questions, read the protocol documentation in `docs/protocol/`
