import { MCPClient } from "@mastra/mcp";
import { PinoLogger } from '@mastra/loggers';
import { z } from 'zod';
import { env } from '../config/environment';


const logger = new PinoLogger({ name: 'mcp', level: 'info' });

/**
 * Transform Zod schemas to remove ZodNull types that Google AI models don't support
 * Converts ZodNull to optional strings to maintain compatibility
 * @param schema - Any Zod schema object
 * @returns Transformed schema without ZodNull types
 */
function transformSchemaForGoogleAI(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const schemaObj = schema as Record<string, unknown>;

  // Handle different Zod schema types
  if (schemaObj._def) {
    const defObj = schemaObj._def as Record<string, unknown>;
    const typeName = defObj.typeName;

    // Replace ZodNull with optional string
    if (typeName === 'ZodNull') {
      return z.string().optional().describe('Converted from null for Google AI compatibility');
    }

    // Handle ZodUnion that might contain ZodNull
    if (typeName === 'ZodUnion' && defObj.options) {
      const options = defObj.options as unknown[];
      const filteredOptions = options
        .map((option: unknown) => transformSchemaForGoogleAI(option))        .filter((option: unknown) => {
          const optionObj = option as Record<string, unknown>;
          const optionDef = optionObj._def as Record<string, unknown>;
          return optionDef?.typeName !== 'ZodNull';
        });

      if (filteredOptions.length === 1) {
        return (filteredOptions[0] as z.ZodTypeAny).optional();
      } else if (filteredOptions.length > 1) {
        return z.union(filteredOptions as [z.ZodTypeAny, z.ZodTypeAny, ...z.ZodTypeAny[]]);
      } else {
        return z.string().optional().describe('Converted from null union for Google AI compatibility');
      }
    }

    // Handle ZodOptional
    if (typeName === 'ZodOptional') {
      return z.optional(transformSchemaForGoogleAI(defObj.innerType) as z.ZodTypeAny);
    }

    // Handle ZodObject
    if (typeName === 'ZodObject' && defObj.shape) {
      const shapeFunc = defObj.shape as () => Record<string, unknown>;
      const shape = shapeFunc();
      const transformedShape: Record<string, z.ZodTypeAny> = {};
      for (const [key, value] of Object.entries(shape)) {
        transformedShape[key] = transformSchemaForGoogleAI(value) as z.ZodTypeAny;
      }
      return z.object(transformedShape);
    }

    // Handle ZodArray
    if (typeName === 'ZodArray') {
      return z.array(transformSchemaForGoogleAI(defObj.type) as z.ZodTypeAny);
    }

    // Handle ZodRecord
    if (typeName === 'ZodRecord') {
      if (defObj.valueType) {
        return z.record(transformSchemaForGoogleAI(defObj.valueType) as z.ZodTypeAny);
      }
      return schema;
    }
  }

  // Handle plain objects that might contain schemas
  if (typeof schema === 'object' && !Array.isArray(schema)) {
    const transformed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schemaObj)) {
      transformed[key] = transformSchemaForGoogleAI(value);
    }
    return transformed;
  }

  // Handle arrays
  if (Array.isArray(schema)) {
    return schema.map(item => transformSchemaForGoogleAI(item));
  }

  return schema;
}

/**
 * Transform MCP tools to remove ZodNull types and ensure Google AI compatibility
 * @param tools - Raw MCP tools object
 * @returns Transformed tools compatible with Google AI models
 */
function transformMCPToolsForGoogleAI(tools: Record<string, unknown>): Record<string, unknown> {
  const transformedTools: Record<string, unknown> = {};

  for (const [toolName, tool] of Object.entries(tools)) {
    if (tool && typeof tool === 'object') {
      const toolObj = tool as Record<string, unknown>;
      const transformedTool = { ...toolObj };

      // Transform input schema if present
      if (transformedTool.inputSchema) {
        transformedTool.inputSchema = transformSchemaForGoogleAI(transformedTool.inputSchema);
      }

      // Transform output schema if present
      if (transformedTool.outputSchema) {
        transformedTool.outputSchema = transformSchemaForGoogleAI(transformedTool.outputSchema);
      }

      // Transform any other schema fields
      if (transformedTool.schema) {
        transformedTool.schema = transformSchemaForGoogleAI(transformedTool.schema);
      }

      transformedTools[toolName] = transformedTool;
      logger.debug(`Transformed tool ${toolName} for Google AI compatibility`);
    }
  }

  return transformedTools;
}

