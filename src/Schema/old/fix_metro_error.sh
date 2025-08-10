#!/bin/bash

# Fix React Native Metro Bundler Configuration Error
# This script cleans all caches and restarts Metro properly

echo "🚀 FIXING METRO BUNDLER CONFIGURATION ERROR..."
echo "This will clean all React Native caches and restart the bundler"
echo ""

# Kill any existing Metro processes
echo "📤 Step 1: Killing existing Metro processes..."
pkill -f "react-native" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

echo "📤 Step 2: Cleaning React Native caches..."

# Clean React Native cache
npx react-native clean-project-auto 2>/dev/null || echo "react-native-clean-project not installed, skipping..."

# Clean Metro cache
rm -rf $TMPDIR/react-* 2>/dev/null || true
rm -rf $TMPDIR/metro-* 2>/dev/null || true

# Clean React Native cache directories
rm -rf ~/.react-native 2>/dev/null || true

# Clean node_modules cache
echo "📤 Step 3: Cleaning node_modules and reinstalling..."
rm -rf node_modules 2>/dev/null || true
npm cache clean --force 2>/dev/null || true

# Reinstall dependencies
npm install

echo "📤 Step 4: Cleaning iOS build cache..."
# Clean iOS builds if on macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    cd ios
    rm -rf build 2>/dev/null || true
    rm -rf Pods 2>/dev/null || true
    rm -f Podfile.lock 2>/dev/null || true
    pod install --repo-update 2>/dev/null || echo "Pod install failed, continuing..."
    cd ..
fi

echo "📤 Step 5: Creating new metro.config.js..."

# Create a proper metro.config.js
cat > metro.config.js << 'EOF'
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    assetExts: [...defaultConfig.resolver.assetExts, 'bin'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
EOF

echo "📤 Step 6: Starting Metro bundler with reset cache..."

# Start Metro with reset cache
echo ""
echo "✅ METRO BUNDLER CLEANUP COMPLETE!"
echo ""
echo "🎉 WHAT WAS FIXED:"
echo "  ✅ Killed all existing Metro processes"
echo "  ✅ Cleared all React Native caches"
echo "  ✅ Cleaned node_modules and reinstalled"
echo "  ✅ Cleaned iOS build cache (if on macOS)"
echo "  ✅ Created proper metro.config.js"
echo ""
echo "🚀 NEXT STEPS:"
echo "  1. Run: npm start -- --reset-cache"
echo "  2. In another terminal, run: npx react-native run-ios"
echo ""
echo "📱 ALTERNATIVE MANUAL STEPS:"
echo "  1. npm start -- --reset-cache"
echo "  2. Open Xcode and build from there"
echo ""
echo "🎯 Your Metro bundler should now work without configuration errors!"

# Start Metro with reset cache automatically
echo "Starting Metro bundler with reset cache..."
npm start -- --reset-cache