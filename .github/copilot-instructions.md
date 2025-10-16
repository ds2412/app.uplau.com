# Copilot Instructions - app.uplau.com React Project

## Project Overview
- **Project:** app.uplau.com - Professional React Web Application
- **Stack:** Next.js 15 + React + TypeScript + Tailwind CSS
- **Goal:** Production-ready, scalable web application

## Rola: Code Buddy / Mentor do nauki React/JavaScript

Jesteś kodem buddy dla osoby uczącej się React/JavaScript przez praktykę. Twoja rola to:

### ✅ CO MASZ ROBIĆ:
- Tłumacz wszystko **łopatologicznie** - jak dla kompletnego początkującego
- Wyjaśniaj każdą nową funkcję, komponent, hook React
- Dawaj **wskazówki** i **nakierowania** 
- Pomagaj zrozumieć **DLACZEGO** coś działa tak, a nie inaczej
- Zadawaj pytania prowadzące zamiast dawać odpowiedzi
- Pokazuj małe fragmenty kodu jako przykłady **TYLKO** gdy tłumaczysz koncepcje

### ❌ CZEGO NIE WOLNO CI ROBIĆ:
- **NIGDY** nie duplikuj funkcji - sprawdź co już było robione wcześniej
- **NIGDY** nie proponuj różnych wersji tego samego rozwiązania w kółko
- Nie używaj skomplikowanych terminów bez wyjaśnienia
- Nie zakładaj że użytkownik coś wie

### 🎯 Metodyka nauczania:
1. **Pytaj** - "Co myślisz, że robi ten komponent?"
2. **Prowadź** - "Spróbuj pomyśleć, co się stanie gdy..."
3. **Tłumacz** - "Ten hook to jak pudełko, w którym..."
4. **Weryfikuj** - "Sprawdź czy rozumiesz, powtórz własnymi słowami"
5. **Pamiętaj kontekst** - sprawdź co już było omawiane wcześniej w sesji
6. **Nie zapętlaj się** - jeśli użytkownik mówi "kręcisz się" - zatrzymaj i przemyśl

### 🧠 Poziom wyjaśnień:
- Używaj analogii z życia codziennego
- Każdy nowy termin wyjaśnij od podstaw
- Rozbijaj skomplikowane rzeczy na małe kroki
- Zawsze sprawdzaj czy użytkownik rozumie przed przejściem dalej

## Development Guidelines
- Use TypeScript for type safety
- Follow React best practices and hooks patterns
- Use Next.js App Router (app directory)
- Implement proper error boundaries
- Use Tailwind CSS for styling
- Ensure accessibility (a11y) compliance
- Write clean, maintainable code

## Project Structure
- `/src/app/` - Next.js App Router pages and layouts
- `/src/components/` - Reusable React components
- `/src/lib/` - Utility functions and configurations
- `/public/` - Static assets

## Project Structure & Organization
- `/src/app/` - Next.js App Router pages and layouts
- `/src/components/` - Reusable React components
- `/src/lib/` - Utility functions and configurations
- `/public/` - Static assets
- `/sciagi/` - User's learning cheat sheets (for student, not AI)
- `/.github/` - AI instructions and configurations
- `copilot-variables-instrukcje.txt` - User's cheat sheet for Copilot Variables usage

## Communication & Development Rules
- **Terminal commands:** AI should only suggest/guide commands, user will type them manually
- **No complete solutions:** Give hints, explanations, and guidance - never full code solutions
- **Variables usage:** User has cheat sheet for @workspace, @file, @selection, @terminal, @problems
- **Brotherly atmosphere:** Casual, friendly mentoring approach ("brachu" style)

## ⚠️ Anti-Loop Protection:
- **Before suggesting:** Check what was already discussed in current session
- **Avoid duplicates:** Don't create multiple versions of same functionality  
- **Stay consistent:** Don't contradict previous explanations without reason
- **User control:** If user says "stop" or "you're repeating" - pause and ask for direction

## Special Workspace Rules
🤝 **Komendy w terminalu:** 
- AI będzie tylko **podrzucać/nakierowywać** na komendy
- **User sam** będzie je wpisywać w terminalu  
- AI **nie będzie** uruchamiał komend za usera (chyba że user poprosi)

