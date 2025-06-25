import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { upstashMemory } from '../upstashMemory';
import { graphRAGTool } from '../tools/graphRAG';
import { vectorQueryTool, hybridVectorSearchTool } from "../tools/vectorQueryTool";
import { chunkerTool } from "../tools/chunker-tool";
import { rerankTool } from "../tools/rerank-tool";
import { createAgentDualLogger } from '../config/upstashLogger';
import { createGemini25Provider } from '../config/googleProvider';
import { getMCPToolsByServer } from '../tools/mcp';


/**
 * Runtime context type for the Graph Agent
 * Stores graph analysis preferences and relationship context
 * 
 * @mastra GraphAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type GraphAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Graph database type */
  "graph-db": "neo4j" | "memgraph" | "tigergraph" | "arangodb" | "other";
  /** Analysis depth for relationships */
  "max-depth": number;
  /** Node types to include */
  "node-types": string[];
  /** Relationship types to analyze */
  "relationship-types": string[];
  /** Include graph metrics */
  "include-metrics": boolean;
  /** Visualization format */
  "viz-format": "d3" | "cytoscape" | "graphviz" | "networkx" | "reactflow" | "@xyflow/react" | "other";
};

const logger = createAgentDualLogger('GraphAgent');
logger.info('Initializing GraphAgent');

/**
 * Comprehensive Zod schemas for Graph Agent validation
 * Prevents Google AI model ZodNull validation errors
 */
const GraphAgentInputSchema = z.object({
  query: z.string().min(1).describe('User query or request for the graph agent'),
  context: z.record(z.any()).optional().describe('Optional context information'),
  graphData: z.record(z.any()).optional().describe('Optional graph data for analysis'),
  analysisType: z.enum(['relationship', 'structure', 'metrics', 'visualization']).optional().describe('Type of graph analysis requested'),
  metadata: z.record(z.any()).optional().describe('Optional metadata')
}).strict();

const GraphAgentOutputSchema = z.object({
  response: z.string().describe('Agent response to the user query'),
  graphResults: z.object({
    nodes: z.array(z.record(z.any())).optional().describe('Graph nodes'),
    relationships: z.array(z.record(z.any())).optional().describe('Graph relationships'),
    metrics: z.record(z.any()).optional().describe('Graph metrics and analysis'),
    visualization: z.string().optional().describe('Visualization code or configuration')
  }).optional().describe('Graph analysis results'),
  toolsUsed: z.array(z.string()).optional().describe('Tools used during processing'),
  timestamp: z.string().datetime().describe('Response timestamp')
}).strict();

/**
 * Enhanced Graph Agent configuration with Zod validation
 * Prevents ZodNull errors and ensures type safety
 */
const graphAgentConfigSchema = z.object({
  name: z.string().min(1).describe('Agent name identifier'),
  instructions: z.string().describe('Detailed instructions for the agent'),
  runtimeContext: z.object({
    'user-id': z.string().describe('User identifier'),
    'session-id': z.string().describe('Session identifier'),
    'graph-db': z.enum(['neo4j', 'memgraph', 'tigergraph', 'arangodb', 'other']).describe('Graph database type'),
    'max-depth': z.number().describe('Maximum analysis depth'),
    'node-types': z.array(z.string()).describe('Node types to include'),
    'relationship-types': z.array(z.string()).describe('Relationship types to analyze'),
    'include-metrics': z.boolean().describe('Include graph metrics flag'),
    'viz-format': z.enum(['d3', 'cytoscape', 'graphviz', 'networkx', 'reactflow', '@xyflow/react', 'other']).describe('Visualization format')
  }).describe('Runtime context for the agent'),
  model: z.any().describe('Model configuration for the agent'),
  tools: z.record(z.any()).describe('Available tools for the agent'),
  memory: z.any().describe('Agent memory configuration'),
  workflows: z.record(z.any()).describe('Available workflows for the agent')
}).strict();


/**
 * Graph agent for knowledge graph analysis, relationship mapping, and graph-based reasoning
 * Specializes in complex data relationships and graph algorithms
 * [EDIT: 2025-06-16] [BY: ssd]
 */
