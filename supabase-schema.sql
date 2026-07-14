-- Zanova E-commerce Platform Database Schema
-- For Supabase PostgreSQL Database
-- Run this in Supabase SQL Editor

-- ============================================
-- ENUMS
-- ============================================

-- CreateEnum: UserRole
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'USER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: UserStatus
DO $$ BEGIN
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: ShopStatus
DO $$ BEGIN
    CREATE TYPE "ShopStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: ShopLevel (Bronze, Silver, Gold, Platinum - same as admin Shop Details edit)
DO $$ BEGIN
    CREATE TYPE "ShopLevel" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: ProductStatus
DO $$ BEGIN
    CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'OUT_OF_STOCK', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: OrderStatus
DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_CONFIRMING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: PaymentMethod
DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('USDT_TRC20', 'USDT_ERC20', 'BTC', 'ETH', 'BANK_TRANSFER', 'CASH_ON_DELIVERY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: PaymentStatus
DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'EXPIRED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: TicketStatus
DO $$ BEGIN
    CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: TicketPriority
DO $$ BEGIN
    CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- TABLES (using lowercase names for Supabase)
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    phone TEXT,
    role "UserRole" NOT NULL DEFAULT 'USER',
    status "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    "canSell" BOOLEAN NOT NULL DEFAULT false,
    "emailVerified" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Addresses table
CREATE TABLE IF NOT EXISTS addresses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    country TEXT NOT NULL,
    state TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Shops table
CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    logo TEXT,
    banner TEXT,
    status "ShopStatus" NOT NULL DEFAULT 'PENDING',
    level "ShopLevel" NOT NULL DEFAULT 'BRONZE',
    rating DECIMAL(2,1) NOT NULL DEFAULT 0,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 10,
    followers INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shops_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

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

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image TEXT,
    icon TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showOnHome" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES categories(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "shopId" TEXT,
    "categoryId" TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    "shortDesc" TEXT,
    price DECIMAL(12,2) NOT NULL,
    "comparePrice" DECIMAL(12,2),
    "costPrice" DECIMAL(12,2),
    sku TEXT,
    barcode TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    "lowStockAlert" INTEGER NOT NULL DEFAULT 5,
    weight DECIMAL(8,2),
    status "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPromoted" BOOLEAN NOT NULL DEFAULT false,
    rating DECIMAL(2,1) NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    views INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wholesalePrice" DECIMAL(12,2),
    "salePrice" DECIMAL(12,2),
    "sourceProductId" TEXT,
    CONSTRAINT "products_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES shops(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Product Images table
CREATE TABLE IF NOT EXISTS product_images (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "productId" TEXT NOT NULL,
    url TEXT NOT NULL,
    alt TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Product Variants table
CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "productId" TEXT NOT NULL,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    price DECIMAL(12,2),
    stock INTEGER NOT NULL DEFAULT 0,
    sku TEXT,
    CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE
);

-- Product Tags junction table
CREATE TABLE IF NOT EXISTS product_tags (
    "productId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    PRIMARY KEY ("productId", "tagId"),
    CONSTRAINT "product_tags_productId_fkey" FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES tags(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Cart Items table
CREATE TABLE IF NOT EXISTS cart_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("userId", "productId", "variantId"),
    CONSTRAINT "cart_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "cart_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderNumber" TEXT NOT NULL UNIQUE,
    "userId" TEXT NOT NULL,
    "shopId" TEXT,
    "addressId" TEXT,
    subtotal DECIMAL(12,2) NOT NULL,
    shipping DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL,
    "cryptoAmount" DECIMAL(18,8),
    "cryptoCurrency" TEXT,
    status "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentMethod" "PaymentMethod",
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentAddress" TEXT,
    "paymentMemo" TEXT,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "trackingNumber" TEXT,
    notes TEXT,
    "adminNotes" TEXT,
    "couponId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "orders_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES shops(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "orders_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES addresses(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    quantity INTEGER NOT NULL,
    variant TEXT,
    image TEXT,
    CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DECIMAL(12,2) NOT NULL,
    "minPurchase" DECIMAL(12,2),
    "maxDiscount" DECIMAL(12,2),
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    rating INTEGER NOT NULL,
    title TEXT,
    comment TEXT,
    images TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("userId", "productId"),
    CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("userId", "productId"),
    CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "favorites_productId_fkey" FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Support Tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "ticketNumber" TEXT NOT NULL UNIQUE,
    "userId" TEXT,
    subject TEXT NOT NULL,
    category TEXT,
    status "TicketStatus" NOT NULL DEFAULT 'OPEN',
    priority "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Ticket Messages table
CREATE TABLE IF NOT EXISTS ticket_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderEmail" TEXT,
    message TEXT NOT NULL,
    "isFromAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isAI" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES support_tickets(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Hero Slides table
CREATE TABLE IF NOT EXISTS hero_slides (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    subtitle TEXT,
    image TEXT NOT NULL,
    "mobileImage" TEXT,
    "ctaText" TEXT,
    "ctaLink" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Home Sections table
CREATE TABLE IF NOT EXISTS home_sections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    config TEXT
);

-- Banners table
CREATE TABLE IF NOT EXISTS banners (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    link TEXT,
    position TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Pages table
CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDesc" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- FAQs table
CREATE TABLE IF NOT EXISTS faqs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'string'
);

-- Crypto Addresses table
CREATE TABLE IF NOT EXISTS crypto_addresses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    currency TEXT NOT NULL,
    address TEXT NOT NULL,
    network TEXT,
    label TEXT,
    "qrCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    link TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS "users_email_idx" ON users(email);
CREATE INDEX IF NOT EXISTS "users_role_idx" ON users(role);
CREATE INDEX IF NOT EXISTS "users_status_idx" ON users(status);

CREATE INDEX IF NOT EXISTS "sessions_userId_idx" ON sessions("userId");
CREATE INDEX IF NOT EXISTS "sessions_token_idx" ON sessions(token);

CREATE INDEX IF NOT EXISTS "addresses_userId_idx" ON addresses("userId");

CREATE INDEX IF NOT EXISTS "shops_slug_idx" ON shops(slug);
CREATE INDEX IF NOT EXISTS "shops_status_idx" ON shops(status);
CREATE INDEX IF NOT EXISTS "shops_level_idx" ON shops(level);

CREATE INDEX IF NOT EXISTS "shop_verifications_shopId_idx" ON shop_verifications("shopId");
CREATE INDEX IF NOT EXISTS "shop_verifications_userId_idx" ON shop_verifications("userId");
CREATE INDEX IF NOT EXISTS "shop_verifications_status_idx" ON shop_verifications(status);

CREATE INDEX IF NOT EXISTS "categories_slug_idx" ON categories(slug);
CREATE INDEX IF NOT EXISTS "categories_parentId_idx" ON categories("parentId");

CREATE INDEX IF NOT EXISTS "products_slug_idx" ON products(slug);
CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON products("categoryId");
CREATE INDEX IF NOT EXISTS "products_shopId_idx" ON products("shopId");
CREATE INDEX IF NOT EXISTS "products_status_idx" ON products(status);
CREATE INDEX IF NOT EXISTS "products_isFeatured_idx" ON products("isFeatured");

CREATE INDEX IF NOT EXISTS "product_images_productId_idx" ON product_images("productId");

CREATE INDEX IF NOT EXISTS "product_variants_productId_idx" ON product_variants("productId");

CREATE INDEX IF NOT EXISTS "tags_slug_idx" ON tags(slug);

CREATE INDEX IF NOT EXISTS "cart_items_userId_idx" ON cart_items("userId");

CREATE INDEX IF NOT EXISTS "orders_orderNumber_idx" ON orders("orderNumber");
CREATE INDEX IF NOT EXISTS "orders_userId_idx" ON orders("userId");
CREATE INDEX IF NOT EXISTS "orders_shopId_idx" ON orders("shopId");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON orders(status);
CREATE INDEX IF NOT EXISTS "orders_paymentStatus_idx" ON orders("paymentStatus");

CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON order_items("orderId");

CREATE INDEX IF NOT EXISTS "coupons_code_idx" ON coupons(code);

CREATE INDEX IF NOT EXISTS "reviews_productId_idx" ON reviews("productId");

CREATE INDEX IF NOT EXISTS "support_tickets_userId_idx" ON support_tickets("userId");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON support_tickets(status);
CREATE INDEX IF NOT EXISTS "support_tickets_ticketNumber_idx" ON support_tickets("ticketNumber");

CREATE INDEX IF NOT EXISTS "ticket_messages_ticketId_idx" ON ticket_messages("ticketId");

CREATE INDEX IF NOT EXISTS "hero_slides_isActive_idx" ON hero_slides("isActive");

CREATE INDEX IF NOT EXISTS "home_sections_isActive_idx" ON home_sections("isActive");

CREATE INDEX IF NOT EXISTS "banners_position_idx" ON banners(position);
CREATE INDEX IF NOT EXISTS "banners_isActive_idx" ON banners("isActive");

CREATE INDEX IF NOT EXISTS "pages_slug_idx" ON pages(slug);

CREATE INDEX IF NOT EXISTS "faqs_category_idx" ON faqs(category);

CREATE INDEX IF NOT EXISTS "settings_key_idx" ON settings(key);

CREATE INDEX IF NOT EXISTS "crypto_addresses_currency_idx" ON crypto_addresses(currency);

CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON notifications("userId");
CREATE INDEX IF NOT EXISTS "notifications_isRead_idx" ON notifications("isRead");

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_verifications_updated_at BEFORE UPDATE ON shop_verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hero_slides_updated_at BEFORE UPDATE ON hero_slides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crypto_addresses_updated_at BEFORE UPDATE ON crypto_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables (optional, but recommended for production)
-- You can enable RLS later and add policies as needed

-- Example: Enable RLS on users table
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Example policy: Users can only see their own data
-- CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid()::text = id);

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Set up environment variables';
    RAISE NOTICE '2. Run the seed endpoint to create admin user';
    RAISE NOTICE '3. Start using your application!';
END $$;
