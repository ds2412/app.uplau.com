import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const token = searchParams.get('token')
    
    if (!email || !token) {
      return NextResponse.redirect(new URL('/login?error=invalid_link', request.url))
    }
    
    // Weryfikuj token (prosty timestamp - w produkcji użyj JWT)
    const tokenData = Buffer.from(token, 'base64').toString('utf-8')
    const [tokenEmail, timestamp] = tokenData.split('|')
    
    // Sprawdź czy token nie wygasł (10 minut)
    const now = Date.now()
    if (now - parseInt(timestamp) > 10 * 60 * 1000) {
      return NextResponse.redirect(new URL('/login?error=link_expired', request.url))
    }
    
    if (tokenEmail !== email) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url))
    }
    
    // Wygeneruj magic link do Supabase
    const { data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: false,
      }
    })
    
    if (error) {
      console.error('Błąd auto-login:', error)
      return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
    }
    
    // Przekieruj na stronę z informacją
    return NextResponse.redirect(new URL('/login?message=check_email', request.url))
    
  } catch (error) {
    console.error('Błąd auto-login:', error)
    return NextResponse.redirect(new URL('/login?error=server_error', request.url))
  }
}
