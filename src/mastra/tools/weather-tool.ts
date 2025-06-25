import { createTool, ToolExecutionContext} from '@mastra/core/tools';
import { RuntimeContext } from '@mastra/core/di';

import { z } from 'zod';
import { PinoLogger } from '@mastra/loggers';

const logger = new PinoLogger({ name: 'WeatherTool', level: 'info' });

/**
 * Runtime context type for weather tool configuration
 */
export type WeatherRuntimeContext = {
  'temperature-scale': 'celsius' | 'fahrenheit';
  'user-id'?: string;
  'session-id'?: string;
  'language'?: string;
  'location-preference'?: string;
  'debug'?: boolean;
};

interface GeocodingResponse {
  results: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}

interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
  };
}

const inputSchema = z.object({
  location: z.string().describe('City name or coordinates'),
}).strict();

const outputSchema = z.object({
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
  windGust: z.number(),
  conditions: z.string(),
  location: z.string(),
  temperatureScale: z.string(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
}).strict();

export const weatherTool = createTool({
  id: 'get-weather',
  description: 'Get current weather for a location with temperature scale preference',
  inputSchema,
  outputSchema,
  execute: async ({ input, runtimeContext }: ToolExecutionContext<typeof inputSchema> & { 
    input: z.infer<typeof inputSchema>;
    runtimeContext?: RuntimeContext<WeatherRuntimeContext>;
  }): Promise<z.infer<typeof outputSchema>> => {
    // Get runtime context values with defaults
    const temperatureScale = runtimeContext?.get('temperature-scale') || 'celsius';
    const userId = runtimeContext?.get('user-id') || undefined;
    const sessionId = runtimeContext?.get('session-id') || undefined;
    const debug = runtimeContext?.get('debug') || false;

    if (debug) {
      logger.info('Weather tool executed with runtime context', {
        temperatureScale,
        userId,
        sessionId,
        location: input.location
      });
    }

    const weatherData = await getWeather(input.location);
    
    // Convert temperature if needed
    const convertedData = temperatureScale === 'fahrenheit' ? {
      ...weatherData,
      temperature: (weatherData.temperature * 9/5) + 32,
      feelsLike: (weatherData.feelsLike * 9/5) + 32
    } : weatherData;
    
    return outputSchema.parse({
      ...convertedData,
      temperatureScale,
      userId,
      sessionId
    });
  },
});

/**
 * Runtime context instance for weather tool with defaults
 */
export const weatherRuntimeContext = new RuntimeContext<WeatherRuntimeContext>();
weatherRuntimeContext.set('temperature-scale', 'celsius');
weatherRuntimeContext.set('debug', false);

const getWeather = async (location: string) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }

  const { latitude, longitude, name } = geocodingData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;

  const response = await fetch(weatherUrl);
  const data = (await response.json()) as WeatherResponse;

  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name,
  };
};

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return conditions[code] || 'Unknown';
}
