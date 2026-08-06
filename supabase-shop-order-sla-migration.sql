-- Auto-block shops that leave orders unprocessed for 24h+.
-- Run in Supabase SQL Editor.
-- autoBlockedAt distinguishes SLA blocks (auto-restore) from manual admin SUSPENDED.

ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS "autoBlockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "autoBlockReason" TEXT;

CREATE INDEX IF NOT EXISTS "shops_autoBlockedAt_idx" ON shops ("autoBlockedAt");
