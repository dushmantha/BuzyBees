# PDF Generation Setup Instructions

## Required Libraries

To enable PDF generation for invoices, you need to install the following libraries:

### 1. React Native HTML to PDF
```bash
npm install react-native-html-to-pdf
# or
yarn add react-native-html-to-pdf
```

### 2. React Native File System (RNFS)
```bash
npm install react-native-fs
# or
yarn add react-native-fs
```

### 3. React Native Share
```bash
npm install react-native-share
# or
yarn add react-native-share
```

## iOS Setup

1. Navigate to iOS folder:
```bash
cd ios
```

2. Install pods:
```bash
pod install
```

3. Add to your `Info.plist`:
```xml
<key>NSPhotoLibraryAddUsageDescription</key>
<string>This app needs access to save invoices to your photo library</string>
```

## Android Setup

1. Add permissions to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

2. For Android 10+ (API 29+), add to `<application>` tag:
```xml
android:requestLegacyExternalStorage="true"
```

## Features

The new PDF generator provides:

1. **Professional Layout**
   - Company logo support with automatic fallback
   - Clean, modern design with proper spacing
   - Professional typography and color scheme
   - A4 page format

2. **Complete Invoice Details**
   - Header with company info and logo
   - Invoice number, dates, and terms
   - Client billing information
   - Service details table
   - Subtotals, discounts, and taxes
   - Terms & conditions
   - Professional footer

3. **Easy Sharing**
   - Direct PDF generation
   - Share via any app
   - Save to device
   - Professional filename format

## Usage

The PDF generator is automatically integrated into:
- Send Invoice button (main action)
- Export PDF button (in preview)
- Share functionality

## Troubleshooting

If you encounter issues:

1. **iOS Build Errors**
   - Clean build folder: `cd ios && xcodebuild clean`
   - Reinstall pods: `pod deintegrate && pod install`

2. **Android Build Errors**
   - Clean project: `cd android && ./gradlew clean`
   - Rebuild: `./gradlew assembleDebug`

3. **PDF Not Generating**
   - Check console for errors
   - Ensure all permissions are granted
   - Verify libraries are properly linked

## Benefits Over HTML

- **Better Control**: Precise layout control
- **Professional Look**: Consistent formatting across devices
- **Native Sharing**: Uses device's native share functionality
- **Offline Support**: No internet required
- **Logo Support**: Properly handles images and logos
- **Print Ready**: Optimized for printing