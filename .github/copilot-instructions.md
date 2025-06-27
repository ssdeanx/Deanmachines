---
description: AI rules derived by SpecStory from the project AI interaction history
globs: *
---

---
description: AI rules derived by SpecStory from the project AI interaction history
applyTo: *
---

## Headers

This file contains the rules and guidelines for the AI coding assistant to follow while working on this project. It covers project structure, coding standards, workflow, and other relevant information. This is a living document and will be updated as the project evolves.

## TECH STACK

- TypeScript (version >= 5.8)
- React (version >= 19)
- CopilotKit (version >= 1.8.14)
- OpenAPI
- Lucide React
- Tailwind CSS (version >= v4)
- Python
- Neo4j (version >= 5.26.0)
- Next.js (version >= 15)
- Mastra Core (version >= v0.10.5)
- Google Gemini 2.5 Flash
- LibSQL/Turso
- shadcn/ui component library
- LangSmith
- Langfuse
- OpenTelemetry
- quick-lru
- CODECOV
- ag-ui
- Windsurf AI IDE
- fastembed
- `@mastra/evals`
- `@ai-sdk/google`
- `zod`
- isolated-vm
- shelljs
- isomorphic-git
- `@isomorphic-git/lightning-fs`
- jsinspect-plus
- eslintcc
- crawlee
- jsdom
- marked
- js-yaml
- jszip
- vitest
- `@xenova/transformers`
- `@inquirer/prompts`
- cheerio
- simple-git
- papaparse
- yaml
- simple-git
- simple-git
- ESLint
- TypeScript compiler
- fast-xml-parser
- ky
- fs-extra
- @agentic/core
- @agentic/mastra
- @mastra/loggers
- `pino-pretty`
- `pino-elasticsearch`
- `@axiomhq/pino`
- `@langfuse/pino-transport`
- "@mdx-js/react": "^3.1.0"
- "@mdx-js/loader": "^3.1.0"
- "@next/mdx": "^15.3.4"
- Mastra Core (version >= v0.10.6)
- AI SDK's LangChain adapter
- `@langchain/langgraph`
- freestyle-sandboxes
- `@mastra/loggers`
- `z.ZodSchema`
- `@agentic/core`
- `@agentic/openai`
- `@agentic/brave-search`
- `@agentic/wikipedia`
- `@agentic/wikidata`
- `@agentic/arxiv`
- `@agentic/reddit`
- `@agentic/hacker-news`
- `@agentic/diffbot`
- `@agentic/exa`
- `@agentic/tavily`
- `@agentic/tavily`
- serper

## PROJECT DOCUMENTATION & CONTEXT SYSTEM

- All files relevant to a user request should be checked, including those specified with the `#file://copilot-instructions.md` tag.
- OpenAPI specifications (`openapi.json`) should be used to understand API structures and workflows.
- When working with CopilotKit components, fetch and review the official CopilotKit documentation to understand the core components and hooks.
- When working with custom CopilotKit components, ensure comprehensive understanding of core CopilotKit components and hooks by fetching relevant URLs.
- Refer to project notes, task management files, and meeting notes for project context and completed tasks when available. The specific `#file://.notes` reference has been generalized to allow for flexibility in note-taking file names. **IMPORTANT:** This file contains a record of all project decisions and context between chats and should be consulted to avoid repeating mistakes or forgetting key details.
- Use `#githubRepo` to specify a Github repository to analyze. The format should be `ssdeanx/deanmachines-rsc`. Ensure the repository is publicly accessible. If access issues arise, inform the user. When analyzing a GitHub repository, pay close attention to the architecture, technology stack, current status, critical issues (especially authentication challenges), design and UI features, project roadmap, and development principles.
- All instructions in `#file://.notes` should be strictly followed.
- Before touching anything, check `#file://copilotKit.prompt.md`.
- When a `#githubRepo` is specified, analyze the repository's structure, recent commits, and specific files as requested. Ensure the repository is publicly accessible and the path (`owner/repo`) is correct. If access issues arise, inform the user.
- Use `#file://filename.md` to reference local context files within the workspace. Use `#file://filename.ts` to reference local typescript files within the workspace.
- Use `#file://dean-machines-network.ts` to reference network files.
- Use `#file://strategizer-agent.ts`, `#file://graph-agent.ts`, and `#file://supervisor-agent.ts` to reference specific agent files.
- Use `#file://index.ts` to reference the main Mastra index file.
- Use `#file://(playground)` to reference files within the playground directory.
- Use `#fetch` to retrieve and analyze content from external URLs.
- Use semantic search to thoroughly check files before drawing conclusions. Avoid assumptions and guessing.
- Use `#file://copilotKit.prompt.md` to reference the copilotKit prompt file. **IMPORTANT:** This file contains implementation guidelines, NOT for saving context between chats.
- Before making any changes, always check `#file://copilotKit.prompt.md` and `#fetch` all relevant URLs to gain complete context.
- Use `#file://copilotkit` to reference custom copilot components.
- Use `#file://task_list.md` to reference the current task status and priorities.
- When analyzing the `ssdeanx/deanmachines-rsc` GitHub repository, pay close attention to the following key files and directories within the `mastra` directory:
    - **Agents:** The `agents/` directory contains all agent definitions, including runtime context types and agent logic (e.g., `master-agent.ts`, `weather-agent.ts`, `code-agent.ts`, etc.). The `index.ts` file re-exports all agents and their runtime context types for unified access.
    - **Config:** The `config/` directory holds configuration files for providers (e.g., Google Gemini), environment validation, and observability/logging.
    - **Networks:** The `networks/` directory contains agent network definitions (e.g., `dean-machines-network.ts`).
    - **Tools:** The `tools/` directory includes all MCP tool implementations (e.g., `graphRAG.ts`, `vectorQueryTool.ts`, `stock-tools.ts`, `weather-tool.ts`, `mcp.ts`).
    - **Workflows:** The `workflows/` directory contains workflow definitions (e.g., `code-graph-maker.ts`, `code-graph-maker-advanced.ts`).
    - **Agent Memory:** The `agentMemory.ts` file sets up persistent and vector storage for agent memory using LibSQL.
