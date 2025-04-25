import { createAIFunction, getEnv } from "@agentic/core";
import { createMastraTools } from "@agentic/mastra";
import { Sandbox } from "@e2b/code-interpreter";
import { z } from "zod";

/**
 * E2B code interpreter sandbox for Python and TypeScript.
 * Supports pre-commands, package installation, file writing, env vars, output file retrieval, and returns full execution details.
 */
export const e2b = createAIFunction(
  {
    name: "execute_code",
    description: `
Execute code in a secure E2B sandbox. Supports Python and TypeScript.
- Specify the language ("python" or "typescript").
- Optionally install packages before execution.
- Optionally run shell commands before execution.
- Optionally write files before execution.
- Optionally set environment variables.
- Optionally retrieve output files after execution.
- Optionally set a timeout (ms) for code execution.
- Code can access the internet, filesystem, and install packages.
- Returns stdout, stderr, exit code, results, and output files.
    `.trim(),
    inputSchema: z.object({
      code: z.string().describe("Code to execute."),
      language: z.enum(["python", "typescript"]).default("python"),
      install: z.array(z.string()).optional().describe("Packages to install before running code."),
      files: z.record(z.string(), z.string()).optional().describe("Additional files to write before execution. Keys are file paths, values are file contents."),
      preCommands: z.array(z.string()).optional().describe("Shell commands to run before code execution (e.g., environment setup)."),
      outputFiles: z.array(z.string()).optional().describe("Files to retrieve after execution."),
      env: z.record(z.string(), z.string()).optional().describe("Environment variables for the execution."),
      timeout: z.number().int().optional().describe("Timeout in milliseconds for code execution."),
    }),
  },
  async ({ code, language, install, files, preCommands, outputFiles, env, timeout }) => {
    const sandbox = await Sandbox.create({
      apiKey: getEnv("E2B_API_KEY"),
    });

    try {
      // Write additional files if provided
      if (files) {
        for (const [filePath, content] of Object.entries(files)) {
          await sandbox.files.write(filePath, content);
        }
      }

      // Run pre-commands if provided
      if (preCommands && preCommands.length > 0) {
        for (const cmd of preCommands) {
          await sandbox.runCode(cmd, { envs: env });
        }
      }

      // Install packages if requested
      if (install && install.length > 0) {
        if (language === "python") {
          await sandbox.runCode(`pip install ${install.join(" ")}`, { envs: env });
        } else if (language === "typescript") {
          await sandbox.runCode(`npm install ${install.join(" ")}`, { envs: env });
        }
      }

      let exec;
      if (language === "python") {
        exec = await sandbox.runCode(code, {
          onStderr: (msg) => console.warn("[E2B stderr]", msg),
          onStdout: (msg) => console.log("[E2B stdout]", msg),
          envs: env,
          timeoutMs: timeout,
        });
      } else if (language === "typescript") {
        // Write code to file, compile, and run
        await sandbox.files.write("/main.ts", code);
        await sandbox.runCode("npx tsc /main.ts", { envs: env, timeoutMs: timeout });
        exec = await sandbox.runCode("node /main.js", {
          onStderr: (msg) => console.warn("[E2B stderr]", msg),
          onStdout: (msg) => console.log("[E2B stdout]", msg),
          envs: env,
          timeoutMs: timeout,
        });
      } else {
        throw new Error("Unsupported language");
      }

      if (exec.error) {
        throw new Error(exec.error.value || String(exec.error));
      }

      // Retrieve output files if requested
      let retrievedFiles: Record<string, string | null> = {};
      if (outputFiles && outputFiles.length > 0) {
        for (const file of outputFiles) {
          try {
            retrievedFiles[file] = await sandbox.files.read(file);
          } catch {
            retrievedFiles[file] = null;
          }
        }
      }

      // TypeScript error: Property 'stdout' does not exist on type 'Execution'
      // Solution: Use type assertion or check the actual structure returned by sandbox.runCode.
      // If you are sure 'stdout' exists at runtime, use type assertion:
      return {
        results: exec.results ? exec.results.map((r: any) => r.toJSON?.() ?? r) : [],
        stdout: (exec as any).stdout ?? "",
        stderr: (typeof (exec as any).error === "object" && (exec as any).error?.value)
          ? (exec as any).error.value
          : (typeof (exec as any).error === "string" ? (exec as any).error : ""),
        exitCode: exec.error ? -1 : 0,
        outputFiles: retrievedFiles,
      };
    } catch (err: any) {
      return {
        results: [],
        stdout: "",
        stderr: err?.message || String(err),
        exitCode: -1,
        error: true,
        outputFiles: {},
      };
    } finally {
      await sandbox.kill();
    }
  }
);

export const E2BOutputSchema = z.object({
  results: z.array(z.any()),
  stdout: z.string(),
  stderr: z.string(),
  exitCode: z.number(),
  outputFiles: z.record(z.string(), z.string().nullable()),
  error: z.boolean().optional(),
});

export function createE2BSandboxTool(config: {
  apiKey?: string;
} = {}) {
  return e2b;
}

export function createMastraE2BTools(config: {
  apiKey?: string;
} = {}) {
  const e2bTool = createE2BSandboxTool(config);
  const mastraTools = createMastraTools(e2bTool);
  if (mastraTools.execute_code) {
    (mastraTools.execute_code as any).outputSchema = E2BOutputSchema;
  }
  return mastraTools;
}

export { createMastraTools };
