import { env } from "process";
import { MCPConfiguration } from "@mastra/mcp";
import { Tool } from "@mastra/core/tools";
import { createLogger } from "@mastra/core/logger";
import { z } from "zod";

const logger = createLogger({ name: "mcp-tools", level: "debug" });
const DefaultOutputSchema = z
  .unknown()
  .describe("Fallback schema for missing/invalid MCP output");

const smitheryKey = env.SMITHERY_API_KEY;
if (!smitheryKey) {
  logger.error("Missing SMITHERY_API_KEY in environment");
  throw new Error("SMITHERY_API_KEY is required for MCP servers");
}

export async function createMastraMcpTools(config?: {
  servers?: Record<string, any>;
  timeout?: number;
}): Promise<Record<string, Tool<any, any>>> {
  const effectiveTimeout = config?.timeout ?? 60000;
  logger.info(`[MCP] Initializing MCPConfiguration with timeout: ${effectiveTimeout}ms`);

  const defaultServers = {
    mastra: {
      command: "npx",
      args: ["-y", "@mastra/mcp-docs-server@latest"],
    },
    docker: {
      command: "docker",
      args: [
        "run", "-i", "--rm", "alpine/socat",
        "STDIO", "TCP:host.docker.internal:8811"
      ],
    },
    "mcp-pandoc": {
      command: "npx",
      args: [
        "-y",
        "@smithery/cli@latest",
        "run",
        "mcp-pandoc",
        "--key",
        smitheryKey!,
      ],
    },
    "claudedesktopcommander": {
      command: "npx",
      args: [
        "-y",
        "@smithery/cli@latest",
        "run",
        "@MrGNSS/claudedesktopcommander",
        "--key",
        smitheryKey!,
      ],
    },
    "mcp-painter": {
      command: "npx",
      args: [
        "-y",
        "@smithery/cli@latest",
        "run",
        "@flrngel/mcp-painter",
        "--key",
        smitheryKey!,
      ],
    },
    "clear-thought": {
      command: "npx",
      args: [
        "-y",
        "@smithery/cli@latest",
        "run",
        "@waldzellai/clear-thought",
        "--key",
        smitheryKey!,
      ],
    },
    "mermaid-mcp-server": {
      command: "npx",
      args: [
        "-y",
        "@smithery/cli@latest",
        "run",
        "@peng-shawn/mermaid-mcp-server",
        "--key",
        smitheryKey!,
      ],
    },
    "deepview-mcp": {
      command: "npx",
      args: [
        "-y",
        "@smithery/cli@latest",
        "run",
        "@ai-1st/deepview-mcp",
        "--key",
        smitheryKey!,
      ],
    },
    "n8n-workflow-builder": {
      command: "npx",
      args: [
        "-y",
        "@smithery/cli@latest",
        "run",
        "@Jimmy974/n8n-workflow-builder",
        "--key",
        smitheryKey!,
      ],
    },
  };

  const servers = config?.servers
    ? { ...defaultServers, ...config.servers }
    : defaultServers;

  const mcp = new MCPConfiguration({ servers, timeout: effectiveTimeout });

  try {
    logger.info("[MCP] Fetching tools...");
    const rawTools = await mcp.getTools();
    const rawNames = Object.keys(rawTools);
    logger.info(
      `[MCP] Retrieved ${rawNames.length} tools: ${rawNames.join(", ")}`
    );

    // Validate & patch schemas and wrap each execute()
    const tools = Object.fromEntries(
      Object.entries(rawTools).map(([name, tool]) => {
        // 1) Validate inputSchema
        if (!(tool.inputSchema instanceof z.ZodType)) {
          throw new Error(`Tool '${name}' has invalid inputSchema`);
        }

        // 2) Patch outputSchema if needed
        const outputSchema =
          tool.outputSchema instanceof z.ZodType
            ? tool.outputSchema
            : DefaultOutputSchema;

        // 3) Wrap execute
        const wrapped: Tool<any, any> = {
          ...tool,
          outputSchema,
          execute: async (input, ctx) => {
            logger.info(`[MCP] Executing '${name}'`, input);
            try {
              return await tool.execute(input, ctx);
            } catch (err) {
              logger.error(`[MCP] '${name}' execution failed:`, err);
              throw err;
            }
          },
        };

        return [name, wrapped];
      })
    );

    return tools;
  } catch (error) {
    logger.error("[MCP] Tool initialization error:", error);
    throw error;
  } finally {
    logger.info("[MCP] Skipping explicit disconnect in finally block.");
  }
}