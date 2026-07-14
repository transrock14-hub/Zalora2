-- Adds the optional "member_since" column to the shops table.
-- Used by the admin shop editor and the public shop page ("Member since").
-- Safe to run multiple times.

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS member_since TIMESTAMP(3);
