import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Brak userId - musisz być zalogowany' },
        { status: 401 }
      )
    }

    // Pobierz wszystkie linki użytkownika
    const { data: links, error: linksError } = await supabaseAdmin
      .from('links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (linksError) {
      console.error('Błąd pobierania linków:', linksError)
      return NextResponse.json(
        { error: 'Nie udało się pobrać linków' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      links: links || []
    })

  } catch (error) {
    console.error('Błąd API list links:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd serwera' },
      { status: 500 }
    )
  }
}
