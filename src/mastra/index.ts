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
import { initObservability } from "./services"; // Initialize telemetry services
import agents from "./agents"; // Central agent registry map
// Networks or workflows are causing
//SYNCHRONOUS TERMINATION NOTICE: When explicitly exiting the process via process.exit or via a parent process, asynchronous tasks in your exitHooks will not run. Either remove these tasks, use gracefulExit() instead of process.exit(), or ensure your parent process sends a SIGINT to the process running this code.

//import { ragWorkflow, multiAgentWorkflow } from "./workflows";
//import { networks } from "./workflows/Networks/agentNetwork"; // Import agent networks from the networks file



// Initialize telemetry (SigNoz + OpenTelemetry) as early as possible
initObservability({
  serviceName: process.env.MASTRA_SERVICE_NAME || "deanmachines-ai-mastra",
  signozEnabled: true,
  otelEnabled: true,
  exporters: [
    {
      type: 'otlp',
      endpoint: 'http://localhost:4318/'
    }
  ],
});

// Configure logger with appropriate level based on environment
const logger = createLogger({
  name: "DeanMachinesAI-MastraCore",
  level: process.env.LOG_LEVEL === "debug" ? "debug" : "info",
});

logger.info("Initializing Mastra instance...");

export const mastra = new Mastra({
  agents: agents, // All registered agents
  // Networks or workflows are causing
  //SYNCHRONOUS TERMINATION NOTICE: When explicitly exiting the process via process.exit or via a parent process, asynchronous tasks in your exitHooks will not run. Either remove these tasks, use gracefulExit() instead of process.exit(), or ensure your parent process sends a SIGINT to the process running this code.
  //networks: networks, // All registered agent networks
  //workflows: { ragWorkflow, multiAgentWorkflow },
  logger: logger,
  // Telemetry is initialized globally via initObservability
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

