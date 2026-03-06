-- ============================================================
-- Batch 2b: Add new columns to bulletin_items for v2 extraction
-- Run in Supabase SQL Editor after 002_bulletin_tables.sql
-- ============================================================

-- Item type: service, event, or notice
ALTER TABLE bulletin_items ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'event';

-- Verbatim text from bulletin
ALTER TABLE bulletin_items ADD COLUMN IF NOT EXISTS original_text TEXT;

-- Liturgical season flag
ALTER TABLE bulletin_items ADD COLUMN IF NOT EXISTS seasonal TEXT;

-- Language for bilingual services
ALTER TABLE bulletin_items ADD COLUMN IF NOT EXISTS language TEXT;

-- Cross-advertised event host church
ALTER TABLE bulletin_items ADD COLUMN IF NOT EXISTS host_parish TEXT;

-- Update full-text search index to include original_text
DROP INDEX IF EXISTS idx_bulletin_items_search;
CREATE INDEX idx_bulletin_items_search ON bulletin_items
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(original_text, '') || ' ' || coalesce(description, '')));

-- Index on item_type for filtering services vs events
CREATE INDEX IF NOT EXISTS idx_bulletin_items_type ON bulletin_items (item_type);

-- Index on seasonal for filtering seasonal items
CREATE INDEX IF NOT EXISTS idx_bulletin_items_seasonal ON bulletin_items (seasonal) WHERE seasonal IS NOT NULL;
