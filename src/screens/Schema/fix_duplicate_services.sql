-- ===============================================
-- FIX DUPLICATE SERVICES IN SHOP_COMPLETE VIEW
-- ===============================================
-- This script ensures services are properly aggregated without duplicates

-- Drop and recreate the view with proper DISTINCT handling
DROP VIEW IF EXISTS shop_complete CASCADE;

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
  
  -- Services aggregation with proper deduplication
  COALESCE(
    (
      SELECT json_agg(DISTINCT service_obj)
      FROM (
        SELECT jsonb_build_object(
          'id', srv.id,
          'shop_id', srv.shop_id,
          'provider_id', srv.provider_id,
          'name', srv.name,
          'description', srv.description,
          'price', srv.price,
          'duration', srv.duration,
          'category', srv.category,
          'assigned_staff', srv.assigned_staff,
          'location_type', COALESCE(srv.location_type, 'in_house'),
          'is_active', srv.is_active,
          'created_at', srv.created_at,
          'updated_at', srv.updated_at
        ) as service_obj
        FROM shop_services srv
        WHERE srv.shop_id = pb.id
      ) services_subquery
    ),
    '[]'::json
  ) as services,
  
  -- Staff aggregation (keeping existing logic)
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
  
  -- Business hours aggregation
  COALESCE(
    (
      SELECT json_agg(
        jsonb_build_object(
          'id', bh.id,
          'day', bh.day,
          'is_open', bh.is_open,
          'open_time', bh.open_time,
          'close_time', bh.close_time,
          'is_always_open', bh.is_always_open,
          'timezone', COALESCE(bh.timezone, 'Europe/Stockholm'),
          'priority', COALESCE(bh.priority, 0),
          'description', COALESCE(bh.description, ''),
          'is_active', bh.is_active
        )
        ORDER BY bh.day
      )
      FROM shop_business_hours bh
      WHERE bh.shop_id = pb.id
    ),
    '[]'::json
  ) as business_hours,
  
  -- Discounts aggregation
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', sd.id,
        'type', sd.type,
        'value', sd.value,
        'description', sd.description,
        'start_date', sd.start_date,
        'end_date', sd.end_date,
        'is_active', sd.is_active
      )
    ) FILTER (WHERE sd.id IS NOT NULL AND sd.is_active = true),
    '[]'::json
  ) as discounts,
  
  -- Special days aggregation
  COALESCE(
    json_agg(
      DISTINCT jsonb_build_object(
        'id', spd.id,
        'date', spd.date,
        'name', spd.name,
        'description', spd.description,
        'type', spd.type,
        'is_open', spd.is_open,
        'open_time', spd.open_time,
        'close_time', spd.close_time,
        'is_always_open', spd.is_always_open,
        'recurring', spd.recurring,
        'recurring_until', spd.recurring_until,
        'color', spd.color,
        'priority', spd.priority,
        'is_active', spd.is_active
      )
    ) FILTER (WHERE spd.id IS NOT NULL AND spd.is_active = true),
    '[]'::json
  ) as special_days
  
FROM provider_businesses pb
LEFT JOIN shop_staff ss ON pb.id = ss.shop_id AND ss.is_active = true
LEFT JOIN shop_discounts sd ON pb.id = sd.shop_id
LEFT JOIN shop_special_days spd ON pb.id = spd.shop_id
GROUP BY pb.id, pb.provider_id, pb.name, pb.description, pb.category, pb.address, 
         pb.city, pb.state, pb.country, pb.phone, pb.email, pb.website_url, 
         pb.image_url, pb.logo_url, pb.images, pb.business_hours_start, 
         pb.business_hours_end, pb.timezone, pb.advance_booking_days, 
         pb.slot_duration, pb.buffer_time, pb.auto_approval, pb.is_active, 
         pb.is_verified, pb.created_at, pb.updated_at, pb.schedule_id;

-- Add comment
COMMENT ON VIEW shop_complete IS 'Complete shop data with all related services (active and inactive), staff, and schedule information';