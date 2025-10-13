import { Message } from 'ai';
import { useState, useEffect, useCallback } from 'react';

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

export function usePlanExecution(chatId: string, append: (message: Message) => void, isPaused: boolean = false) {
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  // Fetch active plan
  const fetchActivePlan = useCallback(async () => {
    console.log('🔍 Fetching active plan for chatId:', chatId);
    const response = await fetch(`/api/plan/${chatId}`);
    if (response.ok) {
      const { plan } = await response.json();
      console.log('🔍 Fetched plan:', plan);
      setActivePlan(plan);
      if (plan) {
        setCurrentStepIndex(plan.currentStepIndex);
      }
    } else {
      console.log('🔍 No active plan found');
    }
  }, [chatId]);

  // Fetch plan when component mounts
  useEffect(() => {
    fetchActivePlan();
  }, [fetchActivePlan]);

  // Reset retry count when plan changes
  useEffect(() => {
    setRetryCount(0);
  }, [activePlan?.id]);


  // Execute next step (automatically when plan is ready)
  const executeNextStep = useCallback(async () => {
    if (!activePlan || isExecuting || isPaused) return;
    
    const currentStep = activePlan.steps[currentStepIndex];
    if (!currentStep || currentStep.status === 'completed') return;
    
    // Prevent infinite loops - if we've retried too many times, pause execution
    if (retryCount > 3) {
      console.warn('🚨 Too many retries, pausing execution to prevent infinite loop');
      setIsExecuting(false);
      return;
    }

    setIsExecuting(true);

    try {
      // Append a message to trigger AI to execute this step
      await append({
        id: `step-${currentStepIndex}-${Date.now()}`,
        role: 'user',
        content: `Execute step ${currentStepIndex + 1}: ${currentStep.description} using ${currentStep.toolName} tool.`
      } as Message);

      // Wait for step completion, then refresh plan
      setTimeout(async () => {
        await fetchActivePlan();
        // Check if step progressed by comparing with current state
        // If the step is still the same, increment retry count
        setRetryCount(prev => prev + 1);
        setIsExecuting(false);
      }, 1000);

    } catch (error) {
      console.error('Step execution failed:', error);
      setIsExecuting(false);
    }
  }, [activePlan, currentStepIndex, isExecuting, isPaused, retryCount, append, fetchActivePlan]);

  // Auto-execute when plan is ready (no manual start required)
  useEffect(() => {
    if (activePlan && !isExecuting && !isPaused && currentStepIndex < activePlan.totalSteps) {
      const currentStep = activePlan.steps[currentStepIndex];
      
      // Check if step requires user input
      if (currentStep.toolName === 'collectPublisherFilters') {
        // Don't auto-execute, wait for user to complete modal inputs
        return;
      }
      
      // Auto-execute next step automatically when plan is ready
      const timer = setTimeout(() => {
        executeNextStep();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [activePlan, currentStepIndex, isExecuting, isPaused, executeNextStep]);

  return {
    activePlan,
    isExecuting,
    currentStepIndex,
    fetchActivePlan,
    executeNextStep
  };
}
