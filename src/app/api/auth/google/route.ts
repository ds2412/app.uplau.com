import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    // 🔒 Używamy @supabase/ssr dla PKCE!
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
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

    // Generuj OAuth URL - @supabase/ssr automatycznie używa PKCE!
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${appUrl}/api/auth/callback`,
        queryParams: {
          prompt: 'select_account',
          hl: 'pl',
          access_type: 'offline' // Dla refresh token
        }
      }
    })

    if (error) {
      console.error('❌ OAuth init error:', error)
      return NextResponse.redirect(new URL('/login?error=oauth_init_failed', request.url))
    }

    if (!data?.url) {
      console.error('❌ No OAuth URL returned')
      return NextResponse.redirect(new URL('/login?error=no_oauth_url', request.url))
    }

    console.log('✅ Generated OAuth URL:', data.url)
    console.log('🔒 PKCE code_challenge sent to Google')
    
    // Przekieruj do Google OAuth
    return NextResponse.redirect(data.url)

  } catch (error) {
    console.error('❌ Server-side OAuth error:', error)
    return NextResponse.redirect(new URL('/login?error=server_error', request.url))
  }
}