## Setup Progress:
- [x] ✅ Created copilot instructions
- [x] ✅ Scaffolded Next.js project with TypeScript
- [x] ✅ Configured Tailwind CSS and ESLint
- [x] ✅ Set up modern development stack
- [x] ✅ Connected to GitHub repository
- [x] ✅ Organized project structure with sciagi/ folder
- [ ] 🔄 Install additional extensions (if needed)
- [ ] 🔄 Configure development tasks
- [ ] 🔄 Test build and dev server

## Projekt: app.uplau.com - React/Next.js przez praktykę
**Poziom:** Nauka przez budowanie prawdziwej aplikacji
**Cel:** Stworzenie profesjonalnej strony z pełnym zrozumieniem kodu

## Stan sesji na dzień: 12.10.2025
**Ostatnia aktualizacja kontekstu:** 12 października 2025
**Bieżący punkt:** OAuth + Stripe Payments + Webhooks - DZIAŁAJĄ!

### 🎯 Co zostało zrobione w tej sesji:

#### ✅ 1. OAUTH GOOGLE - NAPRAWIONY
**Problem:** OAuth przekierowywał do localhost zamiast ngrok
**Rozwiązanie:** 
- Zmieniono `redirectTo` z `window.location.origin` na względny URL `/api/auth/callback`
- `window.location.origin` zawsze zwraca localhost nawet gdy strona otwarta przez ngrok
- Względny URL działa bo Supabase używa skonfigurowanego Site URL jako bazę
**Pliki:** `src/app/login/page.tsx`, `src/app/register/page.tsx`

#### ✅ 2. WYBÓR PLANU DLA NOWYCH USERÓW - NAPRAWIONY
**Problem:** Nowi użytkownicy omijali stronę wyboru planu i szli od razu do dashboard
**Rozwiązanie:**
- Dodano check `else if (!subData)` w `src/app/dashboard/page.tsx` (linia ~497)
- `.maybeSingle()` zwraca `{ data: null, error: null }` gdy tabela pusta - to NIE jest błąd!
- Kod teraz sprawdza czy `subData === null` i przekierowuje do `/register/plan`
**Pliki:** `src/app/dashboard/page.tsx`

#### ✅ 3. STRIPE WEBHOOKS - NAPRAWIONE
**Problem 1:** Błędny webhook secret w `.env.local`
**Rozwiązanie:** 
- Zaktualizowano `STRIPE_WEBHOOK_SECRET` na prawidłowy z Stripe Sandbox
- Usunięto duplikat (były 2 wpisy tego samego klucza)
**Prawidłowy secret:** `whsec_9Aba9WgAFxTEPBiucPsTfMO3HNRNP3vC`

**Problem 2:** Weryfikacja podpisu webhook failowała (400 error)
**Rozwiązanie:**
- Zmieniono sposób pobierania body: `request.arrayBuffer()` → `Buffer.from()` → `toString('utf8')`
- Dodano fallback dla development mode (ngrok zmienia body więc weryfikacja może failować)
- W production weryfikacja ZAWSZE włączona (bezpieczeństwo!)
**Pliki:** `src/app/api/stripe/webhook/route.ts`

**Problem 3:** Sandbox vs Normal Test Mode - confusion
**Wyjaśnienie:**
- Stripe ma 3 tryby: Live, Test Mode, Sandbox
- User używał Sandbox (dla Stripe Apps) - to OK
- Klucze API z `.env.local` są z Sandbox - to poprawne
- Płatności działają tylko w Sandbox bo tam są klucze

#### ✅ 4. BEZPIECZEŃSTWO LIMITÓW - DODANE
**Problem:** User z planem "pending" (nieaktywnym) mógł korzystać z premium limitów
**Rozwiązanie:**
- Dodano check `status === 'active'` w `src/app/api/links/usage/route.ts`
- Jeśli status !== 'active' → używaj FREE limitów (2 linki/miesiąc)
- Tylko aktywne subskrypcje dają premium limity (100/1000)
**Pliki:** `src/app/api/links/usage/route.ts`

### 🔧 Konfiguracja środowiska:

#### ngrok URL:
```
https://jacinto-heliocentric-unhastily.ngrok-free.dev
```

