
/**
 * File Reading and Writing Tools for Mastra AI, now thread-aware.
 * All tool input schemas accept an optional threadId for tracing and debugging.
 * Each tool logs the threadId (if present) at the start of execution.
 *
 * This module provides tools for reading from and writing to files in the filesystem
 * with support for different file formats, encodings, and write modes.
 */
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from 'url';  // Add this import
import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from 'zod';
import { createLogger } from "@mastra/core/logger";
// LAZY LANGFUSE: see below for dynamic import in each function that uses langfuse
import { getTracer } from "../services/tracing";

//ignore this file for linting  
const __filename = fileURLToPath(import.meta.url);  // ES module equivalent
const __dirname = path.dirname(__filename);

// === Configure Logger ===
const logger = createLogger({ name: "readwrite" });
const tracer = getTracer();
import {
  ReadFileInputSchema,
  WriteFileInputSchema,
  DeleteFileInputSchema,
  ListFilesInputSchema,
  ReadKnowledgeFileInputSchema,
  WriteKnowledgeFileInputSchema,
} from "./readwriteschema";

// Define Mkdir schemas inline (or import if available)

export const MkdirInputSchema = z.object({
  path: z.string().describe("Path to the directory to create (absolute or relative)"),
  recursive: z.boolean().optional().default(false).describe("Whether to create parent directories if they don't exist"),
});
/**
 * Supported file encoding types
 */
export enum FileEncoding {
  /** UTF-8 text encoding */
  UTF8 = "utf8",
  /** ASCII text encoding */
  ASCII = "ascii",
  /** UTF-16 Little Endian encoding */
  UTF16LE = "utf16le",
  /** Latin1 encoding */
  LATIN1 = "latin1",
  /** Base64 encoding */
  BASE64 = "base64",
  /** Hex encoding */
  HEX = "hex",
}

/**
 * File write modes
 */
export enum FileWriteMode {
  /** Overwrite the file if it exists */
  OVERWRITE = "overwrite",
  /** Append to the file if it exists */
  APPEND = "append",
  /** Create a new file, fail if the file exists */
  CREATE_NEW = "create-new",
}

/**
 * Base path for knowledge folder
 */
// Use __dirname for robust, module-relative path resolution
const KNOWLEDGE_BASE_PATH = path.resolve(__dirname, "../knowledge");

/**
 * Validates if a path is within the knowledge folder
 */
async function isKnowledgePath(candidatePath: string): Promise<boolean> {
  const span = tracer?.startSpan ? tracer.startSpan('isKnowledgePath') : null;
  try {
    // Use fs.realpath to resolve symlinks and prevent directory escape
    const resolvedPath = await fs.realpath(path.resolve(candidatePath));
    const isValid = resolvedPath.startsWith(KNOWLEDGE_BASE_PATH);
    // Runtime assertion for security: fail if not within knowledge base
    if (!isValid) throw new Error('E_PATH_ESCAPE: Path escapes knowledge base');
    logger.debug(`[isKnowledgePath] candidatePath: ${candidatePath}, resolved: ${resolvedPath}, valid: ${isValid}`);
    (await import("../services/langfuse.js")).langfuse?.createSpan?.('isKnowledgePath', {
      traceId: span?.spanContext().traceId || 'unknown', // fallback if no span
      metadata: { candidatePath, absolutePath: resolvedPath, isValid, spanId: span?.spanContext().spanId },
      tags: ['debug'],
    });
    span?.setAttribute?.('candidatePath', candidatePath);
    span?.setAttribute?.('absolutePath', resolvedPath);
    span?.setAttribute?.('isValid', isValid);
    span?.end?.();
    return isValid;
  } catch (err) {
    logger.error(`[isKnowledgePath] Error resolving path: ${candidatePath}: ${(err as Error)?.message || err}`);
    (await import("../services/langfuse.js")).langfuse?.createSpan?.('isKnowledgePath.error', {
      traceId: span?.spanContext().traceId || 'unknown',
      metadata: { candidatePath, error: err, spanId: span?.spanContext().spanId },
      tags: ['error'],
    });
    if (span?.recordException) span.recordException(err);
    if (span?.setStatus) span.setStatus({ code: 2, message: String(err) });
    span?.end?.();
    return false;
  }
}

/**
 * Resolves a knowledge folder path
 */
