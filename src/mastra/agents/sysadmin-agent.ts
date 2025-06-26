import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { vectorQueryTool, hybridVectorSearchTool } from "../tools/vectorQueryTool";
import { chunkerTool } from "../tools/chunker-tool";
import { graphRAGTool, graphRAGUpsertTool } from "../tools/graphRAG";
import { createAgentDualLogger } from '../config/upstashLogger';
import { createGemini25Provider } from '../config/googleProvider';
import { mcpTools } from '../tools/mcp';

const logger = createAgentDualLogger('sysadminAgent');
logger.info('Initializing sysadminAgent');

/**
 * Runtime context for the Sysadmin Agent
 * Stores system administration preferences, infrastructure context, and operational settings
 * 
 * @mastra SysadminAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type SysadminAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Target infrastructure environment */
  "infrastructure-env": "on-premise" | "cloud" | "hybrid" | "edge" | "multi-cloud";
  /** Operating system preference */
  "os-preference": "linux" | "windows" | "macos" | "container" | "serverless";
  /** Automation level preference */
  "automation-level": "manual" | "semi-automated" | "fully-automated" | "intelligent";
  /** Security posture requirement */
  "security-posture": "basic" | "standard" | "hardened" | "zero-trust" | "compliance";
  /** Monitoring and alerting level */
  "monitoring-level": "basic" | "comprehensive" | "proactive" | "predictive";
};

/**
 * System administration agent for infrastructure management, monitoring, and operations
 * Specializes in DevOps practices, system monitoring, and infrastructure automation
 */
export const sysadminAgent = new Agent({
  name: "System Administrator Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const infrastructureEnv = runtimeContext?.get("infrastructure-env") || "cloud";
    const osPreference = runtimeContext?.get("os-preference") || "linux";
    const automationLevel = runtimeContext?.get("automation-level") || "semi-automated";
    const securityPosture = runtimeContext?.get("security-posture") || "standard";
    const monitoringLevel = runtimeContext?.get("monitoring-level") || "comprehensive";

    return `You are a specialized system administration and DevOps assistant.
Your expertise lies in managing infrastructure, automating operations, and ensuring system reliability.
You have a strong understanding of system monitoring, performance optimization, and security best practices.
You are proficient in infrastructure automation tools, configuration management, and cloud services.
You are familiar with various operating systems, networking concepts, and DevOps methodologies.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Infrastructure Environment: ${infrastructureEnv}
- Operating System Preference: ${osPreference}
- Automation Level: ${automationLevel}
- Security Posture: ${securityPosture}
- Monitoring Level: ${monitoringLevel}

Your primary functions include:
- System monitoring and performance optimization
- Infrastructure automation and configuration management
- Security assessment and hardening
- Backup and disaster recovery planning
- Log analysis and troubleshooting
- Resource capacity planning and scaling
- CI/CD pipeline optimization
- Cloud infrastructure management

When responding:
- Follow security best practices and compliance requirements
- Recommend automation for repetitive tasks (${automationLevel} approach)
- Consider scalability and performance implications
- Suggest appropriate monitoring and alerting strategies (${monitoringLevel} level)
- Provide clear troubleshooting procedures
- Emphasize security and access control measures (${securityPosture} posture)
- Optimize for reliability and uptime
- Consider cost optimization for ${infrastructureEnv} resources
- Target ${osPreference} systems where applicable

Use available tools to query system administration patterns and best practices.`;
  },
  model: createGemini25Provider('gemini-2.5-flash-preview-05-20', {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      }),  
  tools: {
    vectorQueryTool,
    chunkerTool,
    graphRAGTool,
    graphRAGUpsertTool,
    hybridVectorSearchTool,
    ...mcpTools.filesystem,
    ...mcpTools.git,
    ...mcpTools.fetch,
    ...mcpTools.tavily
  },
  memory: upstashMemory,
});

