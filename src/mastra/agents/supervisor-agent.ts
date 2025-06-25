import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { vectorQueryTool, hybridVectorSearchTool } from "../tools/vectorQueryTool";
import { chunkerTool } from "../tools/chunker-tool";
import { graphRAGTool, graphRAGUpsertTool } from "../tools/graphRAG";
import { createAgentDualLogger } from '../config/upstashLogger';
import { createGemini25Provider } from '../config/googleProvider';
import { getMCPToolsByServer } from '../tools/mcp';
import { z } from 'zod';

/**
 * Runtime context type for the Supervisor Agent
 * Stores agent coordination preferences, delegation rules, and oversight configurations
 */
export type SupervisorAgentRuntimeContext = {
  "user-id": string;
  "session-id": string;
  "agent-count": number;
  "coordination-strategy": "centralized" | "distributed" | "hierarchical" | "collaborative";
  "qa-level": "basic" | "standard" | "rigorous" | "comprehensive";
  "delegation-level": "limited" | "moderate" | "extensive" | "full";
  "escalation-threshold": "low" | "medium" | "high" | "critical-only";
};

const logger = createAgentDualLogger('supervisorAgent');
logger.info('Initializing supervisorAgent');

/**
 * Input validation schema for supervisor agent operations
 * @mastra SupervisorAgent input validation
 */
