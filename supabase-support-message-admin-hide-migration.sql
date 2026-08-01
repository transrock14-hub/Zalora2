-- Hide support messages from admin view only (customer still sees them).
-- Run in Supabase SQL Editor.

ALTER TABLE ticket_messages
  ADD COLUMN IF NOT EXISTS "hiddenFromAdmin" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN ticket_messages."hiddenFromAdmin" IS
  'When true, message is hidden from admin support UI but still visible to the customer.';

CREATE INDEX IF NOT EXISTS "ticket_messages_hiddenFromAdmin_idx"
  ON ticket_messages ("hiddenFromAdmin")
  WHERE "hiddenFromAdmin" = true;
