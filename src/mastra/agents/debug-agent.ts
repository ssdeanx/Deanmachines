import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { graphRAGTool, graphRAGUpsertTool } from '../tools/graphRAG';
import { vectorQueryTool, hybridVectorSearchTool, enhancedVectorQueryTool } from "../tools/vectorQueryTool";
import { chunkerTool } from "../tools/chunker-tool";
import { rerankTool } from "../tools/rerank-tool";
import { PinoLogger } from "@mastra/loggers";
import { createGemini25Provider } from '../config/googleProvider';
import { mcpTools } from '../tools/mcp';
import { UPSTASH_PROMPT } from "@mastra/upstash";

const logger = new PinoLogger({ name: 'debugAgent', level: 'info' });
logger.info('Initializing DebugAgent');

/**
 * Runtime context type for the Debug Agent
 * Stores debugging preferences and error context
 * 
 * @mastra DebugAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type DebugAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Debug verbosity level */
  "debug-level": "minimal" | "standard" | "verbose" | "trace";
  /** Error severity filter */
  "error-severity": "all" | "critical" | "high" | "medium";
  /** Include stack traces */
  "include-stack": boolean;
  /** Environment context */
  "environment": "development" | "staging" | "production";
  /** Application type */
  "app-type": "web" | "mobile" | "desktop" | "api" | "service";
  /** Performance monitoring */
  "monitor-performance": boolean;
};


/**
 * Debug agent for troubleshooting, error analysis, and system diagnostics
 * Specializes in identifying and resolving technical issues across the stack
 */
export const debugAgent = new Agent({
  name: "Debug Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const debugLevel = runtimeContext?.get("debug-level") || "standard";
    const errorSeverity = runtimeContext?.get("error-severity") || "all";
    const includeStack = runtimeContext?.get("include-stack") || true;
    const environment = runtimeContext?.get("environment") || "development";
    const appType = runtimeContext?.get("app-type") || "web";
    const monitorPerformance = runtimeContext?.get("monitor-performance") || false;

    return `You are an expert debugging and troubleshooting assistant.
Your primary focus is on identifying and resolving technical issues across the stack.
You excel at analyzing errors, interpreting stack traces, and diagnosing system problems.
You are capable of providing step-by-step troubleshooting guidance and suggesting improvements to system observability and monitoring.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Debug Level: ${debugLevel}
- Error Severity Filter: ${errorSeverity}
- Include Stack Traces: ${includeStack ? "Yes" : "No"}
- Environment: ${environment}
- Application Type: ${appType}
- Performance Monitoring: ${monitorPerformance ? "Enabled" : "Disabled"}

Your primary functions include:
- Error analysis and root cause identification
- Stack trace interpretation and debugging
- Performance bottleneck identification
- System diagnostic analysis
- Log analysis and pattern recognition
- Memory leak detection and resolution
- Network issue troubleshooting
- Configuration problem solving

When responding:
- Apply systematic debugging methodologies
- Use rubber duck debugging techniques when appropriate
- Provide step-by-step troubleshooting guidance
- Suggest specific logging points for better visibility
- Consider both client-side and server-side issues
- Recommend monitoring and observability improvements
- Help formulate debugging hypotheses
- Guide through elimination processes
- Use ${debugLevel} verbosity level for all diagnostic information
${includeStack ? "- Always include stack trace analysis when available" : ""}
${monitorPerformance ? "- Include performance metrics in debugging analysis" : ""}

Use available tools to analyze system relationships and query relevant information.
${UPSTASH_PROMPT}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      }),  
  tools: {
    graphRAGTool,
    graphRAGUpsertTool,
    vectorQueryTool,
    chunkerTool,
    rerankTool,
    hybridVectorSearchTool,
    enhancedVectorQueryTool,
    ...mcpTools.tavily,
    ...mcpTools.filesystem,
    ...mcpTools.git,
    ...mcpTools.fetch,
    ...mcpTools.puppeteer,
    ...mcpTools.github
  },
  memory: upstashMemory,
});

