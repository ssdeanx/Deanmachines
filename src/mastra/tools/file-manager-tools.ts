import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { RuntimeContext } from '@mastra/core/di';
import { z } from 'zod';
import { PinoLogger } from '@mastra/loggers';
import { generateId } from 'ai';
import * as ivm from 'isolated-vm';
import * as shell from 'shelljs';
import * as fs from 'fs';
import * as path from 'path';
import { SharedIsolateManager } from './git-tool';

const logger = new PinoLogger({ name: 'FileManagerTools', level: 'info' });

/**
 * Runtime context type for file manager tools
 * 
 * @mastra Runtime context for file operations with security and integration settings
 */
export type FileManagerRuntimeContext = {
  'user-id'?: string;
  'session-id'?: string;
  'base-path'?: string;
  'max-file-size'?: number;
  'allowed-extensions'?: string[];
  'enable-system-access'?: boolean;
  'execution-timeout'?: number;
  'memory-limit'?: number;
  'debug'?: boolean;
  'temp-dir'?: string;
  'shared-isolate'?: ivm.Isolate;
  'use-shared-isolate'?: boolean;
};

/**
 * File operation types
 */
const FILE_OPERATIONS = [
  'read', 'write', 'append', 'delete', 'copy', 'move', 'mkdir', 'rmdir',
  'list', 'exists', 'stat', 'chmod', 'search', 'watch', 'compress', 'extract'
] as const;
type FileOperation = typeof FILE_OPERATIONS[number];

/**
 * Check if an operation is a supported file operation
 */
const isFileOperation = (operation: string): operation is FileOperation => {
  return FILE_OPERATIONS.includes(operation as FileOperation);
};

/**
 * File operation result type
 */
type FileOperationResult = {
  success: boolean;
  result?: unknown;
  output: string;
  error?: string;
  operation: FileOperation;
  filePath: string;
  executionTime: number;
  requestId: string;
  userId?: string;
  sessionId?: string;
};

/**
 * File search result type
 */
type FileSearchResult = {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  matches?: Array<{
    line: number;
    content: string;
    column?: number;
  }>;
};

/**
 * File watch event type
 */
type FileWatchEvent = {
  type: string;
  path: string;
  timestamp: string;
  details?: Record<string, unknown>;
};

/**
 * Input schema for file operations
 */
const fileOperationInputSchema = z.object({
  operation: z.enum(FILE_OPERATIONS)
    .describe('File operation to perform'),
  filePath: z.string()
    .min(1, 'File path cannot be empty')
    .describe('Path to the file or directory'),
  content: z.string()
    .optional()
    .describe('Content for write/append operations'),
  destination: z.string()
    .optional()
    .describe('Destination path for copy/move operations'),
  options: z.object({
    encoding: z.string().optional().default('utf8').describe('File encoding'),
    recursive: z.boolean().optional().default(false).describe('Recursive operation'),
    force: z.boolean().optional().default(false).describe('Force operation'),
    pattern: z.string().optional().describe('Search pattern for search operations'),
    mode: z.string().optional().describe('File permissions mode'),
    createDirs: z.boolean().optional().default(true).describe('Create directories if they don\'t exist'),
  }).optional().default({}).describe('Operation-specific options'),
  timeout: z.number()
    .min(1000)
    .max(60000)
    .optional()
    .default(10000)
    .describe('Operation timeout in milliseconds'),
  useSharedIsolate: z.boolean()
    .optional()
    .default(false)
    .describe('Use shared isolate-vm instance for cross-tool operations'),
}).strict();

/**
 * Output schema for file operation results
 */
const fileOperationOutputSchema = z.object({
  success: z.boolean().describe('Whether the file operation succeeded'),
  result: z.unknown().optional().describe('Operation result data'),
  output: z.string().describe('Operation output or file content'),
  error: z.string().optional().describe('Error message if operation failed'),
  operation: z.enum(FILE_OPERATIONS).describe('File operation that was performed'),
  filePath: z.string().describe('File path used for the operation'),
  executionTime: z.number().describe('Operation execution time in milliseconds'),
  requestId: z.string().describe('Unique request identifier'),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
}).strict();

