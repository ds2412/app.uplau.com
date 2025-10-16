import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    // OAuth może zwrócić code lub access_token w hash
    // Jeśli brak code, przekieruj do /register (frontend obsłuży hash)
    if (!code) {
      console.log('⚠️ Brak code - przekierowuję do /register (OAuth hash flow)')
      return NextResponse.redirect(new URL('/register', request.url))
    }

    // Wymień kod na session (używamy supabaseAdmin do server-side)
    const { data: session, error: sessionError } = await supabaseAdmin.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('Błąd wymiany kodu:', sessionError)
      return NextResponse.redirect(new URL('/register?error=auth_error', request.url))
    }

    const user = session.user
    if (!user) {
      return NextResponse.redirect(new URL('/register?error=no_user', request.url))
    }

    // Sprawdź czy user ma już subskrypcję
    const { data: subscription, error: subError } = await supabaseAdmin
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

  } catch (error) {
    console.error('Błąd callback:', error)
    return NextResponse.redirect(new URL('/register?error=callback_error', request.url))
  }
}