-- Hide approved deposits/withdrawals from admin view only (users still see them).
-- Run in Supabase SQL Editor.

ALTER TABLE deposit_requests
  ADD COLUMN IF NOT EXISTS "hiddenFromAdmin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS "hiddenFromAdmin" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN deposit_requests."hiddenFromAdmin" IS
  'When true, row is hidden from admin Deposit Approvals but still visible to the user.';

COMMENT ON COLUMN withdrawal_requests."hiddenFromAdmin" IS
  'When true, row is hidden from admin Withdrawal Approvals but still visible to the user.';
