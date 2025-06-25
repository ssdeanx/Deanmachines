/**
 * Enhanced Upstash Logger Configuration for Dean Machines RSC
 * 
 * Provides distributed logging using Upstash Redis for:
 * - Multi-agent conversation logs
 * - Performance metrics and tracing
 * - Error tracking and debugging
 * - Real-time log aggregation across instances
 * 
 * Features:
 * - Automatic batching and flushing
 * - Configurable retention policies
 * - Query capabilities by runId, timestamp, log level
 * - Integration with existing PinoLogger patterns
 * 
 * @see https://upstash.com/docs/redis/introduction
 * @version 1.0.0
 * @author Dean Machines RSC Team
 * 
 * [EDIT: 2025-06-22] [BY: GitHub Copilot]
 */

import { PinoLogger } from '@mastra/loggers';
import { LoggerTransport } from '@mastra/core/logger';
import { z } from 'zod';

/**
 * Base log entry type for consistent structure
 */
type LogEntry = {
  level: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
};

/**
 * Logger metadata type for better type safety
 */
type LogMetadata = Record<string, string | number | boolean | null | undefined>;

/**
 * Callback function type for stream operations
 */
type StreamCallback = (error?: Error | null) => void;

/**
 * Upstash Transport class for distributed logging
 * Based on the implementation from @mastra/loggers but with proper typing
 */
class UpstashTransport extends LoggerTransport {
  upstashUrl: string;
  upstashToken: string;
  listName: string;
  maxListLength: number;
  batchSize: number;
  flushInterval: number;
  logBuffer: LogEntry[];
  lastFlush: number;
  flushIntervalId: NodeJS.Timeout;

  constructor(opts: {
    listName?: string;
    maxListLength?: number;
    batchSize?: number;
    upstashUrl: string;
    flushInterval?: number;
    upstashToken: string;
  }) {
    super({ objectMode: true });
    
    if (!opts.upstashUrl || !opts.upstashToken) {
      throw new Error('Upstash URL and token are required');
    }
    
    this.upstashUrl = opts.upstashUrl;
    this.upstashToken = opts.upstashToken;
    this.listName = opts.listName || 'application-logs';
    this.maxListLength = opts.maxListLength || 10000;
    this.batchSize = opts.batchSize || 100;
    this.flushInterval = opts.flushInterval || 10000;
    this.logBuffer = [];
    this.lastFlush = Date.now();
    
    this.flushIntervalId = setInterval(() => {
      this._flush().catch((err) => {
        console.error('Error flushing logs to Upstash:', err);
      });
    }, this.flushInterval);
  }

