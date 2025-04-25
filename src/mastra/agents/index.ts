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

// Export type for OpenAPI/Swagger documentation
export type AgentIds = keyof typeof agents;
