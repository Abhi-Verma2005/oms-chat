import { generateObject } from "ai";
import { z } from "zod";

import { openaiFlashModel } from "../index";

// Types for cart items
export interface CartItem {
  id: string;
  type: "publisher" | "product";
  name: string;
  price: number;
  quantity: number;
  addedAt: Date;
  metadata?: {
    publisherId?: string;
    website?: string;
    niche?: string[];
    dr?: number;
    da?: number;
  };
}

export interface CartData {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  lastUpdated: Date;
}

// Helper function to generate cart ID
function generateCartId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to calculate totals
function calculateTotals(items: CartItem[]) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  return { totalItems, totalPrice };
}

// Global cart state that can be accessed by AI actions
let globalCartState: CartItem[] = [];

// Function to sync cart state from client
export function syncCartState(items: CartItem[]) {
  globalCartState = [...items];
}

// Function to get current cart state
export function getCurrentCartState(): CartItem[] {
  return [...globalCartState];
}

export async function addToCart({
  type,
  name,
  price,
  quantity = 1,
  metadata
}: {
  type: "publisher" | "product";
  name: string;
  price: number;
  quantity?: number;
  metadata?: {
    publisherId?: string;
    website?: string;
    niche?: string[];
    dr?: number;
    da?: number;
  };
}) {
  try {
    // Use current global cart state
    const currentCart = getCurrentCartState();
    
    // Check if item already exists in cart
    const existingItemIndex = currentCart.findIndex(
      item => item.name === name && item.type === type
    );

    let updatedItems: CartItem[];

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      updatedItems = [...currentCart];
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: updatedItems[existingItemIndex].quantity + quantity,
        addedAt: new Date()
      };
    } else {
      // Add new item
      const newItem: CartItem = {
        id: generateCartId(),
        type,
        name,
        price,
        quantity,
        addedAt: new Date(),
        metadata
      };
      updatedItems = [...currentCart, newItem];
    }

    // Update global cart state
    globalCartState = updatedItems;
    const totals = calculateTotals(updatedItems);

    // Generate AI response
    const { object: response } = await generateObject({
      model: openaiFlashModel,
      prompt: `Generate a confirmation message for adding ${quantity} ${type}(s) named "${name}" at $${price} each to the cart. The cart now has ${totals.totalItems} items totaling $${totals.totalPrice.toFixed(2)}.`,
      schema: z.object({
        message: z.string().describe("Friendly confirmation message"),
        cartSummary: z.object({
          itemName: z.string(),
          quantity: z.number(),
          price: z.number(),
          totalItems: z.number(),
          totalPrice: z.number()
        }).describe("Summary of the cart operation")
      })
    });

    return {
      success: true,
      message: response.message,
      cartSummary: response.cartSummary,
      cartData: {
        items: updatedItems,
        ...totals,
        lastUpdated: new Date()
      }
    };
  } catch (error) {
    console.error('Error adding to cart:', error);
    return {
      success: false,
      message: "Failed to add item to cart. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function removeFromCart({
  itemId
}: {
  itemId: string;
}) {
  try {
    // Use current global cart state
    const currentCart = getCurrentCartState();
    const itemIndex = currentCart.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return {
        success: false,
        message: "Item not found in cart"
      };
    }

    const removedItem = currentCart[itemIndex];
    const updatedItems = currentCart.filter(item => item.id !== itemId);
    
    // Update global cart state
    globalCartState = updatedItems;
    const totals = calculateTotals(updatedItems);

    // Generate AI response
    const { object: response } = await generateObject({
      model: openaiFlashModel,
      prompt: `Generate a confirmation message for removing "${removedItem.name}" from the cart. The cart now has ${totals.totalItems} items totaling $${totals.totalPrice.toFixed(2)}.`,
      schema: z.object({
        message: z.string().describe("Friendly confirmation message"),
        removedItem: z.object({
          name: z.string(),
          quantity: z.number(),
          price: z.number()
        }).describe("Details of the removed item")
      })
    });

    return {
      success: true,
      message: response.message,
      removedItem: response.removedItem,
      cartData: {
        items: updatedItems,
        ...totals,
        lastUpdated: new Date()
      }
    };
  } catch (error) {
    console.error('Error removing from cart:', error);
    return {
      success: false,
      message: "Failed to remove item from cart. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function viewCart(clientCartState?: Array<{
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
}>) {
  try {
    let currentCart: CartItem[] = [];
    
    // If client cart state is provided, use it (server-side with client data)
    if (clientCartState && clientCartState.length > 0) {
      currentCart = clientCartState.map(item => ({
        ...item,
        addedAt: new Date(item.addedAt)
      }));
    } else {
      // Fall back to global cart state
      currentCart = getCurrentCartState();
    }
    
    const totals = calculateTotals(currentCart);

    // Generate AI response
    const { object: response } = await generateObject({
      model: openaiFlashModel,
      prompt: `Generate a summary of the shopping cart with ${currentCart.length} items, totaling ${totals.totalItems} units and $${totals.totalPrice.toFixed(2)}. Include a brief description of each item.`,
      schema: z.object({
        message: z.string().describe("Friendly cart summary message"),
        summary: z.object({
          totalItems: z.number(),
          totalQuantity: z.number(),
          totalPrice: z.number(),
          isEmpty: z.boolean()
        }).describe("Cart summary statistics"),
        itemDescriptions: z.array(z.object({
          name: z.string(),
          type: z.string(),
          quantity: z.number(),
          price: z.number(),
          total: z.number()
        })).describe("Description of each cart item")
      })
    });

    return {
      success: true,
      message: response.message,
      summary: response.summary,
      itemDescriptions: response.itemDescriptions,
      cartData: {
        items: currentCart,
        ...totals,
        lastUpdated: new Date()
      }
    };
  } catch (error) {
    console.error('Error viewing cart:', error);
    return {
      success: false,
      message: "Failed to retrieve cart. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function clearCart() {
  try {
    // Use current global cart state
    const currentCart = getCurrentCartState();
    const itemCount = currentCart.length;
    
    // Clear global cart state
    globalCartState = [];

    // Generate AI response
    const { object: response } = await generateObject({
      model: openaiFlashModel,
      prompt: `Generate a confirmation message for clearing the cart that contained ${itemCount} items.`,
      schema: z.object({
        message: z.string().describe("Friendly confirmation message"),
        clearedItems: z.number().describe("Number of items that were cleared")
      })
    });

    return {
      success: true,
      message: response.message,
      clearedItems: response.clearedItems,
      cartData: {
        items: [],
        totalItems: 0,
        totalPrice: 0,
        lastUpdated: new Date()
      }
    };
  } catch (error) {
    console.error('Error clearing cart:', error);
    return {
      success: false,
      message: "Failed to clear cart. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function updateCartItemQuantity({
  itemId,
  quantity
}: {
  itemId: string;
  quantity: number;
}) {
  try {
    // Use current global cart state
    const currentCart = getCurrentCartState();
    const itemIndex = currentCart.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return {
        success: false,
        message: "Item not found in cart"
      };
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      return await removeFromCart({ itemId });
    }

    const updatedItems = [...currentCart];
    const oldQuantity = updatedItems[itemIndex].quantity;
    
    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      quantity,
      addedAt: new Date()
    };

    // Update global cart state
    globalCartState = updatedItems;

    const totals = calculateTotals(updatedItems);

    // Generate AI response
    const { object: response } = await generateObject({
      model: openaiFlashModel,
      prompt: `Generate a confirmation message for updating the quantity of "${updatedItems[itemIndex].name}" from ${oldQuantity} to ${quantity}. The cart now has ${totals.totalItems} items totaling $${totals.totalPrice.toFixed(2)}.`,
      schema: z.object({
        message: z.string().describe("Friendly confirmation message"),
        updatedItem: z.object({
          name: z.string(),
          oldQuantity: z.number(),
          newQuantity: z.number(),
          price: z.number()
        }).describe("Details of the updated item")
      })
    });

    return {
      success: true,
      message: response.message,
      updatedItem: response.updatedItem,
      cartData: {
        items: updatedItems,
        ...totals,
        lastUpdated: new Date()
      }
    };
  } catch (error) {
    console.error('Error updating cart item:', error);
    return {
      success: false,
      message: "Failed to update cart item. Please try again.",
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
