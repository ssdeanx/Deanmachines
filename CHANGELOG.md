<!-- markdownlint-disable MD024 MD031 -->
# Changelog

All notable changes to the DeanMachines Mastra Backend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v0.2.1] - 2025-04-24

### Changed

- **KnowledgeWorkMoENetwork** (`src/mastra/workflows/Networks/knowledgeWorkMoE.network.ts`): imported `applySharedHooks`, `instrumentNetwork`, `scheduleMemoryCompaction`; after `super(config)`, applied hooks for error logging, instrumented core methods, and scheduled memory compaction.
- **ProductLaunchNetwork** (`src/mastra/workflows/Networks/productLaunchNetwork.ts`): applied the same helpers (with `createResponseHook` for validation) immediately after instantiation for unified resilience and observability.

### Added

- Integrated core helper functions into network modules to ensure consistent error handling, instrumentation, and automatic memory management.

### networkHelpers.ts Details

- `applySharedHooks(network, hooks)`: attaches `onError` & `onGenerateResponse` for centralized error logging and custom response handling.
- `instrumentNetwork(net, config?)`: wraps `execute`, `stream`, `generate` with `executeWithThread`, `streamWithThread`, and `generateWithMemory` to integrate thread and memory context.
- `scheduleMemoryCompaction(network, idleMs = 864e5, iv = 864e5)`: schedules periodic summarization and compaction of thread memory entries older than `idleMs`, preserving concise summaries.

### Tool Helpers Pattern

Mirror this network pattern by creating `toolHelpers.ts`:

- `applySharedToolHooks(tool, hooks)`: attach `onError`, `onBeforeInvoke`, and `onAfterInvoke` hooks on tool instances.
- `instrumentTool(tool, config?)`: wrap primary methods (`execute`, `run`, etc.) with threading and memory context.
- `scheduleToolCacheCleanup(tool, idleMs, iv)`: schedule periodic cleanup of tool-related cache or logs.

#### Implementation Steps

1. Import core utilities: `logger`, `threadManager`, `sharedMemory`.
2. Define and export helper functions in `toolHelpers.ts`.
3. Apply these helpers to tool instances for consistent error handling, instrumentation, and maintenance.
4. Document the pattern with JSDoc and code examples.

#### Usage Example

```ts
import { applySharedToolHooks, instrumentTool, scheduleToolCacheCleanup } from './toolHelpers';
const myTool = new MyTool(config);
applySharedToolHooks(myTool, {
  onError: err => logger.error(err),
  onAfterInvoke: res => res,
});
instrumentTool(myTool);
scheduleToolCacheCleanup(myTool, 3600000, 3600000);
```

---

## [v0.2.0] - 2025-04-24

### Added

- **Advanced Test Workflow**: Introduced `advancedTestWorkflow` in `src/mastra/workflows/advancedTestWorkflow.ts` for orchestrating multi-agent (research, analysis, documentation, master) evaluation in sequence.
- **Dynamic Preprocessing**: Integrated `workflowFactory` to preprocess topics dynamically before research, ensuring flexible, modular workflow composition.
- **Barrel Export**: Exported `advancedTestWorkflow` from the workflow barrel (`src/mastra/workflows/index.ts`).
- **Branch-Thinking Integration**: Used branch-thinking to plan and extract improvements and tasks for workflow design.
- **Memory Integration**: Added `getThreadMemory` and `saveThreadMemory` methods to `thread-manager.ts`.
- **Memory Schemas**: Added `memoryRequestSchema` and `memoryResponseSchema` to `workflowSchemas.ts`.
- **Trigger Schema Extensions**: Extended `dynamicInputSchema`, `mainTriggerSchema`, `branchingTriggerSchema`, and `retrySchema` to include `threadId`.
- **Memory Steps**: Created `memoryStep` and `saveMemoryStep` in `workflowFactory.ts` to auto-load and auto-save memory.
- **Workflow Helper Update**: Updated `buildWorkflow` in `workflowHelpers.ts` to prepend `memoryStep` and append `saveMemoryStep`.
- **Type Augmentation**: Augmented Mastra `Memory` type in `types.ts` with `getMemory` and `saveMemory` methods.
- **Shared Memory Usage**: Switched from `redisMemory` to `sharedMemory` in `thread-manager.ts`.

