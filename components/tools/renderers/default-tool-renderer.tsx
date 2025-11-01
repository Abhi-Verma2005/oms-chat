"use client";

import React from "react";
import { ToolRendererProps } from "../types";
import { ToolSummaryCard } from "../tool-summary-card";
import { ToolLoadingIndicator } from "../tool-loading-indicator";

/**
 * Default renderer for tools without specific renderers
 * Shows loading state and generic summary
 */
export function DefaultToolRenderer({
  toolCallId,
  toolName,
  loading,
  result,
  onExpand,
}: ToolRendererProps) {
  // Format tool name for display
  const displayName = toolName
    .replace(/([A-Z])/g, " $1")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  // Loading state
  if (loading) {
    return (
      <ToolSummaryCard title={displayName} loading={true}>
        <ToolLoadingIndicator toolName={displayName} />
      </ToolSummaryCard>
    );
  }

  // Result state
  if (result) {
    return (
      <ToolSummaryCard
        title={displayName}
        clickable={true}
        onClick={() => onExpand?.(toolName, result)}
      >
        Click to view details
      </ToolSummaryCard>
    );
  }

  return null;
}