async function resolveKnowledgePath(candidatePath: string): Promise<string> {
  const span = tracer?.startSpan ? tracer.startSpan('resolveKnowledgePath') : null;
  try {
    // Use fs.realpath to resolve the final path after joining
    const joinedPath = path.join(KNOWLEDGE_BASE_PATH, candidatePath);
    const absolutePath = await fs.realpath(joinedPath);
    logger.debug(`[resolveKnowledgePath] candidatePath: ${candidatePath}, resolved: ${absolutePath}`);
    (await import("../services/langfuse.js")).langfuse?.createSpan?.('resolveKnowledgePath', {
      traceId: span?.spanContext().traceId || 'unknown',
      metadata: { candidatePath, absolutePath, spanId: span?.spanContext().spanId },
      tags: ['debug'],
    });
    span?.setAttribute?.('candidatePath', candidatePath);
    span?.setAttribute?.('absolutePath', absolutePath);
    span?.end?.();
    return absolutePath;
  } catch (err) {
    logger.error(`[resolveKnowledgePath] Error resolving path: ${candidatePath}: ${(err as Error)?.message || err}`);
    (await import("../services/langfuse.js")).langfuse?.createSpan?.('resolveKnowledgePath.error', {
      traceId: span?.spanContext().traceId || 'unknown',
      metadata: { candidatePath, error: err, spanId: span?.spanContext().spanId },
      tags: ['error'],
    });
    if (span?.recordException) span.recordException(err);
    if (span?.setStatus) span.setStatus({ code: 2, message: String(err) });
    span?.end?.();
    throw err;
  }
}

const MASTRA_DIR = path.resolve(process.cwd(), ".mastra");
async function isInMastraDir(candidatePath: string): Promise<boolean> {
  const span = tracer?.startSpan ? tracer.startSpan('isInMastraDir') : null;
  try {
    // Use fs.realpath to resolve symlinks and prevent directory escape
    const resolvedPath = await fs.realpath(path.resolve(candidatePath));
    const isValid = resolvedPath.startsWith(MASTRA_DIR);
    // Runtime assertion for security: fail if not within .mastra dir
    if (!isValid) throw new Error('E_PATH_ESCAPE: Path escapes .mastra dir');
    logger.debug(`[isInMastraDir] candidatePath: ${candidatePath}, resolved: ${resolvedPath}, valid: ${isValid}`);
    (await import("../services/langfuse.js")).langfuse?.createSpan?.('isInMastraDir', {
      traceId: span?.spanContext().traceId || 'unknown',
      metadata: { candidatePath, absolutePath: resolvedPath, isValid, spanId: span?.spanContext().spanId },
      tags: ['debug'],
    });
    span?.setAttribute?.('candidatePath', candidatePath);
    span?.setAttribute?.('absolutePath', resolvedPath);
    span?.setAttribute?.('isValid', isValid);
    span?.end?.();
    return isValid;
  } catch (err) {
    logger.error(`[isInMastraDir] Error resolving path: ${candidatePath}: ${(err as Error)?.message || err}`);
    (await import("../services/langfuse.js")).langfuse?.createSpan?.('isInMastraDir.error', {
      traceId: span?.spanContext().traceId || 'unknown',
      metadata: { candidatePath, error: err, spanId: span?.spanContext().spanId },
      tags: ['error'],
    });
    if (span?.recordException) span.recordException(err);
    if (span?.setStatus) span.setStatus({ code: 2, message: String(err) });
    span?.end?.();
    return false;
  }
}

/**
 * Utility to ensure directory exists
 */
async function ensureDir(candidatePath: string) {
  const span = tracer?.startSpan ? tracer.startSpan('ensureDir') : null;
  try {
    await fs.mkdir(candidatePath, { recursive: true });
    logger.debug(`[ensureDir] Directory created: ${candidatePath}`);
    (await import("../services/langfuse.js")).langfuse?.createSpan?.('ensureDir', {
      traceId: span?.spanContext().traceId || 'unknown',
      metadata: { candidatePath, spanId: span?.spanContext().spanId },
      tags: ['debug'],
    });
    span?.setAttribute?.('candidatePath', candidatePath);
    span?.end?.();
  } catch (err) {
    logger.error(`[ensureDir] Error creating directory: ${candidatePath}`, err);
    (await import("../services/langfuse")).langfuse?.createSpan?.('ensureDir.error', {
      traceId: span?.spanContext().traceId || 'unknown',
      metadata: { candidatePath, error: err, spanId: span?.spanContext().spanId },
      tags: ['error'],
    });
    if (span?.recordException) span.recordException(err);
    if (span?.setStatus) span.setStatus({ code: 2, message: String(err) });
    span?.end?.();
    throw err;
  }
}

/**
 * Tool for reading files from the filesystem
 */
