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

// Configure logger
const logger = createLogger({ name: 'mastra-advanced-hooks', level: 'debug' });

// Define the shape of the wrapped result object you pass in
interface WrappedResponse {
  result: {
    text?: string;
    object?: unknown;
    error?: string;
    // …plus any other fields your agents return…
  };
}

// Extend your config to include `agent`
export interface ResponseHookConfig {
  agent?: string;
  minResponseLength?: number;
  maxAttempts?: number;
  validateResponse?: (response: WrappedResponse['result']) => boolean;
  enableTracing?: boolean;
}

export function createResponseHook(config: ResponseHookConfig = {}) {
  const {
    agent,
    minResponseLength = 10,
    maxAttempts = 3,
    validateResponse = (resp) =>
      !!(resp.text || (resp.object && Object.keys(resp.object).length > 0)),
    enableTracing = true,
  } = config;

  return async function onResponse(
    wrapper: WrappedResponse,
    attempt = 1
  ): Promise<WrappedResponse['result']> {
    const response = wrapper.result;

    const hookSpan = enableTracing
      ? trace.getTracer('mastra-hooks').startSpan('response-hook')
      : null;

    try {
      const currentSpan = trace.getSpan(context.active());
      const traceId = currentSpan?.spanContext().traceId;
      const spanId = currentSpan?.spanContext().spanId;

      logger.debug(`Response hook for agent=${agent} attempt=${attempt}`, {
        traceId,
        spanId,
        hasText: !!response.text,
        textLength: response.text?.length,
      });

      hookSpan?.setAttribute('response.validation.passed', validateResponse(response));

      if (validateResponse(response)) {
        hookSpan?.setStatus({ code: SpanStatusCode.OK });
        hookSpan?.setAttribute('response.valid', true);
        hookSpan?.end();
        return response;
      }

      if (attempt < maxAttempts) {
        hookSpan?.setAttribute('response.retry', true);
        hookSpan?.setAttribute('response.attempt', attempt);
        hookSpan?.end();
        logger.info(`Invalid response, retrying ${attempt + 1}/${maxAttempts}`);
        return onResponse(wrapper, attempt + 1);
      }

      hookSpan?.setStatus({
        code: SpanStatusCode.ERROR,
        message: 'Validation failed after retries',
      });
      hookSpan?.setAttribute('response.validation.failed_attempts', maxAttempts);
      hookSpan?.end();
      return {
        text: `Agent ${agent} failed to produce a valid response.`,
        error: 'validation_failed',
      };
    } catch (err) {
      logger.error('Response hook exception', { error: err });
      hookSpan?.setStatus({
        code: SpanStatusCode.ERROR,
        message: (err as Error).message,
      });
      hookSpan?.recordException(err as Error);
      hookSpan?.end();
      return {
        text: 'An error occurred in response hook.',
        error: (err as Error).message,
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
        logger.debug('Stream processing ended successfully.', { 
          resultType: typeof result,
        }); 
        
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
          streamSpan.recordException(error as Error);
          streamSpan.end();
        }
      }
    },
    
    onStreamError: async (error: Error): Promise<void> => {
      const streamSpan = enableTracing
        ? trace.getTracer('mastra-hooks').startSpan('stream-error')
        : null;
        
      try {
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
      } catch (hookError) {
        logger.error('Error in stream error hook:', { hookError });
        if (streamSpan) {
          streamSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: 'Error in stream error hook'
          });
          streamSpan.recordException(hookError as Error);
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
