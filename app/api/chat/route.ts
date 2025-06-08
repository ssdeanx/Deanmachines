import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import { streamText } from "ai";
import { experimental_createMCPClient as createMCPClient } from "ai";

export const runtime = "edge";
export const maxDuration = 30;

const mcpClient = await createMCPClient({
  // TODO adjust this to point to your MCP server URL
  transport: {
    type: "sse",
    url: "http://localhost:8000/sse",
  },
});

const mcpTools = await mcpClient.tools();

export async function POST(req: Request) {
  const { messages, system, tools } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    // forward system prompt and tools from the frontend
    toolCallStreaming: true,
    system,
    tools: {
      ...frontendTools(tools),
      ...mcpTools,
    },
    onError: console.log,
  });

  return result.toDataStreamResponse();
}
