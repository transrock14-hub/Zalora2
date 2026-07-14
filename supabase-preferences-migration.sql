-- Account preferences: notification + privacy toggles
-- Run this in Supabase SQL Editor after the main schema.

ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb;
