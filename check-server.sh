#!/bin/bash

# Server Diagnostic Script
# Run this on your Hostinger server via SSH to diagnose issues

echo "=== Zalora Server Diagnostic ==="
echo ""

# Check Node.js version
echo "1. Node.js Version:"
node --version || echo "❌ Node.js not found"
echo ""

# Check npm version
echo "2. npm Version:"
npm --version || echo "❌ npm not found"
echo ""

# Find app directory
echo "3. Looking for app directory..."
APP_DIR=$(find ~ -name "package.json" -type f 2>/dev/null | grep -v node_modules | head -1 | xargs dirname)
if [ -z "$APP_DIR" ]; then
    echo "❌ Could not find app directory"
    echo "   Please navigate to your app directory manually"
else
    echo "✅ Found app at: $APP_DIR"
    cd "$APP_DIR"
fi
echo ""

# Check if node_modules exists
echo "4. Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
    MODULE_COUNT=$(ls node_modules | wc -l)
    echo "   Found $MODULE_COUNT packages"
else
    echo "❌ node_modules not found - run: npm install"
fi
echo ""

# Check if .next exists (built app)
echo "5. Checking build..."
if [ -d ".next" ]; then
    echo "✅ .next directory exists (app is built)"
else
    echo "⚠️  .next directory not found - run: npm run build"
fi
echo ""

# Check environment variables
echo "6. Checking environment variables..."
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "   Supabase URL: $(grep NEXT_PUBLIC_SUPABASE_URL .env | cut -d'=' -f2 | head -c 30)..."
    echo "   Service Key: $(grep SUPABASE_SERVICE_ROLE_KEY .env | cut -d'=' -f2 | head -c 20)..."
else
    echo "⚠️  .env file not found"
    echo "   Check Hostinger hPanel → Node.js → Environment Variables"
fi
echo ""

# Check running Node processes
echo "7. Checking running Node.js processes..."
NODE_PROCESSES=$(ps aux | grep -E "node|next" | grep -v grep | wc -l)
if [ "$NODE_PROCESSES" -gt 0 ]; then
    echo "✅ Found $NODE_PROCESSES Node.js process(es):"
    ps aux | grep -E "node|next" | grep -v grep | head -3
else
    echo "❌ No Node.js processes running"
    echo "   Start the app via Hostinger hPanel or run: npm start"
fi
echo ""

# Check listening ports
echo "8. Checking listening ports..."
if command -v netstat &> /dev/null; then
    netstat -tulpn | grep -E ":3000|:8080|:5000" || echo "   No common Node.js ports found listening"
elif command -v ss &> /dev/null; then
    ss -tulpn | grep -E ":3000|:8080|:5000" || echo "   No common Node.js ports found listening"
else
    echo "   Cannot check ports (netstat/ss not available)"
fi
echo ""

# Test Supabase connection (if env vars available)
echo "9. Testing Supabase connection..."
if [ -f ".env" ] && command -v node &> /dev/null; then
    node << 'EOF'
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.log('❌ Missing Supabase environment variables');
    process.exit(1);
}

console.log('   Connecting to Supabase...');
const client = createClient(url, key);

client.from('users').select('id').limit(1).then(({error}) => {
    if (error) {
        console.log('❌ Connection failed:', error.message);
        process.exit(1);
    } else {
        console.log('✅ Supabase connection successful');
    }
}).catch(err => {
    console.log('❌ Connection error:', err.message);
    process.exit(1);
});
EOF
else
    echo "   ⚠️  Cannot test (need .env file and node)"
fi
echo ""

echo "=== Diagnostic Complete ==="
echo ""
echo "Next steps:"
echo "1. If env vars are missing, set them in Hostinger hPanel"
echo "2. If app is not running, start it via Hostinger hPanel"
echo "3. If build is missing, run: npm run build"
echo "4. Check logs: tail -f ~/logs/nodejs/error.log"
echo "5. Test endpoints: curl https://your-domain.com/api/health"