### Changed

- **Improved Error Handling**: Added explicit status/type checks when accessing dynamic workflow step results to prevent runtime errors.

### Analysis & Planning

- Outlined future enhancements via branch-thinking:
  - Persisting intermediate outputs to memory for resumable workflows.
  - Refactoring phases into nested sub-workflows for parallel execution.
  - Adding conditional branching, suspend/resume, and retry/fallback logic.

---

## [0.1.9] - 2025-04-24

### Added

- Added GenAI semantic attribute keys to `OTelAttributeNames` (types.ts): `gen_ai.system`, `gen_ai.operation.name`, `gen_ai.request.model`, `gen_ai.response.token_count`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`, `gen_ai.usage.latency_ms`.
- Defined `LangfuseTraceOptions`, `LangfuseSpanOptions`, `LangfuseGenerationOptions`, and `LangfuseScoreOptions` in `services/types.ts` for strong typing of Langfuse calls.
- Enhanced LangSmith integration (`services/langsmith.ts`): instrumented `createLangSmithRun` and `trackFeedback` with CLIENT spans and GenAI semantic conventions.
- Improved SigNoz support (`scrvices/signoz.ts`): normalized `exporters` array handling, multi-provider OTLP endpoints, `metricsInterval` support, and added GenAI attributes to HTTP spans and metrics.
- Upgraded Langfuse service (`services/langfuse.ts`): instrumented `createTrace`, `createSpan`, and `logGeneration` with GenAI conventions; removed unsupported fields and cast payloads to `any` to align with client API.

### Fixed

- Resolved TS lint errors for unknown properties by refining interfaces and using `as any` casts (lint IDs: b98de250, 7111c958, 03114a7d, cf04971b, a83df559, 8c2017d5).  

## [0.1.8] - 2025-04-22 20:15 -0400

### Added

- **MCP Tool Server Configuration & Environment**
  - mcptool.ts: removed hard‑coded keys; now reads `SMITHERY_API_KEY` from `process.env`, validates its presence, and injects it into every MCP server definition.
  - tools/index.ts: added `SMITHERY_API_KEY` to the Zod `envSchema` for environment validation.

- **MCP Tool Schema Patching & Execution Wrapping**
  - mcptool.ts: merged default servers with any user‑provided `config.servers`.
  - Fetched raw tools via `mcp.getTools()`, validated `inputSchema` (must be `z.ZodType`), and patched missing/invalid `outputSchema` to `z.unknown()`.
  - Wrapped each tool’s `execute()` to log inputs (`logger.info`) and errors (`logger.error`), then re‑throw.
  - Logged the total number of MCP tools added:

    ```bash
    INFO (mcp-tools): [MCP] Added 114 MCP tools.
    ```

- **Extra MCP Server Definitions**
  - Added default server entries in mcptool.ts for:
    - mcp‑pandoc (Smithery CLI)
    - claudedesktopcommander
    - mcp‑painter
    - clear‑thought
    - mermaid‑mcp‑server
    - deepview‑mcp
    - n8n‑workflow‑builder

- **Extra MCP Tools Registered**
  - mcp‑pandoc_convert‑contents  
  - mcp‑painter_drawing_generateCanvas  
  - mcp‑painter_drawing_fillRectangle  
  - mcp‑painter_drawing_getCanvasPng  
  - mcp‑painter_drawing_getCanvasData  
  - claudedesktopcommander_execute_command  
  - claudedesktopcommander_read_output  
  - claudedesktopcommander_force_terminate  
  - claudedesktopcommander_list_sessions  
  - claudedesktopcommander_list_processes  
  - claudedesktopcommander_kill_process  
  - claudedesktopcommander_block_command  
  - claudedesktopcommander_unblock_command  
  - claudedesktopcommander_list_blocked_commands  
  - claudedesktopcommander_read_file  
  - claudedesktopcommander_read_multiple_files  
  - claudedesktopcommander_write_file  
  - claudedesktopcommander_create_directory  
  - claudedesktopcommander_list_directory  
  - claudedesktopcommander_move_file  
  - claudedesktopcommander_search_files  
  - claudedesktopcommander_get_file_info  
  - claudedesktopcommander_list_allowed_directories  
  - claudedesktopcommander_edit_block  
  - clear‑thought_sequentialthinking  
  - clear‑thought_mentalmodel  
  - clear‑thought_debuggingapproach  
  - n8n‑workflow‑builder_create_workflow  
  - deepview‑mcp_deepview  
  - mermaid‑mcp‑server_generate

### Changed

- Switched `config.types.ts` imports to real (non‑type‑only) so `VoiceProvider` enum is available at runtime.
- Unified `VoiceConfig`/`VoiceProvider` definitions between `src/mastra/agents/config/config.types.ts` and `src/mastra/voice/index.ts`.

### Fixed

- Aligned `BaseAgentConfig.voiceConfig` type with the `VoiceConfig` interface expected by `createVoice()`.
- Resolved TS error `'VoiceProvider' cannot be used as a value because it was imported using 'import type'`.
- Reinforced correct merge of default and custom MCP server definitions in `createMastraMcpTools`.

---

## [v0.1.7] - 2025-04-22

### Added

- **Voice Integration**
  - config.types.ts: import `VoiceConfig` & `VoiceProvider` from `src/mastra/voice/index.ts`, re‑export `VoiceProvider`, extend `BaseAgentConfig` with optional `voiceConfig`.
  - base.agent.ts: detect `config.voiceConfig`, invoke `createVoice(cfg)`, inject `MastraVoice` into the `Agent` constructor, and log voice setup.
  - master.config.ts: include a `voiceConfig` block with `provider: VoiceProvider.GOOGLE`, `apiKey`, `speaker`, and `options`.
- **Docker Tools**
  - Implemented and registered all `docker_*` tools:
    - docker_get_current_time
    - docker_convert_time
    - docker_add_observations
    - docker_delete_entities
    - docker_delete_observations
    - docker_delete_relations
    - docker_read_graph
    - docker_search_nodes
    - docker_open_nodes
    - docker_create_relations
    - docker_create_entities
    - docker_start-chrome
    - docker_curl
    - docker_curl-manual
    - docker_interact-with-chrome

### Fixed

- Changed `config.types.ts` import from `import type { VoiceProvider }` to `import { VoiceProvider }` so the enum is available at runtime.
- Aligned `BaseAgentConfig.voiceConfig` type with the `VoiceConfig` interface expected by `createVoice()`.

---

## [v0.1.6] - 2025-04-22

### Added

- **New Tools**
  - Added `moveTool` for moving files or directories with optional overwrite functionality.
- **Schema Refactoring**
  - Moved `FileEncoding` and `FileWriteMode` enums from `readwrite.ts` to `readwriteschema.ts` to resolve circular dependency issues during module initialization.
  - Updated all schemas in `readwriteschema.ts` to use the locally defined enums.
  - Updated `readwrite.ts` to import enums and all necessary schemas directly from `readwriteschema.ts`.
  - Added missing schemas (`ListFilesWithWalkInputSchema`, `ListFilesWithWalkOutputSchema`, `MkdirInputSchema`, `MkdirOutputSchema`, `CopyToolInputSchema`, `CopyToolOutputSchema`, `MoveToolInputSchema`, `MoveToolOutputSchema`) to `readwriteschema.ts`.

### Fixed

- **Circular Dependencies**
  - Resolved runtime error `TypeError: Cannot read properties of undefined (reading 'OVERWRITE')` by relocating enums to the schema definition file (`readwriteschema.ts`), ensuring they are defined before being used in Zod schemas.
- **Tool Execution Context & Typing**
  - Corrected type annotations for `mkdirTool`, `copyTool`, and `moveTool` to use `z.infer` and the appropriate `ToolExecutionContext` structure, resolving implicit `any` types and circular reference errors in type annotations.
  - Standardized `ToolExecutionContext` usage across all tools in `readwrite.ts`.
- **`walk` Function Integration**
  - Ensured the `walk` utility function is correctly utilized by the `listFilesWithWalkTool`, resolving the "declared but its value is never read" lint warning and making the tool functional.

### Known Issues

- **`createFileTool` and `writeToFileTool` Failure**
  - The `createFileTool` and `writeToFileTool` (which is used internally by `writeKnowledgeFileTool`) are currently non-functional.
  - Executing these tools results in a runtime `TypeError: fs.writeFile is not a function`.
  - This indicates a potential issue with how `fs-extra` functions (specifically `writeFile`) are being imported, bundled, or accessed in the final JavaScript output (`index.mjs`). It might be related to module resolution, bundling configuration, or an incorrect import/usage pattern within the `execute` functions of these tools.
  - **Affected Tools:** `create-file`, `write-file`, `write-knowledge-file`.
  - **Status:** Needs investigation and correction. The underlying `fs-extra` library is correctly installed, but its `writeFile` function is not accessible at runtime within these specific tool executions.

### Notes

- The majority of file system tools (`read-file`, `edit-file`, `delete-file`, `list-files`, `list-files-with-walk`, `mkdir`, `copy`, `move`) are now functional after resolving schema, typing, and circular dependency issues.
- The primary remaining blocker for full file system functionality is the `fs.writeFile is not a function` error affecting file creation and writing operations.

---

## [v0.1.5] - 2025-04-22

### Added

- **New Tools**
  - Added `mkdirTool` for creating directories with support for parent directory creation.
  - Added `copyTool` for copying files or directories with optional overwrite functionality.

### Fixed

- **Tool Execution Context**
  - Resolved type annotation issues in `mkdirTool` and `copyTool`.
  - Fixed circular references and implicit `any` types in tool definitions.
  - Corrected `fs.ensureDir` usage by removing invalid `recursive` option.

### Notes

- All changes have been linted and type-checked to ensure compatibility and correctness.
- Tools are now fully integrated and ready for use in workflows.

---

## [v0.1.4] - 2025-04-20

### Added

- **Puppeteer Tool (`puppeteerTool.ts`)** Needs fixed causes stream to crash.
Trace
Trace Id
Started Total Duration

stream
b1052f4e30ebab490748d50db729b901 4/20/2025, 9:51:12 AM 15.861ms

stream
8642fc5243ae5610e419a4431b792779 4/20/2025, 9:49:01 AM 1924.593ms

__registerMastra
9337ac666c23e33bd1f6b85d98daf44a 4/20/2025, 9:48:45 AM 0.007ms

__registerMastra
e85fb9fff96413107517aac82da2e943 4/20/2025, 9:48:45 AM 0.005ms

__registerMastra
e39c38bd34ca5e5cbc47a2d6a32cd057 4/20/2025, 9:48:45 AM 0.005ms

__registerMastra
1fc4f91de6d279050eca05ef2f5d598e 4/20/2025, 9:48:45 AM 0.051ms

__registerPrimitives
93250cfc44aaf1d882d180aa4fe39b13 4/20/2025, 9:48:45 AM 0.096ms

__registerMastra
2744379f4f8e815785ebaddaa4830add 4/20/2025, 9:48:45 AM 0.391ms

__registerPrimitives
629c2ccf8f2b4bc80f8867c4ef9ef0de 4/20/2025, 9:48:45 AM 0.168ms

- Implemented a new Mastra tool (`puppeteer_web_automator`) for advanced browser automation using Puppeteer.
- Supports navigating to URLs, executing a sequence of actions (click, type, scrape, wait, scroll, hover, select, evaluate), taking screenshots, and extracting data.
- Includes robust action schemas defined with Zod for type safety and validation.
- Provides detailed logging for each step of the automation process.
- **Knowledge Base Integration (`puppeteerTool.ts`)**
  - Integrated `writeKnowledgeFileTool` (from `readwrite.ts`) into `puppeteerTool`.
  - Added input options (`saveKnowledgeFilename`, `saveFormat`, `saveMode`, `saveEncoding`) to allow users to optionally save scraped data directly to the knowledge base.
  - Handles formatting scraped data into JSON or basic CSV before saving.
  - Includes error handling and status reporting for the save operation in the tool's output.
- **Observability (`puppeteerTool.ts`)**
  - Integrated SigNoz tracing (`createAISpan`, `recordMetrics`) into `puppeteerTool`.
  - Creates a span for each tool execution, recording input parameters, key events (navigation, actions, saving), latency, final status (success/error), and exceptions.
  - Provides detailed observability into the tool's performance and behavior.
- **Tool Registration (`index.ts`)**
  - Imported and registered `puppeteerTool` in the main tool barrel file (`src/mastra/tools/index.ts`).
  - Added `puppeteerTool` to `allTools`, `allToolsMap`, and `toolGroups` for unified tool discovery and registration.

---

## [v0.1.3] - 2025-04-19

### Added

- **Agent Usage Standardization**
  - All agents (researchAgent, analystAgent, writerAgent, copywriterAgent, etc.) now use the `.generate()` method as the standard command for invoking agent logic within workflows and other orchestration code.
  - This change ensures consistency and type safety across all workflow steps and agent integrations.

#### Example Usage

The following code snippet demonstrates the new standard for invoking agents:

```typescript
// Correct usage for all agents in workflow steps:
const { text } = await researchAgent.generate(queryInput);
const { text } = await analystAgent.generate(researchResult);
const { text } = await writerAgent.generate(analysisResult);
const { text } = await copywriterAgent.generate(writingResult);
```

- All previous usages of `.run`, `.call`, `.chat`, or direct function invocation have been replaced with `.generate()` for clarity and compatibility with the Mastra agent API.

### Changed

- Updated all workflow steps in `multiagentWorkflow.ts` and related files to use `.generate()` for agent execution.
- Improved documentation and inline comments to clarify the `.generate()` pattern for future maintainers.

### Notes

- The `.generate()` method is now the **only supported way** to invoke agent logic in this codebase.
- This standardization prevents confusion and runtime errors related to agent invocation.
- Please update any custom agents or tools to implement a `.generate()` method if they do not already.

---

## [v0.1.2] - 2025-04-19

### Added

- **arxiv.ts**
  - Implemented `arxiv_download_pdf` tool: Downloads a PDF for a given arXiv ID and saves it to disk using `fs-extra` and `ky`. Ensures directory creation and robust file writing.
  - All arXiv tools now have explicit Zod output schemas (`ArxivSearchOutputSchema`, `ArxivPdfUrlOutputSchema`, `ArxivDownloadPdfOutputSchema`).
  - Patched all arXiv tool output schemas in `createMastraArxivTools` for Mastra compatibility.
  - Improved `extractId` utility for robust arXiv ID parsing.
  - Cleaned up namespace and type exports for clarity.

- **polygon.ts**
  - Productionized MastraPolygonClient: Now requires and validates `POLYGON_API_KEY` from environment or config.
  - Added robust error handling for API failures.
  - Explicitly patched `tickerDetails` output schema for Mastra compatibility.
  - Exported `TickerDetailsSchema` for downstream use and type safety.

- **reddit.ts**
  - Expanded `SubredditPostSchema` to include all relevant Reddit post fields.
  - Added error handling to Reddit tool methods.
  - Patched `getSubredditPosts` output schema for Mastra compatibility.
  - Exported `SubredditPostSchema` for downstream use and type safety.

- **index.ts (tool barrel)**
  - Ensured all tools (`arxiv`, `polygon`, `reddit`, etc.) are exported using `export * from ...` for unified tool registration.
  - Added `POLYGON_API_KEY` to `envSchema` for environment validation.
  - Exported all relevant schemas (`TickerDetailsSchema`, `SubredditPostSchema`, etc.) for agent and workflow configs.
  - Confirmed all tools are discoverable via `allTools`, `allToolsMap`, and `toolGroups`.

- **Agent Integration**
  - Updated agent creation logic to resolve tools from `allToolsMap` using tool IDs.
  - Added robust error logging and throwing for missing tools in agent configs.
  - Ensured all tools (including new/updated ones) are available to agents via the barrel file.

### Changed

- **General**
  - Standardized tool registration and output schema patching across all Mastra tools.
  - Improved documentation and inline comments for tool and agent registration patterns.
  - Clarified environment variable requirements in `envSchema`.

### Fixed

- Ensured all tools have explicit output schemas and are patched at registration, preventing runtime errors in Mastra workflows.
- SigNoz tracer + meter via `initSigNoz()`.  
  • Created spans around agent lifecycle (`agent.create`, `agent.debug/info/warn/error`).  
  • Recorded metrics (`agent.creation.count`, `agent.creation.latency_ms`).  
  • **Voice integration is stubbed**—the `createGoogleVoice()` import and `voice` prop in the `Agent` constructor are commented out because real‑time streaming (connect, listen, speaker events) is not yet implemented.  

- **voice/googlevoice.ts & voice/index.ts**  
  • Exposed `createGoogleVoice()` and barrel‑exported from `index.ts`.  
  • Configured `CompositeVoice` with tool injection and global instructions.  
  • Did **not** hook into BaseAgent because real‑time support is pending.

### Fixed

- Avoid “File path does not exist” by auto‑creating directories/files in `fileLogger.ts`.  
- Prevent `ERR_INVALID_URL` in Upstash by prefixing missing `https://`.

