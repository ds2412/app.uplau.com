import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { planId, billingCycle, userId, userEmail } = await request.json()

    // Validate input
    if (!planId || !billingCycle || !userId || !userEmail) {
      return NextResponse.json(
        { error: 'Brakuje wymaganych danych' },
        { status: 400 }
      )
    }

    // Plan pricing mapping
    const planPricing = {
      starter: { monthly: 999, yearly: 9999 }, // w groszach
      pro: { monthly: 2999, yearly: 29999 },
      business: { monthly: 9999, yearly: 99999 },
    }

    const pricing = planPricing[planId as keyof typeof planPricing]
    if (!pricing) {
      return NextResponse.json(
        { error: 'Nieprawidłowy plan' },
        { status: 400 }
      )
    }

    // Create or retrieve Stripe customer
    let customer
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0]
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          supabase_user_id: userId,
        },
      })
    }

    // Create Stripe product and price if they don't exist
    let product
    try {
      product = await stripe.products.retrieve(`${planId}_plan`)
    } catch {
      product = await stripe.products.create({
        id: `${planId}_plan`,
        name: `${planId.toUpperCase()} Plan`,
        description: `${planId} subscription plan`,
      })
    }

    let price
    const priceId = `${planId}_${billingCycle}`
    try {
      price = await stripe.prices.retrieve(priceId)
    } catch {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: pricing[billingCycle as keyof typeof pricing],
        currency: 'pln',
        recurring: {
          interval: billingCycle === 'monthly' ? 'month' : 'year',
        },
      })
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.nextUrl.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/register/payment?canceled=true`,
      metadata: {
        supabase_user_id: userId,
        plan_id: planId,
        billing_cycle: billingCycle,
      },
    })

    // Save subscription info to our database (pending status)
    await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_customer_id: customer.id,
        status: 'pending',
        plan_id: planId,
        billing_cycle: billingCycle,
        payment_method: 'card',
      })

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
    })

  } catch (error) {
    console.error('Błąd tworzenia subskrypcji:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas tworzenia subskrypcji' },
      { status: 500 }
    )
  }
}