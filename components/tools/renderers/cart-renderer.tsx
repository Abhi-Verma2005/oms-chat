"use client";

import React from "react";

import { ToolSummaryCard } from "../tool-summary-card";
import { ToolRendererProps } from "../types";

interface CartResult {
  summary?: {
    totalItems?: number;
    totalQuantity?: number;
    totalPrice?: number;
  };
  cartData?: {
    items?: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
    }>;
  };
}

/**
 * Renderer for cart-related tools (viewCart, addToCart, etc.)
 * Shows loading state and cart summary
 */
export function CartRenderer({
  toolCallId,
  toolName,
  loading,
  result,
  onExpand,
}: ToolRendererProps) {
  // Loading state
  if (loading) {
    return (
      <ToolSummaryCard
        title="Shopping Cart"
        loading={true}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
            <span>items in cart</span>
          </div>
          <div className="flex items-center gap-4">
            <span>
              Total:{" "}
              <span className="font-medium text-foreground">
                <span className="inline-block h-3 w-16 bg-muted animate-pulse rounded"></span>
              </span>
            </span>
            <span>
              Quantity:{" "}
              <span className="font-medium text-foreground">
                <span className="inline-block h-3 w-8 bg-muted animate-pulse rounded"></span>
              </span>
            </span>
          </div>
        </div>
      </ToolSummaryCard>
    );
  }

  // Result state
  if (result) {
    const data = result as CartResult;
    const { summary, cartData } = data;

    if (!summary) {
      return null;
    }

    return (
      <ToolSummaryCard
        title="Shopping Cart"
        clickable={true}
        onClick={() => {
          console.log("🛒 Opening sidebar with viewCart result");
          onExpand?.(toolName, result);
        }}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {summary.totalItems ?? 0}
            </span>
            <span>items in cart</span>
          </div>

          <div className="flex items-center gap-4">
            <span>
              Total:{" "}
              <span className="font-medium text-foreground">
                ${(summary.totalPrice ?? 0).toFixed(2)}
              </span>
            </span>
            <span>
              Quantity:{" "}
              <span className="font-medium text-foreground">
                {summary.totalQuantity ?? 0}
              </span>
            </span>
          </div>

          {cartData?.items && cartData.items.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-muted-foreground">Items:</span>
              {cartData.items.slice(0, 2).map((item, index) => (
                <span
                  key={index}
                  className="bg-muted px-2 py-0.5 rounded text-xs"
                >
                  {item.name} (${item.price})
                </span>
              ))}
              {cartData.items.length > 2 && (
                <span className="text-muted-foreground">
                  +{cartData.items.length - 2} more
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