### Notes

- Voice support is **half‑complete**. All voice factory code is in place, but in `base.agent.ts` it remains commented out.  
- **Next steps**:
  1. Wire a real‑time STT/TTS provider (e.g. Google streaming API).  
  2. Hook up `voice.connect()`, `voice.on("listen")`, `voice.on("speaker")`.  
  3. Pass the active `voice` instance into the `Agent` constructor.  
  4. Un‑comment the `voice` lines and verify end‑to‑end audio streaming.

## [v0.1.1] - 2025-04-16

### Added

- Full, type-safe support for OpenAI, Anthropic, and Ollama providers in provider.utils.ts and model.utils.ts, matching Google/Vertex patterns.
- Standard/default model configs for OpenAI (gpt-4o), Anthropic (claude-3.5-sonnet-2024-04-08), and Ollama (gemma3:4b) in config.types.ts.
- Provider/model instantiation logic now robustly uses options and environment variables for overrides.
- All lint/type errors checked and resolved after changes.
- New `createModelInstance` function added for streamlined model creation.

### Changed

- Refactored model.utils.ts and provider.utils.ts to ensure options are always read and passed to model instantiation for all providers.
- Updated config.types.ts to include future-proofed, extensible model/provider patterns for all major LLMs.

### Notes

- All providers (Google, Vertex, OpenAI, Anthropic, Ollama) are now fully modular, type-safe, and ready for agent config integration.
- Please continue to lint and type-check after every file edit as per project policy.

