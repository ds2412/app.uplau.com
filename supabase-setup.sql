-- 🗄️ SUPABASE SQL - Skopiuj i uruchom w SQL Editor
-- Tabele dla app.uplau.com

-- ============================================
-- 1. Tabela LINKS - Skrócone linki
-- ============================================
CREATE TABLE IF NOT EXISTS links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  title TEXT,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_links_short_code ON links(short_code);
CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at);

-- RLS
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own links" ON links;
CREATE POLICY "Users can view own links" ON links
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own links" ON links;
CREATE POLICY "Users can create own links" ON links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own links" ON links;
CREATE POLICY "Users can update own links" ON links
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own links" ON links;
CREATE POLICY "Users can delete own links" ON links
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can read links for redirect" ON links;
CREATE POLICY "Public can read links for redirect" ON links
  FOR SELECT USING (true);

-- ============================================
-- 2. Tabela LINK_CLICKS - Analityka
-- ============================================
CREATE TABLE IF NOT EXISTS link_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  referrer TEXT,
  ip_address TEXT
);

CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id ON link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON link_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_link_clicks_country ON link_clicks(country);
CREATE INDEX IF NOT EXISTS idx_link_clicks_device_type ON link_clicks(device_type);

-- RLS
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view clicks of own links" ON link_clicks;
CREATE POLICY "Users can view clicks of own links" ON link_clicks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM links 
      WHERE links.id = link_clicks.link_id 
      AND links.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can create click records" ON link_clicks;
CREATE POLICY "Public can create click records" ON link_clicks
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 3. Tabela MONTHLY_USAGE - Limity miesięczne
-- ============================================
CREATE TABLE IF NOT EXISTS monthly_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  links_created INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_usage_user_id ON monthly_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_usage_year_month ON monthly_usage(year, month);

-- RLS
ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage" ON monthly_usage;
CREATE POLICY "Users can view own usage" ON monthly_usage
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own usage" ON monthly_usage;
CREATE POLICY "Users can update own usage" ON monthly_usage
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own usage" ON monthly_usage;
CREATE POLICY "Users can insert own usage" ON monthly_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. Funkcja - Auto-increment miesięcznego usage
-- ============================================
CREATE OR REPLACE FUNCTION increment_monthly_usage(p_user_id UUID)
RETURNS void AS $$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM NOW());
  current_month INTEGER := EXTRACT(MONTH FROM NOW());
BEGIN
  INSERT INTO monthly_usage (user_id, year, month, links_created)
  VALUES (p_user_id, current_year, current_month, 1)
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET 
    links_created = monthly_usage.links_created + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ✅ GOTOWE! Wszystkie tabele utworzone.
-- ============================================
