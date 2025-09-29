import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (code) {
      // Wymień kod na session
      const { data: session, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('Błąd wymiany kodu:', sessionError)
        return NextResponse.redirect(new URL('/register?error=auth_error', request.url))
      }

      const user = session.user
      if (!user) {
        return NextResponse.redirect(new URL('/register?error=no_user', request.url))
      }

      // Sprawdź czy user ma już subskrypcję
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Błąd sprawdzania subskrypcji:', subError)
      }

      // Jeśli ma subskrypcję → dashboard
      if (subscription) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // Jeśli nie ma subskrypcji → wybór planu  
      return NextResponse.redirect(new URL('/register/plan', request.url))
    }

    // Brak kodu - błąd
    return NextResponse.redirect(new URL('/register?error=no_code', request.url))

  } catch (error) {
    console.error('Błąd callback:', error)
    return NextResponse.redirect(new URL('/register?error=callback_error', request.url))
  }
}