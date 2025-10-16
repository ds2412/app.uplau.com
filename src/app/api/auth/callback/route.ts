import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.uplau.com'
    
    // OAuth może zwrócić code lub access_token w hash
    // Jeśli brak code, przekieruj do /register (frontend obsłuży hash)
    if (!code) {
      console.log('⚠️ Brak code - przekierowuję do /register (OAuth hash flow)')
      return NextResponse.redirect(`${appUrl}/register`)
    }

    // 🔒 Użyj @supabase/ssr dla PKCE code exchange
    const cookieStore = await cookies()
    const supabase = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          }
        }
      }
    )

    // Wymień PKCE code na session
    const { data: session, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (sessionError) {
      console.error('❌ Błąd wymiany kodu:', sessionError)
      console.error('❌ Error details:', JSON.stringify(sessionError))
      return NextResponse.redirect(`${appUrl}/register?error=auth_error`)
    }

    const user = session.user
    if (!user) {
      console.error('❌ Brak usera po wymianie kodu')
      return NextResponse.redirect(`${appUrl}/register?error=no_user`)
    }

    console.log('✅ User authenticated:', user.email)

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
      console.log('✅ User has subscription, redirecting to dashboard')
      return NextResponse.redirect(`${appUrl}/dashboard`)
    }

    // Jeśli nie ma subskrypcji → wybór planu  
    console.log('⚠️ User needs to select plan')
    return NextResponse.redirect(`${appUrl}/register/plan`)

  } catch (error) {
    console.error('❌ Błąd callback:', error)
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://app.uplau.com'
    return NextResponse.redirect(`${appUrl}/register?error=callback_error`)
  }
}