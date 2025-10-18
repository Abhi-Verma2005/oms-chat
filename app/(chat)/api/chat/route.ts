import { convertToCoreMessages, Message, streamText } from "ai";
import { z } from "zod";

import { openaiProModel } from "../../../../ai";
import {
  browsePublishers,
  getPublisherDetails,
  addToCart,
  removeFromCart,
  viewCart,
  clearCart,
  updateCartItemQuantity,
  displayOrdersFunction,
  collectPublisherFilters,
} from "../../../../ai/actions";
import { createExecutionPlan, updatePlanProgress } from "../../../../ai/actions/plan-management";
import { auth } from "../../../../app/(auth)/auth";
import {
  deleteChatById,
  getChatById,
  saveChat,
} from "../../../../db/queries";
import { generateUUID } from "../../../../lib/utils";

export async function POST(request: Request) {
  const { id, messages, userInfo, cartState }: { 
    id: string; 
    messages: Array<Message>;
    userInfo?: {
      id: string;
      email: string;
      name?: string;
      preferences?: {
        industry?: string;
        companySize?: string;
        role?: string;
        interests?: string[];
      };
      chatHistory?: {
        totalChats: number;
        lastActive: string;
      };
    } | null;
    cartState?: Array<{
      id: string;
      type: "publisher" | "product";
      name: string;
      price: number;
      quantity: number;
      addedAt: string;
      metadata?: {
        publisherId?: string;
        website?: string;
        niche?: string[];
        dr?: number;
        da?: number;
      };
    }>;
  } = await request.json();

  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const coreMessages = convertToCoreMessages(messages).filter(
    (message) => message.content.length > 0,
  );

  // Generate personalized system prompt
  const generateSystemPrompt = (userInfo: {
    id: string;
    email: string;
    name?: string;
    preferences?: {
      industry?: string;
      companySize?: string;
      role?: string;
      interests?: string[];
    };
    chatHistory?: {
      totalChats: number;
      lastActive: string;
    };
  } | null) => {
    const basePrompt = `
        - you help users with backlinking and publisher discovery for SEO and content marketing!
        - keep your responses concise and helpful.
        - format responses using clean, readable markdown like ChatGPT:
          - start with a one-sentence answer/conclusion when possible
          - use '###' section headings for structure (never '#')
          - use short bullet lists; bold key terms like **DR**, **DA**, **Price**
          - when helpful, include compact markdown tables with clear headers and short labels
          - keep tables narrow (few columns), avoid wrapping long text; add a one-line caption before the table if needed
          - use fenced code blocks with language tags for code/commands
          - end with a brief Next steps section when appropriate
          - use emojis strategically to enhance readability and engagement: ✅ for success/completion, 📌 for important points, 💡 for tips/insights, 📊 for data/metrics, 🧭 for guidance/next steps, 🎯 for goals/targets, 🔍 for search/analysis, ⚡ for quick actions, 🚀 for getting started, 💰 for pricing, 🌟 for recommendations, 📝 for notes, ⚠️ for warnings, 🎉 for celebrations
        - after every tool call, show the results to the user in a clear format.
        - when browsePublishers tool is called, provide a CONCISE summary instead of listing all publishers:
          - Say something like "I've found X publishers matching your criteria" 
          - Highlight key stats (avg DR, DA, price range)
          - Mention any filters applied
          - Tell user to "Click the results card to view all publishers and add them to your cart"
          - DO NOT list individual publishers in your response - the detailed table is shown in the right panel
        - today's date is ${new Date().toLocaleDateString()}.
        - ask follow up questions to help users find the right publishers for their needs.
        - help users understand publisher metrics like DR (Domain Rating), DA (Domain Authority), and spam scores.
        - here's the optimal flow for publisher discovery:
          - when users ask to browse publishers without filters, use collectPublisherFilters tool to guide them through setting up price and DR/DA ranges
          - collectPublisherFilters tool shows interactive modals in chat - ALWAYS use this tool to collect user preferences; do NOT ask the user to type values directly in chat for price or DR/DA
          - after user sets price range, continue with DR/DA range collection
          - after user sets DR/DA ranges, proceed to browse publishers with all collected filters
          - browse publishers with optional filters (niche, country, DR range, type)
          - search for specific publishers or niches
          - view detailed publisher information
          - help users understand pricing and requirements
          - add publishers to cart for backlinking campaigns
          - manage cart items (add, remove, update quantities)
          - process payments using Stripe for completed orders
          - acknowledge successful payments and provide next steps for backlinking campaigns
        - explain what each metric means:
          - DR: Domain Rating (0-100, higher is better)
          - DA: Domain Authority (0-100, higher is better) 
          - Spam Score: Lower is better (1-5% is ideal)
          - Do-follow: Links that pass SEO value
          - Outbound Links: Number of external links on the page
        - when a user mentions a successful payment, acknowledge it enthusiastically and provide helpful next steps for their backlinking campaign
        - for successful payments, suggest next actions like content creation, outreach strategies, or campaign planning
        - CRITICAL: For ANY request involving publisher browsing, filtering, cart operations, or multi-step workflows, you MUST FIRST call createExecutionPlan tool to create a structured plan
        - Examples that REQUIRE planning: "browse publishers", "find publishers with filters", "browse publishers for backlink opportunities", "add publishers to cart", "complete purchase flow", "apply filters in detail", "set up filters", "configure search parameters"
        - Simple, single-step requests (like "show my cart" or "get weather") can be handled directly without planning
        - NEVER skip planning for publisher-related requests - always create an execution plan first
        - If user wants to modify or refine their search/filters, create a NEW plan for the updated requirements
        - IMPORTANT: After completing ANY tool execution that's part of an execution plan, you MUST call updatePlanProgress to mark that step as completed.
          - For filter collection specifically: ONLY call updatePlanProgress when collectPublisherFilters returns action = "collect_complete". Do not mark the filter step complete after only price or only DR/DA is gathered.
          - For browsePublishers: ALWAYS call updatePlanProgress immediately after browsePublishers completes successfully to mark the browsing step as completed.
          - For all other tools: Call updatePlanProgress after each tool execution to maintain accurate plan progress.
        - STRICT SEQUENCING FOR FILTERS:
          - When you call collectPublisherFilters, you MUST stop and wait for the user's UI interaction (modal submission) before calling any other tool.
          - Do NOT call browsePublishers until filter collection is COMPLETE (i.e., both priceRange and drRange are set, or the user explicitly declines filters). If filters are incomplete, prompt the user and call collectPublisherFilters again instead.
          - Never chain collectPublisherFilters and browsePublishers in the same turn. Finish filter collection first, then proceed to browsing in a subsequent turn.
        - STATE PASSING FOR FILTERS:
          - Always pass currentFilters from the previous collectPublisherFilters result into the next collectPublisherFilters call.
          - If you have only one of the two filters (e.g., priceRange but not drRange), treat that as incomplete and immediately call collectPublisherFilters again to collect the missing piece.
          - If the user explicitly skips a filter, set that in currentFilters as skipped and proceed accordingly.
        - When users complete filter collection steps (price range, DR/DA ranges), always:
          1. Acknowledge what they've set (e.g., "Great! I see you've set your price range to $200-$1000")
          2. Call the collectPublisherFilters tool to continue the next step
          3. Call updatePlanProgress to mark the step as completed
          4. Be encouraging and explain what's happening next
        - When users say they've set filters, immediately use collectPublisherFilters tool with their current filters to continue the flow
        `;

    if (!userInfo) {
      return basePrompt;
    }

    const userContext = `
        
        ## User Context:
        - User: ${userInfo.name || 'User'} (${userInfo.email})
        - User ID: ${userInfo.id}
        - Last Active: ${userInfo.chatHistory?.lastActive ? new Date(userInfo.chatHistory.lastActive).toLocaleDateString() : 'Unknown'}
        - Total Chats: ${userInfo.chatHistory?.totalChats || 0}
        ${userInfo.preferences?.industry ? `- Industry: ${userInfo.preferences.industry}` : ''}
        ${userInfo.preferences?.companySize ? `- Company Size: ${userInfo.preferences.companySize}` : ''}
        ${userInfo.preferences?.role ? `- Role: ${userInfo.preferences.role}` : ''}
        ${userInfo.preferences?.interests && userInfo.preferences.interests.length > 0 ? `- Interests: ${userInfo.preferences.interests.join(', ')}` : ''}
        
        ## Personalization Guidelines:
        - Use the user's name when appropriate: ${userInfo.name || 'User'}
        - Reference their industry context when relevant: ${userInfo.preferences?.industry || 'general business'}
        - Consider their role and company size when suggesting publishers
        - Build on their interests when recommending content opportunities
        - If this is their first chat, provide a warm welcome and explain the platform
        - If they're a returning user, acknowledge their previous activity and build on it
        `;

    return basePrompt + userContext;
  };

  const result = await streamText({
    model: openaiProModel,
    system: generateSystemPrompt(userInfo || null),
    messages: coreMessages,
    tools: {
      createExecutionPlan: {
        description: "Create an execution plan for complex user requests that require multiple steps (like browsing publishers with filters, adding items to cart, processing payments). Use this FIRST for multi-step workflows before calling individual tools.",
        parameters: z.object({
          userRequest: z.string().describe("The user's request"),
          context: z.any().describe("Current context (cart, filters, etc.)")
        }),
        execute: async ({ userRequest, context }) => {
          return await createExecutionPlan({
            chatId: id,
            userRequest,
            context: { userInfo, cartState, ...context }
          });
        }
      },
      getWeather: {
        description: "Get the current weather at a location",
        parameters: z.object({
          latitude: z.number().describe("Latitude coordinate"),
          longitude: z.number().describe("Longitude coordinate"),
        }),
        execute: async ({ latitude, longitude }) => {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`,
          );

          const weatherData = await response.json();
          return weatherData;
        },
      },
      displayOrders: {
        description: "Display user orders with filtering and summary statistics",
        parameters: z.object({
          userId: z.string().optional().describe("User ID to fetch orders for (optional, defaults to current user)"),
          limit: z.number().optional().default(10).describe("Number of orders to fetch (default: 10)"),
          status: z.enum(["PENDING", "PAID", "FAILED", "CANCELLED"]).optional().describe("Filter by order status"),
        }),
        execute: async ({ userId, limit, status }) => {
          const result = await displayOrdersFunction({ userId, limit, status });
          return result;
        },
      },
      browsePublishers: {
        description: "Browse and search for publishers/websites for backlinking opportunities. Only call AFTER filter collection is complete (both priceRange and drRange present) or the user explicitly opts to skip filters. IMPORTANT: After this tool completes, you MUST call updatePlanProgress to mark the browsing step as completed.",
        parameters: z.object({
          niche: z.string().optional().describe("Filter by niche/category (e.g., Technology, Health, Business)"),
          country: z.string().optional().describe("Filter by country"),
          minDR: z.number().optional().describe("Minimum Domain Rating"),
          maxDR: z.number().optional().describe("Maximum Domain Rating"),
          type: z.string().optional().describe("Filter by type (Premium or Standard)"),
          searchQuery: z.string().optional().describe("Search query for website names or niches"),
        }),
        execute: async ({ niche, country, minDR, maxDR, type, searchQuery }) => {
          const results = await browsePublishers({
            niche,
            country,
            minDR,
            maxDR,
            type,
            searchQuery,
          });

          return results;
        },
      },
      getPublisherDetails: {
        description: "Get detailed information about a specific publisher",
        parameters: z.object({
          publisherId: z.string().describe("Unique identifier for the publisher"),
        }),
        execute: async ({ publisherId }) => {
          const details = await getPublisherDetails(publisherId);
          return details;
        },
      },
      addToCart: {
        description: "Add a publisher or product to the shopping cart",
        parameters: z.object({
          type: z.enum(["publisher", "product"]).describe("Type of item to add"),
          name: z.string().describe("Name of the item"),
          price: z.number().describe("Price of the item in USD"),
          quantity: z.number().optional().default(1).describe("Quantity to add"),
          metadata: z.object({
            publisherId: z.string().optional(),
            website: z.string().optional(),
            niche: z.array(z.string()).optional(),
            dr: z.number().optional(),
            da: z.number().optional(),
          }).optional().describe("Additional metadata about the item"),
        }),
        execute: async ({ type, name, price, quantity, metadata }) => {
          const result = await addToCart({ type, name, price, quantity, metadata });
          return result;
        },
      },
      removeFromCart: {
        description: "Remove an item from the shopping cart",
        parameters: z.object({
          itemId: z.string().describe("Unique identifier of the item to remove"),
        }),
        execute: async ({ itemId }) => {
          const result = await removeFromCart({ itemId });
          return result;
        },
      },
      viewCart: {
        description: "View the current contents of the shopping cart",
        parameters: z.object({}),
        execute: async () => {
          const result = await viewCart(cartState);
          return result;
        },
      },
      clearCart: {
        description: "Clear all items from the shopping cart",
        parameters: z.object({}),
        execute: async () => {
          const result = await clearCart();
          return result;
        },
      },
      updateCartItemQuantity: {
        description: "Update the quantity of an item in the shopping cart",
        parameters: z.object({
          itemId: z.string().describe("Unique identifier of the item to update"),
          quantity: z.number().describe("New quantity for the item"),
        }),
        execute: async ({ itemId, quantity }) => {
          const result = await updateCartItemQuantity({ itemId, quantity });
          return result;
        },
      },
      processPayment: {
        description: "User is ready to proceed with payment for cart items. Wait for user confirmation that they are done adding items.",
        parameters: z.object({
          cartItems: z.array(z.object({
            id: z.string(),
            name: z.string(),
            price: z.number(),
            quantity: z.number(),
          })).describe("Items in the cart to process payment for"),
        }),
        execute: async ({ cartItems }) => {
          const totalAmount = cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
          return {
            message: "Ready to process payment! I'll now display the Stripe payment component for you to complete your purchase.",
            totalAmount,
            itemCount: cartItems.length,
            items: cartItems,
          };
        },
      },
      collectPublisherFilters: {
        description: "Collect filters from user through interactive modals before browsing publishers. Use this tool (not manual text questions) to gather price and DR/DA. Always pass forward currentFilters from prior calls. After calling this tool, end your turn and WAIT for the user's modal input before calling any other tool.",
        parameters: z.object({
          step: z.enum(["price", "dr", "complete"]).optional().describe("Current step in filter collection"),
          userInput: z.string().optional().describe("User input or response to previous modal"),
          currentFilters: z.object({
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
          }).optional().describe("Filters collected so far"),
        }),
        execute: async ({ step, userInput, currentFilters }) => {
          const result = await collectPublisherFilters({ step, userInput, currentFilters });
          return {
            ...result,
            show_in_chat: true // This tells the message component to show modals in chat instead of sidebar
          };
        },
      },
      updatePlanProgress: {
        description: "Update plan progress after completing a step. Call this IMMEDIATELY after each tool execution that's part of an execution plan to mark the step as completed. For filter collection, only call when collectPublisherFilters returns action=collect_complete.",
        parameters: z.object({
          planId: z.string().describe("Plan ID"),
          stepIndex: z.number().describe("Completed step index"),
          stepResult: z.any().describe("Result of the step")
        }),
        execute: async ({ planId, stepIndex, stepResult }) => {
          return await updatePlanProgress({ planId, stepIndex, stepResult });
        }
      },
    },
    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          // Sanitize messages before saving: exclude tool invocation states and non-text content
          const safeResponseMessages = (responseMessages || [])
            .map((m: any) => {
              const text = typeof m.content === 'string' ? m.content : '';
              return { role: m.role, content: text };
            })
            .filter((m: any) => m.content && m.content.length > 0);

          await saveChat({
            id,
            messages: [...coreMessages, ...safeResponseMessages],
            userId: session.user.id,
          });
        } catch (error) {
          console.error("Failed to save chat");
        }
      }
    },
    experimental_telemetry: {
      isEnabled: true,
      functionId: "stream-text",
    },
  });

  return result.toDataStreamResponse({});
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
