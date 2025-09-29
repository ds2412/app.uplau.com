import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const sig = headersList.get('stripe-signature')

    if (!sig) {
      console.error('❌ Brak podpisu Stripe')
      return NextResponse.json({ error: 'Brak podpisu' }, { status: 400 })
    }

    // Weryfikujemy że webhook pochodzi od Stripe
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
    } catch (err) {
      console.error('❌ Błąd weryfikacji webhook:', err)
      return NextResponse.json({ error: 'Błąd weryfikacji' }, { status: 400 })
    }

    console.log('🎯 Otrzymano event:', event.type)

    // Obsługujemy różne typy eventów
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      
      default:
        console.log('ℹ️ Event nie obsługiwany:', event.type)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Błąd webhook:', error)
    return NextResponse.json({ error: 'Błąd serwera' }, { status: 500 })
  }
}

// 🎉 Nowa subskrypcja utworzona
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('🎉 Nowa subskrypcja:', subscription.id)
  
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      status: 'active',
      current_period_start: (subscription as any).current_period_start 
        ? new Date((subscription as any).current_period_start * 1000) 
        : null,
      current_period_end: (subscription as any).current_period_end 
        ? new Date((subscription as any).current_period_end * 1000) 
        : null,
      updated_at: new Date()
    })
    .eq('stripe_customer_id', subscription.customer as string)

  if (error) {
    console.error('❌ Błąd aktualizacji subskrypcji:', error)
  } else {
    console.log('✅ Subskrypcja aktywowana')
  }
}

// 💰 Płatność udana
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('💰 Płatność udana:', invoice.id)
  
  if ((invoice as any).subscription) {
    const subscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string)
    
    const { error } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: new Date((subscription as any).current_period_start * 1000),
        current_period_end: new Date((subscription as any).current_period_end * 1000),
        updated_at: new Date()
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('❌ Błąd odnowienia subskrypcji:', error)
    } else {
      console.log('✅ Subskrypcja odnowiona')
    }
  }
}

// 🔄 Subskrypcja zaktualizowana
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('🔄 Subskrypcja zaktualizowana:', subscription.id)
  
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date((subscription as any).current_period_start * 1000),
      current_period_end: new Date((subscription as any).current_period_end * 1000),
      updated_at: new Date()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('❌ Błąd aktualizacji subskrypcji:', error)
  } else {
    console.log('✅ Subskrypcja zaktualizowana')
  }
}

// ❌ Subskrypcja anulowana
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('❌ Subskrypcja anulowana:', subscription.id)
  
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'cancelled',
      updated_at: new Date()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('❌ Błąd anulowania subskrypcji:', error)
  } else {
    console.log('✅ Subskrypcja anulowana w bazie')
  }
}