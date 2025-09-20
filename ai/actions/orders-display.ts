"use server";

import { z } from "zod";
import { generateObject } from "ai";
import { eq, desc, and } from "drizzle-orm";
import { openaiFlashModel } from "../index";
import { external_db } from "@/lib/external-db";
import { orders } from "@/lib/drizzle-external/schema";

// Define input schema for the orders display tool
const ordersDisplaySchema = z.object({
  userId: z.string().optional().describe("User ID to fetch orders for (optional, defaults to current user)"),
  limit: z.number().optional().default(10).describe("Number of orders to fetch (default: 10)"),
  status: z.enum(["PENDING", "PAID", "FAILED", "CANCELLED"]).optional().describe("Filter by order status"),
});

export interface OrderData {
  id: string;
  userId: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersDisplayResult {
  success: boolean;
  message: string;
  orders: OrderData[];
  summary: {
    totalOrders: number;
    totalAmount: number;
    statusBreakdown: Record<string, number>;
    recentOrders: number;
  };
  error?: string;
}

export async function displayOrdersFunction(params: z.infer<typeof ordersDisplaySchema>): Promise<OrdersDisplayResult> {
  try {
    const { userId, limit = 10, status } = params;

    // Build query conditions
    const conditions = [];
    if (userId) {
      conditions.push(eq(orders.userId, userId));
    }
    if (status) {
      conditions.push(eq(orders.status, status));
    }

    // Fetch orders from external database
    let query = external_db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(limit);

    // Apply conditions if any
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const fetchedOrders = await query;

    // Transform orders data
    const ordersData: OrderData[] = fetchedOrders.map(order => ({
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount,
      currency: order.currency,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    // Calculate summary statistics
    const totalOrders = ordersData.length;
    const totalAmount = ordersData.reduce((sum, order) => sum + order.totalAmount, 0);
    
    const statusBreakdown = ordersData.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count recent orders (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentOrders = ordersData.filter(order => 
      new Date(order.createdAt) > thirtyDaysAgo
    ).length;

    // Generate AI response
    const { object: aiResponse } = await generateObject({
      model: openaiFlashModel,
      prompt: `Generate a friendly summary message for displaying ${totalOrders} orders with a total value of $${(totalAmount / 100).toFixed(2)}. 
               Status breakdown: ${JSON.stringify(statusBreakdown)}. 
               ${recentOrders} orders were placed in the last 30 days.
               The user is viewing their order history.`,
      schema: z.object({
        message: z.string().describe("Friendly summary message about the orders"),
      })
    });

    return {
      success: true,
      message: aiResponse.message,
      orders: ordersData,
      summary: {
        totalOrders,
        totalAmount,
        statusBreakdown,
        recentOrders,
      }
    };

  } catch (error) {
    console.error('Error fetching orders:', error);
    
    const { object: errorResponse } = await generateObject({
      model: openaiFlashModel,
      prompt: `Generate a friendly error message for when order fetching fails. The error is: ${error instanceof Error ? error.message : "Unknown error"}`,
      schema: z.object({
        message: z.string().describe("Friendly error message"),
      })
    });

    return {
      success: false,
      message: errorResponse.message,
      orders: [],
      summary: {
        totalOrders: 0,
        totalAmount: 0,
        statusBreakdown: {},
        recentOrders: 0,
      },
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

// Export tool configuration
export const ordersDisplayTool = {
  name: "display_orders",
  description: "Display user orders from the database with filtering and summary statistics",
  parameters: ordersDisplaySchema,
  execute: displayOrdersFunction
};
