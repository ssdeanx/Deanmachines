import { z } from "zod";

// All file-writing tools are restricted to the .mastra directory for security.
// This is enforced in readwrite.ts. Do not change schemas to allow paths outside .mastra.

// ===== File Encoding Enum =====
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
  /** UTF-32 encoding */
  UTF32 = "utf32",
  /** UTF-16 encoding */
  UTF16 = "utf16",
  /** UTF-8 with BOM encoding */
  UTF8_BOM = "utf8bom",
}

// ===== File Write Mode Enum =====
export enum FileWriteMode {
  /** Overwrite the file if it exists */
  OVERWRITE = "overwrite",
  /** Append to the file if it exists */
  APPEND = "append",
  /** Create a new file, fail if the file exists */
  CREATE_NEW = "create-new",
}

// ===== Read File =====
export const ReadFileInputSchema = z.object({
  path: z.string().describe("Path to the file to read (absolute or relative)"),
  encoding: z.enum([
    FileEncoding.UTF8,
    FileEncoding.ASCII,
    FileEncoding.UTF16LE,
    FileEncoding.LATIN1,
    FileEncoding.BASE64,
    FileEncoding.HEX,
  ]).default(FileEncoding.UTF8).describe("Encoding to use when reading the file"),
  maxSizeBytes: z.number().optional().default(10485760).describe("Maximum file size in bytes (default: 10MB)"),
  startLine: z.number().optional().default(0).describe("Line to start reading from (0-indexed)"),
  endLine: z.number().optional().describe("Line to end reading at (0-indexed, inclusive)"),
  threadId: z.string().optional().describe("The thread ID for tracing."),
});


// ===== Write File =====
export const WriteFileInputSchema = z.object({
  path: z.string().describe("Path to write the file to"),
  content: z.string().describe("Content to write to the file"),
  encoding: z.enum([FileEncoding.UTF8, FileEncoding.ASCII, FileEncoding.UTF16LE, FileEncoding.LATIN1, FileEncoding.BASE64, FileEncoding.HEX]).default(FileEncoding.UTF8).describe("Encoding to use when writing the file"),
  createDirectory: z.boolean().optional().default(false).describe("Whether to create the directory if it doesn't exist"),
  maxSizeBytes: z.number().optional().default(10485760).describe("Maximum size of the file in bytes"),
  mode: z.enum([FileWriteMode.OVERWRITE, FileWriteMode.APPEND, FileWriteMode.CREATE_NEW]).default(FileWriteMode.OVERWRITE).describe("Write mode"),
  threadId: z.string().optional().describe("The thread ID for tracing."),
});

// ===== Edit File (Search/Replace) =====
export const EditFileInputSchema = z.object({
  path: z.string().describe("Path of the file to edit"),
  search: z.string().describe("String or regex to search for"),
  replace: z.string().describe("Replacement string"),
  encoding: z.string().optional().default("utf8"),
  isRegex: z.boolean().optional().default(false),
  threadId: z.string().optional().describe("The thread ID for tracing."),
});

// ===== Delete File =====
export const DeleteFileInputSchema = z.object({
  path: z.string().describe("Path of the file to delete"),
  threadId: z.string().optional().describe("The thread ID for tracing."),
});





// ===== List Files =====
export const ListFilesInputSchema = z.object({
  path: z.string().describe("Directory path to list"),
  recursive: z.boolean().optional().default(false),
  filterExtension: z.string().optional(),
  threadId: z.string().optional().describe("The thread ID for tracing."),
});


// ===== Read Knowledge File =====
export const ReadKnowledgeFileInputSchema = z.object({
  path: z.string().describe("Knowledge file path"),
  encoding: z.string().optional().default("utf8"),
  threadId: z.string().optional().describe("The thread ID for tracing."),
});

// ===== Write Knowledge File =====
export const WriteKnowledgeFileInputSchema = z.object({
  path: z.string().describe("Knowledge file path"),
  content: z.string().describe("Content to write"),
  encoding: z.enum([FileEncoding.UTF8, FileEncoding.ASCII, FileEncoding.UTF16LE, FileEncoding.LATIN1, FileEncoding.BASE64, FileEncoding.HEX]).default(FileEncoding.UTF8).describe("Encoding to use when writing the file"),
  createDirectory: z.boolean().optional().default(false).describe("Whether to create the directory if it doesn't exist"),
  maxSizeBytes: z.number().optional().default(10485760).describe("Maximum size of the file in bytes"),
  mode: z.enum([FileWriteMode.OVERWRITE, FileWriteMode.APPEND, FileWriteMode.CREATE_NEW]).default(FileWriteMode.OVERWRITE).describe("Write mode"),
  threadId: z.string().optional().describe("The thread ID for tracing."),
});


// ===== Create File =====
export const CreateFileInputSchema = z.object({
  path: z.string().describe("Path to create the file at"),
  content: z.string().describe("Content for the new file"),
  encoding: z.string().optional().default("utf8"),
  createDirectory: z.boolean().optional().default(false),
  threadId: z.string().optional().describe("The thread ID for tracing."),
});

// ===== Tool Execution Context =====
export const ToolExecutionContext = z.object({
  container: z.object({}).optional().describe("Container for execution context"),
  context: z.object({
    path: z.string().describe("Path to the file"),
    content: z.string().describe("Content of the file"),
    encoding: z.enum([FileEncoding.UTF8, FileEncoding.ASCII, FileEncoding.UTF16LE, FileEncoding.LATIN1, FileEncoding.BASE64, FileEncoding.HEX]).default(FileEncoding.UTF8).describe("Encoding of the file"),
    createDirectory: z.boolean().optional().default(false).describe("Whether to create directories"),
    maxSizeBytes: z.number().optional().default(10485760).describe("Maximum size of the file in bytes"),
    mode: z.enum([FileWriteMode.OVERWRITE, FileWriteMode.APPEND, FileWriteMode.CREATE_NEW]).default(FileWriteMode.OVERWRITE).describe("Write mode"),
  }).describe("Execution context for tools"),
});