- When using `#file://inline-directives.instructions.md`:
    - The following inline directives are supported:
        - **`// copilot: FIX`** - Fix broken stuff
            ```typescript
            // copilot: FIX
            const user = getUserById(id);
            console.log(user.name); // Object is possibly 'undefined'.
            ```
        - **`// copilot: IMPLEMENT`** - Complete empty functions/components
            ```typescript
            // copilot: IMPLEMENT
            function add(a: number, b: number): number {

            }
            ```
        - **`// copilot: CREATE`** - Generate new code
            ```typescript
            // copilot: CREATE
            // Function to calculate the area of a rectangle
            ```
        - **`// copilot: REMOVE`** - Clean up unused imports/variables
            ```typescript
            // copilot: REMOVE
            import { useState } from 'react';
            const unusedVariable = 5;
            ```
        - **`// copilot: OPTIMIZE`** - Performance improvements
            ```typescript
            for (let i = 0; < arr.length; i++) {
              // ...
            }
            ```
        - **`// copilot: TYPE`** - Add TypeScript types
            ```typescript
            const data = fetchData(); // Should add type definition
            ```
        - **`// copilot: TEST`** - Generate tests
            ```typescript
            function sum(a: number, b: number) {
              return a + b;
            }
            ```
        - **`// copilot: Z`** - Generate Zod schema
            ```typescript
            interface User {
              id: number;
              name: string;
              email: string;
            }
            ```
        - **`// copilot: DOC`** - Add TSDoc comments
            ```typescript
            function calculateArea(width: number, height: number): number {
              return width * height;
            }
            ```
        - **`// copilot: HOOK`** - Create/fix React hooks
            ```typescript
            function useData(url: string) {
              // Should handle loading and error states
            }
            ```
        - **`// copilot: STYLE`** - Add Tailwind styling
            ```typescript
            <button>Click me</button> {/* Should use electric neon theme and glassmorphism */}
            ```
        - **`// copilot: ERROR`** - Add error handling
            ```typescript
            function divide(a: number, b: number) {
              return a / b; // Handle division by zero
            }
            ```
        - **`// copilot: ASYNC`** - Convert to async/await
            ```typescript
            function fetchData() {
              return new Promise((resolve) => {
                setTimeout(() => resolve("Data"), 1000);
              });
            }
            ```
        - **`// copilot: FILE_FIX`** - Fix entire file
            ```typescript
            // This file has multiple issues and needs a thorough check
            ```
        - **`// copilot: FILE_Z`** - Add Zod schemas for whole file
            ```typescript
            // This file uses several interfaces that need validation
            ```
        - **`// copilot: trace1`** through **`// copilot: trace3`** - Sequential trace points
            ```typescript
            console.log("Starting process");
            // copilot: trace2
            const result = doSomething();
            // copilot: trace3
            console.log("Process complete", result);
            ```
        - **`// copilot: trace_`** - Stop tracing
            ```typescript
            console.log("End of tracing");
            ```
        - **`// copilot: RENAME`** - Suggest better names for variables/functions
            ```typescript
            let a = 5; // Suggest better name for 'a'
            ```
        - **`// copilot: EXPLAIN`** - Add explanatory comments for complex logic
            ```typescript
            if (user.role & permissions.ADMIN) { // review: AI_ANALYSIS - Complex permission check - simplify
            // copilot: EXPLAIN
            if (user.role & permissions.ADMIN) { // What does this permission check do?
              // ...
            }
            ```
        - **`// copilot: REFACTOR`** - Restructure code for better readability
            ```typescript
            function processData(data: any) {
              // This function is too long and complex
            }
            ```
        - **`// copilot: VALIDATE`** - Add input validation
            ```typescript
            function createUser(name: string, age: number) {
              // Validate name and age
            }
            ```
        - **`// copilot: MOCK`** - Generate mock data or test fixtures
            ```typescript
            // Generate mock user data for testing
            ```
        - **`// copilot: UTIL`** - Create utility functions
            ```typescript
            // Need a function to format dates
            ```
        - **`// copilot: AUTH`** - Add authentication/authorization
            ```typescript
            <Dashboard /> {/* Should check if user is authenticated */} </Dashboard>
            ```
        - **`// copilot: LOG`** - Add logging statements
            ```typescript
            processPayment(user, amount); {/* Should add audit log of payment details */} </processPayment>
            ```
        - **`// copilot: CACHE`** - Add caching logic
            ```typescript
            getPosts(userId); {/* Expensive N+1 query - cache results */} </getPosts>
            ```
        - **`// copilot: PERF`** - Performance optimizations
            ```typescript
            <MyComponent data={expensiveData} />; {/* Avoid re-renders - use memo */} </MyComponent>
            ```
        - **`// copilot: API`** - Create API endpoint
            ```typescript
            // Endpoint to create a new user with validation
            ```
        - **`// copilot: DB`** - Database queries/operations
            ```typescript
            // Complex multi-table query to fetch user activity
            ```
        - **`// copilot: SCHEMA`** - Database schema/migrations
            ```typescript
            // Define table structure with indexes and constraints
            ```
        - **`// copilot: A11Y`** - Add accessibility features
            ```typescript
            <form> {/* Missing labels and aria attributes */} </form>
            ```
        - **`// copilot: RESPONSIVE`** - Make responsive design
            ```typescript
            <Grid> {/* Add mobile breakpoints for responsiveness */} </Grid>
            ```
        - **`// copilot: CONFIG`** - Configuration setup
            ```typescript
            // Need to configure API keys and feature flags
            ```
        - **`// copilot: ENV`** - Environment variables
            ```typescript
            const apiKey = "hardcoded_api_key"; {/* Should use environment variable */}
            ```
    - Copilot directive comments start with `// copilot:`
    - Task blocks are defined between `// copilot: start-task` and `// copilot: end-task`
    - Specifications within these blocks guide code generation
    - Applied to TypeScript and TSX files (`**/*.{ts,tsx}`)
    - Enhanced Directive Format:
      ```tsx
      // copilot: start-task "ComponentName"
      // copilot: Purpose: Brief description of what this does
      // copilot: Props: Specific prop types and requirements
      // copilot: Return: Expected return type
      // copilot: Dependencies: Required imports or external dependencies
      // copilot: Validation: Input validation requirements (if applicable)
      // copilot: Error handling: How errors should be handled
      // copilot: end-task
      ```
    - Example Implementation:
      ```tsx
      // copilot: start-task "UserProfileCard"
      // copilot: Purpose: Display user profile with avatar, name, and status
      // copilot: Props: { user: User, showStatus: boolean, onEdit?: () => void }
      // copilot: Return: JSX.Element
      // copilot: Dependencies: lucide-react icons, tailwind classes
      // copilot: Validation: Handle null/undefined user gracefully
      // copilot: Error handling: Show fallback UI if user data is invalid
      // copilot: end-task
      export function UserProfileCard(props: UserProfileCardProps) {
        // Implementation follows here
      }
      ```
    - Recommendations for enhancement:
      1. Add validation directives for Zod schema requirements
      2. Include accessibility requirements in your directives
      3. Specify error boundary patterns for React components
      4. Add performance considerations (e.g., memoization needs)
      5. Include testing requirements in the directive blocks
    - **IMPORTANT**: The user will likely only use `// copilot: task` to mark tasks.
