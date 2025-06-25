import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { vectorQueryTool } from "../tools/vectorQueryTool";
import { createAgentDualLogger } from '../config/upstashLogger';
import { createGemini25Provider } from '../config/googleProvider';
import { getMCPToolsByServer } from '../tools/mcp';
import { chunkerTool } from "../tools/chunker-tool";

import { graphRAGTool } from "../tools/graphRAG";

const logger = createAgentDualLogger('ManagerAgent');
logger.info('Initializing ManagerAgent');

/**
 * Runtime context type for the Manager Agent
 * Stores project management preferences and coordination context
 * 
 * @mastra ManagerAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type ManagerAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Project management methodology */
  "methodology": "agile" | "scrum" | "kanban" | "waterfall" | "hybrid";
  /** Team size context */
  "team-size": number;
  /** Project priority level */
  "priority-level": "low" | "medium" | "high" | "critical";
  /** Timeline constraints */
  "timeline-strict": boolean;
  /** Resource tracking */
  "track-resources": boolean;
  /** Communication frequency */
  "update-frequency": "daily" | "weekly" | "bi-weekly" | "monthly";
};

/**
 * Manager agent for project management, task coordination, and resource planning
 * Specializes in agile methodologies, team coordination, and project delivery
 * 
 * @mastra ManagerAgent class
 * [EDIT: 2025-06-16] [BY: ss]
 */
export const managerAgent = new Agent({
  name: "Manager Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const methodology = runtimeContext?.get("methodology") || "agile";
    const teamSize = runtimeContext?.get("team-size") || 5;
    const priorityLevel = runtimeContext?.get("priority-level") || "medium";
    const timelineStrict = runtimeContext?.get("timeline-strict") || false;
    const trackResources = runtimeContext?.get("track-resources") || true;
    const updateFrequency = runtimeContext?.get("update-frequency") || "weekly";

    return `You are a specialized project management and coordination assistant.
Your expertise lies in managing projects, coordinating teams, and ensuring timely delivery of tasks.
You have a strong understanding of project management methodologies, team dynamics, and resource allocation strategies.
You are proficient in agile methodologies, task prioritization, and risk management.
You are familiar with various project management tools and can adapt to different team structures and workflows.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Methodology: ${methodology}
- Team Size: ${teamSize}
- Priority Level: ${priorityLevel}
- Timeline Strict: ${timelineStrict ? "Yes" : "No"}
- Track Resources: ${trackResources ? "Yes" : "No"}
- Update Frequency: ${updateFrequency}

Your primary functions include:
- Project planning and milestone management
- Task breakdown and estimation
- Resource allocation and capacity planning
- Risk assessment and mitigation strategies
- Agile/Scrum methodology implementation
- Team coordination and communication facilitation
- Progress tracking and reporting
- Stakeholder management and updates

When responding:
- Apply project management best practices and methodologies
- Consider team capacity and workload distribution
- Suggest appropriate task prioritization frameworks
- Recommend risk mitigation strategies
- Provide clear timelines and dependencies
- Consider both technical and business constraints
- Facilitate effective communication between stakeholders
- Focus on delivery and value creation

Use available tools to query project management patterns and best practices.`;
  },
  model: createGemini25Provider('gemini-2.5-flash-preview-05-20', {
        responseModalities: ["TEXT", "IMAGE"],
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      }),  tools: {
    vectorQueryTool,
    chunkerTool,
    graphRAGTool,
    ...await getMCPToolsByServer('filesystem'),
    ...await getMCPToolsByServer('memoryGraph'),
    ...await getMCPToolsByServer('git'),
    ...await getMCPToolsByServer('fetch'),
    ...await getMCPToolsByServer('sequentialThinking'),
    ...await getMCPToolsByServer('tavily'),
  },
  memory: upstashMemory,
});
