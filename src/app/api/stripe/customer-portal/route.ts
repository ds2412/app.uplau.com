import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export async function POST(request: NextRequest) {
  try {
    const { userId, returnUrl } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID jest wymagany' },
        { status: 400 }
      )
    }

    console.log('🔍 Customer Portal - szukam subscription dla userId:', userId)

    // Pobierz subscription z Supabase żeby znaleźć Stripe customer ID
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, plan_id, status')
      .eq('user_id', userId)
      .single()

    console.log('📊 Znaleziono subscription:', subscription)
    console.log('❌ Błąd (jeśli był):', error)

    if (error || !subscription?.stripe_customer_id) {
      console.error('⚠️ Brak stripe_customer_id dla userId:', userId)
      return NextResponse.json(
        { error: 'Nie znaleziono subskrypcji użytkownika' },
        { status: 404 }
      )
    }

    // Stwórz Stripe Customer Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: returnUrl || (process.env.APP_URL || process.env.NEXT_PUBLIC_BASE_URL) + '/dashboard',
    })

    console.log('Customer Portal Session utworzona:', session.id)

    return NextResponse.json({
      portalUrl: session.url
    })

  } catch (error) {
    console.error('Błąd Customer Portal:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Błąd serwera' 
      },
      { status: 500 }
    )
  }
}