-- Add board JSONB column to exercises table
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS board jsonb;
