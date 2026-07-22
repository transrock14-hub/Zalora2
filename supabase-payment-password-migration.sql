-- Payment / withdraw password (separate from login password).
-- Run in Supabase SQL Editor.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "paymentPassword" TEXT;

COMMENT ON COLUMN users."paymentPassword" IS 'Bcrypt hash for withdraw/payment password; null until set';
