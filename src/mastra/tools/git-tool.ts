import { createTool, ToolExecutionContext } from '@mastra/core/tools';
import { RuntimeContext } from '@mastra/core/di';
import { z } from 'zod';
import { PinoLogger } from '@mastra/loggers';
import { generateId } from 'ai';
import * as ivm from 'isolated-vm';
import * as shell from 'shelljs';
import * as fs from 'fs';
import * as path from 'path';

const logger = new PinoLogger({ name: 'GitTool', level: 'info' });

/**
 * Runtime context type for Git tool configuration
 * 
 * @mastra Runtime context for Git operations with security and repository settings
 */
export type GitRuntimeContext = {
  'user-id'?: string;
  'session-id'?: string;
  'repo-path'?: string;
  'default-branch'?: string;
  'commit-format'?: 'conventional' | 'standard' | 'custom';
  'branching-strategy'?: 'gitflow' | 'github-flow' | 'gitlab-flow' | 'custom';
  'enable-system-access'?: boolean;
  'execution-timeout'?: number;
  'memory-limit'?: number;
  'debug'?: boolean;
  'temp-dir'?: string;
  'shared-isolate'?: ivm.Isolate;
};

/**
 * Supported Git operations
 */
const GIT_OPERATIONS = [
  'clone', 'pull', 'push', 'fetch', 'status', 'add', 'commit', 'branch', 
  'checkout', 'merge', 'rebase', 'log', 'diff', 'remote', 'tag', 'stash',
  'reset', 'revert', 'cherry-pick', 'blame', 'show', 'config'
] as const;
type GitOperation = typeof GIT_OPERATIONS[number];

/**
 * Check if an operation is a supported Git operation
 */
const isGitOperation = (operation: string): operation is GitOperation => {
  return GIT_OPERATIONS.includes(operation as GitOperation);
};

/**
 * Input schema for Git operations with comprehensive validation
 */
const inputSchema = z.object({
  operation: z.enum(GIT_OPERATIONS)
    .describe('Git operation to perform'),
  repositoryPath: z.string()
    .min(1, 'Repository path cannot be empty')
    .optional()
    .describe('Path to the Git repository (defaults to runtime context repo-path)'),
  arguments: z.array(z.string())
    .optional()
    .default([])
    .describe('Additional arguments for the Git command'),
  options: z.object({
    branch: z.string().optional().describe('Branch name for operations'),
    remote: z.string().optional().default('origin').describe('Remote name'),
    message: z.string().optional().describe('Commit message'),
    author: z.string().optional().describe('Author for commits'),
    force: z.boolean().optional().default(false).describe('Force operation'),
    recursive: z.boolean().optional().default(false).describe('Recursive operation'),
    depth: z.number().optional().describe('Clone depth'),
    tags: z.boolean().optional().default(true).describe('Include tags'),
    rebase: z.boolean().optional().default(false).describe('Use rebase for pull'),
    // Diff-specific options
    cached: z.boolean().optional().default(false).describe('Show staged changes only'),
    staged: z.boolean().optional().default(false).describe('Show staged changes only (alias for cached)'),
    nameOnly: z.boolean().optional().default(false).describe('Show only file names'),
    stat: z.boolean().optional().default(false).describe('Show diffstat'),
    numstat: z.boolean().optional().default(false).describe('Show numeric diffstat'),
  }).optional().default({}).describe('Operation-specific options'),
  timeout: z.number()
    .min(1000)
    .max(300000)
    .optional()
    .default(30000)
    .describe('Operation timeout in milliseconds (1s-5min)'),
  useSharedIsolate: z.boolean()
    .optional()
    .default(false)
    .describe('Use shared isolate-vm instance for cross-tool operations'),
}).strict();

/**
 * Git operation result type
 */
type GitResult = {
  success: boolean;
  output: string;
  error?: string;
  exitCode: number;
  operation: GitOperation;
  repositoryPath: string;
  executionTime: number;
  requestId: string;
  userId?: string;
  sessionId?: string;
};

/**
 * Output schema for Git operation results
 */
const outputSchema = z.object({
  success: z.boolean().describe('Whether the Git operation succeeded'),
  output: z.string().describe('Command output from Git operation'),
  error: z.string().optional().describe('Error message if operation failed'),
  exitCode: z.number().describe('Git command exit code'),
  operation: z.enum(GIT_OPERATIONS).describe('Git operation that was performed'),
  repositoryPath: z.string().describe('Repository path used for the operation'),
  executionTime: z.number().describe('Operation execution time in milliseconds'),
  requestId: z.string().describe('Unique request identifier'),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
}).strict();

