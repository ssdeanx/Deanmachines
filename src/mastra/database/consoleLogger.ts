export function createConsoleLogger(level: "debug"|"info"|"warn"|"error" = "info") {
  function write(fn: Console["log"], lvl: string, ...args: any[]) {
    const prefix = `[${new Date().toISOString()}] [${lvl.toUpperCase()}]`;
    fn(prefix, ...args);
  }
  return {
    debug: (...args: any[]) => level==="debug" && write(console.debug, "debug", ...args),
    info:  (...args: any[]) => ["info","debug"].includes(level) && write(console.log,   "info",  ...args),
    warn:  (...args: any[]) => ["warn","info","debug"].includes(level) && write(console.warn,  "warn",  ...args),
    error: (...args: any[]) => write(console.error, "error", ...args),
  };
}

// default instance
export const consoleLogger = createConsoleLogger(process.env.LOG_LEVEL as any || "info");
export default consoleLogger;