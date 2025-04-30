/**
 * Token Counting and Price Tracking Utility
 *
 * This module provides utility functions for logging token usage, model details,
 * and price tracking in Langfuse. It is designed to integrate seamlessly with
 * Google, OpenAI, Anthropic, and other LLM providers.
 */
import { z } from "zod";
import { getModelConfig } from "../agents/config/config.types";
import { createModelFromConfig } from "../agents/config/model.utils";
import { setupGoogleProvider } from "../agents/config/provider.utils";
import { LogLevel, createLogger } from "@mastra/core/logger";
import { KeywordCoverageMetric, ContentSimilarityMetric } from "@mastra/evals/nlp";
import { AnswerRelevancyMetric, BiasMetric, HallucinationMetric } from "@mastra/evals/llm";
import { getTracer } from "../services/tracing";

// LAZY LANGFUSE: dynamically imported within functions

// Configure logger and get tracer
const logger = createLogger({ name: "google-llm-wrapper", level: LogLevel.INFO });
const tracer = getTracer();

/**
 * Logs token usage, cost, latency, score, and any custom metrics for a model generation to Langfuse.
 * Supports usage_details, cost_details, latencyMs, score, tags, and arbitrary custom fields.
 */
export async function logModelUsage(
  traceId: string,
  model: string,
  provider: string,
  prompt: string,
  output: string,
  promptTokens: number,
  completionTokens: number,
  promptPricePerToken: number,
  completionPricePerToken: number,
  options?: {
    latencyMs?: number;
    totalTokens?: number;
    tags?: string[];
    userId?: string;
    sessionId?: string;
    promptTemplate?: string;
    promptVersion?: string;
    temperature?: number;
    topP?: number;
    evalScore?: number;
    evalComment?: string;
    [key: string]: unknown;
  }
): Promise<void> {
  const span = tracer?.startSpan ? tracer.startSpan('logModelUsage') : null;
  
  try {
  const price =
    promptTokens * promptPricePerToken +
    completionTokens * completionPricePerToken;
  const totalTokens = options?.totalTokens ?? (promptTokens + completionTokens);

    // Set span attributes
    span?.setAttribute?.('model', model);
    span?.setAttribute?.('provider', provider);
    span?.setAttribute?.('promptTokens', promptTokens);
    span?.setAttribute?.('completionTokens', completionTokens);
    span?.setAttribute?.('price', price);

  // Log the generation event to Langfuse
    const langfuse = (await import("../services/langfuse.js")).langfuse;
    langfuse?.logGeneration?.("model-generation", {
    traceId,
    input: prompt,
    output,
    promptTokens,
    completionTokens,
    model,
    provider,
    usage_details: {
      input: promptTokens,
      output: completionTokens,
      total: totalTokens,
    },
    cost_details: {
      input: promptTokens * promptPricePerToken,
      output: completionTokens * completionPricePerToken,
      total: price,
    },
    latencyMs: options?.latencyMs,
    score: options?.evalScore,
    evalScore: options?.evalScore,
    evalComment: options?.evalComment,
    promptTemplate: options?.promptTemplate,
    promptVersion: options?.promptVersion,
    temperature: options?.temperature,
    topP: options?.topP,
    userId: options?.userId,
    sessionId: options?.sessionId,
    tags: options?.tags,
    metadata: {
      price,
      totalTokens,
      ...options,
    },
  });

    // Create trace span for the logging operation
    langfuse?.createSpan?.('logModelUsage', {
      traceId: span?.spanContext()?.traceId || traceId,
      metadata: { 
        model, 
        provider, 
        promptTokens, 
        completionTokens, 
        totalTokens,
        price,
        evalScore: options?.evalScore,
        spanId: span?.spanContext()?.spanId
      },
      tags: ['log', 'model-usage', ...(options?.tags || [])],
  });

  // Optionally, log evaluation score
  if (options?.evalScore !== undefined) {
      langfuse?.createScore?.({
      name: "generation-quality",
      value: options.evalScore,
      traceId,
      model,
      provider,
      score: options?.score as number | undefined,
      latencyMs: options?.latencyMs as number | undefined,
      cost: options?.cost as number | undefined,
      evalComment: options?.evalComment,
      promptTemplate: options?.promptTemplate,
      promptVersion: options?.promptVersion,
      temperature: options?.temperature,
      topP: options?.topP,
      userId: options?.userId,
      sessionId: options?.sessionId,
      tags: ["eval", "generation", ...(options?.tags || [])],
      metadata: {
        ...options,
        model,
        provider,
      },
    });
  }

    span?.end?.();
  } catch (error) {
    logger.error(`Error logging model usage: ${error instanceof Error ? error.message : String(error)}`);
    
    // Log error to Langfuse
    (await import("../services/langfuse.js")).langfuse?.createSpan?.('logModelUsage.error', {
      traceId: span?.spanContext()?.traceId || traceId,
      metadata: { 
        model, 
        provider, 
        error: error instanceof Error ? error.message : String(error),
        spanId: span?.spanContext()?.spanId
      },
      tags: ['error', 'log', 'model-usage'],
    });
    
    // Record exception in span
    if (span?.recordException) span.recordException(error);
    if (span?.setStatus) span.setStatus({ code: 2, message: String(error) });
    span?.end?.();
  }
}

