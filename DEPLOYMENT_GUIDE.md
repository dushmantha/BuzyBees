# Database Deployment Instructions

## Issues Fixed
1. **Relationship Conflict Error**: "Could not embed because more than one relationship was found for 'shop_bookings' and 'shop_staff'"
2. **Column Name Error**: "column shop_bookings.total_price does not exist"
3. **Services Column Error**: "column shop_bookings.services does not exist"

These have been resolved by:

1. ✅ **Fixed relationship conflicts** - Updated schema to use `staff_id` as primary relationship column
2. ✅ **Updated booking queries** - Modified API calls to use consistent column names
3. ✅ **Added backward compatibility** - Both `staff_id` and `assigned_staff_id` columns are synchronized
4. ✅ **Fixed column name mismatches** - Added alias for `total_price` to map to `total_amount`
5. ✅ **Fixed services column** - Added JSONB services column for backward compatibility and updated queries to use direct service_name field

## Files Modified

### 1. Database Schema Files
- `fix_booking_relationships.sql` - Adds staff_id column and removes relationship conflicts
- `comprehensive_booking_system.sql` - Complete booking schema with both columns

### 2. API Files Updated
- `src/services/api/bookings/bookingsAPI.ts` - Updated to set both staff_id and assigned_staff_id
- `src/lib/supabase/normalized.ts` - Updated createBooking to handle both column formats

## Manual Deployment Steps

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix_booking_relationships.sql`
4. Run the SQL script

### Option 2: Using Direct psql (if available)
```bash
psql "postgresql://postgres.tqfwfcphidfqftqrfdws:Tharaka%40123@aws-0-us-east-1.pooler.supabase.com:6543/postgres" -f fix_booking_relationships.sql
```

## Verification Steps

After deployment, verify the fix by:

1. **Check column exists**:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'shop_bookings' AND column_name LIKE '%staff%';
   ```

2. **Test booking creation** - Try creating a booking in the app

3. **Check relationships**:
   ```sql
   SELECT conname, contype FROM pg_constraint 
   WHERE confrelid = 'shop_staff'::regclass;
   ```

## What This Fix Does

### Database Changes
- Adds `staff_id` column to `shop_bookings` table if missing
- Synchronizes data between `assigned_staff_id` and `staff_id` 
- Creates proper foreign key relationship using only `staff_id`
- Adds trigger to keep both columns in sync for backward compatibility
- Creates `total_price` as a generated column that aliases `total_amount` for backward compatibility
- Adds `services` JSONB column populated with service_name data for backward compatibility

### Code Changes
- BookingsAPI now sets both `staff_id` and `assigned_staff_id` when creating bookings
- Normalized service accepts both column formats and handles synchronization
- All queries use consistent `staff_id` column names

## Expected Results
- ✅ Booking creation should work without relationship errors
- ✅ Staff information should display correctly in bookings
- ✅ No "more than one relationship" errors in ServiceQueueScreen
- ✅ Backward compatibility maintained for existing code

## Rollback Plan
If issues occur, the changes are non-destructive:
- The `staff_id` column can be dropped if needed
- Original `assigned_staff_id` column remains unchanged
- Trigger can be disabled/dropped without data loss