/**
 * @mastra Tool for comprehensive file system operations with shared isolate support
 * 
 * Provides secure file operations with configurable permissions, shared isolate integration,
 * and cross-tool compatibility with Git and code execution environments.
 * 
 * @param input - File operation parameters
 * @param runtimeContext - Runtime configuration context
 * @returns Promise resolving to file operation results
 * 
 * @example
 * ```typescript
 * const result = await fileOperationTool.execute({
 *   input: {
 *     operation: 'read',
 *     filePath: '/path/to/file.txt',
 *     options: { encoding: 'utf8' }
 *   }
 * });
 * ```
 * 
 * @mastra File operations tool with cross-tool integration
 */
export const fileOperationTool = createTool({
  id: 'file-operations',
  description: 'Execute file system operations safely with cross-tool integration',
  inputSchema: fileOperationInputSchema,
  outputSchema: fileOperationOutputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof fileOperationInputSchema> & {
    input: z.infer<typeof fileOperationInputSchema>;
    runtimeContext?: RuntimeContext<FileManagerRuntimeContext>;
  }): Promise<FileOperationResult> => {
    const requestId = generateId();
    const startTime = Date.now();
    
    // Get runtime context values with defaults
    const userId = (runtimeContext?.get('user-id') as string) || 'anonymous';
    const sessionId = (runtimeContext?.get('session-id') as string) || 'default';
    const basePath = (runtimeContext?.get('base-path') as string) || process.cwd();
    const maxFileSize = Number(runtimeContext?.get('max-file-size') || 10 * 1024 * 1024); // 10MB
    const allowedExtensions = (runtimeContext?.get('allowed-extensions') as string[]) || [];
    const enableSystemAccess = Boolean(runtimeContext?.get('enable-system-access') ?? true);
    const executionTimeout = Number(runtimeContext?.get('execution-timeout') || input.timeout || 10000);
    const memoryLimit = Number(runtimeContext?.get('memory-limit') || 256);
    const debug = Boolean(runtimeContext?.get('debug') || false);
    const tempDir = (runtimeContext?.get('temp-dir') as string) || '/tmp/mastra-files';
    const sharedIsolate = runtimeContext?.get('shared-isolate') as ivm.Isolate | undefined;
    const useSharedIsolate = Boolean(runtimeContext?.get('use-shared-isolate') ?? input.useSharedIsolate ?? false);
    
    if (debug) {
      logger.info(`[${requestId}] File operation request started`, {
        operation: input.operation,
        filePath: input.filePath,
        options: input.options,
        timeout: executionTimeout,
        useSharedIsolate,
        userId,
        sessionId
      });
    }

    let output = '';
    let result: unknown;
    let error: string | undefined;
    let success = false;

    try {
      if (!enableSystemAccess) {
        throw new Error('System access is required for file operations but is disabled');
      }

      if (!isFileOperation(input.operation)) {
        throw new Error(`Unsupported file operation: ${input.operation}`);
      }

      // Resolve and validate file path
      const resolvedPath = path.resolve(basePath, input.filePath);
      
      // Security check: ensure path is within base path
      if (!resolvedPath.startsWith(path.resolve(basePath))) {
        throw new Error('File path is outside allowed base directory');
      }

      // Check file extension if restrictions are set
      if (allowedExtensions.length > 0) {
        const ext = path.extname(resolvedPath).toLowerCase();
        if (ext && !allowedExtensions.includes(ext)) {
          throw new Error(`File extension '${ext}' is not allowed`);
        }
      }

      // Execute file operation
      if (useSharedIsolate) {
        const operationResult = await executeFileOperationInSharedIsolate(
          sessionId,
          input.operation,
          resolvedPath,
          input.options || {},
          {
            sharedIsolate,
            memoryLimit,
            timeout: executionTimeout,
            tempDir,
            maxFileSize,
            debug,
            requestId
          },
          input.content,
          input.destination
        );
        
        output = operationResult.output;
        result = operationResult.result;
        success = operationResult.success;
        if (!success) {
          error = operationResult.error;
        }
      } else {
        // Execute directly using Node.js fs operations
        const operationResult = await executeFileOperationDirect(
          input.operation,
          resolvedPath,
          input.content,
          input.destination,
          input.options || {},
          {
            maxFileSize,
            debug,
            requestId
          }
        );
        
        output = operationResult.output;
        result = operationResult.result;
        success = operationResult.success;
        if (!success) {
          error = operationResult.error;
        }
      }

      if (debug) {
        logger.info(`[${requestId}] File operation completed`, {
          success,
          operation: input.operation,
          filePath: resolvedPath,
          outputLength: output.length
        });
      }

    } catch (executionError) {
      success = false;
      error = executionError instanceof Error ? executionError.message : String(executionError);
      
      if (debug) {
        logger.error(`[${requestId}] File operation failed`, {
          error,
          operation: input.operation,
          filePath: input.filePath,
          userId,
          sessionId
        });
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    const fileResult: FileOperationResult = {
      success,
      result,
      output,
      error,
      operation: input.operation,
      filePath: input.filePath,
      executionTime,
      requestId,
      userId,
      sessionId,
    };
    
    return fileOperationOutputSchema.parse(fileResult);
  },
});

/**
 * Execute file operation in shared isolate
 */
async function executeFileOperationInSharedIsolate(
  sessionId: string,
  operation: FileOperation,
  filePath: string,
  options: Record<string, unknown>,
  config: {
    sharedIsolate?: ivm.Isolate;
    memoryLimit: number;
    timeout: number;
    tempDir: string;
    maxFileSize: number;
    debug: boolean;
    requestId: string;
  },
  content?: string,
  destination?: string
): Promise<{ success: boolean; output: string; result?: unknown; error?: string }> {
  const manager = SharedIsolateManager.getInstance();
  
  // Ensure we have an isolate (either shared or create new one)
  if (!config.sharedIsolate) {
    await manager.getOrCreateIsolate(sessionId, {
      memoryLimit: config.memoryLimit,
      timeout: config.timeout
    });
  }

  const fileOperationCode = generateFileOperationCode(operation, filePath, content, destination, options);

  return await manager.executeInSharedIsolate(sessionId, fileOperationCode, {
    timeout: config.timeout,
    type: 'mixed'
  });
}

/**
 * Execute file operation directly using Node.js
 */
async function executeFileOperationDirect(
  operation: FileOperation,
  filePath: string,
  content: string | undefined,
  destination: string | undefined,
  options: Record<string, unknown>,
  config: {
    maxFileSize: number;
    debug: boolean;
    requestId: string;
  }
): Promise<{ success: boolean; output: string; result?: unknown; error?: string }> {
  try {
    let result: unknown;
    let output = '';

    switch (operation) {
      case 'read':
        if (!fs.existsSync(filePath)) {
          throw new Error(`File does not exist: ${filePath}`);
        }
        const stats = fs.statSync(filePath);
        if (stats.size > config.maxFileSize) {
          throw new Error(`File too large: ${stats.size} bytes (max: ${config.maxFileSize})`);
        }
        result = fs.readFileSync(filePath, { encoding: (options.encoding as BufferEncoding) || 'utf8' });
        output = `Read ${stats.size} bytes from ${filePath}`;
        break;

      case 'write':
        if (!content) {
          throw new Error('Content is required for write operation');
        }
        if (options.createDirs) {
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        }
        fs.writeFileSync(filePath, content, { encoding: (options.encoding as BufferEncoding) || 'utf8' });
        const bytesWritten = Buffer.byteLength(content, (options.encoding as BufferEncoding) || 'utf8');
        result = { bytesWritten };
        output = `Wrote ${bytesWritten} bytes to ${filePath}`;
        break;

      case 'append':
        if (!content) {
          throw new Error('Content is required for append operation');
        }
        fs.appendFileSync(filePath, content, { encoding: (options.encoding as BufferEncoding) || 'utf8' });
        const bytesAppended = Buffer.byteLength(content, (options.encoding as BufferEncoding) || 'utf8');
        result = { bytesAppended };
        output = `Appended ${bytesAppended} bytes to ${filePath}`;
        break;

      case 'delete':
        if (!fs.existsSync(filePath)) {
          throw new Error(`File does not exist: ${filePath}`);
        }
        const isDir = fs.statSync(filePath).isDirectory();
        if (isDir) {
          if (options.recursive) {
            fs.rmSync(filePath, { recursive: true, force: Boolean(options.force) });
          } else {
            fs.rmdirSync(filePath);
          }
        } else {
          fs.unlinkSync(filePath);
        }
        result = { deleted: true, type: isDir ? 'directory' : 'file' };
        output = `Deleted ${isDir ? 'directory' : 'file'}: ${filePath}`;
        break;

      case 'copy':
        if (!destination) {
          throw new Error('Destination is required for copy operation');
        }
        if (options.createDirs) {
          const dir = path.dirname(destination);
          shell.mkdir('-p', dir);
        }
        shell.cp(filePath, destination);
        result = { copied: true, source: filePath, destination };
        output = `Copied ${filePath} to ${destination}`;
        break;

      case 'move':
        if (!destination) {
          throw new Error('Destination is required for move operation');
        }
        if (options.createDirs) {
          const dir = path.dirname(destination);
          shell.mkdir('-p', dir);
        }
        shell.mv(filePath, destination);
        result = { moved: true, source: filePath, destination };
        output = `Moved ${filePath} to ${destination}`;
        break;

      case 'mkdir':
        fs.mkdirSync(filePath, { recursive: Boolean(options.recursive) });
        result = { created: true, path: filePath };
        output = `Created directory: ${filePath}`;
        break;

      case 'list':
        if (!fs.existsSync(filePath)) {
          throw new Error(`Directory does not exist: ${filePath}`);
        }
        const items = fs.readdirSync(filePath, { withFileTypes: true });
        result = items.map(item => ({
          name: item.name,
          type: item.isDirectory() ? 'directory' : 'file',
          path: path.join(filePath, item.name)
        }));
        output = `Listed ${items.length} items in ${filePath}`;
        break;

      case 'exists':
        const exists = fs.existsSync(filePath);
        result = { exists };
        output = `File ${exists ? 'exists' : 'does not exist'}: ${filePath}`;
        break;

      case 'stat':
        if (!fs.existsSync(filePath)) {
          throw new Error(`File does not exist: ${filePath}`);
        }
        const fileStats = fs.statSync(filePath);
        result = {
          size: fileStats.size,
          isFile: fileStats.isFile(),
          isDirectory: fileStats.isDirectory(),
          created: fileStats.birthtime,
          modified: fileStats.mtime,
          accessed: fileStats.atime,
          mode: fileStats.mode
        };
        output = `File stats for ${filePath}: ${fileStats.size} bytes, ${fileStats.isDirectory() ? 'directory' : 'file'}`;
        break;

      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    return {
      success: true,
      output,
      result
    };

  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Generate JavaScript code for file operations in shared isolate
 */
function generateFileOperationCode(
  operation: FileOperation,
  filePath: string,
  content?: string,
  destination?: string,
  options: Record<string, unknown> = {}
): string {
  const optionsStr = JSON.stringify(options);
  const contentStr = content ? JSON.stringify(content) : 'undefined';
  const destinationStr = destination ? JSON.stringify(destination) : 'undefined';

  return `
    const operation = ${JSON.stringify(operation)};
    const filePath = ${JSON.stringify(filePath)};
    const content = ${contentStr};
    const destination = ${destinationStr};
    const options = ${optionsStr};

    try {
      let result;
      let output = '';

      switch (operation) {
        case 'read':
          if (!fs.existsSync(filePath)) {
            throw new Error('File does not exist: ' + filePath);
          }
          result = fs.readFileSync(filePath, { encoding: options.encoding || 'utf8' });
          output = 'Read file: ' + filePath;
          break;

        case 'write':
          if (!content) {
            throw new Error('Content is required for write operation');
          }
          if (options.createDirs) {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
          }
          fs.writeFileSync(filePath, content, { encoding: options.encoding || 'utf8' });
          result = { bytesWritten: Buffer.byteLength(content, options.encoding || 'utf8') };
          output = 'Wrote to file: ' + filePath;
          break;

        case 'list':
          if (!fs.existsSync(filePath)) {
            throw new Error('Directory does not exist: ' + filePath);
          }
          const items = fs.readdirSync(filePath, { withFileTypes: true });
          result = items.map(item => ({
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
            path: path.join(filePath, item.name)
          }));
          output = 'Listed ' + items.length + ' items in ' + filePath;
          break;

        case 'exists':
          result = { exists: fs.existsSync(filePath) };
          output = 'File ' + (result.exists ? 'exists' : 'does not exist') + ': ' + filePath;
          break;

        default:
          throw new Error('Unsupported operation in shared isolate: ' + operation);
      }

      console.log(output);
      return result;

    } catch (error) {
      console.error('File operation error:', error.message);
      throw error;
    }
  `;
}

/**
 * Input schema for file search operations
 */
const fileSearchInputSchema = z.object({
  searchPath: z.string()
    .min(1, 'Search path cannot be empty')
    .describe('Directory path to search in'),
  pattern: z.string()
    .min(1, 'Search pattern cannot be empty')
    .describe('Search pattern (glob or regex)'),
  options: z.object({
    recursive: z.boolean().optional().default(true).describe('Search recursively'),
    caseSensitive: z.boolean().optional().default(false).describe('Case sensitive search'),
    includeContent: z.boolean().optional().default(false).describe('Search within file content'),
    maxResults: z.number().optional().default(100).describe('Maximum number of results'),
    fileTypes: z.array(z.string()).optional().describe('File extensions to include'),
    excludePatterns: z.array(z.string()).optional().default([]).describe('Patterns to exclude'),
  }).optional().default({}).describe('Search options'),
  useSharedIsolate: z.boolean()
    .optional()
    .default(false)
    .describe('Use shared isolate-vm instance'),
}).strict();

/**
 * @mastra Tool for advanced file search operations
 *
 * Provides powerful file search capabilities with pattern matching,
 * content search, and integration with shared isolate environments.
 *
 * @example
 * ```typescript
 * const result = await fileSearchTool.execute({
 *   input: {
 *     searchPath: '/project/src',
 *     pattern: '*.ts',
 *     options: { includeContent: true, recursive: true }
 *   }
 * });
 * ```
 *
 * @mastra File search tool with advanced pattern matching
 */
export const fileSearchTool = createTool({
  id: 'file-search',
  description: 'Advanced file search with pattern matching and content search',
  inputSchema: fileSearchInputSchema,
  outputSchema: z.object({
    success: z.boolean(),
    results: z.array(z.object({
      path: z.string(),
      type: z.enum(['file', 'directory']),
      size: z.number().optional(),
      matches: z.array(z.object({
        line: z.number(),
        content: z.string(),
        column: z.number().optional(),
      })).optional(),
    })),
    totalFound: z.number(),
    searchTime: z.number(),
    requestId: z.string(),
  }),
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof fileSearchInputSchema> & {
    input: z.infer<typeof fileSearchInputSchema>;
    runtimeContext?: RuntimeContext<FileManagerRuntimeContext>;
  }) => {
    const requestId = generateId();
    const startTime = Date.now();

    const sessionId = (runtimeContext?.get('session-id') as string) || 'default';
    const basePath = (runtimeContext?.get('base-path') as string) || process.cwd();
    const useSharedIsolate = Boolean(input.useSharedIsolate);

    try {
      const searchPath = path.resolve(basePath, input.searchPath);

      if (useSharedIsolate) {
        const manager = SharedIsolateManager.getInstance();
        const searchCode = generateFileSearchCode(searchPath, input.pattern, input.options || {});

        const result = await manager.executeInSharedIsolate(sessionId, searchCode, {
          timeout: 30000,
          type: 'mixed'
        });

        return {
          success: result.success,
          results: (result.result as FileSearchResult[]) || [],
          totalFound: ((result.result as FileSearchResult[])?.length) || 0,
          searchTime: Date.now() - startTime,
          requestId,
        };
      } else {
        // Direct search implementation
        const results = await performFileSearch(searchPath, input.pattern, input.options || {});

        return {
          success: true,
          results,
          totalFound: results.length,
          searchTime: Date.now() - startTime,
          requestId,
        };
      }
    } catch {
      return {
        success: false,
        results: [],
        totalFound: 0,
        searchTime: Date.now() - startTime,
        requestId,
      };
    }
  },
});

/**
 * Input schema for file watcher operations
 */
const fileWatchInputSchema = z.object({
  watchPath: z.string()
    .min(1, 'Watch path cannot be empty')
    .describe('Path to watch for changes'),
  events: z.array(z.enum(['create', 'modify', 'delete', 'rename']))
    .optional()
    .default(['create', 'modify', 'delete'])
    .describe('Events to watch for'),
  options: z.object({
    recursive: z.boolean().optional().default(true).describe('Watch recursively'),
    debounceMs: z.number().optional().default(100).describe('Debounce delay in milliseconds'),
    maxEvents: z.number().optional().default(1000).describe('Maximum events to capture'),
    duration: z.number().optional().default(30000).describe('Watch duration in milliseconds'),
  }).optional().default({}).describe('Watch options'),
  useSharedIsolate: z.boolean()
    .optional()
    .default(false)
    .describe('Use shared isolate-vm instance'),
}).strict();

/**
 * @mastra Tool for file system watching and monitoring
 *
 * Monitors file system changes in real-time with configurable events
 * and integration with shared isolate environments for cross-tool coordination.
 *
 * @example
 * ```typescript
 * const result = await fileWatchTool.execute({
 *   input: {
 *     watchPath: '/project/src',
 *     events: ['modify', 'create'],
 *     options: { duration: 60000, recursive: true }
 *   }
 * });
 * ```
 *
 * @mastra File system watcher tool
 */
export const fileWatchTool = createTool({
  id: 'file-watch',
  description: 'Monitor file system changes in real-time',
  inputSchema: fileWatchInputSchema,
  outputSchema: z.object({
    success: z.boolean(),
    events: z.array(z.object({
      type: z.string(),
      path: z.string(),
      timestamp: z.string(),
      details: z.record(z.unknown()).optional(),
    })),
    totalEvents: z.number(),
    watchDuration: z.number(),
    requestId: z.string(),
  }),
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof fileWatchInputSchema> & {
    input: z.infer<typeof fileWatchInputSchema>;
    runtimeContext?: RuntimeContext<FileManagerRuntimeContext>;
  }) => {
    const requestId = generateId();
    const startTime = Date.now();

    const sessionId = (runtimeContext?.get('session-id') as string) || 'default';
    const basePath = (runtimeContext?.get('base-path') as string) || process.cwd();
    const useSharedIsolate = Boolean(input.useSharedIsolate);

    try {
      const watchPath = path.resolve(basePath, input.watchPath);

      if (useSharedIsolate) {
        const manager = SharedIsolateManager.getInstance();
        const watchCode = generateFileWatchCode(watchPath, input.events, input.options || {});

        const result = await manager.executeInSharedIsolate(sessionId, watchCode, {
          timeout: (input.options?.duration || 30000) + 5000,
          type: 'mixed'
        });

        return {
          success: result.success,
          events: (result.result as FileWatchEvent[]) || [],
          totalEvents: ((result.result as FileWatchEvent[])?.length) || 0,
          watchDuration: Date.now() - startTime,
          requestId,
        };
      } else {
        // Direct watch implementation would go here
        // For now, return empty results
        return {
          success: true,
          events: [],
          totalEvents: 0,
          watchDuration: Date.now() - startTime,
          requestId,
        };
      }
    } catch {
      return {
        success: false,
        events: [],
        totalEvents: 0,
        watchDuration: Date.now() - startTime,
        requestId,
      };
    }
  },
});

/**
 * Perform file search operation
 */
async function performFileSearch(
  searchPath: string,
  pattern: string,
  options: Record<string, unknown>
): Promise<FileSearchResult[]> {
  const results: FileSearchResult[] = [];

  function searchDirectory(dir: string) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);

        // Check if item matches pattern
        const matches = item.name.match(new RegExp(pattern, options.caseSensitive ? 'g' : 'gi'));

        if (matches) {
          const stats = fs.statSync(fullPath);
          results.push({
            path: fullPath,
            type: item.isDirectory() ? 'directory' : 'file',
            size: stats.size,
          });
        }

        // Recurse into directories if recursive option is enabled
        if (item.isDirectory() && options.recursive && results.length < (options.maxResults as number || 100)) {
          searchDirectory(fullPath);
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  searchDirectory(searchPath);
  return results.slice(0, options.maxResults as number || 100);
}

/**
 * Generate JavaScript code for file search in shared isolate
 */
function generateFileSearchCode(
  searchPath: string,
  pattern: string,
  options: Record<string, unknown>
): string {
  return `
    const searchPath = ${JSON.stringify(searchPath)};
    const pattern = ${JSON.stringify(pattern)};
    const options = ${JSON.stringify(options)};

    const results = [];

    function searchDirectory(dir) {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
          const fullPath = path.join(dir, item.name);

          const regex = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
          const matches = item.name.match(regex);

          if (matches) {
            const stats = fs.statSync(fullPath);
            results.push({
              path: fullPath,
              type: item.isDirectory() ? 'directory' : 'file',
              size: stats.size,
            });
          }

          if (item.isDirectory() && options.recursive && results.length < (options.maxResults || 100)) {
            searchDirectory(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    searchDirectory(searchPath);
    console.log('Found ' + results.length + ' matching files');
    return results.slice(0, options.maxResults || 100);
  `;
}

/**
 * Generate JavaScript code for file watching in shared isolate
 */
function generateFileWatchCode(
  watchPath: string,
  events: string[],
  options: Record<string, unknown>
): string {
  return `
    const watchPath = ${JSON.stringify(watchPath)};
    const events = ${JSON.stringify(events)};
    const options = ${JSON.stringify(options)};

    const capturedEvents = [];
    const duration = options.duration || 30000;

    console.log('Starting file watch on: ' + watchPath + ' for ' + duration + 'ms');

    // Simulate file watching (in a real implementation, you'd use fs.watch)
    // For now, just return empty events array
    setTimeout(() => {
      console.log('File watch completed, captured ' + capturedEvents.length + ' events');
    }, Math.min(duration, 1000));

    return capturedEvents;
  `;
}

/**
 * Runtime context instance for file manager tools
 */
export const fileManagerRuntimeContext = new RuntimeContext<FileManagerRuntimeContext>();
fileManagerRuntimeContext.set('base-path', process.cwd());
fileManagerRuntimeContext.set('max-file-size', 10 * 1024 * 1024); // 10MB
fileManagerRuntimeContext.set('allowed-extensions', []);
fileManagerRuntimeContext.set('enable-system-access', true);
fileManagerRuntimeContext.set('execution-timeout', 10000);
fileManagerRuntimeContext.set('memory-limit', 256);
fileManagerRuntimeContext.set('use-shared-isolate', false);
fileManagerRuntimeContext.set('debug', false);
fileManagerRuntimeContext.set('temp-dir', '/tmp/mastra-files');
