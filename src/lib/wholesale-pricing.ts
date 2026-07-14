/**
 * Reseller pricing: sales price is always 20% above wholesale.
 * - Wholesale (costPrice): deducted from seller balance when the order is processed/shipped
 * - Sales (price): paid by the buyer; credited to the seller when delivered
 * - Profit = sales − wholesale = 20% of wholesale
 */

export const WHOLESALE_SALES_MARKUP = 0.2

export function salesPriceFromWholesale(wholesale: number): number {
  const w = Number(wholesale)
  if (!Number.isFinite(w) || w <= 0) return 0
  return Math.round(w * (1 + WHOLESALE_SALES_MARKUP) * 100) / 100
}

export function wholesalePriceFromSales(sales: number): number {
  const s = Number(sales)
  if (!Number.isFinite(s) || s <= 0) return 0
  return Math.round((s / (1 + WHOLESALE_SALES_MARKUP)) * 100) / 100
}

/** Normalize a catalog pair so sales is exactly +20% over wholesale. Prefer wholesale as source of truth. */
export function normalizeWholesalePair(input: {
  wholesalePrice?: number | null
  salePrice?: number | null
  price?: number | null
}): { wholesalePrice: number; salePrice: number } | null {
  const wholesale =
    input.wholesalePrice != null && Number(input.wholesalePrice) > 0
      ? Number(input.wholesalePrice)
      : input.salePrice != null && Number(input.salePrice) > 0
        ? wholesalePriceFromSales(Number(input.salePrice))
        : input.price != null && Number(input.price) > 0
          ? wholesalePriceFromSales(Number(input.price))
          : 0

  if (!(wholesale > 0)) return null
  return {
    wholesalePrice: Math.round(wholesale * 100) / 100,
    salePrice: salesPriceFromWholesale(wholesale),
  }
}
