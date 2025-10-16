import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Pobierz user_id z query params (przekazany z frontendu)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Brak userId' },
        { status: 400 }
      )
    }

    // Pobierz bieżący miesiąc
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Pobierz usage
    const { data: usage } = await supabaseAdmin
      .from('monthly_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('year', currentYear)
      .eq('month', currentMonth)
      .maybeSingle()

    // Pobierz plan usera - NAJNOWSZĄ subskrypcję (sortuj po created_at DESC)
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_id, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() // ✅ Może nie być subskrypcji (FREE users)

    // Jeśli błąd subskrypcji - loguj ale nie crashuj
    if (subError && subError.code !== 'PGRST116') {
      console.error('Błąd pobierania subscription w usage:', subError)
    }

    console.log('🔍 Usage API - userId:', userId, 'subscription:', subscription?.plan_id || 'free', 'status:', subscription?.status)

    // ⚠️ BEZPIECZEŃSTWO: Tylko AKTYWNE subskrypcje dają premium limity
    // Jeśli status !== 'active', traktuj jak FREE (nawet jeśli ma plan_id)
    const isSubscriptionActive = subscription?.status === 'active'
    
    // Limity planów (MIESIĘCZNIE)
    const planLimits: Record<string, number> = {
      'free': 2,          // 2 linki/miesiąc
      'starter': 100,     // 100 linków/miesiąc
      'pro': 1000,        // 1000 linków/miesiąc
      'enterprise': 99999,// alias
      'business': 99999   // Enterprise/Business = bez limitu
    }

    // Jeśli subskrypcja NIE jest aktywna → użyj FREE limitu
    const planKey = (isSubscriptionActive && subscription?.plan_id) 
      ? subscription.plan_id.toLowerCase() 
      : 'free'
    const limit = planLimits[planKey]
    
    console.log('🔒 Plan key after status check:', planKey, '(active:', isSubscriptionActive, ')')
    const used = usage?.links_created || 0
    const isUnlimited = typeof limit === 'number' && limit >= 99999

    // Data resetu (1-go następnego miesiąca)
    const resetDate = new Date(currentYear, currentMonth, 1) // currentMonth (0-based) = następny miesiąc

    return NextResponse.json({
      success: true,
      plan: subscription?.plan_id || 'free',
  limit: limit,
  isUnlimited,
      used: used,
  remaining: isUnlimited ? null : Math.max(0, limit - used),
  percentage: isUnlimited ? null : Math.round((used / limit) * 100),
      resetDate: resetDate.toISOString(),
      resetDateFormatted: resetDate.toLocaleDateString('pl-PL', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    })

  } catch (error) {
    console.error('Błąd API usage:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd serwera' },
      { status: 500 }
    )
  }
}
