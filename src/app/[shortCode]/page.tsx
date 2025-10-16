'use client'

import { use, useEffect, useState } from 'react'

export default function RedirectPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = use(params)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function handleRedirect() {
      try {
        console.log('🔍 Szukam linku z kodem:', shortCode)

        // Pobierz link przez API (omija RLS problemy)
        const response = await fetch(`/api/links/get?shortCode=${shortCode}`)
        const data = await response.json()

        console.log('📦 Wynik z API:', data)

        if (!response.ok || !data.link) {
          console.error('❌ Link not found:', shortCode, data.error)
          setNotFound(true)
          return
        }

        const link = data.link
        console.log('✅ Link znaleziony:', link.original_url)

        // Pobierz User-Agent i referrer
        const userAgent = navigator.userAgent
        const referer = document.referrer || 'direct'

        console.log('📊 Wysyłam tracking...', { linkId: link.id, shortCode })

        // Zapisz analytics (async, ale poczekaj na odpowiedź żeby zobaczyć logi)
        try {
          const trackResponse = await fetch('/api/links/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              linkId: link.id,
              shortCode: shortCode,
              userAgent: userAgent,
              referer: referer
            })
          })
          
          const trackData = await trackResponse.json()
          console.log('✅ Track response:', trackData)
        } catch (err) {
          console.error('❌ Analytics error:', err)
        }

        console.log('🚀 Przekierowuję na:', link.original_url)

        // Małe opóźnienie żeby tracking się zapisał (300ms)
        await new Promise(resolve => setTimeout(resolve, 300))

        // Przekieruj
        window.location.href = link.original_url

      } catch (error) {
        console.error('❌ Redirect error:', error)
        setNotFound(true)
      }
    }

    handleRedirect()
  }, [shortCode])

  // Pokaż 404 jeśli link nie istnieje
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-gray-600 mb-6">Link nie został znaleziony</p>
          <a 
            href="/" 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Wróć do strony głównej
          </a>
        </div>
      </div>
    )
  }

  // Loading podczas przekierowania
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Przekierowywanie...</p>
      </div>
    </div>
  )
}