/**
 * Mastra MCPClient - Proper implementation following Mastra documentation
 * Replaces the custom MCP wrapper with the official Mastra MCPClient
 */
export const mcpClient = new MCPClient({
  id: 'deanmachines-mcp-client',
  timeout: 60000,
  servers: {
    filesystem: {
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "C:\\Users\\dm\\Documents\\deanmachines-rsc\\data",
      ],
      timeout: 60000,
      enableServerLogs: true,
      logger: (logMessage) => {
        logger.info(`[MCP:filesystem] ${logMessage.message}`, { level: logMessage.level });
      }
    },
    git: {
      command: "uvx",
      args: ["mcp-server-git", "--repository", "C:\\Users\\dm\\Documents\\deanmachines-rsc"],
      timeout: 60000,
      enableServerLogs: true,
      logger: (logMessage) => {
        logger.info(`[MCP:git] ${logMessage.message}`, { level: logMessage.level });
      }
    },
    fetch: {
      command: "uvx",
      args: ["mcp-server-fetch"],
      timeout: 60000,
      enableServerLogs: true,
      logger: (logMessage) => {
        logger.info(`[MCP:fetch] ${logMessage.message}`, { level: logMessage.level });
      }
    },
    puppeteer: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-puppeteer"],
      timeout: 60000,
      enableServerLogs: true,
      logger: (logMessage) => {
        logger.info(`[MCP:puppeteer] ${logMessage.message}`, { level: logMessage.level });
      }
    },
//    githubchat: {
//      command: "uvx",
//      args: ["github-chat-mcp"],
//      env: {
//        GITHUB_TOKEN: process.env.GITHUB_TOKEN! || ""
//      },
//      timeout: 60000,
//      enableServerLogs: true,
//      logger: (logMessage) => {
//        logger.info(`[MCP:githubchat] ${logMessage.message}`, { level: logMessage.level });
//      }
//    },
    github: {
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-github"
      ],
      env: {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN! || ""
      },
      timeout: 75000,
      enableServerLogs: true,
      logger: (logMessage) => {
        logger.info(`[MCP:github] ${logMessage.message}`, { level: logMessage.level });
      }
    },
    memoryGraph: {
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-memory"
      ],
      env: {
        "MEMORY_FILE_PATH": "C:\\Users\\dm\\Documents\\deanmachines-rsc\\graphs.json"
      },
      timeout: 75000,
      enableServerLogs: true,
      logger: (logMessage) => {
        logger.info(`[MCP:memoryGraph] ${logMessage.message}`, { level: logMessage.level });
      }
    },
    ddgsearch: {
      command: "uvx",
      args: ["duckduckgo-mcp-server"],
      timeout: 75000,
      enableServerLogs: true,
      logger: (logMessage) => {
        logger.info(`[MCP:ddgsearch] ${logMessage.message}`, { level: logMessage.level });
      }
    },
    neo4j: {
      command: "uvx",
      args: [ "mcp-neo4j-memory@0.1.4" ],
      env: {
        "NEO4J_URL": env.NEO4J_URL,
        "NEO4J_USERNAME": env.NEO4J_USERNAME,
        "NEO4J_PASSWORD": env.NEO4J_PASSWORD
    },
    timeout: 75000,
      enableServerLogs: true,
      logger: (logMessage) => {
        logger.info(`[MCP:neo4j] ${logMessage.message}`, { level: logMessage.level });
      }
    },
    sequentialThinking: {
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-sequential-thinking"
      ],
      timeout: 75000,
      enableServerLogs: true,
      logger: (logMessage) => {
        logger.info(`[MCP:sequentialThinking] ${logMessage.message}`, { level: logMessage.level });
      }
    },
    tavily: {
      command: "npx",
      args: [
        "-y",
        "tavily-mcp@0.2.4"
      ],
      env: {
        TAVILY_API_KEY: process.env.TAVILY_API_KEY! || ""
      },
      timeout: 75000,
      enableServerLogs: true,
      logger: (logMessage) => {
        logger.info(`[MCP:tavily] ${logMessage.message}`, { level: logMessage.level });
      }
    },
    nodeCodeSandbox: {
      command: "docker",
        args: [
          "run",
          "-i",
          "--rm",
          "-v",
          "/var/run/docker.sock:/var/run/docker.sock",
          "-v",
          "C:\\Users\\dm\\Documents\\node-code-sandbox-mcp\\workspace:/workspace",
          "--env-file",
          "C:\\Users\\dm\\Documents\\node-code-sandbox-mcp\\.env",
          "node-code-sandbox-mcp"
        ],
        timeout: 75000,
        enableServerLogs: true,
        logger: (logMessage) => {
          logger.info(`[MCP:nodeCodeSandbox] ${logMessage.message}`, { level: logMessage.level });
        }
    },
    docker: {
      command: "uvx",
      args: [
          "mcp-server-docker"
      ],
      env: {
        DOCKER_HOST: "tcp://localhost:2375"
      },
    timeout: 75000,
    enableServerLogs: true,
    logger: (logMessage) => {
      logger.info(`[MCP:docker] ${logMessage.message}`, { level: logMessage.level });
    }
  }
