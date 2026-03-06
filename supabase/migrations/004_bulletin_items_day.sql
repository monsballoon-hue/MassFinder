-- ============================================================
-- Batch 2c: Add day column to bulletin_items
-- Run in Supabase SQL Editor after 003_bulletin_items_v2.sql
-- ============================================================

-- Day of week for services (monday, tuesday, ..., weekday, daily, first_friday, etc.)
ALTER TABLE bulletin_items ADD COLUMN IF NOT EXISTS day TEXT;

-- Index for filtering by day
CREATE INDEX IF NOT EXISTS idx_bulletin_items_day ON bulletin_items (day) WHERE day IS NOT NULL;
