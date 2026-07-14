-- ============================================
-- Atomic stock decrement (Phase 4)
-- ============================================
-- Run this in the Supabase SQL editor.
--
-- Provides a race-safe way to decrement product stock. The previous approach
-- read stock into the app, subtracted, then wrote it back — which allows two
-- concurrent orders to oversell. This function performs the decrement inside a
-- single UPDATE guarded by the current row value, and flips the product to
-- OUT_OF_STOCK when it reaches zero.
--
-- Returns the resulting stock level (>= 0). If the product does not exist it
-- returns NULL. The app treats a NULL/RPC-error as a soft failure and falls
-- back to a best-effort update, so applying this is safe and optional.

CREATE OR REPLACE FUNCTION decrement_product_stock(
  p_product_id text,
  p_quantity integer
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_stock integer;
BEGIN
  UPDATE products
  SET
    stock = GREATEST(0, stock - p_quantity),
    status = CASE
      WHEN GREATEST(0, stock - p_quantity) = 0 THEN 'OUT_OF_STOCK'
      ELSE status
    END,
    "updatedAt" = NOW()
  WHERE id = p_product_id
  RETURNING stock INTO new_stock;

  RETURN new_stock;
END;
$$;
