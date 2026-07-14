-- Add shopId to crypto_addresses so sellers can have their own payment details.
-- Admin/platform addresses have shopId = null.
-- Run in Supabase SQL Editor if crypto_addresses already exists.

ALTER TABLE crypto_addresses ADD COLUMN IF NOT EXISTS "shopId" TEXT REFERENCES shops(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "crypto_addresses_shopId_idx" ON crypto_addresses("shopId");
