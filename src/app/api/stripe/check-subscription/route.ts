import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail } = await request.json()

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Brakuje userId lub userEmail' },
        { status: 400 }
      )
    }

    console.log('🔍 Sprawdzam subskrypcję dla:', { userId, userEmail })

    // 0. NAJPIERW sprawdź czy mamy już rekord w bazie dla tego user_id
    const { data: existingSubscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!subError && existingSubscription && existingSubscription.status === 'active') {
      console.log('✅ Znaleziono aktywną subskrypcję w bazie:', existingSubscription.id)
      return NextResponse.json({
        hasSubscription: true,
        subscription: existingSubscription
      })
    }

    // JEŚLI NIE MA W BAZIE - sprawdź czy ten user KIEDYKOLWIEK miał subskrypcję
    const { data: anySubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .limit(1)

    if (!anySubscription || anySubscription.length === 0) {
      console.log('❌ Ten user NIGDY nie miał subskrypcji w naszej bazie - to nowy user')
      return NextResponse.json({
        hasSubscription: false,
        reason: 'new_user_never_had_subscription'
      })
    }

    console.log('🔍 User miał subskrypcję wcześniej, sprawdzam Stripe...')

    // 1. Sprawdź czy user ma customer w Stripe
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    })

    if (customers.data.length === 0) {
      console.log('❌ Brak customer w Stripe')
      return NextResponse.json({
        hasSubscription: false,
        reason: 'no_customer'
      })
    }

    const customer = customers.data[0]
    console.log('✅ Znaleziono customer:', customer.id)

    // 2. Sprawdź aktywne subskrypcje
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10,
    })

    console.log('🔍 Aktywne subskrypcje:', subscriptions.data.length)

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0]
      console.log('✅ Znaleziono aktywną subskrypcję:', subscription.id)

      // 3. Zapisz do bazy Supabase
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customer.id,
          stripe_subscription_id: subscription.id,
          status: 'active',
          plan_id: subscription.metadata?.plan_id || 'pro',
          billing_cycle: subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
          payment_method: 'card',
          current_period_start: new Date((subscription as any).current_period_start * 1000),
          current_period_end: new Date((subscription as any).current_period_end * 1000),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date()
        })

      if (error) {
        console.error('❌ Błąd zapisu do bazy:', error)
      } else {
        console.log('✅ Subskrypcja zapisana do bazy')
      }

      return NextResponse.json({
        hasSubscription: true,
        subscription: {
          id: subscription.id,
          status: 'active',
          plan_id: subscription.metadata?.plan_id || 'pro',
          billing_cycle: subscription.items.data[0]?.price?.recurring?.interval === 'year' ? 'yearly' : 'monthly',
          current_period_end: new Date((subscription as any).current_period_end * 1000)
        }
      })
    }

    console.log('❌ Brak aktywnych subskrypcji')
    return NextResponse.json({
      hasSubscription: false,
      reason: 'no_active_subscription'
    })

  } catch (error) {
    console.error('❌ Błąd sprawdzania subskrypcji:', error)
    return NextResponse.json({
      hasSubscription: false,
      error: 'Błąd serwera'
    }, { status: 500 })
  }
}