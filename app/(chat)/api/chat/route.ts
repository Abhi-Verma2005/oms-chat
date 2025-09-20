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
} from "../../../../ai/actions";
import { auth } from "../../../../app/(auth)/auth";
import {
  deleteChatById,
  getChatById,
  saveChat,
} from "../../../../db/queries";
import { generateUUID } from "../../../../lib/utils";

export async function POST(request: Request) {
  const { id, messages, userInfo }: { 
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
    const basePrompt = `\n
        - you help users with backlinking and publisher discovery for SEO and content marketing!
        - keep your responses concise and helpful.
        - after every tool call, show the results to the user in a clear format.
        - today's date is ${new Date().toLocaleDateString()}.
        - ask follow up questions to help users find the right publishers for their needs.
        - help users understand publisher metrics like DR (Domain Rating), DA (Domain Authority), and spam scores.
        - here's the optimal flow for publisher discovery:
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
          const result = await viewCart();
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
    },
    onFinish: async ({ responseMessages }) => {
      if (session.user && session.user.id) {
        try {
          await saveChat({
            id,
            messages: [...coreMessages, ...responseMessages],
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
