"use client"

import { CheckCircle, ShoppingCart, Loader2 } from 'lucide-react'
import React, { useState } from 'react'

import { Button } from '@/components/ui/button'

interface DoneAddingToCartButtonProps {
  onDoneAdding: () => void
  itemCount: number
  totalAmount: number
  disabled?: boolean
}

export default function DoneAddingToCartButton({
  onDoneAdding,
  itemCount,
  totalAmount,
  disabled = false
}: DoneAddingToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  if (itemCount === 0) {
    return null
  }

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
            <ShoppingCart className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              Ready to Checkout?
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {itemCount} item{itemCount !== 1 ? 's' : ''} • {formatPrice(totalAmount)}
            </p>
          </div>
        </div>
        
        <Button
          onClick={async () => {
            setIsLoading(true)
            try {
              await onDoneAdding()
            } finally {
              setIsLoading(false)
            }
          }}
          disabled={disabled || isLoading}
          className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          {isLoading ? "Processing..." : "Done Adding to Cart"}
        </Button>
      </div>
      
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Click &quot;Done Adding to Cart&quot; to proceed with payment processing
      </p>
    </div>
  )
}
