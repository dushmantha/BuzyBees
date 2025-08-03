# 🎯 Stripe Integration Setup Guide

Complete Stripe payment integration with Supabase Edge Functions for BuzyBees app.

## 🚀 Quick Deploy

Run this single command to deploy everything:

```bash
./deploy-stripe.sh
```

## 📱 iOS Deep Linking Setup

Add this to your `ios/BuzyBees/Info.plist` inside the `<dict>` tag:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>buzybees.payment</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>buzybees</string>
        </array>
    </dict>
</array>
```

## 🎪 Stripe Dashboard Setup

### 1. Add Webhook Endpoint
1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Use URL: `https://fezdmxvqurczeqmqvgzm.supabase.co/functions/v1/stripe-webhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 2. Get Webhook Secret (Optional)
1. Click on your webhook endpoint
2. Copy the "Signing secret" (starts with `whsec_`)
3. Set it in Supabase:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

## 🧪 Testing

### Test Cards (Sandbox Mode)
- **Success**: `4242 4242 4242 4242`
- **3D Secure**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 9995`
- **Expiry**: Any future date (12/34)
- **CVC**: Any 3 digits (123)

### Test Flow
1. Run app: `npx react-native run-ios`
2. Open upgrade modal
3. Select a plan (Monthly $9.99 or Yearly $99.99)
4. Tap "Upgrade to Pro"
5. Complete payment in browser
6. App will detect success via deep link
7. User becomes premium automatically

## 🔧 Configuration

### Current Settings
- **Environment**: Sandbox/Test Mode
- **Plans**: 
  - Monthly: $9.99/month
  - Yearly: $99.99/year (17% savings)
- **Deep Link**: `buzybees://`
- **Supabase Project**: `fezdmxvqurczeqmqvgzm`

### Files Created
```
src/lib/stripe/stripeService.ts          # React Native service
supabase/functions/stripe-*/index.ts     # Edge Functions (5 functions)
src/components/UpgradeModal.tsx          # Updated with Stripe integration
deploy-stripe.sh                         # Deployment script
```

## 🎬 How It Works

1. **User Action**: Taps upgrade button in UpgradeModal
2. **Create Session**: App calls Supabase function to create Stripe checkout session
3. **Payment Flow**: Browser opens with Stripe Checkout
4. **Success Redirect**: Stripe redirects to `buzybees://payment-success`
5. **Deep Link**: App catches deep link and verifies payment
6. **Update Database**: Webhook updates user to premium status
7. **User Experience**: Immediate access to premium features

## 🔒 Security Features

- ✅ Server-side payment processing (Supabase Edge Functions)
- ✅ Webhook signature verification
- ✅ User authentication required
- ✅ Sandbox mode for safe testing
- ✅ Automatic subscription management
- ✅ Secure customer data handling

## 🛠️ Troubleshooting

### "Network request failed"
- Check if functions deployed: `supabase functions list`
- Verify internet connection

### "User not authenticated" 
- Ensure user is logged in to Supabase
- Check auth session is valid

### "Payment page won't open"
- Check iOS simulator can open external links
- Try on physical device

### Deep link not working
- Verify Info.plist URL scheme setup
- Check app is in foreground when returning from payment

## 📈 Production Checklist

When ready for live payments:

1. **Update Stripe Keys**:
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_KEY
   ```

2. **Update App Config**:
   ```typescript
   // In stripeService.ts
   publishableKey: 'pk_live_YOUR_LIVE_KEY'
   ```

3. **Create Live Webhook**: Same URL, but in live mode

4. **Test Thoroughly**: Use real payment methods

---

🎉 **Your Stripe integration is now ready!** Users can subscribe to premium plans with secure card payments.