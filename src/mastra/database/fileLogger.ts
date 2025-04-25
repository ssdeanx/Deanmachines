import { ensureDirSync, ensureFileSync } from "fs-extra";
import path from "path";
import { FileTransport } from "@mastra/loggers/file";

export interface FileLoggerOptions {
  name: string;
  level?: "debug" | "info" | "warn" | "error";
  path: string;
}

export function createFileLogger({
  name,
  level = "info",
  path: filePath,
}: FileLoggerOptions) {
  // ensure parent folder exists (and file)
  const dir = path.dirname(filePath);
  ensureDirSync(dir);
  ensureFileSync(filePath);

  const transport = new FileTransport({ path: filePath });
  function write(levelName: string, message: string, meta?: Record<string, any>) {
    const entry = {
      message,
      level: levelName,
      logger: name,
      timestamp: new Date().toISOString(),
      ...meta,
    };
    transport.write(JSON.stringify(entry) + "\n");
  }

  return {
    debug: (msg: string, meta?: Record<string, any>) =>
      level === "debug" && write("debug", msg, meta),
    info:  (msg: string, meta?: Record<string, any>) =>
      ["info","debug"].includes(level) && write("info", msg, meta),
    warn:  (msg: string, meta?: Record<string, any>) =>
      ["warn","info","debug"].includes(level) && write("warn", msg, meta),
    error: (msg: string, meta?: Record<string, any>) =>
      write("error", msg, meta),
  };
}

// default instance
export const fileLogger = createFileLogger({
  name: "Mastra",
  level: process.env.LOG_LEVEL as any || "info",
  path: "./logs/mastra.log",
});

export default fileLogger;
export { FileTransport };