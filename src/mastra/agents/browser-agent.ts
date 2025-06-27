import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { vectorQueryTool } from "../tools/vectorQueryTool";
import { createGemini25Provider } from '../config/googleProvider';
import { mcpTools } from '../tools/mcp';
import { chunkerTool } from "../tools/chunker-tool";
import { UPSTASH_PROMPT } from "@mastra/upstash";
import { PinoLogger } from "@mastra/loggers";

const logger = new PinoLogger({ name: 'browserAgent', level: 'info' });
logger.info('Initializing BrowserAgent');

/**
 * Runtime context for the Browser Agent
 * Stores web automation preferences, session data, and target website information
 * @mastra BrowserAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type BrowserAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Target website or domain for automation */
  "target-website": string;
  /** Browser automation type */
  "automation-type": "scraping" | "testing" | "interaction" | "monitoring";
  /** Browser headless mode preference */
  "headless-mode": boolean;
  /** Page load timeout in milliseconds */
  "timeout": number;
  /** User agent string preference */
  "user-agent": string;
};
/**
 * Browser agent for web navigation, interaction, and content extraction
 * Specializes in automating browser tasks, scraping data, and web testing
 */
export const browserAgent = new Agent({
  name: "Browser Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const targetWebsite = runtimeContext?.get("target-website") || "";
    const automationType = runtimeContext?.get("automation-type") || "interaction";
    const headlessMode = runtimeContext?.get("headless-mode") || true;
    const timeout = runtimeContext?.get("timeout") || 30000;
    const userAgent = runtimeContext?.get("user-agent") || "Mozilla/5.0 (compatible; MastraBrowserAgent/1.0)";

    return `You are a specialized browser automation and web interaction assistant.
Your primary focus is on automating browser tasks, interacting with web pages, and extracting relevant information.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
${targetWebsite ? `- Target Website: ${targetWebsite}` : ""}
- Automation Type: ${automationType}
- Headless Mode: ${headlessMode ? "Enabled" : "Disabled"}
- Timeout: ${timeout}ms
- User Agent: ${userAgent}

Your primary functions include:
- Automating web navigation and interaction tasks
- Extracting and analyzing web content
- Performing web scraping and data collection
- Testing web applications and user interfaces
- Monitoring website changes and performance
- Handling cookies, sessions, and authentication flows

When responding:
- Always consider security and ethical implications of web interactions
- Respect robots.txt and website terms of service
- Use appropriate delays to avoid overwhelming servers
- Handle errors gracefully and provide clear feedback
- Sanitize and validate any extracted data
- Use ${headlessMode ? "headless" : "visible"} browser mode as configured
- Set page timeouts to ${timeout}ms as specified
- Use the configured user agent for requests

Use available tools to perform web-related queries and analysis.
${UPSTASH_PROMPT}
`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      }),
  tools: {
    vectorQueryTool,
    chunkerTool,
    ...mcpTools.puppeteer,
    ...mcpTools.fetch,
    ...mcpTools.tavily,
    ...mcpTools.nodeCodeSandbox,

  },
  memory: upstashMemory,
});