/**
 * @mastra Tool for comprehensive Git operations using isolated-vm and shelljs
 * 
 * Provides secure Git operations with configurable timeout, shared isolate support,
 * and integration with code execution environments. Supports all major Git operations
 * including repository management, branching, merging, and remote operations.
 * 
 * @param input - Git operation parameters
 * @param runtimeContext - Runtime configuration context
 * @returns Promise resolving to Git operation results with output, errors, and metadata
 * 
 * @example
 * ```typescript
 * const result = await gitTool.execute({
 *   operation: 'clone',
 *   arguments: ['https://github.com/user/repo.git', '/local/path'],
 *   options: { depth: 1, branch: 'main' },
 *   timeout: 60000
 * });
 * ```
 * 
 * @throws {Error} When Git operation fails or times out
 * @see {@link https://git-scm.com/docs | Git Documentation}
 * @mastra Git operations tool with isolated-vm and shelljs integration
 */
export const gitTool = createTool({
  id: 'git-operations',
  description: 'Execute Git operations safely with isolated-vm and shelljs integration',
  inputSchema,
  outputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof inputSchema> & {
    input: z.infer<typeof inputSchema>;
    runtimeContext?: RuntimeContext<GitRuntimeContext>;
  }): Promise<GitResult> => {
    const requestId = generateId();
    const startTime = Date.now();
    
    // Get runtime context values with defaults
    const userId = (runtimeContext?.get('user-id') as string) || 'anonymous';
    const sessionId = (runtimeContext?.get('session-id') as string) || 'default';
    const defaultRepoPath = (runtimeContext?.get('repo-path') as string) || process.cwd();
    const repositoryPath = input.repositoryPath || defaultRepoPath;
    const defaultBranch = (runtimeContext?.get('default-branch') as string) || 'main';
    const commitFormat = (runtimeContext?.get('commit-format') as string) || 'conventional';
    const branchingStrategy = (runtimeContext?.get('branching-strategy') as string) || 'github-flow';
    const enableSystemAccess = runtimeContext?.get('enable-system-access') ?? true;
    const executionTimeout = Number(runtimeContext?.get('execution-timeout') || input.timeout || 30000);
    const memoryLimit = Number(runtimeContext?.get('memory-limit') || 512); // MB
    const debug = Boolean(runtimeContext?.get('debug') || false);
    const tempDir = (runtimeContext?.get('temp-dir') as string) || '/tmp/mastra-git';
    const sharedIsolate = runtimeContext?.get('shared-isolate') as ivm.Isolate | undefined;
    
    if (debug) {
      logger.info(`[${requestId}] Git operation request started`, {
        operation: input.operation,
        repositoryPath,
        arguments: input.arguments,
        options: input.options,
        timeout: executionTimeout,
        useSharedIsolate: input.useSharedIsolate,
        userId,
        sessionId
      });
    }

    let output = '';
    let error: string | undefined;
    let success = false;
    let exitCode = 1;

    try {
      if (!enableSystemAccess) {
        throw new Error('System access is required for Git operations but is disabled');
      }

      if (!isGitOperation(input.operation)) {
        throw new Error(`Unsupported Git operation: ${input.operation}`);
      }

      // Build Git command
      const gitCommand = buildGitCommand(input.operation, input.arguments, input.options, repositoryPath, {
        defaultBranch,
        commitFormat,
        branchingStrategy
      });

      if (debug) {
        logger.info(`[${requestId}] Executing Git command: ${gitCommand}`);
      }

      // Execute Git command using shelljs or shared isolate
      if (input.useSharedIsolate && sharedIsolate) {
        // Use shared isolate for cross-tool operations
        const result = await executeInSharedIsolate(sharedIsolate, gitCommand, {
          timeout: executionTimeout,
          memoryLimit,
          cwd: repositoryPath,
          tempDir,
          debug,
          requestId
        });

        output = result.output;
        exitCode = result.exitCode;
        success = result.success;
        if (!success) {
          error = result.error;
        }
      } else if (input.useSharedIsolate) {
        // Create new shared isolate if requested but not provided
        const manager = SharedIsolateManager.getInstance();
        const isolate = await manager.getOrCreateIsolate(sessionId, {
          memoryLimit,
          timeout: executionTimeout
        });

        const result = await executeInSharedIsolate(isolate, gitCommand, {
          timeout: executionTimeout,
          memoryLimit,
          cwd: repositoryPath,
          tempDir,
          debug,
          requestId
        });

        output = result.output;
        exitCode = result.exitCode;
        success = result.success;
        if (!success) {
          error = result.error;
        }
      } else {
        // Use shelljs for direct execution
        const shellResult = shell.exec(gitCommand, {
          silent: true,
          cwd: repositoryPath,
          timeout: executionTimeout,
        } as shell.ExecOptions) as shell.ShellString;

        output = shellResult.stdout + (shellResult.stderr ? `\nSTDERR: ${shellResult.stderr}` : '');
        exitCode = shellResult.code;
        success = shellResult.code === 0;

        if (!success) {
          error = `Git operation failed with exit code ${shellResult.code}: ${shellResult.stderr}`;
        }
      }

      if (debug) {
        logger.info(`[${requestId}] Git operation completed`, {
          success,
          exitCode,
          outputLength: output.length,
          operation: input.operation
        });
      }

    } catch (executionError) {
      success = false;
      exitCode = 1;
      error = executionError instanceof Error ? executionError.message : String(executionError);
      
      if (debug) {
        logger.error(`[${requestId}] Git operation failed`, {
          error,
          operation: input.operation,
          repositoryPath,
          userId,
          sessionId
        });
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    const gitResult: GitResult = {
      success,
      output,
      error,
      exitCode,
      operation: input.operation,
      repositoryPath,
      executionTime,
      requestId,
      userId,
      sessionId,
    };
    
    return outputSchema.parse(gitResult);
  },
});

/**
 * Git command options type
 */
type GitCommandOptions = {
  branch?: string;
  remote?: string;
  message?: string;
  author?: string;
  force?: boolean;
  recursive?: boolean;
  depth?: number;
  tags?: boolean;
  rebase?: boolean;
  [key: string]: unknown;
};

/**
 * Build Git command string from operation and parameters
 */
function buildGitCommand(
  operation: GitOperation,
  args: string[],
  options: GitCommandOptions,
  repoPath: string,
  context: {
    defaultBranch: string;
    commitFormat: string;
    branchingStrategy: string;
  }
): string {
  const { defaultBranch, commitFormat } = context;
  let command = `git -C "${repoPath}" ${operation}`;

  // Add operation-specific options
  switch (operation) {
    case 'clone':
      if (options.depth) command += ` --depth ${options.depth}`;
      if (options.branch) command += ` --branch ${options.branch}`;
      if (!options.tags) command += ` --no-tags`;
      break;
    case 'commit':
      if (options.message) {
        const message = formatCommitMessage(options.message, commitFormat);
        command += ` -m "${message}"`;
      }
      if (options.author) command += ` --author="${options.author}"`;
      break;
    case 'push':
      if (options.force) command += ` --force`;
      if (options.tags) command += ` --tags`;
      if (options.remote) command += ` ${options.remote}`;
      if (!options.branch && defaultBranch) command += ` ${defaultBranch}`;
      break;
    case 'pull':
      if (options.rebase) command += ` --rebase`;
      if (options.remote) command += ` ${options.remote}`;
      if (!options.branch && defaultBranch) command += ` ${defaultBranch}`;
      break;
    case 'branch':
      if (options.force) command += ` --force`;
      break;
    case 'checkout':
      if (options.force) command += ` --force`;
      // If no branch specified and creating new branch, use default
      if (!args.length && !options.branch && defaultBranch) {
        args.push(defaultBranch);
      }
      break;
    case 'diff':
      // Enhanced diff support
      if (options.cached) command += ` --cached`;
      if (options.staged) command += ` --staged`;
      if (options.nameOnly) command += ` --name-only`;
      if (options.stat) command += ` --stat`;
      if (options.numstat) command += ` --numstat`;
      break;
  }
  
  // Add arguments
  if (args.length > 0) {
    command += ` ${args.join(' ')}`;
  }
  
  return command;
}

/**
 * Format commit message according to specified format
 */
function formatCommitMessage(message: string, format: string): string {
  switch (format) {
    case 'conventional':
      // Ensure conventional commit format
      if (!/^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .+/.test(message)) {
        return `feat: ${message}`;
      }
      return message;
    case 'standard':
      return message;
    case 'custom':
      return message;
    default:
      return message;
  }
}

/**
 * Execute Git command in shared isolate-vm instance
 */
async function executeInSharedIsolate(
  isolate: ivm.Isolate,
  command: string,
  options: {
    timeout: number;
    memoryLimit: number;
    cwd: string;
    tempDir: string;
    debug: boolean;
    requestId: string;
  }
): Promise<{ success: boolean; output: string; error?: string; exitCode: number }> {
  const context = await isolate.createContext();
  
  try {
    // Set up shell execution in isolate
    await context.global.set('shell', shell);
    await context.global.set('command', command);
    await context.global.set('cwd', options.cwd);
    
    const script = await isolate.compileScript(`
      const result = shell.exec(command, { silent: true, cwd: cwd });
      ({
        success: result.code === 0,
        output: result.stdout + (result.stderr ? '\\nSTDERR: ' + result.stderr : ''),
        error: result.code !== 0 ? result.stderr : undefined,
        exitCode: result.code
      });
    `);
    
    const result = await script.run(context, { timeout: options.timeout });
    return result;
    
  } finally {
    context.release();
  }
}

/**
 * Runtime context instance for Git tool with secure defaults
 * 
 * @mastra Default runtime context for Git tool
 */
export const gitRuntimeContext = new RuntimeContext<GitRuntimeContext>();
gitRuntimeContext.set('repo-path', process.cwd());
gitRuntimeContext.set('default-branch', 'main');
gitRuntimeContext.set('commit-format', 'conventional');
gitRuntimeContext.set('branching-strategy', 'github-flow');
gitRuntimeContext.set('enable-system-access', true);
gitRuntimeContext.set('execution-timeout', 30000);
gitRuntimeContext.set('memory-limit', 512);
gitRuntimeContext.set('debug', false);
gitRuntimeContext.set('temp-dir', '/tmp/mastra-git');

/**
 * Shared isolate manager for cross-tool operations
 * Allows Git tool and Code Execution tool to share the same isolate-vm instance
 *
 * @mastra Shared isolate management for cross-tool integration
 */
export class SharedIsolateManager {
  private static instance: SharedIsolateManager;
  private isolates: Map<string, ivm.Isolate> = new Map();
  private contexts: Map<string, ivm.Context> = new Map();

  private constructor() {}

  static getInstance(): SharedIsolateManager {
    if (!SharedIsolateManager.instance) {
      SharedIsolateManager.instance = new SharedIsolateManager();
    }
    return SharedIsolateManager.instance;
  }

  /**
   * Create or get shared isolate instance
   */
  async getOrCreateIsolate(
    sessionId: string,
    options: {
      memoryLimit?: number;
      timeout?: number;
    } = {}
  ): Promise<ivm.Isolate> {
    if (this.isolates.has(sessionId)) {
      return this.isolates.get(sessionId)!;
    }

    const isolate = new ivm.Isolate({
      memoryLimit: (options.memoryLimit || 512) * 1024 * 1024
    });

    this.isolates.set(sessionId, isolate);

    // Set up shared context with common utilities
    const context = await isolate.createContext();
    await this.setupSharedContext(context);
    this.contexts.set(sessionId, context);

    logger.info(`Created shared isolate for session: ${sessionId}`);
    return isolate;
  }

  /**
   * Get shared context for session
   */
  getContext(sessionId: string): ivm.Context | undefined {
    return this.contexts.get(sessionId);
  }

  /**
   * Set up shared context with common utilities
   */
  private async setupSharedContext(context: ivm.Context): Promise<void> {
    // Add shell utilities
    await context.global.set('shell', shell);
    await context.global.set('fs', fs);
    await context.global.set('path', path);

    // Add console for debugging
    const outputCapture: string[] = [];
    await context.global.set('console', {
      log: (...args: unknown[]) => outputCapture.push(args.map(String).join(' ')),
      error: (...args: unknown[]) => outputCapture.push('ERROR: ' + args.map(String).join(' ')),
      warn: (...args: unknown[]) => outputCapture.push('WARN: ' + args.map(String).join(' ')),
      info: (...args: unknown[]) => outputCapture.push('INFO: ' + args.map(String).join(' ')),
    });

    await context.global.set('getOutput', () => outputCapture.join('\n'));
    await context.global.set('clearOutput', () => { outputCapture.length = 0; });
  }

  /**
   * Execute code in shared isolate
   */
  async executeInSharedIsolate(
    sessionId: string,
    code: string,
    options: {
      timeout?: number;
      type?: 'git' | 'code' | 'mixed';
    } = {}
  ): Promise<{
    success: boolean;
    result: unknown;
    output: string;
    error?: string;
  }> {
    const isolate = await this.getOrCreateIsolate(sessionId);
    const context = this.getContext(sessionId);

    if (!context) {
      throw new Error(`No context found for session: ${sessionId}`);
    }

    try {
      // Clear previous output
      await context.global.set('__executionType', options.type || 'mixed');

      const script = await isolate.compileScript(`
        (async function() {
          try {
            clearOutput();
            const result = await (async function() {
              ${code}
            })();
            return {
              success: true,
              result: result,
              output: getOutput(),
            };
          } catch (error) {
            return {
              success: false,
              result: null,
              output: getOutput(),
              error: error.message || String(error)
            };
          }
        })();
      `);

      const result = await script.run(context, {
        timeout: options.timeout || 30000
      });

      return result;

    } catch (error) {
      return {
        success: false,
        result: null,
        output: '',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Clean up isolate and context for session
   */
  async cleanup(sessionId: string): Promise<void> {
    const context = this.contexts.get(sessionId);
    const isolate = this.isolates.get(sessionId);

    if (context) {
      context.release();
      this.contexts.delete(sessionId);
    }

    if (isolate) {
      isolate.dispose();
      this.isolates.delete(sessionId);
    }

    logger.info(`Cleaned up shared isolate for session: ${sessionId}`);
  }

  /**
   * Clean up all isolates
   */
  async cleanupAll(): Promise<void> {
    for (const [sessionId] of this.isolates) {
      await this.cleanup(sessionId);
    }
  }
}

/**
 * Helper function to create Git + Code execution workflow
 * Demonstrates cross-tool integration using shared isolate
 *
 * @param sessionId - Session identifier for shared isolate
 * @param gitOperation - Git operation to perform
 * @param codeToExecute - Code to execute after Git operation
 * @param options - Configuration options
 * @returns Combined results from both operations
 *
 * @example
 * ```typescript
 * const result = await gitCodeWorkflow('session-123', {
 *   operation: 'clone',
 *   repositoryUrl: 'https://github.com/user/repo.git',
 *   localPath: '/tmp/repo'
 * }, {
 *   code: 'console.log("Repository cloned successfully!");',
 *   language: 'javascript'
 * });
 * ```
 *
 * @mastra Cross-tool workflow for Git and Code execution
 */
export async function gitCodeWorkflow(
  sessionId: string,
  gitOperation: {
    operation: GitOperation;
    repositoryUrl?: string;
    localPath?: string;
    options?: Record<string, unknown>;
  },
  codeExecution: {
    code: string;
    language: 'javascript' | 'typescript';
  },
  options: {
    timeout?: number;
    memoryLimit?: number;
    debug?: boolean;
  } = {}
): Promise<{
  gitResult: GitResult;
  codeResult: {
    success: boolean;
    result: unknown;
    output: string;
    error?: string;
  };
  combinedOutput: string;
}> {
  const manager = SharedIsolateManager.getInstance();
  const isolate = await manager.getOrCreateIsolate(sessionId, {
    memoryLimit: options.memoryLimit || 512,
    timeout: options.timeout || 60000
  });

  // Create runtime context with shared isolate
  const gitContext = new RuntimeContext<GitRuntimeContext>();
  gitContext.set('session-id', sessionId);
  gitContext.set('shared-isolate', isolate);
  gitContext.set('enable-system-access', true);
  gitContext.set('debug', options.debug || false);

  // Execute Git operation using the tool's execute function directly
  const gitInput = {
    operation: gitOperation.operation,
    repositoryPath: gitOperation.localPath,
    arguments: gitOperation.repositoryUrl ? [gitOperation.repositoryUrl, gitOperation.localPath || ''] : [],
    options: {
      remote: 'origin',
      force: false,
      recursive: false,
      tags: true,
      rebase: false,
      cached: false,
      staged: false,
      nameOnly: false,
      stat: false,
      numstat: false,
      ...gitOperation.options
    },
    timeout: options.timeout || 30000,
    useSharedIsolate: true
  };

  const gitResult = await gitTool.execute({
    input: gitInput,
    context: {} as ToolExecutionContext<typeof inputSchema>['context'], // Mock context for direct tool execution
    runtimeContext: gitContext
  });

  // Execute code in shared isolate
  const codeResult = await manager.executeInSharedIsolate(
    sessionId,
    codeExecution.code,
    {
      timeout: options.timeout || 30000,
      type: 'code'
    }
  );

  const combinedOutput = `Git Operation: ${gitResult.operation}\n${gitResult.output}\n\nCode Execution:\n${codeResult.output}`;

  return {
    gitResult,
    codeResult,
    combinedOutput
  };
}
