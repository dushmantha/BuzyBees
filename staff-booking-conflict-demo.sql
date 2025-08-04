-- ===============================================
-- STAFF BOOKING CONFLICT DEMONSTRATION
-- ===============================================
-- This creates test bookings to demonstrate the conflict prevention system
-- 
-- COPY THIS ENTIRE SQL AND RUN IN SUPABASE SQL EDITOR

-- First, ensure we have the basic staff availability setup
-- (Make sure to run staff-database-setup-final.sql first)

-- Step 1: Add some test bookings for demonstration
-- This will show how booked time slots become unavailable

-- Get the first staff member and shop for demo
WITH first_staff AS (
  SELECT id, shop_id, provider_id 
  FROM shop_staff 
  WHERE is_active = true 
  LIMIT 1
),
first_service AS (
  SELECT id
  FROM shop_services 
  WHERE is_active = true 
  LIMIT 1
)
INSERT INTO shop_bookings (
  shop_id,
  service_id,
  provider_id,
  assigned_staff_id,
  customer_name,
  customer_phone,
  customer_email,
  booking_date,
  start_time,
  end_time,
  duration_minutes,
  service_price,
  total_amount,
  status,
  booking_type,
  notes,
  internal_notes,
  timezone
)
SELECT 
  fs.shop_id,
  fserv.id,
  fs.provider_id,
  fs.id,
  'John Smith',
  '+1234567890',
  'john@example.com',
  '2025-08-05', -- Tomorrow
  '10:00',
  '11:00',
  60,
  100.00,
  100.00,
  'confirmed',
  'quick',
  'Demo booking for conflict testing',
  'Test booking created to demonstrate conflict prevention',
  'Europe/Stockholm'
FROM first_staff fs, first_service fserv
WHERE NOT EXISTS (
  SELECT 1 FROM shop_bookings 
  WHERE booking_date = '2025-08-05' 
  AND start_time = '10:00'
);

-- Add another booking for the same staff member
WITH first_staff AS (
  SELECT id, shop_id, provider_id 
  FROM shop_staff 
  WHERE is_active = true 
  LIMIT 1
),
first_service AS (
  SELECT id
  FROM shop_services 
  WHERE is_active = true 
  LIMIT 1
)
INSERT INTO shop_bookings (
  shop_id,
  service_id,
  provider_id,
  assigned_staff_id,
  customer_name,
  customer_phone,
  customer_email,
  booking_date,
  start_time,
  end_time,
  duration_minutes,
  service_price,
  total_amount,
  status,
  booking_type,
  notes,
  internal_notes,
  timezone
)
SELECT 
  fs.shop_id,
  fserv.id,
  fs.provider_id,
  fs.id,
  'Jane Doe',
  '+1234567891',
  'jane@example.com',
  '2025-08-05', -- Same day
  '14:00',
  '15:30',
  90,
  150.00,
  150.00,
  'confirmed',
  'quick',
  'Another demo booking',
  'Second test booking for conflict demonstration',
  'Europe/Stockholm'
FROM first_staff fs, first_service fserv
WHERE NOT EXISTS (
  SELECT 1 FROM shop_bookings 
  WHERE booking_date = '2025-08-05' 
  AND start_time = '14:00'
);

-- Add a booking for tomorrow as well
WITH first_staff AS (
  SELECT id, shop_id, provider_id 
  FROM shop_staff 
  WHERE is_active = true 
  LIMIT 1
),
first_service AS (
  SELECT id
  FROM shop_services 
  WHERE is_active = true 
  LIMIT 1
)
INSERT INTO shop_bookings (
  shop_id,
  service_id,
  provider_id,
  assigned_staff_id,
  customer_name,
  customer_phone,
  customer_email,
  booking_date,
  start_time,
  end_time,
  duration_minutes,
  service_price,
  total_amount,
  status,
  booking_type,
  notes,
  internal_notes,
  timezone
)
SELECT 
  fs.shop_id,
  fserv.id,
  fs.provider_id,
  fs.id,
  'Bob Wilson',
  '+1234567892',
  'bob@example.com',
  '2025-08-06', -- Day after tomorrow
  '09:00',
  '10:00',
  60,
  100.00,
  100.00,
  'pending',
  'quick',
  'Pending booking demo',
  'Test pending booking to show conflict checking',
  'Europe/Stockholm'
FROM first_staff fs, first_service fserv
WHERE NOT EXISTS (
  SELECT 1 FROM shop_bookings 
  WHERE booking_date = '2025-08-06' 
  AND start_time = '09:00'
);

-- Verification query to see the test bookings
SELECT 
  sb.booking_date,
  sb.start_time,
  sb.end_time,
  sb.customer_name,
  sb.status,
  ss.name as staff_name
FROM shop_bookings sb
JOIN shop_staff ss ON sb.assigned_staff_id = ss.id
WHERE sb.booking_date >= CURRENT_DATE
ORDER BY sb.booking_date, sb.start_time;

-- Show what this demonstrates:
SELECT 
  '🎯 BOOKING CONFLICT DEMONSTRATION' as info,
  'After running this SQL, you will see:' as description
UNION ALL
SELECT 
  '1. Staff Bookings', 'Existing bookings for specific time slots'
UNION ALL
SELECT 
  '2. Time Slot Conflicts', 'Booked time slots will be unavailable for new bookings'
UNION ALL
SELECT 
  '3. Calendar Colors', 'Dates with many bookings may show as fully booked (yellow/orange)'
UNION ALL
SELECT 
  '4. Real-time Checking', 'App will fetch real booking data and prevent double-booking'
UNION ALL
SELECT 
  '📱 Test Instructions', 'Select the staff member with bookings and check Aug 5-6 availability';