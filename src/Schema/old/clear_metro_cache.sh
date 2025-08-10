#!/bin/bash

# Clear Metro cache without killing processes
echo "🧹 Clearing Metro cache..."

# Clear Metro cache directories
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/react-* 2>/dev/null || true
rm -rf $HOME/.metro 2>/dev/null || true

# Clear React Native cache
rm -rf $TMPDIR/react-* 2>/dev/null || true
rm -rf $TMPDIR/metro-* 2>/dev/null || true

echo "✅ Metro cache cleared"
echo "💡 Now run: npm start -- --reset-cache"
echo "💡 Then in another terminal: npx react-native run-ios"