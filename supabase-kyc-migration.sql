-- KYC / Shop Verification migration
-- Run this in Supabase SQL Editor if you already have the main schema and need to add KYC verification.

-- VerificationStatus enum for KYC
DO $$ BEGIN
    CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Shop Verifications (KYC) table - one per shop
CREATE TABLE IF NOT EXISTS shop_verifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "inviteCode" TEXT,
    "idCardFront" TEXT,
    "idCardBack" TEXT,
    "mainBusiness" TEXT,
    "detailedAddress" TEXT,
    status "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shop_verifications_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES shops(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shop_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shop_verifications_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "shop_verifications_shopId_idx" ON shop_verifications("shopId");
CREATE INDEX IF NOT EXISTS "shop_verifications_userId_idx" ON shop_verifications("userId");
CREATE INDEX IF NOT EXISTS "shop_verifications_status_idx" ON shop_verifications(status);

-- Trigger for updatedAt (requires update_updated_at_column to exist from main schema)
CREATE TRIGGER update_shop_verifications_updated_at
  BEFORE UPDATE ON shop_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