- Date: 2025-04-16
- Time: 18:00 UTC

## [v0.0.9] - 2025-04-16

### Added

- Comprehensive evals toolset in `tools/evals.ts` with SigNoz tracing: includes completeness, answer relevancy, content similarity, context precision, context position, tone consistency, keyword coverage, textual difference, faithfulness, and token count metrics.
- All eval tools output normalized scores, explanations, and are ready for agent/workflow integration.
- LlamaIndex tool output schema and type safety improvements.

### Changed

- Integrated SigNoz tracing into all eval tools and reinforced tracing in agent and tool workflows.
- Updated RL Trainer agent config and tool registration for robust RL workflows.
- Updated tool barrel (`tools/index.ts`) to ensure all schemas and tools are exported only once and are available for agent configs.

### Fixed

- Removed all duplicate schema/tool exports in `wikibase.ts`, `wikidata-client.ts`, `github.ts`, `llamaindex.ts`, and `evals.ts`.
- Fixed throttle type mismatches and replaced unsupported string methods for broader TypeScript compatibility.
- Lint and type errors resolved across all affected files.

## [v0.0.8] - 2025-04-14

### Fixed

- Vertex AI authentication and model instantiation now use GOOGLE_APPLICATION_CREDENTIALS for robust, cross-platform support (Windows included).
- provider.utils.ts updated to prefer GOOGLE_APPLICATION_CREDENTIALS and only fallback to inline credentials if necessary.
- Cleaned up .env recommendations: removed GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY when using GOOGLE_APPLICATION_CREDENTIALS.
- Confirmed model.utils.ts and config.types.ts are compatible with new Vertex AI credential handling.
- All lint/type errors checked and resolved after changes.

