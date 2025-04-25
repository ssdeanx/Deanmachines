/**
 * ElevenLabs Voice implementation for Mastra
 *
 * This module provides high-quality text-to-speech capabilities
 * using the ElevenLabs API with the Mastra voice interface.
 */

import { MastraVoice } from "@mastra/core/voice";
import { ElevenLabsVoice } from "@mastra/voice-elevenlabs";

/**
 * Interface for ElevenLabs voice configuration options
 */
/**
 * Configuration options for ElevenLabs TTS provider.
 * See: https://elevenlabs.io/docs/product/introduction
 */
export interface ElevenLabsConfig {
  /** API key for ElevenLabs services */
  apiKey?: string;
  /** Default speaker/voice ID */
  speaker?: string;
  /** Model name to use for speech synthesis (e.g., 'eleven_monolingual_v1', 'eleven_multilingual_v2') */
  modelName?: string;
  /** Voice stability (0.0 - 1.0, optional) */
  stability?: number;
  /** Voice similarity boost (0.0 - 1.0, optional) */
  similarityBoost?: number;
  /** Voice style (optional, e.g., 'newscaster', 'conversational') */
  style?: string;
  /** Output audio format (optional, e.g., 'mp3', 'wav', 'pcm') */
  outputFormat?: string;
  /** Any other ElevenLabs API options */
  [key: string]: unknown;
}

/**
 * Create an ElevenLabs voice provider with the specified configuration
 *
 * @param config - Configuration options for the ElevenLabs voice provider
 * @returns Configured ElevenLabs voice provider instance
 * @throws Error if required environment variables are missing
 */
/**
 * Create an ElevenLabs voice provider with the specified configuration.
 *
 * @param config - Configuration options for the ElevenLabs voice provider
 * @returns Configured ElevenLabs voice provider instance
 * @throws Error if required environment variables are missing
 * @see https://elevenlabs.io/docs/product/introduction
 */
export function createElevenLabsVoice(
  config: ElevenLabsConfig = {}
): MastraVoice {
  const apiKey = config.apiKey || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ElevenLabs API key is required. Set ELEVENLABS_API_KEY environment variable or pass apiKey in config."
    );
  }
  const voiceName = config.speaker || "9BWtsMINqrJLrRacOk9x";
  // Prepare extra options supported by ElevenLabsVoice
  const {
    modelName,
    stability,
    similarityBoost,
    style,
    outputFormat,
    ...rest
  } = config;
  return new ElevenLabsVoice({
    speechModel: {
      apiKey,
      ...(modelName ? { modelName } : {}),
    },
    speaker: voiceName,
    ...(stability !== undefined ? { stability } : {}),
    ...(similarityBoost !== undefined ? { similarityBoost } : {}),
    ...(style !== undefined ? { style } : {}),
    ...(outputFormat !== undefined ? { outputFormat } : {}),
    ...rest,
  });
}

