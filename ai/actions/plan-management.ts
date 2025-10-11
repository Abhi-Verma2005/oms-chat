import { generateObject } from 'ai';
import { z } from 'zod';

import { createExecutionPlan as dbCreatePlan, updatePlanProgress as dbUpdateProgress, saveChat, getPlanById } from '@/db/queries';

import { openaiFlashModel } from '../index';

const PlanSchema = z.object({
  summary: z.string().describe("Brief summary of what this plan will accomplish"),
  steps: z.array(z.object({
    description: z.string().describe("What this step does"),
    toolName: z.string().describe("Tool to call: collectPublisherFilters, browsePublishers, addToCart, processPayment, displayOrders"),
    requiresUserInput: z.boolean().describe("Does this step need user input?")
  }))
});

export async function createExecutionPlan({
  chatId,
  userRequest,
  context
}: {
  chatId: string;
  userRequest: string;
  context: any;
}) {
  try {
    // Ensure chat exists in database first
    if (context.userInfo?.id) {
      await saveChat({
        id: chatId,
        messages: [], // Empty messages for now, will be populated later
        userId: context.userInfo.id,
      });
    }
    
    // AI creates the plan
    const { object: aiPlan } = await generateObject({
    model: openaiFlashModel,
    prompt: `Create an execution plan for this user request: "${userRequest}"

Available tools:
- collectPublisherFilters: Collect price/DR/DA filters (multi-step, requires user input)
- browsePublishers: Search for publishers with filters
- getPublisherDetails: Get details of specific publisher
- addToCart: Add publisher to cart
- viewCart: Show cart contents
- processPayment: Process payment for cart items
- displayOrders: Show user's order history

Context: ${JSON.stringify(context)}

Break the request into clear, sequential steps. Each step should be one tool call.
For multi-step inputs (like filter collection), create ONE step that will handle all inputs.`,
    schema: PlanSchema
  });

    // Save to database
    const plan = await dbCreatePlan({
      chatId,
      summary: aiPlan.summary,
      steps: aiPlan.steps.map((step, index) => ({
        description: step.description,
        toolName: step.toolName,
        stepIndex: index
      }))
    });

    return {
      planId: plan.id,
      summary: plan.summary,
      steps: plan.steps,
      totalSteps: plan.totalSteps,
      message: `I've created a plan: ${plan.summary}. Click Continue to start execution.`
    };
  } catch (error) {
    console.error('❌ Failed to create execution plan:', error);
    throw error;
  }
}

export async function updatePlanProgress({
  planId,
  stepIndex,
  stepResult
}: {
  planId: string;
  stepIndex: number;
  stepResult: any;
}) {
  await dbUpdateProgress(planId, stepIndex, stepResult);
  
  // Get the updated plan data to return
  const updatedPlan = await getPlanById(planId);
  
  if (!updatedPlan) {
    throw new Error('Plan not found after update');
  }
  
  return {
    planId: updatedPlan.id,
    summary: updatedPlan.summary,
    steps: updatedPlan.steps,
    totalSteps: updatedPlan.totalSteps,
    currentStepIndex: updatedPlan.currentStepIndex,
    status: updatedPlan.status,
    message: `Step ${stepIndex + 1} completed successfully. Plan progress updated.`
  };
}
