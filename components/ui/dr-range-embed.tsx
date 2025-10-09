"use client";

import { useState } from "react";
import { TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "./button";

interface DRRangeEmbedProps {
  onConfirm: (drRange: { minDR: number; maxDR: number; minDA: number; maxDA: number }) => void;
  onSkip: () => void;
}

export function DRRangeEmbed({ onConfirm, onSkip }: DRRangeEmbedProps) {
  const [drRange, setDrRange] = useState({ 
    minDR: 20, 
    maxDR: 80, 
    minDA: 20, 
    maxDA: 80 
  });

  const handleConfirm = () => {
    onConfirm(drRange);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4 max-w-sm">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
          <TrendingUp className="size-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Set Authority Range</h3>
          <p className="text-xs text-muted-foreground">Filter by Domain Rating & Authority</p>
        </div>
      </div>

      {/* DR Range */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-3 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Domain Rating (DR)</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Min DR</label>
              <span className="text-xs font-semibold text-foreground">{drRange.minDR}</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={drRange.minDR}
              onChange={(e) => setDrRange(prev => ({ ...prev, minDR: parseInt(e.target.value) }))}
              className="w-full h-2 bg-muted/80 rounded-full appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)/0.55) 0%, hsl(var(--primary)/0.55) ${((drRange.minDR - 1) / (50 - 1)) * 100}%, #e5e7eb ${((drRange.minDR - 1) / (50 - 1)) * 100}%, #e5e7eb 100%)`
              }}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Max DR</label>
              <span className="text-xs font-semibold text-foreground">{drRange.maxDR}</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="1"
              value={drRange.maxDR}
              onChange={(e) => setDrRange(prev => ({ ...prev, maxDR: parseInt(e.target.value) }))}
              className="w-full h-2 bg-muted/80 rounded-full appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)/0.55) 0%, hsl(var(--primary)/0.55) ${((drRange.maxDR - 50) / (100 - 50)) * 100}%, #e5e7eb ${((drRange.maxDR - 50) / (100 - 50)) * 100}%, #e5e7eb 100%)`
              }}
            />
          </div>
        </div>
      </div>

      {/* DA Range */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-3 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Domain Authority (DA)</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Min DA</label>
              <span className="text-xs font-semibold text-foreground">{drRange.minDA}</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={drRange.minDA}
              onChange={(e) => setDrRange(prev => ({ ...prev, minDA: parseInt(e.target.value) }))}
              className="w-full h-2 bg-muted/80 rounded-full appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)/0.55) 0%, hsl(var(--primary)/0.55) ${((drRange.minDA - 1) / (50 - 1)) * 100}%, #e5e7eb ${((drRange.minDA - 1) / (50 - 1)) * 100}%, #e5e7eb 100%)`
              }}
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">Max DA</label>
              <span className="text-xs font-semibold text-foreground">{drRange.maxDA}</span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="1"
              value={drRange.maxDA}
              onChange={(e) => setDrRange(prev => ({ ...prev, maxDA: parseInt(e.target.value) }))}
              className="w-full h-2 bg-muted/80 rounded-full appearance-none cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)/0.55) 0%, hsl(var(--primary)/0.55) ${((drRange.maxDA - 50) / (100 - 50)) * 100}%, #e5e7eb ${((drRange.maxDA - 50) / (100 - 50)) * 100}%, #e5e7eb 100%)`
              }}
            />
          </div>
        </div>
      </div>

      {/* Selected Ranges Display */}
      <div className="bg-muted/30 rounded-md p-3">
        <div className="text-xs text-muted-foreground mb-2 text-center">Selected Ranges</div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="text-center">
            <div className="font-bold text-blue-600 dark:text-blue-400">DR</div>
            <div className="text-foreground">{drRange.minDR} - {drRange.maxDR}</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-600 dark:text-blue-400">DA</div>
            <div className="text-foreground">{drRange.minDA} - {drRange.maxDA}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end">
        <Button
          onClick={onSkip}
          variant="outline"
          size="sm"
          className="text-xs h-8 px-4"
        >
          Skip
        </Button>
        <Button
          onClick={handleConfirm}
          size="sm"
          className="text-xs h-8 px-4 bg-purple-600 hover:bg-purple-700"
        >
          Apply Filter
        </Button>
      </div>
    </div>
  );
}
