import { UpstashTransport } from "@mastra/loggers/upstash";

export interface UpstashLoggerOptions {
  name: string;
  level?: "debug" | "info" | "warn" | "error";
  listName: string;
  upstashUrl: string;
  upstashToken: string;
}

export function createUpstashLogger({
  name,
  level = "info",
  listName,
  upstashUrl,
  upstashToken,
}: UpstashLoggerOptions) {
  // ensure URL is absolute
  const baseUrl = upstashUrl.match(/^https?:\/\//)
    ? upstashUrl
    : `https://${upstashUrl}`;

  const transport = new UpstashTransport({
    listName,
    upstashUrl: baseUrl,
    upstashToken,
  });

  function write(levelName: string, log: Record<string, any>) {
    if (
      (level === "debug") ||
      (level === "info" && levelName !== "debug") ||
      (level === "warn" && ["warn", "error"].includes(levelName)) ||
      (level === "error" && levelName === "error")
    ) {
      transport.logBuffer.push({
        ...log,
        level: levelName,
        logger: name,
        timestamp: new Date().toISOString(),
      });
      transport._flush?.();
    }
  }

  return {
    debug: (log: Record<string, any>) => write("debug", log),
    info: (log: Record<string, any>) => write("info", log),
    warn: (log: Record<string, any>) => write("warn", log),
    error: (log: Record<string, any>) => write("error", log),
  };
}

// default instance
export const upstashLogger = createUpstashLogger({
  name: "Mastra",
  level: process.env.LOG_LEVEL as any || "info",
  listName: "production-logs",
  upstashUrl: process.env.UPSTASH_REDIS_REST_URL!,
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default upstashLogger;
export { UpstashTransport };