#### Supabase (POPRAWNIE SKONFIGUROWANE):
- **Site URL:** ngrok URL (nie localhost!)
- **Redirect URLs:** Zawiera `/api/auth/callback` dla ngrok
- **Tables:** auth.users, subscriptions, monthly_usage

#### Stripe Sandbox (POPRAWNIE SKONFIGUROWANE):
- **Webhook endpoint:** `https://jacinto-heliocentric-unhastily.ngrok-free.dev/api/stripe/webhook`
- **Webhook secret:** `whsec_9Aba9WgAFxTEPBiucPsTfMO3HNRNP3vC`
- **Events listened:** 11 eventów (checkout.session.completed, customer.subscription.created, invoice.payment_succeeded, etc.)
- **Test mode:** Sandbox (nie Normal Test Mode!)

#### .env.local (POPRAWNIE SKONFIGUROWANY):
```bash
APP_URL=https://jacinto-heliocentric-unhastily.ngrok-free.dev
NEXT_PUBLIC_APP_URL=https://jacinto-heliocentric-unhastily.ngrok-free.dev

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://subxaftfnkwqoptyqvzi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Stripe (Sandbox keys!)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SCNQUPu62tP9Wrg...
STRIPE_SECRET_KEY=sk_test_51SCNQUPu62tP9Wrg...
STRIPE_WEBHOOK_SECRET=whsec_9Aba9WgAFxTEPBiucPsTfMO3HNRNP3vC
```

### 🎯 Testowane i działające flow:

#### Flow 1: FREE Plan
```
1. Google OAuth → ngrok ✅
2. Przekierowanie do /register/plan ✅
3. Wybór FREE ✅
4. Wpis do bazy: status=active, plan_id=free ✅
5. Dashboard pokazuje FREE plan (2 linki/miesiąc) ✅
```

#### Flow 2: Płatny Plan (PRO/Starter)
```
1. Google OAuth → ngrok ✅
2. Przekierowanie do /register/plan ✅
3. Wybór PRO/Starter ✅
4. Wpis do bazy: status=pending ✅
5. Przekierowanie do Stripe Checkout ✅
6. Płatność kartą 4242 4242 4242 4242 ✅
7. Stripe wysyła webhook → serwer ✅
8. Webhook aktualizuje bazę: status=active ✅
9. Dashboard pokazuje PRO plan (1000 linków/miesiąc) ✅
```

### ⚠️ WAŻNE UWAGI DLA KOLEJNEJ SESJI:

#### 1. Webhook weryfikacja w production:
- W development mode weryfikacja może failować (ngrok)
- W production będzie działać (bezpośrednie połączenie Stripe → serwer)
- Kod ma fallback: w dev parsuje mimo błędu, w prod odrzuca

#### 2. ngrok URL zmienia się po restarcie:
- Po każdym restarcie ngrok nowy URL
- Trzeba zaktualizować: Supabase Site URL, Stripe webhook endpoint, .env.local
- Albo użyć ngrok paid (stały URL)

#### 3. Stripe Sandbox vs Test Mode:
- User używa **Sandbox** (nie Normal Test Mode)
- Klucze API są z Sandbox
- To jest OK - sandbox = środowisko testowe dla Stripe Apps

#### 4. localStorage może dawać false positives:
- `localStorage.clear()` przed testowaniem nowych płatności
- Stare flagi `paymentSuccess` mogą pokazywać false success messages

### 📊 Status bazy danych (Supabase):

#### Tabela: subscriptions
```
Przykładowe dane po testach:
- User 1: plan_id=free, status=active, stripe_customer_id=NULL
- User 2: plan_id=pro, status=active, stripe_customer_id=cus_T8gvxnULWJngI9, stripe_subscription_id=sub_1SHSuwPu62tP9WrghCQE8kGL
- User 3: plan_id=starter, status=pending (webhook nie aktywował jeszcze)
```

#### Tabela: monthly_usage
```
Śledzi ile linków user stworzył w danym miesiącu
Pola: user_id, year, month, links_created
```

### 🚀 Gotowe do dalszego developmentu:

**Atmosphere:** brachu style 😊
**Kolejny krok:** Zakładka Billing (zarządzanie subskrypcją, zmiana planu, anulowanie)

---

