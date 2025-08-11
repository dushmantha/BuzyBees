# 🚀 Deployment Sequence Guide

## ⚠️ **IMPORTANT: Deploy in this exact order to avoid conflicts**

### **Step 1: Fix Missing Columns**
```sql
-- Run: fix_shop_staff_missing_columns.sql
-- This adds missing columns to the existing shop_staff table
-- ✅ Fixes the "experience_years column not found" error
```

### **Step 2: Drop Conflicting Functions**
```sql
-- Run: fix_function_conflicts.sql  
-- This drops existing functions that have parameter conflicts
-- ✅ Fixes the "cannot remove parameter defaults" error
```

### **Step 3: Deploy Shop CRUD Functions**
```sql
-- Run: comprehensive_shop_crud_functions.sql
-- This recreates the shop management functions with correct parameters
-- ✅ Provides complete shop creation and update functionality
```

### **Step 4: Deploy Optimized Booking Schema**
```sql
-- Run: optimized_booking_schema_readonly.sql
-- This creates the new booking system without modifying existing tables
-- ✅ Adds enhanced booking functionality with real-time updates
```

## 📋 **Detailed Steps:**

### **1️⃣ Fix Shop Staff Table**
Copy the contents of `fix_shop_staff_missing_columns.sql` into Supabase SQL Editor and run it.

**Expected Output:**
```
✅ SUCCESS: All missing columns added and working!
🎉 shop_staff table updated with missing columns!
```

### **2️⃣ Drop Conflicting Functions**
Copy the contents of `fix_function_conflicts.sql` into Supabase SQL Editor and run it.

**Expected Output:**
```
Functions with parameter conflicts have been dropped!
```

### **3️⃣ Deploy Shop CRUD**
Copy the contents of `comprehensive_shop_crud_functions.sql` into Supabase SQL Editor and run it.

**Expected Output:**
```
Shop management functions created successfully!
```

### **4️⃣ Deploy Booking System**
Copy the contents of `optimized_booking_schema_readonly.sql` into Supabase SQL Editor and run it.

**Expected Output:**
```
✅ READ-ONLY Optimized booking schema created successfully!
📋 New tables created:
   - shop_bookings (main booking table)
   - booking_services (services junction)
   - booking_service_options (options junction)
   - booking_applied_discounts (discounts junction)
🔗 Existing tables referenced (NOT MODIFIED):
   - shop_services, service_options, shop_staff, shop_discounts
🚀 Ready for production use!
```

## ✅ **After Successful Deployment:**

### **Your Staff Management Will Work:**
- ✅ Add staff with experience years
- ✅ Set work schedules via UI
- ✅ Manage leave dates with calendar
- ✅ All existing functionality preserved

### **Your Enhanced Booking System Will Be Ready:**
- ✅ Multiple services per booking
- ✅ Service options (add-ons, variants)
- ✅ Discount application
- ✅ Real-time notifications
- ✅ Role-based data access
- ✅ Automatic calculations
- ✅ Backward compatibility

### **No Existing Data Lost:**
- ✅ All current shops, staff, services preserved
- ✅ All existing bookings continue to work
- ✅ Current app functionality unaffected
- ✅ Only new capabilities added

## 🔧 **Troubleshooting:**

If you encounter any errors during deployment:

1. **Function conflicts:** Re-run step 2 (fix_function_conflicts.sql)
2. **Column errors:** Re-run step 1 (fix_shop_staff_missing_columns.sql)
3. **Permission errors:** Check that you're running as a superuser in Supabase
4. **Table errors:** The schema is designed to be safe - existing tables won't be modified

## 📞 **Need Help?**

If you encounter issues:
1. Copy the exact error message
2. Note which step you were on
3. Check the Supabase logs for more details

The deployment is designed to be **safe and reversible** - no existing data will be lost.