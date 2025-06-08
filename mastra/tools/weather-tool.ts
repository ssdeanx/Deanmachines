import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { generateId } from 'ai';
import { PinoLogger } from '@mastra/loggers';
import { RuntimeContext } from "@mastra/core/runtime-context";

const logger = new PinoLogger({ name: 'weatherTool', level: 'info' });

// Enhanced Zod schemas with detailed validation
const weatherInputSchema = z.object({
  location: z.string()
    .min(1, "Location cannot be empty")
    .max(100, "Location name too long")
    .describe('City name, state, or country to get weather for'),
});

const weatherOutputSchema = z.object({
  temperature: z.number().describe('Temperature in Celsius'),
  feelsLike: z.number().describe('Apparent temperature in Celsius'),
  humidity: z.number().min(0).max(100).describe('Relative humidity percentage'),
  windSpeed: z.number().min(0).describe('Wind speed in km/h'),
  windGust: z.number().min(0).describe('Wind gust speed in km/h'),
  conditions: z.string().describe('Weather condition description'),
  location: z.string().describe('Resolved location name'),
  timestamp: z.string().datetime().describe('Data timestamp in ISO format'),
  weatherCode: z.number().describe('Numerical weather condition code'),
});

// API response schemas for validation
const geocodingResponseSchema = z.object({
  results: z.array(z.object({
    latitude: z.number(),
    longitude: z.number(),
    name: z.string(),
  })).optional().default([]),
});

const weatherResponseSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    relative_humidity_2m: z.number(),
    wind_speed_10m: z.number(),
    wind_gusts_10m: z.number(),
    weather_code: z.number(),
  }),
});

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

export const weatherTool = createTool({
  id: 'get-weather',
  description: 'Get comprehensive current weather information for any location worldwide',
  inputSchema: weatherInputSchema,
  outputSchema: weatherOutputSchema,
  execute: async ({ context }) => {
    const requestId = generateId();
    logger.info(`[${requestId}] Weather request started`, { location: context.location });
    
    try {
      const result = await getWeather(context.location);
      logger.info(`[${requestId}] Weather request completed successfully`, { 
        location: result.location,
        temperature: result.temperature 
      });
      return result;
    } catch (error) {
      logger.error(`[${requestId}] Weather request failed`, { 
        location: context.location,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },
});

const getWeather = async (location: string) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  
  if (!geocodingResponse.ok) {
    throw new Error(`Geocoding API error: ${geocodingResponse.status}`);
  }
  
  const geocodingData = await geocodingResponse.json();
  const validatedGeocodingData = geocodingResponseSchema.parse(geocodingData);

  if (!validatedGeocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }

  const { latitude, longitude, name } = validatedGeocodingData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;

  const response = await fetch(weatherUrl);
  
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }
  
  const data = await response.json();
  const validatedWeatherData = weatherResponseSchema.parse(data);

  return {
    temperature: validatedWeatherData.current.temperature_2m,
    feelsLike: validatedWeatherData.current.apparent_temperature,
    humidity: validatedWeatherData.current.relative_humidity_2m,
    windSpeed: validatedWeatherData.current.wind_speed_10m,
    windGust: validatedWeatherData.current.wind_gusts_10m,
    conditions: getWeatherCondition(validatedWeatherData.current.weather_code),
    location: name,
    timestamp: new Date().toISOString(),
    weatherCode: validatedWeatherData.current.weather_code,
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
