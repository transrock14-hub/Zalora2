# Troubleshooting Guide - 503 Service Unavailable Error

## Quick Diagnosis Steps

### Step 1: Check if the app is running

SSH into your server and check if the Node.js app is running:

```bash
ssh -p 65002 u611506725@147.93.80.8

# Once connected, check running processes
ps aux | grep node

# Or check if the port is listening (usually 3000 for Next.js)
netstat -tulpn | grep :3000
# or
ss -tulpn | grep :3000
```

### Step 2: Check application logs

```bash
# Navigate to your app directory (usually in ~/domains/your-domain.com/public_html or similar)
cd ~/domains/your-domain.com/public_html
# or wherever your app is deployed

# Check Hostinger Node.js logs
# Logs are usually in:
# - ~/logs/nodejs/
# - Or check Hostinger hPanel → Node.js → Your App → Logs

# Check for errors
tail -f ~/logs/nodejs/error.log
# or
pm2 logs
# or if using systemd
journalctl -u your-app-name -f
```

### Step 3: Verify environment variables

```bash
# Check if environment variables are set in Hostinger panel
# Go to: hPanel → Node.js → Your App → Environment Variables

# Or check via SSH (if accessible)
cd ~/domains/your-domain.com/public_html
cat .env
# Note: Hostinger might store env vars differently, check their documentation
```

### Step 4: Test endpoints

Use these endpoints to diagnose issues:

1. **Health Check** (should always work):
   ```
   https://your-domain.com/api/health
   ```
   Expected: `{"status":"ok",...}`

2. **Diagnostic Endpoint** (checks configuration):
   ```
   https://your-domain.com/api/admin/diagnostic
   ```
   Expected: JSON with configuration status

3. **Seed Endpoint** (with proper key):
   ```
   https://your-domain.com/api/admin/seed?key=YOUR_SEED_SECRET_KEY
   ```
   Expected: Success message or detailed error

## Common Issues and Solutions

### Issue 1: Missing Environment Variables

**Symptoms:**
- 503 Service Unavailable error
- Diagnostic endpoint shows missing variables
- Seed endpoint returns "Database not configured"

**Solution:**
1. Go to Hostinger hPanel → Node.js → Your App
2. Click on "Environment Variables" or "Settings"
3. Add these required variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SEED_SECRET_KEY=your_seed_secret_key
   ADMIN_EMAIL=admin@zalora.com
   ADMIN_PASSWORD=your_secure_password
   JWT_SECRET=your_jwt_secret
   NODE_ENV=production
   ```
4. **Restart the application** after adding variables

### Issue 2: App Not Running

**Symptoms:**
- 503 error on all endpoints
- Health check fails
- No Node.js process running

**Solution:**
1. SSH into server
2. Navigate to app directory
3. Check if app is running:
   ```bash
   pm2 list
   # or
   ps aux | grep node
   ```
4. If not running, start it:
   ```bash
   cd /path/to/your/app
   npm install  # if needed
   npm run build  # if needed
   npm start
   # or if using PM2:
   pm2 start npm --name "zalora" -- start
   # or use Hostinger's start button in hPanel
   ```

### Issue 3: Build Issues

**Symptoms:**
- App fails to start
- Build errors in logs
- Missing dependencies

**Solution:**
```bash
cd /path/to/your/app

# Clean install
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build

# Check for errors
npm run build 2>&1 | tee build.log
```

### Issue 4: Database Connection Issues

**Symptoms:**
- Seed endpoint returns 503
- Diagnostic shows Supabase connection failed
- Error messages mention "Supabase" or "Database"

**Solution:**
1. Verify Supabase credentials in Hostinger environment variables
2. Test Supabase connection:
   - Go to Supabase Dashboard
   - Check if project is active
   - Verify API keys are correct
3. Check if database schema is created:
   - Go to Supabase Dashboard → SQL Editor
   - Run: `SELECT * FROM users LIMIT 1;`
   - If error, run `supabase-schema.sql` again

### Issue 5: Port/Proxy Issues

**Symptoms:**
- 503 error
- App is running but not accessible

**Solution:**
1. Check Hostinger Node.js app settings:
   - Port should match your app (usually 3000)
   - Proxy settings should be configured
2. Check if app is listening on correct port:
   ```bash
   netstat -tulpn | grep node
   ```

## Manual Server Access Checklist

When SSH access works, run these commands:

```bash
# 1. Navigate to app directory
cd ~/domains/your-domain.com/public_html
# or find your app:
find ~ -name "package.json" -type f 2>/dev/null | grep -v node_modules

# 2. Check Node.js version
node --version  # Should be 18+

# 3. Check if dependencies are installed
ls node_modules  # Should exist

# 4. Check environment variables (if .env exists)
cat .env | grep SUPABASE

# 5. Check if app is built
ls .next  # Should exist if built

# 6. Try starting the app manually
npm start
# Check for errors in output

# 7. Test Supabase connection
node -e "
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.log('Missing env vars');
  process.exit(1);
}
const client = createClient(url, key);
client.from('users').select('id').limit(1).then(({error}) => {
  if (error) {
    console.log('Connection error:', error.message);
    process.exit(1);
  } else {
    console.log('Connection OK');
  }
});
"
```

## Using the Diagnostic Endpoint

After deploying, visit:
```
https://your-domain.com/api/admin/diagnostic
```

This will show:
- ✅ Which environment variables are set
- ❌ Which are missing
- ⚠️ Which are using defaults
- Connection test results

## Next Steps After Fixing

1. **Restart the application** in Hostinger hPanel
2. **Test health endpoint**: `https://your-domain.com/api/health`
3. **Run diagnostic**: `https://your-domain.com/api/admin/diagnostic`
4. **Seed database**: `https://your-domain.com/api/admin/seed?key=YOUR_KEY`
5. **Check logs** for any remaining errors

## Getting Help

If issues persist:
1. Check Hostinger Node.js logs in hPanel
2. Check Supabase logs in Supabase Dashboard
3. Run diagnostic endpoint and share results
4. Check browser console for client-side errors
5. Verify all environment variables are set correctly
