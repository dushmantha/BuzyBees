# BuzyBees Stripe Integration Testing Guide

## Overview
This guide covers testing the complete payment-to-premium flow for BuzyBees app with Stripe integration.

## Prerequisites
- Stripe test mode is active (using test keys)
- Supabase Edge Functions are deployed
- App is running in development mode

## Test Card Numbers
Use these Stripe test cards for different scenarios:

### Successful Payment
- **Card Number**: 4242 4242 4242 4242
- **Expiry**: Any future date (e.g., 12/25)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 42424)

### 3D Secure Authentication
- **Card Number**: 4000 0025 0000 3155
- **Other details**: Same as above

### Declined Payment
- **Card Number**: 4000 0000 0000 9995
- **Other details**: Same as above

## Testing Flows

### 1. New User Premium Subscription

1. **Start from Free User**
   - Sign up/login as a new user
   - Verify user shows as non-premium in ProfileScreen
   - Verify limited features in ServiceQueueScreen and EarningsScreen

2. **Initiate Payment**
   - Go to any limited feature (e.g., shop queue)
   - Tap "Unlock with Premium" button
   - Choose Monthly ($9.99) or Yearly ($99.99) plan
   - WebView should open with Stripe Checkout

3. **Complete Payment**
   - Enter test card details (4242 4242 4242 4242)
   - Complete checkout
   - App should redirect back automatically

4. **Verify Premium Access**
   - Check ProfileScreen shows active subscription
   - Verify subscription type (Monthly/Yearly)
   - Confirm all premium features are unlocked
   - Check ServiceQueueScreen and EarningsScreen show full access

### 2. Monthly to Yearly Upgrade

1. **Start with Monthly Subscription**
   - Ensure user has active monthly subscription
   - Go to ProfileScreen

2. **Upgrade Plan**
   - Tap "Upgrade to Yearly" button
   - Confirm upgrade in dialog
   - Wait for processing

3. **Verify Upgrade**
   - ProfileScreen should show "Yearly" plan
   - Verify new expiration date (1 year from now)
   - Check Stripe dashboard for prorated charge

### 3. Subscription Cancellation

1. **Cancel Active Subscription**
   - Go to ProfileScreen with active subscription
   - Tap "Cancel Subscription" button
   - Confirm cancellation

2. **Verify Cancellation**
   - Subscription should show as "Cancelled"
   - Access remains until end date
   - "Cancel Subscription" button should be hidden

### 4. Webhook Testing

1. **Payment Verification**
   - After successful payment, check Supabase logs
   - Verify webhook processed checkout.session.completed
   - Check user record updated in database

2. **Database Verification**
   ```sql
   -- Check user subscription status
   SELECT id, email, is_premium, subscription_type, 
          subscription_status, subscription_end_date 
   FROM users 
   WHERE email = 'your-test-email@example.com';
   
   -- Check payment history
   SELECT * FROM payments 
   WHERE user_id = 'your-user-id' 
   ORDER BY created_at DESC;
   ```

### 5. Edge Cases

1. **Network Interruption**
   - Start payment process
   - Turn off network mid-checkout
   - Verify graceful error handling

2. **App Backgrounding**
   - Start payment in WebView
   - Background the app
   - Complete payment in browser
   - Return to app and verify update

3. **Multiple Device Sync**
   - Login on two devices
   - Purchase premium on one device
   - Verify premium unlocks on second device

## Troubleshooting

### Common Issues

1. **"Payment session creation failed"**
   - Check Stripe secret key in Supabase secrets
   - Verify Edge Functions are deployed
   - Check Supabase function logs

2. **Premium not unlocking after payment**
   - Verify webhook URL in Stripe dashboard
   - Check webhook events in Stripe
   - Ensure database migrations are applied

3. **WebView not loading**
   - Check network connectivity
   - Verify Stripe publishable key
   - Check for CORS issues

### Debug Commands

```bash
# Check Supabase function logs
supabase functions logs stripe-create-payment-session
supabase functions logs stripe-webhook

# Test Edge Function directly
curl -X POST https://fezdmxvqurczeqmqvgzm.supabase.co/functions/v1/stripe-create-payment-session \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planType": "monthly"}'
```

## Monitoring

1. **Stripe Dashboard**
   - View test payments: https://dashboard.stripe.com/test/payments
   - Check webhooks: https://dashboard.stripe.com/test/webhooks
   - Monitor subscriptions: https://dashboard.stripe.com/test/subscriptions

2. **Supabase Dashboard**
   - Check user records for subscription updates
   - Monitor Edge Function invocations
   - Review function logs for errors

## Success Criteria

✅ User can purchase monthly/yearly subscription
✅ Payment completes and returns to app
✅ Premium features unlock immediately
✅ Subscription shows correctly in ProfileScreen
✅ Monthly users can upgrade to yearly
✅ Users can cancel subscriptions
✅ Webhook updates database correctly
✅ Premium status persists across app restarts
✅ Multiple devices sync premium status

## Next Steps

After successful testing:
1. Configure production Stripe keys
2. Update webhook endpoint for production
3. Set up monitoring and alerts
4. Document customer support procedures