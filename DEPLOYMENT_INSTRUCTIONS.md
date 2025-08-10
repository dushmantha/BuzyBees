# Shop Management System Deployment Instructions

## Overview
Your comprehensive shop CRUD functions have been created and are ready for deployment. Due to Supabase configuration issues in the local environment, please deploy manually.

## Files Created
1. `comprehensive_shop_crud_functions.sql` - Complete CRUD functions
2. `deploy_shop_functions.sql` - Deployment script
3. Schema files in `sql-schema/` folder

## Manual Deployment Steps

### Step 1: Deploy Schemas First
Go to your Supabase dashboard → SQL Editor and run these files in order:

1. `sql-schema/provider_businesses_complete_schema.sql`
2. `sql-schema/shop_staff_minimal_schema.sql`
3. `sql-schema/shop_services_minimal_schema.sql` 
4. `sql-schema/shop_discounts_minimal_schema.sql`
5. `sql-schema/service_options_fixed_schema.sql`

### Step 2: Deploy CRUD Functions
Run the complete `comprehensive_shop_crud_functions.sql` file in Supabase SQL Editor.

## Available Functions After Deployment

### 1. Create Complete Shop
```sql
SELECT * FROM buzybees_create_complete_shop(
    p_provider_id := 'your-provider-uuid',
    p_name := 'Your Shop Name',
    p_description := 'Shop description',
    p_phone := '+46 70 123 4567',
    p_email := 'info@yourshop.se'
);
```

### 2. Update Shop
```sql
SELECT * FROM buzybees_update_complete_shop(
    p_shop_id := 'shop-uuid',
    p_provider_id := 'provider-uuid',
    p_name := 'Updated Name',
    p_phone := 'New Phone'
);
```

### 3. Add Staff
```sql
SELECT * FROM buzybees_add_staff_to_shop(
    p_shop_id := 'shop-uuid',
    p_provider_id := 'provider-uuid', 
    p_name := 'Staff Name',
    p_email := 'staff@email.com',
    p_role := 'Barber'
);
```

### 4. Add Service with Options
```sql
SELECT * FROM buzybees_add_service_to_shop(
    p_shop_id := 'shop-uuid',
    p_provider_id := 'provider-uuid',
    p_name := 'Haircut Service',
    p_description := 'Professional haircut',
    p_price := 35.00,
    p_duration := 45,
    p_service_options := '[
        {"option_name": "Basic Cut", "price": 25.00, "duration": 30},
        {"option_name": "Premium Cut", "price": 45.00, "duration": 60}
    ]'::jsonb
);
```

### 5. Add Discount
```sql
SELECT * FROM buzybees_add_discount_to_shop(
    p_shop_id := 'shop-uuid',
    p_provider_id := 'provider-uuid',
    p_type := 'percentage',
    p_value := 20.00,
    p_description := '20% off first visit',
    p_start_date := CURRENT_DATE,
    p_end_date := CURRENT_DATE + INTERVAL '30 days'
);
```

### 6. Get Complete Shop Data
```sql
-- Owner view (all data)
SELECT * FROM buzybees_get_complete_shop_data(
    p_shop_id := 'shop-uuid',
    p_provider_id := 'provider-uuid'
);

-- Public view (active data only)
SELECT * FROM buzybees_get_complete_shop_data(
    p_shop_id := 'shop-uuid'
);
```

### 7. Sync Arrays
```sql
SELECT * FROM buzybees_sync_all_shop_arrays('shop-uuid');
```

## Key Features Implemented

✅ **Complete Shop Creation** - Creates shop with automatic related records  
✅ **Partial Updates** - Only updates provided fields  
✅ **Staff Management** - Adds staff and syncs arrays  
✅ **Service Management** - Handles services with options mapping  
✅ **Discount Management** - Full discount functionality  
✅ **Data Retrieval** - Owner/public views with proper access control  
✅ **Array Synchronization** - Keeps UUID arrays in sync  
✅ **Service Options Mapping** - Properly links options to services  
✅ **Error Handling** - Comprehensive error management  
✅ **Permissions** - Proper RLS and role-based access  

## Database Structure

- **provider_businesses**: Main shop table with UUID arrays
- **shop_staff**: Staff with work_schedule and leave_dates
- **shop_services**: Services with service_options_ids array  
- **shop_discounts**: Discounts with applicable_services array
- **service_options**: Linked to services via service_id

All tables are properly normalized and linked via UUID arrays for optimal performance.