-- US10: Add personal notes to favorited dishes
-- Adds a nullable `note` column to diner_favorite_dishes.
-- Notes are private (scoped by profile_id) and enforced to 300 chars.
ALTER TABLE diner_favorite_dishes ADD COLUMN note text;

ALTER TABLE diner_favorite_dishes
  ADD CONSTRAINT diner_favorite_dishes_note_length_check
  CHECK (note IS NULL OR char_length(note) <= 300);