const supervisorAgentInputSchema = z.object({
  task: z.string().min(1, "Task description is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  agents: z.array(z.string()).min(1, "At least one agent must be specified"),
  deadline: z.string().optional(),
  requirements: z.array(z.string()).default([]),
});

/**
 * Output validation schema for supervisor agent responses
 * @mastra SupervisorAgent output validation
 */
const supervisorAgentOutputSchema = z.object({
  result: z.string(),
  delegations: z.array(z.object({
    agent: z.string(),
    task: z.string(),
    priority: z.string(),
    status: z.enum(["assigned", "in-progress", "completed", "failed"]),
  })).default([]),
  quality_score: z.number().min(0).max(100).optional(),
  recommendations: z.array(z.string()).default([]),
});

/**
 * Configuration schema for supervisor agent instances
 * @mastra SupervisorAgent configuration schema
 */
const supervisorAgentConfigSchema = z.object({
  name: z.string().min(1).describe('Agent name identifier'),
  instructions: z.string().describe('Detailed instructions for the agent'),
  runtimeContext: z.object({
  "user-id": z.string(),
  "session-id": z.string(),
  "agent-count": z.number().int().positive().default(1),
  "coordination-strategy": z.enum(["centralized", "distributed", "hierarchical", "collaborative"]).default("centralized"),
  "qa-level": z.enum(["basic", "standard", "rigorous", "comprehensive"]).default("standard"),
  "delegation-level": z.enum(["limited", "moderate", "extensive", "full"]).default("moderate"),
  "escalation-threshold": z.enum(["low", "medium", "high", "critical-only"]).default("medium"),
  }).describe('Runtime context for the agent'),
  model: z.any().describe('Model configuration for the agent'),
  evals: z.record(z.any()).describe('Evaluation metrics for the agent'),
  tools: z.record(z.any()).describe('Available tools for the agent'),
  memory: z.any().describe('Agent memory configuration'),
  workflows: z.record(z.any()).describe('Available workflows for the agent')
}).strict();


/**
 * Supervisor agent for agent orchestration, coordination, and quality control
 * Specializes in managing multi-agent workflows and ensuring optimal task distribution
 */
export const supervisorAgent = new Agent({
  name: "Supervisor Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const agentCount = runtimeContext?.get("agent-count") || 1;
    const coordinationStrategy = runtimeContext?.get("coordination-strategy") || "collaborative";
    const qaLevel = runtimeContext?.get("qa-level") || "standard";
    const delegationLevel = runtimeContext?.get("delegation-level") || "moderate";
    const escalationThreshold = runtimeContext?.get("escalation-threshold") || "medium";

    return `You are a specialized agent coordination and supervision assistant. Your role is to ensure smooth collaboration and optimal performance among a team of agents. You ensure that agents are working together effectively, and that tasks are completed efficiently and accurately. You have a strong understanding of multi-agent systems, task delegation, and quality assurance.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Agent Count: ${agentCount}
- Coordination Strategy: ${coordinationStrategy}
- Quality Assurance Level: ${qaLevel}
- Delegation Level: ${delegationLevel}
- Escalation Threshold: ${escalationThreshold}

You are proficient in analyzing agent capabilities, monitoring performance, and resolving conflicts between agents. You are familiar with various coordination strategies and can adapt to different agent ecosystems. You have a strong understanding of communication protocols and can facilitate effective information exchange between agents.

Your primary functions include:
- Multi-agent workflow orchestration
- Task delegation and agent selection
- Quality control and output validation
- Agent performance monitoring and optimization
- Conflict resolution between agents
- Resource allocation and load balancing
- Coordination strategy development
- Agent capability assessment and matching

When responding:
- Analyze task requirements and complexity
- Select appropriate agents based on capabilities and workload
- Design efficient multi-agent collaboration workflows
- Monitor agent performance and quality metrics
- Resolve conflicts and coordinate between different agent outputs
- Optimize resource utilization across the agent ecosystem
- Ensure quality standards are maintained
- Provide clear coordination and communication protocols

Use available tools to analyze agent relationships and coordination patterns.`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
    responseModalities: ["TEXT"],
    thinkingConfig: {
      thinkingBudget: 0, // -1 means dynamic thinking budget
      includeThoughts: false, // Include thoughts for debugging and monitoring purposes
    },
    useSearchGrounding: true, // Enable Google Search integration for current events
    // Dynamic retrieval configuration
    dynamicRetrieval: true, // Let model decide when to use search grounding
    // Safety settings level
    safetyLevel: 'OFF', // Options: 'STRICT', 'MODERATE', 'PERMISSIVE', 'OFF'
    // Structured outputs for better tool integration
    structuredOutputs: true, // Enable structured JSON responses
    agentName: 'supervisor',
    tags: [
      // Agent Classification
      'supervisor-agent',
      'orchestrator',
      'problem-solver',
      'enterprise-agent',

      // Capabilities
      'multi-tool',
      'mcp-enabled',
      'graph-rag',
      'vector-search',
      'memory-management',
      'weather-data',
      'stock-data',
      'file-operations',
      'git-operations',
      'web-automation',
      'database-operations',

      // Model Features
      'thinking-disabled',
      'search-grounding',
      'dynamic-retrieval',
      'safety-off',
      'structured-outputs',

      // Scale & Scope
      '50-plus-tools',
      '5-mcp-servers',
      'full-stack-capable',
      'enterprise-scale'
    ],
    metadata: {
      agentType: 'supervisor',
      capabilities: [
        // Core Mastra Tools
        'graph-rag',
        'vector-search',
        'hybrid-vector-search',
        'memory-management',
        'chunker-tool',


        // MCP Server Capabilities (50+ tools across 11 servers)
        'file-operations',      // filesystem MCP
        'git-operations',       // git MCP
        'web-fetch',           // fetch MCP
        'sequential-thinking', // sequentialThinking MCP
        'tavily-search',       // tavily MCP
      ],
      toolCount: '50+', // Actual count with all MCP tools
      coreTools: 8,     // Direct Mastra tools
      mcpServers: 5,   // MCP server count
      mcpServerList: [
        'filesystem',
        'git',
        'fetch',
        'sequentialThinking',
        'tavily',
      ],
      modelConfig: {
        thinkingBudget: 'dynamic',
        safetyLevel: 'OFF',
        searchGrounding: true,
        dynamicRetrieval: true,
        structuredOutputs: true,
        responseModalities: ['TEXT']
      },
      complexity: 'enterprise',
      domain: 'general',
      scope: 'full-stack-development-and-operations'
    },
    traceName: 'supervisor-agent-operations'
  }),
  tools: {
    vectorQueryTool,
    hybridVectorSearchTool,
    chunkerTool,
    graphRAGTool,
    graphRAGUpsertTool,
    ...await getMCPToolsByServer('filesystem'),
    ...await getMCPToolsByServer('git'),
    ...await getMCPToolsByServer('fetch'),
    ...await getMCPToolsByServer('sequentialThinking'),
    ...await getMCPToolsByServer('tavily'),
  },
  memory: upstashMemory,
});

/**
 * Validate input data against supervisor agent schema
 * @param input - Raw input data to validate
 * @returns Validated input data
 * @throws ZodError if validation fails
 */
export function validateSupervisorInput(input: unknown): z.infer<typeof supervisorAgentInputSchema> {
  try {
    return supervisorAgentInputSchema.parse(input);
  } catch (error) {
    logger.error(`Supervisor agent input validation failed: ${error}`);
    throw error;
  }
}


/**
 * Validate output data against supervisor agent schema
 * @param output - Raw output data to validate
 * @returns Validated output data
 * @throws ZodError if validation fails
 */
export function validateSupervisorOutput(output: unknown): z.infer<typeof supervisorAgentOutputSchema> {
  try {
    return supervisorAgentOutputSchema.parse(output);
  } catch (error) {
    logger.error(`Supervisor agent output validation failed: ${error}`);
    throw error;
  }
}

// Export schemas for use in other parts of the application
export { supervisorAgentInputSchema, supervisorAgentOutputSchema, supervisorAgentConfigSchema };