export const readFileTool = createTool({
  id: "read-file",
  description:
    "Reads a file from the filesystem with support for various formats and encodings",
  inputSchema: ReadFileInputSchema,
  execute: async (
    executionContext: ToolExecutionContext<typeof ReadFileInputSchema>
  ) => {
    const { context } = executionContext;
    // Step 1: Input validation
    const inputValidation = ReadFileInputSchema.safeParse(context);
    console.log('[readFileTool] Input:', context);
    if (!inputValidation.success) {
      console.error('[readFileTool] Input validation failed:', inputValidation.error);
      console.error('[readFileTool] Input validation failed:', inputValidation.error);
      return {
        content: "",
        metadata: {
          path: context.path,
          size: 0,
          extension: path.extname(context.path),
          encoding: context.encoding,
          lineCount: 0,
          readLines: 0,
        },
        success: false,
        error: `Input validation failed: ${inputValidation.error.message}`,
      };
    }
    try {
      // Step 2: Path resolution
      const absolutePath = path.resolve(context.path);
      console.log('[readFileTool] Resolved absolutePath:', absolutePath);
      // Step 3: File existence
      try {
        await fs.access(absolutePath);
      } catch (error) {
        console.error('[readFileTool] File does not exist:', error);
        return {
          content: "",
          metadata: {
            path: absolutePath,
            size: 0,
            extension: path.extname(absolutePath),
            encoding: context.encoding,
            lineCount: 0,
            readLines: 0,
          },
          success: false,
          error: 'File does not exist',
        };
      }
      // Step 4: Get file stats
      let stats;
      try {
        stats = await fs.stat(absolutePath);
      } catch (statErr) {
        console.error('[readFileTool] Stat failed:', statErr);
        return {
          content: "",
          metadata: {
            path: absolutePath,
            size: 0,
            extension: path.extname(absolutePath),
            encoding: context.encoding,
            lineCount: 0,
            readLines: 0,
          },
          success: false,
          error: statErr instanceof Error ? statErr.message : 'Unknown error stat',
        };
      }
      // Step 5: Check file size
      const maxSize = 10485760;
      if (stats.size > maxSize) {
        console.error('[readFileTool] File too large:', stats.size);
        return {
          content: "",
          metadata: {
            path: absolutePath,
            size: stats.size,
            extension: path.extname(absolutePath),
            encoding: context.encoding,
            lineCount: 0,
            readLines: 0,
          },
          success: false,
          error: `File too large: ${stats.size} bytes (max: ${maxSize} bytes)`,
        };
      }
      // Step 6: Read the file
      let fileContent;
      try {
        fileContent = await fs.readFile(absolutePath, { encoding: context.encoding as BufferEncoding });
      } catch (readErr) {
        console.error('[readFileTool] File read failed:', readErr);
        return {
          content: "",
          metadata: {
            path: absolutePath,
            size: 0,
            extension: path.extname(absolutePath),
            encoding: context.encoding,
            lineCount: 0,
            readLines: 0,
          },
          success: false,
          error: readErr instanceof Error ? readErr.message : 'Unknown error reading file',
        };
      }
      let processedContent = fileContent.toString();
      const allLines = processedContent.split(/\r?\n/);
      let readLines = allLines.length;
      if (context.startLine !== undefined || context.endLine !== undefined) {
        const startLine = Math.max(0, context.startLine || 0);
        const endLine =
          context.endLine !== undefined
            ? Math.min(context.endLine, allLines.length - 1)
            : allLines.length - 1;
        if (startLine > endLine) {
          console.error('[readFileTool] Invalid line range:', startLine, endLine);
          return {
            content: "",
            metadata: {
              path: absolutePath,
              size: stats.size,
              extension: path.extname(absolutePath),
              encoding: context.encoding,
              lineCount: allLines.length,
              readLines: 0,
            },
            success: false,
            error: `Invalid line range: start (${startLine}) > end (${endLine})`,
          };
        }
        processedContent = allLines.slice(startLine, endLine + 1).join("\n");
        readLines = endLine - startLine + 1;
      }
      // Step 7: Return output (no output validation)
      return {
        content: processedContent,
        metadata: {
          path: absolutePath,
          size: stats.size,
          extension: path.extname(absolutePath),
          encoding: context.encoding,
          lineCount: allLines.length,
          readLines,
        },
        success: true,
      };

    } catch (error) {
      console.error('[readFileTool] Error:', error);
      return {
        content: "",
        metadata: {
          path: context.path,
          size: 0,
          extension: path.extname(context.path),
          encoding: context.encoding,
          lineCount: 0,
          readLines: 0,

        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error reading file',
      };
    }
  },
});

/**
 * TOOL NAME UPDATE: Changed export id from "write-to-file" to "write-file"
 * to match the research-agent's requirement.
 */

/**
 * Tool for writing content to files in the filesystem
 */

export const writeToFileTool = createTool({
  id: "write-file",
  description:
    "Writes content to a file in the filesystem with support for various modes and encodings",
  inputSchema: WriteFileInputSchema,
  execute: async (executionContext: ToolExecutionContext<typeof WriteFileInputSchema>) => {
    const { context } = executionContext;

    try {
      // Resolve the absolute path
      const absolutePath = path.resolve(context.path);

      // Ensure the file path is valid
      if (!absolutePath) {
        throw new Error("Invalid file path");
      }

      const isValidPath = await isInMastraDir(absolutePath);
      if (!isValidPath) {
        return {
          metadata: {
            path: absolutePath,
            size: 0,
            extension: path.extname(absolutePath),
            encoding: context.encoding,
          },
          success: false,
          error: "Access denied: Can only write to .mastra directory",
        };
      }

      // Ensure maxSizeBytes is set (fallback to default if missing)
      const maxSizeBytes = 10485760;

      // Check content size
      const contentSize = Buffer.byteLength(context.content, context.encoding as BufferEncoding);
      if (contentSize > maxSizeBytes) {
        return {
          metadata: {
            path: absolutePath,
            size: contentSize,
            extension: path.extname(absolutePath),
            encoding: context.encoding,
          },
          success: false,
          error: `Content too large: ${contentSize} bytes (max: ${maxSizeBytes} bytes)`,
        };
      }

      // Check if file exists
      let fileExists = false;
      try {
        await fs.access(absolutePath);
        fileExists = true;
      } catch {
        fileExists = false;
      }

      // Write or append to the file based on the context
      if (fileExists) {
        await fs.appendFile(absolutePath, context.content, { encoding: context.encoding });
      } else {
        await fs.writeFile(absolutePath, context.content, { encoding: context.encoding });
      }

      return {
        metadata: {
          path: absolutePath,
          size: Buffer.byteLength(context.content, context.encoding as BufferEncoding),
          extension: path.extname(absolutePath),
          encoding: context.encoding,
        },
        success: true,
      };
    } catch (error) {
      console.error("Error writing to file:", error);

      return {
        metadata: {
          path: executionContext.context.path,
          size: 0,
          extension: path.extname(executionContext.context.path),
          encoding: executionContext.context.encoding,
        },
        success: false,
        error: error instanceof Error ? error.message : "Unknown error writing to file",
      };
    }
  },
});

/**
 * Tool for reading knowledge files
 */

export const readKnowledgeFileTool = createTool({
  id: "read-knowledge-file",
  description: "Reads a file from the knowledge folder",
  inputSchema: ReadKnowledgeFileInputSchema,
  execute: async (
    executionContext: ToolExecutionContext<typeof ReadKnowledgeFileInputSchema>
  ) => {
    try {
      const knowledgePath = await resolveKnowledgePath(executionContext.context.path);
      if (!(await isKnowledgePath(knowledgePath))) {
        throw new Error("Access denied: Can only read from knowledge folder");
      }
      if (!readFileTool.execute) {
        throw new Error("readFileTool.execute is not defined");
      }
      // Only pass fields that exist on ReadFileInputSchema
      const { encoding, threadId } = executionContext.context;
      // Use type-safe access for startLine and endLine if present
      const startLine = 'startLine' in executionContext.context ? executionContext.context.startLine as number | undefined : undefined;
      const endLine = 'endLine' in executionContext.context ? executionContext.context.endLine as number | undefined : undefined;
      type ReadFileContext = {
        path: string;
        encoding: FileEncoding;
        maxSizeBytes: number;
        startLine: number;
        endLine?: number;
        threadId?: string;
      };
      const ctx: ReadFileContext = {
        path: knowledgePath,
        encoding: encoding !== undefined ? (encoding as FileEncoding) : FileEncoding.UTF8,
        maxSizeBytes: 10485760,
        startLine: typeof startLine !== 'undefined' ? startLine : 0,
      };
      if (typeof endLine !== 'undefined') ctx.endLine = endLine;
      if (typeof threadId !== 'undefined') ctx.threadId = threadId;
      const toolContext = {
        context: ctx,
        runId: executionContext.runId,
        threadId: executionContext.threadId,
        resourceId: executionContext.resourceId,
        mastra: executionContext.mastra,
        runtimeContext: executionContext.runtimeContext,
      };
      return await readFileTool.execute(toolContext);
    } catch (error) {
      console.error("Error reading knowledge file:", error);
      return {
        content: "",
        metadata: {
          path: executionContext.context.path,
          size: 0,
          extension: path.extname(executionContext.context.path),
          encoding: executionContext.context.encoding,
          lineCount: 0,
          readLines: 0,
        },
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error reading knowledge file",
      };
    }
  },
});

// Use the imported WriteKnowledgeFileInputSchema and WriteKnowledgeFileOutputSchema

export const writeKnowledgeFileTool = createTool({
  id: "write-knowledge-file",
  description: "Writes content to a file in the knowledge folder",
  inputSchema: WriteKnowledgeFileInputSchema,
  execute: async (
    executionContext: ToolExecutionContext<typeof WriteKnowledgeFileInputSchema>
  ) => {
    // Step 1: Input validation
    const inputValidation = WriteKnowledgeFileInputSchema.safeParse(executionContext.context);
    console.log('[writeKnowledgeFileTool] Input:', executionContext.context);
    if (!inputValidation.success) {
      console.error('[writeKnowledgeFileTool] Input validation failed:', inputValidation.error);
      return {
        metadata: {
          path: executionContext.context.path,
          size: 0,
          extension: path.extname(executionContext.context.path),
          encoding: executionContext.context.encoding,
        },
        success: false,
        error: `Input validation failed: ${inputValidation.error.message}`,
      };
    }
    try {
      // Step 2: Path resolution and security
      const knowledgePath = await resolveKnowledgePath(executionContext.context.path);
      console.log('[writeKnowledgeFileTool] Resolved knowledgePath:', knowledgePath);
      if (!(await isKnowledgePath(knowledgePath))) {
        console.error('[writeKnowledgeFileTool] Security check failed: Path not in knowledge folder');
        return {
          metadata: {
            path: knowledgePath,
            size: 0,
            extension: path.extname(knowledgePath),
            encoding: executionContext.context.encoding,

          },
          success: false,
          error: 'Access denied: Can only write to knowledge folder',
        };
      }
      // Step 3: Directory existence/creation
      try {
        console.log('[writeKnowledgeFileTool] Ensuring parent directory exists:', path.dirname(knowledgePath));
        await ensureDir(path.dirname(knowledgePath));
        console.log('[writeKnowledgeFileTool] Parent directory ensured.');
      } catch (dirErr) {
        console.error('[writeKnowledgeFileTool] Directory creation failed:', dirErr);
        return {
          metadata: {
            path: knowledgePath,
            size: 0,
            extension: path.extname(knowledgePath),
            encoding: executionContext.context.encoding,

          },
          success: false,
          error: `Failed to create parent directory: ${dirErr instanceof Error ? dirErr.message : String(dirErr)}`,
        };
      }
      // Step 4: File write via writeToFileTool
      if (!writeToFileTool.execute) {
        console.error('[writeKnowledgeFileTool] writeToFileTool.execute is not defined');
        return {
          metadata: {
            path: knowledgePath,
            size: 0,
            extension: path.extname(knowledgePath),
            encoding: executionContext.context.encoding,

          },
          success: false,
          error: 'writeToFileTool.execute is not defined',
        };
      }
      const toolContext: ToolExecutionContext<typeof WriteFileInputSchema> = {
        context: {
          ...executionContext.context,
          path: knowledgePath,
          encoding: executionContext.context.encoding as FileEncoding,
          maxSizeBytes: 10485760,
        },
        runId: executionContext.runId,
        threadId: executionContext.threadId,
        resourceId: executionContext.resourceId,
        mastra: executionContext.mastra,
        runtimeContext: executionContext.runtimeContext,
      };
      const fileWriteResult = await writeToFileTool.execute(toolContext);
      console.log('[writeKnowledgeFileTool] File write result:', fileWriteResult);
      // Step 5: Output validatio
      // Step 6: Return type-safe, validated output
      return fileWriteResult;
    } catch (error) {
      console.error('[writeKnowledgeFileTool] Error:', error);
      return {
        metadata: {
          path: executionContext.context.path,
          size: 0,
          extension: path.extname(executionContext.context.path),
          encoding: executionContext.context.encoding,
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error writing knowledge file',
      };
    }
  },
});
// ... (rest of the code remains the same)
const CreateFileInputSchema = z.object({
  path: z.string().describe("Path to the file to create (absolute or relative)"),
  content: z.string().describe("Content to write to the new file"),
  encoding: z.enum([
    FileEncoding.UTF8,
    FileEncoding.ASCII,
    FileEncoding.UTF16LE,
    FileEncoding.LATIN1,
    FileEncoding.BASE64,
    FileEncoding.HEX,
  ]).default(FileEncoding.UTF8),
  createDirectory: z.boolean().optional().default(false),
  maxSizeBytes: z.number().optional().default(10485760).describe("Maximum content size in bytes (default: 10MB)"),
});

export const createFileTool = createTool({
  id: "create-file",
  description: "Creates a new file. Fails if the file already exists.",
  inputSchema: CreateFileInputSchema,
  execute: async (
    executionContext: ToolExecutionContext<typeof CreateFileInputSchema>
  ) => {
    const absolutePath = path.resolve(executionContext.context.path);

    // Ensure the file path is valid
    if (!absolutePath) {
      throw new Error("Invalid file path");
    }

    const isValidPath = await isInMastraDir(absolutePath);
    if (!isValidPath) {
      return {
        metadata: {
          path: absolutePath,
          size: 0,
          extension: path.extname(absolutePath),
          encoding: executionContext.context.encoding,
        },
        success: false,
        error: "Access denied: Can only create files inside .mastra directory",
      };
    }
    try {
      // Check if file exists
      await fs.access(absolutePath);
      return {
        metadata: {
          path: absolutePath,
          size: 0,
          extension: path.extname(absolutePath),
          encoding: executionContext.context.encoding,
        },
        success: false,
        error: "File already exists.",
      };
    } catch {
      // File does not exist, proceed
    }
    try {
      if (executionContext.context.createDirectory) {
        await ensureDir(path.dirname(absolutePath));
      }
      await fs.writeFile(absolutePath, executionContext.context.content, { encoding: executionContext.context.encoding });
      return {
        metadata: {
          path: absolutePath,
          size: Buffer.byteLength(executionContext.context.content, executionContext.context.encoding),
          extension: path.extname(absolutePath),
          encoding: executionContext.context.encoding,
        },
        success: true,
      };
    } catch (error) {
      return {
        metadata: {
          path: absolutePath,
          size: 0,
          extension: path.extname(absolutePath),
          encoding: executionContext.context.encoding,
        },
        success: false,
        error: error instanceof Error ? error.message : "Unknown error creating file",
      };
    }
  },
});


const EditFileInputSchema = z.object({
  path: z.string().describe("Path to the file to edit (absolute or relative)"),
  search: z.string().describe("Text or regex to search for"),
  replace: z.string().describe("Replacement text"),
  encoding: z.enum([
    FileEncoding.UTF8,
    FileEncoding.ASCII,
    FileEncoding.UTF16LE,
    FileEncoding.LATIN1,
    FileEncoding.BASE64,
    FileEncoding.HEX,
  ]).default(FileEncoding.UTF8),
  isRegex: z.boolean().optional().default(false),
});

export const editFileTool = createTool({
  id: "edit-file",
  description: "Edits a file by searching and replacing text.",
  inputSchema: EditFileInputSchema,
  execute: async (
    executionContext: ToolExecutionContext<typeof EditFileInputSchema>
  ) => {
    const absolutePath = path.resolve(executionContext.context.path);

    // Ensure the file path is valid
    if (!absolutePath) {
      throw new Error("Invalid file path");
    }

    const isValidPath = await isInMastraDir(absolutePath);
    if (!isValidPath) {
      return {
        metadata: {
          path: absolutePath,
          size: 0,
          extension: path.extname(absolutePath),
          encoding: executionContext.context.encoding,
          edits: 0,
        },
        success: false,
        error: "Access denied: Can only edit files inside .mastra directory",
      };
    }

    try {
      // Read file content as string using the specified encoding
      const content = await fs.readFile(absolutePath, { encoding: executionContext.context.encoding });
      let edits = 0;
      let newContent: string; // Declare newContent here
      if (executionContext.context.isRegex) {
        const regex = new RegExp(executionContext.context.search, "g");
        newContent = content.replace(regex, (): string => { 
          edits++;
          return executionContext.context.replace;
        });
      } else {
        // Use content (string) for split and match
        newContent = content.split(executionContext.context.search).join(executionContext.context.replace);
        const searchRegex = new RegExp(executionContext.context.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g");
        edits = (content.match(searchRegex) || []).length;
      }
      await fs.writeFile(absolutePath, newContent, { encoding: executionContext.context.encoding });
      return {
        metadata: {
          path: absolutePath,
          size: Buffer.byteLength(newContent, executionContext.context.encoding),
          extension: path.extname(absolutePath),
          encoding: executionContext.context.encoding,
          edits,
        },
        success: true,
      };
    } catch (error) {
      return {
        metadata: {
          path: absolutePath,
          size: 0,
          extension: path.extname(absolutePath),
          encoding: executionContext.context.encoding,
          edits: 0,
        },
        success: false,
        error: error instanceof Error ? error.message : "Unknown error editing file",
      };
    }
  },
});

// DELETE FILE TOOL
export const deleteFileTool = createTool({
  id: "delete-file",
  description: "Deletes a file at the given path.",
  inputSchema: DeleteFileInputSchema,
  execute: async (
    executionContext: ToolExecutionContext<typeof DeleteFileInputSchema>
  ) => {
    const absolutePath = path.resolve(executionContext.context.path);

    // Ensure the file path is valid
    if (!absolutePath) {
      return {
        path: executionContext.context.path,
        success: false,
        error: "Invalid file path",
      };
    }

    if (!isInMastraDir(absolutePath)) {
      return {
        path: absolutePath,
        success: false,
        error: "Access denied: Can only delete files inside .mastra directory",
      };
    }

    try {
      await fs.rm(absolutePath, { recursive: true, force: true });
      return { path: absolutePath, success: true };
    } catch (err) {
      return {
        path: absolutePath,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error deleting file",
      };
    }
  },
});

// Define the `walk` function to handle directory traversal
async function walk(directory: string): Promise<string[]> {
  const results: string[] = [];
  const files = await fs.readdir(directory);
  for (const file of files) {
    const fullPath = path.resolve(directory, file);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      results.push(...(await walk(fullPath)));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

export const listFilesTool = createTool({
  id: "list-files",
  description: "Lists files in a directory, optionally recursively.",
  inputSchema: ListFilesInputSchema,
  execute: async (
    executionContext: ToolExecutionContext<typeof ListFilesInputSchema>
  ) => {
    const absolutePath = path.resolve(executionContext.context.path);

    // Ensure the directory path is valid
    if (!absolutePath) {
      throw new Error("Invalid directory path");
    }

    const results: { name: string; path: string; isDirectory: boolean; extension: string }[] = [];

    async function processDirectory(directory: string) {
      const files = await fs.readdir(directory);
      for (const file of files) {
        const fullPath = path.resolve(directory, file);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          results.push({ name: file, path: fullPath, isDirectory: true, extension: "" });
          if (executionContext.context.recursive) {
            await processDirectory(fullPath);
          }
        } else {
          results.push({ name: file, path: fullPath, isDirectory: false, extension: path.extname(file) });
        }
      }
    }

    try {
      await processDirectory(absolutePath);
      return { files: results, success: true };
    } catch (error) {
      return {
        files: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error listing files",
      };
    }
  },
});

// Define input and output schemas outside to avoid self-reference
const ListFilesWithWalkInputSchema = z.object({
  path: z.string().describe("Path to the directory to list files from"),
});
export const listFilesWithWalkTool = createTool({
  id: "list-files-with-walk",
  description: "Lists all files in a directory recursively using the walk function.",
  inputSchema: ListFilesWithWalkInputSchema,
  execute: async (
    executionContext: ToolExecutionContext<typeof ListFilesWithWalkInputSchema>
  ) => {
    let absolutePath: string;
    try {
      absolutePath = await fs.realpath(path.resolve(executionContext.context.path));
    } catch (err) {
      return {
        path: executionContext.context.path,
        success: false,
        error: 'E_PATH_INVALID',
        errorMessage: err instanceof Error ? err.message : 'Invalid path',
      };
    }
    if (!(await isInMastraDir(absolutePath))) {
      return {
        path: absolutePath,
        success: false,
        error: 'E_PERM',
        errorMessage: 'Access denied: Can only list files inside .mastra directory',
      };
    }
    try {
      const files = await walk(absolutePath);
      return { files, success: true };
    } catch (error) {
      return {
        files: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error listing files",
      };
    }
  },
});



export const mkdirTool = createTool({
  id: "mkdir",
  description: "Creates a new directory at the specified path.",
  inputSchema: MkdirInputSchema,
  execute: async (
    executionContext: { context: z.infer<typeof MkdirInputSchema> }
  ) => {
    let absolutePath: string;
    try {
      absolutePath = await fs.realpath(path.resolve(executionContext.context.path));
    } catch (err) {
      return {
        path: executionContext.context.path,
        success: false,
        error: 'E_PATH_INVALID',
        errorMessage: err instanceof Error ? err.message : 'Invalid path',
      };
    }
    if (!(await isInMastraDir(absolutePath))) {
      return {
        path: absolutePath,
        success: false,
        error: 'E_PERM',
        errorMessage: 'Access denied: Can only create directories inside .mastra directory',
      };
    }
    try {
      await ensureDir(absolutePath);
      return { path: absolutePath, success: true };
    } catch (error) {
      return {
        path: absolutePath,
        success: false,
        error: 'E_MKDIR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error creating directory',
      };
    }
  },
});



const CopyToolInputSchema = z.object({
  source: z.string().describe("Absolute or relative path to the file or directory to copy"),
  destination: z.string().describe("Absolute or relative path to the target destination"),
  overwrite: z.boolean().optional().default(false).describe("Whether to overwrite the destination if it exists (default: false)"),
});

export const copyTool = createTool({
  id: "copy",
  description: "Copies a file or directory to a new location.",
  inputSchema: CopyToolInputSchema,
  execute: async (
    executionContext: ToolExecutionContext<typeof CopyToolInputSchema>
  ) => {
    let sourcePath: string;
    try {
      sourcePath = await fs.realpath(path.resolve(executionContext.context.source));
    } catch (err) {
      return {
        source: executionContext.context.source,
        destination: executionContext.context.destination,
        success: false,
        error: 'E_PATH_INVALID',
        errorMessage: err instanceof Error ? err.message : 'Invalid source path',
      };
    }
    let destinationPath: string;
    try {
      destinationPath = await fs.realpath(path.resolve(executionContext.context.destination));
    } catch (err) {
      return {
        source: sourcePath,
        destination: executionContext.context.destination,
        success: false,
        error: 'E_PATH_INVALID',
        errorMessage: err instanceof Error ? err.message : 'Invalid destination path',
      };
    }
    if (!(await isInMastraDir(sourcePath)) || !(await isInMastraDir(destinationPath))) {
      return {
        source: sourcePath,
        destination: destinationPath,
        success: false,
        error: 'E_PERM',
        errorMessage: 'Access denied: Can only copy files and directories inside .mastra directory',
      };
    }
    try {
      await fs.cp(sourcePath, destinationPath, { recursive: true, force: executionContext.context.overwrite });
      return { source: sourcePath, destination: destinationPath, success: true };
    } catch (error) {
      return {
        source: sourcePath,
        destination: destinationPath,
        success: false,
        error: 'E_COPY',
        errorMessage: error instanceof Error ? error.message : 'Unknown error copying file or directory',
      };
    }
  },
});



const MoveToolInputSchema = z.object({
  source: z.string().describe("Absolute or relative path to the file or directory to move"),
  destination: z.string().describe("Absolute or relative path to the target destination"),
  overwrite: z.boolean().optional().default(false).describe("Whether to overwrite the destination if it exists (default: false)"),
});

export const moveTool = createTool({
  id: "move",
  description: "Moves a file or directory to a new location.",
  inputSchema: MoveToolInputSchema,
  execute: async (
    executionContext: ToolExecutionContext<typeof MoveToolInputSchema>
  ) => {
    let sourcePath: string;
    try {
      sourcePath = await fs.realpath(path.resolve(executionContext.context.source));
    } catch (err) {
      return {
        source: executionContext.context.source,
        destination: executionContext.context.destination,
        success: false,
        error: 'E_PATH_INVALID',
        errorMessage: err instanceof Error ? err.message : 'Invalid source path',
      };
    }
    let destinationPath: string;
    try {
      destinationPath = await fs.realpath(path.resolve(executionContext.context.destination));
    } catch (err) {
      return {
        source: sourcePath,
        destination: executionContext.context.destination,
        success: false,
        error: 'E_PATH_INVALID',
        errorMessage: err instanceof Error ? err.message : 'Invalid destination path',
      };
    }
    if (!(await isInMastraDir(sourcePath)) || !(await isInMastraDir(destinationPath))) {
      return {
        source: sourcePath,
        destination: destinationPath,
        success: false,
        error: 'E_PERM',
        errorMessage: 'Access denied: Can only move files and directories inside .mastra directory',
      };
    }
    try {
      await fs.rename(sourcePath, destinationPath);
      return { source: sourcePath, destination: destinationPath, success: true };
    } catch (error) {
      return {
        source: sourcePath,
        destination: destinationPath,
        success: false,
        error: 'E_MOVE',
        errorMessage: error instanceof Error ? error.message : 'Unknown error moving file or directory',
      };
    }
  },
});

// Original tools are already exported when defined
