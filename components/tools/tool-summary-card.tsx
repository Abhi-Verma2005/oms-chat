"use client";

import { ToolSummaryProps } from "./types";

/**
 * Reusable summary card component for tool invocations
 * Shows loading state or summary state with consistent styling
 */
export function ToolSummaryCard({
  title,
  icon,
  loading = false,
  clickable = false,
  children,
  onClick,
}: ToolSummaryProps) {
  const defaultIcon = (
    <div className="p-1 bg-[#569CD6]/10 rounded">
      <div className="size-3 bg-[#569CD6] rounded-sm flex items-center justify-center">
        <div className={`size-1.5 bg-white rounded-full ${loading ? 'animate-pulse' : ''}`}></div>
      </div>
    </div>
  );

  return (
    <div
      onClick={clickable && !loading ? onClick : undefined}
      className={`relative bg-[#2D2D2D] border border-[#333333] rounded-lg p-4 transition-all duration-200 hover:shadow-md w-full ${
        clickable && !loading ? 'hover:bg-[#333333] cursor-pointer hover:border-[#569CD6]/50' : ''
      } ${loading ? 'border-2 border-[#569CD6]/50' : 'border-[#333333]'}`}
    >
      {/* Animated border light when loading */}
      {loading && (
        <div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden">
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, #569CD6 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'border-light-border 2s ease-in-out infinite'
            }}
          ></div>
          <div className="absolute inset-[2px] rounded-lg bg-[#2D2D2D]"></div>
        </div>
      )}
      
      <div className="relative">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            {icon || defaultIcon}
            <h3 className="text-[#E0E0E0] font-medium text-sm whitespace-nowrap">{title}</h3>
          </div>
          {clickable && !loading && (
            <span className="text-[#A0A0A0] text-xs">Expand →</span>
          )}
        </div>
        <div className="text-xs text-[#A0A0A0]">
          {children}
        </div>
      </div>
    </div>
  );
}

