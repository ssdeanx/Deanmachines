/**
 * Tool Registry and Management
 *
 * This module serves as the central registry for all available tools,
 * handling their initialization, configuration, and export. It assembles
 * core, optional, additional, and extra tools into a lookup map so that agents
 * can easily find and use them.
 *
 * @module Tools
 */

// === Standard library imports ===
import { env } from "process";

// === Third-party imports ===
import { z, ZodType, ZodTypeAny } from "zod"; // Import specific Zod types
import { Tool, createTool } from "@mastra/core/tools"; // Using Mastra core Tool
import { createLogger } from "@mastra/core/logger";
// Note: createMastraTools from @agentic/mastra is used internally by tool modules now

// === Internal tool imports ===
// --- Core & Optional Tools ---
import {
  vectorQueryTool,
  googleVectorQueryTool,
  filteredQueryTool,
} from "./vectorquerytool";
import { createBraveSearchTool } from "./brave-search";
import { createGoogleSearchTool } from "./google-search";
import { createTavilySearchTool } from "./tavily";
import { createMastraExaSearchTools } from "./exasearch";
import { readFileTool, 
  writeToFileTool, 
  writeKnowledgeFileTool, 
  readKnowledgeFileTool, 
  createFileTool, 
  editFileTool, 
  deleteFileTool, 
  listFilesTool,
  listFilesWithWalkTool,
  mkdirTool,
  copyTool, moveTool } from "./readwrite";
import {
  collectFeedbackTool,
  analyzeFeedbackTool,
  applyRLInsightsTool,
} from "./rlFeedback";
import {
  calculateRewardTool,
  defineRewardFunctionTool,
  optimizePolicyTool,
} from "./rlReward";

// --- Additional Tools ---
import { analyzeContentTool, formatContentTool } from "./contentTools";
import { searchDocumentsTool, embedDocumentTool, docxReaderTool, csvReaderTool, jsonReaderTool, extractHtmlTextTool} from "./document-tools";

// --- Extra Tools (Import Helper Functions & Direct Tools) ---

import { createMastraArxivTools } from "./arxiv"; // Import Mastra helper
import { createMastraWikipediaTools } from "./wikibase"; // Import Mastra helper
import { createMastraAISDKTools } from "./ai-sdk"; // Import Mastra helper
import { createMastraE2BTools } from "./e2b"; // Import Mastra helper
import { createGraphRagTool, graphRagQueryTool } from "./graphRag"; // These are Mastra core tools
import { createMastraGitHubTools } from "./github"; // Import Mastra helper
import { createMastraMcpTools } from "./mcptool";
import { github } from "../integrations"; // Used for custom getMainBranchRef
import ExaSearchOutputSchema from "./exasearch";
import { GitHubUserSchema } from "./github"; // Assuming this is the correct export for GitHub user schema
import {
  contextPrecisionEvalTool,
  contextPositionEvalTool,
  toneConsistencyEvalTool,
  keywordCoverageEvalTool,
  answerRelevancyEvalTool,
  faithfulnessEvalTool,
  contentSimilarityEvalTool,
  completenessEvalTool,
  textualDifferenceEvalTool,
  tokenCountEvalTool,
  summarizationEvalTool,
  hallucinationEvalTool,
  toxicityEvalTool,
  biasEvalTool
} from "./evals";
import { tracingTools } from "./tracingTools";
import { createMastraPolygonTools, TickerDetailsSchema } from "./polygon"; // Import Mastra helper for Polygon tools
import { createMastraRedditTools, SubredditPostSchema } from "./reddit"; // Import Mastra helper for Reddit tools
import { puppeteerTool } from "./puppeteerTool"; 
import { hyperAgentTool } from "./hyper-functionCalls";

