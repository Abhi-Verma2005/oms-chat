/**
 * Tool Renderer Registry and Factory
 * 
 * This module provides a centralized registry for tool renderers
 * and a factory function to get the appropriate renderer for a tool.
 */

import React from "react";
import { ToolRendererProps } from "./types";
import { BrowsePublishersRenderer } from "./renderers/browse-publishers-renderer";
import { CartRenderer } from "./renderers/cart-renderer";
import { FiltersRenderer } from "./renderers/filters-renderer";
import { PlanRenderer } from "./renderers/plan-renderer";
import { PaymentRenderer } from "./renderers/payment-renderer";
import { WeatherRenderer } from "./renderers/weather-renderer";
import { DefaultToolRenderer } from "./renderers/default-tool-renderer";

/**
 * Tool renderer component type
 */
export type ToolRendererComponent = React.ComponentType<ToolRendererProps>;

/**
 * Registry of tool renderers
 * Maps tool names to their renderer components
 */
const toolRendererRegistry: Map<string, ToolRendererComponent> = new Map([
  ["browsePublishers", BrowsePublishersRenderer],
  ["viewCart", CartRenderer],
  ["addToCart", CartRenderer],
  ["removeFromCart", CartRenderer],
  ["clearCart", CartRenderer],
  ["updateCartItemQuantity", CartRenderer],
  ["collectPublisherFilters", FiltersRenderer],
  ["createExecutionPlan", PlanRenderer],
  ["updatePlanProgress", PlanRenderer],
  ["processPayment", PaymentRenderer],
  ["getWeather", WeatherRenderer],
  ["get_weather", WeatherRenderer],
  ["displayOrders", DefaultToolRenderer], // Can be customized later
]);

/**
 * Get the renderer component for a specific tool
 * @param toolName - Name of the tool
 * @returns The renderer component or DefaultToolRenderer if not found
 */
export function getToolRenderer(
  toolName: string
): ToolRendererComponent {
  return toolRendererRegistry.get(toolName) || DefaultToolRenderer;
}

/**
 * Register a custom tool renderer
 * @param toolName - Name of the tool
 * @param renderer - Renderer component
 */
export function registerToolRenderer(
  toolName: string,
  renderer: ToolRendererComponent
): void {
  toolRendererRegistry.set(toolName, renderer);
}

/**
 * Check if a tool has a custom renderer
 * @param toolName - Name of the tool
 * @returns True if tool has custom renderer, false otherwise
 */
export function hasToolRenderer(toolName: string): boolean {
  return toolRendererRegistry.has(toolName);
}

/**
 * Factory function to create a tool renderer component
 * @param props - Tool renderer props
 * @returns React element with the appropriate renderer
 */
export function renderTool({
  toolName,
  ...props
}: ToolRendererProps): React.ReactElement | null {
  const Renderer = getToolRenderer(toolName);
  return <Renderer toolName={toolName} {...props} />;
}

export * from "./types";
export * from "./tool-summary-card";
export * from "./tool-loading-indicator";

