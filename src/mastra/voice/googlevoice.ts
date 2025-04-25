/**
 * Rich Google Voice implementation for Mastra
 *
 * This module provides text-to-speech and speech-to-text capabilities
 * using Google Cloud services with the Mastra voice interface.
 */

import { CompositeVoice, MastraVoice } from "@mastra/core/voice";
import { GoogleVoice } from "@mastra/voice-google";
import { allToolsMap } from "../tools";

/**
 * Interface for Google voice configuration options
 */
/**
 * Configuration options for Google TTS/STT provider.
 * See: https://cloud.google.com/text-to-speech/docs/reference/rest/v1/TextToSpeech
 */
export interface GoogleVoiceConfig {
  /** Google Cloud API key or path to credentials JSON */
  apiKey?: string;
  /** Default voice name for TTS (e.g. "en-US-Wavenet-D") */
  speaker?: string;
  /** Model name for TTS (e.g., 'default', 'en-US-Wavenet-D') */
  ttsModel?: string;
  /** Model name for STT */
  sttModel?: string;
  /** Speaking pitch (-20.0 to 20.0, default 0.0) */
  pitch?: number;
  /** Speaking rate (0.25 to 4.0, default 1.0) */
  speakingRate?: number;
  /** Effects profile (e.g., 'telephony-class-application') */
  effectsProfileId?: string[];
  /** Language code (e.g., 'en-US') */
  languageCode?: string;
  /** Custom instructions for the voice agent */
  instructions?: string;
  /** Enable logging of voice events */
  logEvents?: (event: string, data?: any) => void;
  /** Any other Google TTS/STT API options */
  [key: string]: unknown;
}

/**
 * Create a Google voice provider with the specified configuration
 *
 * @param config - Configuration options for the Google voice provider
 * @returns Configured Google voice provider instance
 * @throws Error if required environment variables are missing
 */
/**
 * Create a Google voice provider with the specified configuration.
 *
 * @param config - Configuration options for the Google voice provider
 * @returns Configured Google voice provider instance
 * @throws Error if required environment variables are missing
 * @see https://cloud.google.com/text-to-speech/docs/reference/rest/v1/TextToSpeech
 * @example
 * ```ts
 * const voice = createGoogleVoice({
 *   apiKey: '...',
 *   speaker: 'en-US-Wavenet-D',
 *   pitch: 2.0,
 *   speakingRate: 1.2,
 *   effectsProfileId: ['telephony-class-application'],
 *   languageCode: 'en-US',
 *   instructions: 'You are a helpful assistant.'
 * });
 * ```
 */
export function createGoogleVoice({
  apiKey,
  speaker = "en-US-Wavenet-D",
  ttsModel = "default",
  sttModel = "default",
  pitch,
  speakingRate,
  effectsProfileId,
  languageCode,
  instructions,
  logEvents,
  ...rest
}: GoogleVoiceConfig = {}): MastraVoice {
  const key = apiKey || process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error(
      "GoogleVoice requires an API key—set GOOGLE_API_KEY or pass apiKey"
    );
  }

  const speechModel = {
    apiKey: key,
    model: ttsModel,
    ...(pitch !== undefined ? { pitch } : {}),
    ...(speakingRate !== undefined ? { speakingRate } : {}),
    ...(effectsProfileId ? { effectsProfileId } : {}),
    ...(languageCode ? { languageCode } : {}),
    ...rest,
  };
  const listeningModel = {
    apiKey: key,
    model: sttModel,
    ...(languageCode ? { languageCode } : {}),
    ...rest,
  };

  // instantiate low‑level GoogleVoice (only known props)
  const provider = new GoogleVoice({ speechModel, listeningModel, speaker });

  // composite gives you .speak(), .listen(), .getSpeakers(), .send(), .answer(), .on(), .off(), .close()
  const voice = new CompositeVoice({ speakProvider: provider, listenProvider: provider });

  // inject all of your Agent tools into the voice context
  voice.addTools(Object.fromEntries(allToolsMap.entries()));

  // add custom or default instructions
  voice.addInstructions(
    instructions ||
      "You are the DeanMachines AI assistant. Respond vocally and use your tools to help."
  );

  // logging hook for observability
  if (typeof logEvents === "function") {
    voice.on("event", (data) => logEvents("event", data));
  }

  return voice;
}

