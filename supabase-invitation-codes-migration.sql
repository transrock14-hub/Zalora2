-- Invitation / referral codes (admin-generated, one-time use)
-- Run in Supabase SQL Editor before deploying register invite gate.

DO $$ BEGIN
    CREATE TYPE "InvitationCodeType" AS ENUM ('DIRECT', 'REFERRAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS invitation_codes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE,
    type "InvitationCodeType" NOT NULL DEFAULT 'DIRECT',
    "createdById" TEXT REFERENCES users(id) ON DELETE SET NULL,
    -- For REFERRAL codes: the existing user who may share this code
    "referrerUserId" TEXT REFERENCES users(id) ON DELETE SET NULL,
    "usedByUserId" TEXT REFERENCES users(id) ON DELETE SET NULL,
    "usedAt" TIMESTAMP(3),
    note TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "invitation_codes_type_idx" ON invitation_codes(type);
CREATE INDEX IF NOT EXISTS "invitation_codes_referrerUserId_idx" ON invitation_codes("referrerUserId");
CREATE INDEX IF NOT EXISTS "invitation_codes_usedByUserId_idx" ON invitation_codes("usedByUserId");

-- Optional: who referred this user
ALTER TABLE users ADD COLUMN IF NOT EXISTS "referredByUserId" TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "invitationCodeUsed" TEXT;

COMMENT ON TABLE invitation_codes IS 'Admin-generated one-time invite (6 digits) or referral (R+5 digits) codes';
