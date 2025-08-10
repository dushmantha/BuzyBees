-- Create a simplified function to insert staff without work_schedule and leave_dates
-- This bypasses schema cache issues

CREATE OR REPLACE FUNCTION create_staff_member(
    p_shop_id UUID,
    p_provider_id UUID,
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_role TEXT,
    p_bio TEXT DEFAULT NULL,
    p_experience_years INT DEFAULT 0,
    p_avatar_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    new_staff_id UUID;
BEGIN
    INSERT INTO shop_staff (
        shop_id,
        provider_id,
        name,
        email,
        phone,
        role,
        bio,
        experience_years,
        avatar_url,
        is_active,
        work_schedule,
        leave_dates
    ) VALUES (
        p_shop_id,
        p_provider_id,
        p_name,
        p_email,
        p_phone,
        p_role,
        p_bio,
        p_experience_years,
        p_avatar_url,
        true,
        '{
            "monday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
            "tuesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
            "wednesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
            "thursday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
            "friday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
            "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
            "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
        }'::jsonb,
        '[]'::jsonb
    ) RETURNING id INTO new_staff_id;
    
    RETURN new_staff_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_staff_member TO anon;
GRANT EXECUTE ON FUNCTION create_staff_member TO authenticated;
GRANT EXECUTE ON FUNCTION create_staff_member TO PUBLIC;

SELECT 'Created function to insert staff members' as result;