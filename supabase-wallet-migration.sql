-- Wallet: deposit and withdrawal requests for admin approval
-- Run this in Supabase SQL Editor after main schema

-- Deposit requests (recharge / top-up) — userId = who initiated; shopId = when for shop balance
CREATE TABLE IF NOT EXISTS deposit_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "shopId" TEXT,
    currency TEXT NOT NULL,
    network TEXT,
    amount DECIMAL(18,8) NOT NULL,
    "amountReceived" DECIMAL(18,8),
    "proofUrl" TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deposit_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "deposit_requests_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "deposit_requests_userId_idx" ON deposit_requests("userId");
CREATE INDEX IF NOT EXISTS "deposit_requests_shopId_idx" ON deposit_requests("shopId");
CREATE INDEX IF NOT EXISTS "deposit_requests_status_idx" ON deposit_requests(status);

-- Withdrawal requests — userId = who initiated; shopId = when for shop balance
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "shopId" TEXT,
    currency TEXT NOT NULL,
    network TEXT,
    address TEXT NOT NULL,
    amount DECIMAL(18,8) NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "withdrawal_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "withdrawal_requests_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "withdrawal_requests_userId_idx" ON withdrawal_requests("userId");
CREATE INDEX IF NOT EXISTS "withdrawal_requests_shopId_idx" ON withdrawal_requests("shopId");
CREATE INDEX IF NOT EXISTS "withdrawal_requests_status_idx" ON withdrawal_requests(status);

-- Trigger for updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_deposit_requests_updated_at ON deposit_requests;
CREATE TRIGGER update_deposit_requests_updated_at BEFORE UPDATE ON deposit_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_withdrawal_requests_updated_at ON withdrawal_requests;
CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON withdrawal_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- If deposit_requests / withdrawal_requests already exist (no shopId), run:
-- ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS "shopId" TEXT REFERENCES shops(id) ON DELETE CASCADE;
-- ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS "shopId" TEXT REFERENCES shops(id) ON DELETE CASCADE;
-- CREATE INDEX IF NOT EXISTS "deposit_requests_shopId_idx" ON deposit_requests("shopId");
-- CREATE INDEX IF NOT EXISTS "withdrawal_requests_shopId_idx" ON withdrawal_requests("shopId");
