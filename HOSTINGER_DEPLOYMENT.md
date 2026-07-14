# Hostinger Deployment Checklist

## Files to EXCLUDE when uploading to Hostinger

When uploading via FTP or File Manager, **DO NOT upload** these:

### ❌ Exclude These:

- ✅ `node_modules/` - Will be installed on server
- ✅ `.next/` - Will be built on server  
- ✅ `.env` or `.env.local` - Set in Hostinger panel instead
- ✅ `.git/` - Not needed on server
- ✅ `.vscode/`, `.idea/` - IDE files
- ✅ `*.log` - Log files
- ✅ `.DS_Store`, `Thumbs.db` - OS files
- ✅ `netlify/`, `netlify.toml` - Netlify-specific
- ✅ `coverage/` - Test coverage
- ✅ `*.tsbuildinfo` - TypeScript build cache

### ✅ Include These:

- ✅ `src/` - All source code
- ✅ `public/` - Public assets (images, etc.)
- ✅ `package.json` - Required for npm install
- ✅ `package-lock.json` - Ensures consistent dependencies
- ✅ `next.config.js` - Next.js configuration
- ✅ `tailwind.config.ts` - Tailwind configuration
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `postcss.config.js` - PostCSS configuration
- ✅ `supabase-schema.sql` - Database schema (for reference)
- ✅ `prisma/migrations/` - Keep for reference (not used but good to have)
- ✅ `scripts/` - Keep for reference
- ✅ `DEPLOYMENT_GUIDE.md` - Documentation

## Quick Upload Methods

### Method 1: Git Deployment (Recommended)
If Hostinger supports Git:
1. Connect your Git repository
2. Hostinger will pull and build automatically
3. No need to manually exclude files

### Method 2: FTP Upload (Manual)
1. Use FTP client (FileZilla, WinSCP, etc.)
2. Configure to exclude files matching `.hostingerignore` patterns
3. Upload all files EXCEPT those listed above

### Method 3: File Manager (Manual)
1. Zip your project locally (excluding ignored files)
2. Upload ZIP via Hostinger File Manager
3. Extract on server

## Pre-Upload Checklist

Before uploading, verify:

- [ ] `.env` file is NOT in the upload
- [ ] `node_modules/` is NOT in the upload
- [ ] `.next/` folder is NOT in the upload
- [ ] All source code (`src/`) is included
- [ ] `package.json` is included
- [ ] Configuration files are included

## Post-Upload Steps

After uploading:

1. **SSH/Terminal Access:**
   ```bash
   cd /path/to/your/app
   npm install
   npm run build
   ```

2. **Set Environment Variables** in Hostinger panel

3. **Start the App** in Hostinger Node.js settings

4. **Seed Database** via seed endpoint

## File Size Optimization

If upload is slow, you can create a minimal ZIP:

```bash
# On Windows (PowerShell)
# Create a zip excluding node_modules and .next
Compress-Archive -Path * -DestinationPath deploy.zip -Exclude node_modules,\.next,\.env*
```

Or use the `.hostingerignore` file with your FTP client.
