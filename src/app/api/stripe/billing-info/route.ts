import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID jest wymagany' },
        { status: 400 }
      )
    }

    // Pobierz NAJNOWSZĄ subskrypcję z Supabase (użyj admin client, aby ominąć RLS)
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, plan_id, status, billing_cycle, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !subscription?.stripe_customer_id) {
      return NextResponse.json({
        plan: 'free',
        status: 'active',
        billing_cycle: 'monthly',
        payment_method: null
      })
    }

    // Pobierz informacje o customer z Stripe
    const customer = await stripe.customers.retrieve(subscription.stripe_customer_id)
    
    let paymentMethod = null
    
    if (customer && !customer.deleted) {
      // Pobierz domyślną metodę płatności
      const paymentMethods = await stripe.paymentMethods.list({
        customer: subscription.stripe_customer_id,
        type: 'card',
        limit: 1
      })

      if (paymentMethods.data.length > 0) {
        const pm = paymentMethods.data[0]
        paymentMethod = {
          brand: pm.card?.brand || 'unknown',
          last4: pm.card?.last4 || '****',
          exp_month: pm.card?.exp_month || 0,
          exp_year: pm.card?.exp_year || 0
        }
      }
    }

    return NextResponse.json({
      plan: (subscription.plan_id || 'free').toLowerCase(),
      status: subscription.status || 'active',
      billing_cycle: subscription.billing_cycle || 'monthly',
      payment_method: paymentMethod
    })

  } catch (error) {
    console.error('Błąd pobierania danych billing:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Błąd serwera' 
      },
      { status: 500 }
    )
  }
}