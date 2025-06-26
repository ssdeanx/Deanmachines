import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { graphRAGTool, graphRAGUpsertTool } from '../tools/graphRAG';
import { vectorQueryTool, hybridVectorSearchTool, enhancedVectorQueryTool } from "../tools/vectorQueryTool";
import { chunkerTool } from "../tools/chunker-tool";
import { rerankTool } from "../tools/rerank-tool";
import { stockPriceTool } from "../tools/stock-tools";
import { createGemini25Provider } from '../config/googleProvider';
import { mcpTools } from '../tools/mcp';
import { z } from "zod";
import { createAgentDualLogger } from "../config/upstashLogger";
import { UPSTASH_PROMPT } from "@mastra/upstash";

const logger = createAgentDualLogger('DataAgent');
logger.info('Initializing DataAgent');

/**
 * Runtime context type for the Data Agent
 * Stores data processing preferences and analysis context
 * @mastra DataAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type DataAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Data format preference */
  "data-format": "json" | "csv" | "xml" | "parquet" | "auto";
  /** Analysis type */
  "analysis-type": "descriptive" | "predictive" | "prescriptive" | "diagnostic";
  /** Visualization preferences */
  "viz-type": "charts" | "tables" | "graphs" | "mixed";
  /** Data quality threshold */
  "quality-threshold": number;
  /** Include statistical tests */
  "include-stats": boolean;
  /** Data privacy level */
  "privacy-level": "public" | "internal" | "confidential" | "restricted";
};

/**
 * Comprehensive Zod schemas for Data Agent validation
 * Prevents Google AI model ZodNull validation errors
 */
const dataAgentInputSchema = z.object({
  query: z.string().min(1).describe('Data analysis query or request'),
  data: z.any().optional().describe('Input data to analyze'),
  analysisType: z.enum(["descriptive", "predictive", "prescriptive", "diagnostic"]).optional().describe('Type of analysis to perform'),
  format: z.enum(["json", "csv", "xml", "parquet", "auto"]).optional().describe('Data format'),
  context: z.record(z.any()).optional().describe('Optional context information'),
  requestId: z.string().optional().describe('Optional request identifier'),
  metadata: z.record(z.any()).optional().describe('Optional metadata')
}).strict();

const dataAgentOutputSchema = z.object({
  analysis: z.string().describe('Data analysis results and insights'),
  statistics: z.record(z.any()).optional().describe('Statistical analysis results'),
  visualizations: z.array(z.string()).optional().describe('Recommended visualizations'),
  dataQuality: z.object({
    score: z.number().min(0).max(1),
    issues: z.array(z.string()).optional()
  }).optional().describe('Data quality assessment'),
  recommendations: z.array(z.string()).optional().describe('Analysis-based recommendations'),
  toolsUsed: z.array(z.string()).optional().describe('Tools used during analysis'),
  requestId: z.string().describe('Unique request identifier'),
  timestamp: z.string().datetime().describe('Analysis completion timestamp')
}).strict();

/**
 * Enhanced Data Agent configuration with Zod validation
 * Prevents ZodNull errors and ensures type safety
 */
const dataAgentConfigSchema = z.object({
  name: z.string().min(1).describe('Agent name identifier'),
  instructions: z.string().describe('Detailed instructions for the agent'),
  runtimeContext: z.object({
    'user-id': z.string().describe('User identifier'),
    'session-id': z.string().describe('Session identifier'),
    'data-format': z.enum(["json", "csv", "xml", "parquet", "auto"]).describe('Data format preference'),
    'analysis-type': z.enum(["descriptive", "predictive", "prescriptive", "diagnostic"]).describe('Analysis type'),
    'viz-type': z.enum(["charts", "tables", "graphs", "mixed"]).describe('Visualization preferences'),
    'quality-threshold': z.number().min(0).max(1).describe('Data quality threshold'),
    'include-stats': z.boolean().describe('Include statistical tests'),
    'privacy-level': z.enum(["public", "internal", "confidential", "restricted"]).describe('Data privacy level')
  }).describe('Runtime context for the agent'),
  model: z.any().describe('Model configuration for the agent'),
  tools: z.record(z.any()).describe('Available tools for the agent'),
  memory: z.any().describe('Agent memory configuration')
}).strict();

/**
 * Data agent for data analysis, processing, and insights generation
 * Specializes in data manipulation, statistical analysis, and visualization
 */
export const dataAgent = new Agent({
  name: "Data Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const dataFormat = runtimeContext?.get("data-format") || "auto";
    const analysisType = runtimeContext?.get("analysis-type") || "descriptive";
    const vizType = runtimeContext?.get("viz-type") || "charts";
    const qualityThreshold = runtimeContext?.get("quality-threshold") || 0.8;
    const includeStats = runtimeContext?.get("include-stats") || true;
    const privacyLevel = runtimeContext?.get("privacy-level") || "internal";

    return `You are a specialized data analyst and processing assistant.
Your expertise lies in data manipulation, statistical analysis, and visualization.
You are capable of handling various data formats and performing complex analyses to derive insights.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Data Format: ${dataFormat}
- Analysis Type: ${analysisType}
- Visualization Type: ${vizType}
- Quality Threshold: ${qualityThreshold}
- Include Statistics: ${includeStats ? "Yes" : "No"}
- Privacy Level: ${privacyLevel}

Your primary functions include:
- Data analysis and statistical insights
- Data cleaning and preprocessing
- Pattern recognition and trend analysis
- Data visualization recommendations
- Database query optimization
- ETL (Extract, Transform, Load) operations
- Financial and market data analysis
- Predictive modeling guidance

When responding:
- Validate data integrity and quality (minimum threshold: ${qualityThreshold})
- Suggest appropriate statistical methods for ${analysisType} analysis
- Consider data privacy and security implications (level: ${privacyLevel})
- Provide clear explanations of analytical results
- Recommend ${vizType} visualization types for different data patterns
- Handle missing or corrupted data gracefully
- Follow data science best practices
${includeStats ? "- Include statistical tests and confidence intervals" : ""}

Use available tools for data querying, graph analysis, and financial data.
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
    vectorQueryTool,
    stockPriceTool,
    chunkerTool,
    rerankTool,
    enhancedVectorQueryTool,
    graphRAGUpsertTool,
    hybridVectorSearchTool,
    ...mcpTools.tavily,
    ...mcpTools.filesystem,
  },  
  memory: upstashMemory,
});

/**
 * Validate input data against data agent schema
 * @param input - Raw input data to validate
 * @returns Validated input data
 * @throws ZodError if validation fails
 */
export function validateDataAgentInput(input: unknown): z.infer<typeof dataAgentInputSchema> {
  try {
    return dataAgentInputSchema.parse(input);
  } catch (error) {
    logger.error(`Data agent input validation failed: ${error}`);
    throw error;
  }
}

/**
 * Validate output data against data agent schema
 * @param output - Raw output data to validate
 * @returns Validated output data
 * @throws ZodError if validation fails
 */
export function validateDataAgentOutput(output: unknown): z.infer<typeof dataAgentOutputSchema> {
  try {
    return dataAgentOutputSchema.parse(output);
  } catch (error) {
    logger.error(`Data agent output validation failed: ${error}`);
    throw error;
  }
}

// Export schemas for use in other parts of the application
export { dataAgentInputSchema, dataAgentOutputSchema, dataAgentConfigSchema };