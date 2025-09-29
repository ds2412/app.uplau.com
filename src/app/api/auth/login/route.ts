import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Walidacja danych
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email i hasło są wymagane' },
        { status: 400 }
      )
    }

    // Logowanie przez Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Błąd logowania Supabase:', error)
      return NextResponse.json(
        { error: 'Nieprawidłowy email lub hasło' },
        { status: 401 }
      )
    }

    console.log('Użytkownik zalogowany:', { email, id: data.user?.id })

    // Zwróć informacje o użytkowniku i session
    return NextResponse.json(
      { 
        message: 'Zalogowano pomyślnie!',
        user: { 
          id: data.user?.id, 
          email: data.user?.email 
        },
        session: data.session
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Błąd logowania:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd serwera' },
      { status: 500 }
    )
  }
}