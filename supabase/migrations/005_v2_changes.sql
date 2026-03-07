-- ============================================================
-- V2 pipeline: bulletin_changes table + bulletins extensions
-- Run in Supabase SQL Editor after 004_bulletin_items_day.sql
-- ============================================================

-- Add v2 metadata to bulletins table
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS pipeline_version INT DEFAULT 1;
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS text_quality TEXT;
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS text_method TEXT;
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS services_confirmed INT;
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS services_total INT;

-- V2 change results: one row per change item per bulletin run
CREATE TABLE IF NOT EXISTS bulletin_changes (
  id              SERIAL PRIMARY KEY,
  bulletin_id     INT NOT NULL REFERENCES bulletins(id) ON DELETE CASCADE,
  church_id       TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,

  -- Change classification
  change_type     TEXT NOT NULL CHECK (change_type IN (
    'confirmed', 'modified', 'not_found',
    'new_service', 'event', 'notice'
  )),

  -- Service reference (for confirmed/modified/not_found)
  service_num     INT,
  service_id      TEXT,

  -- Modification details (for modified)
  field_changed   TEXT,
  old_value       TEXT,
  new_value       TEXT,

  -- New service fields
  service_type    TEXT,
  day             TEXT,
  time            TEXT,
  end_time        TEXT,
  language        TEXT,
  seasonal        TEXT,

  -- Event / notice fields
  title           TEXT,
  description     TEXT,
  event_date      DATE,
  event_time      TEXT,
  event_end_time  TEXT,
  location        TEXT,
  category        TEXT,
  effective_date  DATE,

  -- Metadata
  notes           TEXT,
  confidence      FLOAT,
  status          TEXT DEFAULT 'pending' CHECK (status IN (
    'auto_confirmed', 'pending', 'approved', 'rejected'
  )),

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bulletin_changes_bulletin ON bulletin_changes (bulletin_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_changes_church ON bulletin_changes (church_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_changes_type ON bulletin_changes (change_type);
CREATE INDEX IF NOT EXISTS idx_bulletin_changes_status ON bulletin_changes (status);
CREATE INDEX IF NOT EXISTS idx_bulletin_changes_pending ON bulletin_changes (status)
  WHERE status = 'pending';

-- RLS
ALTER TABLE bulletin_changes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read bulletin_changes') THEN
    CREATE POLICY "Public read bulletin_changes" ON bulletin_changes FOR SELECT USING (true);
  END IF;
END $$;

-- Updated_at trigger
DROP TRIGGER IF EXISTS set_bulletin_changes_updated_at ON bulletin_changes;
CREATE TRIGGER set_bulletin_changes_updated_at
  BEFORE UPDATE ON bulletin_changes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
