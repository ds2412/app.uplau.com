-- ============================================
-- QR CODES FEATURE - Database Setup
-- ============================================
-- Utworzono: 16.10.2025
-- Cel: Dodanie systemu QR kodów do aplikacji

-- 1. Tabela qr_codes - przechowuje wygenerowane QR kody
-- ============================================
CREATE TABLE IF NOT EXISTS qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    link_id UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    qr_image_data TEXT NOT NULL, -- Base64 encoded PNG image
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Każdy link może mieć tylko 1 QR kod
    UNIQUE(link_id)
);

-- Index dla szybkich zapytań
CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_link_id ON qr_codes(link_id);

-- 2. Dodaj kolumnę qr_codes_created do monthly_usage
-- ============================================
ALTER TABLE monthly_usage 
ADD COLUMN IF NOT EXISTS qr_codes_created INTEGER DEFAULT 0;

-- 3. Row Level Security (RLS) dla qr_codes
-- ============================================
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;

-- User może widzieć tylko swoje QR kody
CREATE POLICY "Users can view own QR codes"
    ON qr_codes FOR SELECT
    USING (auth.uid() = user_id);

-- User może tworzyć swoje QR kody
CREATE POLICY "Users can create own QR codes"
    ON qr_codes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- User może usuwać swoje QR kody
CREATE POLICY "Users can delete own QR codes"
    ON qr_codes FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- KOMENTARZE DO ZROZUMIENIA:
-- ============================================
-- qr_codes.link_id → foreign key do links(id)
--   - Każdy QR kod jest przypisany do konkretnego linka
--   - Jak link zostanie usunięty → QR kod też (CASCADE)
--
-- qr_image_data → Base64 string PNG
--   - Zapisujemy sam obrazek jako text (base64)
--   - Można go od razu wyświetlić w <img src="data:image/png;base64,..." />
--
-- UNIQUE(link_id) → jeden link = jeden QR kod
--   - User nie może stworzyć 2 QR kodów dla tego samego linka
--   - Musi usunąć stary żeby stworzyć nowy
--
-- monthly_usage.qr_codes_created → counter
--   - Zlicza ile QR kodów user stworzył w danym miesiącu
--   - Używamy do sprawdzania limitów (FREE: 1, Starter: 1, PRO: 1)
