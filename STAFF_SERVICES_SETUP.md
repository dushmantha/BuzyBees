# Staff and Services JSONB Setup Guide

## Problem Diagnosis
The staff and services are not showing because the `provider_businesses` table's JSONB columns (`staff` and `services`) are empty. These need to be populated with the IDs of existing staff and services.

## Quick Fix - Run This SQL in Supabase Dashboard

```sql
-- Update all provider_businesses with their associated staff IDs
UPDATE provider_businesses pb
SET staff = (
    SELECT COALESCE(json_agg(ss.id), '[]'::json)
    FROM shop_staff ss
    WHERE ss.shop_id = pb.id
    AND ss.is_active = true
)
WHERE EXISTS (
    SELECT 1 FROM shop_staff WHERE shop_id = pb.id
);

-- Update all provider_businesses with their associated service IDs  
UPDATE provider_businesses pb
SET services = (
    SELECT COALESCE(json_agg(s.id), '[]'::json)
    FROM shop_services s
    WHERE s.shop_id = pb.id
    AND s.is_active = true
)
WHERE EXISTS (
    SELECT 1 FROM shop_services WHERE shop_id = pb.id
);
```

## Verify the Update

After running the above SQL, verify with:

```sql
SELECT 
    pb.id,
    pb.name,
    pb.staff,
    pb.services,
    (SELECT COUNT(*) FROM shop_staff WHERE shop_id = pb.id AND is_active = true) as staff_count,
    (SELECT COUNT(*) FROM shop_services WHERE shop_id = pb.id AND is_active = true) as service_count
FROM provider_businesses pb
ORDER BY pb.created_at DESC;
```

## Code Changes Made

### 1. Fixed Table Names in ServiceDetailScreen.tsx
- Changed `from('staff')` to `from('shop_staff')` 
- Changed `from('services')` to `from('shop_services')`

### 2. Added JSONB Management in normalized.ts
- `createStaff()` - Adds staff ID to provider_businesses.staff array
- `deleteStaff()` - Removes staff ID from provider_businesses.staff array  
- `createService()` - Adds service ID to provider_businesses.services array
- `deleteService()` - Removes service ID from provider_businesses.services array
- `createShop()` - Populates initial staff and service IDs
- `updateShop()` - Updates staff and service IDs based on current state

### 3. Enhanced Debugging
Added detailed console logging to track:
- Provider business data fetching
- JSONB array contents and types
- Staff and service ID population

## Testing Steps

1. **Run the SQL script above** in Supabase dashboard to populate existing data
2. **Reload the app** - Staff and services should now appear
3. **Test CRUD operations**:
   - Add a new staff member via provider screen
   - Check if staff ID is added to provider_businesses.staff
   - Delete a staff member
   - Check if staff ID is removed from provider_businesses.staff
   - Same for services

## Data Flow

```
Provider Side:
Create/Update Shop → Save IDs to JSONB → provider_businesses.staff/services

User Side:
ServiceDetailScreen → Read JSONB IDs → Fetch full details → Display
```

## Troubleshooting

If staff/services still don't show:
1. Check browser console for debug logs
2. Verify JSONB columns have data: `SELECT staff, services FROM provider_businesses WHERE id = 'YOUR_SHOP_ID';`
3. Verify shop_staff and shop_services tables have data
4. Check if is_active = true for staff and services