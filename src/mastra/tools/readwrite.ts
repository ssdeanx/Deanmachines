/**
 * File Reading and Writing Tools for Mastra AI, now thread-aware.
 * All tool input schemas accept an optional threadId for tracing and debugging.
 * Each tool logs the threadId (if present) at the start of execution.
 *
 * This module provides tools for reading from and writing to files in the filesystem
 * with support for different file formats, encodings, and write modes.
 */

import { createTool, ToolExecutionContext } from "@mastra/core/tools";
import { z } from "zod";
import * as fsPromises from "fs/promises";

import { resolve, dirname, extname, join } from "path";
import { langfuse } from "../services/langfuse";
import {
  ReadFileInputSchema,
  WriteFileInputSchema,
  DeleteFileInputSchema,
  ListFilesInputSchema,
  ReadKnowledgeFileInputSchema,
  ReadKnowledgeFileOutputSchema,
  WriteKnowledgeFileInputSchema,
} from "./readwriteschema";
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
const KNOWLEDGE_BASE_PATH = resolve(process.cwd(), "src", "mastra", "knowledge");

/**
 * Validates if a path is within the knowledge folder
 */
function isKnowledgePath(path: string): boolean {
  const absolutePath = resolve(path);
  return absolutePath.startsWith(KNOWLEDGE_BASE_PATH);
}

/**
 * Resolves a knowledge folder path
 */
function resolveKnowledgePath(path: string): string {
  return join(KNOWLEDGE_BASE_PATH, path);
}

const MASTRA_DIR = resolve(process.cwd(), ".mastra");
function isInMastraDir(path: string): boolean {
  return resolve(path).startsWith(MASTRA_DIR);
}

/**
 * Utility to ensure directory exists
 */
async function ensureDir(path: string) {
  await fsPromises.mkdir(path, { recursive: true });
}

/**
 * Tool for reading files from the filesystem
 */
