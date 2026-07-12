-- Add metadata JSONB column to markets table for category-specific attributes

ALTER TABLE markets ADD COLUMN IF NOT EXISTS metadata JSONB;
