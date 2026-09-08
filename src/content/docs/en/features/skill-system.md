---
title: Skill System
description: Extend AI capabilities by registering custom functions — the host defines functions, the AI auto-discover and calls them, and documentation is auto-generated.
---

The **Skill System** allows the host application to expose business capabilities to the AI. You simply register functions, and the AI can call them via scripts — no extra adaptation needed, and documentation is auto-generated.

## Two Registration Approaches

```mermaid
flowchart TD
    subgraph DECL["Declarative Registration ✅ Recommended"]
        direction TB
        D1["Set agentConfig property"] --> D2["Auto-create Registry"]
        D2 --> D3["Auto-register functions"]
    end

    subgraph IMPL["Imperative Registration 🔧 Advanced"]
        direction TB
        I1["Call defineRegistry"] --> I2["Manually register functions"]
        I2 --> I3["Flexible control over registration timing"]
    end

    style DECL fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style IMPL fill:#fff3e0,stroke:#f57c00,stroke-width:2px
```

| | Declarative (Recommended) | Imperative (Advanced) |
|---|:----------:|:----------:|
| **Registration Method** | Set `agentConfig` property | Call `defineRegistry` |
| **Ease of Use** | Zero config, works out of the box | Requires manual management |
| **Use Case** | Most scenarios | Dynamic or conditional registration needed |

**Declarative registration example**:

```ts
agent.agentConfig = {
  name: 'MyApp',
  persona: 'You are a ... assistant',
  groups: [{
    name: 'editor',
    description: 'Editor operations',
    functions: [
      {
        name: 'getCode',
        description: 'Get the current code in the editor',
        handler: () => editor.getCode()
      }
    ]
  }]
};
```

> 💡 After setting `agentConfig`, the system automatically creates the Registry and completes function registration — the entire process requires no manual intervention.

## Function Definition

Each function consists of the following fields:

| Field | Type | Description |
|:-----:|------|-------------|
| `name` | string | Function name |
| `description` | string | Function description, included in auto-generated documentation |
| `parameters` | object | Parameter definition (**OpenAPI Schema** format) |
| `returns` | object | Return value definition |
| `handler` | function | Execution function (supports async) |
| `hooks` | object | UI hooks (see [Hook System](#hook-system)) |

`parameters` uses OpenAPI Schema format to describe parameters, enabling the AI to generate correct call code:

```ts
{
  name: 'createOrder',
  description: 'Create a new order',
  parameters: {
    type: 'object',
    properties: {
      productId: { type: 'string', description: 'Product ID' },
      quantity:  { type: 'number', description: 'Quantity' }
    },
    required: ['productId']
  },
  handler: async ({ productId, quantity }) => {
    return await api.createOrder(productId, quantity ?? 1);
  }
}
```

## Function Groups

Functions are organized through **groups**; group name + function name = full invocation path:

```mermaid
flowchart LR
    subgraph ORDER["Group: order"]
        O1["create"]
        O2["delete"]
        O3["update"]
    end

    subgraph USER["Group: user"]
        U1["login"]
        U2["logout"]
        U3["getInfo"]
    end

    O1 --> P1["order.create"]
    O2 --> P2["order.delete"]
    O3 --> P3["order.update"]
    U1 --> P4["user.login"]
    U2 --> P5["user.logout"]
    U3 --> P6["user.getInfo"]

    style ORDER fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style USER fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

Groups keep function namespaces clear and organized, avoiding naming conflicts.

## AI Invocation Method

The AI executes code in a sandbox via the `script` tool, using **Proxy chain syntax** to call functions:

```mermaid
flowchart LR
    A["🧠 AI Reasoning"] --> B["📝 Generate script code"]
    B --> C["⚡ script tool execution"]
    C --> D["🔒 Call rtcAgent in sandbox"]
    D --> E["rtcAgent.order.create(params)"]
    E --> F["🔧 Execute handler"]

    style A fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style C fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style F fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

```ts
// Proxy chain invocation — natural API style
await rtcAgent.order.create({ productId: '123', quantity: 2 });

// Equivalent direct call
await rtcAgent.execute('order.create', { productId: '123', quantity: 2 });
```

> 💡 After reading the auto-generated function documentation, the AI knows how to call these functions — no extra configuration needed.

## Hook System

Hooks allow the host to inject custom logic at various stages of function execution:

```mermaid
flowchart TD
    A["Call function"] --> B{"onStart"}
    B -->|"Throw CancelledError"| C["❌ Cancel execution"]
    B -->|"Pass"| D["Execute handler"]
    D --> E{"Execution result"}
    E -->|"Success ✅"| F["onSuccess"]
    E -->|"Failure ❌"| G["onError"]
    D -->|"Progress update"| H["onProgress(n)"]

    style B fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style F fill:#a5d6a7,stroke:#2e7d32,stroke-width:2px
    style G fill:#ffcdd2,stroke:#c62828,stroke-width:2px
    style C fill:#ffcdd2,stroke:#c62828,stroke-width:2px
```

| Hook | Trigger | Description |
|:----:|:-------:|-------------|
| `onStart` | Before execution | Can throw `CancelledError` to **cancel execution** |
| `onSuccess` | After success | Runs asynchronously, does not block return |
| `onError` | After failure | Runs asynchronously, does not block return |
| `onProgress` | Progress update | Triggered when handler calls `onProgress(n)` |

`onStart` is the only hook that can intercept execution — ideal for confirmation dialogs, permission checks, etc.

## Auto-generated Documentation

Each time a function is registered, the system generates comprehensive documentation:

```mermaid
flowchart TD
    A["📦 Register function"] --> B["📄 Generate function docs"]
    B --> C["/functions/group/func.md"]
    B --> D["📋 Update INDEX.md"]
    B --> E["📋 Update AGENT.md"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style C fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
    style D fill:#fff9c4,stroke:#f9a825,stroke-width:2px
    style E fill:#fff9c4,stroke:#f9a825,stroke-width:2px
```

| Generated Content | Description |
|-------------------|-------------|
| **Function Docs** | Includes description, parameter table, return values, and call examples |
| **INDEX.md** | Function index; the AI uses this to discover available functions |
| **AGENT.md** | Updates the Agent capability description |

> 📌 The AI learns how to use functions by reading this documentation — documentation quality directly affects the AI's calling accuracy.

## Scenarios

Scenarios load business workflow documentation, telling the AI how to handle specific business processes:

```mermaid
flowchart TD
    A["🌐 Set scenarios-url"] --> B["Fetch manifest.json"]
    B --> C["Download .md scenario files"]
    C --> D["Write to /scenarios/"]
    D --> E["📋 Update INDEX.md"]
    D --> F["📋 Update AGENT.md"]

    style A fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style D fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

| Feature | Description |
|---------|-------------|
| **Scenario Docs** | Business workflow descriptions in Markdown format |
| **Loading Method** | Specified via the `<rtc-agent scenarios-url="...">` attribute |
| **Storage Location** | `/scenarios/{slug}.md` |
| **AI Usage** | AI reads scenario docs to understand business processes and operational guidelines |

For example, you can write scenario docs like "How to handle refunds" or "How to create an order", and the AI will execute operations according to your business specifications.

## Next Steps

- [RTC Protocol](/docs/en/concepts/rtc/) — Learn about the core mechanism for AI calling frontend tools
- [Virtual File System](/docs/en/concepts/virtual-fs/) — Learn where function docs and scenario docs are stored
- [Command System](/docs/en/features/commands/) — Learn about user-facing command interaction capabilities
