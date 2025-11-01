"use client";


import { ToolSummaryCard } from "../tool-summary-card";
import { ToolRendererProps } from "../types";

interface BrowsePublishersResult {
  publishers?: unknown[];
  metadata?: {
    totalCount?: number;
    averageDR?: number;
    averageDA?: number;
    priceRange?: {
      min?: number;
      max?: number;
    };
  };
  filters?: Record<string, unknown>;
}

/**
 * Renderer for browsePublishers tool
 * Shows loading state and summary with metadata
 */
export function BrowsePublishersRenderer({
  toolCallId,
  loading,
  result,
  onExpand,
}: ToolRendererProps) {
  // Loading state
  if (loading) {
    return (
      <ToolSummaryCard
        title="Publisher Search Results"
        loading={true}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
            <span>publishers found</span>
          </div>
          <div className="flex items-center gap-4">
            <span>
              Avg DR:{" "}
              <span className="font-medium text-foreground">
                <span className="inline-block h-3 w-8 bg-muted animate-pulse rounded"></span>
              </span>
            </span>
            <span>
              Avg DA:{" "}
              <span className="font-medium text-foreground">
                <span className="inline-block h-3 w-8 bg-muted animate-pulse rounded"></span>
              </span>
            </span>
            <span>
              Price:{" "}
              <span className="font-medium text-foreground">
                <span className="inline-block h-3 w-12 bg-muted animate-pulse rounded"></span>
              </span>
            </span>
          </div>
        </div>
      </ToolSummaryCard>
    );
  }

  // Result state
  if (result) {
    const data = result as BrowsePublishersResult;
    const { publishers, metadata, filters } = data;

    if (!metadata) {
      return null;
    }

    const appliedFilters = filters
      ? Object.entries(filters)
          .filter(([_, value]) => value)
          .map(([key, value]) => `${key}: ${value}`)
      : [];

    return (
      <ToolSummaryCard
        title="Publisher Search Results"
        clickable={true}
        onClick={() => {
          onExpand?.("browsePublishers", result);
        }}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {metadata.totalCount ?? 0}
            </span>
            <span>publishers found</span>
          </div>

          <div className="flex items-center gap-4">
            <span>
              Avg DR:{" "}
              <span className="font-medium text-foreground">
                {metadata.averageDR ?? 0}
              </span>
            </span>
            <span>
              Avg DA:{" "}
              <span className="font-medium text-foreground">
                {metadata.averageDA ?? 0}
              </span>
            </span>
            <span>
              Price:{" "}
              <span className="font-medium text-foreground">
                ${metadata.priceRange?.min ?? 0}-${metadata.priceRange?.max ?? 0}
              </span>
            </span>
          </div>

          {appliedFilters.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-muted-foreground">Filters:</span>
              {appliedFilters.slice(0, 2).map((filter, index) => (
                <span
                  key={index}
                  className="bg-muted px-2 py-0.5 rounded text-xs"
                >
                  {filter}
                </span>
              ))}
              {appliedFilters.length > 2 && (
                <span className="text-muted-foreground">
                  +{appliedFilters.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>
      </ToolSummaryCard>
    );
  }

  return null;
}

