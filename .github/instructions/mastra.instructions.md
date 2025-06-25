---
applyTo: "src/mastra/**/*.ts"
description: "Mastra AI Framework Guidelines for the Dean Machines RSC Project"
---
# Mastra AI Framework Guidelines

> **Framework Overview**: Mastra is an opinionated TypeScript framework for building AI applications and features quickly. Built by the Gatsby team, it provides primitives for workflows, agents, RAG, integrations, and evals. Mastra leverages the Vercel AI SDK for model routing and supports deployment on local machines or serverless clouds.

## 🎯 Core Principles

- **TypeScript-First**: Native TypeScript experience with full type safety
- **Developer Experience**: Clean, intuitive development environment with built-in observability
- **Production Ready**: Deploy to Vercel, Cloudflare Workers, Netlify, or standalone Node.js servers
- **Unified Provider API**: Switch between OpenAI, Anthropic, Google Gemini with a single line of code
- **Observability Built-in**: OpenTelemetry integration, tracing, logging, and evaluation tools

## 📁 Directory Structure & Organization

- Ensure all Mastra-related code is placed in the `src/mastra` directory
- Use TypeScript for all Mastra-related files
- Follow the established Mastra API structure and conventions
- Use consistent naming with the `mastra` prefix for core functions and classes
- Document all Mastra-related code with comprehensive TSDoc comments
- Use the `@mastra` tag for all Mastra-related TSDoc comments

# structure

```bash
src
┣ 📂app
┃ ┣ 📂api
┃   ┗ 📂copilotkit
┃      ┗ 📜route.ts # Main route Mastra -> AG-UI -> CopilotKit -> User
┃ 📂components
┃ ┗ 📂ui # shadcn/ui component library
┃   📂copilotkit # CopilotKit custom component library
┣ 📂mastra
┃ ┣ 📂agents
┃ ┣ 📜analyzer-agent.ts
┃ ┣ 📜browser-agent.ts
┃ ┣ 📜code-agent.ts
┃ ┣ 📜data-agent.ts
┃ ┣ 📜debug-agent.ts
┃ ┣ 📜design-agent.ts
┃ ┣ 📜docker-agent.ts
┃ ┣ 📜documentation-agent.ts
┃ ┣ 📜evolve-agent.ts
┃ ┣ 📜git-agent.ts
┃ ┣ 📜graph-agent.ts
┃ ┣ 📜index.test.ts
┃ ┣ 📜index.ts
┃ ┣ 📜manager-agent.ts
┃ ┣ 📜marketing-agent.ts
┃ ┣ 📜master-agent.ts
┃ ┣ 📜processing-agent.ts
┃ ┣ 📜research-agent.ts
┃ ┣ 📜special-agent.ts
┃ ┣ 📜strategizer-agent.ts
┃ ┣ 📜supervisor-agent.ts
┃ ┣ 📜sysadmin-agent.ts
┃ ┣ 📜utility-agent.ts
┃ ┗ 📜weather-agent.ts
┣ 📂config
┃ ┣ 📜environment.ts
┃ ┣ 📜googleProvider.ts
┃ ┗ 📜index.ts
┣ 📂evals
┃ ┣ 📜answerRelevancy.ts
┃ ┣ 📜bias.ts
┃ ┣ 📜completeness.ts
┃ ┣ 📜contentSimilarity.ts
┃ ┣ 📜contextPosition.new.ts
┃ ┣ 📜contextPrecision.ts
┃ ┣ 📜contextualRecall.ts
┃ ┣ 📜customEval.ts
┃ ┣ 📜faithfulness.ts
┃ ┣ 📜hallucination.ts
┃ ┣ 📜keywordCoverage.ts
┃ ┣ 📜promptAlignment.ts
┃ ┣ 📜summarization.ts
┃ ┣ 📜textualDifference.ts
┃ ┣ 📜toneConsistency.ts
┃ ┣ 📜toxicity.ts
┃ ┗ 📜wordInclusion.ts
┣ 📂networks
┃ ┗ 📜dean-machines-network.ts
┣ 📂tools
┃ ┣ 📜chunker-tool.ts
┃ ┣ 📜delegate-tools.ts
┃ ┣ 📜graphRAG.ts
┃ ┣ 📜index.ts
┃ ┣ 📜mcp.ts
┃ ┣ 📜mem0-tool.ts
┃ ┣ 📜rerank-tool.ts
┃ ┣ 📜stock-tools.ts
┃ ┣ 📜vectorQueryTool.ts
┃ ┗ 📜weather-tool.ts
┣ 📂workflows
┃ ┣ 📜code-graph-maker-advanced.ts
┃ ┣ 📜code-graph-maker.ts
┃ ┗ 📜weather-workflow.ts
┣ 📜agentMemory.ts # Memory management and persistence
┣ 📜index.ts # Mastra entry point
┗ 📜memory.ts # This is temporary if I want to switch to Supabase

```

