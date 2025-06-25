/**
 * Freestyle Sandbox Tool - Enhanced Code Execution
 * 
 * This tool provides secure code execution capabilities using Freestyle's sandbox environment
 * with support for custom node modules and environment variables.
 * 
 * Features:
 * - Secure code execution in isolated sandboxes
 * - Custom node modules and environment variables
 * - Configurable timeouts
 * - Comprehensive logging and error handling
 * 
 * @mastra FreestyleSandboxTool
 * [EDIT: 2025-06-23] [BY: GitHub Copilot]
 */

import { executeTool } from "freestyle-sandboxes/mastra";
import { z } from "zod";
import { env } from "../config/environment";
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'FreestyleSandboxTool', level: 'info' });

/**
 * Zod schemas for freestyle sandbox code execution validation
 */
const codeExecutionInputSchema = z.object({
  script: z.string().min(1, "Script content cannot be empty"),
  timeout: z.number().int().positive().max(300000).optional().describe("Execution timeout in milliseconds (max 5 minutes)"),
  language: z.enum(["javascript", "typescript"]).default("javascript").describe("Script language"),
}).strict();

const codeExecutionOutputSchema = z.object({
  result: z.unknown().describe("Execution result"),
  logs: z.array(z.object({
    message: z.string(),
    type: z.enum(["log", "error", "warn", "info"]),
    timestamp: z.string().optional(),
  })).describe("Execution logs"),
  success: z.boolean().describe("Whether execution was successful"),
  executionTime: z.number().optional().describe("Execution time in milliseconds"),
  error: z.string().optional().describe("Error message if execution failed"),
}).strict();

const nodeModuleVersionSchema = z.record(z.string()).describe("Node modules with their versions");

const environmentVariablesSchema = z.record(z.string()).describe("Environment variables for code execution");

/**
 * Enhanced code executor with comprehensive configuration
 * Includes popular node modules and environment variables for AI agent operations
 * 
 * @example
 * ```typescript
 * const result = await codeExecutor.execute({
 *   script: `
 *     export default () => {
 *       console.log("Hello from Freestyle!");
 *       return { message: "Code executed successfully" };
 *     };
 *   `
 * });
 * ```
 */
export const codeExecutor = executeTool({
  apiKey: env.FREESTYLE_API_KEY,
  nodeModules: {
    // Communication and notifications
    resend: "4.6.0",
    nodemailer: "6.9.8",
    
    // GitHub and Git operations
    octokit: "5.0.3",
    "@octokit/rest": "20.0.2",
    "simple-git": "3.21.0",
    "isomorphic-git": "1.25.6",
    
    // Data processing and analysis
    lodash: "4.17.21",
    "date-fns": "3.2.0",
    csv: "6.3.6",
    "js-yaml": "4.1.0",
    "fast-xml-parser": "4.3.4",
    
    // HTTP clients and API integration
    axios: "1.6.5",
    "node-fetch": "3.3.2",
    ky: "1.2.2",
    
    // Utilities and helpers
    uuid: "9.0.1",
    "crypto-js": "4.2.0",
    "fs-extra": "11.2.0",
    
    // AI and machine learning
    "@ai-sdk/openai": "0.0.42",
    "@ai-sdk/google": "1.2.19",
    
    // Database and storage
    sqlite3: "5.1.6",
    
    // Web scraping and parsing
    cheerio: "1.0.0-rc.12",
    jsdom: "24.0.0",
    
    // Code analysis and processing
    esprima: "4.0.1",
    "@babel/parser": "7.23.9",
    "@babel/traverse": "7.23.9",
  },
  envVars: {
    // Authentication tokens
    RESEND_API_KEY: process.env.RESEND_API_KEY!,
    GITHUB_PERSONAL_ACCESS_TOKEN: env.GITHUB_TOKEN,
    GOOGLE_GENERATIVE_AI_API_KEY: env.GOOGLE_GENERATIVE_AI_API_KEY,
    
    // Database connections
    DATABASE_URL: env.DATABASE_URL,
    DATABASE_AUTH_TOKEN: env.DATABASE_AUTH_TOKEN,
    
    // API keys for external services
    TAVILY_API_KEY: env.TAVILY_API_KEY,
    LANGFUSE_PUBLIC_KEY: env.LANGFUSE_PUBLIC_KEY,
    LANGFUSE_SECRET_KEY: env.LANGFUSE_SECRET_KEY,
    LANGFUSE_HOST: env.LANGFUSE_HOST,
    
    // Configuration
    NODE_ENV: env.NODE_ENV,
    LOG_LEVEL: env.LOG_LEVEL,
  },
});

