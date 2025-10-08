import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
})

function formatAmountForStripe(amount: number, currency: string): number {
  // Convert dollars to cents for Stripe
  return Math.round(amount * 100)
}

export async function POST(request: Request) {
  try {
    const { amount, currency = 'USD', items } = await request.json()
    
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Items are required' }, { status: 400 })
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: formatAmountForStripe(amount, currency),
      currency: String(currency).toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        items: JSON.stringify(items),
        orderType: 'cart_purchase',
      }
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (e: any) {
    console.error('Payment intent creation error:', e)
    return NextResponse.json({ 
      error: e?.message || 'Failed to create payment intent' 
    }, { status: 500 })
  }
}
