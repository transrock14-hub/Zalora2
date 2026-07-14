# Fixes Applied for 503 Service Unavailable Error

## Issues Fixed

### 1. ✅ Supabase Client Initialization Error
**Problem:** The Supabase client was being initialized at module load time, causing the entire module to fail if environment variables were missing, resulting in 503 errors.

**Fix:** Changed to lazy initialization using Proxy pattern. The clients now only initialize when actually used, not at module load time. This prevents 503 errors when env vars are missing and provides better error messages.

**Files Changed:**
- `src/lib/supabase.ts` - Implemented lazy initialization

### 2. ✅ Improved Seed Route Error Handling
**Problem:** The seed route wasn't providing clear error messages when configuration was missing, making it hard to diagnose issues.

**Fix:** Added comprehensive error checking and detailed error messages that specify exactly which environment variables are missing.

**Files Changed:**
- `src/app/api/admin/seed/route.ts` - Added detailed error messages and configuration checks

### 3. ✅ Added Diagnostic Endpoint
**Problem:** No easy way to check server configuration and identify missing environment variables.

**Fix:** Created `/api/admin/diagnostic` endpoint that checks all configuration and provides detailed status.

**Files Added:**
- `src/app/api/admin/diagnostic/route.ts` - Diagnostic endpoint

### 4. ✅ Added Health Check Endpoint
**Problem:** No simple way to verify if the API is running.

**Fix:** Created `/api/health` endpoint for basic health checks.

**Files Added:**
- `src/app/api/health/route.ts` - Health check endpoint

### 5. ✅ Improved Error Logging
**Problem:** Insufficient logging made debugging difficult.

**Fix:** Added detailed logging in seed route to show configuration status.

**Files Changed:**
- `src/app/api/admin/seed/route.ts` - Added configuration logging

## Next Steps

### Step 1: Deploy the Fixes
1. Commit and push these changes to your repository
2. Deploy to Hostinger (or let Hostinger pull from Git if configured)

### Step 2: Verify Environment Variables
Go to Hostinger hPanel → Node.js → Your App → Environment Variables

Ensure these are set:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `SEED_SECRET_KEY`
- ✅ `ADMIN_EMAIL`
- ✅ `ADMIN_PASSWORD`
- ✅ `JWT_SECRET`
- ✅ `NODE_ENV=production`

### Step 3: Restart the Application
After setting environment variables, restart your Node.js app in Hostinger hPanel.

### Step 4: Test the Endpoints

1. **Health Check:**
   ```
   https://your-domain.com/api/health
   ```
   Should return: `{"status":"ok",...}`

2. **Diagnostic:**
   ```
   https://your-domain.com/api/admin/diagnostic
   ```
   Should show all configuration status

3. **Seed (with your key):**
   ```
   https://your-domain.com/api/admin/seed?key=YOUR_SEED_SECRET_KEY
   ```
   Should return success or detailed error message

### Step 5: Access Server (If Needed)

If you need to SSH into the server:

```bash
ssh -p 65002 u611506725@147.93.80.8
```

If SSH times out:
1. Check if SSH is enabled in Hostinger
2. Verify your SSH key is added
3. Check firewall settings
4. Try accessing via Hostinger File Manager instead

Once connected, you can:
- Run the diagnostic script: `bash check-server.sh`
- Check logs: `tail -f ~/logs/nodejs/error.log`
- Manually test: `npm start`

## Expected Behavior After Fixes

### Before:
- ❌ 503 Service Unavailable (generic error)
- ❌ No way to diagnose the issue
- ❌ Module fails to load if env vars missing

### After:
- ✅ Clear error messages specifying what's missing
- ✅ Diagnostic endpoint shows configuration status
- ✅ Health check endpoint verifies API is running
- ✅ Seed endpoint provides detailed error information
- ✅ App doesn't crash if env vars are missing (better error handling)

## Troubleshooting

If you still get 503 errors:

1. **Check the diagnostic endpoint first:**
   ```
   https://your-domain.com/api/admin/diagnostic
   ```
   This will tell you exactly what's wrong.

2. **Check Hostinger logs:**
   - Go to hPanel → Node.js → Your App → Logs
   - Look for error messages

3. **Verify the app is running:**
   - Check if the Node.js process is running in Hostinger hPanel
   - Restart the app if needed

4. **Test Supabase connection:**
   - Verify credentials in Supabase Dashboard
   - Ensure database schema is created

5. **Check build:**
   - Ensure `npm run build` completed successfully
   - Check for build errors in logs

## Files Modified

- `src/lib/supabase.ts` - Lazy initialization
- `src/app/api/admin/seed/route.ts` - Better error handling
- `src/app/api/admin/diagnostic/route.ts` - New diagnostic endpoint
- `src/app/api/health/route.ts` - New health check endpoint

## Files Added

- `TROUBLESHOOTING.md` - Comprehensive troubleshooting guide
- `check-server.sh` - Server diagnostic script
- `FIXES_APPLIED.md` - This file

## Summary

The main issue was that missing environment variables caused the Supabase module to fail at load time, resulting in 503 errors. The fixes ensure:

1. Better error messages
2. Lazy initialization prevents crashes
3. Diagnostic tools to identify issues
4. Clear guidance on what's missing

After deploying these fixes and setting environment variables correctly, the seeding should work properly.
