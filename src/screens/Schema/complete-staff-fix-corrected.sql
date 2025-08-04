-- ===============================================
-- COMPLETE STAFF SCHEDULE FIX - CORRECTED VERSION
-- ===============================================
-- Run this entire script in your Supabase SQL Editor to fix all staff-related issues

-- ===============================================
-- STEP 1: Add missing columns to shop_staff table
-- ===============================================

-- Add work_schedule column if it doesn't exist
ALTER TABLE shop_staff 
ADD COLUMN IF NOT EXISTS work_schedule JSONB DEFAULT '{
  "monday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
  "tuesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
  "wednesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
  "thursday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
  "friday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
  "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
  "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
}'::jsonb;

-- Add leave_dates column if it doesn't exist
ALTER TABLE shop_staff 
ADD COLUMN IF NOT EXISTS leave_dates JSONB DEFAULT '[]'::jsonb;

-- Update any existing staff records that have NULL values
UPDATE shop_staff 
SET 
  work_schedule = COALESCE(work_schedule, '{
    "monday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
    "tuesday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
    "wednesday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
    "thursday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
    "friday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
    "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
    "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
  }'::jsonb),
  leave_dates = COALESCE(leave_dates, '[]'::jsonb)
WHERE work_schedule IS NULL OR leave_dates IS NULL;

-- ===============================================
-- STEP 2: Check what columns actually exist in provider_businesses
-- ===============================================

-- First, let's see what columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'provider_businesses' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ===============================================
-- STEP 3: Update shop_complete view with only existing columns
-- ===============================================

-- Drop the existing view
DROP VIEW IF EXISTS shop_complete CASCADE;

-- Recreate the view with minimal columns (only the ones that definitely exist)
CREATE OR REPLACE VIEW shop_complete AS
SELECT 
  pb.id,
  pb.provider_id,
  pb.name,
  pb.description,
  pb.address,
  pb.city,
  pb.state,
  pb.country,
  pb.phone,
  pb.email,
  pb.website_url,
  pb.image_url,
  pb.logo_url,
  pb.category,
  pb.is_active,
  pb.is_verified,
  pb.created_at,
  pb.updated_at,
  
  -- Updated staff aggregation with new fields
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', ss.id,
        'shop_id', ss.shop_id,
        'provider_id', ss.provider_id,
        'name', ss.name,
        'email', ss.email,
        'phone', ss.phone,
        'role', ss.role,
        'specialties', ss.specialties,
        'bio', ss.bio,
        'experience_years', ss.experience_years,
        'avatar_url', ss.avatar_url,
        'is_active', ss.is_active,
        'work_schedule', ss.work_schedule,  -- NEW FIELD
        'leave_dates', ss.leave_dates,      -- NEW FIELD
        'created_at', ss.created_at,
        'updated_at', ss.updated_at
      )
    ) FROM shop_staff ss WHERE ss.shop_id = pb.id),
    '[]'::json
  ) as staff,
  
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', srv.id,
        'shop_id', srv.shop_id,
        'provider_id', srv.provider_id,
        'name', srv.name,
        'description', srv.description,
        'price', srv.price,
        'duration', srv.duration,
        'category', srv.category,
        'assigned_staff', srv.assigned_staff,
        'location_type', srv.location_type,
        'is_active', srv.is_active,
        'created_at', srv.created_at,
        'updated_at', srv.updated_at
      )
    ) FROM shop_services srv WHERE srv.shop_id = pb.id),
    '[]'::json
  ) as services,
  
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', bh.id,
        'shop_id', bh.shop_id,
        'day', bh.day,
        'is_open', bh.is_open,
        'open_time', bh.open_time,
        'close_time', bh.close_time,
        'is_always_open', bh.is_always_open
      )
    ) FROM shop_business_hours bh WHERE bh.shop_id = pb.id),
    '[]'::json
  ) as business_hours,
  
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', sd.id,
        'shop_id', sd.shop_id,
        'provider_id', sd.provider_id,
        'date', sd.date,
        'name', sd.name,
        'type', sd.type,
        'is_open', sd.is_open,
        'open_time', sd.open_time,
        'close_time', sd.close_time,
        'description', sd.description,
        'recurring', sd.recurring,
        'created_at', sd.created_at
      )
    ) FROM shop_special_days sd WHERE sd.shop_id = pb.id),
    '[]'::json
  ) as special_days,
  
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', d.id,
        'shop_id', d.shop_id,
        'provider_id', d.provider_id,
        'code', d.code,
        'description', d.description,
        'discount_type', d.discount_type,
        'discount_value', d.discount_value,
        'min_purchase', d.min_purchase,
        'max_discount', d.max_discount,
        'start_date', d.start_date,
        'end_date', d.end_date,
        'is_active', d.is_active,
        'used_count', d.used_count,
        'max_uses', d.max_uses,
        'created_at', d.created_at
      )
    ) FROM shop_discounts d WHERE d.shop_id = pb.id),
    '[]'::json
  ) as discounts,
  
  -- Add images array (if column exists)
  COALESCE(
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'provider_businesses' 
        AND column_name = 'images'
      ) 
      THEN pb.images 
      ELSE '[]'::jsonb 
    END, 
    '[]'::jsonb
  ) as images
  
FROM provider_businesses pb
WHERE pb.is_active = true;

-- ===============================================
-- STEP 4: Grant appropriate permissions
-- ===============================================
GRANT SELECT ON shop_complete TO authenticated;
GRANT SELECT ON shop_complete TO anon;

-- ===============================================
-- STEP 5: Test the fix
-- ===============================================

-- Verify the columns were added to shop_staff
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'shop_staff' 
AND column_name IN ('work_schedule', 'leave_dates')
ORDER BY column_name;

-- Test the view includes the new fields
SELECT 
  name,
  jsonb_pretty(staff::jsonb) as staff_data
FROM shop_complete
WHERE staff != '[]'::json
LIMIT 1;

-- Show success message
SELECT 'SUCCESS! Staff schedule fix completed. New fields are now available in both shop_staff table and shop_complete view.' as status;