### Changed

- Updated documentation and .env guidance for Vertex AI best practices.
- README and internal comments clarified for provider setup and troubleshooting.

- Date: 2025-04-16
- Time: 16:00 UTC

## [v0.0.7] - 2025-04-15  

- Integrated UpstashVector as a modular vector store alongside LibSQL for hybrid memory and RAG workflows.  
- Refactored workflowFactory.ts for type safety, tracing, error handling, and modular dynamic workflow creation.  
- Added and re-exported Upstash vector helpers in database/index.ts for best-practice access.  
- Implemented tracing wrappers for memory operations in database/index.ts using SigNoz.  
- Improved type safety and error handling in workflowFactory.ts and related workflow logic.  
- Ensured all lint/type errors are fixed after every file edit.  
- Updated README and documentation to reflect new memory, RAG, and workflow patterns.  
- Added csv-reader, docx-reader, tools  

- Date: 2025-04-15  
- Time: 15:00 UTC

## [v0.0.6] - 2025-04-15

### Added

- Productionized all eval tools in `src/mastra/tools/evals.ts` with Vertex AI LLM integration, robust prompts, JSON parsing, latency/model/tokens in output, and fallback heuristics.
- All eval tools are now imported and registered in the main tool barrel file (`src/mastra/tools/index.ts`), with output schemas patched for type safety.
- Moved `getMainBranchRef` from coreTools to extraTools for better separation of core and extra tools.
- Ensured all tools are discoverable via `allTools`, `allToolsMap`, and `toolGroups`.

