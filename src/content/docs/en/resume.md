---
title: Ma Shouyue — Full-Stack AI Engineer
description: Freelance · AI Agent Infrastructure Design & Implementation · Full-Stack Development
---

> **7 years of backend experience, from IM systems with 200k concurrent users to 100% AI-written Agent platforms. A full-stack engineer who has experienced product failure and independently completed full systems.**

**Tags:** `Ma Shouyue` `27 years old` `Full-Stack Engineer` `AI Agent` `Freelance` `Remote Available`

---

## My Story

### Timeline

| Year | Event | Key Growth |
|------|-------|------------|
| 2019 | Graduated, developed smart parking system at a Beijing company | Hardware integration, backend CRUD, business understanding |
| 2020 | Changed jobs to a Beijing internet company, developed e-commerce system | K8S, Golang, microservices governance, observability, gray release |
| 2023 | Became an early OpenAI ChatGPT user, using GitHub Copilot | Pioneer practitioner of AI-assisted programming |
| 2023 | Released open-source project zero-im (IM system based on Go Zero framework) | Accumulated open-source community influence |
| 2024 | Company closed, gained clients through open-source project, started freelancing | From employee to independent developer |
| 2024 | Developed Telegram private server based on teamgram-server, supporting ~200k concurrent users | Large-scale distributed system practice, deep IM architecture understanding |
| 2025 | Failed at stock and crypto trading, lost all savings, but deeply practiced Vibe Coding | Product mindset awakening: technology is not the key, product is |
| 2026 | Returned to open-source, released RTC-Agent (100% written by Claude Code) | First product-mindset-driven Vibe Coding work |

### From CRUD to AI Agent: A Programmer's Awakening

In 2019, I graduated and went to Beijing. My first job was developing a smart parking system. The project needed hardware integration, but most of the work was still CRUD. Back then, I thought backend programmers were just translating business logic into code.

In 2020, I changed jobs to an internet company developing e-commerce systems. That's where I was guided to learn K8S, Golang, and open-source components I'd never used before: message queues, microservices governance, observability, monitoring alerts, gray release. But in reality, for backend programmers, it's still mostly CRUD, understanding the business.

**2023 was the watershed moment of my career.**

That year, I became an early user of OpenAI ChatGPT. The first hottest OpenAI application was GitHub Copilot, and I was already using it. I remember it still required manually pressing the Tab key, but that shock of "AI helping you write code" made me realize: **programming is about to change.**

Also that year, the Go Zero framework started becoming popular. I built an open-source IM system based on it: **zero-im**. My colleague wrote the frontend + SDK, I handled the backend. This project gave me my first taste of open-source success — not because the technology was amazing, but because people were actually using it.

**In 2024, life played a joke on me.**

The company closed. But fortunately, my open-source project became popular. People asked me to customize IM systems, and I naturally became a freelancer.

That year, I built another brand-new IM — a Telegram private server, compatible with Telegram clients (Telegram clients are open-source). Someone had open-sourced teamgram-server in Golang, and I modified it to support most Telegram features. I also learned how Telegram does IM: **it's the update mechanism.**

I helped clients maintain this system, supporting up to **~200k concurrent users online**. A Go Zero microservices cluster, deployed on K8S.

That was my highlight moment: open-source project + commercial customization + large-scale system practice. I felt I had found my direction.

**Then, in 2025, I collapsed.**

I started trading stocks and crypto, using Vibe Coding to build trading systems along the way. The result was predictable — all failed, and I lost all my savings.

But that period gave me an important insight:

> **The key to Vibe Coding is not technology, but product.**
> 
> If you haven't figured out the product requirements yourself, haven't thought through "who is this for? why would they use it?" then the product can't be built.
> 
> I always start a Vibe Coding project thinking about the technology — no messy code, write code like Lei Jun writing poetry. This is the typical engineer's disease. **A product can't be perfect from the start. When you find yourself stuck halfway and can't proceed, you get lost. That's how I used to be.**

**Today, I'm returning to the old path, continuing to open-source products.**

