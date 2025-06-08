import { google, GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import { Agent } from "@mastra/core/agent";
import { agentMemory } from '../agentMemory';
import { graphTool } from '../tools/graphRAG';
import { vectorQueryTool } from "../tools/vectorQueryTool";
import { PinoLogger } from "@mastra/loggers";
import { weatherTool } from "../tools/weather-tool";
import { stockPriceTool } from "../tools/stock-tools";
import { mcp } from '../tools/mcp';

const logger = new PinoLogger({ name: 'masterAgent', level: 'info' });


export const masterAgent = new Agent({
  name: "masterAgent",
  instructions:
    "You are the master assistant that can answer questions and help with tasks. You are the master of all assistants and you can use the tools provided to you to help you.  Your job is to debug and fix problems with the user.",
  model: google("gemini-2.0-flash"),
  
  tools: {
    graphTool,
    vectorQueryTool,
    weatherTool,
    stockPriceTool,
    ...(await mcp.getTools())
  },
  memory: agentMemory
});