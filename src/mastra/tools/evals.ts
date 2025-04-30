import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { generateText } from "ai";
import { createLogger } from "@mastra/core/logger";
import { getTracer } from "../services/tracing.js";
import { DEFAULT_MODELS } from "../agents/config/config.types.js";
import { createModelFromConfig } from "../agents/config/model.utils.js";
import { 
  KeywordCoverageMetric, 
  ContentSimilarityMetric
} from "@mastra/evals/nlp";
import { 
  AnswerRelevancyMetric, 
  HallucinationMetric, 
  BiasMetric 
} from "@mastra/evals/llm";

const logger = createLogger({ name: "evals", level: "info" });
const tracer = getTracer();

// Utility function to create a Google model
function createGoogleModel(modelId = DEFAULT_MODELS.GOOGLE_STANDARD.modelId) {
  const config = { ...DEFAULT_MODELS.GOOGLE_STANDARD, modelId };
  return createModelFromConfig(config);
}

// Lazy load Langfuse
async function getLangfuse() {
  try {
    const { langfuse } = await import("../services/langfuse.js");
    return langfuse;
  } catch (error) {
    logger.warn("Failed to load Langfuse", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

// Utility: Token count (simple whitespace split)
export const tokenCountEvalTool = createTool({
  id: "token-count-eval",
  description: "Counts the number of tokens in a response.",
  inputSchema: z.object({
    response: z.string().describe("The agent's response to count tokens for."),
  }),
  execute: async ({ context }) => {
    const span = tracer?.startSpan?.("eval.tokenCount", { attributes: { evalType: "token-count" } });
    const startTime = performance.now();
    try {
      const langfuse = await getLangfuse();
      langfuse?.createTrace?.("eval.tokenCount", { metadata: { evalType: "token-count" } });
      
      const tokenCount = context.response.trim().split(/\s+/).length;
      
      span?.setAttribute("tokenCount", tokenCount);
      span?.setAttribute("latencyMs", performance.now() - startTime);
      span?.end();
      
      return { tokenCount, success: true };
    } catch (error) {
      span?.setAttribute("error", error instanceof Error ? error.message : String(error));
      span?.end();
      
      return { tokenCount: 0, success: false, error: error instanceof Error ? error.message : "Unknown error in token count eval" };
    }
  },
});

// Completeness Eval
export const completenessEvalTool = createTool({
  id: "completeness-eval",
  description: "Evaluates the completeness of an agent's response against a reference answer.",
  inputSchema: z.object({
    response: z.string().describe("The agent's response to evaluate."),
    reference: z.string().describe("The reference or expected answer."),
    context: z.record(z.any()).optional().describe("Additional context for evaluation."),
  }),
  execute: async ({ context }) => {
    const span = tracer?.startSpan?.("eval.completeness", { attributes: { evalType: "completeness" } });
    const startTime = performance.now();
    try {
      const langfuse = await getLangfuse();
      langfuse?.createTrace?.("eval.completeness", { metadata: { evalType: "completeness" } });
      
      const refTokens = context.reference.split(/\s+/);
      const respTokens = context.response.split(/\s+/);
      const matched = refTokens.filter(token => respTokens.includes(token));
      const score = refTokens.length > 0 ? matched.length / refTokens.length : 0;
      const explanation = `Matched ${matched.length} of ${refTokens.length} reference tokens.`;
      
      span?.setAttribute("score", score);
      span?.setAttribute("latencyMs", performance.now() - startTime);
      span?.end();
      
      return { score, explanation, success: true };
    } catch (error) {
      span?.setAttribute("error", error instanceof Error ? error.message : String(error));
      span?.end();
      
      return { score: 0, success: false, error: error instanceof Error ? error.message : "Unknown error in completeness eval" };
    }
  },
});

// Content Similarity Eval
export const contentSimilarityEvalTool = createTool({
  id: "content-similarity-eval",
  description: "Evaluates string similarity between response and reference.",
  inputSchema: z.object({
    response: z.string(),
    reference: z.string(),
    ignoreCase: z.boolean().optional().default(true),
    ignoreWhitespace: z.boolean().optional().default(true),
  }),
  execute: async ({ context }) => {
    const span = tracer?.startSpan?.("eval.contentSimilarity", { attributes: { evalType: "content-similarity" } });
    const startTime = performance.now();
    try {
      const langfuse = await getLangfuse();
      langfuse?.createTrace?.("eval.contentSimilarity", { metadata: { evalType: "content-similarity" } });
      
      // Use the imported @mastra/evals metric
      const metric = new ContentSimilarityMetric({
        ignoreCase: context.ignoreCase,
        ignoreWhitespace: context.ignoreWhitespace
      });
      const result = await metric.measure(context.reference, context.response);
      
      span?.setAttribute("score", result.score);
      span?.setAttribute("latencyMs", performance.now() - startTime);
      span?.end();
      
      return { 
        score: result.score, 
        explanation: `Similarity score: ${(result.score * 100).toFixed(1)}%`,
        success: true 
      };
    } catch (error) {
      span?.setAttribute("error", error instanceof Error ? error.message : String(error));
      span?.end();
      
      return { score: 0, success: false, error: error instanceof Error ? error.message : "Unknown error in content similarity eval" };
    }
  },
});

// Answer Relevancy Eval (using Google LLM)
export const answerRelevancyEvalTool = createTool({
  id: "answer-relevancy-eval",
  description: "Evaluates if the response addresses the query appropriately using Google LLM.",
  inputSchema: z.object({
    input: z.string().describe("The user query or prompt."),
    output: z.string().describe("The agent's response."),
    context: z.record(z.any()).optional(),
  }),
  execute: async ({ context }) => {
    const span = tracer?.startSpan?.("eval.answerRelevancy", { attributes: { evalType: "answer-relevancy" } });
    const startTime = performance.now();
    try {
      const langfuse = await getLangfuse();
      langfuse?.createTrace?.("eval.answerRelevancy", { metadata: { evalType: "answer-relevancy" } });
      
      // Use the imported @mastra/evals metric
      const model = createGoogleModel();
      const metric = new AnswerRelevancyMetric(model);
      const result = await metric.measure(context.input, context.output);
      
      span?.setAttribute("score", result.score);
      span?.setAttribute("latencyMs", performance.now() - startTime);
      span?.end();
      
      return { 
        score: result.score, 
        explanation: `Relevancy score: ${(result.score * 100).toFixed(1)}%`,
        success: true 
      };
    } catch (error) {
      span?.setAttribute("error", error instanceof Error ? error.message : String(error));
      span?.end();
      
      return { score: 0, success: false, error: error instanceof Error ? error.message : "Unknown error in answer relevancy eval" };
    }
  },
});

// Context Precision Eval with Google LLM
export const contextPrecisionEvalTool = createTool({
  id: "context-precision-eval",
  description: "Evaluates how precisely the response uses provided context using Google LLM.",
  inputSchema: z.object({
    response: z.string(),
    context: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const span = tracer?.startSpan?.("eval.contextPrecision", { attributes: { evalType: "context-precision" } });
    const startTime = performance.now();
    const modelId = DEFAULT_MODELS.GOOGLE_STANDARD.modelId;
    try {
      const langfuse = await getLangfuse();
      langfuse?.createTrace?.("eval.contextPrecision", { metadata: { evalType: "context-precision" } });
      
      const model = createGoogleModel(modelId);
      const prompt = `Given the following context items and agent response, rate how precisely the response uses the provided context on a scale from 0 (not precise) to 1 (fully precise). Provide a brief explanation.\n\nContext: ${JSON.stringify(context.context)}\nAgent Response: ${context.response}\n\nReturn only valid JSON: { \"score\": number (0-1), \"explanation\": string }`;
      const result = await generateText({
        model,
        messages: [
          { role: "user", content: prompt }
        ]
      });
      const latencyMs = performance.now() - startTime;
      let score = 0, explanation = "", tokens = result.usage?.totalTokens || 0;
      try {
        const parsed = JSON.parse(result.text);
        score = typeof parsed.score === "number" ? parsed.score : 0;
        explanation = parsed.explanation || "";
      } catch {
        // fallback: heuristic
        const matches = context.context.filter(ctx => context.response.includes(ctx));
        score = context.context.length > 0 ? matches.length / context.context.length : 0;
        explanation = `LLM parse failed. Heuristic: Matched ${matches.length} of ${context.context.length} context items.`;
      }
      
      span?.setAttribute("score", score);
      span?.setAttribute("latencyMs", latencyMs);
      span?.setAttribute("tokens", tokens);
      span?.end();
      
      return { score, explanation, latencyMs, model: modelId, tokens, success: true };
    } catch (error) {
      const latencyMs = performance.now() - startTime;
      span?.setAttribute("error", error instanceof Error ? error.message : String(error));
      span?.setAttribute("latencyMs", latencyMs);
      span?.end();
      
      return { score: 0, success: false, error: error instanceof Error ? error.message : "Unknown error in context precision eval", latencyMs, model: modelId };
    }
  },
});

// Context Position Eval with Google LLM
export const contextPositionEvalTool = createTool({
  id: "context-position-eval",
  description: "Evaluates how well the model uses ordered context (earlier positions weighted more) using Google LLM.",
  inputSchema: z.object({
    response: z.string(),
    context: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const span = tracer?.startSpan?.("eval.contextPosition", { attributes: { evalType: "context-position" } });
    const startTime = performance.now();
    const modelId = DEFAULT_MODELS.GOOGLE_STANDARD.modelId;
    try {
      const langfuse = await getLangfuse();
      langfuse?.createTrace?.("eval.contextPosition", { metadata: { evalType: "context-position" } });
      
      const model = createGoogleModel(modelId);
      const prompt = `Given the following ordered context items and agent response, rate how well the response uses the most important context items early in the response (earlier positions weighted more) on a scale from 0 (not well) to 1 (very well). Provide a brief explanation.\n\nContext: ${JSON.stringify(context.context)}\nAgent Response: ${context.response}\n\nReturn only valid JSON: { \"score\": number (0-1), \"explanation\": string }`;
      const result = await generateText({
        model,
        messages: [
          { role: "user", content: prompt }
        ]
      });
      const latencyMs = performance.now() - startTime;
      let score = 0, explanation = "", tokens = result.usage?.totalTokens || 0;
      try {
        const parsed = JSON.parse(result.text);
        score = typeof parsed.score === "number" ? parsed.score : 0;
        explanation = parsed.explanation || "";
      } catch {
        // fallback: heuristic
        let weightedSum = 0;
        let maxSum = 0;
        for (let i = 0; i < context.context.length; i++) {
          const weight = 1 / (i + 1);
          maxSum += weight;
          if (context.response.includes(context.context[i])) {
            weightedSum += weight;
          }
        }
        score = maxSum > 0 ? weightedSum / maxSum : 0;
        explanation = `LLM parse failed. Heuristic: Weighted sum: ${weightedSum.toFixed(2)} of ${maxSum.toFixed(2)}.`;
      }
      
      span?.setAttribute("score", score);
      span?.setAttribute("latencyMs", latencyMs);
      span?.setAttribute("tokens", tokens);
      span?.end();
      
      return { score, explanation, latencyMs, model: modelId, tokens, success: true };
    } catch (error) {
      const latencyMs = performance.now() - startTime;
      span?.setAttribute("error", error instanceof Error ? error.message : String(error));
      span?.setAttribute("latencyMs", latencyMs);
      span?.end();
      
      return { score: 0, success: false, error: error instanceof Error ? error.message : "Unknown error in context position eval", latencyMs, model: modelId };
    }
  },
});

// Tone Consistency Eval with Google LLM
export const toneConsistencyEvalTool = createTool({
  id: "tone-consistency-eval",
  description: "Analyzes sentiment/tone consistency within the response using Google LLM.",
  inputSchema: z.object({
    response: z.string(),
  }),
  execute: async ({ context }) => {
    const span = tracer?.startSpan?.("eval.toneConsistency", { attributes: { evalType: "tone-consistency" } });
    const startTime = performance.now();
    const modelId = DEFAULT_MODELS.GOOGLE_STANDARD.modelId;
    try {
      const langfuse = await getLangfuse();
      langfuse?.createTrace?.("eval.toneConsistency", { metadata: { evalType: "tone-consistency" } });
      
      const model = createGoogleModel(modelId);
      const prompt = `Analyze the following agent response for tone and sentiment consistency. Rate the consistency on a scale from 0 (inconsistent) to 1 (fully consistent). Provide a brief explanation.\n\nAgent Response: ${context.response}\n\nReturn only valid JSON: { \"score\": number (0-1), \"explanation\": string }`;
      const result = await generateText({
        model,
        messages: [
          { role: "user", content: prompt }
        ]
      });
      const latencyMs = performance.now() - startTime;
      let score = 0, explanation = "", tokens = result.usage?.totalTokens || 0;
      try {
        const parsed = JSON.parse(result.text);
        score = typeof parsed.score === "number" ? parsed.score : 0;
        explanation = parsed.explanation || "";
      } catch {
        // fallback: heuristic
        const sentences = context.response.split(/[.!?]/).filter(Boolean);
        const exclam = sentences.filter(s => s.trim().endsWith('!')).length;
        const period = sentences.filter(s => s.trim().endsWith('.')).length;
        const max = Math.max(exclam, period);
        score = sentences.length > 0 ? max / sentences.length : 1;
        explanation = `LLM parse failed. Heuristic: Most common ending: ${max} of ${sentences.length} sentences.`;
      }
      
      span?.setAttribute("score", score);
      span?.setAttribute("latencyMs", latencyMs);
      span?.setAttribute("tokens", tokens);
      span?.end();
      
      return { score, explanation, latencyMs, model: modelId, tokens, success: true };
    } catch (error) {
      const latencyMs = performance.now() - startTime;
      span?.setAttribute("error", error instanceof Error ? error.message : String(error));
      span?.setAttribute("latencyMs", latencyMs);
      span?.end();
      
      return { score: 0, success: false, error: error instanceof Error ? error.message : "Unknown error in tone consistency eval", latencyMs, model: modelId };
    }
  },
});

// Keyword Coverage Eval with Google LLM
export const keywordCoverageEvalTool = createTool({
  id: "keyword-coverage-eval",
  description: "Measures the ratio of required keywords present in the response using Google LLM.",
  inputSchema: z.object({
    response: z.string(),
    keywords: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const span = tracer?.startSpan?.("eval.keywordCoverage", { attributes: { evalType: "keyword-coverage" } });
    const startTime = performance.now();
    try {
      const langfuse = await getLangfuse();
      langfuse?.createTrace?.("eval.keywordCoverage", { metadata: { evalType: "keyword-coverage" } });
      
      // Use the imported @mastra/evals metric
      const metric = new KeywordCoverageMetric();
      const result = await metric.measure(context.keywords.join(" "), context.response);
      
      span?.setAttribute("score", result.score);
      span?.setAttribute("latencyMs", performance.now() - startTime);
      span?.end();
      
      return { 
        score: result.score, 
        explanation: `Keyword coverage: ${(result.score * 100).toFixed(1)}%`,
        success: true
      };
    } catch (error) {
      span?.setAttribute("error", error instanceof Error ? error.message : String(error));
      span?.setAttribute("latencyMs", performance.now() - startTime);
      span?.end();
      
      return { score: 0, success: false, error: error instanceof Error ? error.message : "Unknown error in keyword coverage eval" };
    }
  },
});

// Textual Difference Eval (Levenshtein distance normalized)
export const textualDifferenceEvalTool = createTool({
  id: "textual-difference-eval",
  description: "Measures the normalized Levenshtein distance between response and reference.",
  inputSchema: z.object({
    response: z.string(),
    reference: z.string(),
  }),
  execute: async ({ context }) => {
    const span = tracer?.startSpan?.("eval.textualDifference", { attributes: { evalType: "textual-difference" } });
    const startTime = performance.now();
    try {
      const langfuse = await getLangfuse();
      langfuse?.createTrace?.("eval.textualDifference", { metadata: { evalType: "textual-difference" } });
      
      function levenshtein(a: string, b: string): number {
        const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
        for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
        for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= a.length; i++) {
          for (let j = 1; j <= b.length; j++) {
            if (a[i - 1] === b[j - 1]) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + 1
              );
            }
          }
        }
        return matrix[a.length][b.length];
      }
      const dist = levenshtein(context.response, context.reference);
      const maxLen = Math.max(context.response.length, context.reference.length);
      const score = maxLen > 0 ? 1 - dist / maxLen : 1;
      
      span?.setAttribute("score", score);
      span?.setAttribute("latencyMs", performance.now() - startTime);
      span?.end();
      
      return { score, explanation: `Levenshtein distance: ${dist} of ${maxLen} chars.`, success: true };
    } catch (error) {
      span?.setAttribute("error", error instanceof Error ? error.message : String(error));
      span?.end();
      
      return { score: 0, success: false, error: error instanceof Error ? error.message : "Unknown error in textual difference eval" };
    }
  },
});

// Faithfulness Eval (heuristic)
export const faithfulnessEvalTool = createTool({
  id: "faithfulness-eval",
  description: "Heuristically measures if the response faithfully includes all reference facts.",
  inputSchema: z.object({
    response: z.string(),
    reference: z.string(),
  }),
  execute: async ({ context }) => {
    const span = tracer?.startSpan?.("eval.faithfulness", { attributes: { evalType: "faithfulness" } });
    const startTime = performance.now();
    try {
      const langfuse = await getLangfuse();
      langfuse?.createTrace?.("eval.faithfulness", { metadata: { evalType: "faithfulness" } });
      
      // Heuristic: count how many reference facts are present in the response
      // Split reference into sentences or facts (by . or ; or newline)
      const facts = context.reference.split(/[.;\n]/).map(f => f.trim()).filter(Boolean);
      const resp = context.response;
      let matched = 0;
      for (const fact of facts) {
        if (fact.length > 0 && resp.includes(fact)) matched++;
      }
      const score = facts.length > 0 ? matched / facts.length : 0;
      const explanation = `Matched ${matched} of ${facts.length} reference facts.`;
      
      span?.setAttribute("score", score);
      span?.setAttribute("latencyMs", performance.now() - startTime);
      span?.end();
      
      logger.info("Faithfulness eval result", { score, explanation, response: context.response });
      return { score, explanation, success: true };
    } catch (error) {
      span?.setAttribute("error", error instanceof Error ? error.message : String(error));
      span?.end();
      
      logger.error("Faithfulness eval error", { error });
      return { score: 0, success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});

// Bias Eval
export const biasEvalTool = createTool({
  id: "bias-eval",
  description: "Detects bias in a response (gender, political, racial, etc).",
  inputSchema: z.object({
    response: z.string().describe("The agent's response to check for bias."),
    context: z.string().optional().describe("Optional context for the response.")
  }),
  execute: async ({ context }) => {
    const span = tracer?.startSpan?.("eval.biasEval", { attributes: { evalType: "bias" } });
    try {
      const langfuse = await getLangfuse();
      langfuse?.createTrace?.("eval.biasEval", { metadata: { evalType: "bias" } });
      
      const model = createGoogleModel();
      const metric = new BiasMetric(model);
      
      // Provide both required arguments (context, response)
      const contextText = context.context || "";
      const result = await metric.measure(contextText, context.response);
      
      span?.setAttribute("score", result.score);
      span?.end();
      
      logger.info("Bias eval result", { score: result.score, response: context.response });
      return { 
        score: result.score, 
        explanation: `Bias score: ${(result.score * 100).toFixed(1)}%`,
        success: true 
      };
    } catch (error) {
      span?.setAttribute("error", error instanceof Error ? error.message : String(error));
      span?.end();
      
      logger.error("Bias eval error", { error });
      return { score: 0, success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});

// Toxicity Eval (heuristic)
export const toxicityEvalTool = createTool({
  id: "toxicity-eval",
  description: "Heuristically detects toxicity in a response (insults, hate, threats, etc).",
  inputSchema: z.object({
    response: z.string().describe("The agent's response to check for toxicity."),
  }),
  execute: async ({ context }) => {
    const span = tracer?.startSpan?.("eval.toxicityEval", { attributes: { evalType: "toxicity" } });
    try {
      const langfuse = await getLangfuse();
      langfuse?.createTrace?.("eval.toxicityEval", { metadata: { evalType: "toxicity" } });
      
      // Simple keyword-based heuristic for toxicity
      const toxicKeywords = [
        "idiot", "stupid", "hate", "kill", "racist", "sexist", "dumb", "moron", "shut up", "worthless", "trash", "die", "threat"
      ];
      const lower = context.response.toLowerCase();
      const found = toxicKeywords.filter(k => lower.includes(k));
      const score = found.length > 0 ? Math.min(1, found.length * 0.2) : 0;
      const explanation = found.length > 0 ? `Detected possible toxicity: ${found.join(", ")}` : "No obvious toxicity detected.";
      
      span?.setAttribute("score", score);
      span?.end();
      
      logger.info("Toxicity eval result", { score, explanation, response: context.response });
      return { score, explanation, success: true };
    } catch (error) {
      span?.setAttribute("error", error instanceof Error ? error.message : String(error));
      span?.end();
      
      logger.error("Toxicity eval error", { error });
      return { score: 0, success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});

// Hallucination Eval
export const hallucinationEvalTool = createTool({
  id: "hallucination-eval",
  description: "Detects hallucinations (unsupported claims) in a response.",
  inputSchema: z.object({
    response: z.string().describe("The agent's response to check for hallucination."),
    context: z.array(z.string()).optional().describe("Reference facts/context."),
  }),
  execute: async ({ context }) => {
    const span = tracer?.startSpan?.("eval.hallucinationEval", { attributes: { evalType: "hallucination" } });
    try {
      const langfuse = await getLangfuse();
      langfuse?.createTrace?.("eval.hallucinationEval", { metadata: { evalType: "hallucination" } });
      
      const model = createGoogleModel();
      // HallucinationMetric constructor requires model and options object
      const metric = new HallucinationMetric(model, { scale: 1.0, context: [] });
      
      // If no context provided, use empty string as reference
      const referenceText = context.context && context.context.length > 0 ? context.context.join("\n") : "";
      const responseText = context.response || "";
      
      // Make sure we explicitly provide both parameters
      const result = await metric.measure(referenceText, responseText);
      
      span?.setAttribute("score", result.score);
      span?.end();
      
      logger.info("Hallucination eval result", { score: result.score, response: context.response });
      return { 
        score: result.score, 
        explanation: `Hallucination detection score: ${(result.score * 100).toFixed(1)}%`,
        success: true 
      };
    } catch (error) {
      span?.setAttribute("error", error instanceof Error ? error.message : String(error));
      span?.end();
      
      logger.error("Hallucination eval error", { error });
      return { score: 0, success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});

// Summarization Eval (heuristic)
export const summarizationEvalTool = createTool({
  id: "summarization-eval",
  description: "Heuristically evaluates summary quality (coverage and brevity).",
  inputSchema: z.object({
    summary: z.string().describe("The summary to evaluate."),
    reference: z.string().describe("The original text to be summarized."),
  }),
  execute: async ({ context }) => {
    const span = tracer?.startSpan?.("eval.summarizationEval", { attributes: { evalType: "summarization" } });
    try {
      const langfuse = await getLangfuse();
      langfuse?.createTrace?.("eval.summarizationEval", { metadata: { evalType: "summarization" } });
      
      // Heuristic: coverage = # of reference keywords in summary / total keywords
      const refWords = context.reference.split(/\W+/).filter(w => w.length > 3);
      const sumWords = context.summary.split(/\W+/);
      const matched = refWords.filter(w => sumWords.includes(w));
      const coverage = refWords.length > 0 ? matched.length / refWords.length : 0;
      // Heuristic: brevity = 1 - (summary length / reference length)
      const brevity = 1 - Math.min(1, context.summary.length / (context.reference.length || 1));
      const score = Math.max(0, Math.min(1, (coverage * 0.7 + brevity * 0.3)));
      const explanation = `Coverage: ${(coverage * 100).toFixed(0)}%, Brevity: ${(brevity * 100).toFixed(0)}%`;
      
      span?.setAttribute("score", score);
      span?.end();
      
      logger.info("Summarization eval result", { score, explanation, summary: context.summary });
      return { score, explanation, success: true };
    } catch (error) {
      span?.setAttribute("error", error instanceof Error ? error.message : String(error));
      span?.end();
      
      logger.error("Summarization eval error", { error });
      return { score: 0, success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});