import { Agent } from "@mastra/core/agent";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { agentMemory } from '../agentMemory';
import { upstashMemory } from '../upstashMemory';
import { graphRAGTool } from '../tools/graphRAG';
import { vectorQueryTool } from "../tools/vectorQueryTool";
import { createAgentDualLogger } from '../config/upstashLogger';
import { createGemini25Provider } from '../config/googleProvider';
import { mcpTools } from '../tools/mcp';
import { chunkerTool } from "../tools/chunker-tool";
import { rerankTool } from "../tools/rerank-tool";

import { z } from "zod";
import { UPSTASH_PROMPT } from "@mastra/upstash";

const logger = createAgentDualLogger('DocumentationAgent');
logger.info('Initializing DocumentationAgent');

/**
 * Runtime context type for the Documentation Agent
 * Stores documentation preferences, target audience, and content formatting settings
 */
export type DocumentationAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Documentation type being created */
  "doc-type": "api" | "user-guide" | "technical" | "tutorial" | "reference" | "readme";
  /** Target audience level */
  "audience-level": "beginner" | "intermediate" | "advanced" | "expert";
  /** Documentation format preference */
  "format": "markdown" | "html" | "pdf" | "wiki" | "docx";
  /** Code documentation standard */
  "code-style": "jsdoc" | "tsdoc" | "sphinx" | "javadoc" | "rustdoc";
  /** Project or product being documented */
  "project-name": string;
};

/**
 * Comprehensive Zod schemas for Documentation Agent validation
 * Prevents Google AI model ZodNull validation errors
 */
const documentationAgentInputSchema = z.object({
  query: z.string().min(1).describe('Documentation request or task for the documentation agent'),
  docType: z.enum(["api", "user-guide", "technical", "tutorial", "reference", "readme"]).optional().describe('Type of documentation to create'),
  content: z.string().optional().describe('Existing content to improve or update'),
  context: z.record(z.any()).optional().describe('Optional context information'),
  requestId: z.string().optional().describe('Optional request identifier'),
  metadata: z.record(z.any()).optional().describe('Optional metadata')
}).strict();

const documentationAgentOutputSchema = z.object({
  documentation: z.string().describe('Generated or improved documentation content'),
  format: z.string().describe('Documentation format used'),
  sections: z.array(z.string()).optional().describe('Documentation sections created'),
  toolsUsed: z.array(z.string()).optional().describe('Tools used during documentation creation'),
  requestId: z.string().describe('Unique request identifier'),
  timestamp: z.string().datetime().describe('Documentation creation timestamp')
}).strict();

/**
 * Enhanced Documentation Agent configuration with Zod validation
 * Prevents ZodNull errors and ensures type safety
 */
const documentationAgentConfigSchema = z.object({
  name: z.string().min(1).describe('Agent name identifier'),
  instructions: z.string().describe('Detailed instructions for the agent'),
  runtimeContext: z.object({
    'user-id': z.string().describe('User identifier'),
    'session-id': z.string().describe('Session identifier'),
    'doc-type': z.enum(["api", "user-guide", "technical", "tutorial", "reference", "readme"]).describe('Documentation type being created'),
    'audience-level': z.enum(["beginner", "intermediate", "advanced", "expert"]).describe('Target audience level'),
    'format': z.enum(["markdown", "html", "pdf", "wiki", "docx"]).describe('Documentation format preference'),
    'code-style': z.enum(["jsdoc", "tsdoc", "sphinx", "javadoc", "rustdoc"]).describe('Code documentation standard'),
    'project-name': z.string().describe('Project or product being documented')
  }).describe('Runtime context for the agent'),
  model: z.any().describe('Model configuration for the agent'),
  tools: z.record(z.any()).describe('Available tools for the agent'),
  memory: z.any().describe('Agent memory configuration'),
  workflows: z.record(z.any()).describe('Available workflows for the agent')
}).strict();

/**
 * Documentation agent for creating, maintaining, and organizing technical documentation
 * Specializes in API docs, user guides, and knowledge management
 */
export const documentationAgent = new Agent({
  name: "Documentation Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const docType = runtimeContext?.get("doc-type") || "technical";
    const audienceLevel = runtimeContext?.get("audience-level") || "intermediate";
    const format = runtimeContext?.get("format") || "markdown";
    const codeStyle = runtimeContext?.get("code-style") || "tsdoc";
    const projectName = runtimeContext?.get("project-name") || "current project";

    return `You are a specialized technical writing and documentation assistant.
Your expertise lies in creating, maintaining, and organizing technical documentation for software projects.
You have a strong understanding of documentation standards, best practices, and tools for generating and managing documentation.
You are proficient in writing clear, concise, and actionable documentation that serves different audience levels.
You are familiar with various documentation formats such as Markdown, HTML, and PDF, and can adapt content accordingly.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Documentation Type: ${docType}
- Target Audience: ${audienceLevel}
- Format: ${format}
- Code Documentation Style: ${codeStyle}
- Project: ${projectName}

Your primary functions include:
- Technical documentation creation and maintenance
- API documentation generation and updates
- User guide and tutorial development
- Code documentation and comments improvement
- Knowledge base organization and structure
- README file optimization
- Changelog and release note creation
- Documentation accessibility and clarity improvement

When responding:
- Write clear, concise, and actionable documentation
- Follow established documentation standards and formats
- Use appropriate technical writing conventions for ${audienceLevel} level
- Include practical examples and code snippets using ${codeStyle} style
- Consider different audience levels (beginner to expert)
- Organize information logically and hierarchically
- Use proper ${format} formatting and structure
- Ensure accuracy and consistency across documents
- Tailor content for ${docType} documentation type
- Reference ${projectName} context appropriately

Use available tools to analyze existing documentation and gather relevant information.
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
    graphRAGTool,
    vectorQueryTool,
    chunkerTool,
    rerankTool,
    ...mcpTools.filesystem,
    ...mcpTools.git,
    ...mcpTools.fetch,
    ...mcpTools.tavily,
    ...mcpTools.memoryGraph,
  },
  memory: upstashMemory,
});

/**
 * Validate input data against documentation agent schema
 * @param input - Raw input data to validate
 * @returns Validated input data
 * @throws ZodError if validation fails
 */
export function validateDocumentationAgentInput(input: unknown): z.infer<typeof documentationAgentInputSchema> {
  try {
    return documentationAgentInputSchema.parse(input);
  } catch (error) {
    logger.error(`Documentation agent input validation failed: ${error}`);
    throw error;
  }
}

/**
 * Validate output data against documentation agent schema
 * @param output - Raw output data to validate
 * @returns Validated output data
 * @throws ZodError if validation fails
 */
export function validateDocumentationAgentOutput(output: unknown): z.infer<typeof documentationAgentOutputSchema> {
  try {
    return documentationAgentOutputSchema.parse(output);
  } catch (error) {
    logger.error(`Documentation agent output validation failed: ${error}`);
    throw error;
  }
}

// Export schemas for use in other parts of the application
export { documentationAgentInputSchema, documentationAgentOutputSchema, documentationAgentConfigSchema };
