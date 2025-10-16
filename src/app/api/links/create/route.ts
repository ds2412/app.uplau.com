import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Funkcja generująca losowy short code (np. "abc123")
function generateShortCode(length: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Pomocnicza funkcja do nazw miesięcy
function getMonthName(month: number): string {
  const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 
                  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia']
  return months[month - 1] || 'stycznia'
}

export async function POST(request: NextRequest) {
  try {
    const { originalUrl, customCode, userId } = await request.json()

    // Walidacja
    if (!originalUrl) {
      return NextResponse.json(
        { error: 'URL jest wymagany' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Brak userId - musisz być zalogowany' },
        { status: 401 }
      )
    }

    // Sprawdź czy URL jest poprawny
    try {
      new URL(originalUrl)
    } catch {
      return NextResponse.json(
        { error: 'Nieprawidłowy URL. Użyj formatu: https://example.com' },
        { status: 400 }
      )
    }

    // Sprawdź limit linków dla usera (MIESIĘCZNY)
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_id')
      .eq('user_id', userId)
      .single()

    // Limity planów (MIESIĘCZNIE)
    const planLimits: Record<string, number> = {
      'free': 2,         // 2 linki/miesiąc (test limit)
      'starter': 100,    // 100 linków/miesiąc
      'pro': 1000,       // 1000 linków/miesiąc
      'enterprise': 99999
    }

    const userLimit = planLimits[subscription?.plan_id || 'free']

    // Pobierz bieżący rok i miesiąc
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // getMonth() zwraca 0-11

    // Sprawdź miesięczne użycie
    const { data: usage } = await supabaseAdmin
      .from('monthly_usage')
      .select('links_created')
      .eq('user_id', userId)
      .eq('year', currentYear)
      .eq('month', currentMonth)
      .maybeSingle()

    const currentUsage = usage?.links_created || 0

    if (currentUsage >= userLimit) {
      const currentPlan = subscription?.plan_id || 'free'
      
      return NextResponse.json(
        { 
          error: 'LIMIT_REACHED',
          limitReached: true,
          currentPlan: currentPlan,
          limit: userLimit,
          current: currentUsage,
          message: currentPlan === 'free' 
            ? 'Osiągnąłeś limit darmowego planu. Odblokuj więcej możliwości!' 
            : `Osiągnięto miesięczny limit linków dla planu ${currentPlan}`,
          resetDate: new Date(currentYear, currentMonth, 1).toISOString()
        },
        { status: 403 }
      )
    }

    // Generuj short code (lub użyj custom)
    let shortCode = customCode || generateShortCode(6)

    // Sprawdź czy short code jest dostępny
    const { data: existingLink } = await supabaseAdmin
      .from('links')
      .select('short_code')
      .eq('short_code', shortCode)
      .maybeSingle()

    if (existingLink) {
      if (customCode) {
        // Jeśli custom code zajęty - błąd
        return NextResponse.json(
          { error: 'Ten kod jest już zajęty. Wybierz inny.' },
          { status: 409 }
        )
      } else {
        // Jeśli losowy zajęty - wygeneruj nowy (max 5 prób)
        let attempts = 0
        while (existingLink && attempts < 5) {
          shortCode = generateShortCode(6)
          const { data: check } = await supabaseAdmin
            .from('links')
            .select('short_code')
            .eq('short_code', shortCode)
            .maybeSingle()
          
          if (!check) break
          attempts++
        }

        if (attempts >= 5) {
          return NextResponse.json(
            { error: 'Nie można wygenerować unikalnego kodu. Spróbuj ponownie.' },
            { status: 500 }
          )
        }
      }
    }

    // Utwórz link w bazie
    const { data: newLink, error: insertError } = await supabaseAdmin
      .from('links')
      .insert({
        user_id: userId,
        original_url: originalUrl,
        short_code: shortCode,
        clicks: 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Błąd tworzenia linku:', insertError)
      return NextResponse.json(
        { error: 'Nie udało się utworzyć linku' },
        { status: 500 }
      )
    }

    // Zwiększ miesięczny licznik użycia
    try {
      await supabaseAdmin.rpc('increment_monthly_usage', {
        p_user_id: userId
      })
    } catch (usageError) {
      console.error('Błąd zwiększania usage:', usageError)
      // Nie blokuj procesu - link został utworzony
    }

    // Zwróć skrócony link
    const shortDomain = process.env.NEXT_PUBLIC_SHORT_DOMAIN || 'http://localhost:3000'
    
    return NextResponse.json({
      success: true,
      link: newLink,
      shortUrl: `${shortDomain}/${shortCode}`,
      message: 'Link utworzony pomyślnie!',
      monthlyUsage: {
        current: currentUsage + 1,
        limit: userLimit,
        resetDate: new Date(currentYear, currentMonth, 1).toISOString()
      }
    })

  } catch (error) {
    console.error('Błąd API create link:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd serwera' },
      { status: 500 }
    )
  }
}
