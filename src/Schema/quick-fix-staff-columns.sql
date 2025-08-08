-- ===============================================
-- QUICK FIX: Add missing staff columns
-- ===============================================
-- Run this in your Supabase SQL Editor to fix the error

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

-- Verify the columns were added
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'shop_staff' 
AND column_name IN ('work_schedule', 'leave_dates')
ORDER BY column_name;

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

-- Show success message
SELECT 'Success! Columns added and existing records updated.' as status;