# Augment Guidelines for the Dean Machines RSC Project

## 1. Technology Stack
- This is a Next.js 15 project using TypeScript and the App Router.
- Styling is done with Tailwind CSS. Use utility classes for styling. Colors and fonts are defined in `src/app/globals.css`.
- We use PinoLogger for logging. Do not use `console.log`.

## 2. Mastra AI Framework
- New agents should be created in the `src/mastra/agents/` directory, following the structure of `master-agent.ts` and `weather-agent.ts`.
- Agents should use the shared `agentMemory` instance from `src/mastra/agentMemory.ts` for memory.
- New tools for agents should be created in the `src/mastra/tools/` directory. Use Zod for input and output schema validation, as seen in `stock-tools.ts`.

## 3. Code Style & Conventions
- Use single quotes for all imports and strings.
- Follow the existing ESLint and Prettier configurations. The ESLint configuration is in `eslint.config.mjs`.
- For new pages, follow the structure of `src/app/page.tsx`.

## 4. Testing
- Tests are written with Vitest.
- New test files should end with `.test.ts`.
- See `src/mastra/agents/index.test.ts` for an example of an existing test.

## 5. Dependency Management
- Use npm for package management.
- Add new dependencies to the `dependencies` or `devDependencies` section of the `package.json` file as appropriate.

## 6. TSDoc Comments
- Use TSDoc comments for all public functions, classes, interfaces, and types.
- Follow the existing TSDoc style in `src/mastra/agents/master-agent.ts` and `src/mastra/tools/stock-tools.ts`.
- Ensure that all parameters and return types are documented clearly.
- Use `@param` for parameters and `@returns` for return values.
- Use `@example` for examples of usage where applicable.
- Use `@throws` for exceptions that can be thrown.
- Use `@see` to reference related functions or classes.
- Use `@link` to link to external documentation or resources.

## 7. Environment Variables
- Environment variables should be defined in the `.env.example` file.
- Use `process.env` to access environment variables in the code.
- Ensure that sensitive information is not hardcoded in the codebase.

## 8. Documentation
- Update the project documentation in the `README.md` file for any new features or changes.
- Ensure that the documentation is clear and concise.
- `CHANGELOG.md` should be updated for any significant changes or releases.

## 9. Code Best Practices
- Always write clean, readable code.
- Use meaningful variable and function names.
- Avoid complex logic in a single function; break it down into smaller, reusable functions.
- Use async/await for asynchronous operations.
- Handle errors gracefully and log them using PinoLogger.
- Use TypeScript types and interfaces to define the shape of data clearly.
- Avoid using `any` type; prefer specific types or interfaces.
- Use enums for fixed sets of values where applicable.
- Use TODO comments for code that needs to be implemented later, [TODO: <your-name> <date> <description>].
- Use JSDoc comments for functions and classes.
- Use ESLint and Prettier for code formatting and linting.
- Use Git for version control and commit messages should be clear and descriptive.

## 🚀 Mastra Core Features

### 🤖 Agent Development
- **Persistent Memory**: Agents maintain conversation history and context across sessions
- **Tool Calling**: Agents can execute functions and interact with external systems
- **Semantic Memory**: Retrieve information based on recency, similarity, or conversation thread
- **Multi-Agent Orchestration**: Coordinate multiple specialized agents in workflows

