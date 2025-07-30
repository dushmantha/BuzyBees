-- ===============================================
-- FIX BOOKING FUNCTIONS
-- ===============================================
-- This script creates all required booking functions

-- Function to check booking conflicts
CREATE OR REPLACE FUNCTION check_booking_conflict(
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

-- Function to update booking status
CREATE OR REPLACE FUNCTION update_booking_status(
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

-- Function to get booking status counts
CREATE OR REPLACE FUNCTION get_booking_status_counts(
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
GRANT EXECUTE ON FUNCTION check_booking_conflict TO authenticated;
GRANT EXECUTE ON FUNCTION update_booking_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_booking_status_counts TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 BOOKING FUNCTIONS CREATED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions available:';
    RAISE NOTICE '  ✅ check_booking_conflict() - Prevents double bookings';
    RAISE NOTICE '  ✅ update_booking_status() - Updates booking status safely';
    RAISE NOTICE '  ✅ get_booking_status_counts() - Gets booking statistics';
    RAISE NOTICE '';
    RAISE NOTICE 'Your booking system is ready to use!';
    RAISE NOTICE '';
END $$;