  async executeUpstashCommand(command: unknown): Promise<unknown> {
    const response = await fetch(`${this.upstashUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.upstashToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([command])
    });
    
    if (!response.ok) {
      throw new Error(`Failed to execute Upstash command: ${response.statusText}`);
    }
    
    return response.json();
  }

  async _flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = this.logBuffer.splice(0, this.batchSize);
    
    try {
      const command = ['LPUSH', this.listName, ...logsToFlush.map(log => JSON.stringify(log))];
      await this.executeUpstashCommand(command);
      
      // Trim the list if it's getting too long
      await this.executeUpstashCommand(['LTRIM', this.listName, 0, this.maxListLength - 1]);
    } catch (error) {
      console.error('Error flushing logs to Upstash:', error);
      // Re-add logs to buffer on failure
      this.logBuffer.unshift(...logsToFlush);
    }
  }
  _transform(chunk: string, _enc: string, cb: StreamCallback): void {
    try {
      const logEntry = typeof chunk === 'string' ? JSON.parse(chunk) as LogEntry : chunk as LogEntry;
      this.logBuffer.push(logEntry);
      cb();
    } catch (error) {
      cb(error instanceof Error ? error : new Error('Failed to parse log entry'));
    }
  }

  _write(chunk: unknown, encoding?: string, callback?: StreamCallback): boolean {
    try {
      const logEntry = typeof chunk === 'string' ? JSON.parse(chunk) as LogEntry : chunk as LogEntry;
      this.logBuffer.push(logEntry);
      
      if (callback) {
        callback();
      }
    } catch (error) {
      if (callback) {
        callback(error instanceof Error ? error : new Error('Failed to process log entry'));
      }
    }
    
    return true;
  }

  _destroy(err: Error, cb: StreamCallback): void {
    if (this.flushIntervalId) {
      clearInterval(this.flushIntervalId);
    }
    
    this._flush().finally(() => {
      cb(err);
    });
  }
}

/**
 * Upstash Redis configuration schema with validation
 */
const upstashConfigSchema = z.object({
  // Core Redis configuration
  UPSTASH_REDIS_REST_URL: z.string().url('Invalid Upstash Redis URL'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'Upstash Redis token required'),
  
  // Optional logging configuration
  UPSTASH_LOG_LIST_NAME: z.string().default('mastra-application-logs'),
  UPSTASH_MAX_LIST_LENGTH: z.coerce.number().min(1000).max(100000).default(10000),
  UPSTASH_BATCH_SIZE: z.coerce.number().min(10).max(1000).default(100),
  UPSTASH_FLUSH_INTERVAL: z.coerce.number().min(1000).max(60000).default(10000), // 10 seconds
  
  // Environment-specific settings
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

/**
 * Validate and extract Upstash configuration from environment
 */
function validateUpstashConfig() {
  try {
    return upstashConfigSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn('⚠️ Upstash configuration validation failed, some features may be disabled:');
      error.errors.forEach((err) => {
        console.warn(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    return null;
  }
}

/**
 * Create enhanced Upstash transport with optimized settings
 */
function createUpstashTransport(config: ReturnType<typeof validateUpstashConfig>) {
  if (!config) {
    throw new Error('Invalid Upstash configuration');
  }

  return new UpstashTransport({
    upstashUrl: config.UPSTASH_REDIS_REST_URL,
    upstashToken: config.UPSTASH_REDIS_REST_TOKEN,
    listName: config.UPSTASH_LOG_LIST_NAME,
    maxListLength: config.UPSTASH_MAX_LIST_LENGTH,
    batchSize: config.UPSTASH_BATCH_SIZE,
    flushInterval: config.UPSTASH_FLUSH_INTERVAL,
  });
}

/**
 * Create environment-specific logger with Upstash transport
 * Automatically falls back to console logging if Upstash is unavailable
 */
export function createUpstashLogger(options?: {
  name?: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
  includeConsole?: boolean;
  forceUpstash?: boolean;
}) {
  const config = validateUpstashConfig();
  const {
    name = 'ai',
    level = config?.LOG_LEVEL || 'info',
    includeConsole = config?.NODE_ENV !== 'production',
    forceUpstash = false
  } = options || {};

  // Base logger configuration
  const baseConfig = {
    name,
    level,
    overrideDefaultTransports: true, // We'll define our own transports
  };  // Determine transports based on configuration and environment
  const transports: Record<string, unknown> = {};

  // Console transport for development or when explicitly requested
  if (includeConsole) {
    transports.console = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
        messageFormat: '[{name}] {msg}',
        levelFirst: true,
      },
    };
  }

  // Upstash transport for distributed logging
  if (config) {
    try {
      transports.upstash = createUpstashTransport(config);
      console.log('✅ Upstash transport initialized successfully');
    } catch (error) {
      console.warn('⚠️ Failed to initialize Upstash transport:', error);
      
      if (forceUpstash) {
        throw error;
      }
      
      // Fallback to console if Upstash fails and not forcing
      if (!includeConsole) {
        transports.console = {
          target: 'pino-pretty',
          options: {
            colorize: false,
            translateTime: 'yyyy-mm-dd HH:MM:ss',
          },
        };
        console.log('📝 Falling back to console logging');
      }
    }
  } else if (forceUpstash) {
    throw new Error('Upstash configuration required but not available');
  } else {
    console.log('📝 Upstash not configured, using console logging only');
  }

  return new PinoLogger({
    ...baseConfig,
    transports: transports as Record<string, LoggerTransport>,
  });
}

/**
 * Agent-specific logger factory with contextual metadata
 */
export function createAgentUpstashLogger(agentName: string, options?: {
  userId?: string;
  sessionId?: string;
  includeConsole?: boolean;
}) {
  const logger = createUpstashLogger({
    name: `agent-${agentName}`,
    level: 'info',
    includeConsole: options?.includeConsole,
  });
  // Add contextual metadata to all logs
  const contextualLogger = {
    debug: (message: string, args?: LogMetadata) => {
      logger.debug(message, {
        ...args,
        agentName,
        userId: options?.userId,
        sessionId: options?.sessionId,
        timestamp: new Date().toISOString(),
      });
    },
    info: (message: string, args?: LogMetadata) => {
      logger.info(message, {
        ...args,
        agentName,
        userId: options?.userId,
        sessionId: options?.sessionId,
        timestamp: new Date().toISOString(),
      });
    },
    warn: (message: string, args?: LogMetadata) => {
      logger.warn(message, {
        ...args,
        agentName,
        userId: options?.userId,
        sessionId: options?.sessionId,
        timestamp: new Date().toISOString(),
      });
    },
    error: (message: string, args?: LogMetadata) => {
      logger.error(message, {
        ...args,
        agentName,
        userId: options?.userId,
        sessionId: options?.sessionId,
        timestamp: new Date().toISOString(),
      });
    },
  };

  return contextualLogger;
}

/**
 * Performance logging utility for operations tracking
 */
export function createPerformanceUpstashLogger(operationType: string) {
  const logger = createUpstashLogger({
    name: `perf-${operationType}`,
    level: 'info',
  });
  return {
    startOperation: (operationId: string, metadata?: LogMetadata) => {
      logger.info(`Operation started: ${operationId}`, {
        operationId,
        operationType,
        status: 'started',
        startTime: Date.now(),
        ...metadata,
      });
      return Date.now();
    },
    
    endOperation: (operationId: string, startTime: number, metadata?: LogMetadata) => {
      const duration = Date.now() - startTime;
      logger.info(`Operation completed: ${operationId}`, {
        operationId,
        operationType,
        status: 'completed',
        duration: `${duration}ms`,
        endTime: Date.now(),
        ...metadata,
      });
      return duration;
    },
    
    errorOperation: (operationId: string, startTime: number, error: Error, metadata?: LogMetadata) => {
      const duration = Date.now() - startTime;
      logger.error(`Operation failed: ${operationId}`, {
        operationId,
        operationType,
        status: 'failed',
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack,
        endTime: Date.now(),
        ...metadata,
      });
      return duration;
    },
  };
}

/**
 * Check Upstash connectivity and configuration
 */
export async function testUpstashConnection(): Promise<boolean> {
  const config = validateUpstashConfig();
  
  if (!config) {
    console.log('❌ Upstash configuration not available');
    return false;
  }

  try {
    const response = await fetch(`${config.UPSTASH_REDIS_REST_URL}/ping`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.UPSTASH_REDIS_REST_TOKEN}`,
      },
    });

    if (response.ok) {
      console.log('✅ Upstash connection test successful');
      return true;
    } else {
      console.log('❌ Upstash connection test failed:', response.statusText);
      return false;
    }
  } catch (error) {
    console.log('❌ Upstash connection test error:', error);
    return false;
  }
}