## Stan sesji na dzień: 12.10.2025 (wieczór)
**Ostatnia aktualizacja kontekstu:** 12 października 2025 (wieczór)
**Bieżący punkt:** Customer Portal + Redirect Links Feature

### 🎯 Co zostało zrobione w tej sesji:

#### ✅ 5. CUSTOMER PORTAL (Zarządzaj Subskrypcją) - NAPRAWIONY
**Problem:** Błąd "Nie znaleziono subskrypcji użytkownika" przy kliknięciu "Zarządzaj Subskrypcją"
**Przyczyna:** API route używał `supabase` (browser client) zamiast `supabaseAdmin` (server client)

**Wyjaśnienie błędu:**
- **Browser client** (`supabase`): Ma Row Level Security (RLS), używany w komponentach React
- **Admin client** (`supabaseAdmin`): Używa service role key, pomija RLS, tylko dla API routes
- **Błąd:** W `src/app/api/stripe/customer-portal/route.ts` było `import { supabase }`
- **Rezultat:** RLS blokował dostęp do tabeli subscriptions, zwracało null mimo że dane istnieją

**Rozwiązanie:**
- Zmieniono `import { supabase }` → `import { supabaseAdmin }` w customer-portal/route.ts
- Dodano console.log do debugowania (pokazuje userId, znalezione dane, errory)
- Rozszerzono SELECT na więcej pól (stripe_subscription_id, plan_id, status)
**Pliki:** `src/app/api/stripe/customer-portal/route.ts`

**ZASADA dla API routes:**
```typescript
// ❌ ŹLE - w API routes:
import { supabase } from '@/lib/supabase'

// ✅ DOBRZE - w API routes:
import { supabaseAdmin } from '@/lib/supabase'

// ℹ️ Browser client tylko w komponentach React (client-side)
```

#### ✅ 6. STRIPE CUSTOMER PORTAL - SKONFIGUROWANY
**Problem:** Błąd "No configuration provided" po naprawieniu supabase clienta
**Przyczyna:** Stripe wymaga jednorazowej konfiguracji Customer Portal w Dashboard

**Konfiguracja w Stripe Dashboard:**
- Settings → Billing → Customer portal
- Włączono: "Customers can switch plans"
- Dodano plan: PRO (zł29.99/month)
- Proration: "Prorate charges and credits" + Invoice immediately
- Downgrades: "Update subscription immediately"
- Zapisano konfigurację (test mode)

**Co to Customer Portal:**
- Hostowany przez Stripe na billing.stripe.com
- Pozwala userom zarządzać subskrypcją bez custom UI
- User może: zmienić plan, zaktualizować kartę, anulować subskrypcję
- API: `stripe.billingPortal.sessions.create()` generuje URL do portalu

**Pros Customer Portal:**
- ✅ Zero pracy developerskiej
- ✅ Stripe zarządza security i compliance
- ✅ Automatyczne aktualizacje funkcji

**Cons Customer Portal:**
- ❌ Redirect poza naszą stronę
- ❌ Mniej kontroli nad UI/UX
- ❌ Stripe branding

**Decyzja:** Zostajemy przy Customer Portal (szybciej do marketu), custom billing later jeśli potrzeba

#### ✅ 7. SUBSCRIPTION CANCELLATION - ZROZUMIENIE FLOW
**Jak działa anulowanie subskrypcji:**

1. **User klika "Cancel" w Customer Portal**
2. **Stripe ustawia** `cancel_at_period_end = true`
3. **Status pozostaje** `active` (user ma dostęp do końca okresu!)
4. **Przykład timeline:**
   - 01.10 - User kupuje PRO (zł29.99)
   - 15.10 - User anuluje subskrypcję
   - 15.10 - 31.10 - **Nadal ma dostęp PRO** (zapłacił za cały miesiąc!)
   - 01.11 - `customer.subscription.deleted` webhook fire
   - 01.11 - Status zmienia się na `canceled`, user wraca do FREE

**Dlaczego tak:**
- User zapłacił za cały miesiąc → dostaje pełną wartość
- Zmniejsza refund requests
- Lepsze UX (user nie traci dostępu natychmiast)

**Co musimy obsłużyć w kodzie:**
- Webhook `customer.subscription.deleted` (już jest w route.ts)
- Update status na `canceled` w bazie
- User automatycznie wraca do FREE limitów

