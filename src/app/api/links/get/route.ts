import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * API Endpoint: /api/links/get
 * Pobierz link po short_code (publiczny endpoint, bez autentykacji)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shortCode = searchParams.get('shortCode')

    if (!shortCode) {
      return NextResponse.json(
        { error: 'Brak shortCode' },
        { status: 400 }
      )
    }

    console.log('🔍 Szukam linku:', shortCode)

    // Pobierz link z bazy (używamy supabaseAdmin żeby ominąć RLS)
    const { data: link, error } = await supabaseAdmin
      .from('links')
      .select('*')
      .eq('short_code', shortCode)
      .single()

    if (error || !link) {
      console.log('❌ Link nie znaleziony:', shortCode, error)
      return NextResponse.json(
        { error: 'Link nie znaleziony' },
        { status: 404 }
      )
    }

    console.log('✅ Link znaleziony:', link.short_code, '→', link.original_url)

    return NextResponse.json({
      success: true,
      link: link
    })

  } catch (error) {
    console.error('❌ Błąd API get link:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd serwera' },
      { status: 500 }
    )
  }
}