**RTC-Agent** is my first product after this awakening. It's a pure Vibe Coding product: **0% human-written, 100% Claude Code-written**. All MVP features are now implemented.

This time, I'm no longer纠结 about whether the code is elegant or the architecture perfect. What I think about is: **what problem does this product solve? who will use it? why use it?**

If you're also looking for a full-stack engineer who can **independently deliver AI Agent systems**, feel free to contact me.

---

## Core Capabilities

### Protocol & System Design

Three-layer protocol architecture: authentication layer (OAuth2/HTTP) → operation layer (WebSocket RPC, 16 methods) → event layer (dual-channel Pub/Sub).

Distributed deployment solution: Nginx load balancing + stateful/stateless service separation.

### AI Agent Engine

Built on Anthropic SDK + Eino, supporting Claude and OpenAI-compatible models.

Remote tool calling state machine + Redis Checkpoint crash recovery + infinite retry + exponential backoff, guaranteeing 100% tool delivery.

### Frontend Engineering

Lit Web Components: 16+ sub-components, 9+ Controllers, `@lit/context` state distribution.

IndexedDB virtual file system + Babel AST script sandbox, dual-layer security isolation.

### Security & Observability

OAuth2 dual Token mechanism, AST-level API blocking in script sandbox.

OpenTelemetry + Jaeger + Prometheus + Grafana + Loki full-chain tracing.

---

## Tech Stack

### Backend & AI

| Domain | Technology |
|--------|------------|
| Language | Go 1.27 |
| ORM | GORM |
| Vector Search | pgvector |
| AI Framework | Anthropic SDK, Eino |
| Script Sandbox | Babel AST transformation |

### Frontend

| Domain | Technology |
|--------|------------|
| Component Library | Lit Web Components |
| Language | TypeScript |
| State Management | `@lit/context` |
| Frontend Storage | IndexedDB (Dexie.js) |
| Documentation Site | Astro 7, Starlight |

### Infrastructure

| Domain | Technology |
|--------|------------|
| Database | PostgreSQL 17+ |
| Cache | Redis 7+ |
| Real-time Communication | Centrifuge WebSocket |
| Authentication | OAuth2 authorization code flow |
| Observability | OpenTelemetry, Jaeger, Prometheus, Grafana, Loki |
| Deployment | Docker Compose, Nginx |

---

## Featured Project: RTC Agent

> **One sentence**: Open-source Web AI assistant backend, through a standardized Remote Tool Calling protocol, lets websites integrate transparent, efficient, low-cost AI assistants with a few lines of code.

### Core Innovation

AI infers on the server, but **tools execute in the user's browser**. Data never leaves the user's device.

| Metric | Value | Description |
|--------|-------|-------------|
| Integration Cost | **3 lines of code** | Quick integration |
| Token Savings | **70%+** | Compared to screenshot+OCR solutions |
| Error Rate Reduction | **50%+** | Compared to server-side DOM scraping |
| Privacy Protection | **100%** | Data stays in the browser |

### Technical Highlights

#### 1. Remote Tool Calling Protocol

- 6 built-in tools: `ls` / `read` / `write` / `grep` / `find` / `script`
- Complete state machine: Pending → Sent → Executing → Completed/Failed/Timeout/Rejected
- Redis Checkpoint crash recovery, infinite retry + exponential backoff
- 100% tool delivery guarantee

#### 2. Virtual File System

- IndexedDB implementation, Dexie.js wrapper
- Directory structure: `/functions/` `/scenarios/` `/scripts/` `/AGENT.md`
- Path traversal protection, large file paginated reading
- Automatic file type inference

#### 3. Script Execution Engine

- Babel AST transformation + runtime permission confirmation, dual-layer security isolation
- Static API blocking: Storage / Network / DOM / eval all intercepted
- Pure computation standard library injection, built-in system tools (delay / uuid / now / random / time)
- Three modes: save / run / eval

#### 4. Dual-Channel Real-time Communication

