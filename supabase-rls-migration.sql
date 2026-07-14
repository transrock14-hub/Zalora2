-- ============================================================
-- Row Level Security (RLS) — Phase 4  [OPTIONAL / STAGED]
-- ============================================================
--
-- ⚠️  READ THIS BEFORE RUNNING ⚠️
--
-- This app accesses ALL data server-side using the Supabase SERVICE ROLE key
-- (see src/lib/supabase.ts -> supabaseAdmin). The service role BYPASSES RLS,
-- so enabling RLS does NOT break server rendering or any API route. RLS here is
-- defense-in-depth: it stops anyone who obtains the public anon key from reading
-- data directly against the Supabase REST/Realtime endpoints.
--
-- WHAT CHANGES AT RUNTIME:
--   * Realtime subscriptions use the browser (anon) client + the user's Supabase
--     Auth session. Postgres-changes Realtime RESPECTS RLS. After enabling RLS,
--     the app's realtime features (notifications dropdown, support chat) will
--     only deliver rows the connected user is allowed to SELECT.
--   * Users authenticated via the LEGACY JWT system (e.g. the seeded admin) have
--     NO Supabase Auth session, so their realtime connections are `anon`. The
--     owner-scoped policies below will NOT match them and their realtime updates
--     will stop. Their normal pages still work (server-rendered via service role).
--
-- RECOMMENDATION: run Step 1 + Step 2 first, verify the storefront and a normal
-- (Supabase-Auth) user's notifications/support still update live, THEN decide on
-- the admin support realtime note in Step 3.
--
-- To ROLL BACK, run: ALTER TABLE <name> DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 1 — Enable RLS on every table
-- ============================================================
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_verifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images      ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants    ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags                ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_slides         ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_sections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_addresses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;

-- At this point, with NO policies, the anon/authenticated roles can read
-- NOTHING directly (service role still works). If you stop here, realtime
-- notifications/support will go silent. Continue to Step 2 to restore them.

-- ============================================================
-- STEP 2 — Policies
-- ============================================================

-- ---- Public, read-only catalog / CMS (safe to expose) ----
CREATE POLICY "public read products"        ON products        FOR SELECT USING (true);
CREATE POLICY "public read product_images"  ON product_images  FOR SELECT USING (true);
CREATE POLICY "public read product_variants" ON product_variants FOR SELECT USING (true);
CREATE POLICY "public read categories"      ON categories      FOR SELECT USING (true);
CREATE POLICY "public read tags"            ON tags            FOR SELECT USING (true);
CREATE POLICY "public read product_tags"    ON product_tags    FOR SELECT USING (true);
CREATE POLICY "public read reviews"         ON reviews         FOR SELECT USING (true);
CREATE POLICY "public read hero_slides"     ON hero_slides     FOR SELECT USING (true);
CREATE POLICY "public read home_sections"   ON home_sections   FOR SELECT USING (true);
CREATE POLICY "public read banners"         ON banners         FOR SELECT USING (true);
CREATE POLICY "public read pages"           ON pages           FOR SELECT USING (true);
CREATE POLICY "public read faqs"            ON faqs            FOR SELECT USING (true);
CREATE POLICY "public read shops"           ON shops           FOR SELECT USING (true);

-- ---- Owner-scoped private data (needed for user realtime) ----
-- These match Supabase-Auth users where users.id == auth.uid().
CREATE POLICY "own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = "userId");

CREATE POLICY "own tickets" ON support_tickets
  FOR SELECT USING (auth.uid()::text = "userId");

-- ticket_messages has no userId; scope via the parent ticket's owner.
CREATE POLICY "own ticket messages" ON ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = ticket_messages."ticketId"
        AND t."userId" = auth.uid()::text
    )
  );

CREATE POLICY "own orders"     ON orders     FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "own addresses"  ON addresses  FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "own favorites"  ON favorites  FOR SELECT USING (auth.uid()::text = "userId");
CREATE POLICY "own cart"       ON cart_items FOR SELECT USING (auth.uid()::text = "userId");

-- NOTE: No INSERT/UPDATE/DELETE policies are defined for the anon/authenticated
-- roles on purpose — all writes go through server API routes using the service
-- role. Do NOT add write policies unless you intentionally move writes client-side.

-- ============================================================
-- STEP 3 — Admin realtime for support (decide per your needs)
-- ============================================================
-- The admin support dashboard subscribes to ALL support_tickets / ticket_messages
-- via the browser client. With the owner-scoped policies above, an admin only
-- receives realtime for tickets they personally own. Options:
--
--   (a) Accept it: the dashboard already re-fetches via server APIs; live pings
--       just won't fire for other users' tickets. Simplest, most secure.
--
--   (b) Keep these two tables OUT of RLS (comment out their ALTER lines in
--       Step 1) if live admin support is important and you accept that the anon
--       key could read support data directly.
--
--   (c) Advanced: add an admin bypass policy keyed off a JWT role claim, which
--       requires issuing Supabase sessions with a custom role claim for admins.