// === Export all tool modules (Consider if all are needed) ===
export * from "./e2b";
export * from "./exasearch";
export * from "./readwrite";
export * from "./vectorquerytool";
export * from "./rlFeedback";
export * from "./rlReward";
export * from "./github";
export * from "./graphRag";
export * from "./calculator";
export * from "./arxiv";
export * from "./wikibase";
export * from "./ai-sdk";
export * from "./contentTools";
export * from "./document-tools";
export * from "./brave-search";
export * from "./google-search";
export * from "./tavily";
export * from "./tracingTools";
export { ExaSearchOutputSchema };
export { GitHubUserSchema };
export { TickerDetailsSchema };
export { SubredditPostSchema };
export * from "../services/signoz";
export * from "./polygon";
export * from "./reddit";
export * from "./mcptool";
export * from "./puppeteerTool";
export * from "./hyper-functionCalls";

// === Configure Logger ===
const logger = createLogger({ name: "tool-initialization", level: "info" });

// === Environment Configuration ===

/**
 * Schema for environment variables used to initialize tools.
 */
const envSchema = z.object({
  GOOGLE_AI_API_KEY: z.string().min(1, "Google AI API key is required"),
  PINECONE_API_KEY: z.string().min(1, "Pinecone API key is required"),
  PINECONE_INDEX: z.string().default("Default"),
  BRAVE_API_KEY: z.string().optional(),
  EXA_API_KEY: z.string().optional(),
  GOOGLE_CSE_KEY: z.string().optional(),
  GOOGLE_CSE_ID: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  // API keys for extra tools
  E2B_API_KEY: z.string().min(1, "E2B API key is required"),
  GITHUB_API_KEY: z.string().min(1, "GitHub API key is required"),
  POLYGON_API_KEY: z.string().min(1, "Polygon API key is required"), // <-- Added for Polygon
  SMITHERY_API_KEY: z.string().min(1, "Smithery API key is required"),
});

/**
 * Type alias for the validated environment configuration.
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates the environment configuration.
 * @returns {EnvConfig} The validated environment configuration.
 * @throws {Error} When validation fails.
 */
