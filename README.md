# ZALORA - Crypto-First E-commerce Platform

A production-ready, admin-controlled ecommerce platform built with Next.js 14, PostgreSQL, and Prisma.

![ZALORA Logo](/public/images/logo.png)

## Features

### 🛒 Store Features
- **Product Catalog**: Browse products by categories with search and filters
- **Shopping Cart**: Persistent cart with quantity controls
- **Checkout**: Streamlined checkout with crypto payment support
- **Order Tracking**: Track orders from purchase to delivery

### 💳 Payment Methods
- **Crypto Payments (Primary)**:
  - USDT (TRC20 & ERC20)
  - Bitcoin (BTC)
  - Ethereum (ETH)
- **Fiat Options**:
  - Cash on Delivery
  - Bank Transfer

### 👤 User Features
- User registration and authentication
- Profile management
- Order history
- Favorites/Wishlist
- Support tickets

### 🏪 Multi-Vendor System
- Users can become sellers (admin-controlled)
- Shop management dashboard
- Product management
- Order management for sellers

### 🔐 Admin Panel
- **Dashboard**: Overview of store statistics
- **User Management**: 
  - View/Edit/Delete users
  - Role management (Admin/Manager/User)
  - Login as user feature
  - Toggle selling ability
- **Product Management**: Full CRUD operations
- **Category Management**: Hierarchical categories
- **Order Management**: View and update order status
- **Homepage CMS**: Control hero slides, sections, banners
- **Support Tickets**: Manage customer support
- **Settings**: Configure payments, shipping, taxes

### 💬 Customer Support
- AI-powered chat widget
- FAQ-based auto-responses
- Human escalation system
- Support ticket management

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based with bcrypt
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **UI Components**: Radix UI primitives
- **Icons**: Iconify (Solar icon set)

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

### Installation

1. **Clone and install dependencies**:
```bash
cd Zalora
npm install
```

2. **Configure environment variables**:
```bash
# Create .env file
cp .env.example .env

# Edit .env with your database credentials
DATABASE_URL="postgresql://username:password@localhost:5432/zalora?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
ADMIN_EMAIL="admin@zalora.com"
ADMIN_PASSWORD="admin123"
```

3. **Set up the database**:
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed initial data
npm run db:seed
```

4. **Start the development server**:
```bash
npm run dev
```

5. **Open in browser**:
- Store: http://localhost:3000
- Admin: http://localhost:3000/admin

### Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@zalora.com | admin123 |
| User | user@zalora.com | user123 |
| Seller | seller@zalora.com | seller123 |

## Project Structure

```
Zalora/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data
├── public/
│   └── images/            # Static images
├── src/
│   ├── app/
│   │   ├── (store)/       # Customer-facing pages
│   │   ├── admin/         # Admin panel
│   │   ├── api/           # API routes
│   │   └── auth/          # Authentication pages
│   ├── components/
│   │   ├── admin/         # Admin components
│   │   ├── layout/        # Layout components
│   │   └── ui/            # Reusable UI components
│   └── lib/
│       ├── auth.ts        # Authentication utilities
│       ├── db.ts          # Prisma client
│       ├── store.ts       # Zustand stores
│       └── utils.ts       # Utility functions
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| JWT_SECRET | Secret for JWT signing | Yes |
| ADMIN_EMAIL | Default admin email | Yes |
| ADMIN_PASSWORD | Default admin password | Yes |
| NEXT_PUBLIC_APP_URL | Application URL | No |
| NEXT_PUBLIC_APP_NAME | Application name | No |

## Database Schema

The database includes the following main models:
- **User**: User accounts with roles and permissions
- **Shop**: Multi-vendor shops
- **Product**: Products with variants, images, tags
- **Category**: Hierarchical product categories
- **Order**: Customer orders with items
- **CartItem**: Shopping cart
- **SupportTicket**: Customer support tickets
- **HeroSlide**: Homepage hero banners
- **Setting**: Application settings

## API Routes

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Admin
- `GET/PATCH/DELETE /api/admin/users/[id]` - User management
- `POST /api/admin/users/login-as` - Login as user

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

### Docker

```bash
docker build -t zalora .
docker run -p 3000:3000 zalora
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, create an issue or contact admin@zalora.com
