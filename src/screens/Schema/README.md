# 🎯 BuzyBees Database Schema

## **📁 Current Files**

### **Main Setup Files**
1. **`buzybees_complete_setup.sql`** - Main setup file but outdated
2. **`buzybees_normalized_schema.sql`** - Normalized schema but lacks recent features
3. **`storage_setup_user_safe.sql`** - Storage setup for image buckets

### **Migration Files (Recent Features)**
4. **`complete_business_hours_migration.sql`** - Business hours migration
5. **`add_service_location_type.sql`** - Recent location type feature
6. **`fix_booking_functions.sql`** - Recent booking functions
7. **`fix_shop_complete_view.sql`** - Recent view fix

### **Documentation**
8. **`README.md`** - This documentation file

## **🚀 Setup Instructions**

### **For New Databases:**

#### Step 1: Base Schema
```sql
-- Run buzybees_normalized_schema.sql first
-- This creates the core database structure
```

#### Step 2: Storage Setup
```sql
-- Run storage_setup_user_safe.sql
-- This sets up image storage buckets
```

#### Step 3: Apply Recent Features
```sql
-- Run the migration files in order:
-- 1. complete_business_hours_migration.sql
-- 2. add_service_location_type.sql  
-- 3. fix_booking_functions.sql
-- 4. fix_shop_complete_view.sql
```

### **For Existing Databases (Apply Recent Features):**

#### If you need business hours support:
```sql
-- Run complete_business_hours_migration.sql
```

#### If you get "column location_type does not exist" error:
```sql
-- Run add_service_location_type.sql
```

#### If you get booking function errors:
```sql
-- Run fix_booking_functions.sql
```

#### If shop details only shows active services:
```sql
-- Run fix_shop_complete_view.sql
```

### **Verify Setup:**
```sql
-- Check that all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check that location_type column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'shop_services' AND column_name = 'location_type';

-- Check that functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('check_booking_conflict', 'update_booking_status', 'get_booking_status_counts');
```

## **✅ Features by File**

### **buzybees_normalized_schema.sql**
- ✅ **Core System** - Users, businesses, staff, services
- ✅ **Booking System** - Basic booking structure
- ✅ **Row Level Security** - Basic RLS policies
- ❌ **Missing:** Business hours, location types, booking functions

### **complete_business_hours_migration.sql**
- ✅ **Detailed Business Hours** - Day-by-day scheduling
- ✅ **Special Days** - Holidays and custom hours
- ✅ **Timezone Support** - Multi-timezone businesses

### **add_service_location_type.sql**
- ✅ **Service Location Types** - In-house vs on-location services
- ✅ **Performance Index** - Optimized location queries

### **fix_booking_functions.sql**
- ✅ **Booking Conflict Detection** - Prevents double bookings
- ✅ **Status Management** - Safe booking status updates
- ✅ **Statistics Functions** - Dashboard data

### **fix_shop_complete_view.sql**
- ✅ **Complete Service View** - Shows ALL services (active + inactive)
- ✅ **Location Type Integration** - Includes service location info
- ✅ **Shop Owner Visibility** - Full inventory management

## **📊 Database Structure**

### **Main Tables**
1. **`users`** - User profiles and authentication
2. **`provider_businesses`** - Shop/business information
3. **`shop_staff`** - Staff members (normalized)
4. **`shop_services`** - Services with location types (normalized)
5. **`shop_business_hours`** - Detailed business hours *(added by migration)*
6. **`shop_special_days`** - Holidays and special dates *(added by migration)*
7. **`shop_bookings`** - Complete booking system

### **Key Views**
- **`shop_complete`** - Comprehensive shop data with all relationships

### **Important Functions**
- **`check_booking_conflict()`** - Prevents double bookings
- **`update_booking_status()`** - Manages booking status changes
- **`get_booking_status_counts()`** - Dashboard statistics

## **🔧 Service Location Types**

Services now support location types:
- **`in_house`** - Client comes to the shop (salon, barbershop, etc.)
- **`on_location`** - Provider goes to client location (cleaning, lawnmowing, etc.)

## **📅 Booking Status Flow**

```
pending → confirmed → in_progress → completed
    ↓         ↓           ↓
cancelled  cancelled   cancelled
    ↓         ↓           ↓
no_show    no_show     no_show
```

## **🛡️ Security**

- **Row Level Security (RLS)** enabled on all tables
- **Provider Isolation** - Providers can only access their own data
- **Public Read Access** - Active businesses/services visible to customers
- **Storage Policies** - Secure image upload/access controls

## **⚡ Performance**

- **Indexes** on frequently queried columns
- **Optimized Views** with proper joins
- **Efficient Queries** using database functions
- **Location Type Index** for fast service filtering

## **🔄 Recent Updates**

### **Latest Features Added**
- ✅ Service location types (in-house/on-location)
- ✅ Complete booking system with all status management
- ✅ Enhanced shop_complete view showing all services
- ✅ Comprehensive business hours support
- ✅ Booking conflict detection and prevention
- ✅ Database functions for status management

### **Key Fixes**
- ✅ Shop details now shows ALL services (not just active)
- ✅ Added location type to distinguish service types
- ✅ Fixed booking functions for queue management
- ✅ Enhanced view with location information

## **🎯 Result**

Your BuzyBees database supports:
- **Full-featured booking system** with real-time status management
- **Service location awareness** for in-house vs on-location services
- **Comprehensive business management** with staff, services, and schedules
- **Complete service visibility** for shop owners

**🚀 Ready for advanced booking experiences!**