function validateConfig(): EnvConfig {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingKeys = error.errors
        .filter((e) => e.code === "invalid_type" && e.received === "undefined")
        .map((e) => e.path.join("."));
      if (missingKeys.length > 0) {
        logger.error(
          `Missing required environment variables: ${missingKeys.join(", ")}`
        );
      }
    }
    logger.error("Environment validation failed:", { error });
    throw new Error(
      `Failed to validate environment configuration: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// === Initialize Environment Configuration ===
const config: EnvConfig = validateConfig();

// === Custom Tool Definition (Example: GitHub - using Mastra core createTool) ===
// Define a potential type for the GitHub API client (adjust based on actual client)
// This interface reflects the expected structure for the git.getRef method from Octokit REST client
interface GitHubApiClient {
    git: {
        getRef: (options: { owner: string; repo: string; ref: string; [key: string]: any }) => Promise<{ data?: { ref?: string } }>;
        // Add other git methods if needed
    };
    // Add other top-level client methods if needed (e.g., repos, users)
}

export const getMainBranchRef = createTool({ // Using @mastra/core/tools createTool
  id: "getMainBranchRef",
  description: "Fetch the main branch reference from a GitHub repository",
  inputSchema: z.object({
    owner: z.string(),
    repo: z.string(),
  }),
  outputSchema: z.object({
    ref: z.string().optional(),
  }),
  async execute(context) { // Correctly define the execute function signature
    // Cast to unknown first, then to the specific interface to satisfy TS strictness
    const client = (await github.getApiClient()) as unknown as GitHubApiClient;

    // Check for the nested structure
    if (!client || !client.git || typeof client.git.getRef !== 'function') {
        logger.error("GitHub client or git.getRef method not available.");
        throw new Error("GitHub integration is not configured correctly.");
    }

    try {
        // Call the method using the nested structure
        // Access input parameters via context.context
        const mainRef = await client.git.getRef({
            owner: context.context.owner, // Access via context.context
            repo: context.context.repo,   // Access via context.context
            ref: "heads/main", // Common way to reference main branch head
        });
        // Access data safely
        return { ref: mainRef?.data?.ref };
    } catch (error: any) {
        // Handle cases where the ref might not exist (e.g., 404)
        if (error.status === 404) {
            // Use correct context access in logging as well
            logger.warn(`Main branch ref not found for ${context.context.owner}/${context.context.repo}`); // Use context.context
            return { ref: undefined };
        }
        // Use correct context access in logging as well
        logger.error(`Error fetching main branch ref for ${context.context.owner}/${context.context.repo}:`, error); // Use context.context
        throw error; // Re-throw unexpected errors
    }
  },
});

// === Search Tools Initialization ===

/**
 * Record type for search tools.
 */
interface SearchToolRecord {
  [key: string]: Tool<ZodTypeAny, ZodTypeAny> | undefined;
}

/**
 * Helper function to ensure a tool has a valid Zod output schema.
 * Defaults to `z.object({})` if undefined.
 * Needed for tools not created via Mastra helpers (e.g., LlamaIndex, Calculator, Exa).
 */
function ensureToolOutputSchema<
  TInput extends ZodTypeAny,
  TOutput extends ZodTypeAny | undefined
>(tool: Tool<TInput, TOutput>): Tool<TInput, ZodTypeAny> {
  // Check if outputSchema is a valid Zod schema instance
  if (tool.outputSchema && tool.outputSchema instanceof ZodType) {
    // If it is, the type is already correct or compatible
    return tool as Tool<TInput, ZodTypeAny>;
  }
  // If not, provide a default empty object schema
  logger.warn(`Tool "${tool.id}" missing valid output schema, defaulting to empty object.`);
  return {
    ...tool,
    outputSchema: z.object({}).describe("Default empty output"),
  } as Tool<TInput, ZodTypeAny>; // Cast needed after modification
}


/**
 * Initializes search tools based on available API keys.
 */
const searchTools: SearchToolRecord = {
  brave: config.BRAVE_API_KEY
    ? createBraveSearchTool({ apiKey: config.BRAVE_API_KEY })
    : undefined,
  google:
    config.GOOGLE_CSE_KEY && config.GOOGLE_CSE_ID
      ? createGoogleSearchTool({
          apiKey: config.GOOGLE_CSE_KEY,
          searchEngineId: config.GOOGLE_CSE_ID,
        })
      : undefined,
  tavily: config.TAVILY_API_KEY
    ? createTavilySearchTool({ apiKey: config.TAVILY_API_KEY })
    : undefined,
  exa: config.EXA_API_KEY
    ? (() => {
        const exaTool = createMastraExaSearchTools({ apiKey: config.EXA_API_KEY })["exa_search"] as Tool<any, any>;
        // Patch outputSchema directly
        (exaTool as any).outputSchema = ExaSearchOutputSchema;
        return exaTool;
      })()
    : undefined,
};

// === Core Tools Initialization ===

/**
 * Core tools that are always available.
 */
const coreTools: Tool<any, any>[] = [
  vectorQueryTool,
  googleVectorQueryTool,
  filteredQueryTool,
  readFileTool,
  writeToFileTool,
  writeKnowledgeFileTool, 
  readKnowledgeFileTool, 
  createFileTool, 
  editFileTool, 
  deleteFileTool, 
  listFilesTool,
  listFilesWithWalkTool,
  mkdirTool,
  copyTool,
  moveTool,
  hyperAgentTool,
  //pdfReaderTool, 
  docxReaderTool, 
  csvReaderTool,
  jsonReaderTool,
  extractHtmlTextTool, 
  //fetchAndExtractDocumentTool,
  collectFeedbackTool,
  analyzeFeedbackTool,
  applyRLInsightsTool,
  calculateRewardTool,
  defineRewardFunctionTool,
  optimizePolicyTool,
  ensureToolOutputSchema(contextPrecisionEvalTool),
  ensureToolOutputSchema(contextPositionEvalTool),
  ensureToolOutputSchema(toneConsistencyEvalTool),
  ensureToolOutputSchema(keywordCoverageEvalTool),
  ensureToolOutputSchema(answerRelevancyEvalTool),
  ensureToolOutputSchema(faithfulnessEvalTool),
  ensureToolOutputSchema(contentSimilarityEvalTool),
  ensureToolOutputSchema(completenessEvalTool),
  ensureToolOutputSchema(textualDifferenceEvalTool),
  ensureToolOutputSchema(tokenCountEvalTool),
  ensureToolOutputSchema(summarizationEvalTool),
  ensureToolOutputSchema(hallucinationEvalTool),
  ensureToolOutputSchema(toxicityEvalTool),
  ensureToolOutputSchema(biasEvalTool),
];

// === Additional Tools from contentTools and document-tools ===
const additionalTools: Tool<any, any>[] = [
  analyzeContentTool,
  formatContentTool,
  searchDocumentsTool,
  embedDocumentTool,
];

// === Extra Tools Initialization ===
const extraTools: Tool<any, any>[] = [];

// --- E2B Tools (using Mastra helper) ---
try {
    const e2bToolsObject = createMastraE2BTools(); // Use the helper from e2b.ts, returns an object
    const e2bToolsArray = Object.values(e2bToolsObject); // Extract tool values into an array
    // Cast to Tool<any, any> to resolve potential type mismatches
    extraTools.push(...e2bToolsArray.map(tool => tool as Tool<any, any>));
    logger.info(`Added ${e2bToolsArray.length} E2B tools.`);
} catch (error) {
    logger.error("Failed to initialize E2B tools:", { error });
}

// --- LlamaIndex Tools ---
// --- Start Comment Out LlamaIndex ---
/*
try {
    const llamaIndexArrayRaw = await createLlamaIndexTools();
    if (Array.isArray(llamaIndexArrayRaw)) {
      const llamaIndexTools = llamaIndexArrayRaw.map(llamaTool => {
          // ... (adaptation logic) ...
          let inputSchemaInstance: z.ZodSchema | undefined = undefined;
          if (llamaTool.metadata.parameters && llamaTool.metadata.parameters instanceof z.ZodSchema) {
              inputSchemaInstance = llamaTool.metadata.parameters;
          } else {
              logger.warn(`LlamaIndex tool "${llamaTool.metadata.name}" has invalid or missing parameters schema. Defaulting to z.any().`);
              inputSchemaInstance = z.any().describe("Input schema was missing or invalid.");
          }
          const mastraTool: Tool<any, any> = {
              id: llamaTool.metadata.name,
              description: llamaTool.metadata.description,
              inputSchema: inputSchemaInstance,
              execute: llamaTool.call as any,
          };
          return ensureToolOutputSchema(mastraTool);
      });
      extraTools.push(...llamaIndexTools);
      logger.info(`Added ${llamaIndexTools.length} LlamaIndex tools.`);
    } else {
        logger.warn("createLlamaIndexTools did not return an array.");
    }
} catch (error) {
    logger.error("Failed to initialize LlamaIndex tools:", { error });
}
*/
// --- End Comment Out LlamaIndex ---

// --- MCP Tools (using Mastra helper, async initialization) ---
try {
    // Note: If this file is not top-level async, you must move this to an async setup/init function!
    // For top-level await (ESM), this works as-is.
    const mcpToolsObject = await createMastraMcpTools();
    const mcpToolsArray = Object.values(mcpToolsObject);
    extraTools.push(...mcpToolsArray.map(tool => tool as Tool<any, any>));
    logger.info(`Added ${mcpToolsArray.length} MCP tools.`);
} catch (error) {
    logger.error("Failed to initialize MCP tools:", { error });
}

// --- Arxiv Tools (using Mastra helper) ---
try {
    const arxivToolsObject = createMastraArxivTools(); // Use the helper from arxiv.ts
    const arxivToolsArray = Object.values(arxivToolsObject); // Extract tool values into an array
    // Cast to Tool<any, any> to resolve potential type mismatches
    extraTools.push(...arxivToolsArray.map(tool => tool as Tool<any, any>));
    logger.info(`Added ${arxivToolsArray.length} Arxiv tools.`);
} catch (error) {
    logger.error("Failed to initialize Arxiv tools:", { error });
}

// --- AI SDK Tools (using Mastra helper) ---
// Assuming createMastraAISDKTools() in ai-sdk.ts correctly finds/uses AIFunctionLike[]
try {
    const aisdkToolsObject = createMastraAISDKTools(); // Helper likely returns an object
    const aisdkToolsArray = Object.values(aisdkToolsObject); // Extract tool values into an array
    // Cast to Tool<any, any> to resolve potential type mismatches
    extraTools.push(...aisdkToolsArray.map(tool => tool as Tool<any, any>));
    logger.info(`Added ${aisdkToolsArray.length} AI SDK tools (via Mastra helper).`);
} catch (error) {
    logger.error("Failed to initialize AI SDK tools:", { error });
}

// --- Wikipedia Tools (using Mastra helper) ---
try {
  const wikiToolsObject = createMastraWikipediaTools(); // Use the helper from wikibase.ts
  const wikiToolsArray = Object.values(wikiToolsObject); // Extract tool values
  // Cast to Tool<any, any> to resolve potential type mismatches
  extraTools.push(...wikiToolsArray.map(tool => tool as Tool<any, any>));
  logger.info(`Added ${wikiToolsArray.length} Wikipedia tools.`);
} catch (error) {
  logger.error("Failed to initialize Wikipedia tools:", { error });
}

// --- GraphRag Tools (Mastra core tools, need schema check) ---
try {
    // Add the main GraphRag tools if they are valid Tool objects
    if (createGraphRagTool && typeof createGraphRagTool === 'object' && 'id' in createGraphRagTool) {
        extraTools.push(ensureToolOutputSchema(createGraphRagTool as Tool<any, any>)); // Schema check
    } else { logger.warn("createGraphRagTool is not a valid Tool object."); }

    if (graphRagQueryTool && typeof graphRagQueryTool === 'object' && 'id' in graphRagQueryTool) {
        extraTools.push(ensureToolOutputSchema(graphRagQueryTool as Tool<any, any>)); // Schema check
    } else { logger.warn("graphRagQueryTool is not a valid Tool object."); }

    // Create and add the 'graph-rag' alias
    if (createGraphRagTool && typeof createGraphRagTool === 'object' && 'id' in createGraphRagTool) {
      const baseTool = createGraphRagTool as Tool<any, any>;
      const graphRagAliasTool: Tool<any, any> = { ...baseTool, id: "graph-rag" };
      extraTools.push(ensureToolOutputSchema(graphRagAliasTool)); // Schema check
      logger.info("Added GraphRag tools and 'graph-rag' alias.");
    } else {
      logger.warn("Could not create 'graph-rag' alias: createGraphRagTool is not valid.");
    }
} catch (error) {
    logger.error("Failed to initialize GraphRag tools:", { error });
}

// --- Polygon Tools (using Mastra helper) ---
try {
    const polygonToolsObject = createMastraPolygonTools({ apiKey: config.POLYGON_API_KEY });
    const polygonToolsArray = Object.values(polygonToolsObject);
    extraTools.push(...polygonToolsArray.map(tool => tool as Tool<any, any>));
    logger.info(`Added ${polygonToolsArray.length} Polygon tools.`);
} catch (error) {
    logger.error("Failed to initialize Polygon tools:", { error });
}

// --- Reddit Tools (using Mastra helper) ---
try {
    const redditToolsObject = createMastraRedditTools();
    const redditToolsArray = Object.values(redditToolsObject);
    extraTools.push(...redditToolsArray.map(tool => tool as Tool<any, any>));
    logger.info(`Added ${redditToolsArray.length} Reddit tools.`);
} catch (error) {
    logger.error("Failed to initialize Reddit tools:", { error });
}

// --- LLM Chain Tools ---
// --- Start Comment Out LLM Chain ---
/*
try {
    const llmChainToolsObject = createMastraLLMChainTools();
    const llmChainToolsArray = Object.values(llmChainToolsObject);

    const processedLLMTools = llmChainToolsArray.map(tool => {
        let validatedTool = { ...tool } as Tool<any, any>;
        // ... (explicit schema assignment logic) ...
         if (validatedTool.id === 'llm-chain') {
            // ... schema checks ...
        } else if (validatedTool.id === 'ai-sdk-prompt') {
            // ... schema checks ...
        } else {
            // ... warning and schema check ...
        }
        // ... final validation and return null if invalid ...
        return validatedTool;
    }).filter((tool): tool is Tool<any, any> => tool !== null);

    extraTools.push(...processedLLMTools);
    logger.info(`Added ${processedLLMTools.length} LLM Chain tools.`);
} catch (error) {
    logger.error("Failed to initialize LLM Chain tools:", { error });
}
*/
// --- End Comment Out LLM Chain ---

// --- GitHub Tools (using Mastra helper) ---
try {
    const githubToolsObject = createMastraGitHubTools(); // Use the helper from github.ts
    const githubToolsArray = Object.values(githubToolsObject); // Extract tool values
    // Cast to Tool<any, any> to resolve potential type mismatches
    extraTools.push(...githubToolsArray.map(tool => tool as Tool<any, any>));
    logger.info(`Added ${githubToolsArray.length} GitHub tools (via Mastra helper).`);
} catch (error) {
    logger.error("Failed to initialize GitHub tools:", { error });
}

// Add getMainBranchRef to extraTools
extraTools.push(ensureToolOutputSchema(getMainBranchRef));

// Add tracing tools to extraTools
extraTools.push(...tracingTools);

extraTools.push(ensureToolOutputSchema(puppeteerTool));

// === Filter Optional Search Tools ===
const optionalTools: Tool<any, any>[] = Object.values(
  searchTools
).filter(
  (tool): tool is Tool<any, any> => tool !== undefined
);

// === Aggregate All Tools ===

// --- Start Debug Logging ---
const combinedToolsForDebug = [
    ...coreTools,
    ...optionalTools,
    ...additionalTools,
    ...extraTools,
];

logger.info(`Checking ${combinedToolsForDebug.length} tools before final aggregation...`);
combinedToolsForDebug.forEach((tool, index) => {
    if (!tool || typeof tool !== 'object') {
        logger.error(`Tool at index ${index} is invalid (undefined or not an object).`);
        return;
    }
    const toolId = tool.id || `(missing id at index ${index})`;
    if (!tool.inputSchema || !(tool.inputSchema instanceof z.ZodSchema)) {
        logger.error(`Tool "${toolId}" is missing a valid Zod inputSchema.`);
    }
    if (!tool.outputSchema || !(tool.outputSchema instanceof z.ZodSchema)) {
        // This should be less common due to ensureToolOutputSchema, but check anyway
        logger.warn(`Tool "${toolId}" is missing a valid Zod outputSchema (after potential patching).`);
    }
    if (typeof tool.execute !== 'function') {
        logger.error(`Tool "${toolId}" is missing an execute function.`);
    }
    // Optional: Log the schema structure itself for more detail, but can be verbose
    // try {
    //     logger.debug(`Tool "${toolId}" input schema structure:`, JSON.stringify(tool.inputSchema?.toJSON(), null, 2));
    // } catch (e) {
    //     logger.error(`Tool "${toolId}" input schema could not be stringified:`, e);
    // }
});
logger.info(`Finished checking tools.`);
// --- End Debug Logging ---


/**
 * Complete collection of all available tools (core + optional + additional + extra).
 */
export const allTools: readonly Tool<any, any>[] =
  Object.freeze([ // Use the combined array directly
    ...combinedToolsForDebug
  ]);

/**
 * Map for efficient lookup of tools by their ID.
 */
export const allToolsMap: ReadonlyMap<
  string,
  Tool<any, any>
> = new Map(
    allTools
      .filter((tool): tool is Tool<any, any> & { id: string } => { // Filter out invalid tools first
        if (!tool || !tool.id) {
          logger.error("Attempting to map an invalid tool without an ID.");
          return false;
        }
        return true;
      })
      .map((tool) => [tool.id, tool] as const) // Map valid tools to [id, tool] tuples
  );

/**
 * Grouped tools by category for easier access.
 */
export const toolGroups = {
  search: optionalTools,
  vector: [vectorQueryTool, googleVectorQueryTool, filteredQueryTool],
  file: [readFileTool, writeToFileTool],
  memory: [vectorQueryTool],
  rl: [
    collectFeedbackTool,
    analyzeFeedbackTool,
    applyRLInsightsTool,
    calculateRewardTool,
    defineRewardFunctionTool,
    optimizePolicyTool,
  ],
  content: additionalTools.filter(t => ['analyzeContentTool', 'formatContentTool'].includes(t.id)),
  document: additionalTools.filter(t => ['searchDocumentsTool', 'embedDocumentTool'].includes(t.id)),
  github: [getMainBranchRef, ...extraTools.filter(t => t.id.startsWith('github_'))], // Group custom and provider tools
  extra: extraTools, // Contains all tools added above
};

// === Log Initialization Results ===
logger.info(`Initialized ${allTools.length} tools successfully.`);
logger.info(
  `Search tools available: ${
    toolGroups.search.map((t) => t.id).join(", ") || "none"
  }`
);
// Add specific checks for included tools based on expected IDs from helpers
logger.info(`GraphRag tools included: ${extraTools.some(t => t.id.startsWith('graphRag') || t.id === 'createGraphRagTool' || t.id === 'graph-rag')}`);
logger.info(`LLMChain tools included: ${extraTools.some(t => t.id === 'llm-chain' || t.id === 'ai-sdk-prompt')}`); // Updated check
logger.info(`E2B tools included: ${extraTools.some(t => t.id.startsWith('e2b_'))}`); // Assuming helper creates IDs like 'e2b_...'
logger.info(`Arxiv tools included: ${extraTools.some(t => t.id.startsWith('arxiv_'))}`); // Assuming helper creates IDs like 'arxiv_...'
logger.info(`AI SDK tools included: ${extraTools.some(t => t.id.startsWith('ai-sdk_'))}`); // Assuming helper creates IDs like 'ai-sdk_...'


// For backward compatibility.
export { allToolsMap as toolMap };
export { toolGroups as groups };

export default allToolsMap;

export type toolIds = keyof typeof allTools; // Type for tool IDs

/**
 * Thread manager for conversation/session management and tracing.
 */
export { threadManager } from "../utils/thread-manager";

/**
 * If your tool needs to be thread-aware (e.g., maintains state or needs tracing),
 * accept a `threadId` as part of the input schema and log it in all actions.
 * Example:
 *   inputSchema: z.object({ ... , threadId: z.string() })
 *   // In your execute function:
 *   logger.info({ event: "tool.execute", tool: "myTool", threadId, ... })
 */

const threadEchoLogger = createLogger({ name: "thread-echo-tool", level: "info" });

/**
 * Thread-aware tool for echoing threadId and message for tracing/debugging.
 */
export const threadEchoTool = createTool({
  id: "thread-echo",
  description: "Echoes the threadId for tracing and debugging.",
  inputSchema: z.object({
    threadId: z.string(),
    message: z.string(),
  }),
  outputSchema: z.object({
    echoedThreadId: z.string(),
    message: z.string(),
  }),
  async execute({ context }) {
    threadEchoLogger.info(JSON.stringify({
      event: "tool.execute",
      tool: "thread-echo",
      threadId: context.threadId,
      message: context.message,
    }));
    return {
      echoedThreadId: context.threadId,
      message: context.message,
    };
  },
});

// Add to coreTools for registration
coreTools.push(threadEchoTool);
