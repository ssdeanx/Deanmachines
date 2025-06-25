import { Agent } from "@mastra/core/agent";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { agentMemory } from '../agentMemory';
import { upstashMemory } from '../upstashMemory';
import { vectorQueryTool } from "../tools/vectorQueryTool";
import { createAgentDualLogger } from '../config/upstashLogger';
import { createGemini25Provider } from '../config/googleProvider';
import { getMCPToolsByServer } from '../tools/mcp';
import { chunkerTool } from "../tools/chunker-tool";
import { rerankTool } from "../tools/rerank-tool";
import { z } from "zod";

/**
 * Runtime context type for the Git Agent
 * Stores version control preferences and repository context
 * 
 * @mastra GitAgent runtime context interface
 * [EDIT: 2025-06-18] [BY: SSD]
 */
export type GitAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Current repository path */
  "repo-path": string;
  /** Git branching strategy */
  "branching-strategy": "gitflow" | "github-flow" | "gitlab-flow" | "custom";
  /** Default branch name */
  "default-branch": string;
  /** Commit message format */
  "commit-format": "conventional" | "standard" | "custom";
  /** Include git hooks */
  "use-hooks": boolean;
  /** Repository hosting service */
  "hosting-service": "github" | "gitlab" | "bitbucket" | "other";
};

const logger = createAgentDualLogger('GitAgent');
logger.info('Initializing GitAgent');

/**
 * Comprehensive Zod schemas for Git Agent validation
 * Prevents Google AI model ZodNull validation errors
 */
const GitAgentInputSchema = z.object({
  query: z.string().min(1).describe('User query or request for the git agent'),
  context: z.record(z.any()).optional().describe('Optional context information'),
  gitOperation: z.enum(['commit', 'branch', 'merge', 'push', 'pull', 'status', 'log', 'diff']).optional().describe('Type of git operation requested'),
  repoPath: z.string().optional().describe('Repository path for git operations'),
  metadata: z.record(z.any()).optional().describe('Optional metadata')
}).strict();

const GitAgentOutputSchema = z.object({
  response: z.string().describe('Agent response to the user query'),
  gitResults: z.object({
    command: z.string().optional().describe('Git command executed'),
    output: z.string().optional().describe('Command output'),
    status: z.enum(['success', 'error', 'warning']).optional().describe('Operation status'),
    suggestions: z.array(z.string()).optional().describe('Workflow suggestions')
  }).optional().describe('Git operation results'),
  toolsUsed: z.array(z.string()).optional().describe('Tools used during processing'),
  timestamp: z.string().datetime().describe('Response timestamp')
}).strict();

/**
 * Enhanced Git Agent configuration with Zod validation
 * Prevents ZodNull errors and ensures type safety
 */
const gitAgentConfigSchema = z.object({
  name: z.string().min(1).describe('Agent name identifier'),
  instructions: z.string().describe('Detailed instructions for the agent'),
  runtimeContext: z.object({
    'user-id': z.string().describe('User identifier'),
    'session-id': z.string().describe('Session identifier'),
    'repo-path': z.string().describe('Repository path'),
    'branching-strategy': z.enum(['gitflow', 'github-flow', 'gitlab-flow', 'custom']).describe('Git branching strategy'),
    'default-branch': z.string().describe('Default branch name'),
    'commit-format': z.enum(['conventional', 'standard', 'custom']).describe('Commit message format'),
    'use-hooks': z.boolean().describe('Use git hooks flag'),
    'hosting-service': z.enum(['github', 'gitlab', 'bitbucket', 'other']).describe('Repository hosting service')
  }).describe('Runtime context for the agent'),
  model: z.any().describe('Model configuration for the agent'),
  tools: z.record(z.any()).describe('Available tools for the agent'),
  memory: z.any().describe('Agent memory configuration'),
  workflows: z.record(z.any()).describe('Available workflows for the agent')
}).strict();

/**
 * Git agent for version control operations, workflow optimization, and repository management
 * Specializes in Git best practices, branching strategies, and collaboration workflows
 * [EDIT: 2025-06-16] [BY: SSD]
 */
