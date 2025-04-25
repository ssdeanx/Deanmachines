/**
 * Voice module for Mastra
 *
 * This module provides voice capabilities for Mastra agents,
 * including text-to-speech, speech-to-text, and speech-to-speech
 * functionalities using different provider implementations.
 */

import { MastraVoice } from "@mastra/core/voice";
import { createGoogleVoice, GoogleVoiceConfig } from "./googlevoice";
import { createElevenLabsVoice } from "./elevenlabs";

/**
 * Available voice provider types
 */
export enum VoiceProvider {
  GOOGLE     = "google",
  ELEVENLABS = "elevenlabs",
  OPENAI     = "openai",
}

/**
 * Configuration for voice providers
 */
export interface VoiceConfig {
  /** Provider type to use */
  provider: VoiceProvider;
  /** API key for the voice service */
  apiKey?: string;
  /** Default speaker ID */
  speaker?: string;
  /** Provider-specific options */
  options?: Partial<GoogleVoiceConfig>;
}

/**
 * Create a voice provider based on the specified configuration
 *
 * @param cfg - Voice provider configuration
 * @returns Configured voice provider instance
 * @throws Error if the specified provider is not supported
 */
export function createVoice(cfg: VoiceConfig): MastraVoice {
  switch (cfg.provider) {
    case VoiceProvider.GOOGLE:
      return createGoogleVoice({
        apiKey:  cfg.apiKey,
        speaker: cfg.speaker,
        ...(cfg.options ?? {}),
      });
    case VoiceProvider.ELEVENLABS:
      return createElevenLabsVoice({
        apiKey: cfg.apiKey,
        speaker: cfg.speaker,
        ...(cfg.options ?? {}),
      });
    default:
      throw new Error(`Unsupported voice provider: ${cfg.provider}`);
  }
}

/**
 * Helper to get a Google voice provider with default settings
 *
 * @returns Google voice provider instance
 */
export function getGoogleVoice(): MastraVoice {
  return createGoogleVoice();
}

/**
 * Helper to get an ElevenLabs voice provider with default settings
 *
 * @returns ElevenLabs voice provider instance
 */
export function getElevenLabsVoice(): MastraVoice {
  return createElevenLabsVoice();
}

// Re-export the low-level factories & types
export { createGoogleVoice } from "./googlevoice";
export type { GoogleVoiceConfig } from "./googlevoice";
export { createElevenLabsVoice } from "./elevenlabs";
export type { MastraVoice };

