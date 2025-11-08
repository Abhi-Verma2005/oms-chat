"use client"

import { ShoppingCart, Plus, Minus, Trash2, CheckCircle, CreditCard } from 'lucide-react'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
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
  const { cartData, message } = data || {}
  const { state: contextCartState, removeItem: contextRemoveItem, updateQuantity: contextUpdateQuantity, clearCart: contextClearCart } = useCart()
  
  // Always use context cart data for display and operations
  const displayCartData = {
    items: contextCartState.items || [],
    totalItems: (contextCartState.items || []).reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: (contextCartState.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0),
    lastUpdated: new Date()
  }

  // Debug logging
  console.log('Cart state debug:', {
    contextCartState: contextCartState.items,
    displayCartData: displayCartData.items,
    cartData: cartData?.items || 'No cartData provided'
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
    <div className="space-y-4 p-4 sm:p-6 bg-[#121212] text-[#E0E0E0]">
      {/* Cart Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg sm:text-xl font-semibold text-[#E0E0E0]">
          Cart ({displayCartData.totalItems})
        </h3>
        
        <div className="flex items-center gap-2">
          {displayCartData.items.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation()
                handleClearCart()
              }}
              className="text-[#A0A0A0] hover:text-[#CD3131] hover:bg-[#2D2D2D]"
              title="Clear cart"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      {displayCartData.items.length === 0 ? (
        <Card className="p-6 sm:p-8 bg-[#2D2D2D] border-[#333333]">
          <div className="text-center text-[#A0A0A0]">
            <ShoppingCart className="size-10 sm:size-12 mx-auto mb-4 opacity-50 text-[#666666]" />
            <p className="text-sm sm:text-base font-medium text-[#E0E0E0]">Your cart is empty</p>
            <p className="text-xs sm:text-sm mt-1 text-[#A0A0A0]">Add publishers to get started</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayCartData.items.map((item) => (
            <Card key={item.id} className="p-3 sm:p-4 bg-[#2D2D2D] border-[#333333] hover:bg-[#333333] transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                {/* Item Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="size-8 sm:size-10 bg-[#007ACC]/20 rounded-full flex items-center justify-center shrink-0 border border-[#569CD6]/30">
                    <span className="text-[#569CD6] font-semibold text-xs sm:text-sm">P</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-[#E0E0E0] truncate text-sm sm:text-base">
                      {item.name}
                    </h4>
                    {item.metadata?.dr && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-[#A0A0A0]">
                          DR {item.metadata.dr}
                        </span>
                        {item.metadata.da && (
                          <>
                            <span className="text-xs text-[#666666]">•</span>
                            <span className="text-xs text-[#A0A0A0]">
                              DA {item.metadata.da}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 flex-shrink-0">
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleQuantityChange(item.id, item.quantity - 1)
                      }}
                      className="size-7 sm:size-8 border-[#333333] bg-[#2D2D2D] text-[#E0E0E0] hover:bg-[#333333] hover:border-[#569CD6]"
                    >
                      <Minus className="size-3" />
                    </Button>
                    
                    <span className="text-sm font-medium w-6 sm:w-8 text-center text-[#E0E0E0]">
                      {item.quantity}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleQuantityChange(item.id, item.quantity + 1)
                      }}
                      className="size-7 sm:size-8 border-[#333333] bg-[#2D2D2D] text-[#E0E0E0] hover:bg-[#333333] hover:border-[#569CD6]"
                    >
                      <Plus className="size-3" />
                    </Button>
                  </div>

                  {/* Price */}
                  <div className="font-semibold text-[#E0E0E0] text-sm sm:text-base min-w-[60px] sm:min-w-[70px] text-right">
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
                    className="size-7 sm:size-8 text-[#A0A0A0] hover:text-[#CD3131] hover:bg-[#2D2D2D]"
                    title="Remove item"
                  >
                    <Trash2 className="size-3.5 sm:size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Checkout Section */}
      {displayCartData.items.length > 0 && (
        <Card className="p-3 sm:p-4 bg-[#2D2D2D] border-[#333333]">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between text-sm sm:text-base">
              <span className="text-sm font-medium text-[#A0A0A0]">Subtotal</span>
              <span className="text-sm sm:text-base text-[#E0E0E0] font-medium">
                {formatPrice(displayCartData.totalPrice)}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm sm:text-base">
              <span className="text-sm font-medium text-[#A0A0A0]">Tax (8%)</span>
              <span className="text-sm sm:text-base text-[#E0E0E0] font-medium">
                {formatPrice(displayCartData.totalPrice * 0.08)}
              </span>
            </div>
            
            <div className="border-t border-[#333333] pt-3">
              <div className="flex items-center justify-between">
                <span className="text-base sm:text-lg font-semibold text-[#E0E0E0]">Total</span>
                <span className="text-lg sm:text-xl font-bold text-[#569CD6]">
                  {formatPrice(displayCartData.totalPrice * 1.08)}
                </span>
              </div>
            </div>

            <Button
              onClick={onDoneAddingToCart || (() => {})}
              className="w-full bg-[#569CD6] hover:bg-[#00C0C0] text-white py-2.5 sm:py-3 px-4 rounded-md text-sm sm:text-base font-medium transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              size="lg"
            >
              <CheckCircle className="size-4" />
              <span className="whitespace-nowrap">Proceed to Checkout</span>
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
