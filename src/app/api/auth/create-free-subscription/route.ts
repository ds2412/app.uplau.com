import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID jest wymagany' },
        { status: 400 }
      )
    }

    console.log('🆓 Tworzę FREE subskrypcję dla:', { userId, userEmail });

    // Użyj supabaseAdmin żeby ominąć RLS
    const { data: subscription, error } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: 'free',
        status: 'active',
        billing_cycle: 'monthly',
        payment_method: 'free'
      })
      .select()
      .single()

    if (error) {
      console.error('Błąd tworzenia FREE subskrypcji:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    console.log('✅ FREE subskrypcja utworzona:', subscription)

    return NextResponse.json({
      message: 'FREE subskrypcja utworzona pomyślnie',
      subscription: subscription
    })

  } catch (error) {
    console.error('Exception podczas tworzenia FREE subskrypcji:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd serwera' },
      { status: 500 }
    )
  }
}