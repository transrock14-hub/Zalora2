# Build Fix Instructions

## Issues Fixed

1. ✅ **Moved autoprefixer, postcss, and tailwindcss to dependencies**
   - Hostinger may skip devDependencies during production builds
   - These packages are required for the build process

2. ✅ **Upgraded Next.js from 14.1.0 to 14.2.0**
   - Fixes security vulnerability
   - Uses patched version

3. ✅ **Updated eslint-config-next to match Next.js version**

## What to Do on Hostinger

### Option 1: Rebuild via Hostinger Panel (Recommended)

1. Go to Hostinger hPanel → Node.js → Your App
2. Click "Rebuild" or "Deploy" button
3. This should run `npm install` and `npm run build` with the updated package.json

### Option 2: Manual SSH Commands

If you can SSH into the server:

```bash
# Navigate to your app directory
cd ~/domains/zalora.sbs/public_html/.builds/source
# or wherever your app is located

# Remove node_modules and package-lock.json to ensure clean install
rm -rf node_modules package-lock.json

# Install all dependencies (including production dependencies)
npm install

# Build the application
npm run build

# If build succeeds, restart the app
# Via Hostinger panel or:
pm2 restart zalora
# or
npm start
```

### Option 3: Force Install All Dependencies

If Hostinger is skipping dependencies:

```bash
cd ~/domains/zalora.sbs/public_html/.builds/source

# Install ALL dependencies (not just production)
npm install --include=dev

# Or explicitly install the build dependencies
npm install autoprefixer postcss tailwindcss --save

# Then build
npm run build
```

## Verification

After rebuilding, check:

1. **Build succeeds** - No errors about missing modules
2. **Health endpoint works**: `https://zalora.sbs/api/health`
3. **Diagnostic endpoint works**: `https://zalora.sbs/api/admin/diagnostic`
4. **Seed endpoint works**: `https://zalora.sbs/api/admin/seed?key=YOUR_KEY`

## If Build Still Fails

1. Check Hostinger build logs for specific errors
2. Verify Node.js version is 18+ (check in Hostinger panel)
3. Ensure all files are uploaded (check File Manager)
4. Try clearing build cache:
   ```bash
   rm -rf .next
   npm run build
   ```

## Files Changed

- `package.json` - Moved build dependencies to dependencies, upgraded Next.js