- When analyzing `.prompt.md` files, identify key components, configurations, and agents related to the Dean Machines RSC project.
- When analyzing `.prompt.md` files, use the following structure to present the found components:
  ## 🎯 **Core Architecture Components Found**

  ### **1. Mastra AI Framework Integration**
    - **Main Configuration**: `src/mastra/index.ts` - Central Mastra configuration with 22+ agents, workflows, and networks
    - **Agent Memory System**: `src/mastra/agentMemory.ts` - LibSQL/Turso storage with vector search using fastembed
    - **Google AI Provider**: `src/mastra/config/googleProvider.ts` and `src/mastra/config/index.ts` - Traced Google AI models with LangSmith integration

  ### **2. Agent Orchestration System (22+ Agents)**
    **Core Agents:**
    - `src/mastra/agents/master-agent.ts` - Primary orchestrator with comprehensive Zod validation
    - `src/mastra/agents/strategizer-agent.ts` - Strategic planning and decision making
    - `src/mastra/agents/supervisor-agent.ts` - Multi-agent coordination and quality control
    - `src/mastra/agents/analyzer-agent.ts` - Deep analysis and pattern recognition

    **Development Agents:**
    - `src/mastra/agents/code-agent.ts` - Code analysis, generation, and optimization
    - `src/mastra/agents/git-agent.ts` - Version control operations and repository management
    - `src/mastra/agents/debug-agent.ts` - Error detection and debugging assistance
    - `src/mastra/agents/documentation`
