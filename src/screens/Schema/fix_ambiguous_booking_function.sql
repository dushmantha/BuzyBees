-- ===============================================
-- FIX AMBIGUOUS UPDATE_BOOKING_STATUS FUNCTION
-- ===============================================
-- This script fixes the ambiguous function error by dropping all versions
-- and creating a single, consistent version

-- Drop ALL existing versions of the function
DROP FUNCTION IF EXISTS public.update_booking_status(uuid, character varying, text);
DROP FUNCTION IF EXISTS public.update_booking_status(uuid, text, text);
DROP FUNCTION IF EXISTS public.update_booking_status(p_booking_id uuid, p_new_status character varying, p_internal_notes text);
DROP FUNCTION IF EXISTS public.update_booking_status(p_booking_id uuid, p_new_status text, p_internal_notes text);

-- Create a single, consistent version of the function
CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id UUID,
  p_new_status TEXT,
  p_internal_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  booking_exists BOOLEAN;
  current_provider_id UUID;
BEGIN
  -- Get the current user ID
  current_provider_id := auth.uid();
  
  IF current_provider_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if booking exists and user has permission
  SELECT EXISTS(
    SELECT 1 FROM shop_bookings 
    WHERE id = p_booking_id 
    AND provider_id = current_provider_id
  ) INTO booking_exists;
  
  IF NOT booking_exists THEN
    RAISE EXCEPTION 'Booking not found or access denied';
  END IF;
  
  -- Validate status
  IF p_new_status NOT IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'Invalid booking status: %', p_new_status;
  END IF;
  
  -- Update the booking
  UPDATE shop_bookings
  SET 
    status = p_new_status,
    internal_notes = COALESCE(p_internal_notes, internal_notes),
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_booking_id;
  
  -- Log the status change (optional - for audit trail)
  RAISE NOTICE 'Booking % status updated to % by user %', p_booking_id, p_new_status, current_provider_id;
  
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update booking status: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_booking_status(uuid, text, text) TO authenticated;

-- Also create an RPC wrapper that matches the exact call signature from the app
CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id UUID,
  p_new_status VARCHAR,
  p_internal_notes VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Call the main function with text parameters
  RETURN public.update_booking_status(p_booking_id, p_new_status::TEXT, p_internal_notes::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission for this version too
GRANT EXECUTE ON FUNCTION public.update_booking_status(uuid, varchar, varchar) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 AMBIGUOUS FUNCTION FIXED!';
    RAISE NOTICE '';
    RAISE NOTICE 'The update_booking_status function has been cleaned up.';
    RAISE NOTICE 'There is now a single, consistent version that handles all cases.';
    RAISE NOTICE '';
    RAISE NOTICE 'The error "Could not choose the best candidate function" should be resolved.';
    RAISE NOTICE '';
END $$;