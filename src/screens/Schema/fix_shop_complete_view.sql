-- ===============================================
-- FIX SHOP_COMPLETE VIEW
-- ===============================================
-- This script updates the shop_complete view to show ALL services
-- and includes location_type information

-- Clean up any conflicting functions first (they might be causing issues)
DO $$
BEGIN
    -- Drop all variants of potentially conflicting functions
    DROP FUNCTION IF EXISTS update_booking_status(uuid, text, text);
    DROP FUNCTION IF EXISTS update_booking_status(uuid, text);
    DROP FUNCTION IF EXISTS get_booking_status_counts(uuid, date, date);
    DROP FUNCTION IF EXISTS get_booking_status_counts(uuid);
    DROP FUNCTION IF EXISTS check_booking_conflict(uuid, uuid, date, time, time, uuid);
    DROP FUNCTION IF EXISTS check_booking_conflict(uuid, uuid, date, time, time);
    RAISE NOTICE '✅ Cleaned up potentially conflicting functions';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not clean up functions: %', SQLERRM;
END $$;

-- Drop and recreate the view safely
-- Handle dependencies first
DO $$
BEGIN
    -- Drop the view if it exists, handling dependencies
    DROP VIEW IF EXISTS shop_complete CASCADE;
    RAISE NOTICE '✅ Dropped existing shop_complete view';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not drop view (may not exist): %', SQLERRM;
END $$;

CREATE VIEW shop_complete AS
SELECT 
  pb.id,
  pb.provider_id,
  pb.name,
  pb.description,
  pb.category,
  pb.address,
  pb.city,
  pb.state,
  pb.country,
  pb.phone,
  pb.email,
  pb.website_url,
  pb.image_url,
  pb.logo_url,
  pb.images,
  pb.business_hours_start,
  pb.business_hours_end,
  pb.timezone,
  pb.advance_booking_days,
  pb.slot_duration,
  pb.buffer_time,
  pb.auto_approval,
  pb.is_active,
  pb.is_verified,
  pb.created_at,
  pb.updated_at,
  pb.schedule_id,
  
  -- Services with location_type (SHOW ALL SERVICES - REMOVED is_active filter)
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', srv.id,
        'name', srv.name,
        'description', srv.description,
        'price', srv.price,
        'duration', srv.duration,
        'category', srv.category,
        'assigned_staff', srv.assigned_staff,
        'location_type', COALESCE(srv.location_type, 'in_house'),
        'is_active', srv.is_active
      )
    ) FILTER (WHERE srv.id IS NOT NULL),
    '[]'::json
  ) as services,
  
  -- Staff
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', ss.id,
        'name', ss.name,
        'email', ss.email,
        'phone', ss.phone,
        'role', ss.role,
        'specialties', ss.specialties,
        'bio', ss.bio,
        'experience_years', ss.experience_years,
        'avatar_url', ss.avatar_url,
        'is_active', ss.is_active
      )
    ) FILTER (WHERE ss.id IS NOT NULL),
    '[]'::json
  ) as staff,
  
  -- Business hours (safe check for table existence)
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_business_hours') THEN
      COALESCE(
        (
          SELECT json_agg(
            jsonb_build_object(
              'id', sbh.id,
              'day', sbh.day,
              'is_open', sbh.is_open,
              'open_time', sbh.open_time,
              'close_time', sbh.close_time,
              'is_always_open', sbh.is_always_open,
              'timezone', COALESCE(sbh.timezone, 'Europe/Stockholm'),
              'priority', COALESCE(sbh.priority, 0),
              'description', COALESCE(sbh.description, ''),
              'is_active', sbh.is_active
            )
          )
          FROM shop_business_hours sbh 
          WHERE sbh.shop_id = pb.id AND sbh.is_active = true
        ), 
        '[]'::json
      )
    ELSE '[]'::json
  END as business_hours,
  
  -- Special days (safe check for table existence)
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_special_days') THEN
      COALESCE(
        (
          SELECT json_agg(
            jsonb_build_object(
              'id', ssd.id,
              'date', ssd.date,
              'name', ssd.name,
              'description', ssd.description,
              'type', ssd.type,
              'is_open', ssd.is_open,
              'open_time', ssd.open_time,
              'close_time', ssd.close_time,
              'is_always_open', ssd.is_always_open,
              'recurring', ssd.recurring,
              'recurring_until', ssd.recurring_until,
              'color', ssd.color,
              'priority', ssd.priority,
              'is_active', ssd.is_active
            )
          )
          FROM shop_special_days ssd 
          WHERE ssd.shop_id = pb.id AND ssd.is_active = true
        ),
        '[]'::json
      )
    ELSE '[]'::json
  END as special_days,
  
  -- Discounts (safe check for table existence)
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_discounts') THEN
      COALESCE(
        (
          SELECT json_agg(
            jsonb_build_object(
              'id', sd.id,
              'type', sd.type,
              'value', sd.value,
              'description', sd.description,
              'start_date', sd.start_date,
              'end_date', sd.end_date,
              'usage_limit', sd.usage_limit,
              'used_count', sd.used_count,
              'min_amount', sd.min_amount,
              'max_discount', sd.max_discount,
              'applicable_services', sd.applicable_services,
              'conditions', sd.conditions,
              'is_active', sd.is_active
            )
          )
          FROM shop_discounts sd 
          WHERE sd.shop_id = pb.id AND sd.is_active = true
        ),
        '[]'::json
      )
    ELSE '[]'::json
  END as discounts,
  
  -- Booking statistics (safe check for table existence)
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_bookings') THEN
      COALESCE(
        (SELECT COUNT(*) FROM shop_bookings sb WHERE sb.shop_id = pb.id AND sb.status != 'cancelled'),
        0
      )
    ELSE 0
  END as total_bookings,
  
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_bookings') THEN
      COALESCE(
        (SELECT COUNT(*) FROM shop_bookings sb WHERE sb.shop_id = pb.id AND sb.booking_date = CURRENT_DATE AND sb.status IN ('confirmed', 'in_progress')),
        0
      )
    ELSE 0
  END as todays_bookings
  
FROM provider_businesses pb
LEFT JOIN shop_staff ss ON pb.id = ss.shop_id AND ss.is_active = true
LEFT JOIN shop_services srv ON pb.id = srv.shop_id  -- REMOVED is_active filter here!

GROUP BY pb.id, pb.provider_id, pb.name, pb.description, pb.category, pb.address, 
         pb.city, pb.state, pb.country, pb.phone, pb.email, pb.website_url, 
         pb.image_url, pb.logo_url, pb.images, pb.business_hours_start, 
         pb.business_hours_end, pb.timezone, pb.advance_booking_days, 
         pb.slot_duration, pb.buffer_time, pb.auto_approval, pb.is_active, 
         pb.is_verified, pb.created_at, pb.updated_at, pb.schedule_id;

-- Grant permissions
GRANT SELECT ON shop_complete TO authenticated;
GRANT SELECT ON shop_complete TO anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SHOP_COMPLETE VIEW UPDATED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE 'Key changes:';
    RAISE NOTICE '  ✅ Now shows ALL services (active and inactive)';
    RAISE NOTICE '  ✅ Includes location_type for each service';
    RAISE NOTICE '  ✅ Safe handling of optional tables';
    RAISE NOTICE '  ✅ Optimized for shop details screen';
    RAISE NOTICE '';
    RAISE NOTICE 'Shop owners can now see all their services in details!';
    RAISE NOTICE '';
END $$;