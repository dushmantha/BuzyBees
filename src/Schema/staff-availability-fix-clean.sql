-- ===============================================
-- STAFF AVAILABILITY DATABASE FIX - CLEAN VERSION
-- ===============================================
-- This migration adds staff scheduling to the database
-- 
-- IMPORTANT: Run this entire SQL block in Supabase SQL Editor

-- ===============================================
-- STEP 1: ADD COLUMNS TO SHOP_STAFF TABLE
-- ===============================================

-- Add work schedule and leave dates columns to shop_staff table
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

ALTER TABLE shop_staff 
ADD COLUMN IF NOT EXISTS leave_dates JSONB DEFAULT '[]'::jsonb;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shop_staff_work_schedule ON shop_staff USING GIN (work_schedule);
CREATE INDEX IF NOT EXISTS idx_shop_staff_leave_dates ON shop_staff USING GIN (leave_dates);

-- Update existing staff records with default schedules (Monday-Friday working)
UPDATE shop_staff 
SET 
    work_schedule = '{
        "monday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
        "tuesday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
        "wednesday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
        "thursday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
        "friday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
        "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
    }'::jsonb,
    leave_dates = '[]'::jsonb
WHERE work_schedule IS NULL OR leave_dates IS NULL;

-- ===============================================
-- STEP 2: UPDATE SHOP_COMPLETE VIEW
-- ===============================================

-- Drop the existing view
DROP VIEW IF EXISTS shop_complete CASCADE;

-- Recreate the view with ONLY the essential fields to avoid column errors
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
  pb.created_at,
  pb.updated_at,
  pb.advance_booking_days,
  pb.slot_duration,
  pb.buffer_time,
  pb.auto_approval,
  
  -- CRITICAL: Staff data with work_schedule and leave_dates
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
        'work_schedule', ss.work_schedule,  -- ⭐ CRITICAL NEW FIELD
        'leave_dates', ss.leave_dates,      -- ⭐ CRITICAL NEW FIELD
        'created_at', ss.created_at,
        'updated_at', ss.updated_at
      )
    ) FROM shop_staff ss WHERE ss.shop_id = pb.id),
    '[]'::json
  ) as staff,
  
  -- Services data
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
        'is_active', srv.is_active,
        'created_at', srv.created_at,
        'updated_at', srv.updated_at
      )
    ) FROM shop_services srv WHERE srv.shop_id = pb.id),
    '[]'::json
  ) as services,
  
  -- Business hours data (if table exists)
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', bh.id,
        'shop_id', bh.shop_id,
        'day', bh.day,
        'is_open', bh.is_open,
        'open_time', bh.open_time,
        'close_time', bh.close_time
      )
    ) FROM shop_business_hours bh WHERE bh.shop_id = pb.id),
    '[]'::json
  ) as business_hours
  
FROM provider_businesses pb
WHERE pb.is_active = true;

-- Grant permissions
GRANT SELECT ON shop_complete TO authenticated;
GRANT SELECT ON shop_complete TO anon;

-- ===============================================
-- VERIFICATION
-- ===============================================

-- Verify the migration worked
DO $$
DECLARE
    staff_count INTEGER;
    staff_with_schedule INTEGER;
    staff_with_leaves INTEGER;
BEGIN
    SELECT COUNT(*) INTO staff_count FROM shop_staff;
    SELECT COUNT(*) INTO staff_with_schedule FROM shop_staff WHERE work_schedule IS NOT NULL;
    SELECT COUNT(*) INTO staff_with_leaves FROM shop_staff WHERE leave_dates IS NOT NULL;
    
    RAISE NOTICE '✅ STAFF AVAILABILITY FIX COMPLETED';
    RAISE NOTICE '📊 Total staff records: %', staff_count;
    RAISE NOTICE '📅 Staff with work schedules: %', staff_with_schedule;
    RAISE NOTICE '🏖️ Staff with leave dates: %', staff_with_leaves;
    
    IF staff_with_schedule > 0 AND staff_with_leaves > 0 THEN
        RAISE NOTICE '🎉 SUCCESS: Staff scheduling data has been added!';
        RAISE NOTICE '🔄 You can now refresh your app to see staff availability in the calendar';
    ELSE
        RAISE NOTICE '⚠️ WARNING: No staff records found or migration failed';
    END IF;
END $$;

-- Show sample staff data to verify
SELECT 
    name,
    work_schedule,
    leave_dates,
    is_active
FROM shop_staff 
LIMIT 3;