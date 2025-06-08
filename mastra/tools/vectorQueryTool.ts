import { fastembed } from '@mastra/fastembed';
import { createVectorQueryTool } from "@mastra/rag";

export const vectorQueryTool = createVectorQueryTool({
  vectorStoreName: "agentVector",
  indexName: "context",
  model: fastembed
});
