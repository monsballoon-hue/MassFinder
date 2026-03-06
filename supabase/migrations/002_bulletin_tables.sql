-- ============================================================
-- Batch 2: Bulletin parsing tables
-- Run in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- Bulletins: one row per church per week
CREATE TABLE IF NOT EXISTS bulletins (
  id              SERIAL PRIMARY KEY,
  church_id       TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  bulletin_date   DATE NOT NULL,
  source_url      TEXT,
  source_domain   TEXT,
  page_count      INT,
  pdf_path        TEXT,
  status          TEXT DEFAULT 'pending',
  parsed_at       TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     TEXT,
  raw_extraction  JSONB,
  parse_cost_usd  FLOAT,
  parse_model     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, bulletin_date)
);

CREATE INDEX idx_bulletins_church_id ON bulletins (church_id);
CREATE INDEX idx_bulletins_status ON bulletins (status);
CREATE INDEX idx_bulletins_date ON bulletins (bulletin_date);

-- Bulletin items: individual extracted entries
CREATE TABLE IF NOT EXISTS bulletin_items (
  id              SERIAL PRIMARY KEY,
  bulletin_id     INT NOT NULL REFERENCES bulletins(id) ON DELETE CASCADE,
  church_id       TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  event_date      DATE,
  event_time      TEXT,
  end_time        TEXT,
  end_date        DATE,
  location        TEXT,
  contact_name    TEXT,
  contact_phone   TEXT,
  contact_email   TEXT,
  registration_url TEXT,
  recurring       TEXT,
  tags            TEXT[],
  source_page     INT,
  confidence      FLOAT,
  is_new          BOOLEAN DEFAULT TRUE,
  status          TEXT DEFAULT 'pending',
  data            JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bulletin_items_bulletin_id ON bulletin_items (bulletin_id);
CREATE INDEX idx_bulletin_items_church_id ON bulletin_items (church_id);
CREATE INDEX idx_bulletin_items_category ON bulletin_items (category);
CREATE INDEX idx_bulletin_items_status ON bulletin_items (status);
CREATE INDEX idx_bulletin_items_event_date ON bulletin_items (event_date);

-- Full-text search on bulletin items
CREATE INDEX idx_bulletin_items_search ON bulletin_items
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Parish profiles: per-church context for prompt injection
CREATE TABLE IF NOT EXISTS parish_profiles (
  church_id           TEXT PRIMARY KEY REFERENCES churches(id) ON DELETE CASCADE,
  bulletin_publisher  TEXT,
  typical_page_count  INT,
  page_layout_notes   TEXT,
  known_recurring     TEXT[],
  common_locations    TEXT[],
  parsing_notes       TEXT,
  last_accuracy_pct   FLOAT,
  total_parsed        INT DEFAULT 0,
  total_corrections   INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: public read, service-role write
ALTER TABLE bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE parish_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read bulletins" ON bulletins FOR SELECT USING (true);
CREATE POLICY "Public read bulletin_items" ON bulletin_items FOR SELECT USING (true);
CREATE POLICY "Public read parish_profiles" ON parish_profiles FOR SELECT USING (true);

-- Updated_at triggers (reuses update_updated_at() from migration 001)
CREATE TRIGGER set_bulletins_updated_at
  BEFORE UPDATE ON bulletins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_bulletin_items_updated_at
  BEFORE UPDATE ON bulletin_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_parish_profiles_updated_at
  BEFORE UPDATE ON parish_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
