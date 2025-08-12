# Google Sign-In Implementation Guide

## Setup Instructions

### 1. Install Required Dependencies

```bash
npm install @react-native-google-signin/google-signin
# For iOS
cd ios && pod install
```

### 2. Android Configuration

Create/update `android/app/google-services.json` with your Firebase project configuration.

Add to `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'
```

Add to `android/build.gradle`:
```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.3.15'
}
```

### 3. iOS Configuration

1. Add `GoogleService-Info.plist` to your iOS project in Xcode
2. Add URL scheme to `ios/BuzyBees/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>REVERSED_CLIENT_ID</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>YOUR_REVERSED_CLIENT_ID</string>
        </array>
    </dict>
</array>
```

### 4. Environment Variables

Add to `.env` or `react-native-config`:
```
GOOGLE_WEB_CLIENT_ID=your_web_client_id_here
```

## Usage

The Google Sign-In has been integrated into:
- LoginScreen.tsx
- RegisterScreen.tsx

With proper error handling, loading states, and Supabase integration.

## Firebase Console Setup

1. Create a new Firebase project
2. Add Android/iOS apps
3. Download configuration files
4. Enable Google Sign-In in Authentication > Sign-in method