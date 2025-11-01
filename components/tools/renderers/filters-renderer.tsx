"use client";

import React from "react";
import { ToolRendererProps } from "../types";
import { PriceRangeEmbed } from "../../ui/price-range-embed";
import { DRRangeEmbed } from "../../ui/dr-range-embed";

interface FiltersResult {
  action?: "show_price_modal" | "show_dr_modal" | "collect_complete";
  message?: string;
  collectedFilters?: Record<string, unknown>;
}

interface FiltersRendererProps extends ToolRendererProps {
  onPriceRangeConfirm?: (range: { min: number; max: number }) => void;
  onPriceRangeSkip?: () => void;
  onDRRangeConfirm?: (range: {
    minDR: number;
    maxDR: number;
    minDA: number;
    maxDA: number;
  }) => void;
  onDRRangeSkip?: () => void;
  onFinalBrowseCall?: (filters: Record<string, unknown>) => void;
}

/**
 * Renderer for collectPublisherFilters tool
 * Shows embedded filter collection modals
 */
export function FiltersRenderer({
  toolCallId,
  loading,
  result,
  onPriceRangeConfirm,
  onPriceRangeSkip,
  onDRRangeConfirm,
  onDRRangeSkip,
  onFinalBrowseCall,
}: FiltersRendererProps) {
  // Loading state - filters don't show a loading indicator typically
  if (loading) {
    return null;
  }

  // Result state
  if (result) {
    const data = result as FiltersResult;
    const { action, message, collectedFilters } = data;

    if (action === "show_price_modal") {
      return (
        <div key={toolCallId} className="max-w-md">
          <PriceRangeEmbed
            onConfirm={onPriceRangeConfirm}
            onSkip={onPriceRangeSkip}
          />
        </div>
      );
    }

    if (action === "show_dr_modal") {
      return (
        <div key={toolCallId} className="max-w-md">
          <DRRangeEmbed
            onConfirm={onDRRangeConfirm}
            onSkip={onDRRangeSkip}
          />
        </div>
      );
    }

    if (action === "collect_complete") {
      return (
        <div
          key={toolCallId}
          className="bg-card border border-border rounded-lg p-4 max-w-md"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-md">
              <div className="size-4 bg-green-600 dark:bg-green-400 rounded-full flex items-center justify-center">
                <div className="size-2 bg-white rounded-full"></div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Filters Complete
              </h3>
              <p className="text-xs text-muted-foreground">
                Ready to search publishers
              </p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mb-3">{message}</div>
          <div className="flex gap-2">
            <button
              onClick={() => onFinalBrowseCall?.(collectedFilters || {})}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium px-3 py-2 rounded-md transition-colors"
            >
              Search Publishers
            </button>
          </div>
        </div>
      );
    }

    // Fallback for unknown actions
    return (
      <div
        key={toolCallId}
        className="bg-card border border-border rounded-lg p-3 max-w-md"
      >
        <div className="text-sm text-muted-foreground">{message}</div>
      </div>
    );
  }

  return null;
}

