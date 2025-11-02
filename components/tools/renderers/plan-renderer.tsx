"use client";

import React from "react";

import { PlanDisplay } from "../../custom/plan-display";
import { ToolRendererProps } from "../types";

interface PlanResult {
  planId?: string;
  summary?: string;
  steps?: Array<{
    id?: string;
    stepIndex?: number;
    description?: string;
    toolName?: string;
    status?: string;
  }>;
  totalSteps?: number;
  currentStepIndex?: number;
  status?: string;
  message?: string;
}

interface PlanRendererProps extends ToolRendererProps {
  chatId?: string;
  onAppendMessage?: (message: { role: "user"; content: string }) => Promise<string | null | undefined>;
}

/**
 * Renderer for execution plan tools (createExecutionPlan, updatePlanProgress)
 * Shows plan as todo list
 */
export function PlanRenderer({
  toolCallId,
  toolName,
  result,
  chatId,
  onAppendMessage,
}: PlanRendererProps) {
  if (!result) {
    return null;
  }

  const data = result as PlanResult;
  const {
    planId,
    summary,
    steps,
    totalSteps,
    currentStepIndex,
    status,
  } = data;

  if (!planId || !chatId) {
    return null;
  }

  return (
    <div key={toolCallId}>
      <PlanDisplay
        chatId={chatId}
        append={onAppendMessage}
        initialPlan={{
          id: planId,
          summary: summary || "",
          steps:
            steps?.map((step, index) => ({
              id: step.id || `step-${index}`,
              stepIndex: step.stepIndex ?? index,
              description: step.description || "",
              toolName: step.toolName || "",
              status:
                step.status ||
                (currentStepIndex !== undefined && index < currentStepIndex
                  ? "completed"
                  : "pending"),
            })) || [],
          currentStepIndex: currentStepIndex ?? 0,
          totalSteps: totalSteps ?? 0,
          status: (status as "active" | "completed" | "pending") || "active",
        }}
      />
    </div>
  );
}

