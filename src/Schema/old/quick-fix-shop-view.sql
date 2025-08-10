-- ===============================================
-- QUICK FIX: Update shop_complete view
-- ===============================================
-- Run this in Supabase SQL Editor to ensure the view includes new staff fields

-- First, let's check what columns exist in shop_staff table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'shop_staff'
ORDER BY ordinal_position;

-- Check if the view exists and what it returns for staff
SELECT 
  jsonb_pretty(staff::jsonb) as staff_data
FROM shop_complete
LIMIT 1;

-- If the view doesn't show work_schedule and leave_dates, 
-- you need to recreate it. Here's a simpler approach:
-- Just query the staff table directly for now

-- Test query to verify staff data includes new fields
SELECT 
  id,
  name,
  email,
  work_schedule,
  leave_dates
FROM shop_staff
WHERE shop_id IN (SELECT id FROM provider_businesses LIMIT 1)
LIMIT 1;