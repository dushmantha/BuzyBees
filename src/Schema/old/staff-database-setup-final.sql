-- ===============================================
-- FINAL STAFF AVAILABILITY DATABASE SETUP
-- ===============================================
-- This will enable staff leave dates and schedules in your calendar
-- 
-- COPY THIS ENTIRE SQL AND RUN IN SUPABASE SQL EDITOR

-- Step 1: Add the required columns to shop_staff table
ALTER TABLE shop_staff 
ADD COLUMN IF NOT EXISTS work_schedule JSONB DEFAULT '{
  "monday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
  "tuesday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
  "wednesday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
  "thursday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
  "friday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
  "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
  "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
}'::jsonb;

ALTER TABLE shop_staff 
ADD COLUMN IF NOT EXISTS leave_dates JSONB DEFAULT '[]'::jsonb;

-- Step 2: Initialize existing staff with default data
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

-- Step 3: Update the shop_complete view to include these fields
DROP VIEW IF EXISTS shop_complete CASCADE;

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
  
  -- Staff with scheduling data
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
        'work_schedule', ss.work_schedule,
        'leave_dates', ss.leave_dates,
        'created_at', ss.created_at,
        'updated_at', ss.updated_at
      )
    ) FROM shop_staff ss WHERE ss.shop_id = pb.id),
    '[]'::json
  ) as staff,
  
  -- Services
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
  ) as services
  
FROM provider_businesses pb
WHERE pb.is_active = true;

-- Grant permissions
GRANT SELECT ON shop_complete TO authenticated;
GRANT SELECT ON shop_complete TO anon;

-- Step 4: Add some test leave dates to see it working
-- This adds leave dates to the first staff member for testing
UPDATE shop_staff 
SET leave_dates = '[
  {
    "type": "leave",
    "title": "Summer Vacation", 
    "startDate": "2025-08-18",
    "endDate": "2025-08-22"
  },
  {
    "type": "leave",
    "title": "Personal Day",
    "startDate": "2025-08-25",
    "endDate": "2025-08-25"
  }
]'::jsonb
WHERE id = (SELECT id FROM shop_staff LIMIT 1);

-- Verification
SELECT 
  name,
  work_schedule,
  leave_dates
FROM shop_staff 
LIMIT 2;