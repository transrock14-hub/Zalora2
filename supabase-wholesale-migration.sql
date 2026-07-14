-- Wholesale: add sale_price and wholesale_price to products
-- Admin catalog products (shopId IS NULL) with wholesale_price set appear in Wholesale Management.
-- Sellers with approved shops can "list" them: copy to their shop and pay wholesale_price from shop balance.
-- Run this in Supabase SQL Editor after supabase-schema.sql.

-- Add columns to products (nullable; existing rows unchanged)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS "wholesalePrice" DECIMAL(12,2) NULL,
  ADD COLUMN IF NOT EXISTS "salePrice" DECIMAL(12,2) NULL;

COMMENT ON COLUMN products."wholesalePrice" IS 'Price seller pays when listing from wholesale catalog; deducted from shop balance.';
COMMENT ON COLUMN products."salePrice" IS 'Suggested retail price shown in wholesale modal and to buyers.';

-- sourceProductId: when a seller lists a catalog product, we set this to the catalog product id.
-- Button stays "Listed" until the copy is sold (order completed/delivered) or deleted.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS "sourceProductId" TEXT NULL;

COMMENT ON COLUMN products."sourceProductId" IS 'Catalog product id when listed from wholesale; cleared when order is completed/delivered or product deleted.';

-- Optional: backfill demo/catalog products so they appear in wholesale (uncomment and adjust if needed)
-- UPDATE products SET "wholesalePrice" = price * 0.8, "salePrice" = price WHERE "shopId" IS NULL AND "wholesalePrice" IS NULL;
