-- Clean event scheduling model for bulletin_changes events.
-- Replaces the dates:[...] hack in the notes column with proper typed columns.
--
-- recurrence_type: discriminator for scheduling mode
--   once   = single occurrence (event_date)
--   series = specific list of dates (dates[]), event_date = first, effective_date = last
--   weekly = repeats every 'day' of week, optional event_date (start) + effective_date (end)
--
-- dates: proper TEXT[] array for series events (replaces notes encoding)

ALTER TABLE bulletin_changes ADD COLUMN IF NOT EXISTS recurrence_type TEXT
  CHECK (recurrence_type IN ('once', 'series', 'weekly'));

ALTER TABLE bulletin_changes ADD COLUMN IF NOT EXISTS dates TEXT[];
