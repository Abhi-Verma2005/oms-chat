"use client";

import { Weather } from "../../custom/weather";
import { ToolLoadingIndicator } from "../tool-loading-indicator";
import { ToolSummaryCard } from "../tool-summary-card";
import { ToolRendererProps } from "../types";

/**
 * Weather data structure matching the Weather component's expected type
 */
interface WeatherAtLocation {
      latitude: number;
      longitude: number;
      generationtime_ms: number;
      utc_offset_seconds: number;
      timezone: string;
      timezone_abbreviation: string;
      elevation: number;
      current_units: {
        time: string;
        interval: string;
        temperature_2m: string;
      };
      current: {
        time: string;
        interval: number;
        temperature_2m: number;
      };
      hourly_units: {
        time: string;
        temperature_2m: string;
      };
      hourly: {
        time: string[];
        temperature_2m: number[];
      };
      daily_units: {
        time: string;
        sunrise: string;
        sunset: string;
      };
      daily: {
        time: string[];
        sunrise: string[];
        sunset: string[];
      };
}

/**
 * Renderer for getWeather/get_weather tool
 * Shows loading state and weather component
 */
export function WeatherRenderer({
  toolCallId,
  toolName,
  loading,
  result,
  onExpand,
}: ToolRendererProps) {
  // Loading state
  if (loading) {
    return (
      <ToolSummaryCard title="Weather" loading={true}>
        <ToolLoadingIndicator text="Fetching weather..." />
      </ToolSummaryCard>
    );
  }

  // Result state
  if (result) {
    return (
      <div key={toolCallId}>
        <Weather weatherAtLocation={result as WeatherAtLocation} />
      </div>
    );
  }

  return null;
}

