# Zanova Deployment Guide

Complete guide for deploying Zanova e-commerce platform with Supabase.

## Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- Git repository access
- Hosting provider account (Netlify, Hostinger, Vercel, etc.)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
JWT_SECRET=your_random_jwt_secret_key_min_32_chars

# Admin Configuration
ADMIN_EMAIL=admin@zanova.com
ADMIN_PASSWORD=your_secure_admin_password

# Seed Configuration (for initial database setup)
SEED_SECRET_KEY=your_random_seed_secret_key
```

### Generating a Seed Key

The `SEED_SECRET_KEY` is a security measure to prevent unauthorized database seeding. Generate a secure random key using one of these methods:

**Option 1: Using Node.js (Recommended)**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Using OpenSSL**
```bash
openssl rand -hex 32
```

**Option 3: Using PowerShell (Windows)**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

**Option 4: Online Generator**
- Visit: https://randomkeygen.com/
- Use a "CodeIgniter Encryption Keys" (256-bit) or generate a 64-character random string

**Example Output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

**Important:** 
- Use a long, random string (at least 32 characters, 64+ recommended)
- Keep it secret - don't commit it to Git
- Use the same key in your `.env.local` and when calling the seed endpoint

### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create a new project or select existing project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## Database Setup

### 1. Create Database Schema

**Step 1:** Open Supabase Dashboard
- Go to your project → **SQL Editor**

**Step 2:** Run the Schema SQL
- Open the `supabase-schema.sql` file from this repository
- Copy the entire contents
- Paste into the SQL Editor
- Click **Run** (or press Ctrl+Enter)

**What this creates:**
- All required tables (users, products, orders, categories, etc.)
- All enums (UserRole, OrderStatus, etc.)
- All indexes for performance
- Foreign key relationships
- Triggers for automatic `updatedAt` timestamps

**Important Notes:**
- The schema uses lowercase table names (users, products, etc.) to match Supabase conventions
- Column names use camelCase (userId, createdAt, etc.) as expected by the application
- All tables are created with proper relationships and constraints
- The schema is idempotent - safe to run multiple times (uses `CREATE TABLE IF NOT EXISTS`)

### 2. Seed Initial Data

After running the schema and deploying your app, seed the database with initial data:

**Step 1:** Make sure environment variables are set
- `SEED_SECRET_KEY` - The key you generated earlier
- `ADMIN_EMAIL` - Your admin email (default: `admin@zanova.com`)
- `ADMIN_PASSWORD` - Your admin password (choose a strong password!)

**Step 2:** Call the seed endpoint

**Option A: Using Browser (Easiest)**
1. After deployment, visit: `https://your-domain.com/api/admin/seed?key=YOUR_SEED_SECRET_KEY`
2. You'll see a JSON response confirming the seed

**Option B: Using curl**
```bash
curl "https://your-domain.com/api/admin/seed?key=YOUR_SEED_SECRET_KEY"
```

**Option C: Using fetch (Browser Console)**
```javascript
fetch('/api/admin/seed?key=YOUR_SEED_SECRET_KEY')
  .then(r => r.json())
  .then(console.log)
```

**What Gets Created:**

✅ **Admin User**
- Email: Your `ADMIN_EMAIL` (or `admin@zanova.com` by default)
- Password: Your `ADMIN_PASSWORD` (or `admin123` by default)
- Role: ADMIN
- Can sell: Yes

✅ **Demo Users** (for testing)
- `user@zalora.com` / `user123` - Regular user
- `seller@zalora.com` / `seller123` - User with selling permissions

✅ **12 Default Categories**
- Lifestyle, Men Shoes, Women Shoes, Accessories, Men Clothing, Women Bags, Men Bags, Women Clothing, Girls, Boys, Electronics, Home & Garden

✅ **Default Settings**
- Site name, currency, payment methods, shipping settings, etc.

✅ **Hero Slides**
- 2 default homepage banner slides

**Expected Success Response:**
```json
{
  "success": true,
  "message": "Database seeded successfully!",
  "adminEmail": "admin@zanova.com",
  "adminPassword": "your-admin-password",
  "usersCreated": 3,
  "categoriesCreated": 12,
  "settingsCreated": 16,
  "heroSlidesCreated": 2
}
```

**If Already Seeded:**
```json
{
  "success": true,
  "message": "Database already seeded. Admin user exists.",
  "adminEmail": "admin@zanova.com"
}
```

