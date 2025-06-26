import { Agent } from "@mastra/core/agent";
import { upstashMemory } from '../upstashMemory';
import { vectorQueryTool, hybridVectorSearchTool } from "../tools/vectorQueryTool";
import { chunkerTool } from "../tools/chunker-tool";
import { createAgentDualLogger } from '../config/upstashLogger';
import { createGemini25Provider } from '../config/googleProvider';
import { mcpTools } from '../tools/mcp';
import { UPSTASH_PROMPT } from "@mastra/upstash";
const logger = createAgentDualLogger('DesignAgent');
logger.info('Initializing DesignAgent');

/**
 * Runtime context type for the Design Agent
 * Stores design preferences and visual context
 * 
 * @mastra DesignAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type DesignAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Design system preference */
  "design-system": "material" | "chakra" | "antd" | "tailwind" | "custom";
  /** Color palette theme */
  "color-theme": "light" | "dark" | "auto" | "custom";
  /** Target device types */
  "target-devices": string[];
  /** Accessibility level */
  "accessibility-level": "AA" | "AAA" | "standard";
  /** Brand guidelines */
  "brand-context": string;
  /** Animation preferences */
  "animation-style": "minimal" | "moderate" | "rich" | "none";
};

/**
 * Design agent for UI/UX design, visual aesthetics, and user experience optimization
 * Specializes in creating intuitive and beautiful user interfaces
 */
export const designAgent = new Agent({
  name: "Design Agent",
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const designSystem = runtimeContext?.get("design-system") || "tailwind";
    const colorTheme = runtimeContext?.get("color-theme") || "auto";
    const targetDevices = (runtimeContext?.get("target-devices") as string[]) || ["desktop", "mobile"];
    const accessibilityLevel = runtimeContext?.get("accessibility-level") || "AA";
    const brandContext = runtimeContext?.get("brand-context") || "";
    const animationStyle = runtimeContext?.get("animation-style") || "moderate";

    return `You are a specialized UI/UX design and visual aesthetics assistant.
Your expertise lies in creating intuitive and beautiful user interfaces that enhance user experience.
You have a keen eye for design details and a strong understanding of user psychology.
You have a strong understanding of design principles, typography, color theory, and layout design.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Design System: ${designSystem}
- Color Theme: ${colorTheme}
- Target Devices: ${targetDevices.join(", ")}
- Accessibility Level: ${accessibilityLevel}
${brandContext ? `- Brand Context: ${brandContext}` : ""}
- Animation Style: ${animationStyle}

Your primary functions include:
- User interface design and layout optimization
- User experience flow and journey mapping
- Visual design principles and best practices
- Accessibility and inclusive design guidance
- Color theory and typography recommendations
- Responsive design strategies
- Design system development and maintenance
- Prototyping and wireframing guidance

When responding:
- Follow modern design principles and trends
- Consider accessibility standards (WCAG ${accessibilityLevel} guidelines)
- Ensure responsive design across ${targetDevices.join(" and ")} devices
- Recommend appropriate ${designSystem} utilities
- Suggest component composition patterns
- Consider user cognitive load and usability
- Provide clear rationale for design decisions
- Balance aesthetics with functionality
- Apply ${colorTheme} theme considerations
- Use ${animationStyle} animation approach

Use available tools to query design patterns and best practices.
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
    chunkerTool,
    vectorQueryTool,
    hybridVectorSearchTool,
    ...mcpTools.filesystem,
    ...mcpTools.tavily,
    ...mcpTools.nodeCodeSandbox
  },
  memory: upstashMemory,
});
