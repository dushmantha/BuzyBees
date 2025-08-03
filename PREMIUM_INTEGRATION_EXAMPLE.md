# 🎯 Premium Integration Guide

This guide shows how to integrate the premium system throughout your BuzyBees app.

## 🚀 Setup

### 1. Wrap your app with PremiumProvider

```tsx
// App.tsx or your root component
import { PremiumProvider } from './src/contexts/PremiumContext';

export default function App() {
  return (
    <PremiumProvider>
      {/* Your existing app components */}
      <YourAppContent />
    </PremiumProvider>
  );
}
```

### 2. Run Database Migration

Run this SQL in your Supabase SQL Editor:
```sql
-- Copy contents from supabase/migrations/0001_add_stripe_fields.sql
```

## 📱 Usage Examples

### Basic Premium Check

```tsx
import { usePremium } from '../contexts/PremiumContext';

function MyComponent() {
  const { isPremium, isLoading } = usePremium();
  
  if (isLoading) return <Loading />;
  
  return (
    <View>
      {isPremium ? (
        <Text>Welcome Premium User! 🌟</Text>
      ) : (
        <Text>Upgrade to unlock premium features</Text>
      )}
    </View>
  );
}
```

### Feature-Specific Gates

```tsx
import PremiumGate from '../components/PremiumGate';
import { PremiumFeature } from '../lib/premium/premiumService';

function NotificationsScreen() {
  const handleUpgrade = () => {
    // Show upgrade modal
    setShowUpgradeModal(true);
  };

  return (
    <View>
      <PremiumGate 
        feature={PremiumFeature.UNLIMITED_NOTIFICATIONS}
        onUpgradePress={handleUpgrade}
      >
        {/* This content only shows for premium users */}
        <AllNotificationsList />
      </PremiumGate>
    </View>
  );
}
```

### Using Hooks

```tsx
import { usePremiumFeature } from '../hooks/usePremiumFeature';
import { PremiumFeature } from '../lib/premium/premiumService';

function AnalyticsScreen() {
  const { hasAccess, isLoading } = usePremiumFeature(PremiumFeature.INCOME_ANALYTICS);
  
  if (isLoading) return <Loading />;
  
  if (!hasAccess) {
    return <UpgradePrompt feature="Income Analytics" />;
  }
  
  return <AdvancedAnalytics />;
}
```

### Conditional Rendering

```tsx
import { usePremium } from '../contexts/PremiumContext';

function CustomerList() {
  const { isPremium } = usePremium();
  const maxCustomers = isPremium ? Infinity : 5;
  
  return (
    <View>
      {customers.slice(0, maxCustomers).map(customer => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
      
      {!isPremium && customers.length > 5 && (
        <View style={styles.upgradePrompt}>
          <Text>View {customers.length - 5} more customers</Text>
          <Button title="Upgrade to Pro" onPress={showUpgrade} />
        </View>
      )}
    </View>
  );
}
```

## 🔧 Premium Features Available

```tsx
export enum PremiumFeature {
  UNLIMITED_NOTIFICATIONS = 'unlimited_notifications',
  UNLIMITED_CUSTOMERS = 'unlimited_customers', 
  INCOME_ANALYTICS = 'income_analytics',
  PREMIUM_INVOICES = 'premium_invoices',
  ADVANCED_REPORTS = 'advanced_reports',
  PRIORITY_SUPPORT = 'priority_support',
  CUSTOM_BRANDING = 'custom_branding',
}
```

## 🎪 Complete Implementation Example

```tsx
import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { usePremium } from '../contexts/PremiumContext';
import PremiumGate from '../components/PremiumGate';
import UpgradeModal from '../components/UpgradeModal';
import { PremiumFeature } from '../lib/premium/premiumService';

function NotificationsScreen() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { isPremium, subscription, formatSubscription } = usePremium();
  
  const notifications = getNotifications(); // Your data
  const maxNotifications = isPremium ? notifications.length : 3;
  
  const handleUpgrade = () => {
    setShowUpgradeModal(true);
  };
  
  const handleUpgradeSuccess = () => {
    setShowUpgradeModal(false);
    // Premium context will automatically refresh
  };

  return (
    <View style={styles.container}>
      {/* Premium Status Banner */}
      {isPremium && (
        <View style={styles.premiumBanner}>
          <Text style={styles.premiumText}>
            🌟 Premium Active - {formatSubscription()?.planText}
          </Text>
        </View>
      )}

      {/* Notifications List */}
      <FlatList
        data={notifications.slice(0, maxNotifications)}
        renderItem={({ item }) => <NotificationCard notification={item} />}
        keyExtractor={(item) => item.id}
      />

      {/* Premium Gate for Additional Notifications */}
      {!isPremium && notifications.length > 3 && (
        <PremiumGate
          feature={PremiumFeature.UNLIMITED_NOTIFICATIONS}
          onUpgradePress={handleUpgrade}
          style={styles.gate}
        >
          {/* This won't show since user is not premium */}
        </PremiumGate>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgradeSuccess}
      />
    </View>
  );
}
```

## 🎯 How Payment Flow Works

1. **User taps "Upgrade to Pro"** → `UpgradeModal` opens
2. **User selects plan** → Creates Stripe checkout session
3. **Payment completes** → Stripe webhook updates database
4. **App refreshes** → `PremiumContext` fetches new status
5. **Features unlock** → All premium gates automatically open

## 📊 Database Schema

The system automatically creates these tables:
- **users** - Updated with subscription fields
- **payments** - Transaction history 
- **subscription_history** - Subscription change log

## 🔒 Security

- ✅ All premium checks happen server-side via Supabase RLS
- ✅ Stripe webhooks verify payment completion
- ✅ Database functions handle subscription updates
- ✅ Real-time updates keep app in sync

## 🧪 Testing

1. **Test with sandbox Stripe** - Use test cards
2. **Check database** - Verify payment records are created
3. **Test features** - Premium gates should unlock immediately
4. **Test webhooks** - Check Supabase function logs

Your premium system is now fully integrated! Users can subscribe, features unlock automatically, and everything is tracked in the database. 🚀