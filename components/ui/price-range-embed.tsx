"use client";

import { useState } from "react";
import { DollarSign, Sliders } from "lucide-react";
import { Button } from "./button";

interface PriceRangeEmbedProps {
  onConfirm: (priceRange: { min: number; max: number }) => void;
  onSkip: () => void;
}

export function PriceRangeEmbed({ onConfirm, onSkip }: PriceRangeEmbedProps) {
  const [priceRange, setPriceRange] = useState({ min: 100, max: 1000 });

  const handleConfirm = () => {
    onConfirm(priceRange);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4 max-w-md">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-md">
          <DollarSign className="size-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Set Price Range</h3>
          <p className="text-xs text-muted-foreground">Filter publishers by your budget</p>
        </div>
      </div>

      {/* Price Range Controls */}
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Min Price</label>
            <span className="text-sm font-semibold text-foreground">${priceRange.min}</span>
          </div>
          <input
            type="range"
            min="50"
            max="500"
            step="50"
            value={priceRange.min}
            onChange={(e) => setPriceRange(prev => ({ ...prev, min: parseInt(e.target.value) }))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">Max Price</label>
            <span className="text-sm font-semibold text-foreground">${priceRange.max}</span>
          </div>
          <input
            type="range"
            min="200"
            max="2000"
            step="50"
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: parseInt(e.target.value) }))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer slider"
          />
        </div>
      </div>

      {/* Selected Range Display */}
      <div className="bg-muted/30 rounded-md p-3 text-center">
        <div className="text-xs text-muted-foreground mb-1">Selected Range</div>
        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
          ${priceRange.min} - ${priceRange.max}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={onSkip}
          variant="outline"
          size="sm"
          className="flex-1 text-xs h-8"
        >
          Skip
        </Button>
        <Button
          onClick={handleConfirm}
          size="sm"
          className="flex-1 text-xs h-8 bg-purple-600 hover:bg-purple-700"
        >
          Apply Filter
        </Button>
      </div>
    </div>
  );
}
