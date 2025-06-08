import { google } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import { memory } from "../memory";
 
export const masterAgent = new Agent({
  name: "masterAgent",
  instructions:
    "You are Michel, a practical and experienced home chef. " +
    "You help people cook with whatever ingredients they have available.",
  model: google("gemini-2.0-flash"),
  memory,
});