/**
 * Default Upstash logger instance for general use
 */
export const defaultUpstashLogger = createUpstashLogger({
  name: 'mastra-default',
  level: 'info',
});

// Export configuration validator for external use
export { validateUpstashConfig };

/**
 * Create a dual logger for agents that sends logs to both PinoLogger and Upstash
 * This utility allows agents to log to both local console and distributed Upstash Redis
 * 
 * @param agentName - Name of the agent for logging context
 * @param options - Additional configuration options
 * @returns Dual logger interface with both PinoLogger and Upstash logging
 * 
 * @example
 * ```typescript
 * const logger = createAgentDualLogger('weather-agent', {
 *   userId: 'user123',
 *   sessionId: 'session456'
 * });
 * 
 * logger.info('Weather data fetched', { temperature: 25 });
 * ```
 * 
 * [EDIT: 2025-06-22] [BY: GitHub Copilot]
 */
export function createAgentDualLogger(agentName: string, options?: {
  userId?: string;
  sessionId?: string;
  level?: 'debug' | 'info' | 'warn' | 'error';
}) {
  // Create PinoLogger for local/console logging (existing pattern)
  const agentPinoLogger = new PinoLogger({ 
    name: agentName, 
    level: options?.level || 'info' 
  });
  
  // Create Upstash logger for distributed logging
  const agentUpstashLogger = createUpstashLogger({
    name: `agent-${agentName}`,
    level: options?.level || 'info',
    includeConsole: process.env.NODE_ENV === 'development'
  });
  
  // Return dual logger interface that logs to both systems
  return {
    debug: (message: string, args?: LogMetadata) => {
      agentPinoLogger.debug(message, args);
      agentUpstashLogger.debug(message, {
        ...args,
        agentName,
        userId: options?.userId,
        sessionId: options?.sessionId,
        timestamp: new Date().toISOString(),
      });
    },
    info: (message: string, args?: LogMetadata) => {
      agentPinoLogger.info(message, args);
      agentUpstashLogger.info(message, {
        ...args,
        agentName,
        userId: options?.userId,
        sessionId: options?.sessionId,
        timestamp: new Date().toISOString(),
      });
    },
    warn: (message: string, args?: LogMetadata) => {
      agentPinoLogger.warn(message, args);
      agentUpstashLogger.warn(message, {
        ...args,
        agentName,
        userId: options?.userId,
        sessionId: options?.sessionId,
        timestamp: new Date().toISOString(),
      });
    },
    error: (message: string, args?: LogMetadata) => {
      agentPinoLogger.error(message, args);
      agentUpstashLogger.error(message, {
        ...args,
        agentName,
        userId: options?.userId,
        sessionId: options?.sessionId,
        timestamp: new Date().toISOString(),
      });
    }
  };
}