#### ✅ 8. REDIRECT LINKS FEATURE - ROZPOCZĘTY
**Cel:** Stworzenie systemu skracania linków z redirectami (główna funkcja app!)

**Struktura URL:**
```
https://app.uplau.com/abc123 → przekierowanie do https://example.com
```

**Dynamic Route w Next.js:**
- Stworzono `src/app/[shortCode]/page.tsx`
- `[shortCode]` = parametr URL (np. "abc123")
- Next.js automatycznie catchuje wszystkie URL-e z tego patternu

**Kod `[shortCode]/page.tsx`:**
```typescript
export default async function RedirectPage({ 
  params 
}: { 
  params: Promise<{ shortCode: string }> 
}) {
  const { shortCode } = await params
  
  // TODO: 
  // 1. Fetch original URL z bazy (np. tabela 'links')
  // 2. Sprawdź czy link istnieje i nie wygasł
  // 3. Zwiększ counter kliknięć (analytics)
  // 4. Redirect: redirect(originalUrl)
}
```

**Co zostało do zrobienia:**
- [ ] Tabela `links` w Supabase (columns: short_code, original_url, user_id, clicks, created_at, expires_at)
- [ ] API route do tworzenia linków: `/api/links/create`
- [ ] Fetch logic w [shortCode]/page.tsx
- [ ] Redirect logic z Next.js `redirect()`
- [ ] Analytics (track clicks)
- [ ] UI do tworzenia linków w dashboard
- [ ] Walidacja limitów (FREE: 2/miesiąc, Starter: 100, PRO: 1000)

### 🔧 Konfiguracja środowiska (bez zmian):

#### ngrok URL:
```
https://jacinto-heliocentric-unhastily.ngrok-free.dev
```

#### Supabase (POPRAWNIE SKONFIGUROWANE):
- **Site URL:** ngrok URL
- **Redirect URLs:** Zawiera `/api/auth/callback` dla ngrok
- **Tables:** auth.users, subscriptions, monthly_usage
- **TODO:** Dodać tabelę `links`

#### Stripe Sandbox (POPRAWNIE SKONFIGUROWANE):
- **Webhook endpoint:** `https://jacinto-heliocentric-unhastily.ngrok-free.dev/api/stripe/webhook`
- **Webhook secret:** `whsec_9Aba9WgAFxTEPBiucPsTfMO3HNRNP3vC`
- **Customer Portal:** ✅ Skonfigurowany (PRO plan, proration enabled)
- **Events listened:** 11 eventów

### 🎯 Testowane i działające flow (rozszerzone):

#### Flow 3: Customer Portal (Billing Management)
```
1. Dashboard → zakładka "Billing" ✅
2. Klik "Zarządzaj Subskrypcją" ✅
3. API route używa supabaseAdmin → fetch subscription ✅
4. Stripe generuje billing portal URL ✅
5. Redirect do billing.stripe.com ✅
6. User może: zmienić plan, zaktualizować kartę, anulować ⏳ (nie testowane jeszcze)
```

#### Flow 4: Redirect Links (w budowie)
```
1. User tworzy link w dashboard ⏳
2. System generuje short code (np. "abc123") ⏳
3. Zapisuje do bazy: short_code → original_url ⏳
4. User odwiedza app.uplau.com/abc123 ⏳
5. [shortCode]/page.tsx fetch original URL ⏳
6. Redirect do original URL ⏳
7. Zwiększenie countera kliknięć ⏳
```

### ⚠️ WAŻNE UWAGI DLA KOLEJNEJ SESJI:

#### 1. Supabase Client Context (KRYTYCZNE!):
**ZASADA:** W API routes **ZAWSZE** używaj `supabaseAdmin`, **NIGDY** `supabase`

```typescript
// ❌ ŹLE (w API routes):
import { supabase } from '@/lib/supabase'
// RLS zablokuje dostęp, zwróci null mimo że dane istnieją!

// ✅ DOBRZE (w API routes):
import { supabaseAdmin } from '@/lib/supabase'
// Service role key, pełny dostęp do bazy

// ℹ️ W komponentach React (client-side):
import { supabase } from '@/lib/supabase'
// Tu browser client jest OK!
```

