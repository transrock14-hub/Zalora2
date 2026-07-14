# ZALORA Fashion — Admin & Platform Manual

This manual is written for **administrators** who run and control the ZALORA Fashion platform. It explains every admin capability, then summarizes how shoppers and sellers use the store. Use it to understand and operate the full system.

---

## Table of Contents

**Part A — Admin (Full Control)**  
1. [Admin access and roles](#1-admin-access-and-roles)  
2. [Dashboard](#2-dashboard)  
3. [Users](#3-users)  
4. [Products](#4-products)  
5. [Categories](#5-categories)  
6. [Orders](#6-orders)  
7. [Shops & KYC](#7-shops--kyc)  
8. [Homepage (hero slides)](#8-homepage-hero-slides)  
9. [Coupons](#9-coupons)  
10. [Support tickets](#10-support-tickets)  
11. [Notifications](#11-notifications)  
12. [CMS Pages](#12-cms-pages)  
13. [Crypto addresses](#13-crypto-addresses)  
14. [Deposit approvals](#14-deposit-approvals)  
15. [Withdrawal approvals](#15-withdrawal-approvals)  
16. [Settings](#16-settings)  

**Part B — Store, shoppers & sellers**  
17. [Store front (shoppers)](#17-store-front-shoppers)  
18. [Sellers](#18-sellers)  
19. [Wholesale catalog](#19-wholesale-catalog)  
20. [Quick reference — URLs](#20-quick-reference--urls)  

---

# Part A — Admin (Full Control)

## 1. Admin access and roles

- **Who can use admin:** Only users with role **ADMIN** or **MANAGER** can open the admin panel. Others are redirected to the store home.
- **How to open admin:** Log in with an admin/manager account, then go to **/admin** (or use the redirect after login for these roles).
- **Layout:** Admin has a **sidebar** (Dashboard, Users, Products, Categories, Orders, Shops & KYC, Homepage, Coupons, Support, Notifications, CMS Pages, Crypto Addresses, Deposit Approvals, Withdrawal Approvals, Settings) and a **header** (search, notifications, logout). Use the sidebar to reach each area.
- **Logout:** Use **Logout** in the header to sign out of admin.

---

## 2. Dashboard

**Path:** `/admin` (Dashboard in sidebar)

**What you see:**

- **Summary cards** (click to go to the related section):
  - **Total Users** → `/admin/users`
  - **Total Orders** → `/admin/orders`
  - **Products** → `/admin/products`
  - **Revenue** (sum of orders with payment status COMPLETED)
  - **Pending Orders** (status PENDING_PAYMENT) → `/admin/orders?status=pending`
  - **Active Shops** (shops with status ACTIVE) → `/admin/shops`
  - **Open Tickets** (support tickets with status OPEN) → `/admin/support`
- **Recent orders** — Last 5 orders with order number, customer name, total, status. Click an order to open order details from the Orders section.

**Control:** Dashboard is read-only; use it to see key metrics and jump to Users, Orders, Products, Shops, or Support.

---

## 3. Users

**Path:** `/admin/users`

**What you control:**

- **List all users** with search (name/email), filters (Role: Admin, Manager, User; Status: Active, Suspended, Banned), and pagination.
- **Add user** — "Add User" goes to `/admin/users/new` (if implemented) to create a user.
- **Per-user actions** (dropdown on each row):
  - **Edit user** — Change **Role** (USER, MANAGER, ADMIN), **Status** (ACTIVE, SUSPENDED, BANNED), **Can sell** (allow shop creation). Save to apply.
  - **Login as user** — Impersonate that user: your session is replaced by theirs, and you are redirected to the store home. Use this to see the store as that user (e.g. for support or testing). To return to admin, log out and log in again with your admin account.
  - **View shop** — If the user has a shop, open that shop's admin page (`/admin/shops/[id]`).
  - **Delete user** — Permanently delete the user (confirm in dialog). Use with care.

**User detail page** (`/admin/users/[id]`):

- View and edit **profile**: name, email, phone, role, status, balance, can sell.
- View **shop** (if any): name, slug, status, level, balance, sales, rating, product count, order count.
- View **recent orders** for that user.
- **Update** saves changes to the user.

**Understanding:**

- **Role** — USER (store/seller only), MANAGER or ADMIN (admin panel access).
- **Status** — ACTIVE (normal), SUSPENDED or BANNED (block access as needed).
- **Can sell** — If enabled and they complete KYC, they can create a shop and sell.

---

## 4. Products

**Path:** `/admin/products`

**What you control:**

- **List products** — Search by name or SKU; filter by category and status; pagination.
- **Add product** — "Add Product" → `/admin/products/new` to create a product (name, slug, description, price, compare price, wholesale price, sale price, cost price, category, images, stock, status, featured).
- **Edit product** — Open a product → `/admin/products/[id]` to edit the same fields and save.
- **Product fields:** 
  - **Basic:** name, slug, description, price, compare price, stock, SKU, category, images (upload), status (e.g. DRAFT, PUBLISHED), featured.
  - **Wholesale:** wholesale price (price sellers pay when listing from catalog), sale price (suggested retail price), cost price (for seller products, tracks wholesale cost).
  - Products can belong to a **shop** (seller) or the main catalog (shopId = null).

**Understanding:**

- **Main catalog products** (shopId = null) with **wholesale price** set appear in the Wholesale Management section (`/account/wholesale`). Sellers can list these products to their shop.
- **Seller products** (shopId set) are products created by sellers for their shop.
- You manage the full product catalog (main and seller products). Sellers may only manage their own shop products from the store seller area; admin can manage all.

---

## 5. Categories

**Path:** `/admin/categories`

**What you control:**

- **List categories** — All categories with name, slug, product count, parent (if any), active, show on home.
- **Add category** — Open "Add category" dialog: **Name**, **Slug**, **Description**, **Icon**, **Image** (upload), **Active**, **Show on home**. Save.
- **Edit category** — Click a category to edit the same fields; upload a new image if needed.
- **Delete category** — Remove category (consider product count and children first).

**Understanding:**

- **Active** — Inactive categories are hidden from the store front.
- **Show on home** — Controls whether the category appears on the homepage.
- **Parent** — Categories can have a parent for hierarchy (e.g. "Women" → "Dresses").

---

## 6. Orders

**Path:** `/admin/orders`

**What you control:**

- **List orders** — Filter by **Order status** (e.g. PENDING_PAYMENT, PAID, PROCESSING, SHIPPED, DELIVERED, COMPLETED, CANCELLED, REFUNDED), **Payment status** (PENDING, CONFIRMING, COMPLETED, FAILED, EXPIRED, REFUNDED), **Payment method**. Search by order number, customer name, or email.
- **View order details** — Click an order to open a details panel: customer, shipping address, items (product, quantity, price), subtotal, shipping, tax, total, payment method (e.g. crypto, balance), payment address/memo if crypto, tracking number, admin notes, statuses, dates (created, paid, shipped, delivered).
- **Approve payment** — For orders in **PENDING_PAYMENT** (e.g. crypto paid manually): click **Approve payment**. This marks the order as paid and moves it to processing. Only use after confirming payment was received.
- **Update order** — Change **Order status**, **Payment status**, **Tracking number**, **Admin notes**. Save. Use this to reflect real-world state (e.g. shipped, delivered).

**Order statuses (typical flow):**

- PENDING_PAYMENT → (after payment) PAID / PROCESSING → SHIPPED → DELIVERED → COMPLETED.  
CANCELLED and REFUNDED are for cancelled or refunded orders.

**Control:** You have full visibility and the ability to approve payments and update status/notes/tracking. This is where you reconcile payments (especially crypto) and keep orders in sync with fulfillment.

---

## 7. Shops & KYC

**Path:** `/admin/shops`

**What you control:**

- **List shops** — Search; filter by status (e.g. PENDING, ACTIVE, SUSPENDED, CLOSED). See shop name, owner, status, level, balance, sales, product count, order count.
- **Open a shop** — Click a shop → `/admin/shops/[id]`.

**Shop detail page** (`/admin/shops/[id]`):

- **Shop info:** name, slug, description, logo, banner, status, level, balance, total sales, rating, commission rate, member since, product count, order count, followers.
- **Edit shop** — Change name, slug, description, status, level, balance, rating, commission rate, followers, total sales, order count, member since. Save.
- **Owner** — Link to the user (owner) and their email.
- **KYC / Verification:**
  - If the shop has an associated **verification** (identity check): view status (PENDING, APPROVED, REJECTED), contact name, ID number, invite code, ID card front/back images, main business, detailed address, reviewed at, rejection reason.
  - **Approve KYC** — Set verification status to APPROVED. The shop can then become ACTIVE and the seller gets full access to the seller dashboard.
  - **Reject KYC** — Set status to REJECTED and provide a **rejection reason**. The seller sees this and can reapply after fixing issues.
- **Products** — List of products in this shop; link to edit product in admin.
- **Recent orders** — Orders that include this shop's products.

**Understanding:**

- **Shop status** — PENDING (e.g. just created), ACTIVE (can sell after KYC approved), SUSPENDED, CLOSED. You control this; only ACTIVE shops sell on the store.
- **KYC approval** is required before the seller can use the seller dashboard fully. You approve or reject from this page.
- **Shop balance** — Sellers have a shop wallet balance. They can top up (deposit) or withdraw funds. Top-ups and withdrawals require your approval in Deposit/Withdrawal Approvals.

---

## 8. Homepage (hero slides)

**Path:** `/admin/homepage`

**What you control:**

- **List hero slides** — Slides shown in the hero carousel on the store homepage. Each has title, subtitle, desktop image, mobile image, CTA text/link, sort order, active, optional start/end dates.
- **Add slide** — "Add slide": upload **desktop image** and optionally **mobile image**, set **title**, **subtitle**, **CTA text**, **CTA link**, **sort order**, **active**. Save.
- **Edit slide** — Change any of the above; reorder or toggle active.
- **Reorder slides** — Use reorder control (e.g. drag or reorder API) to change the order on the homepage.
- **Delete slide** — Remove a slide.

**Control:** You decide what appears in the main hero banner: images, copy, and links. This is the main visual control of the store homepage.

---

## 9. Coupons

**Path:** `/admin/coupons`

**Current state:** The Coupons page shows a "Coming soon" message. When implemented, you will create discount codes, set expiry and rules, and track usage. No actionable control yet.

---

## 10. Support tickets

**Path:** `/admin/support`

**What you control:**

- **List tickets** — Filter by status (All, OPEN, IN_PROGRESS, RESOLVED, CLOSED). See ticket number, subject, status, priority, customer, last message, dates.
- **Open a ticket** — Click a ticket → `/admin/support/[id]`.

**Ticket detail** (`/admin/support/[id]`):

- **Conversation** — All messages (customer and admin replies). Messages appear in real-time as they are sent. You see who wrote each message and when.
- **Reply** — Type your message and send. The customer receives a **live notification** immediately when you reply, and the message appears in their support view in real-time.
- **Change status** — Set status to OPEN, IN_PROGRESS, RESOLVED, or CLOSED.
- **Change priority** — e.g. HIGH, MEDIUM, LOW.

**Understanding:**

- **Real-time updates** — Both admin and customers see new messages instantly without refreshing the page.
- **Notifications** — When you reply to a ticket, the customer automatically receives a notification with the ticket number and message preview, linking to their support page.

**Control:** You handle all customer support conversations, set status/priority, and resolve or close tickets. This is the central place for support.

---

## 11. Notifications

**Path:** `/admin/notifications`

**What you control:**

- **List all notifications** — Notifications sent to users. Filter by All, Unread, or type (order, payment, promo, system, support). See recipient (user name/email), title, message, type, read state, date.
- **Send notification** — "Send Notification": choose **Broadcast** (all users) or **Specific users** (enter user IDs), enter **Title**, **Message**, **Type** (order, payment, promo, system, support), optional **Link**. Send. Users receive notifications **instantly** via real-time updates and see them in their account and in the header bell dropdown.
- **Mark as read / Mark all read** — Update read state (for your own view).
- **Delete** — Remove a notification from the list.

**Understanding:**

- **Live notifications** — Notifications use Supabase Realtime to appear instantly for users without page refresh. Users see toast alerts for new notifications.
- Notifications are **one-way**: admin → user. Use them for order updates, promos, system announcements, or support-related messages.
- **Type** is for filtering and display (icon/label). **Link** can deep-link the user to an order or page.
- **Broadcast** sends to all users at once; **Specific users** targets individual users by ID.

---

## 12. CMS Pages

**Path:** `/admin/pages`

**Current state:** The CMS Pages screen shows "Coming soon" for managing static pages (About, Terms, Privacy, etc.). No actionable control yet.

---

## 13. Crypto addresses

**Path:** `/admin/crypto-addresses`

**What you control:**

- **List crypto addresses** — Wallet addresses used by the platform for receiving customer payments (e.g. checkout). Each has currency, address, network, label, QR code, active.
- **Add address** — **Currency** (e.g. USDT, BTC, ETH), **Address**, **Network** (e.g. TRC-20, ERC-20), **Label**, optional **QR code URL**, **Active**. Save.
- **Edit address** — Change any field or toggle active.
- **Delete address** — Remove an address (only if not in use by pending orders).

**Understanding:**

- At **checkout**, customers can pay by crypto; they are shown the appropriate platform address (and optional memo). You must add and maintain these addresses here (and/or in Settings, depending on implementation). **Crypto Addresses** here are the central list used for payments; keep them correct and active.

---

## 14. Deposit approvals

**Path:** `/admin/deposits`

**What you control:**

- **List deposit requests** — User/shop wallet top-up requests. Filter by status: **PENDING**, **APPROVED**, **REJECTED**.
- **For each deposit:** user, currency, network, amount, proof URL (if user uploaded proof), status, created/reviewed date.
- **Approve** — Mark as APPROVED. The user's or shop's balance is credited (backend applies the balance update). Only approve after verifying payment (e.g. check proof or blockchain).
- **Reject** — Mark as REJECTED. The user sees the rejection; no balance is added.

**Control:** Users and sellers top up their wallet from the store; you approve or reject each request. This prevents invalid or fraudulent balance credits.

---

## 15. Withdrawal approvals

**Path:** `/admin/withdrawals`

**What you control:**

- **List withdrawal requests** — Users/sellers requesting to withdraw wallet balance. Filter by **PENDING**, **APPROVED**, **REJECTED**.
- **For each withdrawal:** user, currency, network, destination address, amount, status, created/reviewed date.
- **Approve** — Mark as APPROVED. Your backend/process then sends the funds to the given address. Only approve after verifying the request and having sufficient liquidity.
- **Reject** — Mark as REJECTED. No funds are sent; the user sees the rejection.

**Control:** You decide which withdrawals are paid out. This protects against fraud and ensures you only send money after checks.

---

## 16. Settings

**Path:** `/admin/settings`

**What you control:** All settings are stored in the database and affect the whole platform. **Save** at the bottom applies changes.

**General:**

- **Site name** — Used in browser tab and across the site.
- **Logo URL** — Path or URL to the logo image.
- **Site description** — e.g. tagline or meta description.
- **Currency** — Default currency (e.g. USD).
- **Maintenance mode** — When enabled, visitors see a maintenance page instead of the store. Use for deployments or emergencies.

**Payments:**

- **Crypto payments** — Enable/disable acceptance of crypto (e.g. USDT, BTC, ETH). If enabled, you can set wallet addresses here (and/or in Crypto Addresses).
- **USDT TRC20/ERC20, BTC, ETH addresses** — Used for checkout when crypto is enabled.
- **Cash on delivery** — Enable/disable COD.
- **Bank transfer** — Enable/disable bank transfer.

**Shipping & tax:**

- **Default shipping fee** — Amount in your currency.
- **Free shipping threshold** — Order amount above which shipping is free; 0 to disable.
- **Tax rate (%)** — Percentage applied to orders; 0 to disable.

**Features:**

- **User selling** — When **on**, users can apply to become sellers and create shops (subject to KYC). When **off**, no new shops and seller features are effectively disabled.
- **Shop levels that can upload own products** — Checkboxes for BRONZE, SILVER, GOLD, PLATINUM. Only selected levels can add their own products; others may only add from the main catalog (if your logic uses this). Leave all unchecked to disable own product upload.

**Control:** Settings are the main lever for site-wide behavior: branding, payments, shipping, tax, and who can sell or upload products. Change with care and test after saving.

---

# Part B — Store, Shoppers & Sellers

## 17. Store front (shoppers)

- **Country & language** — First-time visitors may choose country; language can be set via the language selector and is stored. Affects UI language.
- **Homepage** — Hero slides (you control in Admin → Homepage), categories, featured/new products. Search opens a modal; results link to product pages.
- **Categories** — Sidebar and categories page; category product lists with sort and pagination.
- **Product page** — Images, price, quantity, Add to cart, Buy now, Add to collection (favorites; requires login). Description, specs, reviews, related products.
- **Cart** — View/edit quantity, select items, see subtotal. Checkout from cart.
- **Checkout** — Step 1: shipping address (saved or new). Step 2: payment — **Balance** (user wallet), **Crypto** (platform addresses you configure), or **Card** (if enabled). Place order. Order appears in Account → My Orders.
- **Account (logged-in)** — Profile, orders, addresses, favorites, wallet (top-up, withdraw, records), notifications, billing, password, settings, support. Wallet top-ups/withdrawals create requests you approve in Admin → Deposits / Withdrawals.
- **Notifications** — Users see notifications in the header bell icon. Notifications appear **instantly** when sent by admin, with toast alerts. Click to view details or mark as read.

---

## 18. Sellers

- **Apply for shop** — User with "Can sell" enabled goes to Create shop, fills shop + KYC form, uploads ID. Shop is PENDING; verification is PENDING.
- **KYC** — You approve or reject in **Admin → Shops & KYC → [shop]**. Approved + shop ACTIVE → seller gets full seller dashboard.
- **Seller dashboard** — Stats (products, orders, revenue, balance), recent orders, quick links to products and shop details.
- **Shop details** — Edit shop info; shop wallet (balance, top-up, withdraw, records). Seller withdrawal requests appear in **Admin → Withdrawal approvals**.
- **Products** — Sellers add/edit their products (or from catalog if allowed by level). You can override anything in **Admin → Products**.
- **Orders** — Sellers see orders containing their items; they can update status (e.g. mark as SHIPPED). When a seller marks an order as **SHIPPED**, the wholesale cost (if the product came from the wholesale catalog) is automatically deducted from their shop balance. You have full control in **Admin → Orders**.

**Understanding seller product management:**

- Sellers can add products from the **wholesale catalog** (see Wholesale Catalog section below) or create their own products (if their shop level allows).
- When sellers add products from the wholesale catalog, they are **not charged** at that time. The wholesale price is stored as the product's `costPrice`.
- When sellers mark an order as **SHIPPED**, the system calculates the total wholesale cost (costPrice × quantity for all items) and deducts it from the shop balance. If the balance is insufficient, the status update fails with an error message.

---

## 19. Wholesale catalog

**Path:** `/account/wholesale` (for sellers)

**What sellers see:**

- **Browse wholesale products** — Products from the main catalog (admin-uploaded) that have a **wholesale price** set. These appear in the Wholesale Management section.
- **Product details** — Each product shows: name, images, wholesale price (what seller pays), sale price (suggested retail), regular price.
- **List product** — Click "List" to add the product to the seller's shop. The product is copied to their shop with:
  - Price set to the **sale price** (or regular price if no sale price)
  - **Cost price** set to the **wholesale price** (for tracking)
  - Status set to DRAFT (seller can publish later)
  - Images copied from the catalog product

**Understanding:**

- **No charge on listing** — Sellers are **not charged** when they add products from the wholesale catalog. The wholesale price is stored but not deducted.
- **Charge on shipping** — When a seller marks an order as **SHIPPED**, the wholesale cost is deducted from their shop balance:
  - System calculates: sum of (costPrice × quantity) for all items in the order
  - Checks if shop balance is sufficient
  - Deducts the amount if sufficient, or returns an error if insufficient
- **Product tracking** — Products listed from wholesale have a `sourceProductId` linking them to the catalog product. This is cleared when the order is completed/delivered, allowing sellers to re-list the same product if needed.

**Control:** Admin controls which products appear in wholesale by setting the `wholesalePrice` field on main catalog products. Sellers can freely browse and list products, but are only charged when they actually ship orders.

---

## 20. Quick reference — URLs

| Area | URL |
|------|-----|
| **Admin** | |
| Dashboard | `/admin` |
| Users | `/admin/users`, `/admin/users/[id]` |
| Products | `/admin/products`, `/admin/products/new`, `/admin/products/[id]` |
| Categories | `/admin/categories` |
| Orders | `/admin/orders` |
| Shops & KYC | `/admin/shops`, `/admin/shops/[id]` |
| Homepage | `/admin/homepage` |
| Coupons | `/admin/coupons` |
| Support | `/admin/support`, `/admin/support/[id]` |
| Notifications | `/admin/notifications` |
| CMS Pages | `/admin/pages` |
| Crypto Addresses | `/admin/crypto-addresses` |
| Deposit Approvals | `/admin/deposits` |
| Withdrawal Approvals | `/admin/withdrawals` |
| Settings | `/admin/settings` |
| **Store** | |
| Home | `/` |
| Login / Register | `/auth/login`, `/auth/register` |
| Categories / Products | `/categories`, `/categories/[slug]`, `/products`, `/products/[slug]` |
| Cart / Checkout | `/cart`, `/checkout` |
| Account | `/account`, `/account/orders`, `/account/wallet`, `/account/notifications`, `/account/support`, `/account/wholesale` |
| Seller | `/seller/dashboard`, `/seller/shop`, `/seller/products`, `/seller/orders` |
| Shops | `/shops/[slug]` |
| Contact / About | `/contact`, `/about` |
| Merchant agreement | `/merchant-agreement` |

---

## Key Features Summary

### Real-time Features

- **Live Notifications** — Admin-created notifications appear instantly for users via Supabase Realtime. Users see toast alerts and real-time updates in the notification dropdown.
- **Support Chat** — Messages in support tickets appear in real-time for both admin and customers. No page refresh needed.
- **Order Updates** — Order status changes trigger notifications automatically.

### Payment & Balance System

- **Crypto Payments** — Customers can pay with USDT (TRC20/ERC20), Bitcoin, or Ethereum at checkout.
- **Wallet System** — Users and sellers have wallet balances. Top-ups and withdrawals require admin approval.
- **Wholesale Charging** — Sellers are charged wholesale prices only when they mark orders as SHIPPED, not when adding products to their catalog.

### Support System

- **AI Chat Widget** — Customers can chat with an AI assistant that answers FAQs. Unanswered questions create support tickets.
- **Support Tickets** — Full ticket system with real-time messaging, status tracking, and priority management.
- **Auto Notifications** — Customers receive notifications when admins reply to their tickets.

---

*This manual reflects the ZALORA Fashion platform as of the last update. Coupons and CMS Pages are marked "coming soon"; all other admin sections described above are actionable. For deployment and environment (e.g. Netlify, Supabase), refer to your project docs.*
