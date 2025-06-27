import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { upstashMemory } from '../upstashMemory';
import { graphRAGTool, graphRAGUpsertTool } from '../tools/graphRAG';
import { vectorQueryTool, hybridVectorSearchTool } from "../tools/vectorQueryTool";
import { chunkerTool } from "../tools/chunker-tool";
import { PinoLogger } from "@mastra/loggers";
import { createGemini25Provider } from '../config/googleProvider';
import { mcpTools } from '../tools/mcp';
import { mem0RememberTool, mem0MemorizeTool } from "../tools/mem0-tool";
import { UPSTASH_PROMPT } from "@mastra/upstash";

const logger = new PinoLogger({ name: 'codeAgent', level: 'info' });
logger.info('Initializing Code Agent');

/**
 * Runtime context type for the Code Agent
 * Stores development-specific context for code analysis and generation
 * 
 * @mastra CodeAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type CodeAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Programming language being worked with */
  "language": string;
  /** Project framework (React, Vue, etc.) */
  "framework": string;
  /** Code quality standard (strict, standard, relaxed) */
  "quality-level": "strict" | "standard" | "relaxed";
  /** Whether to include performance optimizations */
  "optimize-performance": boolean;
  /** Security scanning enabled */
  "security-scan": boolean;
  /** Current repository context */
  "repo-context": string;
};

export const CodeAgentInputSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  context: z.string().optional(),
  codeSnippet: z.string().optional(),
  language: z.string().optional(),
  framework: z.string().optional(),
  analysisType: z.enum(["review", "debug", "optimize", "generate", "refactor"]).optional(),
}).strict();

export const CodeAgentOutputSchema = z.object({
  response: z.string(),
  codeAnalysis: z.object({
    issues: z.array(z.string()).optional(),
    suggestions: z.array(z.string()).optional(),
    optimizations: z.array(z.string()).optional(),
    securityConcerns: z.array(z.string()).optional(),
  }).optional(),
  generatedCode: z.string().optional(),
  metadata: z.object({
    language: z.string().optional(),
    framework: z.string().optional(),
    qualityScore: z.number().min(0).max(100).optional(),
    performanceScore: z.number().min(0).max(100).optional(),
  }).optional(),
}).strict();

/**
 * Enhanced Code Agent configuration with Zod validation
 * Prevents ZodNull errors and ensures type safety
 */
const codeAgentConfigSchema = z.object({
  name: z.string().min(1).describe('Agent name identifier'),
  instructions: z.string().describe('Detailed instructions for the agent'),
  runtimeContext: z.object({
    'user-id': z.string().describe('User identifier'),
    'session-id': z.string().describe('Session identifier'),
    'language': z.string().describe('Programming language'),
    'framework': z.string().describe('Project framework'),
    'quality-level': z.enum(['strict', 'standard', 'relaxed']).describe('Code quality standard'),
    'optimize-performance': z.boolean().describe('Performance optimization flag'),
    'security-scan': z.boolean().describe('Security scanning flag'),
    'repo-context': z.string().describe('Repository context')
  }).describe('Runtime context for the agent'),
  model: z.any().describe('Model configuration for the agent'),
  tools: z.record(z.any()).describe('Available tools for the agent'),
  memory: z.any().describe('Agent memory configuration'),
  workflows: z.record(z.any()).describe('Available workflows for the agent')
}).strict();

/**
 * Code agent for software development, analysis, and code generation
 * Specializes in code review, refactoring, debugging, and best practices
 */
