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
        
        Current step: ${step || "initial"}
        User input: ${userInput || "Starting filter collection"}
        Current filters: ${JSON.stringify(currentFilters)}
        
        Determine the next action:
        1. If no price range is set, return action: "show_price_modal"
        2. If price range is set but no DR/DA range is set, return action: "show_dr_modal"  
        3. If both are set, return action: "collect_complete"
        
        Provide an appropriate message for the user and include any filters collected so far.
      `,
      schema: FilterCollectionSchema
    });

    return response;
  } catch (error) {
    console.error('Error in collectPublisherFilters:', error);
    
    // Fallback logic
    if (!currentFilters.priceRange) {
      return {
        action: "show_price_modal" as const,
        message: "Let's start by setting your price range for publisher backlinks. This will help me find options that fit your budget.",
        collectedFilters: currentFilters
      };
    } else if (!currentFilters.drRange) {
      return {
        action: "show_dr_modal" as const,
        message: "Great! Now let's set your preferred Domain Rating (DR) and Domain Authority (DA) ranges to find publishers with the right authority levels.",
        collectedFilters: currentFilters
      };
    } else {
      return {
        action: "collect_complete" as const,
        message: "Perfect! I have all the filters I need. Now I'll search for publishers that match your criteria.",
        collectedFilters: currentFilters
      };
    }
  }
}