- When analyzing `.prompt.md` files, use the following structure to present the found components:
  ## 🎯 **Core Architecture Components Found**

  ### **1. Mastra AI Framework Integration**
    - **Main Configuration**: `src/mastra/index.ts` - Central Mastra configuration with 22+ agents, workflows, and networks
    - **Agent Memory System**: `src/mastra/agentMemory.ts` - LibSQL/Turso storage with vector search using fastembed
    - **Google AI Provider**: `src/mastra/config/googleProvider.ts` and `src/mastra/config/index.ts` - Traced Google AI models with LangSmith integration

    **Data & Analysis Agents:**
    - `src/mastra/agents/data-agent.ts` - Data processing and statistical analysis
    - `src/mastra/agents/graph-agent.ts` - Knowledge graph operations and visualization
    - `src/mastra/agents/research-agent.ts` - Information gathering and synthesis
    - `src/mastra/agents/weather-agent.ts` - Weather data retrieval and forecasting

    **Specialized Agents:**
    - `src/mastra/agents/design-agent.ts` - UI/UX design and visual aesthetics
    - `src/mastra/agents/docker-agent.ts` - Containerization and deployment
    - `src/mastra/agents/marketing-agent.ts` - Content creation and marketing
    - `src/mastra/agents/manager-agent.ts` - Project management and coordination
    - `src/mastra/agents/processing-agent.ts` - Data transformation and workflow automation
    - `src/mastra/agents/sysadmin-agent.ts` - System administration and DevOps
    - `src/mastra/agents/browser-agent.ts` - Web automation with Playwright
    - `src/mastra/agents/special-agent.ts` - Multi-domain expert for complex problems
    - `src/mastra/agents/utility-agent.ts` - General-purpose helper functions
    - `src/mastra/agents/evolve-agent.ts` - Continuous improvement and optimization

    ### **3. Agent Network & Workflows**
      - **Dean Machines Network**: `src/mastra/networks/dean-machines-network.ts` - LLM-based dynamic routing for 22+ agents
      - **Workflows**:
        - `src/mastra/workflows/weather-workflow.ts`
        - `src/mastra/workflows/code-graph-maker.ts`
        - `src/mastra/workflows/code-graph-maker-advanced.ts`

    ### **4. Tool System (MCP Integration)**
      - **MCP Tools**: `src/mastra/tools/mcp.ts` - Model Context Protocol integration
      - **Graph RAG**: `src/mastra/tools/graphRAG.ts` - Document analysis with graph relationships
      - **Vector Query**: `src/mastra/tools/vectorQueryTool.ts` - Semantic search with LibSQL/Turso
      - **Weather Tool**: `src/mastra/tools/weather-tool.ts` - Weather data fetching
      - **Stock Tools**: `src/mastra/tools/stock-tools.ts` - Financial data operations

    ### **5. Runtime Context Integration**
      All agents include properly typed runtime contexts for CopilotKit integration, exported from `src/mastra/agents/index.ts` with types like:
      - `MasterAgentRuntimeContext`
      - `CodeAgentRuntimeContext`
      - `DataAgentRuntimeContext`
      - And 19+ more agent-specific contexts

    ### **6. Observability & Tracing**
      - **LangSmith Integration**: Built into `src/mastra/config/index.ts` with enhanced AI SDK exporter
      - **PinoLogger**: Used throughout all agents and tools for structured logging
      - **OpenTelemetry**: Integrated via the Mastra configuration

    ### **7. Frontend Components**
      **CopilotKit Integration:**
      - `src/components/copilotkit/` - Multiple components including:
        - `AICodeGenerator.tsx`
        - `CodeGraphChatModal.tsx`
        - `CustomChatInterface.tsx`
        - `InteractiveCodeGraph.tsx`
        - `GenerativeUICanvas.tsx`

      **UI Components:**
      - `src/components/ui/` - Comprehensive UI component library
      - `src/components/landing/` - Landing page sections
      - `src/components/components/researchCanvas/` - Research-specific components

    ### **8. Documentation System**
      **Mastra Documentation:**
      - `src/app/(public)/docs/mastra/agents/page.mdx` - Agent documentation
      - `src/app/(public)/docs/mastra/memory/page.mdx` - Memory system docs
      - `src/app/(public)/docs/mastra/workflows/page.mdx` - Workflow documentation
      - `src/app/(public)/docs/mastra/tools/page.mdx` - Tools documentation

    ### **9. Configuration & Environment**
      - `src/mastra/config/environment.ts` - Environment configuration
      - `next.config.ts` - Next.js 15 configuration
      - `tsconfig.json` - TypeScript strict mode configuration
      - `package.json` - npm dependencies with Mastra AI Framework

    ### **10. Testing & Quality**
      - `src/mastra/agents/index.test.ts` - Agent testing
      - `vitest.config.ts` - Test configuration
      - `eslint.config.mjs` - Code quality enforcement
