-- ===============================================
-- BOOKING CONFLICT PREVENTION DATABASE FUNCTION
-- ===============================================
-- This creates the server-side function to prevent double-booking
-- 
-- COPY THIS ENTIRE SQL AND RUN IN SUPABASE SQL EDITOR

-- Create the booking conflict checking function
CREATE OR REPLACE FUNCTION check_booking_conflict(
    p_shop_id UUID,
    p_staff_id UUID,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME
) RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    -- Check for overlapping bookings for the same staff member on the same date
    SELECT COUNT(*)
    INTO conflict_count
    FROM shop_bookings
    WHERE shop_id = p_shop_id
    AND assigned_staff_id = p_staff_id
    AND booking_date = p_booking_date
    AND status IN ('confirmed', 'in_progress', 'pending')  -- Exclude cancelled/completed
    AND (
        -- Check for time overlap
        (start_time <= p_start_time AND end_time > p_start_time) OR
        (start_time < p_end_time AND end_time >= p_end_time) OR
        (start_time >= p_start_time AND end_time <= p_end_time)
    );

    -- Return TRUE if there's a conflict, FALSE if available
    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to use this function
GRANT EXECUTE ON FUNCTION check_booking_conflict TO authenticated;
GRANT EXECUTE ON FUNCTION check_booking_conflict TO anon;

-- Create a simpler helper function to get booking status counts
CREATE OR REPLACE FUNCTION get_booking_status_counts(
    p_shop_id UUID,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'pending', COALESCE((
            SELECT COUNT(*) 
            FROM shop_bookings 
            WHERE shop_id = p_shop_id 
            AND status = 'pending'
            AND (p_date_from IS NULL OR booking_date >= p_date_from)
            AND (p_date_to IS NULL OR booking_date <= p_date_to)
        ), 0),
        'confirmed', COALESCE((
            SELECT COUNT(*) 
            FROM shop_bookings 
            WHERE shop_id = p_shop_id 
            AND status = 'confirmed'
            AND (p_date_from IS NULL OR booking_date >= p_date_from)
            AND (p_date_to IS NULL OR booking_date <= p_date_to)
        ), 0),
        'in_progress', COALESCE((
            SELECT COUNT(*) 
            FROM shop_bookings 
            WHERE shop_id = p_shop_id 
            AND status = 'in_progress'
            AND (p_date_from IS NULL OR booking_date >= p_date_from)
            AND (p_date_to IS NULL OR booking_date <= p_date_to)
        ), 0),
        'completed', COALESCE((
            SELECT COUNT(*) 
            FROM shop_bookings 
            WHERE shop_id = p_shop_id 
            AND status = 'completed'
            AND (p_date_from IS NULL OR booking_date >= p_date_from)
            AND (p_date_to IS NULL OR booking_date <= p_date_to)
        ), 0),
        'cancelled', COALESCE((
            SELECT COUNT(*) 
            FROM shop_bookings 
            WHERE shop_id = p_shop_id 
            AND status = 'cancelled'
            AND (p_date_from IS NULL OR booking_date >= p_date_from)
            AND (p_date_to IS NULL OR booking_date <= p_date_to)
        ), 0),
        'no_show', COALESCE((
            SELECT COUNT(*) 
            FROM shop_bookings 
            WHERE shop_id = p_shop_id 
            AND status = 'no_show'
            AND (p_date_from IS NULL OR booking_date >= p_date_from)
            AND (p_date_to IS NULL OR booking_date <= p_date_to)
        ), 0)
    )
    INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to use this function
GRANT EXECUTE ON FUNCTION get_booking_status_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_booking_status_counts TO anon;

-- Test the conflict checking function
-- This will return TRUE if there's a conflict, FALSE if the slot is available
SELECT 
    'Testing conflict checking function' as test_type,
    check_booking_conflict(
        (SELECT id FROM provider_businesses LIMIT 1)::UUID,
        (SELECT id FROM shop_staff LIMIT 1)::UUID,
        '2025-08-05'::DATE,
        '10:00'::TIME,
        '11:00'::TIME
    ) as has_conflict;

-- Show existing bookings for reference
SELECT 
    sb.booking_date,
    sb.start_time,
    sb.end_time,
    sb.customer_name,
    sb.status,
    ss.name as staff_name,
    pb.name as shop_name
FROM shop_bookings sb
JOIN shop_staff ss ON sb.assigned_staff_id = ss.id
JOIN provider_businesses pb ON sb.shop_id = pb.id
WHERE sb.booking_date >= CURRENT_DATE
ORDER BY sb.booking_date, sb.start_time
LIMIT 10;

-- Success message
SELECT 
    '✅ BOOKING CONFLICT PREVENTION SETUP COMPLETE' as status,
    'Server-side double-booking prevention is now active' as message;