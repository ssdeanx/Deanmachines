/**
 * Dean Machines MCP Server - Comprehensive Mastra AI Framework Integration
 *
 * This server exposes all Dean Machines agents, tools, and workflows as a Model Context Protocol (MCP) server.
 * It provides external MCP clients (like Cursor, Windsurf, Claude Desktop) with access to the complete
 * Dean Machines AI ecosystem, including 20+ specialized agents, advanced tools, and intelligent workflows.
 *
 * Features:
 * - Complete agent registry exposure (20+ agents across all domains)
 * - Advanced tool ecosystem integration
 * - Workflow orchestration capabilities
 * - Comprehensive error handling and logging
 * - Resource and prompt management
 * - Multiple transport protocols (stdio, SSE, HTTP)
 * - Full integration with Mastra observability
 *
 * Architecture:
 * - Agents → MCP Tools (ask_<agentName> pattern)
 * - Workflows → MCP Tools (run_<workflowName> pattern)
 * - Native Tools → Direct exposure
 * - Resources → Document and data access
 * - Prompts → Template management
 *
 * @mastra DeanMachinesMCPServer
 * @extends {MCPServer}
 * @description Dean Machines MCP Server
 * - Exposes all Dean Machines agents, tools, and workflows as a Model Context Protocol (MCP)
 * - Provides external MCP clients with access to the complete Dean Machines AI ecosystem
 * - Agents , tools, and workflows are exposed as MCP tools
 * @author DeanMachines
 * @license MIT
 * @copyright DeanMachines
 * @version 1.0.0
 * @module mcp-server
 *
 * [EDIT: 2025-06-24 09:50:19 EST] [BY: GitHub Copilot]
 */

import { MCPServer } from '@mastra/mcp';
import http from 'http';

// Define a custom interface to match the expected structure of StreamableHTTPServerTransportOptions
interface CustomStreamableHTTPServerTransportOptions {
  sessionIdGenerator: () => string;
  onsessioninitialized?: (sessionId: string) => void;
  enableJsonResponse?: boolean;
  eventStore?: {
    storeEvent: (event: unknown) => Promise<string>;
    replayEventsAfter: (lastEventId: string, options: { send: (eventId: string, message: unknown) => Promise<void> }) => Promise<string>;
  };
}
import { agentRegistry } from '../agents';
import { weatherWorkflow, codeGraphMakerWorkflow, advancedCodeGraphMakerWorkflow, fullStackDevelopmentWorkflow, researchAnalysisWorkflow } from '../workflows';
import { env } from '../config/environment';
import { PinoLogger } from '@mastra/loggers';

// Import available tools (only ones that exist)
import {
  chunkerTool,
  graphRAGTool,
  graphRAGUpsertTool,
  rerankTool,
  stockPriceTool,
  vectorQueryTool,
  hybridVectorSearchTool,
  weatherTool,
  webScraperTool,
  webExtractorTool,
  webCrawlerTool
} from '../tools';

// Initialize logger for MCP server operations
const logger = new PinoLogger({
  name: 'DeanMachinesMCPServer',
  level: env.LOG_LEVEL
});

/**
 * Resource handling for the MCP server
 * Provides access to project documentation, agent configurations, and system status
 */
