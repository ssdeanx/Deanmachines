// import your mastra instance from dir
import { mastra } from "../../../mastra";
import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { getAGUI } from "@mastra/agui";
import { NextRequest } from "next/server";
 
export const POST = async (req: NextRequest) => {
  // Clone the request before reading the body
  const clonedReq = req.clone();
  const body = await clonedReq.json();
  const resourceId = body.resourceId || "TEST";
 
  const mastraAgents = getAGUI({
    mastra,
    resourceId,
  });
 
  const runtime = new CopilotRuntime({
    agents: mastraAgents,
  });
 
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new ExperimentalEmptyAdapter(),
    endpoint: "/api/copilotkit",
  });
 
  // Use the original request for handleRequest
  return handleRequest(req);
};