# Full-Project Translation Analysis

**Status:** Analysis only. No code changes applied until you approve.

---

## 1. Current translation setup

- **Location:** `src/lib/translations.ts`, `src/contexts/language-context.tsx`, `src/components/language-selector.tsx`
- **Languages:** `en`, `zh-CN`, `zh-TW`, `de`, `fr`, `ja`, `es`, `vi`, `th`, `ko`, `tr`, `pt`, `ru`, `id`, `it` (15 locales)
- **Keys in English:** ~98 keys (header, homepage, product, footer, categories, pages, cart/checkout, common)
- **Behaviour:** `t(key)` → current language → fallback to English → then key. So **missing translation = English**, then raw key.

**Category names:** `src/lib/category-translations.ts` maps category slugs to translation keys; category labels use `t(key)` where key exists.

---

## 2. Product names and DB content

- **Product names:** Stored in DB as `products.name`. Today they are shown as-is (no per-language field).
- **Plan:**  
  - **Phase 1 (this work):** All **UI** strings go through `t()`. Product/category **names from DB** stay as-is (effectively English).  
  - **Optional later:** Add translated product names (e.g. `product_translations` table or `name_zh`, `name_ja` on products) and a helper like `getProductName(product, lang)` with fallback to `product.name`. Not part of this implementation.
- **Rule:** “If name isn’t there, stays in English” → implemented by current `t()` fallback (English then key). For DB content we don’t translate yet, so it stays as stored (English).

---

## 3. Scope: what needs to be translated

### A. Store (customer-facing) app — **~55 files**

| Area | Files | Notes |
|------|--------|--------|
| **Account** | account-client, addresses, billing, favorites, notifications, orders (list + detail), password, profile, settings, support, wallet (main + topup + withdraw + records) | Many labels/buttons/titles hardcoded |
| **Cart & checkout** | cart/page, checkout-client | Partially use `t()`; many strings still hardcoded |
| **Categories** | categories-client, category-products-client, categories page | Category names use slug→key where mapped; page titles/UI need `t()` |
| **Products** | products-client, product-detail-client, products page | UI strings; product names from DB stay as-is |
| **Seller** | create-shop, dashboard, orders (list + detail), products (list + form + add-from-catalog), shop, shop wallet (topup/withdraw/records), verification-status | Almost all copy hardcoded |
| **Other store** | home-client, about, contact, deals, merchant-agreement, shops/[slug] | Mix of `t()` and hardcoded |
| **Auth (store flow)** | login, register, forgot-password | Labels, errors, buttons hardcoded |

### B. Shared layout / components — **~12 files**

| Component | Notes |
|-----------|--------|
| `layout/header.tsx` | Search placeholder, “Search Products”, nav labels, user menu |
| `layout/bottom-nav.tsx` | Already uses `t()` for nav labels |
| `layout/store-sidebar.tsx` | Category and “About” labels |
| `layout/chat-widget.tsx` | Chat UI strings |
| `search-modal.tsx` | Placeholder, buttons, results text |
| `product-card.tsx` | “Add to cart”, price/stock text |
| `product-slider.tsx` | “View all” etc. |
| `notifications-dropdown.tsx` | “Notifications”, “Mark all read”, empty state |
| `hero-slider.tsx` | Any visible text in slides |
| `language-selector.tsx` | Language names (can stay as-is or use keys) |
| `loading-screen.tsx` | “Loading…” if present |
| `scrolling-text.tsx` | If text is hardcoded |

### C. Admin app (optional for “everything”)

- **~25+ pages:** dashboard, users, shops, products, categories, orders, support, notifications, settings, deposits/withdrawals, crypto-addresses, hero-slides, etc.
- **Recommendation:** Treat as Phase 2; same pattern (add keys, replace strings with `t()`). Not counted in the “store” file count below.

---

## 4. Approach (how we’ll do it)

1. **Extend `translations.ts`**
   - Add new keys for every user-visible string (buttons, labels, titles, placeholders, errors, empty states, etc.).
   - Add the same keys to all 15 languages; for new keys, set English value first, other languages can be filled in (or duplicated from English until you translate).
   - Keep `TranslationKey` as `keyof typeof translations.en` so TypeScript enforces keys.

2. **Use `t()` everywhere**
   - In every affected store page and shared component:
     - Wrap with `LanguageProvider` if not already (store layout already has it).
     - Replace hardcoded English strings with `t('newKey')`.
   - No change to **product names** from API/DB: keep showing `product.name` (and category name from API where applicable). Only UI strings use `t()`.

3. **Fallback**
   - Rely on existing `t()`: `current[key] ?? fallback[key] ?? key`. So missing translation = English, then key. Matches “if name isn’t there stays in english”.

4. **Product names (future)**
   - Not in scope for this pass. Later you can add DB or JSON translations for product names and a small helper that returns translated name or `product.name`.

5. **Order of work**
   - Add keys and EN (and optionally same value for other langs) in batches (e.g. account, then cart/checkout, then seller, then auth, then shared).
   - Then replace strings in the corresponding files so each batch is consistent.

---

## 5. Counts (store + shared only)

