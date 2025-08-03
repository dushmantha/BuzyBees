# Subscription Status Debugging Guide

## Testing Subscription Cancellation

To test the subscription cancellation flow:

1. **Cancel Subscription:**
   - Go to ProfileScreen
   - Click "Cancel Subscription"
   - Subscription status becomes "cancelled" but premium access remains

2. **Check Current Status:**
   - Look at debug info on HomeScreen (development mode)
   - Should show: `Premium=Yes | Type=monthly/yearly | Status=cancelled`

3. **Simulate Expiration (for testing):**
   ```sql
   -- Run this in Supabase SQL Editor to simulate expired subscription
   UPDATE users 
   SET subscription_end_date = '2024-01-01T00:00:00Z'
   WHERE email = 'your-test-email@example.com';
   ```

4. **Expected Behavior:**
   - **Immediately after cancellation:** Pro tag still shows, features remain unlocked
   - **After expiration date passes:** Pro tag disappears, features become locked

## Current Premium Logic

The app checks premium status in this order:
1. `is_premium = true` AND 
2. `subscription_status IN ('active', 'cancelled')` AND
3. `subscription_end_date > current_time`

If any condition fails, premium access is revoked.

## Testing Different States

### Active Subscription
```sql
UPDATE users SET 
  is_premium = true,
  subscription_status = 'active',
  subscription_end_date = '2025-12-31T23:59:59Z'
WHERE email = 'test@example.com';
```

### Cancelled (but not expired)
```sql
UPDATE users SET 
  is_premium = true,
  subscription_status = 'cancelled',
  subscription_end_date = '2025-12-31T23:59:59Z'
WHERE email = 'test@example.com';
```

### Expired
```sql
UPDATE users SET 
  is_premium = false,
  subscription_status = 'expired',
  subscription_end_date = '2024-01-01T00:00:00Z'
WHERE email = 'test@example.com';
```

### No Subscription
```sql
UPDATE users SET 
  is_premium = false,
  subscription_status = 'inactive',
  subscription_end_date = NULL
WHERE email = 'test@example.com';
```

## Debugging Commands

Check current user subscription status:
```sql
SELECT id, email, is_premium, subscription_status, 
       subscription_type, subscription_end_date
FROM users 
WHERE email = 'your-email@example.com';
```

## Expected Pro Tag Behavior

- ✅ **Active subscription:** Pro tag shows
- ✅ **Cancelled subscription (not expired):** Pro tag shows
- ❌ **Expired subscription:** Pro tag hidden
- ❌ **No subscription:** Pro tag hidden