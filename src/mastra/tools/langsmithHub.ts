// src/mastra/tools/langsmithHub.ts
// Langsmith Hub Prompt Tool
// Set the LANGSMITH_API_KEY environment variable (create key in Settings > API Keys)

// If you are in a non-Node environment, please use the default "langchain/hub" entrypoint and omit includeModel for providers other than Google Generative AI. Aka Gemini.
import * as hub from "langchain/hub/node";

const promptsToPull = [
    "deanmachines-ai/prompt-maker",
    "deanmachines-ai/rag-prompt",
    "deanmachines-ai/chain-of-density",
    "deanmachines-ai/superb_system_instruction_prompt",
    "deanmachines-ai/model-evaluator",
    "deanmachines-ai/synthetic-training-data",
    "deanmachines-ai/react"
];

// Pull each prompt individually
await Promise.all(promptsToPull.map(prompt => hub.pull(prompt, { includeModel: true })));