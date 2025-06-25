---
mode: 'agent'
description: 'AG-UI Protocol guidelines for the Dean Machines RSC project'
---
# AG-UI Protocol Guidelines for the Dean Machines RSC Project
## 1. Overview
This document provides guidelines for using AG-UI in the Dean Machines RSC project, including setup, usage, and best practices.
- AG-UI is a protocol for building agentic user interfaces, designed to enhance user interaction with AI agents.
- It provides a set of components and utilities for creating responsive, accessible, and customizable UIs.
- Mastra AI is the underlying framework for building agentic UIs, enabling seamless integration with AI agents and workflows.
- Using `@mastra/agui` mastra is the recommended way to use AG-UI in your project.
- Copilotkit, AG-UI & Mastra allows us to have a full tech stack for building agentic UIs with AI agents.
- CopilotKIT ❯ AG-UI ❯ Mastra [Also they are all built on top of the same core concepts and share a common architecture.]


- This is links to my current CopilotKit implementation:
`C:\\Users\\dm\\Documents\\deanmachines-rsc\\src\\app\\api\\copilotkit\\route.ts`
`C:\\Users\\dm\\Documents\\deanmachines-rsc\\src\\mastra\\index.ts`

- This is where we will build this in so we stay consistent.
`C:\\Users\\dm\\Documents\\deanmachines-rsc\\src\\app\\(playground)`

## 1.1 Key Features
- **Agentic UIs**: AG-UI allows you to create user interfaces that can interact with AI agents, providing a more dynamic and responsive user experience.
-

## 2. URLs
- https://mastra.ai/en/docs/frameworks/agentic-uis/copilotkit
- [AG-UI Documentation](https://docs.ag-ui.com/introduction)
- [AG-UI GitHub Repository](https://github.com/ag-ui-protocol/ag-ui)
- [AG-UI Mastra Documentation](https://mastra.ai/en/docs/frameworks/agentic-uis/copilotkit)
- [AG-UI Architecture](https://docs.ag-ui.com/concepts/architecture)
- [AG-UI Events](https://docs.ag-ui.com/concepts/events)
- [AG-UI Agents](https://docs.ag-ui.com/concepts/agents)
- [AG-UI Messages](https://docs.ag-ui.com/concepts/messages)
- [AG-UI State](https://docs.ag-ui.com/concepts/state)
- [AG-UI Tools](https://docs.ag-ui.com/concepts/tools)
- [AG-UI Integrations](https://docs.ag-ui.com/integrations)

- [AG-UI SDK JS Core](https://docs.ag-ui.com/sdk/js/core/overview)
- [AG-UI SDK JS Core Types](https://docs.ag-ui.com/sdk/js/core/types)
- [AG-UI SDK JS Core Events](https://docs.ag-ui.com/sdk/js/core/events)
- [AG-UI SDK JS Client](https://docs.ag-ui.com/sdk/js/client/overview)

## 3. Integration with mastra & app

- AG-UI is a protocol that allows us to build agentic UIs with AI agents & manipulate UI elements while in chat.
- Right now we only have the weatherAgent, but we should use all our agents.

```ts
// ./src/masta/index.ts
import { registerCopilotKit } from "@mastra/agui";
import { Mastra } from "@mastra/core/mastra";
server: {
            cors: {
                origin: "*",
                allowMethods: ["*"],
                allowHeaders: ["*"],
            }
        },
        apiRoutes: [
            registerCopilotKit<WeatherRuntimeContext>({
                path: "/copilotkit",
                resourceId: "weatherAgent",
                setContext: (c, runtimeContext) => {
          // TypeScript will enforce the correct types here
          runtimeContext.set("user-id", c.req.header("X-User-ID") || "anonymous");
          runtimeContext.set("temperature-scale", "celsius"); // Only "celsius" | "fahrenheit" allowed
        }
            })
        ]
    })
});
```