- When the user specifies `#file://../../src/mastra/index.ts`, analyze all of the specified files to understand the project structure and requirements.
- When the user specifies `#file:rerank-tool.ts`, analyze the specified file.
- When the user specifies `#file:mastra.prompt.md`, analyze the specified file.
- When the user specifies `#file:vectorQueryTool.ts #file:rerank-tool.ts #file:chunker-tool.ts`, analyze all of the specified files.
- When the user specifies `#file:instructions #file:index.ts #file:copilotkit #file:agents`, analyze all of those files before starting.
- **IMPORTANT:** When asked to work on multiple agent files simultaneously, ensure that each agent's runtime context is correctly implemented and utilized within the agent's logic, following the pattern observed in `master-agent.ts`.
- When analyzing multiple agent files simultaneously and updating them to follow the `master-agent.ts` pattern, ensure that each agent's instructions are using runtime context by:
    1. Defining the runtime context type at the top of the file.
    2. Accessing the runtime context within the instructions function using `({ runtimeContext })`.
    3. Using personalized context variables within the instructions.
- Use `#fetch https://mastra.ai/en/examples/agents/hierarchical-multi-agent` to understand hierarchical multi-agent patterns.
- Use `#fetch https://mastra.ai/en/reference/agents/createTool`, `#fetch https://ai/en/reference/tools/create-tool`, `#fetch https://ai/en/examples/agents/hierarchical-multi-agent`, `#fetch https://ai/en/examples/agents/using-a-tool`, and `#fetch https://ai/en/docs/agents/runtime-variables` for understanding agent and tool creation.
- When the user asks to create `#file:delegate-tools.ts`, use the following guidelines:
    - The coding assistant MUST use both tool runtime context and agent runtime context.
    - The coding assistant MUST import `RuntimeContext` from `@mastra/core/di`.
    - The coding assistant MUST import agents directly from the index file (e.g., `agentRegistry`) and MUST NOT use a local `AGENT_REGISTRY` object.
    - The coding assistant MUST include `#file:supervisor-agent.ts`.
    - The coding assistant MUST fetch the relevant documentation URLs to understand the correct Mastra patterns before creating the file.