**Jak sprawdzić błędy:**
- Jeśli API route zwraca null/404 mimo że dane są w bazie → sprawdź czy używa supabaseAdmin
- Grep search: "import.*supabase.*from.*@/lib/supabase" w folderze `/api/`
- Każdy match w `/api/` powinien być `supabaseAdmin`

#### 2. Stripe Customer Portal vs Custom Billing:
**Customer Portal (obecne rozwiązanie):**
- Pros: Zero dev work, secure, compliant, maintained by Stripe
- Cons: External redirect, less UI control, Stripe branding

**Custom Billing (możliwe future):**
- Pros: Full UI/UX control, no redirect, custom branding
- Cons: Massive dev effort, security responsibility, maintenance

**Decyzja:** Zostajemy przy Customer Portal, custom later jeśli potrzeba

#### 3. Subscription Cancellation Grace Period:
- User anuluje → `cancel_at_period_end = true`
- Status **POZOSTAJE** `active` do końca okresu (user zapłacił!)
- Webhook `customer.subscription.deleted` fire dopiero jak okres się kończy
- Wtedy status → `canceled`, user → FREE limits

#### 4. Next.js Dynamic Routes:
- `[shortCode]/page.tsx` = catch-all route dla app.uplau.com/XYZ
- `params` jest Promise w Next.js 15 (trzeba `await params`)
- Parametr URL dostępny przez `params.shortCode`

#### 5. Redirect Links - Kolejne kroki:
1. **Tabela links w Supabase:**
   ```sql
   CREATE TABLE links (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES auth.users(id),
     short_code TEXT UNIQUE NOT NULL,
     original_url TEXT NOT NULL,
     clicks INTEGER DEFAULT 0,
     created_at TIMESTAMP DEFAULT NOW(),
     expires_at TIMESTAMP
   );
   ```

2. **API route /api/links/create:**
   - Sprawdź limity usera (monthly_usage)
   - Wygeneruj unique short_code (np. nanoid, 6 znaków)
   - Zapisz do bazy
   - Zwróć short URL

3. **[shortCode]/page.tsx logic:**
   - Fetch link z bazy: `SELECT original_url, expires_at FROM links WHERE short_code = ?`
   - Sprawdź czy nie wygasł
   - Zwiększ clicks counter
   - `redirect(originalUrl)` (Next.js redirect)

### 📊 Status bazy danych (Supabase):

#### Tabela: subscriptions
```
Testowy user: jompkeypol@gmail.com
- user_id: 982e5bac-fc4a-4dbd-bce9-e627b7f4eb7c
- stripe_customer_id: cus_T8gvxnULWJngI9
- stripe_subscription_id: sub_1SHSuwPu62tP9WrghCQE8kGL
- status: active
- plan_id: pro
```

#### Tabela: links (TODO - jeszcze nie istnieje!)
```
Potrzebne kolumny:
- id (UUID, primary key)
- user_id (UUID, foreign key → auth.users)
- short_code (TEXT, unique, indexed)
- original_url (TEXT)
- clicks (INTEGER, default 0)
- created_at (TIMESTAMP)
- expires_at (TIMESTAMP, nullable)
```

### 🚀 Production Deployment - Checklist:

#### Przed wrzuceniem na produkcję trzeba:
1. **Domena i Hosting:**
   - Kupić domenę (app.uplau.com) - ~50-100 zł/rok
   - Deploy na Vercel (darmowy tier OK na start)

2. **Supabase:**
   - Site URL: zmienić z ngrok na domenę
   - Redirect URLs: dodać https://app.uplau.com/api/auth/callback
   - OAuth (Google): zaktualizować redirect URIs w Google Cloud Console

3. **Stripe:**
   - Przełączyć z Test Mode → **Live Mode**
   - Skopiować NOWE klucze (pk_live_..., sk_live_...)
   - Webhook endpoint: zmienić na https://app.uplau.com/api/stripe/webhook
   - Skopiować NOWY webhook secret (whsec_...)
   - Customer Portal: skonfigurować dla Live Mode (te same ustawienia)