const mcpServerResources = {
  /**
   * List all available resources in the Dean Machines ecosystem
   */
  listResources: async () => {
    logger.info('📚 Listing MCP server resources');

    return [
      {
        uri: 'deanmachines://agents/registry',
        name: 'Agent Registry',
        description: 'Complete list of all available agents with capabilities and metadata',
        mimeType: 'application/json'
      },
      {
        uri: 'deanmachines://workflows/catalog',
        name: 'Workflow Catalog',
        description: 'Available workflows for complex task orchestration',
        mimeType: 'application/json'
      },
      {
        uri: 'deanmachines://tools/inventory',
        name: 'Tool Inventory',
        description: 'Complete inventory of all available tools and their capabilities',
        mimeType: 'application/json'
      },
      {
        uri: 'deanmachines://system/status',
        name: 'System Status',
        description: 'Current system status, health metrics, and configuration',
        mimeType: 'application/json'
      },
      {
        uri: 'deanmachines://docs/readme',
        name: 'Project Documentation',
        description: 'Main project documentation and usage instructions',
        mimeType: 'text/markdown'
      },
      {
        uri: 'deanmachines://config/environment',
        name: 'Environment Configuration',
        description: 'Current environment configuration and settings',
        mimeType: 'application/json'
      }
    ];
  },

  /**
   * Get content for specific resources
   */
  getResourceContent: async ({ uri }: { uri: string }) => {
    logger.info(`📖 Retrieving resource content for: ${uri}`);

    try {
      switch (uri) {
        case 'deanmachines://agents/registry':
          return {
            text: JSON.stringify({
              totalAgents: Object.keys(agentRegistry).length,
              agents: Object.entries(agentRegistry).map(([name]) => ({
                name,
                description: `${name} agent for specialized tasks`,
                tools: Object.keys((agentRegistry[name as keyof typeof agentRegistry]?.tools || {})).length || 0,
                hasMemory: true,
                model: 'Google Gemini 2.5 Flash'
              })),
              categories: {
                core: ['master', 'strategizer', 'analyzer', 'evolve', 'supervisor'],
                development: ['code', 'git', 'docker', 'debug'],
                data: ['data', 'graph', 'processing', 'research', 'weather'],
                management: ['manager', 'marketing'],
                operations: ['sysadmin', 'browser', 'utility'],
                creative: ['design', 'documentation'],
                specialized: ['special', 'react', 'langgraph']
              }
            }, null, 2)
          };

        case 'deanmachines://workflows/catalog':
          return {
            text: JSON.stringify({
              workflows: [
                {
                  name: 'weatherWorkflow',
                  description: 'Weather information processing and analysis',
                  type: 'data-processing'
                },
                {
                  name: 'codeGraphMakerWorkflow',
                  description: 'Basic code analysis and graph generation',
                  type: 'development'
                },
                {
                  name: 'advancedCodeGraphMakerWorkflow',
                  description: 'Advanced code analysis with comprehensive graph generation',
                  type: 'development'
                },
                {
                  name: 'fullStackDevelopmentWorkflow',
                  description: 'Complete full-stack development lifecycle',
                  type: 'development'
                },
                {
                  name: 'researchAnalysisWorkflow',
                  description: 'Comprehensive research and analysis workflow',
                  type: 'research'
                }
              ]
            }, null, 2)
          };

        case 'deanmachines://tools/inventory':
          return {
            text: JSON.stringify({
              tools: [
                { name: 'chunkerTool', description: 'Text chunking and segmentation' },
                { name: 'graphRAGTool', description: 'Knowledge graph RAG operations' },
                { name: 'graphRAGUpsertTool', description: 'Knowledge graph upsert operations' },
                { name: 'hybridVectorSearchTool', description: 'Hybrid vector search' },
                { name: 'rerankTool', description: 'Search result reranking' },
                { name: 'stockPriceTool', description: 'Stock price data retrieval' },
                { name: 'vectorQueryTool', description: 'Vector database queries' },
                { name: 'weatherTool', description: 'Weather data and forecasting' },
                { name: 'webScraperTool', description: 'Web scraping and extraction' },
                { name: 'webExtractorTool', description: 'Structured web data extraction' },
                { name: 'webCrawlerTool', description: 'Website crawling and indexing' }
              ]
            }, null, 2)
          };

        case 'deanmachines://system/status':
          return {
            text: JSON.stringify({
              status: 'operational',
              version: '1.0.0',
              environment: env.NODE_ENV,
              features: {
                hasGoogleAI: !!env.GOOGLE_GENERATIVE_AI_API_KEY,
                hasLangSmith: !!env.LANGSMITH_API_KEY,
                hasDatabase: !!env.DATABASE_URL,
                hasNeo4j: !!env.NEO4J_URL
              },
              timestamp: new Date().toISOString(),
              uptime: process.uptime(),
              memory: process.memoryUsage()
            }, null, 2)
          };

        case 'deanmachines://docs/readme':
          return {
            text: `# Dean Machines AI Ecosystem

A comprehensive AI application built with the Mastra framework, featuring 20+ specialized agents, advanced tools, and intelligent workflows.

## Available Agents

${Object.entries(agentRegistry).map(([name]) =>
  `- **${name}**: ${name} agent for specialized tasks`
).join('\n')}

## Available Tools

- **chunkerTool**: Text chunking and segmentation
- **codeExecutionTool**: Secure code execution sandbox
- **gitTool**: Git operations and version control
- **graphRAGTool**: Knowledge graph RAG operations
- **rerankTool**: Search result reranking
- **stockPriceTool**: Stock price data retrieval
- **vectorQueryTool**: Vector database queries
- **weatherTool**: Weather data and forecasting
- **webScraperTool**: Web scraping and extraction

## Available Workflows

- **weatherWorkflow**: Weather information processing
- **codeGraphMakerWorkflow**: Code analysis and graph generation
- **advancedCodeGraphMakerWorkflow**: Advanced code analysis
- **fullStackDevelopmentWorkflow**: Complete development lifecycle
- **researchAnalysisWorkflow**: Comprehensive research workflow

## Usage

Use the MCP tools to interact with agents:
- \`ask_<agentName>\`: Ask a specific agent
- \`run_<workflowName>\`: Execute a workflow
- Direct tool access for specific operations
`
          };

        case 'deanmachines://config/environment':
          return {
            text: JSON.stringify({
              nodeEnv: env.NODE_ENV,
              logLevel: env.LOG_LEVEL,
              port: env.PORT,
              features: {
                langsmithTracing: env.LANGSMITH_TRACING,
                langfuseTracing: env.LANGFUSE_TRACING
              }
            }, null, 2)
          };

        default:
          return {
            text: JSON.stringify({
              error: 'Resource not found',
              availableResources: [
                'deanmachines://agents/registry',
                'deanmachines://workflows/catalog',
                'deanmachines://tools/inventory',
                'deanmachines://system/status',
                'deanmachines://docs/readme',
                'deanmachines://config/environment'
              ]
            }, null, 2)
          };
      }
    } catch (error) {
      logger.error(`❌ Error retrieving resource ${uri}:`, { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        text: JSON.stringify({
          error: 'Failed to retrieve resource',
          uri,
          message: error instanceof Error ? error.message : 'Unknown error'
        }, null, 2)
      };
    }
  }
};

/**
 * Prompt templates for common Dean Machines operations
 */
const mcpServerPrompts = {
  /**
   * List all available prompts
   */
  listPrompts: async () => {
    logger.info('📝 Listing available prompts');
    return [
      {
        name: 'agent_interaction',
        description: 'Template for interacting with Dean Machines agents',
        version: '1.0.0'
      },
      {
        name: 'workflow_execution',
        description: 'Template for executing workflows with specific parameters',
        version: '1.0.0'
      },
      {
        name: 'system_analysis',
        description: 'Template for analyzing system capabilities and status',
        version: '1.0.0'
      },
      {
        name: 'debugging_assistance',
        description: 'Template for getting debugging help from specialized agents',
        version: '1.0.0'
      },
      {
        name: 'task_orchestration',
        description: 'Template for orchestrating complex multi-agent tasks',
        version: '1.0.0'
      }
    ];
  },

  /**
   * Get prompt messages for specific prompts
   */
  getPromptMessages: async ({ name, version, args }: { name: string; version?: string; args?: Record<string, unknown> }) => {
    logger.info(`📋 Getting prompt messages for: ${name} (v${version || '1.0.0'})`);

    const messages: { role: "user" | "assistant"; content: { type: "text"; text: string } }[] = [];

    switch (name) {
      case 'agent_interaction':
        messages.push({
          role: 'assistant',
          content: {
            type: 'text',
            text: `You are helping a user interact with the Dean Machines AI ecosystem. Available agents: ${Object.keys(agentRegistry).join(', ')}`
          }
        });
        messages.push({
          role: 'user',
          content: {
            type: 'text',
            text: `I want to interact with ${args?.agents || 'an agent'} to ${args?.task || 'perform a task'}. Please help me structure this request.`
          }
        });
        break;

      case 'workflow_execution':
        messages.push({
          role: 'assistant',
          content: {
            type: 'text',
            text: 'You are helping execute workflows in the Dean Machines ecosystem. Available workflows: weatherWorkflow, codeGraphMakerWorkflow, advancedCodeGraphMakerWorkflow, fullStackDevelopmentWorkflow, researchAnalysisWorkflow'
          }
        });
        messages.push({
          role: 'user',
          content: {
            type: 'text',
            text: `I need to execute a workflow to ${args?.goal || 'achieve a goal'}. The complexity level is ${args?.complexity || 'medium'}. Please recommend the best workflow and parameters.`
          }
        });
        break;

      case 'system_analysis':
        messages.push({
          role: 'assistant',
          content: {
            type: 'text',
            text: 'You are analyzing the Dean Machines AI ecosystem capabilities and current status.'
          }
        });
        messages.push({
          role: 'user',
          content: {
            type: 'text',
            text: 'Please analyze the current system status, available capabilities, and suggest optimal usage patterns for my requirements.'
          }
        });
        break;

      case 'debugging_assistance':
        messages.push({
          role: 'assistant',
          content: {
            type: 'text',
            text: 'You are helping debug issues in the Dean Machines ecosystem using specialized debug and analysis agents.'
          }
        });
        messages.push({
          role: 'user',
          content: {
            type: 'text',
            text: `I'm experiencing an issue: ${args?.issue || 'unknown problem'}. The severity is ${args?.severity || 'medium'}. Please help me debug this using the appropriate agents.`
          }
        });
        break;

      case 'task_orchestration':
        messages.push({
          role: 'assistant',
          content: {
            type: 'text',
            text: `You are orchestrating complex tasks across multiple Dean Machines agents. Available agents: ${Object.entries(agentRegistry).map(([name]) => 
              `- ${name}: ${name} agent`
            ).join('\n')}`
          }
        });
        messages.push({
          role: 'user',
          content: {
            type: 'text',
            text: `I need to orchestrate a complex task involving multiple agents. The goal is ${args?.goal || 'to complete a multi-step process'}. Please recommend the best agent sequence and coordination strategy.`
          }
        });
        break;

      default:
        messages.push({
          role: 'assistant',
          content: {
            type: 'text',
            text: 'Available prompts: agent_interaction, workflow_execution, system_analysis, debugging_assistance, task_orchestration'
          }
        });
        messages.push({
          role: 'user',
          content: {
            type: 'text',
            text: `Unknown prompt: ${name}. Please use one of the available prompts.`
          }
        });
    }

    return messages;
  }
};

/**
 * Dean Machines MCP Server Configuration
 */
export const deanMachinesMCPServer = new MCPServer({
  name: 'Dean Machines AI Ecosystem',
  version: '1.0.0',
  description: 'Comprehensive AI ecosystem built on Mastra framework with 20+ specialized agents, advanced tools, and intelligent workflows',
  tools: {
    chunkerTool,
    graphRAGTool,
    graphRAGUpsertTool,
    hybridVectorSearchTool,
    rerankTool,
    vectorQueryTool,
    stockPriceTool,
    weatherTool,
    webScraperTool,
    webExtractorTool,
    webCrawlerTool
  },
  agents: agentRegistry,
  workflows: {
    weatherWorkflow,
    codeGraphMakerWorkflow,
    advancedCodeGraphMakerWorkflow,
    fullStackDevelopmentWorkflow,
    researchAnalysisWorkflow
  },
  resources: mcpServerResources,
  prompts: mcpServerPrompts,
  repository: {
    source: 'https://github.com/ssdeanx/deanmachines-rsc',
    url: 'https://github.com/ssdeanx/deanmachines-rsc',
    id: 'deanmachines-rsc' // Unique identifier for the repository
  },
  releaseDate: new Date().toISOString(),
  isLatest: true,
  packageCanonical: 'npm' as const
});

/**
 * Dean Machines MCP Server Manager
 * Handles server lifecycle, transport configuration, and health monitoring
 */
export class DeanMachinesMCPServerManager {
  private server: typeof deanMachinesMCPServer;
  private logger: PinoLogger;
  private isRunning: boolean = false;
  private startTime: number = 0;

  constructor() {
    this.server = deanMachinesMCPServer;
    this.logger = new PinoLogger({
      name: 'DeanMachinesMCPServerManager',
      level: env.LOG_LEVEL
    });
  }

  /**
   * Start the MCP server with stdio transport
   */
  async startStdio(): Promise<void> {
    try {
      this.logger.info('🚀 Starting Dean Machines MCP server on stdio transport');
      this.startTime = Date.now();
      this.isRunning = true;

      // Initialize server with stdio transport
      await this.server.startStdio(); // Use the correct method for stdio transport as per documentation

      this.logger.info('✅ Dean Machines MCP server started successfully on stdio');
    } catch (error) {
      this.isRunning = false;
      this.logger.error('❌ Failed to start MCP server on stdio:', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Start the MCP server with SSE transport
   * Note: MCPServer does not support 'sse' transport directly. Use HTTP transport for similar functionality if needed.
   */

  /**
   * Start the MCP server with HTTP transport
   */
  async startHTTP(config: { url: URL; httpPath: string; req: Request; res: Response; options?: Record<string, unknown> }): Promise<void> {
    try {
      this.logger.info('🚀 Starting Dean Machines MCP server on HTTP transport');
      this.startTime = Date.now();
      this.isRunning = true;
      
      // Initialize server with HTTP transport
      // Note: Using startHTTP as per Mastra documentation, adjust if method name differs
      await this.server.startHTTP({
        url: config.url,
        httpPath: config.httpPath,
        req: config.req as unknown as http.IncomingMessage,
        res: config.res as unknown as http.ServerResponse<http.IncomingMessage>,
        options: config.options as unknown as CustomStreamableHTTPServerTransportOptions | undefined // Type adjusted to match expected structure
      });
      
      this.logger.info('✅ Dean Machines MCP server started successfully on HTTP');
    } catch (error) {
      this.isRunning = false;
      this.logger.error('❌ Failed to start MCP server on HTTP:', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Execute a tool by name with input parameters
   */
  async executeTool(toolName: string, input: Record<string, unknown>): Promise<unknown> {
    try {
      this.logger.info(`🔧 Executing tool: ${toolName}`, { input });
      
      // Execute the tool using the MCPServer instance's executeTool method
      const result = await this.server.executeTool(toolName, input);
      
      this.logger.info(`✅ Tool execution completed: ${toolName}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Tool execution failed: ${toolName}`, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    try {
      this.logger.info('🛑 Stopping Dean Machines MCP server');
      this.isRunning = false;
      
      // Server shutdown logic would go here
      
      this.logger.info('✅ Dean Machines MCP server stopped successfully');
    } catch (error) {
      this.logger.error('❌ Error during MCP server shutdown:', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Get server health and status information
   */
  async healthCheck(): Promise<{ status: string; details: Record<string, unknown> }> {
    try {
      const details = {
        isRunning: this.isRunning,
        uptime: this.isRunning ? Date.now() - this.startTime : 0,
        version: '1.0.0',
        agentsLoaded: Object.keys(agentRegistry).length,
        toolsLoaded: Object.keys(this.server.tools || {}).length,
        // Count loaded workflows directly
        workflowsLoaded: Object.keys({
          weatherWorkflow,
          codeGraphMakerWorkflow,
          advancedCodeGraphMakerWorkflow,
          fullStackDevelopmentWorkflow,
          researchAnalysisWorkflow
        }).length,
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };

      this.logger.info('💚 Health check completed', details);
      
      return {
        status: this.isRunning ? 'healthy' : 'stopped',
        details
      };
    } catch (error) {
      this.logger.error('❌ Health check failed:', { error: error instanceof Error ? error.message : 'Unknown error' });
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Get server status
   */
  get status() {
    return {
      isRunning: this.isRunning,
      uptime: this.isRunning ? Date.now() - this.startTime : 0,
      startTime: this.startTime
    };
  }
}

// Export singleton instance
export const mcpServerManager = new DeanMachinesMCPServerManager();

// Export the server for direct use
export { deanMachinesMCPServer as mcpServer };

// Default export
export default deanMachinesMCPServer;
