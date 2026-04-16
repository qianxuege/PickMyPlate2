-- US10: Add personal notes to favorited dishes
-- Adds a nullable `note` column to diner_favorite_dishes.
-- Notes are private (scoped by profile_id) and enforced to 300 chars at the app layer.
ALTER TABLE diner_favorite_dishes ADD COLUMN note text;
