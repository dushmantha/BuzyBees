# 🔧 Complete Google Sign-In Setup Guide

## ⚠️ Current Issue
**DEVELOPER_ERROR** - The SHA-1 fingerprint for your debug keystore is not registered in Google Cloud Console.

## 📋 Required Information

**Package Name:** `com.buzybees`  
**SHA-1 Fingerprint:** `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`  
**Web Client ID:** `102120087810-25kbtdpa2gsb1c5vhnauknrk3mi5qnkm.apps.googleusercontent.com`  
**Android Client ID:** `102120087810-ls8it1t4pjhmnngp7pojpkl57aucd4l7.apps.googleusercontent.com`

## 🚀 Step-by-Step Fix

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project (or create one if needed)

### Step 2: Enable Google Sign-In API
1. Go to **APIs & Services** > **Library**
2. Search for "Google Sign-In API" or "Identity Toolkit API"
3. Click **Enable**

### Step 3: Configure OAuth 2.0 Clients
1. Go to **APIs & Services** > **Credentials**
2. You need BOTH clients configured:

#### Android Client Settings:
- **Application type:** Android
- **Name:** BuzyBees Android
- **Package name:** `com.buzybees`
- **SHA-1 certificate fingerprint:** `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
- **Client ID:** `102120087810-ls8it1t4pjhmnngp7pojpkl57aucd4l7.apps.googleusercontent.com`

#### Web Client Configuration:
- **Application type:** Web application
- **Client ID:** `102120087810-25kbtdpa2gsb1c5vhnauknrk3mi5qnkm.apps.googleusercontent.com`

### Step 4: Critical Configuration Note
⚠️ **IMPORTANT:** The app uses the **Web Client ID** in code configuration, but the **Android Client ID** must have the correct SHA-1 fingerprint registered!

### Step 5: Additional SHA-1 Fingerprints (Optional)
If you plan to use release builds, also add the release SHA-1:
```bash
# Get release keystore SHA-1 (when you create one)
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
```

## 🎯 Quick Links

1. **Google Cloud Console:** https://console.cloud.google.com/
2. **OAuth Credentials:** https://console.cloud.google.com/apis/credentials
3. **API Library:** https://console.cloud.google.com/apis/library

## ✅ Verification Steps

After adding the SHA-1 fingerprint:

1. **Wait 5-10 minutes** for changes to propagate
2. **Restart the app** completely (close and reopen)
3. **Test Google Sign-In** on the login screen
4. Should see Google account picker instead of error

## 🔍 Troubleshooting

### If you still get DEVELOPER_ERROR:
1. Double-check the package name matches exactly: `com.buzybees`
2. Verify SHA-1 fingerprint is copied correctly (no spaces)
3. Ensure both Android and Web OAuth clients are configured
4. Wait longer for Google's systems to update (up to 30 minutes)

### If you get "Web Client ID not found":
1. Copy the Web Client ID from Google Cloud Console
2. Verify it matches in your `.env` file or `googleSignIn.ts`

## 📱 Testing

Once configured, the Google Sign-In flow should:
1. Show Google account picker
2. Allow account selection
3. Return to your app with user signed in
4. Create user profile in Supabase

## 🔐 Security Notes

- The SHA-1 fingerprint provided is for **debug builds only**
- For production, generate and add a **release keystore SHA-1**
- Keep your release keystore secure and backed up
- Never commit keystores to version control

---

**Next Steps:** Add the SHA-1 fingerprint to Google Cloud Console and test the Google Sign-In functionality.