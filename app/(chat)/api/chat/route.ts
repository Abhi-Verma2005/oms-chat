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
import { generateChatTitleFromMessages } from "../../../../ai/title";
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
          - IMPORTANT: After showing publishers, immediately suggest adding selected publishers to cart by saying "Would you like me to add any of these publishers to your cart? Just let me know which ones you're interested in!"
        - today's date is ${new Date().toLocaleDateString()}.
        - ask follow up questions to help users find the right publishers for their needs.
        - help users understand publisher metrics like DR (Domain Rating), DA (Domain Authority), and spam scores.
        - here's the optimal flow for publisher discovery and checkout:
          - when users ask to browse publishers without filters, use collectPublisherFilters tool to guide them through setting up price and DR/DA ranges
          - collectPublisherFilters tool shows interactive modals in chat - use it to collect user preferences step by step
          - after user sets price range, continue with DR/DA range collection
          - after user sets DR/DA ranges, proceed to browse publishers with all collected filters
          - browse publishers with optional filters (niche, country, DR range, type)
          - search for specific publishers or niches
          - view detailed publisher information
          - help users understand pricing and requirements
          - CART AND CHECKOUT FLOW (CRITICAL):
            * After browsePublishers is called, proactively suggest adding publishers to cart
            * When user mentions specific publishers or says things like "add these" or "add to cart", use addToCart tool for each selected publisher
            * After items are added to cart, ALWAYS call viewCart tool to show the user their current cart
            * When showing the cart, ask the user: "Would you like to edit anything in your cart, or are you ready to proceed to checkout?"
            * If user says they're done or ready to checkout, call processPayment tool with the current cart items
            * If user wants to edit the cart, wait for their changes and then show cart again
            * Once processPayment is called, the Stripe payment component will be displayed
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
        - IMPORTANT: After completing ANY tool execution that's part of an execution plan, you MUST call updatePlanProgress to mark that step as completed
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

  // RAG: Retrieve relevant context from conversation history
  let ragContext = '';
  if (session?.user?.id) {
    try {
      const lastMessage = coreMessages[coreMessages.length - 1];
      if (lastMessage?.role === 'user' && lastMessage.content && typeof lastMessage.content === 'string') {
        // Import RAG retrieval service
        const { ragRetrieval } = await import('@/lib/rag/retrieval');
        
        const ragResults = await ragRetrieval.retrieveContext(
          session.user.id,
          lastMessage.content,
          {
            topK: 5,
            minScore: 0.3, // Lower threshold for better recall (was 0.7 - too strict!)
            timeout: 5000, // 5 second timeout
          }
        );

        if (ragResults.length > 0) {
          ragContext = ragRetrieval.buildContextString(ragResults);
          console.log(`[RAG] Injected ${ragResults.length} relevant contexts into system prompt`);
        }
      }
    } catch (error) {
      console.warn('[RAG] Retrieval failed, continuing without context:', error);
      // Continue without RAG context - don't block chat
    }
  }

  const result = await streamText({
    model: openaiProModel,
    system: generateSystemPrompt(userInfo || null) + ragContext,
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
        description: "Browse and search for publishers/websites for backlinking opportunities",
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
        description: "Collect filters from user through interactive modals before browsing publishers. This tool shows modals in chat for better UX. Usually called as part of an execution plan.",
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
        description: "Update plan progress after completing a step. Call this IMMEDIATELY after each tool execution that's part of an execution plan to mark the step as completed.",
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
          // Heuristic: generate title early when conversation is short (avoids recomputing later)
          let title: string | undefined = undefined;
          try {
            const totalMessages = coreMessages.length + responseMessages.length;
            if (totalMessages <= 4) {
              title = await generateChatTitleFromMessages([
                ...coreMessages,
                ...responseMessages,
              ]);
            }
          } catch {
            // best-effort title generation; ignore errors
          }

          await saveChat({
            id,
            messages: [...coreMessages, ...responseMessages],
            userId: session.user.id,
            title,
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
