-- ============================================================
-- MassFinder Batch 1: Church-centric normalized schema
-- Run in Supabase SQL Editor
-- ============================================================

-- Churches: the core entity — a physical place with services
CREATE TABLE IF NOT EXISTS churches (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  short_name          TEXT,
  type                TEXT,
  address             TEXT,
  city                TEXT NOT NULL,
  state               TEXT NOT NULL,
  zip                 TEXT,
  county              TEXT,
  lat                 FLOAT,
  lng                 FLOAT,
  phone               TEXT,
  phone_secondary     TEXT,
  website             TEXT,
  emails              TEXT[],
  office_hours        TEXT,
  office_address      TEXT,
  mailing_address     TEXT,
  instagram           TEXT,
  facebook            TEXT,
  contact_notes       TEXT,
  established         TEXT,
  status              TEXT DEFAULT 'active',
  is_accessible       BOOLEAN,
  accessibility_notes TEXT,
  bulletin_url        TEXT,
  bulletin_group      TEXT,
  bulletin_url_note   TEXT,
  clergy              JSONB,
  staff               TEXT[],
  validation          JSONB,
  visitation          JSONB,
  notes               TEXT,
  data                JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_churches_city ON churches (city);
CREATE INDEX idx_churches_state ON churches (state);
CREATE INDEX idx_churches_status ON churches (status);
CREATE INDEX idx_churches_bulletin_group ON churches (bulletin_group);

-- Services: recurring schedule items at a church
CREATE TABLE IF NOT EXISTS services (
  id                  TEXT PRIMARY KEY,
  church_id           TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  type                TEXT NOT NULL,
  day                 TEXT,
  time                TEXT,
  end_time            TEXT,
  language            TEXT DEFAULT 'en',
  languages           TEXT[],
  notes               TEXT,
  title               TEXT,
  category            TEXT,
  times_vary          BOOLEAN DEFAULT FALSE,
  time_is_inferred    BOOLEAN DEFAULT FALSE,
  perpetual           BOOLEAN DEFAULT FALSE,
  rite                TEXT,
  status              TEXT DEFAULT 'active',
  source              TEXT,
  date                TEXT,
  effective_date      TEXT,
  end_date            TEXT,
  note_expires        TEXT,
  location            TEXT,
  language_note       TEXT,
  recurrence          JSONB,
  seasonal            JSONB,
  data                JSONB,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_church_id ON services (church_id);
CREATE INDEX idx_services_type ON services (type);
CREATE INDEX idx_services_day ON services (day);
CREATE INDEX idx_services_church_type_day ON services (church_id, type, day);

-- Events: time-bounded happenings at or near a church
CREATE TABLE IF NOT EXISTS events (
  id                  TEXT PRIMARY KEY,
  church_id           TEXT REFERENCES churches(id) ON DELETE SET NULL,
  category            TEXT NOT NULL,
  title               TEXT NOT NULL,
  type                TEXT,
  description         TEXT,
  date                TEXT,
  dates               TEXT[],
  day                 TEXT,
  time                TEXT,
  end_time            TEXT,
  end_date            TEXT,
  venue_name          TEXT,
  venue_address       TEXT,
  venue_lat           FLOAT,
  venue_lng           FLOAT,
  contact_name        TEXT,
  contact_email       TEXT,
  contact_phone       TEXT,
  image_url           TEXT,
  flyer_url           TEXT,
  registration_url    TEXT,
  tags                TEXT[],
  notes               TEXT,
  social              BOOLEAN DEFAULT FALSE,
  service_id          TEXT,
  data                JSONB,
  status              TEXT DEFAULT 'active',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_church_id ON events (church_id);
CREATE INDEX idx_events_category ON events (category);

-- Metadata: key-value config store
CREATE TABLE IF NOT EXISTS metadata (
  key                 TEXT PRIMARY KEY,
  data                JSONB NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read churches" ON churches FOR SELECT USING (true);
CREATE POLICY "Public read services" ON services FOR SELECT USING (true);
CREATE POLICY "Public read events" ON events FOR SELECT USING (true);
CREATE POLICY "Public read metadata" ON metadata FOR SELECT USING (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_churches_updated_at
  BEFORE UPDATE ON churches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_metadata_updated_at
  BEFORE UPDATE ON metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
