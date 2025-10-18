import { generateObject } from "ai";
import { z } from "zod";

import { openaiFlashModel } from "../index";

// Schema for filter collection response
const FilterCollectionSchema = z.object({
  action: z.enum(["show_price_modal", "show_dr_modal", "collect_complete"]).describe("The action to take next"),
  message: z.string().describe("Message to show to the user"),
  collectedFilters: z.object({
    priceRange: z.object({
      min: z.number().optional(),
      max: z.number().optional()
    }).optional(),
    drRange: z.object({
      minDR: z.number().optional(),
      maxDR: z.number().optional(),
      minDA: z.number().optional(),
      maxDA: z.number().optional()
    }).optional(),
    skipped: z.object({
      priceRange: z.boolean().optional(),
      drRange: z.boolean().optional()
    }).optional()
  }).describe("Filters collected so far")
});

export async function collectPublisherFilters({
  step,
  userInput,
  currentFilters = {}
}: {
  step?: "price" | "dr" | "complete";
  userInput?: string;
  currentFilters?: {
    priceRange?: { min?: number; max?: number };
    drRange?: { minDR?: number; maxDR?: number; minDA?: number; maxDA?: number };
  };
}) {
  try {
    const { object: response } = await generateObject({
      model: openaiFlashModel,
      prompt: `
        You are helping collect filters for publisher browsing. The user is going through a step-by-step process to set up their search criteria.
        
        STRICT RULES:
        - Your output MUST NOT suggest browsing publishers until both priceRange and drRange are present in collectedFilters, or the user explicitly decides to skip filters.
        - If filters are incomplete, choose the appropriate next action to continue collection and stop there (no subsequent browsing step implied).
        - Do NOT reference UI controls that may not exist (e.g., "Click Continue", "press the button").
        - Keep the message concise and conversational. Prefer asking for simple confirmation like "Is this okay to proceed?" or a brief one-liner describing what's next.
        - Never instruct the user to click anything. If you need consent, ask a yes/no question.

        Current step: ${step || "initial"}
        User input: ${userInput || "Starting filter collection"}
        Current filters: ${JSON.stringify(currentFilters)}
        
        Determine the next action:
        1. If priceRange is missing and not explicitly skipped, return action: "show_price_modal"
        2. Else if drRange is missing and not explicitly skipped, return action: "show_dr_modal"  
        3. Else if both are present or explicitly skipped, return action: "collect_complete"
        
        Provide an appropriate message for the user and include any filters collected so far.
      `,
      schema: FilterCollectionSchema
    });

    // Sanitize any accidental UI-click phrasing in the LLM message
    const sanitized = {
      ...response,
      message: (response.message || '')
        .replace(/click\s+continue[.!]?/gi, 'Is this okay to proceed?')
        .replace(/click\s+the\s+button[.!]?/gi, '')
        .replace(/press\s+continue[.!]?/gi, 'Is this okay to proceed?')
    };

    return sanitized;
  } catch (error) {
    console.error('Error in collectPublisherFilters:', error);
    
    // Fallback logic with skip awareness
    const skipped = (currentFilters as any).skipped || {};
    if (!currentFilters.priceRange && !skipped.priceRange) {
      return {
        action: "show_price_modal" as const,
        message: "Let's set your price range. Is this okay to proceed?",
        collectedFilters: currentFilters
      };
    } else if (!currentFilters.drRange && !skipped.drRange) {
      return {
        action: "show_dr_modal" as const,
        message: "Now let's set your DR/DA ranges. Proceed?",
        collectedFilters: currentFilters
      };
    } else {
      return {
        action: "collect_complete" as const,
        message: "Filters ready. Should I browse publishers with these?",
        collectedFilters: currentFilters
      };
    }
  }
}