export const readFileTool = createTool({
  id: "read-file",
  description:
    "Reads a file from the filesystem with support for various formats and encodings",
  inputSchema: z.object({
    path: z
      .string()
      .describe("Path to the file to read (absolute or relative)"),
    encoding: z
      .enum([
        FileEncoding.UTF8,
        FileEncoding.ASCII,
        FileEncoding.UTF16LE,
        FileEncoding.LATIN1,
        FileEncoding.BASE64,
        FileEncoding.HEX,
      ])
      .default(FileEncoding.UTF8)
      .describe("Encoding to use when reading the file"),
    maxSizeBytes: z
      .number()
      .optional()
      .default(10485760)
      .describe("Maximum file size in bytes (default: 10MB)"),
    startLine: z
      .number()
      .optional()
      .default(0)
      .describe("Line to start reading from (0-indexed)"),
    endLine: z
      .number()
      .optional()
      .describe("Line to end reading at (0-indexed, inclusive)"),
  }),
  outputSchema: z.object({
    content: z.string().describe("Content of the file"),
    metadata: z.object({
      path: z.string().describe("Absolute path to the file"),
      size: z.number().describe("Size of the file in bytes"),
      extension: z.string().describe("File extension"),
      encoding: z.string().describe("Encoding used to read the file"),
      lineCount: z.number().describe("Total number of lines in the file"),
      readLines: z.number().describe("Number of lines read"),
    }),
    success: z.boolean().describe("Whether the operation was successful"),
    error: z
      .string()
      .optional()
      .describe("Error message if the operation failed"),
  }),
  execute: async (
    { context }: { context: z.infer<typeof ReadFileInputSchema> }
  ) => {
    const trace = langfuse.createTrace("read-file", { tags: ["file", "read"] });

    try {
      // Resolve the absolute path
      const absolutePath = resolve(context.path);

      // Ensure the file path is valid
      if (!absolutePath) {
        throw new Error("Invalid file path");
      }

      // Check if the file exists
      try {
        await fsPromises.access(absolutePath);
      } catch (error) {
        langfuse.createScore({
          traceId: trace.id,
          score: 0,
          comment: `File does not exist: ${absolutePath}`,
          name: "file_read_failure",
        });

        return {
          content: "",
          metadata: {
            path: absolutePath,
            size: 0,
            extension: extname(absolutePath),
            encoding: context.encoding,
            lineCount: 0,
            readLines: 0,
          },
          success: false,
          error: `File does not exist: ${absolutePath}`,
        };
      }

      // Get file stats
      const stats = await fsPromises.stat(absolutePath);

      // Check file size
      if (stats.size > 10485760) {
        langfuse.createScore({
          traceId: trace.id,
          score: 0,
          comment: `File too large: ${stats.size} bytes (max: 10MB)`,
          name: "file_read_failure",
        });

        return {
          content: "",
          metadata: {
            path: absolutePath,
            size: stats.size,
            extension: extname(absolutePath),
            encoding: context.encoding,
            lineCount: 0,
            readLines: 0,
          },
          success: false,
          error: `File too large: ${stats.size} bytes (max: 10MB)`,
        };
      }

      // Read the file
      const content = await fsPromises.readFile(absolutePath, context.encoding as BufferEncoding);
      let processedContent = content.toString();
      const allLines = processedContent.split(/\r?\n/);
      let readLines = allLines.length;
      if (context.startLine !== undefined || context.endLine !== undefined) {
        const startLine = Math.max(0, context.startLine || 0);
        const endLine =
          context.endLine !== undefined
            ? Math.min(context.endLine, allLines.length - 1)
            : allLines.length - 1;

        if (startLine > endLine) {
          langfuse.createScore({
            traceId: trace.id,
            score: 0.5,
            comment: `Invalid line range: start (${startLine}) > end (${endLine})`,
            name: "file_read_warning",
          });

          return {
            content: "",
            metadata: {
              path: absolutePath,
              size: stats.size,
              extension: extname(absolutePath),
              encoding: context.encoding,
              lineCount: allLines.length,
              readLines: 0,
            },
            success: false,
            error: `Invalid line range: start (${startLine}) > end (${endLine})`,
          };
        }

        // Extract the requested lines
        processedContent = allLines.slice(startLine, endLine + 1).join("\n");
        readLines = endLine - startLine + 1;
      }

      // Track success in LangFuse
      langfuse.createScore({
        traceId: trace.id,
        score: 1,
        comment: `Successfully read file: ${absolutePath} (${stats.size} bytes)`,
        name: "file_read_success",
        metadata: {
          path: absolutePath,
          size: stats.size,
          lineCount: allLines.length,
          readLines,
        },
      });

      return {
        content: processedContent,
        metadata: {
          path: absolutePath,
          size: stats.size,
          extension: extname(absolutePath),
          encoding: context.encoding,
          lineCount: allLines.length,
          readLines,
        },
        success: true,
      };
    } catch (error) {
      console.error("Error reading file:", error);

      // Track failure in LangFuse
      langfuse.createScore({
        traceId: trace.id,
        score: 0,
        comment: error instanceof Error ? error.message : "Unknown error",
        name: "file_read_failure",
      });

      return {
        content: "",
        metadata: {
          path: context.path,
          size: 0,
          extension: extname(context.path),
          encoding: context.encoding,
          lineCount: 0,
          readLines: 0,
        },
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error reading file",
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
  outputSchema: z.object({
    metadata: z.object({
      path: z.string().describe("Absolute path to the file"),
      size: z.number().describe("Size of the written content in bytes"),
      extension: z.string().describe("File extension"),
      encoding: z.string().describe("Encoding used to write the file"),
      mode: z.string().describe("Write mode used"),
    }),
    success: z.boolean().describe("Whether the operation was successful"),
    error: z.string().optional().describe("Error message if the operation failed"),
  }),
  execute: async (executionContext: { context: z.infer<typeof WriteFileInputSchema> }) => {
    const { context } = executionContext;
    const trace = langfuse.createTrace("write-file", { tags: ["file", "write"] });

    try {
      // Resolve the absolute path
      const absolutePath = resolve(context.path);

      // Ensure the file path is valid
      if (!absolutePath) {
        throw new Error("Invalid file path");
      }

      if (!isInMastraDir(absolutePath)) {
        return {
          metadata: {
            path: absolutePath,
            size: 0,
            extension: extname(absolutePath),
            encoding: context.encoding,
            mode: context.mode,
          },
          success: false,
          error: "Access denied: Can only write to .mastra directory",
        };
      }

      // Ensure maxSizeBytes is set (fallback to default if missing)
      const maxSizeBytes = context.maxSizeBytes ?? 10485760;

      // Check content size
      const contentSize = Buffer.byteLength(context.content, context.encoding as BufferEncoding);
      if (contentSize > maxSizeBytes) {
        langfuse.createScore({
          traceId: trace.id,
          score: 0,
          comment: `Content too large: ${contentSize} bytes (max: ${maxSizeBytes} bytes)`,
          name: "file_write_failure",
        });

        return {
          metadata: {
            path: absolutePath,
            size: contentSize,
            extension: extname(absolutePath),
            encoding: context.encoding,
            mode: context.mode,
          },
          success: false,
          error: `Content too large: ${contentSize} bytes (max: ${maxSizeBytes} bytes)`,
        };
      }

      // Create parent directories if requested
      if (context.createDirectory) {
        await ensureDir(dirname(absolutePath));
      }

      // Check if the file exists
      let fileExists = false;
      try {
        await fsPromises.access(absolutePath);
        fileExists = true;
      } catch (error) {
        // File doesn't exist
      }

      // Handle write mode
      if (fileExists && context.mode === FileWriteMode.CREATE_NEW) {
        langfuse.createScore({
          traceId: trace.id,
          score: 0,
          comment: `File already exists and mode is ${FileWriteMode.CREATE_NEW}`,
          name: "file_write_failure",
        });

        return {
          metadata: {
            path: absolutePath,
            size: 0,
            extension: extname(absolutePath),
            encoding: context.encoding,
            mode: context.mode,
          },
          success: false,
          error: `File already exists and mode is ${FileWriteMode.CREATE_NEW}`,
        };
      }

      // Write or append to the file based on the mode
      if (context.mode === FileWriteMode.APPEND && fileExists) {
        await fsPromises.appendFile(absolutePath, context.content, { encoding: context.encoding });
      } else {
        await fsPromises.writeFile(absolutePath, context.content, { encoding: context.encoding });
      }

      // Track success in LangFuse
      langfuse.createScore({
        traceId: trace.id,
        score: 1,
        comment: `Successfully wrote to file: ${absolutePath} (${contentSize} bytes)`,
        name: "file_write_success",
        metadata: { path: absolutePath, size: contentSize, mode: context.mode },
      });

      return {
        metadata: {
          path: absolutePath,
          size: contentSize,
          extension: extname(absolutePath),
          encoding: context.encoding,
          mode: context.mode,
        },
        success: true,
      };
    } catch (error) {
      console.error("Error writing to file:", error);

      // Track failure in LangFuse
      langfuse.createScore({
        traceId: trace.id,
        score: 0,
        comment: error instanceof Error ? error.message : "Unknown error",
        name: "file_write_failure",
      });

      return {
        metadata: {
          path: context.path,
          size: 0,
          extension: extname(context.path),
          encoding: context.encoding,
          mode: context.mode,
        },
        success: false,
        error: error instanceof Error ? error.message : "Unknown error writing to file",
      };
    }
  },
});

export const readKnowledgeFileTool = createTool({
  id: "read-knowledge-file",
  description: "Reads a file from the knowledge folder",
  inputSchema: ReadKnowledgeFileInputSchema, // Use imported schema
  outputSchema: ReadKnowledgeFileOutputSchema, // Use imported schema
  execute: async (
    executionContext: ToolExecutionContext<typeof ReadKnowledgeFileInputSchema>
  ) => {
    const trace = langfuse.createTrace("read-knowledge-file", { tags: ["knowledge", "read"] });

    try {
      const knowledgePath = resolveKnowledgePath(executionContext.context.path);

      if (!isKnowledgePath(knowledgePath)) {
        throw new Error("Access denied: Can only read from knowledge folder");
      }

      // Ensure the execute method exists before calling it
      if (!readFileTool.execute) {
        throw new Error("readFileTool.execute is not defined");
      }

      // Modify context to use knowledge path and provide default startLine and maxSizeBytes
      return await readFileTool.execute({
        context: {
          ...executionContext.context,
          path: knowledgePath,
          encoding: executionContext.context.encoding as FileEncoding,
          startLine: 0,
          maxSizeBytes: 10485760, // Add default maxSizeBytes from readFileTool schema
        },
        // Pass along other relevant execution context details if needed
        runId: executionContext.runId,
        threadId: executionContext.threadId,
        resourceId: executionContext.resourceId,
        mastra: executionContext.mastra,
        runtimeContext: executionContext.runtimeContext,
      });
    } catch (error) {
      console.error("Error reading knowledge file:", error);

      // Track failure in LangFuse
      langfuse.createScore({
        traceId: trace.id,
        score: 0,
        comment: error instanceof Error ? error.message : "Unknown error",
        name: "knowledge_read_failure",
      });

      return {
        content: "",
        metadata: {
          path: executionContext.context.path,
          size: 0,
          extension: extname(executionContext.context.path),
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
  outputSchema: z.object({
    metadata: z.object({
      path: z.string().describe("Absolute path to the file"),
      size: z.number().describe("Size of the written content in bytes"),
      extension: z.string().describe("File extension"),
      encoding: z.string().describe("Encoding used to write the file"),
      mode: z.string().describe("Write mode used"),
    }),
    success: z.boolean().describe("Whether the operation was successful"),
    error: z
      .string()
      .optional()
      .describe("Error message if the operation failed"),
  }),
  execute: async (
    executionContext: ToolExecutionContext<typeof WriteKnowledgeFileInputSchema>
  ) => {
    const trace = langfuse.createTrace("write-knowledge-file", { tags: ["knowledge", "write"] });

    try {
      const knowledgePath = resolveKnowledgePath(executionContext.context.path);

      if (!isKnowledgePath(knowledgePath)) {
        throw new Error("Access denied: Can only write to knowledge folder");
      }

      // Ensure the execute method exists before calling it
      if (!writeToFileTool.execute) {
        throw new Error("writeToFileTool.execute is not defined");
      }

      // Modify context to use knowledge path and include default maxSizeBytes
      return writeToFileTool.execute({
        context: {
          ...executionContext.context,
          path: knowledgePath,
          encoding: executionContext.context.encoding as FileEncoding,
          maxSizeBytes: 10485760, // Add default maxSizeBytes from readFileTool schema
        },
        // Pass along other relevant execution context details if needed
        runId: executionContext.runId,
        threadId: executionContext.threadId,
        resourceId: executionContext.resourceId,
        mastra: executionContext.mastra,
        runtimeContext: executionContext.runtimeContext,
      });
    } catch (error) {
      console.error("Error writing to knowledge file:", error);

      // Track failure in LangFuse
      langfuse.createScore({
        traceId: trace.id,
        score: 0,
        comment: error instanceof Error ? error.message : "Unknown error",
        name: "knowledge_write_failure",
      });

      return {
        metadata: {
          path: executionContext.context.path,
          size: 0,
          extension: extname(executionContext.context.path),
          encoding: executionContext.context.encoding,
          mode: executionContext.context.mode,
        },
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error writing knowledge file",
      };
    }
  },
});

// CREATE FILE TOOL
export const createFileTool = createTool({
  id: "create-file",
  description: "Creates a new file. Fails if the file already exists.",
  inputSchema: z.object({
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
  }),
  outputSchema: z.object({
    metadata: z.object({
      path: z.string(),
      size: z.number(),
      extension: z.string(),
      encoding: z.string(),
    }),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async (
    executionContext // Let TypeScript infer the type
  ) => {
    const absolutePath = resolve(executionContext.context.path);

    // Ensure the file path is valid
    if (!absolutePath) {
      throw new Error("Invalid file path");
    }

    if (!isInMastraDir(absolutePath)) {
      return {
        metadata: {
          path: absolutePath,
          size: 0,
          extension: extname(absolutePath),
          encoding: executionContext.context.encoding,
        },
        success: false,
        error: "Access denied: Can only create files inside .mastra directory",
      };
    }

    try {
      // Check if file exists
      await fsPromises.access(absolutePath);
      return {
        metadata: {
          path: absolutePath,
          size: 0,
          extension: extname(absolutePath),
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
        await ensureDir(dirname(absolutePath));
      }
      await fsPromises.writeFile(absolutePath, executionContext.context.content, { encoding: executionContext.context.encoding });
      return {
        metadata: {
          path: absolutePath,
          size: Buffer.byteLength(executionContext.context.content, executionContext.context.encoding),
          extension: extname(absolutePath),
          encoding: executionContext.context.encoding,
        },
        success: true,
      };
    } catch (error) {
      return {
        metadata: {
          path: absolutePath,
          size: 0,
          extension: extname(absolutePath),
          encoding: executionContext.context.encoding,
        },
        success: false,
        error: error instanceof Error ? error.message : "Unknown error creating file",
      };
    }
  },
});

// EDIT FILE TOOL (simple search/replace)
export const editFileTool = createTool({
  id: "edit-file",
  description: "Edits a file by searching and replacing text.",
  inputSchema: z.object({
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
  }),
  outputSchema: z.object({
    metadata: z.object({
      path: z.string(),
      size: z.number(),
      extension: z.string(),
      encoding: z.string(),
      edits: z.number(),
    }),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async (
    executionContext // Let TypeScript infer the type
  ) => {
    const absolutePath = resolve(executionContext.context.path);

    // Ensure the file path is valid
    if (!absolutePath) {
      throw new Error("Invalid file path");
    }

    if (!isInMastraDir(absolutePath)) {
      return {
        metadata: {
          path: absolutePath,
          size: 0,
          extension: extname(absolutePath),
          encoding: executionContext.context.encoding,
          edits: 0,
        },
        success: false,
        error: "Access denied: Can only edit files inside .mastra directory",
      };
    }

    try {
      // Read file content as string using the specified encoding
      let content = await fsPromises.readFile(absolutePath, { encoding: executionContext.context.encoding });
      let edits = 0;
      let newContent: string; // Declare newContent here
      if (executionContext.context.isRegex) {
        const regex = new RegExp(executionContext.context.search, "g");
        newContent = content.replace(regex, (match: string): string => { // Use content (string)
          edits++;
          return executionContext.context.replace;
        });
      } else {
        // Use content (string) for split and match
        newContent = content.split(executionContext.context.search).join(executionContext.context.replace);
        const searchRegex = new RegExp(executionContext.context.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g");
        edits = (content.match(searchRegex) || []).length;
      }
      await fsPromises.writeFile(absolutePath, newContent, { encoding: executionContext.context.encoding });
      return {
        metadata: {
          path: absolutePath,
          size: Buffer.byteLength(newContent, executionContext.context.encoding),
          extension: extname(absolutePath),
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
          extension: extname(absolutePath),
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
  inputSchema: z.object({
    path: z.string().describe("Path to the file to delete (absolute or relative)"),
  }),
  outputSchema: z.object({
    path: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async (
    executionContext: ToolExecutionContext<typeof DeleteFileInputSchema>
  ) => {
    const absolutePath = resolve(executionContext.context.path);

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
      await fsPromises.rm(absolutePath, { recursive: true, force: true });
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
  const files = await fsPromises.readdir(directory);
  for (const file of files) {
    const fullPath = resolve(directory, file);
    const stat = await fsPromises.stat(fullPath);
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
  inputSchema: z.object({
    path: z.string().describe("Path to the directory to list files from"),
    recursive: z.boolean().optional().default(false),
  }),
  outputSchema: z.object({
    files: z.array(z.object({
      name: z.string(),
      path: z.string(),
      isDirectory: z.boolean(),
      extension: z.string(),
    })),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async (
    executionContext: { context: z.infer<typeof ListFilesInputSchema> }
  ) => {
    const absolutePath = resolve(executionContext.context.path);

    // Ensure the directory path is valid
    if (!absolutePath) {
      throw new Error("Invalid directory path");
    }

    const results: { name: string; path: string; isDirectory: boolean; extension: string }[] = [];

    async function processDirectory(directory: string) {
      const files = await fsPromises.readdir(directory);
      for (const file of files) {
        const fullPath = resolve(directory, file);
        const stat = await fsPromises.stat(fullPath);
        if (stat.isDirectory()) {
          results.push({ name: file, path: fullPath, isDirectory: true, extension: "" });
          if (executionContext.context.recursive) {
            await processDirectory(fullPath);
          }
        } else {
          results.push({ name: file, path: fullPath, isDirectory: false, extension: extname(file) });
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
const ListFilesWithWalkOutputSchema = z.object({
  files: z.array(z.string()).describe("List of file paths"),
  success: z.boolean().describe("Whether the operation was successful"),
  error: z.string().optional().describe("Error message if the operation failed"),
});

export const listFilesWithWalkTool = createTool({
  id: "list-files-with-walk",
  description: "Lists all files in a directory recursively using the walk function.",
  inputSchema: ListFilesWithWalkInputSchema,
  outputSchema: ListFilesWithWalkOutputSchema,
  execute: async (
    executionContext: ToolExecutionContext<typeof ListFilesWithWalkInputSchema>
  ) => {
    const absolutePath = resolve(executionContext.context.path);

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

// Define input and output schemas separately to avoid self-reference
const MkdirInputSchema = z.object({
  path: z.string().describe("Path to the directory to create (absolute or relative)"),
  recursive: z.boolean().optional().default(false).describe("Whether to create parent directories if they don't exist"),
});
const MkdirOutputSchema = z.object({
  path: z.string().describe("Path of the created directory"),
  success: z.boolean().describe("Whether the operation was successful"),
  error: z.string().optional().describe("Error message if the operation failed"),
});

export const mkdirTool = createTool({
  id: "mkdir",
  description: "Creates a new directory at the specified path.",
  inputSchema: MkdirInputSchema,
  outputSchema: MkdirOutputSchema,
  execute: async (
    executionContext: { context: z.infer<typeof MkdirInputSchema> }
  ) => {
    const absolutePath = resolve(executionContext.context.path);

    try {
      await ensureDir(absolutePath);
      return { path: absolutePath, success: true };
    } catch (error) {
      return {
        path: absolutePath,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error creating directory",
      };
    }
  },
});

// Define input and output schemas for copyTool to avoid self-reference
const CopyToolInputSchema = z.object({
  source: z.string().describe("Path to the source file or directory (absolute or relative)"),
  destination: z.string().describe("Path to the destination file or directory (absolute or relative)"),
  overwrite: z.boolean().optional().default(false).describe("Whether to overwrite the destination if it exists"),
});
const CopyToolOutputSchema = z.object({
  source: z.string().describe("Path of the source file or directory"),
  destination: z.string().describe("Path of the destination file or directory"),
  success: z.boolean().describe("Whether the operation was successful"),
  error: z.string().optional().describe("Error message if the operation failed"),
});

export const copyTool = createTool({
  id: "copy",
  description: "Copies a file or directory to a new location.",
  inputSchema: CopyToolInputSchema,
  outputSchema: CopyToolOutputSchema,
  execute: async (
    executionContext
  ) => {
    const sourcePath = resolve(executionContext.context.source);
    const destinationPath = resolve(executionContext.context.destination);

    try {
      // Copy file or directory recursively
      await fsPromises.cp(sourcePath, destinationPath, { recursive: true, force: executionContext.context.overwrite });
      return { source: sourcePath, destination: destinationPath, success: true };
    } catch (error) {
      return {
        source: sourcePath,
        destination: destinationPath,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error copying file or directory",
      };
    }
  },
});

const MoveToolInputSchema = z.object({
  source: z.string().describe("Path to the source file or directory (absolute or relative)"),
  destination: z.string().describe("Path to the destination file or directory (absolute or relative)"),
  overwrite: z.boolean().optional().default(false).describe("Whether to overwrite the destination if it exists"),
});

export const moveTool = createTool({
  id: "move",
  description: "Moves a file or directory to a new location.",
  inputSchema: MoveToolInputSchema,
  outputSchema: z.object({
    source: z.string().describe("Path of the source file or directory"),
    destination: z.string().describe("Path of the destination file or directory"),
    success: z.boolean().describe("Whether the operation was successful"),
    error: z.string().optional().describe("Error message if the operation failed"),
  }),
  execute: async (
    executionContext: ToolExecutionContext<typeof MoveToolInputSchema>
  ) => {
    const sourcePath = resolve(executionContext.context.source);
    const destinationPath = resolve(executionContext.context.destination);

    try {
      await fsPromises.rename(sourcePath, destinationPath);
      return { source: sourcePath, destination: destinationPath, success: true };
    } catch (error) {
      return {
        source: sourcePath,
        destination: destinationPath,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error moving file or directory",
      };
    }
  },
});

// Original tools are already exported when defined