//  terminalController: {
//    command: "uvx",
//    args: ["terminal_controller", "C:\\Users\\dm\\Documents\\deanmachines-rsc\\.next\\var"],
//    timeout: 60000,
//    enableServerLogs: true,
//    logger: (logMessage) => {
//      logger.info(`[MCP:terminalController] ${logMessage.message}`, { level: logMessage.level });
//    }
//  }
//    docker: {
//      command: "docker",
//      args: ["run", "-i", "--rm", "alpine/socat", "STDIO", "TCP:host.docker.internal:8811"],
//      timeout: 25000,
//      enableServerLogs: true,
//      logger: (logMessage) => {
//        logger.info(`[MCP:docker] ${logMessage.message}`, { level: logMessage.level });
//      }
//    },
},
});

/**
 * Enhanced MCP interface with Google AI compatibility
 * Wraps the MCPClient to ensure ZodNull types are transformed
 */
export const mcp = {
  /**
   * Get all tools with Google AI compatibility transformations
   */
  async getTools(): Promise<Record<string, unknown>> {
    const rawTools = await mcpClient.getTools();
    return transformMCPToolsForGoogleAI(rawTools);
  },

  /**
   * Get toolsets with Google AI compatibility transformations
   */
  async getToolsets(): Promise<Record<string, unknown>> {
    const rawToolsets = await mcpClient.getToolsets();
    const transformedToolsets: Record<string, unknown> = {};

    for (const [serverName, toolset] of Object.entries(rawToolsets)) {
      if (toolset && typeof toolset === 'object') {
        transformedToolsets[serverName] = transformMCPToolsForGoogleAI(toolset as Record<string, unknown>);
      }
    }

    return transformedToolsets;
  },

  /**
   * Disconnect from MCP servers
   */
  async disconnect(): Promise<void> {
    return await mcpClient.disconnect();
  },

  /**
   * Access to resources (pass-through)
   */
  resources: mcpClient.resources,

  /**
   * Access to prompts (pass-through)
   */
  prompts: mcpClient.prompts
};

/**
 * Graceful shutdown handler for MCP clients
 */
