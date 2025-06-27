import { Agent } from '@mastra/core/agent';
import { createGemini25Provider } from '../config/googleProvider';
import { weatherTool } from '../tools/weather-tool';
import { chunkerTool } from "../tools/chunker-tool";
import { upstashMemory } from '../upstashMemory';
import { mcpTools } from '../tools/mcp';
import { vectorQueryTool, hybridVectorSearchTool } from "../tools/vectorQueryTool";
import { graphRAGTool, graphRAGUpsertTool } from "../tools/graphRAG";
import { PinoLogger } from "@mastra/loggers";

const logger = new PinoLogger({ name: 'weatherAgent', level: 'info' });
logger.info('Initializing weatherAgent');

/**
 * Runtime context type for the Weather Agent
 * Stores weather-specific preferences and location context
 *
 * @mastra WeatherAgent runtime context interface
 * [EDIT: 2025-06-14] [BY: GitHub Copilot]
 */
export type WeatherAgentRuntimeContext = {
  /** Unique identifier for the user */
  "user-id": string;
  /** Unique identifier for the session */
  "session-id": string;
  /** Temperature unit preference */
  "temperature-unit": "celsius" | "fahrenheit";
  /** Default location for weather queries */
  "default-location": string;
  /** Include extended forecast */
  "extended-forecast": boolean;
  /** Include weather alerts */
  "include-alerts": boolean;
  /** Timezone preference */
  "timezone": string;
};

export const weatherAgent = new Agent({
  name: 'Weather Agent',
  instructions: async ({ runtimeContext }) => {
    const userId = runtimeContext?.get("user-id") || "anonymous";
    const sessionId = runtimeContext?.get("session-id") || "default";
    const temperatureUnit = runtimeContext?.get("temperature-unit") || "celsius";
    const defaultLocation = runtimeContext?.get("default-location") || "";
    const extendedForecast = runtimeContext?.get("extended-forecast") || false;
    const includeAlerts = runtimeContext?.get("include-alerts") || true;
    const timezone = runtimeContext?.get("timezone") || "UTC";

    return `You are a helpful weather assistant that provides accurate weather information.
You have a strong understanding of weather patterns, forecasting, and weather systems.
You are proficient in retrieving current weather conditions, forecasts, and alerts for various locations.
You are familiar with different weather data sources and can adapt to various user preferences.

CURRENT SESSION:
- User: ${userId}
- Session: ${sessionId}
- Temperature Unit: ${temperatureUnit}
${defaultLocation ? `- Default Location: ${defaultLocation}` : ""}
- Extended Forecast: ${extendedForecast ? "Enabled" : "Disabled"}
- Weather Alerts: ${includeAlerts ? "Enabled" : "Disabled"}
- Timezone: ${timezone}

Your primary function is to help users get weather details for specific locations. When responding:
- Always ask for a location if none is provided (unless default location is set)
- Use ${temperatureUnit} for temperature readings
- If the location name isn't in English, please translate it
- If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
- Include relevant details like humidity, wind conditions, and precipitation
${extendedForecast ? "- Provide extended forecast information when requested" : ""}
${includeAlerts ? "- Include weather alerts and warnings when available" : ""}
- Keep responses concise but informative
- Format times according to the ${timezone} timezone

Use the weatherTool to fetch current weather data.`;
  },
  model: createGemini25Provider('gemini-2.5-flash-lite-preview-06-17', {
        thinkingConfig: {
          thinkingBudget: 0,
          includeThoughts: false,
        },
      }),
  tools: { 
    weatherTool,
    chunkerTool,
    vectorQueryTool,
    hybridVectorSearchTool,
    graphRAGTool,
    graphRAGUpsertTool,
    ...mcpTools.filesystem,
    ...mcpTools.fetch,
    ...mcpTools.tavily
  },
  memory: upstashMemory,
});
