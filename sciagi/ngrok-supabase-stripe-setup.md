# Ngrok + Supabase + Stripe – Setup Checklist

**Cel:** Uruchomienie aplikacji przez ngrok z pełnym OAuth (Google) i Stripe, bez przekierowań na localhost.

---

## 🔧 Krok 1: Uruchom ngrok

```powershell
# W osobnym terminalu PowerShell:
ngrok http 3000
```

**Skopiuj URL** z outputu ngrok, np.:
```
https://jacinto-heliocentric-unhastily.ngrok-free.dev
```

⚠️ **WAŻNE:** Za każdym razem jak restartujesz ngrok, dostajesz **nowy URL** (chyba że masz płatne konto z custom subdomain). Musisz wtedy **zaktualizować wszystkie 3 miejsca** poniżej.

---

## 🔧 Krok 2: Ustaw `.env.local` w projekcie

Otwórz (lub utwórz) plik `.env.local` w głównym folderze projektu i ustaw:

```env
# Supabase (z panelu Supabase → Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://subxaftfnkwqoptyqvzi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=twój_anon_key_tutaj
SUPABASE_SERVICE_ROLE_KEY=twój_service_role_key_tutaj

# Stripe (z panelu Stripe → Developers → API keys)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# APP_URL – ZAWSZE aktualny adres ngrok (https)
APP_URL=https://jacinto-heliocentric-unhastily.ngrok-free.dev

# Short domain (opcjonalnie, jeśli masz własną domenę dla linków)
# NEXT_PUBLIC_SHORT_DOMAIN=https://uplau.it
```

**Po zapisaniu `.env.local` → ZRESTARTUJ dev server:**
```powershell
# Ctrl+C w terminalu z serwerem, potem:
npm run dev
```

---

## 🔧 Krok 3: Supabase → URL Configuration

1. Otwórz: **Supabase Dashboard** → Twój projekt → **Authentication** → **URL Configuration**

2. Ustaw **Site URL** (pole na górze):
   ```
   https://jacinto-heliocentric-unhastily.ngrok-free.dev
   ```
   ⚠️ **NIE** `http://localhost:3000` ani `https://localhost:3000`!

3. W sekcji **Redirect URLs** dodaj (kliknij "Add URL" dla każdego):
   ```
   https://jacinto-heliocentric-unhastily.ngrok-free.dev/api/auth/callback
   https://jacinto-heliocentric-unhastily.ngrok-free.dev/dashboard
   http://localhost:3000
   http://localhost:3000/api/auth/callback
   http://localhost:3000/dashboard
   ```
   (Lokalne adresy zostaw dla testów przez localhost bez ngrok.)

4. **Kliknij "Save changes"** na dole strony.

5. **Usuń** z listy Redirect URLs (jeśli jest):
   ```
   https://subxaftfnkwqoptyqvzi.supabase.co/auth/v1/callback
   ```
   To nie jest redirect do Twojej aplikacji.

---

## 🔧 Krok 4: Stripe → Webhook

1. Otwórz: **Stripe Dashboard** → **Developers** → **Webhooks**

2. Jeśli masz już endpoint dla localhost, **edytuj go** lub **dodaj nowy**:
   - Endpoint URL:
     ```
     https://jacinto-heliocentric-unhastily.ngrok-free.dev/api/stripe/webhook
     ```
   - Events to send: minimum:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

3. **Skopiuj Signing secret** (zaczyna się od `whsec_...`) i wklej do `.env.local` jako `STRIPE_WEBHOOK_SECRET`.

4. **Zrestartuj dev server** po zmianie `.env.local`.

---

## 🔧 Krok 5: Wyczyść cache przeglądarki

Po zmianie Site URL/Redirect URLs w Supabase:

1. **Zamknij wszystkie karty** localhost:3000 i ngrok.
2. **Otwórz okno prywatne** (incognito) w przeglądarce.
3. Wejdź na: `https://jacinto-heliocentric-unhastily.ngrok-free.dev/login`

**Dlaczego okno prywatne?**
- Przeglądarka cache'uje stare przekierowania OAuth (szczególnie dla localhost).
- Okno prywatne = czysty start bez cookies/storage.

---

## 🔧 Krok 6: Test Google OAuth

1. W oknie prywatnym: `https://…ngrok…/login`
2. Kliknij **"Kontynuuj z Google"**
3. Wybierz konto Google
4. **Sprawdź URL po powrocie:**
   - ✅ OK: `https://…ngrok…/dashboard` lub `https://…ngrok…/register/plan`
   - ❌ ZŁE: `https://localhost:3000/...` lub `localhost:3000/register#access_token=...`

