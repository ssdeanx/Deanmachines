# Mastra Directory Instructions & Conventions

## Purpose

This document provides conventions, best practices, and architectural notes for all files in the `mastra` directory. It covers agent design, runtime context, registry patterns, workflow/network registration, logging, memory/tool usage, and Gemini 2.5 integration. **Follow these guidelines for all new and existing Mastra files.**

---

## 🧩 Agent Architecture

- **All agents must be registered in `agents/index.ts`** using the `agentRegistry` object.
- **Runtime context types** must be defined and exported for each agent (e.g., `MasterAgentRuntimeContext`).
- **Agent logic** should access runtime context via destructuring: `({ runtimeContext })`.
- **Agent names** in the registry and network config must match the `name` property in the agent definition (title case, spaces allowed).
- **Agent categories** are defined in `agentCategories` for organized access.
- **Use `getAgent`, `getAgentsByCategory`, and `hasAgent`** for type-safe agent access.

---

## 🔗 Workflow & Network Registration

- **All workflows** must be registered in `index.ts` under the `workflows` key.
- **Networks** (e.g., `deanMachinesNetwork`, `baseNetwork`) are registered in `index.ts` under the `networks` key.
- **CopilotKit endpoints** for each agent and workflow are registered in `index.ts` using `registerCopilotKit` with the correct runtime context type.
- **Runtime context is set per request** using `setContext` in the CopilotKit registration.
- **Workflow endpoints** (e.g., `/copilotkit/codeGraphMakerWorkflow`) must set a `workflow-type` in context.

---

## 📝 Logging & Observability

- **Use `PinoLogger`** for all agent and framework logging.
- **Dual logging**: PinoLogger for local logs, Upstash logger for distributed logs (see `index.ts`).
- **Langfuse and LangSmith tracing** are enabled for all Gemini model calls and agent actions.
- **Attach metadata and tags** for every agent/model invocation for observability.

---

## 🧠 Memory, Tools & Embeddings

- **Upstash** is the primary backend for agent memory and vector search (see `upstashMemory.ts`).
- **Tools in `tools/` may use different backends or APIs**: Some tools (e.g., `mem0-tool.ts`, `mcp.ts`) use Mem0, MCP, or other external services. Not all tools use Upstash.
- **Check each tool's implementation** to determine which backend or API it uses for memory, storage, or data access.
- **Do not assume all memory/tool operations use Upstash**—refer to the tool's code for details.
- **Embeddings**: Upstash vector search uses Gemini or fastembed embeddings as configured in `upstashMemory.ts`.

---

## 🤖 Gemini 2.5 Integration

- **Gemini 2.5 Flash Lite** is the default model for all core agents and workflows.
- **Provider setup** is in `config/googleProvider.ts`.
- **Use `google()`** for a Mastra-compatible Gemini provider.
- **Embeddings**: Use `google.textEmbeddingModel('gemini-embedding-exp-03-07')` or `fastembed` as configured in `upstashMemory.ts`.
- **Model version and provider** can be set dynamically via runtime context (see CopilotKit registration in `index.ts`).

---

## 🛠️ General Conventions

- **All new agents, tools, and workflows** must follow the runtime context and registration patterns in `index.ts` and `agents/index.ts`.
- **When developing new tools**, always specify which backend or API is used for memory/storage, and document this in the tool's code.
- **For memory or vector operations**, prefer Upstash unless a tool requires a different backend.
- **Review each tool's implementation** before making architectural or integration decisions.