export const graphAgent = new Agent({
  name: "Graph Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const graphDb = runtimeContext?.get("graph-db") || "neo4j";
    const maxDepth = runtimeContext?.get("max-depth") || 3;
    const nodeTypes = (runtimeContext?.get("node-types") as string[]) || ["Entity", "Concept"];
    const relationshipTypes = (runtimeContext?.get("relationship-types") as string[]) || ["RELATED_TO", "CONNECTED_TO"];
    const includeMetrics = runtimeContext?.get("include-metrics") || true;

    return `You are a highly specialized and authoritative Knowledge Graph Master, specifically an expert in Neo4j graph databases. Your primary role is to construct, manage, analyze, and optimize high-quality knowledge graphs. You serve as the central 'Graph Agent' within a multi-agent system, collaborating seamlessly with other AI agents and directly assisting users in all aspects of knowledge graph operations.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Graph Database: ${graphDb}
- Max Analysis Depth: ${maxDepth}
- Node Types: ${nodeTypes.join(", ")}
- Relationship Types: ${relationshipTypes.join(", ")}
- Include Metrics: ${includeMetrics ? "Yes" : "No"}
- Visualization Format: @xyflow/react

CORE CAPABILITIES:
1.  Knowledge Graph Management (Neo4j Mastery):
    -   Expertly utilize the following Neo4j tools to perform comprehensive CRUD (Create, Read, Update, Delete) operations on knowledge graphs:
        -   'neo4j_create_entities': Create multiple new entities in the knowledge graph.
        -   'neo4j_create_relations': Create multiple new relations between entities. Relations must be in active voice.
        -   'neo4j_add_observations': Add new observations to existing entities.
        -   'neo4j_delete_entities': Delete multiple entities and their associated relations.
        -   'neo4j_delete_observations': Delete specific observations from entities.
        -   'neo4j_delete_relations': Delete multiple relations from the knowledge graph.
        -   'neo4j_read_graph': Read the entire knowledge graph.
        -   'neo4j_search_nodes': Search for nodes in the knowledge graph based on a query.
        -   'neo4j_find_nodes': Find specific nodes in the knowledge graph by their names.
        -   'neo4j_open_nodes': Open specific nodes in the knowledge graph by their names.
2.  Advanced Graph Analysis & Reasoning:
    -   Apply advanced graph theory principles and algorithms (e.g., network analysis, centrality measures, graph traversal, pathfinding, community detection, clustering).
    -   Perform graph-based reasoning and inference to derive complex insights.
    -   Identify key nodes, edges, patterns, and anomalies within networks.
    -   Suggest appropriate graph representations for diverse data types.
    -   Utilize graph metrics (e.g., centrality, clustering coefficient) to provide deep insights.
    -   Recommend effective graph visualization techniques using @xyflow/react format.
    -   Handle both directed and undirected graph scenarios.
3.  Data Integration & Querying:
    -   Integrate and process data for graph ingestion.
    -   Perform vector-based queries on graph data when applicable.

BEHAVIORAL GUIDELINES:
-   Communication Style: Be authoritative, precise, clear, and collaborative. When interacting with other agents, ensure seamless data exchange and understanding. When interacting with users, provide clear explanations and actionable recommendations.
-   Decision-Making: Prioritize graph integrity, data accuracy, and efficiency of operations. Always aim to produce the highest quality, most relevant graph structures. When performing Neo4j operations, strictly adhere to the specified tool functionalities and best practices (e.g., active voice for relations).
-   Error Handling: Identify and report issues in graph construction or analysis clearly. Suggest corrective actions or alternative approaches. If a Neo4j operation fails, provide specific error details.
-   Ethical Considerations: Ensure data privacy and security are maintained, especially when handling sensitive information within the graph. Avoid biases in graph construction or analysis.

CONSTRAINTS & BOUNDARIES:
-   Scope: Focus exclusively on knowledge graph operations, analysis, and optimization, primarily within the ${graphDb} ecosystem. Do not engage in tasks outside of graph-related data management or analysis.
-   Tool Reliance: Strictly use the provided Neo4j tools for all graph modification and querying operations. Do not attempt to directly manipulate the database without these tools.
-   Scalability: Always consider the scalability of graph structures and operations, especially for large datasets.
-   Output Quality: All generated graphs and analyses must be of high quality, accurate, and directly address the user's or agent's request.

SUCCESS CRITERIA:
-   Graph Quality: Production of accurate, well-structured, and semantically rich knowledge graphs.
-   Operational Efficiency: Efficient and correct utilization of Neo4j tools for all graph operations.
-   Insight Generation: Ability to extract meaningful and actionable insights from complex graph data.
-   Collaboration Effectiveness: Seamless and productive interaction with other AI agents and users.
-   User Satisfaction: User feedback indicates high satisfaction with the quality of graphs produced and insights provided.`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
        thinkingConfig: {
          thinkingBudget: -1,
          includeThoughts: true, // Include thoughts for debugging and monitoring purposes
        },
      }),
  tools: {
    graphRAGTool,
    hybridVectorSearchTool,
    vectorQueryTool,
    chunkerTool,
    rerankTool,
    ...await getMCPToolsByServer('neo4j'),
    ...await getMCPToolsByServer('fetch'),
    ...await getMCPToolsByServer('sequentialThinking'),
    ...await getMCPToolsByServer('tavily'),
    ...await getMCPToolsByServer('filesystem'),
    ...await getMCPToolsByServer('git'),
    ...await getMCPToolsByServer('memoryGraph')
  },
  memory: upstashMemory,
});


/**
 * Validate input data against graph agent schema
 * @param input - Raw input data to validate
 * @returns Validated input data
 * @throws ZodError if validation fails
 */
export function validateGraphAgentInput(input: unknown): z.infer<typeof GraphAgentInputSchema> {
  try {
    return GraphAgentInputSchema.parse(input);
  } catch (error) {
    logger.error(`Graph agent input validation failed: ${error}`);
    throw error;
  }
}

/**
 * Validate output data against graph agent schema
 * @param output - Raw output data to validate
 * @returns Validated output data
 * @throws ZodError if validation fails
 */
export function validateGraphAgentOutput(output: unknown): z.infer<typeof GraphAgentOutputSchema> {
  try {
    return GraphAgentOutputSchema.parse(output);
  } catch (error) {
    logger.error(`Graph agent output validation failed: ${error}`);
    throw error;
  }
}

/**
 * Validate config data against graph agent schema
 * @param config - Raw config data to validate
 * @returns Validated config data
 * @throws ZodError if validation fails
 */
export function validateGraphAgentConfig(config: unknown): z.infer<typeof graphAgentConfigSchema> {
  try {
    return graphAgentConfigSchema.parse(config);
  } catch (error) {
    logger.error(`Graph agent config validation failed: ${error}`);
    throw error;
  }
}

// Export schemas for use in other parts of the application
export { GraphAgentInputSchema, GraphAgentOutputSchema, graphAgentConfigSchema };
