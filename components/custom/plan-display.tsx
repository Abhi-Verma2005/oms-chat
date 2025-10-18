
import { Loader2, CheckCircle, Circle, ChevronDown } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { useSplitScreen } from '../../contexts/SplitScreenProvider';

interface Plan {
  id: string;
  summary: string;
  steps: Array<{
    id: string;
    stepIndex: number;
    description: string;
    toolName: string;
    status: string;
  }>;
  currentStepIndex: number;
  totalSteps: number;
  status: string;
}

export function PlanDisplay({ 
  chatId, 
  append, 
  initialPlan 
}: { 
  chatId: string; 
  append: any;
  initialPlan?: Plan | null;
}) {
  const [showContent, setShowContent] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { setRightPanelContent } = useSplitScreen();

  // Display-only: rely on provided initialPlan
  const currentPlan = initialPlan || null;

  console.log('🎯 PlanDisplay rendered (display-only):', { chatId, currentPlan });

  // Show loading state first, then transition to content
  useEffect(() => {
    if (currentPlan) {
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 800); // Show loading for 800ms
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [currentPlan]);

  if (!currentPlan || !currentPlan.steps) return null;

  const completedSteps = (currentPlan.steps || []).filter((step: any) => step.status === 'completed').length;
  const totalSteps = (currentPlan.steps || []).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-xl p-3 my-3 hover:bg-card/80 transition-all duration-200 hover:shadow-md hover:border-accent/50 w-full max-w-full md:w-[650px]">
      {/* Loading State */}
      {!showContent && (
        <div className="relative overflow-hidden">
          {/* Animated border light */}
          <div className="absolute inset-0 rounded-lg">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-70 animate-[border-light_2s_ease-in-out_infinite]"></div>
            <div className="absolute inset-px rounded-lg bg-card"></div>
          </div>
          
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-4 bg-accent/20 rounded flex items-center justify-center">
                <div className="size-2 bg-accent rounded-full"></div>
              </div>
              <h3 className="text-foreground font-medium text-sm whitespace-nowrap">Creating Execution Plan</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 bg-accent rounded-full animate-pulse"></div>
              <div className="size-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="size-2 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Todo List Content */}
      {showContent && (
        <div className={`transition-all duration-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Header */}
          <button
            type="button"
            className="w-full flex items-center justify-between mb-2 text-left"
            onClick={() => setCollapsed(v => !v)}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">To-dos</span>
              <span className="text-xs text-muted-foreground">{totalSteps}</span>
            </div>
            <ChevronDown className={`size-4 text-muted-foreground transition-transform ${collapsed ? '-rotate-90' : ''}`} />
          </button>

          {!collapsed && (
            <>
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-muted/30 rounded mb-3 overflow-hidden">
                <div className="h-full bg-accent rounded" style={{ width: `${progressPercent}%` }}></div>
              </div>

              {/* Steps list */}
              <div className="space-y-0.5">
                {(currentPlan.steps || []).map((step: any, index: number) => (
                  <div key={step.id} className={`flex items-start gap-3 py-1.5 px-1 rounded-md transition-all duration-300 ${
                    step.status === 'executing' ? 'bg-accent/10' : 'hover:bg-muted/40'
                  }`}>
                    {/* Radio/Status */}
                    <div className="mt-0.5">
                      {step.status === 'completed' && (
                        <span className="inline-block size-4 rounded-full border border-border bg-accent" />
                      )}
                      {step.status === 'executing' && (
                        <span className="inline-flex items-center justify-center size-4 rounded-full border border-accent">
                          <Loader2 className="size-3 text-accent animate-spin" />
                        </span>
                      )}
                      {step.status === 'pending' && (
                        <span className="inline-block size-4 rounded-full border border-border" />
                      )}
                    </div>

                    {/* Step Description */}
                    <div className="flex-1">
                      <p className={`text-sm ${
                        step.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'
                      }`}>
                        {step.description}
                      </p>
                    </div>

                    {/* Index */}
                    <div className="mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
                        {index + 1}/{totalSteps}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Open in sidebar */}
              <div className="mt-2 text-right">
                <a
                  className="text-xs text-muted-foreground hover:text-accent cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    setRightPanelContent(
                      React.createElement(TodosSidebar, { plan: currentPlan })
                    );
                  }}
                >
                  Open in sidebar →
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Compact To-dos sidebar component
function TodosSidebar({ plan }: { plan: any }) {
  const completed = (plan.steps || []).filter((s: any) => s.status === 'completed').length;
  const total = (plan.steps || []).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground">To-dos</span>
        <span className="text-xs text-muted-foreground">{completed}/{total} • {percent}%</span>
      </div>
      <div className="h-1.5 w-full bg-muted/30 rounded mb-3 overflow-hidden">
        <div className="h-full bg-accent rounded" style={{ width: `${percent}%` }}></div>
      </div>
      <div className="space-y-1">
        {(plan.steps || []).map((step: any, idx: number) => (
          <div key={step.id} className="flex items-start gap-2 p-1 rounded hover:bg-muted/40">
            <span className={`inline-block size-3 rounded-full mt-1 ${step.status === 'completed' ? 'bg-accent' : step.status === 'executing' ? 'bg-accent/70 animate-pulse' : 'bg-muted-foreground/40'}`}></span>
            <div className="flex-1 text-xs text-foreground truncate">{step.description}</div>
            <span className="text-[10px] text-muted-foreground">{idx + 1}/{total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