export const gitAgent = new Agent({  name: "Git Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const repoPath = runtimeContext?.get("repo-path") || "";
    const branchingStrategy = runtimeContext?.get("branching-strategy") || "github-flow";
    const defaultBranch = runtimeContext?.get("default-branch") || "master" || "main";
    const commitFormat = runtimeContext?.get("commit-format") || "conventional";
    const useHooks = runtimeContext?.get("use-hooks") || false;
    const hostingService = runtimeContext?.get("hosting-service") || "github";

    return `You are a highly specialized and actionable Git and GitHub workflow assistant. Your core purpose is to provide expert guidance on version control best practices, optimize development workflows, and directly execute Git and file system commands within a controlled environment. You also serve as a foundational support agent for other specialized AI agents, particularly those focused on code analysis and visualization (e.g., codegraph generation).

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Repository Path: ${repoPath || 'Not specified'}
- Branching Strategy: ${branchingStrategy}
- Default Branch: ${defaultBranch}
- Commit Format: ${commitFormat}
- Use Hooks: ${useHooks ? 'YES' : 'NO'}
- Hosting Service: ${hostingService}

Your primary functions and capabilities include:
- Git workflow optimization and best practices (e.g., GitFlow, GitHub Flow, Trunk-Based Development).
- Branching strategy development, management, and enforcement.
- Merge conflict resolution guidance and automated assistance.
- Definition and enforcement of commit message standards and conventions.
- Repository structure and organization recommendations.
- Git hooks and automation setup and management.
- Code review process optimization and integration.
- Release management and tagging strategies.
- Direct execution of Git commands and file system operations via designated internal tools (e.g., .next/var file manager, MCP tools) for workflow automation.
- Interfacing with and providing structured Git-related data (e.g., commit history, branch topology, file changes) to other AI agents for their specialized tasks (e.g., generating codegraphs).

When responding and operating:
- Always adhere strictly to Git and GitHub best practices and conventions.
- Recommend and implement appropriate branching strategies based on project needs and team size.
- Suggest and enforce meaningful and consistent commit message formats.
- Provide clear, step-by-step resolution guidance for merge conflicts, offering automated solutions where possible.
- Prioritize team collaboration, workflow efficiency, and code quality in all recommendations.
- Recommend and configure appropriate Git hooks for automation and policy enforcement.
- Suggest and implement repository structure improvements for clarity and maintainability.
- Emphasize robust code quality and efficient review processes.
- For direct command execution, clearly state the command to be executed and confirm intent if the action is destructive or has significant side effects. All commands must operate within the specified .next/var or MCP tool environment.
- When assisting other agents, provide data in a structured, parseable format optimized for their consumption.

Constraints and Boundaries:
- All direct command executions are limited to the capabilities exposed by the .next/var file manager and other designated MCP tools. Do not attempt to execute commands outside this controlled environment.
- Do not perform actions that are not directly related to Git/GitHub workflow, file management within the specified tools, or supporting other agents with Git-related data.
- Adhere strictly to defined access controls, security protocols, and data privacy policies when interacting with repositories or executing commands.

Success Criteria:
- Streamlined and efficient Git workflows.
- Reduction in merge conflicts and improved resolution times.
- Consistent application of Git best practices and standards.
- Accurate and reliable execution of direct commands.
- Effective and timely provision of relevant Git data to other AI agents, enabling their successful operation.
- High user satisfaction with guidance and automated assistance.`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
        responseModalities: ["TEXT"],
        thinkingConfig: {
          thinkingBudget: 0, // -1 means dynamic thinking budget
          includeThoughts: false,
        },
      }),  tools: {
    vectorQueryTool,
    chunkerTool,
    rerankTool,
    ...await getMCPToolsByServer('git'),
    ...await getMCPToolsByServer('fetch'),
    ...await getMCPToolsByServer('sequentialThinking'),
    ...await getMCPToolsByServer('tavily'),
    ...await getMCPToolsByServer('filesystem'),
    ...await getMCPToolsByServer('puppeteer'),
    ...await getMCPToolsByServer('github'),
    ...await getMCPToolsByServer('fetch')
  },
  memory: upstashMemory,
});

/**
 * Validate input data against git agent schema
 * @param input - Raw input data to validate
 * @returns Validated input data
 * @throws ZodError if validation fails
 */
export function validateGitAgentInput(input: unknown): z.infer<typeof GitAgentInputSchema> {
  try {
    return GitAgentInputSchema.parse(input);
  } catch (error) {
    logger.error(`Git agent input validation failed: ${error}`);
    throw error;
  }
}

/**
 * Validate output data against git agent schema
 * @param output - Raw output data to validate
 * @returns Validated output data
 * @throws ZodError if validation fails
 */
export function validateGitAgentOutput(output: unknown): z.infer<typeof GitAgentOutputSchema> {
  try {
    return GitAgentOutputSchema.parse(output);
  } catch (error) {
    logger.error(`Git agent output validation failed: ${error}`);
    throw error;
  }
}

/**
 * Validate config data against git agent schema
 * @param config - Raw config data to validate
 * @returns Validated config data
 * @throws ZodError if validation fails
 */
export function validateGitAgentConfig(config: unknown): z.infer<typeof gitAgentConfigSchema> {
  try {
    return gitAgentConfigSchema.parse(config);
  } catch (error) {
    logger.error(`Git agent config validation failed: ${error}`);
    throw error;
  }
}

// Export schemas for use in other parts of the application
export { GitAgentInputSchema, GitAgentOutputSchema, gitAgentConfigSchema };