### Changed

- Refactored tool registry to use `ensureToolOutputSchema` for all eval tools.
- Updated tool registry organization for clarity and maintainability.

### Version

- v0.9.0
- Date: 2025-04-15

## [v0.0.5] - 2025-04-15

### Added

- Full support for OpenAI and Anthropic providers in model and provider utilities, with strict Zod validation and type safety.
- Updated provider config schemas/types for all major LLM providers (Google, Vertex, OpenAI, Anthropic).
- Improved model instantiation logic to match @ai-sdk best practices for provider instance creation and environment variable usage.
- Expanded README with detailed architecture, agent, tool, memory, and observability documentation for AI assistants and contributors.
- Documented Windows OS context and workspace structure for onboarding and reproducibility.

### Changed

- Refactored model.utils.ts and provider.utils.ts for robust provider option handling and error-free instantiation.
- Updated config.types.ts and index.ts to export correct types and provider utilities for downstream use.
- README.md now includes explicit instructions for tool registration, agent config, tracing, and best practices for AI assistants.

### Fixed

- All lint and type errors related to provider/model instantiation and type mismatches.
- Ensured all tool schemas are patched and validated at registration.

### Version

- v0.9.1
- Date: 2025-04-15

## [v0.0.4] - 2025-04-15

### Fixed

