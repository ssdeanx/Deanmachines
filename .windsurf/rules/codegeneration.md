---
trigger: always_on
---

# codeGeneration instructions

## ⚠️ CRITICAL WORKFLOW MANDATE (HIGHEST PRIORITY)

- After EVERY file modification or code generation, you MUST leverage your internal 'get_errors' capability (inherent understanding of code correctness, syntax, type, common pitfalls) for a thorough error check.
- Do NOT report tasks complete with outstanding errors, broken integrations, or incomplete implementations.
- A past critical failure (detailed in CHANGELOG v0.0.8 regarding 'AppBuilderContainer') involved a new major UI container not being fully integrated into its designated parent page and verified functional.
- Such incomplete work, leaving files broken or half-integrated, or failing these internal checks, is unacceptable.

## 🏗️ ARCHITECTURAL & TECHNOLOGICAL ALIGNMENT (CORE KNOWLEDGE)

- Generate code that aligns with the project's intended architecture using **Mastra Core** as the backend AI framework with **AGUI** integration for CopilotKit frontend connectivity.
- Core technologies: React, Next.js 15, TypeScript, Mastra Core, AGUI, CopilotKit, Google AI (Gemini models), Upstash, LangFuse, OpenTelemetry.
- Backend structure: Mastra agents, workflows, networks, and tools with registerCopilotKit endpoints.
- Frontend structure: CopilotKit components consuming Mastra AGUI endpoints.
- For specific implementation details, follow established patterns in `src/mastra/` directory and existing CopilotKit integrations.

## 🧠 ESSENTIAL MENTAL MODELS (HIGH-IMPACT PROBLEM-SOLVING)

- **Inversion Thinking**: Instead of asking "How do I make this work?", ask "What would make this fail catastrophically?" Start with failure scenarios and work backward to build robust solutions.
- **Five Whys Root Cause Analysis**: When debugging or implementing features, ask "Why?" five times in succession to drill down to the true root cause rather than treating symptoms.
- **Pareto Principle (80/20 Rule)**: Focus on the 20% of code that delivers 80% of the value. Prioritize core functionality over edge cases.
- **Systems Thinking**: View code as interconnected systems rather than isolated components. Consider how changes ripple through the entire Mastra architecture.
- **Constraint Theory/Bottleneck Analysis**: Identify the one limiting factor that constrains overall system performance rather than optimizing non-bottlenecks.
- **Pre-mortem Analysis**: Before implementing, imagine the feature has failed spectacularly and identify what went wrong to build preventive measures.

## 🚀 MASTRA FRAMEWORK UTILIZATION (PROJECT-SPECIFIC)

- For AI-driven functionality, use **Mastra Core** framework with agents, workflows, and tools.
- Backend endpoints are registered via `registerCopilotKit` in `src/mastra/index.ts` with proper runtime context types.
- Frontend connects via CopilotKit consuming AGUI endpoints (e.g., `/copilotkit/master`, `/copilotkit/strategizer`).
- Use established agent runtime context patterns for proper header-based configuration.
- Follow existing agent registration patterns with proper setContext implementations.

## 🛡️ FUNDAMENTAL REQUIREMENTS (NON-NEGOTIABLE)

## Error Handling & Validation

- For ALL asynchronous operations (e.g., API calls, database interactions), YOU MUST use `async/await`.
- Every `await` call that can potentially reject MUST be wrapped in a `try/catch` block.
- For ALL data structures requiring validation, YOU MUST define and use Zod schemas.
- Validate ALL external inputs rigorously at the earliest boundary.

## Cross-Cutting Concerns (AUTO-INCLUDE)

- Robust error handling (using established patterns and logging)
- Comprehensive tracing for backend operations (OpenTelemetry/Langfuse)
- Standardized logging for significant events and errors
- Rigorous input/output validation using Zod
- Tools output string type

## 📝 COPILOT DIRECTIVE PROCESSING

- When you (the Copilot Chat agent) see comments starting with `// copilot:` in a TypeScript or TSX file, you must:
  - Extract every line between `// copilot: start-task` and `// copilot: end-task` (inclusive).
  - Treat those lines as the **specification** for the very next code block or component.
  - Generate or complete that function or React component exactly according to the spec in those comments.
  - Ignore any other comments that don't begin with `// copilot:`.

## 📚 DOCUMENTATION STANDARD (TSDOC)

- All exported functions, classes, types, and interfaces MUST include comprehensive TSDoc comments.
- Always mark TSDoc with `@param` for parameters and `@returns` for return values.
- Use `@example` for examples of usage where applicable.
- Use `@throws` for exceptions that can be thrown.
- Also put [EDIT: {{date}}] & [BY: {{model}}] at the end of the TSDoc comment to indicate when it was last updated.
- Follow the existing TSDoc style in the project, use Professional grade level of quality, clarity, and completeness.

## 🔧 PROJECT TOOLING STANDARD

- All package management operations MUST use `npm`.
- Avoid `pnpm` or `yarn` unless explicitly instructed for a specific, isolated reason.
- This is a strict project convention

## --- DETAILED IMPLEMENTATION GUIDELINES ---

## TOOL DEVELOPMENT FRAMEWORK

- For new tools, strictly follow the established 'Tool Development Pattern'  (e.g., using Zod for schemas, correct categorization, as documented or observed in the project).
- Ensure tools are correctly exported for the project's tool loading mechanisms.

## NAMING CONVENTION COMPLIANCE

