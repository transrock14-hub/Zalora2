-- Wholesale settlement idempotency markers on orders.
-- Prevents double-charging wholesale or double-paying the sales price when an
-- order's status is updated more than once. Safe to run multiple times.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS "wholesaleChargedAt" TIMESTAMP(3);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS "salesPaidOutAt" TIMESTAMP(3);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS "settlementRefundedAt" TIMESTAMP(3);
