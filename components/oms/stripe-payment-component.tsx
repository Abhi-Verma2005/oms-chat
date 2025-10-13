"use client"

import { Elements, useElements, useStripe, PaymentElement } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { CheckCircle, CreditCard, Lock, Shield, AlertCircle } from 'lucide-react'
import React, { useState, useEffect, useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 
  'pk_test_51JZxrABomEWVJXWqaCbeK8BD2OpmjbjxLdewux1wd9lt2wMkfxjCEVa5Zl6qZoBxF84EazcydEaKgkOhVbTehBaU001Jlul5lr'
)

interface StripePaymentComponentProps {
  amount: number
  currency?: string
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
  onPaymentSuccess?: (paymentIntent: any) => void
  onPaymentError?: (error: any) => void
  onCancel?: () => void
}

export default function StripePaymentComponent({
  amount,
  currency = 'USD',
  items,
  onPaymentSuccess,
  onPaymentError,
  onCancel
}: StripePaymentComponentProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const update = () => setIsDark(root.classList.contains('dark'))
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Track the amount for which we created the current payment intent
  const [paymentIntentAmount, setPaymentIntentAmount] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false
    async function createIntent() {
      if (!amount || amount <= 0) {
        console.log('Stripe: Invalid amount', amount)
        setClientSecret(null)
        setPaymentIntentAmount(null)
        return
      }
      
      // Only recreate payment intent if amount has changed significantly
      const amountChanged = paymentIntentAmount === null || Math.abs(paymentIntentAmount - amount) > 0.01;
      
      if (clientSecret && !amountChanged) {
        console.log('Stripe: Using existing payment intent for amount:', amount)
        return
      }
      
      console.log('Stripe: Creating payment intent for amount:', amount)
      setLoading(true)
      setError(null)
      
      try {
        const res = await fetch('/api/payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            amount: Math.round(amount * 100), // Convert to cents
            currency, 
            items 
          }),
        })
        
        console.log('Stripe: Payment intent response status:', res.status)
        
        if (!res.ok) {
          const errorData = await res.json()
          console.error('Stripe: Payment intent error:', errorData)
          throw new Error(errorData.error || 'Failed to create payment intent')
        }
        
        const data = await res.json()
        console.log('Stripe: Payment intent created:', data.clientSecret ? 'Success' : 'No client secret')
        
        if (!ignore) {
          setClientSecret(data.clientSecret)
          setPaymentIntentAmount(amount)
        }
      } catch (err: any) {
        console.error('Stripe: Error creating payment intent:', err)
        if (!ignore) setError(err.message || 'Error creating payment session')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    createIntent()
    return () => { ignore = true }
  }, [amount, currency, clientSecret, paymentIntentAmount]) // Include all dependencies but with logic to prevent excessive calls

  const options = useMemo(() => (
    clientSecret
      ? {
          clientSecret,
          appearance: {
            theme: (isDark ? 'night' : 'flat') as any,
            variables: {
              colorPrimary: '#00BCD4', // Teal accent color from screenshot
              colorText: isDark ? '#FFFFFF' : '#1E1E1E',
              colorBackground: isDark ? '#1E1E1E' : '#FFFFFF',
              colorDanger: '#EF4444',
              fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system',
              borderRadius: '8px',
            },
            rules: {
              '.Input, .Input:focus': {
                border: '1px solid',
                borderColor: isDark ? '#404040' : '#E5E7EB',
                backgroundColor: isDark ? '#2D2D2D' : '#FFFFFF',
                color: isDark ? '#FFFFFF' : '#1E1E1E',
              },
              '.Label': {
                color: isDark ? '#A0A0A0' : '#737373',
              },
              '.Tab, .Pill': {
                backgroundColor: isDark ? '#2D2D2D' : '#FFFFFF',
                border: '1px solid',
                borderColor: isDark ? '#404040' : '#E5E7EB',
              },
              '.Tab--selected, .Pill--selected': {
                backgroundColor: isDark ? '#1E1E1E' : '#F3F4F6',
                borderColor: '#00BCD4',
                color: isDark ? '#FFFFFF' : '#1E1E1E',
              },
              '.Error': {
                color: '#EF4444',
              },
            },
          },
        }
      : undefined
  ), [clientSecret, isDark])

  if (error && !clientSecret) {
    return (
      <Card className="border-red-200 dark:border-red-800">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Payment Error</span>
          </div>
          <p className="text-red-600 dark:text-red-400 text-sm mt-2">{error}</p>
          <div className="mt-4 space-y-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Debug info: Amount: ${amount}, Items: {items.length}
            </p>
            <Button 
              variant="outline" 
              onClick={onCancel}
              className="mt-2"
            >
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <span>Complete Payment</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Summary */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Order Summary</h4>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-gray-900 dark:text-gray-100">
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
              <div className="flex justify-between font-medium">
                <span className="text-gray-900 dark:text-gray-100">Total</span>
                <span className="text-gray-900 dark:text-gray-100">
                  ${amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        {!clientSecret ? (
          <div className="text-center py-8">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {loading ? 'Creating payment session…' : 'Preparing payment…'}
            </div>
            {error && (
              <div className="mt-2 text-xs text-red-500">
                Error: {error}
              </div>
            )}
          </div>
        ) : (
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm 
              amount={amount}
              onPaymentSuccess={onPaymentSuccess}
              onPaymentError={onPaymentError}
              onCancel={onCancel}
            />
          </Elements>
        )}

        {/* Security Notice */}
        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
          <Shield className="h-4 w-4" />
          <span>Your payment information is secure and encrypted</span>
        </div>
      </CardContent>
    </Card>
  )
}

function PaymentForm({ 
  amount, 
  onPaymentSuccess, 
  onPaymentError, 
  onCancel 
}: {
  amount: number
  onPaymentSuccess?: (paymentIntent: any) => void
  onPaymentError?: (error: any) => void
  onCancel?: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Debug Stripe initialization
  useEffect(() => {
    console.log('PaymentForm: Stripe initialized:', !!stripe)
    console.log('PaymentForm: Elements initialized:', !!elements)
  }, [stripe, elements])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    
    if (!stripe || !elements) return
    
    setLoading(true)
    
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/payment-success',
      },
      redirect: 'if_required',
    })
    
    if (error) {
      setError(error.message || 'Payment failed')
      onPaymentError?.(error)
    } else if (paymentIntent?.status === 'succeeded') {
      setSuccess('Payment successful!')
      onPaymentSuccess?.(paymentIntent)
    }
    
    setLoading(false)
  }

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400 mb-2">
          <CheckCircle className="h-6 w-6" />
          <span className="font-medium">{success}</span>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
          Your order has been placed successfully.
        </p>
        <div className="flex space-x-2 justify-center">
          <Button 
            onClick={() => window.location.href = '/orders'}
            className="bg-violet-600 hover:bg-violet-700"
          >
            View Orders
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/publishers'}
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <PaymentElement />
      </div>
      
      {error && (
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="flex space-x-3">
        <Button 
          type="submit" 
          disabled={loading || !stripe}
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
        >
          {loading ? 'Processing…' : `Pay $${amount.toFixed(2)}`}
        </Button>
        
        <Button 
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        You&apos;ll be charged ${amount.toFixed(2)}, including applicable taxes
      </div>
    </form>
  )
}