### 🔄 Workflow Engine
- **Graph-Based Execution**: Define discrete steps with deterministic control flow
- **Control Flow Syntax**: Use `.then()`, `.branch()`, `.parallel()` for complex orchestration
- **State Tracking**: Log inputs and outputs at each step with full observability
- **Pipeline Integration**: Connect to observability tools for monitoring and debugging

### 📚 Retrieval-Augmented Generation (RAG)
- **Document Processing**: Handle text, HTML, Markdown, and JSON formats
- **Embedding Creation**: Generate and store semantic embeddings in vector databases
- **Multi-Provider Support**: Unified API for Pinecone, pgvector, and other vector stores
- **Semantic Search**: Query-time retrieval with relevance scoring and reranking

### 🔌 Model & Provider Management
- **Vercel AI SDK Integration**: Unified interface for all LLM providers
- **Provider Switching**: OpenAI, Anthropic, Google Gemini with consistent API
- **Streaming Support**: Real-time response streaming for better UX
- **Model Selection**: Choose specific models and configure parameters per use case

### 📊 Observability & Evaluation
- **Built-in Tracing**: OpenTelemetry integration for comprehensive monitoring
- **Automated Evals**: Model-graded, rule-based, and statistical assessment methods
- **Quality Metrics**: Toxicity, bias, relevance, and factual accuracy scoring
- **Custom Evaluations**: Define domain-specific evaluation criteria

## 🏗️ Architecture Patterns

### Agent Creation Template
```typescript
import { Agent } from '@mastra/core/agent';
import { createTracedGoogleModel } from '../config';
import { agentMemory } from '../agentMemory';

/**
 * @mastra Agent for [specific domain/purpose]
 * Implements [key capabilities]
 * 
 * @example
 * ```typescript
 * const result = await myAgent.generate({
 *   messages: [{ role: 'user', content: 'Hello' }],
 *   tools: [myTool]
 * });
 * ```
 * 
 * @see {@link https://mastra.ai/docs/agents | Mastra Agent Documentation}
 */
export const myAgent = new Agent({
  name: 'my-agent',
  instructions: 'Clear, specific instructions for the agent...',
  model: createTracedGoogleModel(),
  memory: agentMemory,
  tools: [/* relevant tools */]
});
```

### Tool Development Pattern
```typescript
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const inputSchema = z.object({
  // Define strict validation schemas
  query: z.string().min(1).describe('Search query'),
  options: z.object({
    limit: z.number().optional().default(10)
  }).optional()
});

const outputSchema = z.object({
  result: z.string(),
  metadata: z.record(z.any()).optional()
});

/**
 * @mastra Tool for [specific functionality]
 * 
 * @param input - Validated input matching inputSchema
 * @returns Promise resolving to string result
 * 
 * @example
 * ```typescript
 * const result = await myTool.execute({
 *   query: 'search term',
 *   options: { limit: 5 }
 * });
 * ```
 */
export const myTool = createTool({
  id: 'my-tool',
  description: 'Clear description of tool functionality',
  inputSchema,
  outputSchema,
  execute: async ({ query, options }) => {
    // Tool implementation with proper error handling
    try {
      // ... implementation
      return 'Tool result as string';
    } catch (error) {
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }
});
```

### Workflow Orchestration Pattern
```typescript
import { Workflow } from '@mastra/core/workflow';
import { z } from 'zod';

const workflowInputSchema = z.object({
  // Define workflow inputs
});

/**
 * @mastra Workflow for [specific process]
 * Orchestrates [description of steps]
 */
export const myWorkflow = new Workflow({
  name: 'my-workflow',
  inputSchema: workflowInputSchema,
  execute: async (input) => {
    return workflow
      .step('initial-step', async () => {
        // First step implementation
      })
      .then('process-step', async (previousResult) => {
        // Sequential step
      })
      .branch('decision-point', {
        condition: (data) => data.needsProcessing,
        onTrue: workflow.step('process-true', async () => { /* ... */ }),
        onFalse: workflow.step('process-false', async () => { /* ... */ })
      })
      .parallel([
        workflow.step('parallel-1', async () => { /* ... */ }),
        workflow.step('parallel-2', async () => { /* ... */ })
      ])
      .execute(input);
  }
});
```