- Strictly adhere to project-defined naming conventions for variables, functions, classes, components, files, etc.
- If unsure, request clarification or infer from existing, well-structured codebase examples.

## CODE QUALITY & REFACTORING (SMELLS)

- Proactively identify and flag common code smells (e.g., overly long methods, large classes, deep nesting, code duplication, dead code).
- Suggest specific refactorings for cleaner, more maintainable code, guided by principles like the **Occam's Razor** mental model.
- For the project's specific stack, watch for relevant smells like prop drilling or inefficient data fetching, and for backend code, issues like N+1 queries in the persistence layer.

## IDENTIFIER GENERATION STANDARD

- Whenever a new unique identifier (ID) is required for any entity (e.g., threads, messages, tools), YOU MUST generate it using the project's standard ID generation function (`import { generateId } from 'ai';`).
- Avoid other UUID libraries or custom methods unless explicitly specified for a distinct purpose like security. Ensure correct import.

## SECURITY BY DESIGN PRINCIPLES

- When generating code, especially for API routes, authentication, tool execution, or user input handling, actively apply 'Security by Design' principles:
  1. Validate ALL external inputs rigorously (e.g., with Zod) at the earliest boundary.
  2. Sanitize data for UI rendering or database queries to prevent injection attacks.
  3. Adhere to the principle of least privilege.
  4. Ensure sensitive configurations (e.g., API keys) are handled securely via environment variables and not exposed client-side.
  5. Be mindful of potential vulnerabilities related to the specific SDKs used (e.g., Mastra Core, AGUI, CopilotKit) as documented in project specifications or current security best practices.

## ENVIRONMENT VARIABLE CONFIGURATION

- All sensitive or environment-specific configurations MUST be loaded from environment variables (e.g., `process.env.VARIABLE_NAME`).
- NEVER hardcode such values.
- Assume configurations are provided via environment variables and ensure a template (e.g., `.env.example`) documents required variables.

## REACT STATE MANAGEMENT (IMMUTABILITY)

- When updating state in React components, particularly for complex data structures (objects/arrays), YOU MUST use immutable update patterns (e.g., object/array spreading, functional `setState`, or project-approved immutable state management libraries).
- Avoid direct state mutation.

## DEPENDENCY MANAGEMENT STRATEGY

- Before introducing new external dependencies (via `npm add` or `npm install`), first evaluate if the required functionality can be achieved effectively with existing project dependencies (e.g., features within Mastra Core, AGUI, CopilotKit, Next.js, React) or native APIs.
- If a new dependency is essential, prioritize well-maintained, reputable libraries with minimal impact.
- If uncertain, prompt for user confirmation before adding.

## CODE GENERATION COMMENTS (METADATA & TODOS)

- For newly generated, complete functions or substantial code blocks, include a comment indicating generation metadata (e.g., '// Generated on [Current Date Time]').
- If code is generated that is known to be incomplete, requires further review, or has placeholders (as per my indication), use a 'TODO:' comment format: '// TODO: [Current Date Time] - [Specific action or issue]'.

## SEMANTIC CODE UNDERSTANDING & NAVIGATION

- When explaining existing code or finding relevant implementations, perform a 'semantic search' based on query intent and context, not just keywords.
- Interpret findings in the context of the project's Mastra-based architecture with AGUI/CopilotKit integration.
- If current code significantly deviates from the documented Mastra patterns, note this as part of the explanation.

## ADVANCED DEBUGGING COLLABORATION

- When assisting with debugging, help formulate hypotheses about root causes using systematic mental models.
- **Apply Five Whys**: Ask "Why?" five times to drill down to root causes rather than treating symptoms.
- **Use Inversion Thinking**: Ask "What would make this fail?" to identify failure modes and build preventive measures.
- **Apply Pareto Analysis**: Focus debugging efforts on the 20% of code that likely causes 80% of the issues.
- **Use Systems Thinking**: Trace issues through the complete system flow (Frontend → CopilotKit → AGUI → Mastra → Database).
- Suggest strategic logging points (using the project's standard logger, with relevant context).
- Guide the debugging process by systematically evaluating interactions between system layers, applying **Rubber Ducking**, **Constraint Analysis**, and **Pre-mortem Analysis** mental models to isolate faults.

## INTERACTIVE DEBUGGING SUPPORT (MENTAL MODEL APPLICATION)

- If an error message and code snippet are provided, assist in a mental step-through of the code execution.
- **Apply Systematic Mental Models**: Use Five Whys, Inversion Thinking, and Systems Thinking to analyze the problem from multiple angles.
- Ask clarifying questions about variable states or expected versus actual behavior.
- **Use Pre-mortem Analysis**: Ask "If this were to fail, what would be the most likely failure modes?"
- **Apply Constraint Analysis**: Identify bottlenecks or limiting factors that could cause the issue.
- If user indicates being stuck, suggest applying relevant mental models (e.g., **Rubber Ducking**, **First Principles Thinking**, **Pareto Analysis**) by prompting them to explain the problematic code section or prioritize debugging efforts.

## PROACTIVE DOCUMENTATION MAINTENANCE

- If significant new features are implemented, major architectural components are refactored, or core technologies are substantially changed (e.g., altering Mastra agents/workflows or introducing new AGUI endpoints), consider prompting the user or making a note about the need to update relevant project documentation, such as the Project Overview in CHANGELOG.md or the technical specification (`instructions.md`), to maintain accuracy.