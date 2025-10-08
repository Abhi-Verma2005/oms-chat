"use client"

import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, CreditCard } from 'lucide-react'
import React from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import DoneAddingToCartButton from './done-adding-to-cart-button'
import { useCart } from '../../contexts/cart-context'

interface CartItem {
  id: string
  type: "publisher" | "product"
  name: string
  price: number
  quantity: number
  addedAt: Date
  metadata?: {
    publisherId?: string
    website?: string
    niche?: string[]
    dr?: number
    da?: number
  }
}

interface CartData {
  items: CartItem[]
  totalItems: number
  totalPrice: number
  lastUpdated: Date
}

interface CartManagementResultsProps {
  data: {
    success: boolean
    message: string
    cartData: CartData
    cartSummary?: {
      itemName: string
      quantity: number
      price: number
      totalItems: number
      totalPrice: number
    }
    removedItem?: {
      name: string
      quantity: number
      price: number
    }
    summary?: {
      totalItems: number
      totalQuantity: number
      totalPrice: number
      isEmpty: boolean
    }
    itemDescriptions?: Array<{
      name: string
      type: string
      quantity: number
      price: number
      total: number
    }>
    clearedItems?: number
    updatedItem?: {
      name: string
      oldQuantity: number
      newQuantity: number
      price: number
    }
  }
  onAddToCart?: (item: { type: "publisher" | "product", name: string, price: number, metadata?: any }) => void
  onRemoveFromCart?: (itemId: string) => void
  onUpdateQuantity?: (itemId: string, quantity: number) => void
  onClearCart?: () => void
  onProceedToPayment?: () => void
  onDoneAddingToCart?: () => void
}

export default function CartManagementResults({ 
  data, 
  onAddToCart, 
  onRemoveFromCart, 
  onUpdateQuantity, 
  onClearCart,
  onProceedToPayment,
  onDoneAddingToCart 
}: CartManagementResultsProps) {
  const { cartData, message } = data
  const { state: contextCartState, removeItem: contextRemoveItem, updateQuantity: contextUpdateQuantity, clearCart: contextClearCart } = useCart()
  
  // Use context cart data if available, otherwise fall back to AI cart data
  const displayCartData = contextCartState.items.length > 0 ? {
    items: contextCartState.items,
    totalItems: contextCartState.items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: contextCartState.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    lastUpdated: new Date()
  } : cartData

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      contextRemoveItem(itemId)
    } else {
      contextUpdateQuantity(itemId, newQuantity)
    }
  }
  
  const handleRemoveItem = (itemId: string) => {
    contextRemoveItem(itemId)
  }
  
  const handleClearCart = () => {
    contextClearCart()
  }

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {data.success && (
        <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="text-green-800 dark:text-green-200 text-sm font-medium">
            {message}
          </span>
        </div>
      )}

      {/* Cart Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Cart ({displayCartData.totalItems})
        </h3>
        
        {displayCartData.items.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCart}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Cart Items */}
      {displayCartData.items.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
          <p>Your cart is empty</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayCartData.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div className="flex items-center space-x-3 flex-1">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs">P</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate text-xs">
                    {item.name}
                  </h4>
                  {item.metadata?.dr && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      DR {item.metadata.dr}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                    className="h-6 w-6 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  
                  <span className="text-sm font-medium w-6 text-center">
                    {item.quantity}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <div className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
                  {formatPrice(item.price * item.quantity)}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checkout Section */}
      {displayCartData.items.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatPrice(displayCartData.totalPrice * 1.08)}
            </span>
          </div>

          <Button
            onClick={onDoneAddingToCart || (() => {})}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Proceed to Checkout
          </Button>
        </div>
      )}
    </div>
  )
}
