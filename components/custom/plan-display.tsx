
import { Loader2, CheckCircle, Circle, Square } from 'lucide-react';
import { useState, useEffect } from 'react';

import { usePlanExecution } from '@/hooks/usePlanExecution';

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
  const [isPaused, setIsPaused] = useState(false);
  const { activePlan, isExecuting, currentStepIndex } = usePlanExecution(chatId, append, isPaused);
  const [showContent, setShowContent] = useState(false);

  // Use initialPlan if provided, otherwise use activePlan from hook
  const currentPlan = initialPlan || activePlan;

  console.log('🎯 PlanDisplay rendered:', { chatId, activePlan, currentPlan, isExecuting, currentStepIndex });

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

  return (
    <div className={`relative bg-card rounded-lg p-4 my-4 hover:bg-card/80 transition-all duration-200 hover:shadow-md w-fit max-w-full ${
      !showContent ? 'border-2 border-border' : 'border border-border'
    }`}>
      {/* Border - Loading or Static */}
      {!showContent && (
        <div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden">
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgb(75, 85, 99) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'border-light-border 2s ease-in-out infinite'
            }}
          ></div>
          <div className="absolute inset-[2px] rounded-lg bg-card"></div>
        </div>
      )}
      
      {/* Loading State */}
      {!showContent && (
        <div className="relative">
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-4 bg-gray-600 rounded flex items-center justify-center">
                <div className="size-2 bg-gray-400 rounded-full"></div>
              </div>
              <h3 className="text-foreground font-medium text-sm whitespace-nowrap">Creating Execution Plan</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="size-2 bg-gray-500 rounded-full animate-pulse"></div>
              <div className="size-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="size-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Todo List Content */}
      {showContent && (
        <div className={`transition-all duration-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="size-4 bg-ui-teal/10 rounded flex items-center justify-center">
                <div className="size-2 bg-ui-teal rounded-full"></div>
              </div>
              <span className="text-foreground text-sm font-medium">
                {completedSteps} of {totalSteps} Done
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Stop/Pause Button */}
              {isExecuting && !isPaused && (
                <button
                  onClick={() => setIsPaused(true)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 transition-colors"
                  title="Stop execution"
                >
                  <Square className="size-3" />
                  Stop
                </button>
              )}
              {/* Resume Button */}
              {isPaused && (
                <button
                  onClick={() => setIsPaused(false)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500/10 text-green-500 rounded-md hover:bg-green-500/20 transition-colors"
                  title="Resume execution"
                >
                  ▶️
                  Resume
                </button>
              )}
            </div>
          </div>

          {/* Steps list */}
          <div className="space-y-1">
              {(currentPlan.steps || []).map((step: any, index: number) => (
                <div key={step.id} className={`flex items-start gap-3 py-2 transition-all duration-300 ${
                  step.status === 'executing' ? 'bg-ui-teal/10 rounded-md px-2 -mx-2' : ''
                }`}>
                  {/* Status Icon */}
                  <div className="mt-0.5 transition-all duration-300">
                    {step.status === 'completed' && (
                      <div className="size-4 bg-ui-teal rounded-full flex items-center justify-center transition-all duration-300">
                        <CheckCircle className="size-3 text-white animate-in zoom-in-50 duration-300" />
                      </div>
                    )}
                    {step.status === 'executing' && (
                      <div className="size-4 bg-ui-teal rounded-full flex items-center justify-center transition-all duration-300">
                        <Loader2 className="size-3 text-white animate-spin" />
                      </div>
                    )}
                    {step.status === 'pending' && (
                      <div className="size-4 bg-muted rounded-full flex items-center justify-center transition-all duration-300">
                        <Circle className="size-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Step Description */}
                  <div className="flex-1 transition-all duration-300">
                    <p className={`text-sm transition-all duration-300 ${
                      step.status === 'completed' ? 'text-foreground line-through' : 
                      step.status === 'executing' ? 'text-foreground font-medium' : 
                      'text-muted-foreground'
                    }`}>
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          {/* Progress indicator */}
          {isExecuting && !isPaused && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Executing step {currentStepIndex + 1} of {totalSteps}...
              </div>
            </div>
          )}
          
          {/* Paused indicator */}
          {isPaused && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-sm text-yellow-500">
                ⏸️ Execution paused at step {currentStepIndex + 1} of {totalSteps}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
