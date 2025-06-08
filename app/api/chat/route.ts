import { google } from "@ai-sdk/google";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { streamText } from "ai";
//import { experimental_createMCPClient as createMCPClient } from "ai";
import { mastra } from "@/mastra/index";


export const maxDuration = 30;

//const mcpClient = await createMCPClient({
  // TODO adjust this to point to your MCP server URL
  //transport: {
    //type: "sse",
    //url: "http://localhost:8000/sse",
  //},
//});

//const mcpTools = await mcpClient.tools();


export async function POST(req: Request) {

  const { messages, system} = await req.json();

  const agent = mastra.getAgent("masterAgent");

  const result = await agent.stream(messages, system);
  

  return result.toDataStreamResponse();
}