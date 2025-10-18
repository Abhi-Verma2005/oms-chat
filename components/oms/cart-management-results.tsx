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
  
  // Always use context cart data for display and operations
  const displayCartData = {
    items: contextCartState.items,
    totalItems: contextCartState.items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: contextCartState.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    lastUpdated: new Date()
  }

  // Debug logging
  console.log('Cart state debug:', {
    contextCartState: contextCartState.items,
    displayCartData: displayCartData.items,
    cartData: cartData.items
  })

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
    console.log('Quantity change requested:', { itemId, newQuantity })
    console.log('Current context cart state:', contextCartState.items)
    console.log('Available context functions:', { contextRemoveItem, contextUpdateQuantity })
    
    if (newQuantity < 1) {
      console.log('Removing item due to quantity < 1')
      contextRemoveItem(itemId)
    } else {
      console.log('Updating quantity')
      contextUpdateQuantity(itemId, newQuantity)
    }
  }
  
  const handleRemoveItem = (itemId: string) => {
    console.log('Remove item requested:', itemId)
    contextRemoveItem(itemId)
  }
  
  const handleClearCart = () => {
    console.log('Clear cart requested')
    contextClearCart()
  }

  return (
    <div className="space-y-4 p-6">
      {/* Cart Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-foreground">Cart ({displayCartData.totalItems})</h3>
        
        <div className="flex items-center gap-2">
          {/* Test button to check if context functions work */}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              console.log('Test button clicked - context functions:', { contextRemoveItem, contextUpdateQuantity, contextClearCart })
              console.log('Current context state:', contextCartState)
            }}
            className="text-xs"
          >
            Test
          </Button>
          
          {displayCartData.items.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                handleClearCart()
              }}
              className="text-muted-foreground hover:text-destructive"
              title="Clear cart"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      {displayCartData.items.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <ShoppingCart className="size-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm font-medium">Your cart is empty</p>
            <p className="text-xs mt-1">Add publishers to get started</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayCartData.items.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-center gap-4">
                {/* Item Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="size-10 bg-muted rounded-full flex items-center justify-center shrink-0">
                    <span className="text-foreground font-semibold text-sm">P</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">
                      {item.name}
                    </h4>
                    {item.metadata?.dr && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          DR {item.metadata.dr}
                        </span>
                        {item.metadata.da && (
                          <>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              DA {item.metadata.da}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleQuantityChange(item.id, item.quantity - 1)
                      }}
                      className="size-8 bg-card border-border hover:bg-muted"
                    >
                      <Minus className="size-3" />
                    </Button>
                    
                    <span className="text-sm font-medium w-8 text-center">
                      {item.quantity}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleQuantityChange(item.id, item.quantity + 1)
                      }}
                      className="size-8 bg-card border-border hover:bg-muted"
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>

                  {/* Price */}
                  <div className="font-semibold text-foreground text-sm min-w-[70px] text-right">
                    {formatPrice(item.price * item.quantity)}
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveItem(item.id)
                    }}
                    className="size-8 text-muted-foreground hover:text-destructive"
                    title="Remove item"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Checkout Section */}
      {displayCartData.items.length > 0 && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
              <span className="text-sm text-foreground">
                {formatPrice(displayCartData.totalPrice)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Tax (8%)</span>
              <span className="text-sm text-foreground">
                {formatPrice(displayCartData.totalPrice * 0.08)}
              </span>
            </div>
            
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">
                  {formatPrice(displayCartData.totalPrice * 1.08)}
                </span>
              </div>
            </div>

            <Button
              onClick={onDoneAddingToCart || (() => {})}
              className="w-full md:w-auto self-start bg-accent hover:bg-accent/90 text-white py-3 px-5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              size="lg"
            >
              <CheckCircle className="size-4" />
              Proceed to Checkout
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