- **Topic Channel**: Persisted events + Offset tracking + offline recovery
- **Live Channel**: Redis Pub/Sub low-latency streaming output
- Epoch mechanism clears history, ensuring no message loss

#### 5. Memory System

- **Session Memory**: 5 categories, up to 20 items, ~12K tokens
- **User Memory**: 4 categories, up to 1000 items, cross-session persistence
- Hybrid retrieval: vector cosine similarity + keyword full-text search, RRF fusion + importance weighting

#### 6. Context Management

- Three-layer compression: Microcompact → Auto Compact → Session Memory Compact
- Configuration: 25K Token limit, 12K trigger threshold
- Auto Compact generates 9-part structured summary by LLM

#### 7. Skill System

- Declarative (`agentConfig`) + imperative (`defineRegistry`) dual registration methods
- Function grouping, namespace paths
- Automatic documentation generation, Hook system (onStart / onSuccess / onError / onProgress)
- Scenario documentation: Markdown business workflow guides

### Community Showcase: Mermaid Live Editor

Integrated rtc-agent into [Mermaid's official online editor](https://mermaid.live), **less than 30 lines of glue code**, zero modification to upstream source:

- 🗣️ Generate Mermaid code from natural language descriptions
- ✍️ Automatically write to editor and trigger real-time preview
- ✅ Proactively call syntax validation, self-repair on errors
- 🎨 No need for users to write a single line of code

### Complete Documentation

26 pages, bilingual Chinese-English, covering:

- Architecture overview, frontend, backend
- Core concepts: RTC, virtual file system, script engine, work modes
- Features: Session, messaging, Skill, commands, memory, context, real-time communication
- Integration guides: authentication, component API, function registration, scenario authoring
- Protocol reference: HTTP API, WebSocket RPC, events
- Deployment guides: source build, distributed deployment

---

## What I Can Do for You

### 💬 IM System Development

This is my most experienced domain. From zero-im to Telegram private servers, I've built complete IM systems:

- Go Zero-based microservices architecture, supporting 200k concurrent online users
- Telegram protocol compatibility (update mechanism, message sync, group management)
- K8S deployment and operations, production-grade stability

### 🤖 AI Agent Systems

RTC-Agent is an AI Agent platform I built from scratch:

- Self-developed Remote Tool Calling protocol, letting AI execute operations in the browser
- Agent engine + memory system + context management + script sandbox
- Anthropic SDK / Eino integration, supporting Claude and OpenAI-compatible models
- Complete frontend component library (Lit Web Components) + backend services + documentation site

### 🔧 Go Microservices + Infrastructure

Years of backend practical experience:

- Go + GORM + PostgreSQL + Redis tech stack
- WebSocket real-time communication (Centrifuge)
- OAuth2 authentication, microservices governance, observability (OpenTelemetry + Prometheus + Grafana)
- Docker / K8S deployment

### 🌐 Full-Stack Development

- TypeScript frontend + Lit Web Components component library
- IndexedDB local storage, Babel AST script sandbox
- Astro documentation sites, bilingual Chinese-English technical documentation

---

## Why Choose Me

1. **Independent Delivery Capability**: RTC Agent from protocol design to UI components, from Agent engine to documentation site, all independently completed
2. **Deep Tech Stack**: Not just API calling, but understanding underlying mechanisms (state machines, Checkpoint, AST transformation, dual-channel communication)
3. **Product Mindset**: Focused on user experience and developer experience, not just task completion
4. **Privacy First**: Privacy as a design constraint, not an add-on feature
5. **Complete Documentation**: Delivering not just code, but complete documentation, examples, and integration guides

---

## Contact

- 📧 **Email**: [meishouyue@gmail.com]
- 🔗 **GitHub**: [@PineappleBond](https://github.com/PineappleBond)
- 🌐 **Website**: [RTC-Agent](https://rtc-agent.github.io/docs/)
- 💬 **Phone**: [+86 15666355528]

---

If you're looking for a full-stack engineer who can **independently deliver complete systems** — from protocol design to frontend components, from Agent engine to K8S deployment — feel free to contact me.
