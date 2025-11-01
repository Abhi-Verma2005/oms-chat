"use client";

import { ToolInvocation } from "ai";
import { useCallback } from "react";

import { renderTool, ToolRendererProps } from "./index";

interface UseToolInvocationProps {
  toolInvocation: ToolInvocation;
  loading?: boolean;
  onExpand?: (toolName: string, result: unknown) => void;
  additionalProps?: Record<string, unknown>;
}

/**
 * Hook to render a tool invocation with loading and result states
 * Returns the rendered component or null
 */
export function useToolInvocation({
  toolInvocation,
  loading = false,
  onExpand,
  additionalProps = {},
}: UseToolInvocationProps) {
  const { toolName, toolCallId, state } = toolInvocation;
  // Access result property - it exists when state is "result"
  const result = state === "result" ? (toolInvocation as ToolInvocation & { result?: unknown }).result : undefined;

  // Determine if tool is loading
  const isLoading = state === "call" && loading;

  // Render the tool using the registry
  const renderedTool = renderTool({
    toolCallId,
    toolName,
    loading: isLoading,
    result: state === "result" ? result : undefined,
    onExpand,
    ...additionalProps,
  });

  return renderedTool;
}

/**
 * Component wrapper for tool invocation
 */
export function ToolInvocationItem({
  toolInvocation,
  loading = false,
  onExpand,
  additionalProps = {},
}: UseToolInvocationProps) {
  const rendered = useToolInvocation({
    toolInvocation,
    loading,
    onExpand,
    additionalProps,
  });

  return rendered;
}