4. **Environment Variables (.env.local → Vercel):**
   ```bash
   # App URL
   APP_URL=https://app.uplau.com
   NEXT_PUBLIC_APP_URL=https://app.uplau.com
   
   # Supabase (NIE ZMIENIA SIĘ!)
   NEXT_PUBLIC_SUPABASE_URL=https://subxaftfnkwqoptyqvzi.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... (ten sam!)
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (ten sam!)
   
   # Stripe (NOWE - LIVE KEYS!)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (nie pk_test_!)
   STRIPE_SECRET_KEY=sk_live_... (nie sk_test_!)
   STRIPE_WEBHOOK_SECRET=whsec_... (nowy z live webhook)
   ```

5. **Webhook Verification:**
   - W production `NODE_ENV = 'production'` automatycznie
   - Pełna weryfikacja Stripe signature włączy się sama (kod już to obsługuje)
   - Ngrok fallback przestanie działać (nie będzie potrzebny!)

6. **Testing przed launch:**
   - Vercel Preview Deployment (każdy push do GitHub)
   - Test OAuth, FREE plan, paid plan checkout (LIVE cards!)
   - Sprawdź webhooks w Stripe Dashboard → Events
   - Testuj Customer Portal
   - Sprawdź redirect links

7. **Monitoring:**
   - Vercel: Functions → Logs (API routes)
   - Stripe: Developers → Webhooks → Events log
   - Supabase: Database → Table Editor (verify data)

#### Koszty produkcji:
- **Domena:** ~50-100 zł/rok
- **Vercel Free Tier:** 0 zł (wystarczy na start)
- **Supabase Free Tier:** 0 zł (50k MAU, 500 MB DB)
- **Stripe:** 0 zł setup + 2.9% + 1.20 zł per transaction
- **Total startup cost:** ~100 zł/rok (tylko domena!)

### � Wnioski edukacyjne z sesji:

#### Lekcja 1: Supabase Client Context
**Problem:** API route zwracał null mimo że dane w bazie
**Przyczyna:** Browser client ma RLS, server client nie
**Rozwiązanie:** Używaj odpowiedniego clienta w odpowiednim miejscu
**Zasada:** API routes = supabaseAdmin, komponenty = supabase

#### Lekcja 2: Stripe Customer Portal
**Trade-off:** Build vs Buy decision
**Customer Portal (Buy):** Szybko, zero maintanance, mniej kontroli
**Custom Billing (Build):** Pełna kontrola, dużo pracy, security risk
**Wniosek:** Start with buy, build later if needed (MVP thinking!)

#### Lekcja 3: Subscription Cancellation UX
**Fair billing:** User dostaje pełną wartość za zapłacone pieniądze
**Grace period:** Status active do końca okresu mimo anulowania
**Better UX:** User nie traci dostępu natychmiast, less frustration
**Less refunds:** User nie żąda zwrotu bo dostał co zapłacił

#### Lekcja 4: Next.js Dynamic Routes
**Pattern:** `[param]/page.tsx` catchuje wszystkie URL-e z tym patternem
**Use case:** URL shortener, blog posts, product pages
**Params:** Promise w Next.js 15 (trzeba await!)
**Flexibility:** Pozwala na nieskończoną ilość custom URLs bez hardcoding

### 📚 Kolejne kroki dla następnej sesji:

**Priority 1: Testowanie Customer Portal**
- User odświeża dashboard (F5)
- Klik "Zarządzaj Subskrypcją"
- Sprawdź czy otwiera billing.stripe.com
- Zobacz czy pokazuje PRO plan, kartę, opcje zarządzania

**Priority 2: Tabela links w Supabase**
- Utworzyć tabelę przez SQL Editor
- Dodać columns: id, user_id, short_code, original_url, clicks, created_at, expires_at
- Ustawić RLS policies (user widzi tylko swoje linki)
- Dodać index na short_code (performance!)

**Priority 3: API /api/links/create**
- Sprawdzenie limitów (monthly_usage)
- Generowanie unique short_code
- Zapis do bazy
- Return short URL do frontendu

**Priority 4: [shortCode]/page.tsx logic**
- Fetch original URL z bazy
- Check expiration
- Increment clicks counter
- Redirect do original URL

**Priority 5: UI do tworzenia linków**
- Form w dashboard: input original URL
- Button "Shorten"
- Display shortened URL
- Copy to clipboard functionality

**Created:** 26.09.2025
**Updated:** 12.10.2025 (wieczór)
**Status:** Customer Portal FIXED! Redirect Links IN PROGRESS! 🚀