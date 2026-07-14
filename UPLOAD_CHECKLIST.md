# Hostinger Upload Checklist

## ✅ What TO Upload

```
Zanova/
├── src/                    ✅ ALL source code
├── public/                 ✅ Public assets (images, etc.)
├── prisma/                 ✅ Keep migrations folder (for reference)
├── scripts/                ✅ Keep scripts (for reference)
├── package.json            ✅ REQUIRED
├── package-lock.json       ✅ REQUIRED
├── next.config.js          ✅ REQUIRED
├── tailwind.config.ts      ✅ REQUIRED
├── tsconfig.json           ✅ REQUIRED
├── postcss.config.js       ✅ REQUIRED
├── supabase-schema.sql     ✅ Database schema
├── DEPLOYMENT_GUIDE.md     ✅ Documentation
└── .hostingerignore        ✅ Ignore file (optional)
```

## ❌ What NOT to Upload

```
Zanova/
├── node_modules/           ❌ Will install on server
├── .next/                  ❌ Will build on server
├── .env                    ❌ Set in Hostinger panel
├── .env.local              ❌ Set in Hostinger panel
├── .git/                   ❌ Not needed
├── .vscode/                ❌ IDE files
├── .idea/                  ❌ IDE files
├── netlify/                ❌ Not needed
├── netlify.toml            ❌ Not needed
├── *.log                   ❌ Log files
├── *.tsbuildinfo           ❌ Build cache
├── .DS_Store               ❌ OS files
└── Thumbs.db               ❌ OS files
```

## Quick Upload Size Check

**Before upload, your project should be approximately:**
- **With exclusions**: ~5-10 MB (source code only)
- **Without exclusions**: ~200-500 MB (includes node_modules)

If your upload is >50 MB, you're probably including `node_modules` or `.next` - **STOP and exclude them!**

## Verification

After upload, SSH into your server and verify:

```bash
# Should see these folders:
ls -la
# ✅ src/
# ✅ public/
# ✅ package.json

# Should NOT see these:
# ❌ node_modules/ (will be created after npm install)
# ❌ .next/ (will be created after npm run build)
# ❌ .env (set in Hostinger panel)
```

## File Count Estimate

**Expected file count after upload:**
- Source files: ~200-300 files
- If you see 10,000+ files, you included `node_modules` ❌
