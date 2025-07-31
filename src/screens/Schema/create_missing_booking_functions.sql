-- ===============================================
-- CREATE MISSING BOOKING FUNCTIONS
-- ===============================================
-- This script ensures all booking functions exist and are properly configured

-- Drop any existing versions first to avoid conflicts
DROP FUNCTION IF EXISTS check_booking_conflict(uuid, uuid, date, time, time, uuid);
DROP FUNCTION IF EXISTS check_booking_conflict(uuid, uuid, date, time, time);
DROP FUNCTION IF EXISTS update_booking_status(uuid, text, text);
DROP FUNCTION IF EXISTS update_booking_status(uuid, text);
DROP FUNCTION IF EXISTS get_booking_status_counts(uuid, date, date);
DROP FUNCTION IF EXISTS get_booking_status_counts(uuid);

-- Create the check_booking_conflict function with exact parameter names from the code
CREATE OR REPLACE FUNCTION public.check_booking_conflict(
  p_shop_id UUID,
  p_staff_id UUID DEFAULT NULL,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for overlapping bookings
  SELECT COUNT(*)
  INTO conflict_count
  FROM shop_bookings
  WHERE shop_id = p_shop_id
    AND booking_date = p_booking_date
    AND status NOT IN ('cancelled', 'no_show')
    AND (
      -- Staff member conflict check (if staff is specified)
      (p_staff_id IS NOT NULL AND assigned_staff_id = p_staff_id)
      OR
      -- If no specific staff, check for any conflicts at the shop
      (p_staff_id IS NULL)
    )
    AND (
      -- Time overlap check: existing booking overlaps with new booking
      (start_time < p_end_time AND end_time > p_start_time)
    );
  
  RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create alternative signature for the function
CREATE OR REPLACE FUNCTION public.check_booking_conflict(
  p_shop_id UUID,
  p_staff_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for overlapping bookings
  SELECT COUNT(*)
  INTO conflict_count
  FROM shop_bookings
  WHERE shop_id = p_shop_id
    AND booking_date = p_booking_date
    AND status NOT IN ('cancelled', 'no_show')
    AND (
      -- Same staff member conflict
      (p_staff_id IS NOT NULL AND assigned_staff_id = p_staff_id)
      OR
      -- Any staff conflict if no specific staff assigned
      (p_staff_id IS NULL)
    )
    AND (
      -- Time overlap check
      (start_time < p_end_time AND end_time > p_start_time)
    )
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id);
  
  RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the update_booking_status function
CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id UUID,
  p_new_status TEXT,
  p_internal_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  booking_exists BOOLEAN;
BEGIN
  -- Check if booking exists and user has permission
  SELECT EXISTS(
    SELECT 1 FROM shop_bookings 
    WHERE id = p_booking_id 
    AND provider_id = auth.uid()
  ) INTO booking_exists;
  
  IF NOT booking_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Update the booking
  UPDATE shop_bookings
  SET 
    status = p_new_status,
    internal_notes = COALESCE(p_internal_notes, internal_notes),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_booking_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the get_booking_status_counts function
CREATE OR REPLACE FUNCTION public.get_booking_status_counts(
  p_shop_id UUID,
  p_date_from DATE DEFAULT CURRENT_DATE,
  p_date_to DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  status TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.status::TEXT,
    COUNT(*)::BIGINT
  FROM shop_bookings b
  WHERE b.shop_id = p_shop_id
    AND b.booking_date BETWEEN p_date_from AND p_date_to
    AND b.provider_id = auth.uid()
  GROUP BY b.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_booking_conflict(uuid, uuid, date, time, time) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_booking_conflict(uuid, uuid, date, time, time, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_booking_status(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_status_counts(uuid, date, date) TO authenticated;

-- Also grant to anon for potential public access
GRANT EXECUTE ON FUNCTION public.check_booking_conflict(uuid, uuid, date, time, time) TO anon;
GRANT EXECUTE ON FUNCTION public.check_booking_conflict(uuid, uuid, date, time, time, uuid) TO anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 BOOKING FUNCTIONS CREATED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions available:';
    RAISE NOTICE '  ✅ public.check_booking_conflict() - Multiple signatures for flexibility';
    RAISE NOTICE '  ✅ public.update_booking_status() - Updates booking status safely';
    RAISE NOTICE '  ✅ public.get_booking_status_counts() - Gets booking statistics';
    RAISE NOTICE '';
    RAISE NOTICE 'Error should be resolved now!';
    RAISE NOTICE '';
END $$;