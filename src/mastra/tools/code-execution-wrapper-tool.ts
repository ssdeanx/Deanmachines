/**
 * Code Execution Wrapper Tool - Mastra-Compatible Freestyle Sandbox Integration
 * 
 * This tool wraps the freestyle-sandboxes executeTool to make it compatible with Mastra agents.
 * It provides secure code execution capabilities through Freestyle's sandbox environment
 * while conforming to Mastra's tool interface requirements.
 * 
 * Features:
 * - Secure code execution in isolated sandboxes
 * - Support for multiple programming languages
 * - Custom node modules and environment variables
 * - Comprehensive error handling and logging
 * - Full integration with Mastra agent tools system
 * 
 * @mastra CodeExecutionWrapperTool
 * [EDIT: 2025-06-23] [BY: GitHub Copilot]
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { codeExecutor } from './freestyle-sandbox-tool';
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'CodeExecutionWrapperTool', level: 'info' });

/**
 * Zod schemas for code execution validation
 */
const codeExecutionInputSchema = z.object({
  script: z.string().min(1, "Script content cannot be empty").describe("The JavaScript/TypeScript code to execute"),
  language: z.enum(['javascript', 'typescript']).default('javascript').describe("Programming language of the script"),
  timeout: z.number().int().positive().max(300000).optional().describe("Execution timeout in milliseconds (max 5 minutes)"),
  description: z.string().optional().describe("Optional description of what the code does"),
}).strict();

const codeExecutionOutputSchema = z.object({
  result: z.string().describe("Stringified execution result or output"),
  success: z.boolean().describe("Whether the code executed successfully"),
  logs: z.array(z.object({
    message: z.string(),
    type: z.enum(['log', 'error', 'warn', 'info']),
    timestamp: z.string().optional(),
  })).optional().describe("Execution logs and console output"),
  executionTime: z.number().optional().describe("Execution time in milliseconds"),
  error: z.string().optional().describe("Error message if execution failed"),
  metadata: z.record(z.any()).optional().describe("Additional execution metadata"),
}).strict();

/**
 * Mastra-compatible code execution tool that wraps freestyle-sandboxes
 * 
 * This tool enables agents to execute JavaScript/TypeScript code in a secure sandbox environment
 * with access to predefined node modules and environment variables.
 * 
 * @example
 * ```typescript
 * const result = await codeExecutionTool.execute({
 *   script: `
 *     export default () => {
 *       const data = [1, 2, 3, 4, 5];
 *       const sum = data.reduce((a, b) => a + b, 0);
 *       console.log("Sum:", sum);
 *       return { sum, average: sum / data.length };
 *     };
 *   `,
 *   language: 'javascript',
 *   description: 'Calculate sum and average of numbers'
 * });
 * ```
 */
export const codeExecutionTool = createTool({
  id: 'code-execution',
  description: `Execute JavaScript or TypeScript code in a secure sandbox environment. 
    Supports popular node modules like lodash, date-fns, axios, uuid, crypto-js, and more.
    Perfect for data processing, API calls, calculations, and code demonstrations.`,
  inputSchema: codeExecutionInputSchema,
  outputSchema: codeExecutionOutputSchema,
  execute: async ({ context, runtimeContext }) => {
    const { script, language = 'javascript', timeout, description } = context;
    const startTime = Date.now();
    
    logger.info('Executing code in sandbox', {
      language,
      timeout,
      description,
      scriptLength: script.length,
      userId: runtimeContext?.get('user-id'),
      sessionId: runtimeContext?.get('session-id')
    });

    try {
      // Validate and prepare the script
      if (!script.trim()) {
        throw new Error('Script cannot be empty');
      }

      // Execute the code using freestyle-sandboxes
      const executionResult = await codeExecutor({
        script,
        // Add timeout if specified
        ...(timeout && { timeout })
      });

      const executionTime = Date.now() - startTime;

      // Process and format the result
      let formattedResult: string;
      let success = true;
      let error: string | undefined;
      let logs: Array<{ message: string; type: 'log' | 'error' | 'warn' | 'info'; timestamp?: string }> = [];

      // Handle different result formats from freestyle-sandboxes
      if (executionResult && typeof executionResult === 'object') {
        // Extract logs if available
        if ('logs' in executionResult && Array.isArray(executionResult.logs)) {
          logs = executionResult.logs.map((log: unknown) => {
            const logObj = log as Record<string, unknown>;
            return {
              message: String(logObj.message || log),
              type: (logObj.type as 'log' | 'error' | 'warn' | 'info') || 'log',
              timestamp: (logObj.timestamp as string) || new Date().toISOString()
            };
          });
        }

        // Extract result
        if ('result' in executionResult) {
          formattedResult = typeof executionResult.result === 'string' 
            ? executionResult.result 
            : JSON.stringify(executionResult.result, null, 2);
        } else {
          formattedResult = JSON.stringify(executionResult, null, 2);
        }

        // Check for errors
        if ('error' in executionResult && executionResult.error) {
          success = false;
          error = String(executionResult.error);
        }
      } else {
        // Handle simple result
        formattedResult = typeof executionResult === 'string' 
          ? executionResult 
          : JSON.stringify(executionResult, null, 2);
      }

      const result = {
        result: formattedResult,
        success,
        logs: logs.length > 0 ? logs : undefined,
        executionTime,
        error,
        metadata: {
          language,
          description,
          timestamp: new Date().toISOString(),
          scriptLength: script.length
        }
      };

      logger.info('Code execution completed', {
        success,
        executionTime,
        resultLength: formattedResult.length,
        logsCount: logs.length
      });

      return result;

    } catch (executionError: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMessage = executionError instanceof Error ? executionError.message : 'Unknown execution error';
      
      logger.error('Code execution failed', {
        error: errorMessage,
        executionTime,
        language,
        scriptLength: script.length
      });

      return {
        result: '',
        success: false,
        error: errorMessage,
        executionTime,
        logs: [{
          message: errorMessage,
          type: 'error' as const,
          timestamp: new Date().toISOString()
        }],
        metadata: {
          language,
          description,
          timestamp: new Date().toISOString(),
          scriptLength: script.length,
          failed: true
        }
      };
    }
  }
});
        error,
        metadata: {
          language,
          description,
          timestamp: new Date().toISOString(),
          scriptLength: script.length
        }
      };

      logger.info('Code execution completed', {
        success,
        executionTime,
        resultLength: formattedResult.length,
        logsCount: logs.length
      });

      return result;

    } catch (executionError: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMessage = executionError instanceof Error ? executionError.message : 'Unknown execution error';
      
      logger.error('Code execution failed', {
        error: errorMessage,
        executionTime,
        language,
        scriptLength: script.length
      });

      return {
        result: '',
        success: false,
        error: errorMessage,
        executionTime,
        logs: [{
          message: errorMessage,
          type: 'error' as const,
          timestamp: new Date().toISOString()
        }],
        metadata: {
          language,
          description,
          timestamp: new Date().toISOString(),
          scriptLength: script.length,
          failed: true
        }
      };
    }
  }
});

