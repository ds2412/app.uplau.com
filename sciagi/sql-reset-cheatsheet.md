# SQL reset – Supabase (cheat sheet)

Uwaga: uruchamiaj na środowisku testowym. Operacje są nieodwracalne.

## 1) Wyczyść dane aplikacji (tabele biznesowe)

Kolejność: najpierw tabele zależne (FK), potem bazowe.

```sql
-- Kliknięcia / zdarzenia
TRUNCATE TABLE link_clicks RESTART IDENTITY CASCADE;

-- Linki (zależne od użytkowników)
TRUNCATE TABLE links RESTART IDENTITY CASCADE;

-- Miesięczne użycie / statystyki
TRUNCATE TABLE monthly_usage RESTART IDENTITY CASCADE;

-- Subskrypcje / billing
TRUNCATE TABLE subscriptions RESTART IDENTITY CASCADE;
```

Jeśli nie masz którejś tabeli, pomiń odpowiednią linię.

## 2) Usuń użytkowników (auth.users + profile, jeśli masz)

Supabase trzyma konta w `auth.users`. Usuwaj ostrożnie.

```sql
-- Usuń powiązane rekordy profilu (jeśli masz np. public.profiles)
-- DELETE FROM public.profiles WHERE user_id IN (SELECT id FROM auth.users);

-- Usuń wszystkich użytkowników (TYLKO test!)
DELETE FROM auth.users WHERE TRUE;
```

W testach często wystarczy usunąć wybranych:

```sql
-- Usuń konkretnego użytkownika po emailu
DELETE FROM auth.users WHERE email = 'user@example.com';
```

## 3) Opcjonalnie: pełny reset (drop + recreate)

Jeśli chcesz kompletnie odświeżyć schemat, możesz DROP/CREATE. Ryzykowne, ale szybkie.

```sql
-- Przykład: drop i recreate subscriptions
DROP TABLE IF EXISTS subscriptions CASCADE;
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_id text NOT NULL,
  status text NOT NULL,
  billing_cycle text DEFAULT 'monthly',
  payment_method text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 3a) (Opcjonalnie) Recreate pozostałych tabel aplikacji

Uwaga: Dopasuj definicje do swojej bazy, jeśli masz już te tabele – to bezpieczne „IF NOT EXISTS”.

```sql
-- LINKS: główna tabela linków
CREATE TABLE IF NOT EXISTS links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_url text NOT NULL,
  short_code text NOT NULL UNIQUE,
  clicks integer NOT NULL DEFAULT 0,
  -- Dodatkowe pola pomocnicze dla widoku "Linki":
  tags jsonb NOT NULL DEFAULT '[]', -- np. ["promo","blog"]
  hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Przydatne indeksy
CREATE INDEX IF NOT EXISTS idx_links_user_created_at ON links (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_links_short_code ON links (short_code);

-- LINK_CLICKS: zdarzenia kliknięć
CREATE TABLE IF NOT EXISTS link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at timestamptz NOT NULL DEFAULT now(),
  device_type text,  -- mobile/desktop/tablet/unknown
  browser text,      -- Chrome/Safari/Firefox...
  os text,           -- iOS/Android/Windows/macOS...
  country text       -- kod kraju (np. "PL")
);

CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id ON link_clicks (link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON link_clicks (clicked_at);

-- MONTHLY_USAGE: licznik miesięczny per user
CREATE TABLE IF NOT EXISTS monthly_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL,
  links_created int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, year, month)
);
```

### 3b) (Opcjonalnie) Recreate funkcji RPC do inkrementacji użycia

Backend woła `rpc('increment_monthly_usage', { p_user_id: ... })`. Poniżej przykładowa implementacja:

```sql
DROP FUNCTION IF EXISTS public.increment_monthly_usage(uuid);
CREATE OR REPLACE FUNCTION public.increment_monthly_usage(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  y int := extract(year from (now() at time zone 'UTC'))::int;
  m int := extract(month from (now() at time zone 'UTC'))::int;
BEGIN
  INSERT INTO monthly_usage (user_id, year, month, links_created)
  VALUES (p_user_id, y, m, 1)
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET links_created = monthly_usage.links_created + 1;
END;
$$;
```

Jeśli masz inne nazwy kolumn – dostosuj parametry wstawiania/konfliktu.

## 4) Przydatne zapytania diagnostyczne

```sql
-- Najnowsza subskrypcja na użytkownika
SELECT * FROM subscriptions
WHERE user_id = '<USER_ID>'
ORDER BY created_at DESC
LIMIT 1;

-- Miesięczne użycie
SELECT * FROM monthly_usage WHERE user_id = '<USER_ID>' ORDER BY year DESC, month DESC;

-- Linki użytkownika
SELECT * FROM links WHERE user_id = '<USER_ID>' ORDER BY created_at DESC;

-- Top 10 linków po kliknięciach
SELECT id, short_code, original_url, clicks
FROM links
WHERE user_id = '<USER_ID>'
ORDER BY clicks DESC
LIMIT 10;

-- Kliknięcia danego linku (ostatnie 30 dni)
SELECT * FROM link_clicks
WHERE link_id = '<LINK_ID>'
  AND clicked_at >= (now() - interval '30 days')
ORDER BY clicked_at DESC;

-- Suma kliknięć po dacie (ostatnie 30 dni)
SELECT date_trunc('day', clicked_at) AS day, count(*) AS clicks
FROM link_clicks
WHERE link_id = '<LINK_ID>'
  AND clicked_at >= (now() - interval '30 days')
GROUP BY 1
ORDER BY 1;
```

## 5) Notatki
- Zanim zrobisz reset, zatrzymaj ruch (dev serwer) aby uniknąć równoległych zapisów.
- Po resecie zrób szybki smoke test: logowanie, utworzenie linku, upgrade planu.
- W test mode Stripe możesz odtworzyć subskrypcję – pamiętaj o aktualnym webhook URL i sekrecie.

---

## 6) RLS i polityki (przykład dla Supabase)

Upewnij się, że masz włączone RLS i polityki dopasowane do aplikacji. Przykładowo:

```sql
-- Włącz RLS
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;

-- Polityki: użytkownik widzi/zmienia tylko swoje rekordy
DROP POLICY IF EXISTS "links_select_own" ON links;
CREATE POLICY "links_select_own" ON links FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "links_modify_own" ON links;
CREATE POLICY "links_modify_own" ON links FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Kliknięcia: zwykle tylko odczyt przez właściciela linku, zapis przez backend (service role)
DROP POLICY IF EXISTS "clicks_select_owner" ON link_clicks;
CREATE POLICY "clicks_select_owner" ON link_clicks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM links l WHERE l.id = link_clicks.link_id AND l.user_id = auth.uid()
  ));
```

W produkcji dopasuj polityki do realnych potrzeb (np. osobne role dla API serwisowego).

## 7) Szybkie akcje serwisowe

```sql
-- Ustaw użytkownikowi plan FREE (jeśli brak rekordu w subscriptions)
INSERT INTO subscriptions (user_id, plan_id, status, billing_cycle)
VALUES ('<USER_ID>', 'free', 'active', 'monthly')
ON CONFLICT (id) DO NOTHING; -- jeśli masz inne klucze unikalne, usuń ten fragment

-- Oznacz link jako ukryty / dodaj tag (jeśli pola istnieją)
UPDATE links SET hidden = true WHERE id = '<LINK_ID>';
UPDATE links SET tags = (COALESCE(tags, '[]'::jsonb) || '"promo"') WHERE id = '<LINK_ID>';
```

## 8) Sprzątanie auth (głębsze)

Usuwając userów, czasem trzeba oczyścić też `auth.identities`.

```sql
-- Usuń tożsamości powiązane z usuwanymi userami (przykład dla konkretnego emaila)
DELETE FROM auth.identities
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'user@example.com');

-- Następnie usuń użytkownika
DELETE FROM auth.users WHERE email = 'user@example.com';
```

## 9) Checklisty środowiskowe (poza SQL, ale ważne)

- APP_URL w `.env.local` powinno wskazywać na aktywny adres (np. ngrok) w trakcie testów.
- Supabase → Authentication → URL Configuration:
  - Site URL: Twój aktualny adres (np. `https://…ngrok…`)
  - Additional Redirect URLs: dopisz `/api/auth/callback`, `/dashboard` i ewentualne lokalne `http://localhost:3000/...`
- Stripe Webhook: upewnij się, że endpoint wskazuje na aktualny publiczny URL `/api/stripe/webhook` i że sekretny klucz webhooka jest zaktualizowany w `.env.local`.

## 10) Szybki smoke test po resecie

1) Utwórz konto (email/hasło lub Google) → powinno przekierować do wyboru planu.
2) Wybierz FREE → Dashboard.
3) Stwórz link → pojawi się w liście, usage wzrośnie.
4) Otwórz Upgrade i zrób testową płatność → po powrocie subskrypcja stanie się aktywna po webhooku.
