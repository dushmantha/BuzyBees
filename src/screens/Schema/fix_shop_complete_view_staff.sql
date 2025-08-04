-- ===============================================
-- FIX SHOP_COMPLETE VIEW TO INCLUDE NEW STAFF FIELDS
-- ===============================================
-- This updates the shop_complete view to include work_schedule and leave_dates

-- Drop the existing view
DROP VIEW IF EXISTS shop_complete CASCADE;

-- Recreate the view with updated staff fields
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
  pb.postal_code,
  pb.phone,
  pb.email,
  pb.website_url,
  pb.image_url,
  pb.logo_url,
  pb.category,
  pb.sub_category,
  pb.tags,
  pb.is_active,
  pb.is_verified,
  pb.created_at,
  pb.updated_at,
  pb.timezone,
  pb.currency,
  pb.language,
  pb.booking_buffer_time,
  pb.cancellation_policy_hours,
  pb.advance_booking_days,
  pb.operating_since,
  pb.registration_number,
  pb.tax_id,
  pb.insurance_info,
  pb.certifications,
  pb.amenities,
  pb.payment_methods,
  pb.social_media,
  pb.custom_fields,
  pb.seo_keywords,
  pb.seo_description,
  pb.average_service_rating,
  pb.total_reviews,
  pb.total_bookings,
  pb.completion_rate,
  pb.response_time_hours,
  pb.profile_views,
  pb.favorite_count,
  pb.repeat_customer_rate,
  pb.no_show_rate,
  pb.latitude,
  pb.longitude,
  pb.service_area_radius,
  pb.slot_duration,
  pb.buffer_time,
  pb.auto_approval,
  
  -- Aggregate related data
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
  
  -- Add images array (if you have shop_images table)
  COALESCE(pb.images, '[]'::jsonb) as images
  
FROM provider_businesses pb
WHERE pb.is_active = true;

-- Grant appropriate permissions
GRANT SELECT ON shop_complete TO authenticated;
GRANT SELECT ON shop_complete TO anon;

-- Verify the view includes the new fields
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'shop_complete'
AND column_name = 'staff'
LIMIT 1;