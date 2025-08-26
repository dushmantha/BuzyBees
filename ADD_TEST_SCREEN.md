# How to Add Push Notification Test Screen

## Option 1: Add to Tab Navigator (if you have tabs)

```tsx
// In your tab navigator file
import TestPushScreen from '../screens/TestPushScreen';

// Add this tab temporarily
<Tab.Screen
  name="TestPush"
  component={TestPushScreen}
  options={{
    tabBarLabel: 'Test Push',
    tabBarIcon: ({ color, size }) => (
      <Icon name="flask" size={size} color={color} />
    ),
  }}
/>
```

## Option 2: Add Button to Settings/Profile Screen

```tsx
// In your Settings or Profile screen
import { useNavigation } from '@react-navigation/native';

// Add this button
<TouchableOpacity
  style={{
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 8,
    margin: 20,
  }}
  onPress={() => navigation.navigate('TestPush')}
>
  <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
    🧪 Test Push Notifications
  </Text>
</TouchableOpacity>
```

## Option 3: Direct Import in Any Screen

```tsx
// At the top of any screen file
import TestPushScreen from '../screens/TestPushScreen';

// Replace the screen content temporarily
return <TestPushScreen />;
```

## Testing Steps

1. **Run the app on physical device** (not simulator for iOS)
2. **Navigate to test screen**
3. **Follow the numbered steps**:
   - 1️⃣ Check Configuration
   - 2️⃣ Request Permissions
   - 3️⃣ Check Device Token
   - 4️⃣ Send Test Notification

## Expected Results

✅ **Success Indicators:**
- Device token appears
- Permissions granted
- Notification sent to 1+ devices
- Notification appears on device

❌ **Common Issues:**
- No device token → Restart app
- Permissions denied → Check iOS Settings
- Send failed → Check Firebase/Supabase config
- Not received → Check device notification settings

## Cleanup

After testing, remove:
- Test screen from navigation
- Test button from UI
- Import statements