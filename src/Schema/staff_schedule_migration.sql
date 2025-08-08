-- ===============================================
-- STAFF SCHEDULE AND LEAVE MIGRATION
-- ===============================================
-- This migration adds work schedule and leave date fields to the shop_staff table

-- Add work schedule and leave dates columns to shop_staff table
ALTER TABLE shop_staff 
ADD COLUMN IF NOT EXISTS work_schedule JSONB DEFAULT '{
  "monday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
  "tuesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
  "wednesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
  "thursday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
  "friday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
  "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
  "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
}'::jsonb;

ALTER TABLE shop_staff 
ADD COLUMN IF NOT EXISTS leave_dates JSONB DEFAULT '[]'::jsonb;

-- Add indexes for better performance on schedule queries
CREATE INDEX IF NOT EXISTS idx_shop_staff_work_schedule ON shop_staff USING GIN (work_schedule);
CREATE INDEX IF NOT EXISTS idx_shop_staff_leave_dates ON shop_staff USING GIN (leave_dates);
CREATE INDEX IF NOT EXISTS idx_shop_staff_active ON shop_staff (is_active);
CREATE INDEX IF NOT EXISTS idx_shop_staff_shop_id ON shop_staff (shop_id);

-- Update the updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at trigger for shop_staff table
DROP TRIGGER IF EXISTS update_shop_staff_updated_at ON shop_staff;
CREATE TRIGGER update_shop_staff_updated_at
    BEFORE UPDATE ON shop_staff
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- RLS POLICIES FOR SHOP_STAFF TABLE
-- ===============================================

-- Enable RLS on shop_staff table
ALTER TABLE shop_staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Providers can manage their shop staff" ON shop_staff;
DROP POLICY IF EXISTS "Staff can view their own records" ON shop_staff;

-- Providers can manage staff for their own shops
CREATE POLICY "Providers can manage their shop staff" ON shop_staff
    FOR ALL USING (
        provider_id = auth.uid() OR
        shop_id IN (
            SELECT id FROM provider_businesses WHERE provider_id = auth.uid()
        )
    );

-- Staff members can view their own records (if we add staff login in the future)
CREATE POLICY "Staff can view their own records" ON shop_staff
    FOR SELECT USING (
        email = auth.jwt() ->> 'email'
    );

-- ===============================================
-- HELPER FUNCTIONS
-- ===============================================

-- Function to check if staff member is available at given time
CREATE OR REPLACE FUNCTION is_staff_available(
    p_staff_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
) RETURNS BOOLEAN AS $$
DECLARE
    staff_record RECORD;
    day_name TEXT;
    day_schedule JSONB;
    is_on_leave BOOLEAN;
BEGIN
    -- Get staff record
    SELECT * INTO staff_record FROM shop_staff WHERE id = p_staff_id AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get day name (lowercase)
    day_name := LOWER(TO_CHAR(p_date, 'Day'));
    day_name := TRIM(day_name);
    
    -- Get schedule for this day
    day_schedule := staff_record.work_schedule -> day_name;
    
    -- Check if staff is working on this day
    IF NOT (day_schedule ->> 'isWorking')::BOOLEAN THEN
        RETURN FALSE;
    END IF;
    
    -- Check if requested time is within working hours
    IF p_start_time < (day_schedule ->> 'startTime')::TIME OR 
       p_end_time > (day_schedule ->> 'endTime')::TIME THEN
        RETURN FALSE;
    END IF;
    
    -- Check if staff is on leave
    SELECT EXISTS(
        SELECT 1 FROM jsonb_array_elements(staff_record.leave_dates) AS leave_period
        WHERE p_date >= (leave_period ->> 'startDate')::DATE
        AND p_date <= (leave_period ->> 'endDate')::DATE
    ) INTO is_on_leave;
    
    IF is_on_leave THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get available staff for a shop at given time
CREATE OR REPLACE FUNCTION get_available_staff(
    p_shop_id UUID,
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME
) RETURNS TABLE(
    staff_id UUID,
    staff_name VARCHAR(255),
    staff_role VARCHAR(100),
    staff_specialties JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.role,
        s.specialties
    FROM shop_staff s
    WHERE s.shop_id = p_shop_id
    AND s.is_active = true
    AND is_staff_available(s.id, p_date, p_start_time, p_end_time);
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- DATA MIGRATION
-- ===============================================

-- Update existing staff records to have default work schedule and empty leave dates
UPDATE shop_staff 
SET 
    work_schedule = '{
        "monday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
        "tuesday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
        "wednesday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
        "thursday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
        "friday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
        "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
    }'::jsonb,
    leave_dates = '[]'::jsonb
WHERE work_schedule IS NULL OR leave_dates IS NULL;

-- ===============================================
-- VERIFICATION QUERIES
-- ===============================================

-- Verify the migration
DO $$
BEGIN
    RAISE NOTICE 'Staff schedule migration completed successfully!';
    RAISE NOTICE 'Total staff records: %', (SELECT COUNT(*) FROM shop_staff);
    RAISE NOTICE 'Staff with work schedules: %', (SELECT COUNT(*) FROM shop_staff WHERE work_schedule IS NOT NULL);
    RAISE NOTICE 'Staff with leave dates: %', (SELECT COUNT(*) FROM shop_staff WHERE leave_dates IS NOT NULL);
END $$;