**Important Notes:**
- ✅ Safe to run multiple times - won't duplicate data
- ✅ Only creates data if it doesn't exist
- ✅ Use the same `SEED_SECRET_KEY` in your env and the URL
- ✅ Run this **after** deploying your app (the endpoint needs to be accessible)
- ✅ You only need to seed once per database setup

## Deployment Options

### Option 1: Netlify

1. **Connect Repository**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository

2. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: `18` or `20`

3. **Environment Variables**
   - Go to Site settings → Environment variables
   - Add all environment variables from `.env.local`

4. **Deploy**
   - Netlify will automatically deploy on push to main branch
   - Or click "Deploy site" manually

### Option 2: Hostinger (Node.js Web App) - Complete Step-by-Step Guide

**⚠️ IMPORTANT: Follow these steps IN ORDER. Do NOT skip steps!**

#### STEP 1: Setup Supabase Database (Do This FIRST)

1. **Create Supabase Project**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Click "New Project"
   - Fill in project details and wait for it to be ready

2. **Get Supabase Credentials**
   - Go to **Settings** → **API**
   - Copy these 3 values (you'll need them in Step 3):
     - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public key)
     - `SUPABASE_SERVICE_ROLE_KEY` (service_role key - keep secret!)

3. **Create Database Schema**
   - In Supabase Dashboard → **SQL Editor**
   - Open `supabase-schema.sql` from this repository
   - Copy ALL contents and paste into SQL Editor
   - Click **Run** (or Ctrl+Enter)
   - ✅ You should see "Database schema created successfully!"

**✅ Database is now ready. DO NOT seed yet - wait until after deployment!**

---

#### STEP 2: Prepare Your Code

1. **Generate Keys** (on your local computer)
   ```bash
   # Generate JWT_SECRET (64 characters)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Generate SEED_SECRET_KEY (64 characters)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   - Save both keys somewhere safe (you'll need them)

2. **Commit & Push to Git**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push
   ```

---

#### STEP 3: Deploy to Hostinger

1. **Access Hostinger Control Panel**
   - Log in to Hostinger
   - Go to **hPanel** → **Node.js** section

2. **Create Node.js App**
   - Click **Create Node.js App** or **Add Application**
   - Fill in:
     - **App Name**: `zanova` (or your choice)
     - **Node.js Version**: `18` or `20` (recommended: `20`)
     - **App Mode**: `Production`
     - **Startup File**: Leave default or set to `server.js` if you have one

3. **Upload Your Code**
   
   **Option A: Git Deployment (Recommended)**
   - In Node.js app settings, find **Git** or **Deployment** section
   - Connect your Git repository
   - Set branch to `main` or `master`
   - Click **Deploy** or **Pull from Git**
   - ✅ Git automatically excludes files in `.gitignore`

   **Option B: Manual Upload (FTP/File Manager)**
   
   **⚠️ IMPORTANT: Do NOT upload these folders/files:**
   - ❌ `node_modules/` - Will be installed on server
   - ❌ `.next/` - Will be built on server
   - ❌ `.env` or `.env.local` - Set in Hostinger panel instead
   - ❌ `.git/` - Not needed
   - ❌ `.vscode/`, `.idea/` - IDE files
   - ❌ `netlify/`, `netlify.toml` - Not needed
   - ❌ `*.log` files - Log files
   
   **✅ DO upload these:**
   - ✅ `src/` - All source code
   - ✅ `public/` - Public assets
   - ✅ `package.json` and `package-lock.json`
   - ✅ `next.config.js`, `tailwind.config.ts`, `tsconfig.json`
   - ✅ All configuration files
   
   **Upload Methods:**
   - **FTP**: Use FileZilla or similar, configure to skip `node_modules` and `.next`
   - **File Manager**: Create ZIP excluding ignored files, then upload and extract
   - **See `HOSTINGER_DEPLOYMENT.md` for detailed exclusion list**

