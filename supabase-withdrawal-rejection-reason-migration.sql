-- Mandatory admin rejection reason for withdrawal requests.
-- Run in Supabase SQL Editor.

ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;

COMMENT ON COLUMN withdrawal_requests."rejectionReason" IS
  'Reason provided by admin when rejecting; shown to the merchant/user.';
