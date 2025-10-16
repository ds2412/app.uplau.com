import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Funkcja do parsowania User-Agent
function parseUserAgent(userAgent: string) {
  const ua = userAgent.toLowerCase()
  
  // Wykryj urządzenie
  let deviceType = 'desktop'
  if (/mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    deviceType = /ipad|tablet/i.test(ua) ? 'tablet' : 'mobile'
  }
  
  // Wykryj przeglądarkę
  let browser = 'Other'
  if (ua.includes('chrome')) browser = 'Chrome'
  else if (ua.includes('safari')) browser = 'Safari'
  else if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('edge')) browser = 'Edge'
  
  // Wykryj OS
  let os = 'Other'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('mac')) os = 'macOS'
  else if (ua.includes('linux')) os = 'Linux'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'
  
  return { deviceType, browser, os }
}

export async function POST(request: NextRequest) {
  try {
    const { linkId, shortCode, userAgent, referer } = await request.json()

    console.log('📊 Track request:', { linkId, shortCode })

    if (!linkId || !shortCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Parsuj User-Agent
    const { deviceType, browser, os } = parseUserAgent(userAgent || '')

    // Pobierz IP z nagłówków
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'

    const clientIp = ip.split(',')[0].trim()
    
    console.log('🌐 Client IP:', clientIp)

    // Geolokalizacja IP (tylko jeśli nie localhost)
    let country = null
    let city = null
    
    if (clientIp !== 'unknown' && !clientIp.startsWith('127.') && !clientIp.startsWith('192.168.')) {
      try {
        // ip-api.com - 45 req/min = ~64k req/dzień (DARMOWE!)
        const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,city,countryCode`)
        if (geoResponse.ok) {
          const geoData = await geoResponse.json()
          if (geoData.status === 'success') {
            country = geoData.country || null
            city = geoData.city || null
            console.log('🌍 Geolocation:', { ip: clientIp, country, city })
          }
        }
      } catch (geoError) {
        console.error('⚠️ Geolocation API error:', geoError)
        // Kontynuuj mimo błędu
      }
    } else {
      console.log('🏠 Local IP detected, skipping geolocation:', clientIp)
    }

    // Sprawdź czy to unikalne kliknięcie (IP + User-Agent)
    const { data: existingClick } = await supabaseAdmin
      .from('link_clicks')
      .select('id')
      .eq('link_id', linkId)
      .eq('ip_address', clientIp)
      .eq('browser', browser)
      .eq('os', os)
      .limit(1)
      .maybeSingle()

    const isUniqueClick = !existingClick

    console.log('🔍 Click check:', { 
      ip: clientIp, 
      browser, 
      os, 
      isUnique: isUniqueClick 
    })
    
    // Zapisz kliknięcie do link_clicks
    const { error: clickError } = await supabaseAdmin
      .from('link_clicks')
      .insert({
        link_id: linkId,
        clicked_at: new Date().toISOString(),
        device_type: deviceType,
        browser: browser,
        os: os,
        referrer: referer,
        ip_address: clientIp,
        country: country,
        city: city
      })

    if (clickError) {
      console.error('Error saving click:', clickError)
    }

    // Zwiększ licznik kliknięć w tabeli links
    // Najpierw pobierz aktualną wartość
    const { data: currentLink } = await supabaseAdmin
      .from('links')
      .select('clicks, unique_clicks')
      .eq('id', linkId)
      .single()

    const newClickCount = (currentLink?.clicks || 0) + 1
    const newUniqueClickCount = (currentLink?.unique_clicks || 0) + (isUniqueClick ? 1 : 0)

    console.log('🔢 Updating clicks:', { 
      totalClicks: newClickCount,
      uniqueClicks: newUniqueClickCount,
      isUnique: isUniqueClick
    })

    // Zaktualizuj counters
    const { error: updateError } = await supabaseAdmin
      .from('links')
      .update({ 
        clicks: newClickCount,
        unique_clicks: newUniqueClickCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', linkId)

    if (updateError) {
      console.error('❌ Error updating click count:', updateError)
    } else {
      console.log('✅ Click counted successfully!')
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Track API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
