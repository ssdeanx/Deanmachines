/**
 * Mastra Agent Hooks
 * 
 * This module provides hook factories and utilities for agent lifecycle events.
 * These hooks can be used to add observability, validation, and error handling
 * to agents throughout the system.
 */

import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { createLogger } from '@mastra/core/logger';
import { AgentGenerateOptions } from '@mastra/core/agent';
import { langfuse } from '../services/langfuse';

// Configure logger
const logger = createLogger({ name: 'mastra-hooks', level: 'debug' });

// Define the AgentResponse type locally based on usage
interface AgentResponse {
  text?: string;
  object?: unknown; // Consider using a more specific type if the object structure is known
  error?: string;
  // Include other potential properties if needed based on the agent's actual response structure
}

/**
 * Response hook configuration interface
 */
export interface ResponseHookConfig {
  minResponseLength?: number;
  maxAttempts?: number;
  validateResponse?: (response: AgentResponse) => boolean;
  enableTracing?: boolean;
}

/**
 * Creates an onResponse hook for handling agent responses
 * @param config - Configuration options for the response hook
 */
export function createResponseHook(config: ResponseHookConfig = {}) {
  const {
    minResponseLength = 10,
    maxAttempts = 3,
    validateResponse = (response) =>
      !!(
        response.text ||
        (response.object && Object.keys(response.object).length > 0)
      ),
    enableTracing = true,
  } = config;

  return async function onResponse(
    response: AgentResponse,
    attempt = 1
  ): Promise<AgentResponse> {
    // Start an OpenTelemetry span for this hook if tracing is enabled
    const hookSpan = enableTracing 
      ? trace.getTracer('mastra-hooks').startSpan('response-hook')
      : null;
    
    try {
      // Get OTLP Context for correlation with observability tools
      const currentContext = context.active();
      const currentSpan = trace.getSpan(currentContext);
      const traceId = currentSpan?.spanContext().traceId;
      const spanId = currentSpan?.spanContext().spanId;
      
      logger.debug(`Response hook executing (attempt ${attempt}/${maxAttempts})`, {
        traceId,
        spanId,
        hasText: !!response.text,
        textLength: response.text?.length,
      });
      
      // Record validation attempt in Langfuse if available
      if (traceId) {
        try {
          langfuse.createScore({
            name: `response-validation-${attempt}`,
            value: validateResponse(response) ? 1.0 : 0.0,
            traceId,
            comment: `Response validation attempt ${attempt}/${maxAttempts}`,
          });
        } catch (err) {
          logger.warn("Failed to record validation in Langfuse", { error: err });
        }
      }

      // Check if response is valid according to custom validation
      if (validateResponse(response)) {
        if (hookSpan) {
          hookSpan.setStatus({ code: SpanStatusCode.OK });
          hookSpan.setAttribute('response.valid', true);
          hookSpan.end();
        }
        return response;
      }

      // Handle empty or invalid responses
      if (!response.text && !response.object) {
        if (attempt < maxAttempts) {
          if (hookSpan) {
            hookSpan.setAttribute('response.retry', true);
            hookSpan.setAttribute('response.attempt', attempt);
            hookSpan.end();
          }
          logger.info(`Empty response, retrying (${attempt}/${maxAttempts})`);
          return onResponse(response, attempt + 1);
        }
        
        logger.warn(`Maximum retry attempts reached (${maxAttempts})`);
        if (hookSpan) {
          hookSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: 'Empty response after maximum retries'
          });
          hookSpan.end();
        }
        
        return {
          text: "I apologize, but I couldn't generate a proper response. Please try rephrasing your request.",
          error: "Empty response after maximum retries",
        };
      }

      // Check response length if text is present
      if (response.text && response.text.length < minResponseLength) {
        logger.debug(`Response too short (${response.text.length} < ${minResponseLength}), adding suggestion for elaboration`);
        
        if (hookSpan) {
          hookSpan.setAttribute('response.tooShort', true);
          hookSpan.setAttribute('response.length', response.text.length);
          hookSpan.end();
        }
        
        return {
          ...response,
          text:
            response.text +
            "\n\nI apologize for the brief response. Would you like me to elaborate?",
        };
      }

      if (hookSpan) {
        hookSpan.setStatus({ code: SpanStatusCode.OK });
        hookSpan.end();
      }
      return response;
    } catch (error) {
      logger.error("Response hook error:", { error });
      
      if (hookSpan) {
        hookSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error in response hook'
        });
        hookSpan.recordException(error instanceof Error ? error : new Error('Unknown error'));
        hookSpan.end();
      }
      
      return {
        text: "I encountered an error processing the response. Please try again.",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  };
}

/**
 * Stream hook factory for monitoring and debugging streaming functionality
 * 
 * @param enableTracing Whether to enable OpenTelemetry tracing
 * @returns Object containing stream lifecycle hooks
 */
