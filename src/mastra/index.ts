/**
 * DeanMachines AI Platform - Mastra Core Instance
 *
 * This file initializes the central Mastra instance that powers the AI capabilities
 * of the DeanMachines platform. It registers all agents, workflows, networks, and
 * configures shared services like logging.
 *
 * Note: After updating this file with new agents or networks, you can generate
 * an updated OpenAPI specification by running the Mastra CLI command:
 * `npx mastra openapi --output ./api.json`
 */



import { Mastra } from "@mastra/core";
import { createLogger } from "@mastra/core/logger";
import { initObservability } from "./services/index.js"; // Initialize telemetry services
import agents from "./agents"; // Central agent registry map
// Networks or workflows are causing
//SYNCHRONOUS TERMINATION NOTICE: When explicitly exiting the process via process.exit or via a parent process, asynchronous tasks in your exitHooks will not run. 
// Either remove these tasks, use gracefulExit() instead of process.exit(), or ensure your parent process sends a SIGINT to the process running this code.
import { ragWorkflow, multiAgentWorkflow, advancedTestWorkflow } from "./workflows/index.js";
//import { networks } from "./workflows/Networks/agentNetwork"; // Import agent networks from the networks file
import { VercelDeployer } from '@mastra/deployer-vercel';


// Initialize telemetry (SigNoz + OpenTelemetry + Langfuse) as early as possible
const observability = initObservability({
  serviceName: process.env.MASTRA_SERVICE_NAME || "deanmachines-ai-mastra",
  signozEnabled: true,
  otelEnabled: true,
  langfuseEnabled: true,
  exporters: [
    {
      type: 'otlp',
      endpoint: 'http://localhost:4318/'
    }
  ],
});

// Access the langfuse singleton if needed
const langfuseService = observability.langfuse;


// Configure logger with appropriate level based on environment
const logger = createLogger({
  name: "DeanMachinesAI-MastraCore",
  level: process.env.LOG_LEVEL === "debug" ? "debug" : "info",
});

logger.info("Initializing Mastra instance...");

// To avoid ReferenceError/circular import issues, do not call langfuseService.createTrace at the top-level.
// Instead, call this function from your main entrypoint after all modules are loaded.
export function registerMastraWithLangfuse(agentCount: number) {
  if (langfuseService) {
    try {
      langfuseService.createTrace("mastra.initialization.start", { metadata: { agentCount } });
      langfuseService.createTrace("mastra.initialized", { metadata: { agentCount } });
      logger.info("Langfuse tracing enabled for Mastra platform");
    } catch (err) {
      logger.warn("Langfuse mastra trace failed", { error: err });
    }
  } else {
    logger.warn("LangfuseService not initialized, skipping observability trace.");
  }
}

export const mastra = new Mastra({
  deployer: new VercelDeployer({
    teamSlug: process.env.VERCEL_TEAM_SLUG || 'deanmachines',
    projectName: process.env.VERCEL_PROJECT_NAME || 'deanmachines',
    token: process.env.VERCEL_TOKEN || 'fail'
  }),
  agents: agents, // All registered agents
  //networks: networks, // All registered agent networks
  workflows: { ragWorkflow, multiAgentWorkflow, advancedTestWorkflow }, // All registered workflows
  logger: logger,
  // Telemetry is initialized globally via initObservability
  // ... other Mastra configuration options
});

// Log initialization status for monitoring
const agentCount = Object.keys(agents).length;
//const networkCount = Object.keys(networks).length;
logger.info(
  `Mastra instance initialized successfully with ${agentCount} agents.`
);
if (agentCount > 0) {
  logger.debug(`Registered Agent IDs: ${Object.keys(agents).join(", ")}`);
}

