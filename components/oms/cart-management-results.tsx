"use client"

import React from 'react'
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
            <ShoppingCart className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Shopping Cart
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {displayCartData.totalItems} items • Last updated {formatDate(displayCartData.lastUpdated)}
            </p>
          </div>
        </div>
        
        {displayCartData.items.length > 0 && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCart}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear Cart
            </Button>
          </div>
        )}
      </div>

      {/* Cart Items */}
      {displayCartData.items.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Your cart is empty
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Add publishers or products to get started with your backlinking campaign
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayCartData.items.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          item.type === 'publisher' 
                            ? 'bg-blue-100 dark:bg-blue-900/30' 
                            : 'bg-green-100 dark:bg-green-900/30'
                        }`}>
                          {item.type === 'publisher' ? (
                            <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                              P
                            </span>
                          ) : (
                            <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
                              PR
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {item.name}
                          </h4>
                          <Badge variant="secondary" className="text-xs">
                            {item.type}
                          </Badge>
                        </div>
                        
                        {item.metadata && (
                          <div className="flex items-center space-x-2 mt-1">
                            {item.metadata.website && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {item.metadata.website}
                              </span>
                            )}
                            {item.metadata.dr && (
                              <Badge variant="outline" className="text-xs">
                                DR {item.metadata.dr}
                              </Badge>
                            )}
                            {item.metadata.niche && item.metadata.niche.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {item.metadata.niche[0]}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Added {formatDate(item.addedAt)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatPrice(item.price)} each
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cart Summary */}
      {displayCartData.items.length > 0 && (
        <Card className="bg-gray-50 dark:bg-gray-800/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Order Summary
              </h4>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Items ({displayCartData.totalItems})</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatPrice(displayCartData.totalPrice)}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Taxes</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatPrice(displayCartData.totalPrice * 0.08)}
                </span>
              </div>
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Total</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatPrice(displayCartData.totalPrice * 1.08)}
                  </span>
                </div>
              </div>
            </div>

            {/* Done Adding to Cart Button */}
            <DoneAddingToCartButton
              onDoneAdding={onDoneAddingToCart || (() => {})}
              itemCount={displayCartData.totalItems}
              totalAmount={displayCartData.totalPrice * 1.08}
            />
            
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
              Secure payment powered by Stripe
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cart Statistics */}
      {data.summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.summary.totalItems}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Unique Items
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.summary.totalQuantity}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total Quantity
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatPrice(data.summary.totalPrice)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total Value
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
