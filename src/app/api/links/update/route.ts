import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * API Endpoint: /api/links/update
 * Edycja istniejącego linku (zmiana original_url)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, linkId, originalUrl } = await request.json()

    // Walidacja wymaganych pól
    if (!userId) {
      return NextResponse.json(
        { error: 'Brak userId - musisz być zalogowany' },
        { status: 401 }
      )
    }

    if (!linkId) {
      return NextResponse.json(
        { error: 'Brak linkId - nie wiadomo który link edytować' },
        { status: 400 }
      )
    }

    if (!originalUrl) {
      return NextResponse.json(
        { error: 'URL jest wymagany' },
        { status: 400 }
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

    // Sprawdź czy link istnieje i należy do usera
    const { data: existingLink, error: fetchError } = await supabaseAdmin
      .from('links')
      .select('id, user_id, short_code, original_url')
      .eq('id', linkId)
      .single()

    if (fetchError || !existingLink) {
      return NextResponse.json(
        { error: 'Link nie został znaleziony' },
        { status: 404 }
      )
    }

    // Sprawdź czy user jest właścicielem linku
    if (existingLink.user_id !== userId) {
      return NextResponse.json(
        { error: 'Nie masz uprawnień do edycji tego linku' },
        { status: 403 }
      )
    }

    // Zaktualizuj link w bazie
    const { data: updatedLink, error: updateError } = await supabaseAdmin
      .from('links')
      .update({
        original_url: originalUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', linkId)
      .select()
      .single()

    if (updateError) {
      console.error('Błąd aktualizacji linku:', updateError)
      return NextResponse.json(
        { error: 'Nie udało się zaktualizować linku' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      link: updatedLink,
      message: 'Link zaktualizowany pomyślnie!'
    })

  } catch (error) {
    console.error('Błąd API update link:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd serwera' },
      { status: 500 }
    )
  }
}