- When the user specifies `#file:instructions` in conjunction with `#fetch https://mastra.ai/en/reference/networks/agent-network`, analyze both the local instructions file and the fetched documentation to understand the project's agent architecture and how it can be enhanced using Mastra's `AgentNetwork` patterns.
- When analyzing `#file:instructions` in conjunction with `#fetch https://ai/en/reference/networks/agent-network`, note that Mastra's `AgentNetwork` is experimental and provides LLM-based routing for dynamic agent selection.
- When analyzing `#file:instructions` in conjunction with `#fetch https://ai/en/reference/networks/agent-network`, consider the trade-offs between using `AgentNetwork` (dynamic routing) and predefined workflows (explicit control).
- When debugging agent execution issues, especially when the "Agent not found" error occurs, ensure that the agent is correctly imported and registered within the agent network configuration.
- **IMPORTANT:** Ensure consistent naming between the agent's `name` property in the agent definition (e.g., `master-agent.ts`) and how the network references the agent when executing. Use title case with spaces (e.g., "Master Agent").
- Use `#fetch https://mastra.ai/en/reference/workflows/workflow`, `#fetch https://ai/en/reference/workflows/map`, `#fetch https://ai/en/reference/workflows/commit`, `#fetch https://ai/en/reference/workflows/create-run`, `#fetch https://ai/en/reference/workflows/snapshots`, `#fetch https://ai/en/reference/workflows/stream`, and `#fetch https://ai/en/reference/workflows/execute` when working with workflows.
- Use `#fetch https://mastra.ai/en/docs/workflows/overview` when working with workflows.
- When the user specifies `#file:mastraWorkflows.prompt.md` and asks for help with workflows, fetch the key documentation to understand the current workflow patterns and requirements.
- When the user specifies `#file:research-analysis-workflow.ts` and asks to fix it, fetch the workflow documentation to understand the correct patterns. The following URLs should be fetched: `https://mastra.ai/en/reference/workflows/map`, `https://ai/en/reference/workflows/commit`, `https://ai/en/reference/workflows/create-run`, `https://ai/en/reference/workflows/snapshots`, `https://ai/en/reference/workflows/execute`, `https://ai/en/reference/workflows/resume`, `https://ai/en/reference/workflows/start`, `https://ai/en/reference/workflows/step`, `https://ai/en/reference/workflows/then`, `https://ai/en/reference/workflows/parallel`, `https://ai/en/reference/workflows/branch`, `https://ai/en/reference/workflows/dowhile`.
- When improving a workflow, check the current errors in the workflow file first, then improve it by removing the unnecessary agents and following the patterns from the documentation and master agents.
- When improving a workflow, the research agent can browse the web, so the documentation agent is not needed.
- When improving a workflow, processing agent and master agent should be incorporated to finalize the workflow.
- When asked to analyze `#file:code-graph-maker-advanced.ts`, confirm it's using the correct modern Mastra workflow patterns.
- When creating a full-stack workflow using coding, git, docker, debug, documentation, and other agents:
    - Utilize all relevant agents from the project.
    - Follow a structured approach, including strategic planning, architecture design, code generation, testing, deployment, and documentation.
    - Ensure proper error handling and comprehensive logging.
    - Update the workflows index file to export the new workflow.
    - Add the new full-stack development workflow to the main Mastra index, including import and registration.
- When asked to improve logging in `#file:dean-machines-network.ts` (or any other file) for Langfuse, focus on adding strategic logging points that are valuable for observability and debugging without over-bloating the code. This should include:
    - Network initialization logging with agent count and configuration details.
    - Task execution tracking with a unique task ID, start time, structured logging with metadata (taskId, messageCount, duration, event tags, success boolean).
    - Error handling that preserves context while propagating the original error.
- I'll add a new section for improving the CopilotKit and playground functionality.
- When working with the CopilotKit and playground:
    - Focus on completing the playground functionality with proper CopilotKit integration.
    - Ensure the multi-agent playground works seamlessly with `dean-machines-network.ts` using the CopilotKit route.
    - Optimize `route.ts` for better performance and runtime context, including better error handling and context management.
    - Create reusable components for testing and visualization (agent tester, tool executor, workflow visualizer).
    - Ensure proper integration between Mastra, AGUI, CopilotKit, and the user, following the flow: Mastra -> AGUI -> CopilotKit -> User.
    - Properly integrate the Dean Machines Network with the runtime context types.
    - Enhance the CopilotKit route (`route.ts`) with better AGUI integration.
    - Optimize agent registration and context handling in the Mastra index.
    - Aim for full functionality in the multi-agent playground with network routing.
    - Use shared components across all playground sections for reusability.
    - The flow is Mastra (Backend AI Framework) → AGUI → CopilotKit → User (Frontend).