Jeśli wciąż trafiasz na localhost:
- Sprawdź **Site URL** w Supabase (krok 3) — musi być ngrok (https).
- Sprawdź **APP_URL** w `.env.local` (krok 2) — musi być ngrok (https).
- Upewnij się, że kliknąłeś **Save changes** w Supabase.
- **Zrestartuj dev server** po zmianie `.env.local`.

---

## 🔧 Krok 7: Test Stripe (płatność)

1. W oknie prywatnym: zaloguj się → `/upgrade`
2. Wybierz plan (np. Starter/Pro)
3. Przejdź przez Stripe Checkout (test mode, użyj karty `4242 4242 4242 4242`)
4. **Sprawdź URL po powrocie:**
   - ✅ OK: `https://…ngrok…/dashboard?from=stripe&payment_success=true`
   - ❌ ZŁE: `https://localhost:3000/login?from=stripe...`

Jeśli wciąż trafiasz na localhost:
- Sprawdź **APP_URL** w `.env.local` — musi być ngrok (https).
- Sprawdź **Stripe Webhook** endpoint — musi wskazywać na ngrok `/api/stripe/webhook`.
- **Zrestartuj dev server** po zmianie `.env.local`.

---

## 🛠️ Troubleshooting

### Problem: "ERR_SSL_PROTOCOL_ERROR" na `https://localhost:3000`

**Przyczyna:** Stripe lub Supabase zwraca Cię na `https://localhost:3000`, ale localhost nie ma certyfikatu SSL.

**Rozwiązanie:**
1. Upewnij się, że **Site URL** w Supabase to ngrok (https), **NIE** localhost.
2. Upewnij się, że **APP_URL** w `.env.local` to ngrok (https).
3. **Zrestartuj dev server.**
4. Testuj w **oknie prywatnym**.

---

### Problem: Trafiasz na `localhost:3000/register#access_token=...`

**Przyczyna:** Supabase używa "implicit flow" (hash) i wraca na localhost.

**Rozwiązanie:**
1. **Site URL** w Supabase → ustaw na ngrok (https).
2. **Redirect URLs** w Supabase → dodaj `/api/auth/callback` dla ngrok.
3. **Save changes** w Supabase.
4. **Okno prywatne** i test ponownie.

---

### Problem: Po płatności Stripe wracam na localhost

**Przyczyna:** `success_url` budowany z `APP_URL=localhost` lub brak `APP_URL` w `.env.local`.

**Rozwiązanie:**
1. Ustaw w `.env.local`:
   ```env
   APP_URL=https://jacinto-heliocentric-unhastily.ngrok-free.dev
   ```
2. **Zrestartuj dev server** (npm run dev).
3. Test ponownie.

---

### Problem: Webhook Stripe nie działa, subskrypcja "pending"

**Przyczyna:** Webhook endpoint w Stripe wskazuje na stary/zły adres lub brak `STRIPE_WEBHOOK_SECRET`.

**Rozwiązanie:**
1. Stripe → Webhooks → edytuj endpoint:
   ```
   https://…ngrok…/api/stripe/webhook
   ```
2. Skopiuj **Signing secret** i wklej do `.env.local` jako `STRIPE_WEBHOOK_SECRET`.
3. **Zrestartuj dev server.**
4. Test płatności ponownie.

---

## 📝 Szybka ściąga: Co zrobić gdy zmienisz ngrok URL

Za każdym razem gdy restartujesz ngrok i dostajesz **nowy URL**, musisz:

1. ✅ Zaktualizować **APP_URL** w `.env.local` → restart dev server
2. ✅ Zaktualizować **Site URL** w Supabase → Save changes
3. ✅ Zaktualizować **Redirect URLs** w Supabase (dodać nowy ngrok) → Save changes
4. ✅ Zaktualizować **Webhook endpoint** w Stripe → Save
5. ✅ Testować w **oknie prywatnym** (czysty cache)

---

## ✅ Checklist końcowy (przed testem)

- [ ] Ngrok działa i mam aktualny URL
- [ ] `.env.local` → APP_URL ustawione na ngrok (https)
- [ ] Dev server zrestartowany po zmianie `.env.local`
- [ ] Supabase → Site URL = ngrok (https)
- [ ] Supabase → Redirect URLs zawiera `/api/auth/callback` i `/dashboard` dla ngrok
- [ ] Supabase → Save changes kliknięte
- [ ] Stripe → Webhook endpoint = ngrok `/api/stripe/webhook`
- [ ] Stripe → Webhook secret w `.env.local`
- [ ] Testuję w oknie prywatnym

---

**Gotowe!** Teraz powinieneś móc:
- Zalogować się przez Google → wrócić na ngrok (nie localhost)
- Zapłacić przez Stripe → wrócić na ngrok (nie localhost)
- Webhook Stripe aktywuje subskrypcję (status "active" po chwili)

Jeśli coś nie działa, sprawdź sekcję **Troubleshooting** powyżej.
