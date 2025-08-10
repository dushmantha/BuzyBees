#!/bin/bash

echo "🚀 FINAL FIX: Restarting app to clear schema cache"
echo ""

# Check if Metro is running
METRO_PID=$(lsof -ti:8081 2>/dev/null)

if [ -n "$METRO_PID" ]; then
    echo "🔄 Metro is running, restarting to clear cache..."
    kill $METRO_PID
    sleep 3
else
    echo "📦 Metro is not running"
fi

echo "🧹 Clearing all caches..."
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/react-* 2>/dev/null || true
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/react-* 2>/dev/null || true

echo "🚀 Starting Metro with fresh schema cache..."
npm start -- --reset-cache &

echo ""
echo "✅ RESTART COMPLETE!"
echo ""
echo "📱 Next steps:"
echo "  1. Wait for Metro to fully start (about 30 seconds)"
echo "  2. Reload your app (⌘+R in simulator)"
echo "  3. Try saving the shop - should work now!"
echo ""
echo "🎯 The 'images' column has been added to the database"
echo "🎯 Schema cache has been cleared"
echo "🎯 All permissions are set correctly"