export function createStreamHooks(enableTracing = true) {
  return {
    onStreamStart: async (options: AgentGenerateOptions): Promise<void> => {
      const streamSpan = enableTracing
        ? trace.getTracer('mastra-hooks').startSpan('stream-start')
        : null;
        
      try {
        const currentSpan = trace.getSpan(context.active());
        const traceId = currentSpan?.spanContext().traceId;
        const spanId = currentSpan?.spanContext().spanId;

        const lastMessage = Array.isArray(options.context) && options.context.length > 0
          ? options.context[options.context.length - 1]
          : null;
        const inputContent = typeof lastMessage?.content === 'string' ? lastMessage.content : null;
        
        logger.debug('Stream processing started', { 
          traceId, 
          spanId,
          inputLength: inputContent ? inputContent.length : 'no-string-content',
          hasMessages: Array.isArray(options.context) ? options.context.length : 'no-messages',
        });
        
        if (streamSpan) {
          streamSpan.setAttribute('stream.started', true);
          streamSpan.end();
        }
      } catch (error) {
        logger.error('Error in stream start hook:', { error });
        if (streamSpan) {
          streamSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: 'Error in stream start hook'
          });
          streamSpan.end();
        }
      }
    },
    
    onStreamEnd: async (result: any): Promise<void> => {
      const streamSpan = enableTracing
        ? trace.getTracer('mastra-hooks').startSpan('stream-end')
        : null;
        
      try {
        logger.debug('Stream processing ended successfully');
        
        if (streamSpan) {
          streamSpan.setAttribute('stream.completed', true);
          streamSpan.end();
        }
      } catch (error) {
        logger.error('Error in stream end hook:', { error });
        if (streamSpan) {
          streamSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: 'Error in stream end hook'
          });
          streamSpan.end();
        }
      }
    },
    
    onStreamError: async (error: Error): Promise<void> => {
      const streamSpan = enableTracing
        ? trace.getTracer('mastra-hooks').startSpan('stream-error')
        : null;
        
      try {
        // Detailed error logging for debugging GOAL-001
        logger.error('Stream processing error:', {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
        });
        
        if (streamSpan) {
          streamSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          });
          streamSpan.recordException(error);
          streamSpan.end();
        }
        
        // Record error in Langfuse
        try {
          const currentSpan = trace.getSpan(context.active());
          const traceId = currentSpan?.spanContext().traceId;
          
          if (traceId) {
            langfuse.createScore({
              name: 'stream-error',
              value: 0.0,
              traceId,
              comment: `Stream error: ${error.message}`,
            });
          }
        } catch (err) {
          logger.warn("Failed to record stream error in Langfuse", { error: err });
        }
      } catch (hookError) {
        logger.error('Error in stream error hook:', { hookError });
        if (streamSpan) {
          streamSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: 'Error in stream error hook'
          });
          streamSpan.end();
        }
      }
    }
  };
}

/**
 * Tool execution hook factory for monitoring and debugging tool usage
 * 
 * @param toolName Name of the tool being monitored
 * @param enableTracing Whether to enable OpenTelemetry tracing
 * @returns Object containing tool lifecycle hooks
 */
export function createToolHooks(toolName: string, enableTracing = true) {
  return {
    onToolStart: async (input: unknown): Promise<void> => {
      const toolSpan = enableTracing
        ? trace.getTracer('mastra-hooks').startSpan(`tool-${toolName}-start`)
        : null;
        
      try {
        logger.debug(`Tool ${toolName} execution started`, {
          inputType: typeof input,
        });
        
        if (toolSpan) {
          toolSpan.setAttribute('tool.name', toolName);
          toolSpan.setAttribute('tool.started', true);
          toolSpan.end();
        }
      } catch (error) {
        logger.error(`Error in ${toolName} start hook:`, { error });
        if (toolSpan) {
          toolSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: `Error in ${toolName} start hook`
          });
          toolSpan.end();
        }
      }
    },
    
    onToolEnd: async (result: unknown): Promise<void> => {
      const toolSpan = enableTracing
        ? trace.getTracer('mastra-hooks').startSpan(`tool-${toolName}-end`)
        : null;
        
      try {
        logger.debug(`Tool ${toolName} execution completed successfully`);
        
        if (toolSpan) {
          toolSpan.setAttribute('tool.name', toolName);
          toolSpan.setAttribute('tool.completed', true);
          toolSpan.end();
        }
      } catch (error) {
        logger.error(`Error in ${toolName} end hook:`, { error });
        if (toolSpan) {
          toolSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: `Error in ${toolName} end hook`
          });
          toolSpan.end();
        }
      }
    },
    
    onToolError: async (error: Error): Promise<void> => {
      const toolSpan = enableTracing
        ? trace.getTracer('mastra-hooks').startSpan(`tool-${toolName}-error`)
        : null;
        
      try {
        logger.error(`Tool ${toolName} execution failed:`, {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack,
        });
        
        if (toolSpan) {
          toolSpan.setAttribute('tool.name', toolName);
          toolSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          });
          toolSpan.recordException(error);
          toolSpan.end();
        }
      } catch (hookError) {
        logger.error(`Error in ${toolName} error hook:`, { hookError });
        if (toolSpan) {
          toolSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: `Error in ${toolName} error hook`
          });
          toolSpan.end();
        }
      }
    }
  };
}
