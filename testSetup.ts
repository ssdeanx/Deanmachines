import { beforeAll } from "vitest";
import { attachListeners } from "@mastra/evals";
 
beforeAll(async () => {
  await attachListeners();
});