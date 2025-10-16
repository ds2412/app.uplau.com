import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const linkId = searchParams.get('linkId')
    const timeRange = searchParams.get('range') || '30' // Domyślnie 30 dni

    if (!userId) {
      return NextResponse.json(
        { error: 'Brak userId - musisz być zalogowany' },
        { status: 401 }
      )
    }

    if (linkId) {
      // Analityka dla konkretnego linku
      
      // Sprawdź czy link należy do usera
      const { data: link } = await supabaseAdmin
        .from('links')
        .select('*')
        .eq('id', linkId)
        .eq('user_id', userId)
        .single()

      if (!link) {
        return NextResponse.json(
          { error: 'Link nie znaleziony' },
          { status: 404 }
        )
      }

      // Pobierz kliknięcia dla tego linku
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange))

      const { data: clicks } = await supabaseAdmin
        .from('link_clicks')
        .select('*')
        .eq('link_id', linkId)
        .gte('clicked_at', daysAgo.toISOString())
        .order('clicked_at', { ascending: false })

      // Oblicz unikalne kliknięcia (na podstawie IP + browser + OS)
      const uniqueVisitors = new Set(
        (clicks || []).map((click: any) => 
          `${click.ip_address}-${click.browser}-${click.os}`
        )
      )

      // Grupuj dane dla wykresów
      const byDevice = groupBy(clicks || [], 'device_type')
      const byBrowser = groupBy(clicks || [], 'browser')
      const byOS = groupBy(clicks || [], 'os')
      const byCountry = groupBy(clicks || [], 'country')
      const byDate = groupByDate(clicks || [])

      return NextResponse.json({
        success: true,
        link: link,
        totalClicks: clicks?.length || 0,
        uniqueClicks: uniqueVisitors.size,
        clicks: clicks || [],
        analytics: {
          byDevice,
          byBrowser,
          byOS,
          byCountry,
          byDate
        }
      })
    } else {
      // Ogólna analityka dla wszystkich linków usera
      
      // Pobierz wszystkie linki usera
      const { data: userLinks } = await supabaseAdmin
        .from('links')
        .select('id, short_code, original_url, clicks, created_at')
        .eq('user_id', userId)

      if (!userLinks || userLinks.length === 0) {
        return NextResponse.json({
          success: true,
          totalLinks: 0,
          totalClicks: 0,
          links: []
        })
      }

      const linkIds = userLinks.map((l: any) => l.id)

      // Pobierz kliknięcia dla wszystkich linków
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - parseInt(timeRange))

      const { data: allClicks } = await supabaseAdmin
        .from('link_clicks')
        .select('*')
        .in('link_id', linkIds)
        .gte('clicked_at', daysAgo.toISOString())

      // Statystyki
      const totalClicks = allClicks?.length || 0
      const byDate = groupByDate(allClicks || [])
      const topLinks = userLinks
        .sort((a: any, b: any) => b.clicks - a.clicks)
        .slice(0, 10)

      return NextResponse.json({
        success: true,
        totalLinks: userLinks.length,
        totalClicks: totalClicks,
        topLinks: topLinks,
        analytics: {
          byDate,
          clicksByLink: linkIds.map((id: any) => ({
            linkId: id,
            clicks: allClicks?.filter((c: any) => c.link_id === id).length || 0
          }))
        }
      })
    }

  } catch (error) {
    console.error('Błąd API analytics:', error)
    return NextResponse.json(
      { error: 'Wystąpił błąd serwera' },
      { status: 500 }
    )
  }
}

// Funkcja pomocnicza - grupowanie po kluczu
function groupBy(array: any[], key: string) {
  return array.reduce((result, item) => {
    const value = item[key] || 'Unknown'
    result[value] = (result[value] || 0) + 1
    return result
  }, {} as Record<string, number>)
}

// Funkcja pomocnicza - grupowanie po dacie
function groupByDate(array: any[]) {
  return array.reduce((result, item) => {
    const date = new Date(item.clicked_at).toISOString().split('T')[0] // YYYY-MM-DD
    result[date] = (result[date] || 0) + 1
    return result
  }, {} as Record<string, number>)
}
