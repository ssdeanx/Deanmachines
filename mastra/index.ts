import { Mastra } from "@mastra/core";
import { masterAgent } from "./agents/master-agent";
 
export const mastra = new Mastra({
    agents: { masterAgent },
    // ... other config
});