- When building a dual-memory system with Upstash and Supabase:
  - Use `#file:upstashMemory.ts` for the Upstash backend implementation.
  - Ensure the system can switch between backends.
  - Implement comprehensive error handling and logging.
  - Create tasks for testing and validation.
  - Update environment configuration to support dual-memory requirements.
- When encountering "used before declaration" errors, especially in `upstashMemory.ts`, ensure that class declarations are placed before their instantiation or usage.
- Use `#file://base-network.ts` to reference the base network file.
- When working with Next.js 13+ App Router, be aware of route groups indicated by parentheses in the directory structure (e.g., `(playground)`). Route groups are for organization and do not create URL segments. This means that `src/app/playground)/page.tsx` is accessible at the root `/`, not `/playground`.
- When the user asks to create a main playground dashboard page, ensure the playground route structure is correctly set up in Next.js, considering route groups and potential conflicts with the root page. If a `(playground)` route group exists, the main playground page at `src/app/playground)/page.tsx` will be accessible at the root `/`.
- When the user specifies `#file:playground`, this refers to the `(playground)` route group in Next.js.
- When asked to fix errors in `#file:wikidata-client.ts` and `#file:hacker-news-client.ts`, use the following guidelines:
    - Replace `namespace` with individual type exports using ES2015 module syntax.
    - Replace `any` types with more specific type definitions.
    - Ensure proper handling of Wikidata and Hacker News API response types.
    - Use the `wikibase` and other relevant library types for accurate type definitions.
- When analyzing a `#file:.prompt.md` file:
  - Identify key components, configurations, and agents related to the Dean Machines RSC project.
  - Use the following structure to present the found components:
    ## 🎯 **Core Architecture Components Found**

    ### **1. Mastra AI Framework Integration**
      - **Main Configuration**: `src/mastra/index.ts` - Central Mastra configuration with 22+ agents, workflows, and networks
      - **Agent Memory System**: `src/mastra/agentMemory.ts` - LibSQL/Turso storage with vector search using fastembed
      - **Google AI Provider**: `src/mastra/config/googleProvider.ts` and `src/mastra/config/index.ts` - Traced Google AI models with LangSmith integration

    ### **2. Agent Orchestration System (22+ Agents)**
      **Core Agents:**
      - `src/mastra/agents/master-agent.ts` - Primary orchestrator with comprehensive Zod validation
      - `src/mastra/agents/strategizer-agent.ts` - Strategic planning and decision making
      - `src/mastra/agents/supervisor-agent.ts` - Multi-agent coordination and quality control
      - `src/mastra/agents/analyzer-agent.ts` - Deep analysis and pattern recognition

      **Development Agents:**
      - `src/mastra/agents/code-agent.ts` - Code analysis, generation, and optimization
      - `src/mastra/agents/git-agent.ts` - Version control operations and repository management
      - `src/mastra/agents/debug-agent.ts` - Error detection, troubleshooting, and debugging assistance
      - `src/mastra/agents/documentation-agent.ts` - Technical documentation generation

      **Data & Analysis Agents:**
      - `src/mastra/agents/data-agent.ts` - Data processing and statistical analysis
      - `src/mastra/agents/graph-agent.ts` - Knowledge graph operations and visualization
      - `src/mastra/agents/research-agent.ts` - Information gathering and synthesis
      - `src/mastra/agents/weather-agent.ts` - Weather data retrieval and forecasting

      **Specialized Agents:**
      - `src/mastra/agents/design-agent.ts` - UI/UX design and visual aesthetics
      - `src/mastra/agents/docker-agent.ts` - Containerization and deployment
      - `src/mastra/agents/marketing-agent.ts` - Content creation and marketing
      - `src/mastra/agents/manager-agent.ts` - Project management and coordination
      - `src/mastra/agents/processing-agent.ts` - Data transformation and workflow automation
      - `src/mastra/agents/sysadmin-agent.ts` - System administration and DevOps
      - `src/mastra/agents/browser-agent.ts` - Web automation with Playwright

- When asked to fill out a file (e