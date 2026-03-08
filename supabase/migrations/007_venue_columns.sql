-- Add venue_name + venue_address columns to bulletin_changes for actionable location data.
-- venue_name: display label ("Parish Hall", "Church basement")
-- venue_address: full street address for maps CTA and ICS calendar embeds

ALTER TABLE bulletin_changes ADD COLUMN IF NOT EXISTS venue_name TEXT;
ALTER TABLE bulletin_changes ADD COLUMN IF NOT EXISTS venue_address TEXT;
