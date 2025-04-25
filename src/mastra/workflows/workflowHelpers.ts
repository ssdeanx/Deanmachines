import { Workflow } from "@mastra/core";
import type { Mastra as MastraType } from "@mastra/core";
import type { ZodSchema } from "zod";
import { memoryStep, saveMemoryStep } from "./workflowFactory";

/**
 * Helper to build and commit a Workflow with wiring logic.
 * @param name - workflow name
 * @param mastra - Mastra instance
 * @param triggerSchema - Zod schema for trigger data
 * @param wiringFn - function that wires up steps on the workflow
 */
export function buildWorkflow(
  name: string,
  mastra: MastraType,
  triggerSchema: ZodSchema<any>,
  wiringFn: (wf: any) => any
): Workflow<any, any> {
  const wf = new Workflow<any, any>({ name, mastra, triggerSchema });
  // Prepend memory load step
  const wfWithMemory = wf.step(memoryStep);
  // Wire up user steps
  const wired = wiringFn(wfWithMemory);
  // Append memory save step before commit
  const wfWithSave = wired.step(saveMemoryStep);
  return wfWithSave.commit();
}