- Removed duplicate code that was causing maintenance issues
- Improved code consistency across agent configuration files

### Security

- Updated dependencies to address potential vulnerabilities

## [v0.0.3] - 2025-04-15

### Added

- Dev is testing for working tools and agent configurations.
  - Only working agents are writer and researcher, all others are failing.
  - Need to fix the tools for the failing agents, Slowly working through the tools to find the issues.
  - The tools are not being registered correctly, and the schemas are not being patched correctly.
  - Identified specific tools that require updates and validation.
  - None yet
  - Researcher, is test agent since dont want to mess writer up. So needs tool by tool testing.  also new tools in readwrite.ts are not being registered correctly. (list-files, edit-file, create-file) and couple more also vertex in evals is failing.  Need to investigate the failing tools further and implement fixes.
  - Continuing to monitor the performance of the working agents and document any anomalies.

### Added

- Enhanced Document Reading Capabilities:
  - Added several new dependencies to enable the agent to process and extract text content from a wider variety of document formats. This enhancement allows the agent to understand information contained within local files or documents fetched from URLs (e.g., links retrieved by the arXiv or search tools).
- Packages Added (pnpm add ...):
  - pdf-parse: For extracting text content from PDF files.
  - mammoth: For extracting text from DOCX (Microsoft Word) files.
  - papaparse: For parsing CSV (Comma Separated Values) data.
  - js-yaml: For parsing YAML files.
  - cheerio: For parsing HTML content (from files or web pages).
  - node-fetch: For reliably fetching documents from URLs.
- Implementation: These packages should be utilized within a new Mastra AI Tool (e.g., readDocumentContent). This tool will inspect the input file path or URL, determine the likely document type (based on extension or potentially content-type for URLs), and invoke the appropriate parsing library to return the extracted text content for further processing by the agent.
-  

## [v0.0.2] - 2025-04-14

### Fixed

- Removed duplicate code that was causing maintenance issues
- Improved code consistency across agent configuration files

### Security

- Updated dependencies to address potential vulnerabilities

## [v0.0.1] - 2025-04-01

### Added

- Initial release of DeanMachines Mastra Backend
- Support for multiple specialized AI agents
- Integration with various external tools and services
- Memory management for persistent agent context
- Workflow orchestration capabilities
