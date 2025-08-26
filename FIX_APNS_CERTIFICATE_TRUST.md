# Fix: "Apple push service certificate is not trusted"

## 🚨 Problem
Your iOS app is getting "Apple push service certificate is not trusted" error when trying to receive push notifications.

## 🔍 Root Causes & Solutions

### 1. Bundle ID Mismatch (Most Common)

**Current Configuration:**
- Firebase Bundle ID: `org.app.qwiken` ✅
- Need to verify Xcode bundle ID matches

**Fix Steps:**
1. Open `ios/BuzyBees.xcworkspace` in Xcode
2. Select **BuzyBees** target
3. Go to **General** tab
4. Verify **Bundle Identifier** is exactly: `org.app.qwiken`
5. If different, change it to match Firebase configuration

### 2. Missing APNs Certificate/Key in Firebase

**Check Firebase Configuration:**
1. [Firebase Console](https://console.firebase.google.com/) → **qwiken-978a2**
2. **Project Settings** → **Cloud Messaging** → **iOS app configuration**
3. Should show either:
   - ✅ "APNs authentication key" configured, OR
   - ✅ "APNs certificates" configured

**If Missing - Add APNs Authentication Key:**
```
1. Apple Developer Console → Keys → +
2. Name: "Qwiken Push Notifications"
3. Enable: Apple Push Notifications service (APNs)
4. Download .p8 file (save securely!)
5. Note Key ID and Team ID
6. Firebase → Upload APNs authentication key with Key ID & Team ID
```

### 3. Wrong APNs Environment

**Check Entitlements File:**
Your current entitlements: `ios/BuzyBees/BuzyBees.entitlements`
```xml
<key>com.apple.developer.aps-environment</key>
<string>development</string>  <!-- ✅ Correct for development -->
```

**For Production:** Change to `production` when releasing to App Store

### 4. App ID Configuration in Apple Developer Console

**Verify App ID has Push Notifications:**
1. [Apple Developer Console](https://developer.apple.com/account/resources/identifiers/list)
2. Find App ID: `org.app.qwiken`
3. Edit → **Push Notifications** should be ✅ **Enabled**
4. If not enabled:
   - Check **Push Notifications**
   - Click **Continue** → **Save**

### 5. Provisioning Profile Issues

**Check Development Provisioning Profile:**
1. Apple Developer Console → Profiles
2. Find your development profile for `org.app.qwiken`
3. Edit → Ensure **Push Notifications** is included
4. Download and install updated profile
5. In Xcode: **Signing & Capabilities** → Select updated profile

### 6. Xcode Project Configuration

**Verify Capabilities in Xcode:**
```
1. Open ios/BuzyBees.xcworkspace
2. Select BuzyBees target
3. Signing & Capabilities tab
4. Should have:
   ✅ Push Notifications
   ✅ Background Modes → Remote notifications checked
```

**Add if missing:**
```
1. Click + Capability
2. Add "Push Notifications"
3. Add "Background Modes" → Check "Remote notifications"
```

## 🛠 Step-by-Step Fix Process

### Step 1: Verify Bundle ID Match
```bash
# Check current bundle ID in Xcode project
grep -r "PRODUCT_BUNDLE_IDENTIFIER" ios/BuzyBees.xcodeproj/
# Should be: org.app.qwiken
```

### Step 2: Check Firebase APNs Configuration
1. Firebase Console → qwiken-978a2 → Cloud Messaging
2. Look for "APNs authentication key" or "APNs certificates"
3. If missing, follow APNs setup guide

### Step 3: Verify App ID in Apple Developer Console
1. Check `org.app.qwiken` has Push Notifications enabled
2. Regenerate provisioning profile if needed

### Step 4: Clean and Rebuild
```bash
# Clean everything
cd ios && rm -rf build DerivedData && cd ..
npx react-native clean --include ios,metro
cd ios && pod install && cd ..

# Rebuild
npx react-native run-ios --device
```

## ✅ Verification Steps

### 1. Check Device Token Registration
```javascript
// In your app, use PushNotificationTest component
// Should show device token without errors
```

### 2. Test Push Notification
```javascript
// Send test notification
// Should receive notification on device
```

### 3. Check iOS Console Logs
```
In Xcode: Window → Devices and Simulators → Select device → View logs
Look for push notification related logs
```

## 🚨 Common Mistakes

❌ **Bundle ID mismatch** between Xcode, Firebase, and Apple Developer Console
❌ **Missing Push Notifications** capability in App ID
❌ **Wrong provisioning profile** without push notifications
❌ **Testing on simulator** (push only works on physical devices)
❌ **Using wrong APNs environment** (development vs production)

## 🎯 Quick Diagnostic

Run this checklist:
- [ ] Bundle ID matches across all platforms: `org.app.qwiken`
- [ ] APNs key/certificate uploaded to Firebase
- [ ] App ID has Push Notifications enabled
- [ ] Provisioning profile includes Push Notifications
- [ ] Xcode has Push Notifications capability
- [ ] Testing on physical device (not simulator)
- [ ] iOS notifications permission granted

## 🔗 Useful Resources

- [Apple Developer Console](https://developer.apple.com/account/)
- [Firebase Console](https://console.firebase.google.com/)
- [Apple Push Notification Troubleshooting](https://developer.apple.com/documentation/usernotifications/handling_notification_responses_from_the_server)

## ⚡ Emergency Fix Commands

```bash
# Reset iOS build completely
cd ios && rm -rf build DerivedData Pods Podfile.lock && cd ..
npm install
cd ios && pod install && cd ..
npx react-native run-ios --device --reset-cache
```