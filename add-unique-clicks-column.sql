-- Dodaj kolumnę unique_clicks do tabeli links
ALTER TABLE links 
ADD COLUMN IF NOT EXISTS unique_clicks INTEGER DEFAULT 0;

-- Ustaw wartość domyślną dla istniejących rekordów (przyjmujemy że wszystkie kliknięcia to unikalne na start)
UPDATE links 
SET unique_clicks = clicks 
WHERE unique_clicks IS NULL OR unique_clicks = 0;

-- Sprawdź wynik
SELECT id, short_code, clicks, unique_clicks FROM links;