| Category | Approx. files to touch | Est. new keys (approx.) |
|----------|------------------------|--------------------------|
| Account (all sub-pages + wallet) | 18 | 80–120 |
| Cart + checkout | 2 | 15–25 |
| Categories + products | 6 | 25–40 |
| Seller (all) | 16 | 100–150 |
| Home, about, contact, deals, merchant-agreement, shops | 8 | 30–50 |
| Auth (login, register, forgot-password) | 3 | 25–40 |
| Shared (header, sidebar, search, product-card, notifications, etc.) | 12 | 40–60 |
| **Total (store + shared)** | **~55–60 files** | **~315–485 new keys** |

(Admin would add ~25+ files and ~150+ keys if you want “everything” including admin.)

---

## 6. Files to change (list)

### Store – account
- `src/app/(store)/account/account-client.tsx`
- `src/app/(store)/account/addresses/addresses-client.tsx`
- `src/app/(store)/account/addresses/page.tsx`
- `src/app/(store)/account/billing/page.tsx`
- `src/app/(store)/account/favorites/favorites-client.tsx`
- `src/app/(store)/account/favorites/page.tsx`
- `src/app/(store)/account/notifications/notifications-client.tsx`
- `src/app/(store)/account/notifications/page.tsx`
- `src/app/(store)/account/orders/orders-client.tsx`
- `src/app/(store)/account/orders/[id]/order-details-client.tsx`
- `src/app/(store)/account/orders/page.tsx`
- `src/app/(store)/account/orders/[id]/page.tsx`
- `src/app/(store)/account/password/page.tsx`
- `src/app/(store)/account/profile/page.tsx`
- `src/app/(store)/account/settings/page.tsx`
- `src/app/(store)/account/support/support-client.tsx`
- `src/app/(store)/account/support/page.tsx`
- `src/app/(store)/account/wallet/wallet-client.tsx`
- `src/app/(store)/account/wallet/page.tsx`
- `src/app/(store)/account/wallet/topup/topup-client.tsx`
- `src/app/(store)/account/wallet/topup/deposit/deposit-form-client.tsx`
- `src/app/(store)/account/wallet/topup/recharge-methods-client.tsx`
- `src/app/(store)/account/wallet/withdraw/form/withdraw-form-client.tsx`
- `src/app/(store)/account/wallet/withdrawal-record/withdrawal-record-client.tsx`
- `src/app/(store)/account/wallet/recharge-record/recharge-record-client.tsx`
- `src/app/(store)/account/wholesale/wholesale-client.tsx`

### Store – cart & checkout
- `src/app/(store)/cart/page.tsx`
- `src/app/(store)/checkout/checkout-client.tsx`

### Store – categories & products
- `src/app/(store)/categories/categories-client.tsx`
- `src/app/(store)/categories/page.tsx`
- `src/app/(store)/categories/[slug]/category-products-client.tsx`
- `src/app/(store)/categories/[slug]/page.tsx`
- `src/app/(store)/products/products-client.tsx`
- `src/app/(store)/products/page.tsx`
- `src/app/(store)/products/[slug]/product-detail-client.tsx`
- `src/app/(store)/products/[slug]/page.tsx`

### Store – seller
- `src/app/(store)/seller/create-shop/create-shop-client.tsx`
- `src/app/(store)/seller/dashboard/dashboard-client.tsx`
- `src/app/(store)/seller/orders/orders-client.tsx`
- `src/app/(store)/seller/orders/[id]/order-details-client.tsx`
- `src/app/(store)/seller/products/products-client.tsx`
- `src/app/(store)/seller/products/product-form-client.tsx`
- `src/app/(store)/seller/products/add-from-catalog-client.tsx`
- `src/app/(store)/seller/shop/shop-client.tsx`
- `src/app/(store)/seller/verification-status/verification-status-client.tsx`
- Seller wallet: topup, deposit, withdraw, withdrawal-record, recharge-record (multiple files)

### Store – other
- `src/app/(store)/home-client.tsx`
- `src/app/(store)/about/about-client.tsx`
- `src/app/(store)/contact/contact-client.tsx`
- `src/app/(store)/deals/deals-client.tsx`
- `src/app/(store)/merchant-agreement/merchant-agreement-client.tsx`
- `src/app/(store)/shops/[slug]/shop-details-client.tsx`

### Auth
- `src/app/auth/login/page.tsx`
- `src/app/auth/register/page.tsx`
- `src/app/auth/forgot-password/page.tsx`

### Shared components
- `src/components/layout/header.tsx`
- `src/components/layout/store-sidebar.tsx`
- `src/components/layout/chat-widget.tsx`
- `src/components/layout/bottom-nav.tsx` (already uses `t()`; verify completeness)
- `src/components/search-modal.tsx`
- `src/components/product-card.tsx`
- `src/components/product-slider.tsx`
- `src/components/notifications-dropdown.tsx`
- `src/components/hero-slider.tsx`
- `src/components/loading-screen.tsx`
- `src/components/scrolling-text.tsx` (if it has user-facing text)

---

## 7. Summary

- **Translation system:** Already in place; `t()` with English fallback matches “if name isn’t there stays in english”.
- **Product names:** No change in this pass; keep using DB name (English). Optional later: product-level translations.
- **Scope (this plan):** All store pages + shared layout/components + auth pages.
- **Rough numbers:** ~55–60 files, ~315–485 new translation keys across 15 languages.
- **Admin:** Excluded from this count; can be Phase 2 with the same approach.

No code has been changed. Once you approve this plan, implementation can proceed in the order above (e.g. account → cart/checkout → categories/products → seller → other store → auth → shared components), adding keys and replacing strings in batches.
