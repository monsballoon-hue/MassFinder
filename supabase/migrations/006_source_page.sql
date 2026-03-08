-- Add source_page column to bulletin_changes for PDF page tracking
-- Allows the review UI to sync the PDF viewer to the page where each item was found.

ALTER TABLE bulletin_changes ADD COLUMN IF NOT EXISTS source_page INT;