4. **Set Environment Variables**
   
   In Hostinger Node.js app settings, find **Environment Variables** section and add ALL of these:
   
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   JWT_SECRET=your_generated_jwt_secret_64_chars
   ADMIN_EMAIL=admin@zanova.com
   ADMIN_PASSWORD=your_secure_password_here
   SEED_SECRET_KEY=your_generated_seed_secret_64_chars
   NODE_ENV=production
   ```
   
   **Important:**
   - Replace all `your_*` values with actual values
   - Use the keys you generated in Step 2
   - Use the Supabase credentials from Step 1
   - Set `NEXT_PUBLIC_APP_URL` to your actual domain

5. **Install Dependencies & Build**
   
   In Hostinger Node.js app, find **Terminal** or **SSH** section, then run:
   ```bash
   npm install
   npm run build
   ```
   
   Or if Hostinger has auto-build enabled, it will do this automatically.

6. **Start the Application**
   - In Node.js app settings, click **Start** or **Restart**
   - Wait for the app to start (check status)
   - Your app should now be running!

**✅ Deployment complete! Your app should be accessible at your domain.**

---

#### STEP 4: Seed the Database (Do This AFTER Deployment)

**⚠️ CRITICAL: Only seed AFTER your app is deployed and running!**

1. **Verify App is Running**
   - Visit your domain: `https://your-domain.com`
   - The homepage should load (even if empty, that's OK)

2. **Call the Seed Endpoint**
   
   Open your browser and visit:
   ```
   https://your-domain.com/api/admin/seed?key=YOUR_SEED_SECRET_KEY
   ```
   
   Replace `YOUR_SEED_SECRET_KEY` with the actual `SEED_SECRET_KEY` you set in environment variables.

3. **Check the Response**
   
   You should see JSON like this:
   ```json
   {
     "success": true,
     "message": "Database seeded successfully!",
     "adminEmail": "admin@zanova.com",
     "usersCreated": 3,
     "categoriesCreated": 12,
     "settingsCreated": 16,
     "heroSlidesCreated": 2
   }
   ```

4. **Test Admin Login**
   - Go to: `https://your-domain.com/auth/login`
   - Login with:
     - Email: Your `ADMIN_EMAIL` (from env vars)
     - Password: Your `ADMIN_PASSWORD` (from env vars)
   - ✅ You should be logged in and redirected to admin dashboard

**✅ Seeding complete! Your app is now fully set up.**

---

#### Quick Checklist Summary

- [ ] ✅ Step 1: Supabase project created & schema run
- [ ] ✅ Step 2: Keys generated & code pushed to Git
- [ ] ✅ Step 3: App deployed to Hostinger with env vars set
- [ ] ✅ Step 4: Database seeded via seed endpoint
- [ ] ✅ Step 5: Admin login tested successfully

**That's it! Your app is live and ready to use.**

### Option 3: Vercel (Recommended for Next.js)

1. **Import Project**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click "Add New Project"
   - Import your Git repository

2. **Configure**
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (default)

3. **Environment Variables**
   - Add all environment variables in project settings

4. **Deploy**
   - Click "Deploy"
   - Vercel handles everything automatically

## Post-Deployment Checklist

- [ ] Environment variables are set correctly
- [ ] Database is seeded with admin user
- [ ] Test admin login at `/auth/login`
- [ ] Test homepage loads correctly
- [ ] Test product browsing
- [ ] Test user registration
- [ ] Test order placement (if payment is configured)
- [ ] Check admin dashboard at `/admin`
- [ ] Verify API routes are working

## Troubleshooting

### Database Connection Issues

- Verify Supabase credentials are correct
- Check if Supabase project is active
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is used (not anon key) for server-side operations

### Build Errors

- Ensure Node.js version is 18+
- Run `npm install` before building
- Check for missing dependencies

### Authentication Issues

- Verify `JWT_SECRET` is set and is at least 32 characters
- Check if admin user exists in database
- Try seeding database again

### API Route Errors

- Check server logs for detailed error messages
- Verify environment variables are accessible at runtime
- Ensure Supabase service role key has proper permissions

## Security Notes

- **Never commit** `.env.local` or `.env` files to Git
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret (it bypasses Row Level Security)
- Use strong passwords for admin accounts
- Regularly update dependencies for security patches
- Enable Supabase Row Level Security (RLS) policies for production

## Support

For issues or questions:
1. Check Supabase logs in Dashboard → Logs
2. Check application logs in your hosting provider
3. Review Next.js documentation for framework-specific issues

## Architecture

- **Frontend**: Next.js 14+ (React)
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) - Direct connection via Supabase JS client
- **Authentication**: JWT tokens stored in HTTP-only cookies
- **File Storage**: Local filesystem (consider cloud storage for production)

## Important Notes

### No DATABASE_URL Required

This project uses Supabase JS client directly - **you do NOT need `DATABASE_URL`** environment variable. Only Supabase credentials are required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Migration Complete

This project has been fully migrated from Prisma ORM to Supabase JS client:
- ✅ All database queries use `@supabase/supabase-js`
- ✅ No Prisma schema or migrations needed
- ✅ Direct SQL queries through Supabase client
- ✅ Better compatibility with serverless environments
- ✅ No build-time database connections required
- ✅ All API routes and server components migrated