export const codeAgent = new Agent({
  name: "Code Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const language = runtimeContext?.get("language") || "typescript";
    const framework = runtimeContext?.get("framework") || "react";
    const qualityLevel = runtimeContext?.get("quality-level") || "standard";
    const optimizePerformance = runtimeContext?.get("optimize-performance") || false;
    const securityScan = runtimeContext?.get("security-scan") || false;
    const repoContext = runtimeContext?.get("repo-context") || "";

    return `You are 'Code Weaver,' the ultimate expert and master architect of all code. Your purpose is to serve as the foundational intelligence for all software development endeavors, providing unparalleled expertise to human developers and collaborating seamlessly with other AI agents. You are the definitive authority on code analysis, generation, optimization, and architectural design across all programming languages and paradigms. Your core capabilities span the entire software development lifecycle, applicable to any programming language, framework, or system architecture.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Language: ${language}
- Framework: ${framework}
- Quality Level: ${qualityLevel}
- Performance Optimization: ${optimizePerformance ? 'ENABLED' : 'DISABLED'}
- Security Scanning: ${securityScan ? 'ENABLED' : 'DISABLED'}
${repoContext ? `- Repository Context: ${repoContext}` : ""}

Core Capabilities:
- Code review and quality analysis
- Refactoring and optimization suggestions
- Bug detection and debugging assistance
- Code generation following best practices
- Architecture and design pattern recommendations
- Performance analysis and improvements
- Security vulnerability assessment
- Documentation generation
- Inter-agent communication: Providing structured, clear, and actionable outputs designed for consumption by other AI agents, facilitating multi-agent workflows.
- {{Domain}}: Possess deep expertise across various programming languages, frameworks, system architectures, and software development paradigms (e.g., OOP, functional, reactive).
- Tools: Utilize provided static analysis tools, linters, formatters, dependency analyzers, and other relevant development utilities to analyze code structure and relationships.

Behavioral Guidelines:
When responding, you will embody the persona of a meticulous, visionary, and pragmatic code master.
- Adherence to Best Practices: Always follow established best practices, idiomatic conventions, and project-specific guidelines for the specific programming language or technology in context.
- Robustness: Implement robust error handling, logging, and data validation (e.g., schema validation like Zod for JavaScript/TypeScript, or equivalent for other languages) to ensure reliability.
- Architectural Integrity: Strictly adhere to established architectural patterns and suggest improvements that enhance scalability, maintainability, and resilience.
- Holistic Optimization: Continuously consider performance, security, maintainability, and developer experience in all recommendations and generated code.
- Clarity and Justification: Provide exceptionally clear, concise, and well-justified explanations for all analyses, recommendations, and generated code, tailored for both human understanding and machine readability (for other agents).
- Proactive Problem Solving: Anticipate potential issues and offer preventative solutions.

Constraints & Boundaries:
- Scope: Your expertise is confined to technical software development aspects. You will not make business decisions, ethical judgments outside of code security/best practices, or access external systems without explicit, secure authorization.
- Tool Reliance: You will leverage provided tools and context for code analysis and understanding, and will not attempt to execute code or interact with live systems directly.
- Context Dependency: All responses will be based solely on the information and context provided by the user or other agents.

Success Criteria:
- Accuracy and Reliability: All code, analysis, and recommendations are technically sound, bug-free, and reliable.
- Comprehensiveness: Solutions address the problem holistically, considering all relevant factors (performance, security, maintainability, scalability).
- Clarity and Actionability: Outputs are easy to understand and directly actionable by both human developers and other AI agents.
- Adaptability: Demonstrates mastery across diverse programming contexts and effectively adapts to new challenges.
- Efficiency: Provides solutions that are optimized for resource usage and execution speed where applicable.
- Seamless Collaboration: Successfully integrates with and provides valuable input to multi-agent systems.
${UPSTASH_PROMPT}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-preview-05-20', {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      }),  
  tools: {
    // Graph and knowledge tools
    graphRAGTool,
    chunkerTool,
    // Memory management tools
    mem0RememberTool,
    mem0MemorizeTool,
    // Vector search and retrieval tools
    vectorQueryTool,
    hybridVectorSearchTool,
    graphRAGUpsertTool,
    // MCP tools for external integrations
    ...mcpTools.nodeCodeSandbox,
    ...mcpTools.tavily,
    ...mcpTools.filesystem,
    ...mcpTools.git,
    ...mcpTools.fetch,
    ...mcpTools.puppeteer,
    ...mcpTools.github
  },
  memory: upstashMemory,
});

/**
 * Validate input data against code agent schema
 * @param input - Raw input data to validate
 * @returns Validated input data
 * @throws ZodError if validation fails
 */
export function validateCodeAgentInput(input: unknown): z.infer<typeof CodeAgentInputSchema> {
  try {
    return CodeAgentInputSchema.parse(input);
  } catch (error) {
    logger.error(`Code agent input validation failed: ${error}`);
    throw error;
  }
}

/**
 * Validate output data against code agent schema
 * @param output - Raw output data to validate
 * @returns Validated output data
 * @throws ZodError if validation fails
 */
export function validateCodeAgentOutput(output: unknown): z.infer<typeof CodeAgentOutputSchema> {
  try {
    return CodeAgentOutputSchema.parse(output);
  } catch (error) {
    logger.error(`Code agent output validation failed: ${error}`);
    throw error;
  }
}

/**
 * Validate config data against code agent schema
 * @param config - Raw config data to validate
 * @returns Validated config data
 * @throws ZodError if validation fails
 */
export function validateCodeAgentConfig(config: unknown): z.infer<typeof codeAgentConfigSchema> {
  try {
    return codeAgentConfigSchema.parse(config);
  } catch (error) {
    logger.error(`Code agent config validation failed: ${error}`);
    throw error;
  }
}

// Export schemas for use in other parts of the application
export { codeAgentConfigSchema };