export const setupMCPShutdownHandlers = () => {
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down MCP clients gracefully...`);
    try {
      await mcp.disconnect();
      logger.info('MCP clients disconnected successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during MCP shutdown', { error: error instanceof Error ? error.message : 'Unknown error' });
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('beforeExit', () => gracefulShutdown('beforeExit'));
};

// Initialize shutdown handlers
setupMCPShutdownHandlers();

/**
 * MCP Operation Tracker for detailed analytics
 */
export class MCPTracker {
  private static operations: Array<{
    timestamp: string;
    server: string;
    operation: string;
    tool?: string;
    resource?: string;
    duration: number;
    status: 'success' | 'error';
    metadata?: Record<string, unknown>;
  }> = [];

  /**
   * Records an MCP operation for analytics
   */
  static recordOperation(
    server: string,
    operation: string,
    duration: number,
    status: 'success' | 'error',
    tool?: string,
    resource?: string,
    metadata?: Record<string, unknown>
  ): void {
    const record = {
      timestamp: new Date().toISOString(),
      server,
      operation,
      tool,
      resource,
      duration,
      status,
      metadata
    };

    this.operations.push(record);

    // Keep only last 1000 operations to prevent memory issues
    if (this.operations.length > 1000) {
      this.operations.shift();
    }

      //observabilityLogger.info(`MCP operation: ${server}:${operation}`, record);
    }

  /**
   * Gets MCP operation analytics
   */
  static getOperationHistory(limit: number = 100): typeof MCPTracker.operations {
    return this.operations.slice(-limit);
  }

  /**
   * Gets MCP analytics by server
   */
  static getServerOperations(server: string): typeof MCPTracker.operations {
    return this.operations.filter(op => op.server === server);
  }

  /**
   * Gets MCP performance statistics
   */
  static getPerformanceStats(): {
    totalOperations: number;
    avgDuration: number;
    successRate: number;
    serverBreakdown: Record<string, number>;
    operationBreakdown: Record<string, number>;
    errorRate: number;
  } {
    const operations = this.operations;
    const totalOps = operations.length;

    if (totalOps === 0) {
      return {
        totalOperations: 0,
        avgDuration: 0,
        successRate: 0,
        serverBreakdown: {},
        operationBreakdown: {},
        errorRate: 0
      };
    }

    const successfulOps = operations.filter(op => op.status === 'success');
    const avgDuration = operations.reduce((sum, op) => sum + op.duration, 0) / totalOps;

    const serverBreakdown = operations.reduce((acc, op) => {
      acc[op.server] = (acc[op.server] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const operationBreakdown = operations.reduce((acc, op) => {
      acc[op.operation] = (acc[op.operation] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOperations: totalOps,
      avgDuration: Math.round(avgDuration * 100) / 100,
      successRate: (successfulOps.length / totalOps) * 100,
      serverBreakdown,
      operationBreakdown,
      errorRate: ((totalOps - successfulOps.length) / totalOps) * 100
    };
  }

  /**
   * Clears all recorded operations
   */
  static clearHistory(): void {
    this.operations = [];
  }
}

/**
 * Enhanced MCP operation wrapper with comprehensive tracing *
 * @param server - MCP server name
 * @param operation - Operation type (e.g., 'listTools', 'callTool', 'listResources')
 * @param fn - Function to execute
 * @returns Result with tracing metadata
 */
export const traceMCPOperation = async <T>(
  server: string,
  operation: string,
  fn: () => Promise<T>,
  tool?: string,
  resource?: string
): Promise<T> => {
  const startTime = Date.now();

  try {
    //observabilityLogger.debug(`Starting MCP operation: ${server}:${operation}`, {
   //   server,
   //   operation,
   //   tool,
   //   resource
    //});

    const result = await fn();
    const duration = Date.now() - startTime;

    MCPTracker.recordOperation(server, operation, duration, 'success', tool, resource);

    //observabilityLogger.debug(`MCP operation completed: ${server}:${operation}`, {
   //   server,
   //   operation,
   //   tool,
   //   resource,
   //   duration: `${duration}ms`,
   //   status: 'success'
    //});

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    MCPTracker.recordOperation(server, operation, duration, 'error', tool, resource, {
      error: errorMessage
    });

    //ErrorTracker.recordError(`MCP:${server}:${operation}`, errorMessage, {
   //   server,
   //   operation,
   //   tool,
   //   resource,
   //   duration: `${duration}ms`
   // });

    //observabilityLogger.error(`MCP operation failed: ${server}:${operation}`, {
   //   server,
   //   operation,
   //   tool,
   //   resource,
   //   duration: `${duration}ms`,
   //   status: 'error',
   //   error: errorMessage
   // });

    throw error;
  }
};

/**
 * Traced MCP tool execution using proper Mastra MCPClient
 *
 * @param server - MCP server name
 * @param toolName - Tool to execute
 * @param args - Tool arguments
 * @returns Tool execution result with tracing
 */
export const executeTracedMCPTool = async (
  server: string,
  toolName: string,
  args: Record<string, unknown> = {}
): Promise<unknown> => {
  return await traceMCPOperation(
    server,
    'callTool',
    async () => {
      // Get tools for this specific server
      const serverTools = await getMCPToolsByServer(server);
      const tool = serverTools[toolName];

      if (!tool || typeof tool !== 'function') {
        throw new Error(`Tool '${toolName}' not found on server '${server}'`);
      }

      return await (tool as (args: Record<string, unknown>) => Promise<unknown>)(args);
    },
    toolName
  );
};
/**
 * Traced MCP resource access
 *
 * @param server - MCP server name
 * @param resourceUri - Resource URI to access
 * @returns Resource content with tracing
 */
export const getTracedMCPResource = async (
  server: string,
  resourceUri: string
): Promise<Record<string, unknown>> => {
  return await traceMCPOperation(
    server,
    'readResource',
    async () => {
      return await mcp.resources.read(server, resourceUri);
    },
    undefined,
    resourceUri
  );
};
/**
 * Traced MCP server tools listing using proper Mastra MCPClient
 *
 * @param server - MCP server name
 * @returns Available tools with tracing
 */
export const listTracedMCPTools = async (server: string): Promise<{ name: string; description?: string }[]> => {
  return await traceMCPOperation(
    server,
    'listTools',
    async () => {
      const serverTools = await getMCPToolsByServer(server);
      return Object.keys(serverTools).map(name => ({ name, description: `Tool from ${server} server` }));
    }
  );
};
/**
 * Debug function to inspect MCP tool structure
 */
async function debugMCPTools() {
  try {
    logger.info('=== MCP DEBUG: Inspecting tool structure ===');

    // Check what getTools() actually returns
    const allTools = await mcp.getTools();
    logger.info(`Total tools from getTools(): ${Object.keys(allTools).length}`);
    logger.info(`Tool names: ${Object.keys(allTools).slice(0, 10).join(', ')}...`);

    // Check what getToolsets() returns
    const toolsets = await mcp.getToolsets();
    logger.info(`Total toolsets from getToolsets(): ${Object.keys(toolsets).length}`);
    logger.info(`Toolset names: ${Object.keys(toolsets).join(', ')}`);

    // Inspect first toolset structure
    const firstToolsetName = Object.keys(toolsets)[0];
    if (firstToolsetName) {
      const firstToolset = toolsets[firstToolsetName];
      if (firstToolset && typeof firstToolset === 'object') {
        const toolsetObj = firstToolset as Record<string, unknown>;
        logger.info(`First toolset '${firstToolsetName}' has ${Object.keys(toolsetObj).length} tools`);
        logger.info(`Tools in '${firstToolsetName}': ${Object.keys(toolsetObj).slice(0, 5).join(', ')}...`);
      }
    }

    logger.info('=== END MCP DEBUG ===');
  } catch (error) {
    logger.error('MCP Debug failed:', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Track if debug has been run
let debugHasRun = false;

/**
 * Get MCP tools for a specific server as Mastra-compatible tools
 * Uses proper Mastra MCPClient pattern with server-specific filtering
 * @param serverName - Name of the MCP server
 * @returns Tools from the specified server formatted for Mastra
 */
export async function getMCPToolsByServer(serverName: string): Promise<Record<string, unknown>> {
  try {
    // Run debug on first call to understand structure
    if (!debugHasRun) {
      await debugMCPTools();
      debugHasRun = true;
    }

    // Try getToolsets() approach first (recommended by Mastra docs)
    const toolsets = await mcp.getToolsets();

    if (toolsets[serverName]) {
      const serverTools = toolsets[serverName] as Record<string, unknown>;
      logger.info(`Loaded ${Object.keys(serverTools).length} tools from MCP server '${serverName}' via toolsets`);
      return serverTools;
    }

    // Fallback: try filtering from getTools() with different naming patterns
    const allTools = await mcp.getTools();
    const serverTools: Record<string, unknown> = {};

    // Try different naming patterns
    const patterns = [
      `${serverName}_`,  // serverName_toolName
      `${serverName}.`,  // serverName.toolName
      `${serverName}-`,  // serverName-toolName
    ];

    for (const [toolName, tool] of Object.entries(allTools)) {
      for (const pattern of patterns) {
        if (toolName.startsWith(pattern)) {
          const originalToolName = toolName.replace(pattern, '');
          serverTools[originalToolName] = tool;
          break;
        }
      }
    }

    logger.info(`Loaded ${Object.keys(serverTools).length} tools from MCP server '${serverName}' via filtering`);
    return serverTools;
  } catch (error) {
    logger.warn(`Failed to load tools from MCP server '${serverName}':`, error as Record<string, unknown>);
    return {};
  }
}

/**
 * Get all MCP tools using the recommended Mastra pattern
 * @returns All MCP tools properly formatted for Mastra agents
 */
export async function getAllMCPTools(): Promise<Record<string, unknown>> {
  try {
    const allTools = await mcp.getTools();
    logger.info(`Loaded ${Object.keys(allTools).length} total MCP tools from all servers`);
    return allTools;
  } catch (error) {
    logger.error('Failed to load MCP tools:', error as Record<string, unknown>);
    return {};
  }
}

/**
 * Get MCP toolsets for dynamic usage (recommended for multi-user scenarios)
 * @returns MCP toolsets for use with agent.generate() or agent.stream()
 */
export async function getMCPToolsets(): Promise<Record<string, unknown>> {
  try {
    const toolsets = await mcp.getToolsets();
    logger.info(`Loaded MCP toolsets from ${Object.keys(toolsets).length} servers`);
    return toolsets;
  } catch (error) {
    logger.error('Failed to load MCP toolsets:', error as Record<string, unknown>);
    return {};
  }
}

/**
 * Traced MCP server resources listing
 *
 * @param server - MCP server name
 * @returns Available resources with tracing
 */
export const listTracedMCPResources = async (server: string): Promise<{ name: string; description?: string }[]> => {
  return await traceMCPOperation(
    server,
    'listResources',    async () => {
      const resources = await mcp.resources.list() as Record<string, { name: string; description?: string }[]>;
      return resources[server] || [];
    }
  );
};
/**
 * Traced MCP toolsets retrieval for dynamic usage
 *
 * @returns All toolsets from all servers with tracing
 */
export const getTracedMCPToolsets = async (): Promise<Record<string, unknown>> => {
  return await traceMCPOperation(
    'all-servers',
    'getToolsets',
    async () => {
      return await mcp.getToolsets();
    }
  );
};
/**
 * Traced MCP tools retrieval for static usage using proper Mastra MCPClient
 *
 * @returns All tools from all servers with tracing
 */
export const getTracedMCPTools = async (): Promise<{ name: string; description?: string }[]> => {
  return await traceMCPOperation(
    'all-servers',
    'getTools',
    async () => {
      const allTools = await mcp.getTools();
      return Object.keys(allTools).map(toolName => ({
        name: toolName,
        description: `MCP tool: ${toolName}`
      }));
    }
  );
};
/**
 * Traced MCP resource listing across all servers
 *
 * @returns Resources grouped by server with tracing
 */
export const listAllTracedMCPResources = async (): Promise<Record<string, { name: string; description?: string }[]>> => {
  return await traceMCPOperation(
    'all-servers',
    'listAllResources',
    async () => {
      return await mcp.resources.list();
    }
  );
};
/**
 * Traced MCP resource templates listing
 *
 * @returns Resource templates grouped by server with tracing
 */
export const getTracedMCPResourceTemplates = async (): Promise<Record<string, { name: string; description?: string }[]>> => {
  return await traceMCPOperation(
    'all-servers',
    'getResourceTemplates',
    async () => {
      return await mcp.resources.templates();
    }
  );
};
/**
 * Traced MCP resource subscription
 *
 * @param server - MCP server name
 * @param resourceUri - Resource URI to subscribe to
 * @returns Subscription result with tracing
 */
export const subscribeToTracedMCPResource = async (
  server: string,
  resourceUri: string
): Promise<Record<string, unknown>> => {
  return await traceMCPOperation(
    server,
    'subscribeResource',
    async () => {
      return await mcp.resources.subscribe(server, resourceUri);
    },
    undefined,
    resourceUri
  );
};
/**
 * Traced MCP resource unsubscription
 *
 * @param server - MCP server name
 * @param resourceUri - Resource URI to unsubscribe from
 * @returns Unsubscription result with tracing
 */
export const unsubscribeFromTracedMCPResource = async (
  server: string,
  resourceUri: string
): Promise<Record<string, unknown>> => {
  return await traceMCPOperation(
    server,
    'unsubscribeResource',
    async () => {
      return await mcp.resources.unsubscribe(server, resourceUri);
    },
    undefined,
    resourceUri
  );
};
/**
 * Enhanced MCP resource reading with caching and performance tracking
 *
 * @param server - MCP server name
 * @param resourceUri - Resource URI to read
 * @param useCache - Whether to use cached result if available
 * @returns Resource content with enhanced metadata
 */
export const getEnhancedTracedMCPResource = async (
  server: string,
  resourceUri: string,
  useCache: boolean = false
): Promise<{ content: unknown; metadata: Record<string, string | number | boolean> }> => {
  return await traceMCPOperation(
    server,
    'enhancedReadResource',
    async () => {
      const startTime = Date.now();

      // Simple in-memory cache (could be enhanced with Redis/etc.)
      const cacheKey = `${server}:${resourceUri}`;
      if (useCache && resourceCache.has(cacheKey)) {
        const cached = resourceCache.get(cacheKey)!;
        const age = Date.now() - cached.timestamp;

        if (age < 300000) { // 5 minutes cache
          //observabilityLogger.debug('MCP resource cache hit', {
          //  server,
          //  resourceUri,
          //  cacheAge: `${age}ms`
          //});

          return {
            content: cached.content,
            metadata: {
              ...cached.metadata,
              cached: true,
              cacheAge: age
            }
          };
        }
      }

      const result = await mcp.resources.read(server, resourceUri);
      const readDuration = Date.now() - startTime;

      const metadata = {
        server,
        resourceUri,
        readDuration: `${readDuration}ms`,
        timestamp: new Date().toISOString(),
        cached: false,
        contentSize: JSON.stringify(result).length
      };

      // Cache the result
      if (useCache) {
        resourceCache.set(cacheKey, {
          content: result,
          metadata,
          timestamp: Date.now()
        });
      }

      return {
        content: result,
        metadata
      };
    },
    undefined,
    resourceUri
  );
};
// Simple in-memory cache for resources
const resourceCache = new Map<string, {
  content: unknown;
  metadata: Record<string, string | number | boolean>;
  timestamp: number
}>();

/**
 * Clear resource cache */
export function clearMCPResourceCache() {
  resourceCache.clear();
  //observabilityLogger.info('MCP resource cache cleared');
}

/**
 * Get MCP analytics and performance metrics
 *
 * @returns Comprehensive MCP analytics
 */
export function getMCPAnalytics() {
  return {
    performance: MCPTracker.getPerformanceStats(),
    recentOperations: MCPTracker.getOperationHistory(50),
    serverStatus: {
      filesystem: 'configured',
      winterm: 'configured',
      duckduckgo: 'configured',
      jsSandbox: 'configured',
      docker: 'configured'
    },
    configuration: {

      totalServers: 5
    }
  };
}

/**
 * Get MCP analytics for a specific server
 *
 * @param server - Server name
 * @returns Server-specific analytics
 */
export function getMCPServerAnalytics(server: string) {
  return {
    operations: MCPTracker.getServerOperations(server),
    performance: MCPTracker.getPerformanceStats()
  };
}

/**
 * Clear all MCP analytics data
 */
export function clearMCPAnalytics() {
  MCPTracker.clearHistory();
  //observabilityLogger.info('MCP analytics cleared');
}

/**
 * Health check for all MCP servers
 *
 * @returns Health status of all servers
 */
//export const checkMCPServersHealth = createTraceableAgent(
//  'mcp-health-check',
//  async (): Promise<Record<string, { status: string; tools?: number; error?: string }>> => {
//    const servers = ['filesystem', 'jsSandbox', 'docker'];
//    const healthStatus: Record<string, { status: string; tools?: number; error?: string }> = {};

//    for (const server of servers) {
//      try {
//        const tools = await listTracedMCPTools(server);
//        healthStatus[server] = {
//          status: 'healthy',
//          tools: tools.length
//        };
//      } catch (error) {
//        healthStatus[server] = {
//          status: 'error',
//          error: error instanceof Error ? error.message : 'Unknown error'
//        };
//      }
//    }

    //observabilityLogger.info('MCP servers health check completed', { healthStatus });
    //return healthStatus;
  //}
//);

