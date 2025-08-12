# Apple Sign-In Implementation Guide

## Setup Instructions

### 1. Install Required Dependencies

```bash
npm install @invertase/react-native-apple-authentication
# For iOS
cd ios && pod install
```

### 2. iOS Configuration

#### Enable Apple Sign-In in Xcode:
1. Open your project in Xcode
2. Select your target in the Project Navigator
3. Go to "Signing & Capabilities" tab
4. Click the "+" button and add "Sign In with Apple" capability

#### Update Info.plist:
No additional Info.plist changes are required for Apple Sign-In.

#### iOS 13+ Requirement:
Apple Sign-In is only available on iOS 13+ and macOS 10.15+. The implementation includes availability checking.

### 3. Apple Developer Console Setup

1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Select your App ID
4. Enable "Sign In with Apple" capability
5. Configure your app's bundle identifier

### 4. Supabase Configuration

In your Supabase dashboard:
1. Go to Authentication > Providers
2. Enable "Apple" provider
3. Add your Service ID (use your app's bundle identifier)
4. No additional configuration needed for mobile apps

## Features

The Apple Sign-In implementation includes:

### ✅ **LoginScreen.tsx**
- Apple Sign-In button with loading state
- Proper error handling
- Welcome messages for new/returning users
- Supabase integration

### ✅ **RegisterScreen.tsx**
- Apple Sign-In button with loading state
- Account creation flow
- Form state management during sign-in
- Loading state coordination with other form elements

### ✅ **Error Handling**
- Network connectivity issues
- User cancellation (error code 1001)
- General Apple Sign-In failures (error code 1000)
- Supabase authentication errors

### ✅ **User Experience**
- Loading indicators during sign-in process
- Disabled form elements during authentication
- Success/welcome messages
- Automatic navigation on success

### ✅ **Data Management**
- User profile creation in Supabase
- Apple ID to Supabase user mapping
- First name, last name, and email extraction
- Default account type assignment (consumer)

## Placeholder Implementation

The current implementation uses placeholder functions that throw informative errors when the actual Apple Sign-In package isn't installed. This allows the app to compile and run without the package, while providing clear setup instructions to developers.

To activate Apple Sign-In:
1. Install the package: `npm install @invertase/react-native-apple-authentication`
2. Run `cd ios && pod install`
3. Uncomment the import statements in `src/services/auth/appleSignIn.ts`
4. Remove the placeholder implementation
5. Configure your iOS app in Xcode (add Sign In with Apple capability)

## Platform Support

- **iOS**: Fully supported on iOS 13+
- **Android**: Not supported (Apple Sign-In is iOS/macOS only)
- The implementation includes proper platform checking

## Security

- Uses Apple's secure authentication flow
- Identity tokens are validated by Supabase
- No sensitive data is stored locally
- Follows Apple's Human Interface Guidelines for Sign In with Apple

## Testing

Test the implementation by:
1. Installing on a physical iOS device (iOS 13+)
2. Attempting to sign in with Apple ID
3. Verifying user creation in Supabase
4. Testing error scenarios (cancellation, network issues)

## Troubleshooting

### Common Issues:
1. **Not available error**: Ensure you're testing on iOS 13+ device
2. **Capability missing**: Add "Sign In with Apple" in Xcode capabilities
3. **Bundle ID mismatch**: Verify bundle ID matches Apple Developer Console
4. **Supabase integration**: Check provider configuration in Supabase dashboard