/**
 * Evaluates a Google model response using a variety of metrics from @mastra/evals
 * 
 * @param prompt The prompt/question sent to the model
 * @param expectedOutput The expected ideal response (optional)
 * @param actualOutput The actual model output to evaluate
 * @param modelConfig The model configuration (optional)
 * @returns Results of different evaluation metrics
 */
export async function evaluateGoogleOutput(
  prompt: string,
  actualOutput: string,
  expectedOutput?: string,
  modelConfig = getModelConfig("GOOGLE_STANDARD")
): Promise<{
  keywordCoverage: number;
  contentSimilarity?: number;
  answerRelevancy?: number;
  bias?: number;
  hallucination?: number;
  overallScore: number;
}> {
  const span = tracer?.startSpan ? tracer.startSpan('evaluateGoogleOutput') : null;
  
  try {
    // Start timing
    const startTime = Date.now();
    
    span?.setAttribute?.('prompt_length', prompt.length);
    span?.setAttribute?.('output_length', actualOutput.length);
    if (expectedOutput) span?.setAttribute?.('expected_output_length', expectedOutput.length);
    
    logger.info(`Starting evaluation of Google model output for prompt: ${prompt.substring(0, 30)}...`);
    
    // Create instances of various metrics
    const keywordMetric = new KeywordCoverageMetric();
    
    // Track promises for parallel execution
    const metricPromises: Promise<unknown>[] = [];
    const metricResults: Record<string, number> = {};
    
    // Always run keyword coverage (doesn't need a model)
    metricPromises.push(
      keywordMetric.measure(prompt, actualOutput).then((result: { score: number }) => {
        metricResults.keywordCoverage = result.score;
        span?.setAttribute?.('keywordCoverage', result.score);
      })
    );
    
    // If we have an expected output, run content similarity
    if (expectedOutput) {
      const similarityMetric = new ContentSimilarityMetric({
        ignoreCase: true,
        ignoreWhitespace: true
      });
      
      metricPromises.push(
        similarityMetric.measure(expectedOutput, actualOutput).then((result: { score: number }) => {
          metricResults.contentSimilarity = result.score;
          span?.setAttribute?.('contentSimilarity', result.score);
        })
      );
    }
    
    // Create model instance for LLM-based metrics
    const googleModel = createModelFromConfig(modelConfig);
    
    // Run answer relevancy evaluation
    const relevancyMetric = new AnswerRelevancyMetric(googleModel);
    metricPromises.push(
      relevancyMetric.measure(prompt, actualOutput).then((result: { score: number }) => {
        metricResults.answerRelevancy = result.score;
        span?.setAttribute?.('answerRelevancy', result.score);
      }).catch((err: Error) => {
        logger.error(`Error evaluating answer relevancy: ${err.message}`);
        span?.setAttribute?.('answerRelevancyError', err.message);
      })
    );
    
    // Run bias evaluation
    const biasMetric = new BiasMetric(googleModel);
    metricPromises.push(
      biasMetric.measure(prompt, actualOutput).then((result: { score: number }) => {
        metricResults.bias = 1 - result.score; // Invert so higher is better
        span?.setAttribute?.('bias', metricResults.bias);
      }).catch(err => {
        logger.error(`Error evaluating bias: ${err.message}`);
        span?.setAttribute?.('biasError', err.message);
      })
    );
    
    // Run hallucination evaluation if we have expected output
    if (expectedOutput) {
      const hallucinationMetric = new HallucinationMetric(googleModel, {
        context: [expectedOutput]
      });
      
      metricPromises.push(
        hallucinationMetric.measure(prompt, actualOutput).then((result: { score: number }) => {
          metricResults.hallucination = 1 - result.score; // Invert so higher is better
          span?.setAttribute?.('hallucination', metricResults.hallucination);
        }).catch((err: Error) => {
          logger.error(`Error evaluating hallucination: ${err.message}`);
          span?.setAttribute?.('hallucinationError', err.message);
        })
      );
    }
    
    // Wait for all metrics to complete
    await Promise.all(metricPromises);
    
    // Calculate overall score (average of available metrics)
    const scores = Object.values(metricResults).filter(score => score !== undefined);
    const overallScore = scores.length > 0 ? 
      scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    
    span?.setAttribute?.('overallScore', overallScore);
    
    // Build final result
    const result = {
      ...metricResults,
      overallScore
    } as {
      keywordCoverage: number;
      contentSimilarity?: number;
      answerRelevancy?: number;
      bias?: number;
      hallucination?: number;
      overallScore: number;
    };
    
    // Log execution time
    const latencyMs = Date.now() - startTime;
    span?.setAttribute?.('latencyMs', latencyMs);
    
    logger.info(`Evaluation completed in ${latencyMs}ms with overall score: ${overallScore.toFixed(2)}`);
    
    // Create evaluation span in Langfuse
    (await import("../services/langfuse.js")).langfuse?.createSpan?.('evaluateGoogleOutput', {
      traceId: span?.spanContext()?.traceId || `eval-${Date.now()}`,
      metadata: { 
        prompt: prompt.substring(0, 100),
        metrics: metricResults,
        overallScore,
        latencyMs,
        modelConfig: {
          id: modelConfig.modelId,
          provider: "google",
          temperature: modelConfig.temperature,
        },
        spanId: span?.spanContext()?.spanId
      },
      tags: ['evaluation', 'google', 'metrics'],
    });
    
    span?.end?.();
    return result;
    
  } catch (error) {
    logger.error(`Evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    
    // Log error to Langfuse
    (await import("../services/langfuse.js")).langfuse?.createSpan?.('evaluateGoogleOutput.error', {
      traceId: span?.spanContext()?.traceId || `eval-${Date.now()}`,
      metadata: { 
        prompt: prompt.substring(0, 100),
        error: error instanceof Error ? error.message : String(error),
        spanId: span?.spanContext()?.spanId
      },
      tags: ['error', 'evaluation', 'google'],
    });
    
    // Record exception in span
    if (span?.recordException) span.recordException(error);
    if (span?.setStatus) span.setStatus({ code: 2, message: String(error) });
    span?.end?.();
    
    // Return basic result with just keyword coverage if other metrics fail
    return {
      keywordCoverage: 0,
      overallScore: 0
    };
  }
}

/**
 * Example usage of the logModelUsage function with a Google model.
 *
 * @param prompt - The input prompt to send to the model.
 */
export async function runGoogleModel(prompt: string): Promise<void> {
  const span = tracer?.startSpan ? tracer.startSpan('runGoogleModel') : null;
  
  try {
    // Validate input
    const InputSchema = z.object({
      prompt: z.string().min(1, "Prompt must not be empty"),
    });
    
    // Validate input
    InputSchema.parse({ prompt });
    
    span?.setAttribute?.('prompt_length', prompt.length);
    
    // Configure Google provider
    const providerConfig = setupGoogleProvider();
    
  // Use the default Google model config and create the model instance
  const modelConfig = getModelConfig("GOOGLE_STANDARD");
    span?.setAttribute?.('model', modelConfig.modelId);
    
  const googleModel = createModelFromConfig(modelConfig);

    // Start timing
  const start = Date.now();
  const response = await googleModel.generate({ prompt });
  const latencyMs = Date.now() - start;
    span?.setAttribute?.('latencyMs', latencyMs);
    span?.setAttribute?.('response_length', response.text.length);

  // Example prices per token (replace with actual pricing if needed)
  const promptPrice = 0.00001;
  const completionPrice = 0.00002;

    // Generate a trace ID
    const traceId = span?.spanContext()?.traceId || `google-${Date.now()}`;
    
    // Evaluate the response (no expected output)
    const evalResults = await evaluateGoogleOutput(prompt, response.text);
    span?.setAttribute?.('evalScore', evalResults.overallScore);

    // Log the model usage with evaluation results
  await logModelUsage(
      traceId,
    response.model ?? modelConfig.modelId,
    "google",
    prompt,
    response.text,
    response.usage?.promptTokens ?? 0,
    response.usage?.completionTokens ?? 0,
    promptPrice,
    completionPrice,
    {
      latencyMs,
      totalTokens: (response.usage?.promptTokens ?? 0) + (response.usage?.completionTokens ?? 0),
        tags: ["gemini", "experiment-1"],
      userId: "user-123",
      sessionId: "session-abc",
      promptTemplate: "default",
      promptVersion: "v1",
      temperature: modelConfig.temperature,
      topP: modelConfig.topP,
        evalScore: evalResults.overallScore,
        evalComment: `Evaluated with multiple metrics: Keyword Coverage=${evalResults.keywordCoverage.toFixed(2)}, Answer Relevancy=${evalResults.answerRelevancy?.toFixed(2) || 'N/A'}`,
        evalDetails: evalResults,
        providerConfig: providerConfig,
      }
    );
    
    // Create generation span in Langfuse
    (await import("../services/langfuse.js")).langfuse?.createSpan?.('googleModelGenerate', {
      traceId,
      metadata: { 
        prompt: prompt.substring(0, 100),
        response: response.text.substring(0, 100),
        modelConfig: {
          id: modelConfig.modelId,
          provider: "google",
          temperature: modelConfig.temperature,
        },
        latencyMs,
        evalScore: evalResults.overallScore,
        spanId: span?.spanContext()?.spanId
      },
      tags: ['generate', 'google'],
    });
    
    logger.info(`Google model call completed with score: ${evalResults.overallScore.toFixed(2)}`);
    span?.end?.();
  } catch (error) {
    logger.error(`Error running Google model: ${error instanceof Error ? error.message : String(error)}`);
    
    // Log error to Langfuse
    (await import("../services/langfuse.js")).langfuse?.createSpan?.('runGoogleModel.error', {
      traceId: span?.spanContext()?.traceId || `google-${Date.now()}`,
      metadata: { 
        prompt: prompt.substring(0, 100),
        error: error instanceof Error ? error.message : String(error),
        spanId: span?.spanContext()?.spanId
      },
      tags: ['error', 'generate', 'google'],
    });
    
    // Record exception in span
    if (span?.recordException) span.recordException(error);
    if (span?.setStatus) span.setStatus({ code: 2, message: String(error) });
    span?.end?.();
    
    throw error;
  }
}

/**
 * Run evaluation on Google model with an expected output
 */
export async function runGoogleEvalWithExpected(
  prompt: string,
  expectedOutput: string
): Promise<{
  keywordCoverage: number;
  contentSimilarity?: number;
  answerRelevancy?: number;
  bias?: number;
  hallucination?: number;
  overallScore: number;
}> {
  const span = tracer?.startSpan ? tracer.startSpan('runGoogleEvalWithExpected') : null;
  
  try {
    // Use the default Google model config and create the model instance
    const modelConfig = getModelConfig("GOOGLE_STANDARD");
    const googleModel = createModelFromConfig(modelConfig);

    span?.setAttribute?.('prompt_length', prompt.length);
    span?.setAttribute?.('expected_output_length', expectedOutput.length);
    span?.setAttribute?.('model', modelConfig.modelId);

    // Start timing
    const start = Date.now();
    
    // Run the model
    const response = await googleModel.generate({ prompt });
    
    // Calculate latency
    const latencyMs = Date.now() - start;
    span?.setAttribute?.('latencyMs', latencyMs);
    span?.setAttribute?.('response_length', response.text.length);
    
    // Generate a trace ID
    const traceId = span?.spanContext()?.traceId || `eval-${Date.now()}`;
    
    // Run the evaluation with expected output
    const evalResults = await evaluateGoogleOutput(
      prompt, 
      response.text, 
      expectedOutput, 
      modelConfig
    );
    
    span?.setAttribute?.('evalScore', evalResults.overallScore);
    
    // Log to Langfuse
    await logModelUsage(
      traceId,
      response.model ?? modelConfig.modelId,
      "google",
      prompt,
      response.text,
      response.usage?.promptTokens ?? 0,
      response.usage?.completionTokens ?? 0,
      0.00001, // Example price per token
      0.00002, // Example price per token
      {
        latencyMs,
        evalScore: evalResults.overallScore,
        evalComment: "Multi-metric evaluation",
        evalDetails: evalResults,
        tags: ["eval", "automated", "google-model"],
      }
    );
    
    // Create detailed score record in Langfuse
    (await import("../services/langfuse.js")).langfuse?.createScore({
      name: "multi-metric-eval",
      value: evalResults.overallScore,
      traceId,
      comments: `Comprehensive evaluation using multiple metrics`,
      tags: ["eval", "automated", "google"],
      metadata: evalResults
    });
    
    // Create evaluation span in Langfuse
    (await import("../services/langfuse.js")).langfuse?.createSpan?.('runGoogleEvalWithExpected', {
      traceId,
      metadata: { 
        prompt: prompt.substring(0, 100),
        response: response.text.substring(0, 100),
        expected: expectedOutput.substring(0, 100),
        overallScore: evalResults.overallScore,
        metrics: Object.entries(evalResults)
          .filter(([key]) => key !== 'overallScore')
          .map(([key, value]) => ({ name: key, score: value })),
        spanId: span?.spanContext()?.spanId
      },
      tags: ['eval', 'google', 'expected-output'],
    });
    
    span?.end?.();
    return evalResults;
  } catch (error) {
    logger.error(`Error running evaluation with expected output: ${error instanceof Error ? error.message : String(error)}`);
    
    // Log error to Langfuse
    (await import("../services/langfuse.js")).langfuse?.createSpan?.('runGoogleEvalWithExpected.error', {
      traceId: span?.spanContext()?.traceId || `eval-${Date.now()}`,
      metadata: { 
        prompt: prompt.substring(0, 100),
        expected: expectedOutput.substring(0, 100),
        error: error instanceof Error ? error.message : String(error),
        spanId: span?.spanContext()?.spanId
      },
      tags: ['error', 'eval', 'google'],
    });
    
    // Record exception in span
    if (span?.recordException) span.recordException(error);
    if (span?.setStatus) span.setStatus({ code: 2, message: String(error) });
    span?.end?.();
    
    throw error;
  }
}

/**
 * Example of running an evaluation with expected output
 */
export async function runExampleGoogleEval(): Promise<void> {
  const prompt = "Summarize this text in 3-4 sentences: " + 
                "The meeting discussed quarterly results, with revenue up 12% year-over-year " +
                "despite supply chain challenges. Marketing presented a new campaign starting " +
                "next month targeting Gen Z customers. IT reported the security update was complete " +
                "with no issues. HR announced two new hires in engineering. The meeting concluded " +
                "with a reminder about the company picnic next Saturday.";
                
  const expectedOutput = "Quarterly results showed revenue up 12% year-over-year despite supply chain issues. " +
                        "Marketing is launching a new Gen Z campaign next month. IT completed a security update " +
                        "without issues and HR announced two new engineering hires. There will be a company picnic " +
                        "next Saturday.";

  try {
    const evalResult = await runGoogleEvalWithExpected(prompt, expectedOutput);
    
    console.log("Evaluation results:", evalResult);
    console.log(`Overall score: ${evalResult.overallScore.toFixed(4)}`);
    console.log("Individual metrics:");
    
    for (const [metric, score] of Object.entries(evalResult as Record<string, number>)) {
      if (metric !== 'overallScore') {
        console.log(`- ${metric}: ${typeof score === 'number' ? score.toFixed(4) : 'N/A'}`);
      }
    }
  } catch (error) {
    console.error("Error running evaluation:", error);
  }
}