/**
 * Enhanced code executor with result callback and output management
 * Provides additional configuration options for logging and output handling
 * 
 * @example
 * ```typescript
 * const result = await enhancedCodeExecutor.execute({
 *   script: `
 *     import { v4 as uuidv4 } from 'uuid';
 *     export default () => {
 *       const id = uuidv4();
 *       console.log("Generated UUID:", id);
 *       return { success: true, id };
 *     };
 *   `
 * });
 * ```
 */
export const enhancedCodeExecutor = executeTool({
  apiKey: env.FREESTYLE_API_KEY,
  nodeModules: {
    // Core dependencies for enhanced functionality
    resend: "4.6.0",
    octokit: "5.0.3",
    "@octokit/rest": "20.0.2",
    lodash: "4.17.21",
    "date-fns": "3.2.0",
    axios: "1.6.5",
    uuid: "9.0.1",
    "crypto-js": "4.2.0",
    "fs-extra": "11.2.0",
    "@ai-sdk/google": "^1.2.19",
    cheerio: "1.0.0-rc.12",
    "js-yaml": "4.1.0",
  },
  envVars: {
    RESEND_API_KEY: process.env.RESEND_API_KEY!,
    GITHUB_PERSONAL_ACCESS_TOKEN: env.GITHUB_TOKEN,
    GOOGLE_GENERATIVE_AI_API_KEY: env.GOOGLE_GENERATIVE_AI_API_KEY,
    DATABASE_URL: env.DATABASE_URL,
    DATABASE_AUTH_TOKEN: env.DATABASE_AUTH_TOKEN,
    NODE_ENV: env.NODE_ENV,  },
});

// Log tool initialization
logger.info('Freestyle Sandbox tools initialized successfully', {
  apiKeyConfigured: !!env.FREESTYLE_API_KEY,
});

/**
 * Type definitions for freestyle sandbox operations
 */
export type CodeExecutionInput = z.infer<typeof codeExecutionInputSchema>;
export type CodeExecutionOutput = z.infer<typeof codeExecutionOutputSchema>;
export type NodeModuleVersions = z.infer<typeof nodeModuleVersionSchema>;
export type EnvironmentVariables = z.infer<typeof environmentVariablesSchema>;

/**
 * Validates code execution input parameters
 * @param input - Input parameters to validate
 * @returns Validated input parameters
 * @throws ZodError if validation fails
 */
export function validateCodeExecutionInput(input: unknown): CodeExecutionInput {
  try {
    return codeExecutionInputSchema.parse(input);
  } catch (error) {
    logger.error('Code execution input validation failed', { error, input });
    throw error;
  }
}

/**
 * Validates code execution output results
 * @param output - Output to validate
 * @returns Validated output
 * @throws ZodError if validation fails
 */
export function validateCodeExecutionOutput(output: unknown): CodeExecutionOutput {
  try {
    return codeExecutionOutputSchema.parse(output);
  } catch (error) {
    logger.error('Code execution output validation failed', { error, output });
    throw error;
  }
}

/**
 * Validates node module versions configuration
 * @param modules - Node modules configuration to validate
 * @returns Validated node modules configuration
 * @throws ZodError if validation fails
 */
export function validateNodeModules(modules: unknown): NodeModuleVersions {
  try {
    return nodeModuleVersionSchema.parse(modules);
  } catch (error) {
    logger.error('Node modules validation failed', { error, modules });
    throw error;
  }
}

/**
 * Validates environment variables configuration
 * @param envVars - Environment variables to validate
 * @returns Validated environment variables
 * @throws ZodError if validation fails
 */
export function validateEnvironmentVariables(envVars: unknown): EnvironmentVariables {
  try {
    return environmentVariablesSchema.parse(envVars);
  } catch (error) {
    logger.error('Environment variables validation failed', { error, envVars });
    throw error;
  }
}

// Export schemas for external use
export {
  codeExecutionInputSchema,
  codeExecutionOutputSchema,
  nodeModuleVersionSchema,
  environmentVariablesSchema,
};

// Export for use in agents
export { codeExecutor as freestyleCodeExecutor, enhancedCodeExecutor as freestyleEnhancedExecutor };