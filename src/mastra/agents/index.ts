/**
 * Agents Module
 *
 * This module exports all agent implementations from their individual files.
 * Each agent is specialized for a particular role in the system and is configured
 * with specific tools, memory settings, and instructions.
 */

// Import agent instances from their modular files
import { researchAgent } from "./research.agent";
import { analystAgent } from "./analyst.agent";
import { writerAgent } from "./writer.agent";
import { rlTrainerAgent } from "./rlTrainer.agent";
import { dataManagerAgent } from "./dataManager.agent";
import { agenticAssistant } from "./agentic.agent";
import { coderAgent } from "./coder.agent";
import { copywriterAgent } from "./copywriter.agent";

// Import coding team agents
import { architectAgent } from "./architect.agent";
import { debuggerAgent } from "./debugger.agent";
import { uiUxCoderAgent } from "./uiUxCoder.agent";
import { codeDocumenterAgent } from "./codeDocumenter.agent";

// Import marketing team agents
import { marketResearchAgent } from "./marketResearch.agent";
import { socialMediaAgent } from "./socialMedia.agent";
import { seoAgent } from "./seoAgent.agent";
import { masterAgent } from "./master.agent";
import { createLogger } from '@mastra/core/logger';

const logger = createLogger({ name: "agent-initialization", level: "debug" });// Configure logger for agent initialization

// Export individual agents
export {
  // Core agents
  researchAgent,
  analystAgent,
  writerAgent,
  rlTrainerAgent,
  dataManagerAgent,
  agenticAssistant,
  coderAgent,
  copywriterAgent,
  masterAgent,

  // Coding team agents
  architectAgent,
  debuggerAgent,
  uiUxCoderAgent,
  codeDocumenterAgent,

  // Marketing team agents
  marketResearchAgent,
  socialMediaAgent,
  seoAgent,
};

// Define the agents object
const agents = {
  // Core agents
  researchAgent,
  analystAgent,
  writerAgent,
  rlTrainerAgent, // RL Trainer agent included
  dataManagerAgent, // Data Manager agent included
  agenticAssistant,
  masterAgent, // masterAgent included

  // Coding team agents
  coderAgent,
  architectAgent,
  debuggerAgent,
  uiUxCoderAgent,
  codeDocumenterAgent,

  // Marketing team agents
  copywriterAgent,
  marketResearchAgent,
  socialMediaAgent,
  seoAgent,
};

// Export agents object for Mastra configuration
export default agents;

// Instrument agents registration in Langfuse
import { langfuse } from "../services/langfuse";

// To avoid ReferenceError/circular import issues, do not call langfuse.createTrace at the top-level.
// Instead, call this function from your main entrypoint after all modules are loaded.
export function registerAgentsWithLangfuse() {
  try {
    let traceId: string | undefined;
    try {
      const currentSpan = (globalThis as any).trace?.getSpan?.((globalThis as any).context?.active?.());
      traceId = currentSpan?.spanContext().traceId;
    } catch {}
    // Gather metrics for each agent if present
    const agentMetrics: Record<string, { usage_details?: any; cost_details?: any }> = {};
    for (const [agentId, agent] of Object.entries(agents)) {
      const usage_details = (agent as any).usage_details;
      const cost_details = (agent as any).cost_details;
      if (usage_details || cost_details) {
        agentMetrics[agentId] = {
          ...(usage_details ? { usage_details } : {}),
          ...(cost_details ? { cost_details } : {})
        };
      }
    }
    langfuse.createTrace("agents.registered", {
      metadata: {
        agentIds: Object.keys(agents),
        ...(Object.keys(agentMetrics).length > 0 ? { agentMetrics } : {}),
        ...(traceId ? { traceId } : {})
      }
    });
  } catch (err) {
    logger.warn("Langfuse agents.registered trace failed", { error: err });
  }
}

// Export type for OpenAPI/Swagger documentation
export type AgentIds = keyof typeof agents;
