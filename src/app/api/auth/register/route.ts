import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password, plan = 'free' } = await request.json()

    // Walidacja danych
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email i hasło są wymagane' },
        { status: 400 }
      )
    }

    // Walidacja hasła (te same wymagania co w komponencie)
    const passwordValidation = {
      hasLetter: /[a-zA-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      isLongEnough: password.length >= 9
    }

    if (!passwordValidation.hasLetter || !passwordValidation.hasNumber || 
        !passwordValidation.hasSpecialChar || !passwordValidation.isLongEnough) {
      return NextResponse.json(
        { error: 'Hasło nie spełnia wymagań bezpieczeństwa' },
        { status: 400 }
      )
    }

    // Check if user already exists (Supabase will handle this, but we want custom message)
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser.users.some((user: any) => user.email === email);
    
    if (userExists) {
      return NextResponse.json(
        { error: 'Konto z tym adresem email już istnieje. Spróbuj się zalogować.' },
        { status: 409 }
      )
    }

    // Rejestracja przez Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          subscription_plan: 'free', // Always start with free, plan selection comes later
          plan_status: 'active',
          links_limit: 100,
          links_used: 0
        }
      }
    })

    if (error) {
      console.error('Błąd rejestracji Supabase:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.log('Nowy użytkownik utworzony:', { email, id: data.user?.id })

    // PRÓBA ZALOGOWANIA po rejestracji (może zadziałać mimo niepotwierdzenia)
    try {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (loginData.user) {
        console.log('✅ Użytkownik zalogowany po rejestracji:', loginData.user.email);
      } else {
        console.log('⚠️ Nie udało się zalogować po rejestracji:', loginError?.message);
      }
    } catch (loginErr) {
      console.log('⚠️ Błąd logowania po rejestracji:', loginErr);
    }

    return NextResponse.json(
      { 
        message: 'Konto zostało utworzone pomyślnie! Sprawdź email aby potwierdzić konto.',
        userId: data.user?.id,
        userEmail: email
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Błąd rejestracji:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd serwera' },
      { status: 500 }
    )
  }
}