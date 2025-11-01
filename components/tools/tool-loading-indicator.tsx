"use client";

import React from "react";

interface ToolLoadingIndicatorProps {
  /** Custom loading text */
  text?: string;
  /** Tool name for default text */
  toolName?: string;
}

/**
 * Loading indicator for tool invocations
 */
export function ToolLoadingIndicator({ 
  text, 
  toolName 
}: ToolLoadingIndicatorProps) {
  const displayText = text || (toolName ? `Running ${toolName}...` : "Loading...");

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <div 
          className="size-2 bg-foreground/40 rounded-full animate-pulse" 
          style={{ animationDelay: '0ms' }}
        ></div>
        <div 
          className="size-2 bg-foreground/40 rounded-full animate-pulse" 
          style={{ animationDelay: '200ms' }}
        ></div>
        <div 
          className="size-2 bg-foreground/40 rounded-full animate-pulse" 
          style={{ animationDelay: '400ms' }}
        ></div>
      </div>
      <span className="text-sm text-muted-foreground">{displayText}</span>
    </div>
  );
}

