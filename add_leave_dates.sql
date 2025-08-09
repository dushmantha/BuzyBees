-- Add missing leave_dates column to shop_staff table
-- This column stores leave/vacation dates for staff members

-- Add leave_dates column to shop_staff table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shop_staff' AND column_name = 'leave_dates') THEN
        ALTER TABLE shop_staff 
        ADD COLUMN leave_dates JSONB DEFAULT '[]'::jsonb;
        
        COMMENT ON COLUMN shop_staff.leave_dates IS 'Array of leave/vacation dates for the staff member';
    END IF;
END $$;

-- Add work_schedule column if it doesn't exist (for staff scheduling)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shop_staff' AND column_name = 'work_schedule') THEN
        ALTER TABLE shop_staff 
        ADD COLUMN work_schedule JSONB DEFAULT '{}'::jsonb;
        
        COMMENT ON COLUMN shop_staff.work_schedule IS 'Work schedule for the staff member (days, hours, etc.)';
    END IF;
END $$;

-- Add is_available column if it doesn't exist (for availability status)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shop_staff' AND column_name = 'is_available') THEN
        ALTER TABLE shop_staff 
        ADD COLUMN is_available BOOLEAN DEFAULT true;
        
        COMMENT ON COLUMN shop_staff.is_available IS 'Whether the staff member is currently available for bookings';
    END IF;
END $$;

-- Add hire_date column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shop_staff' AND column_name = 'hire_date') THEN
        ALTER TABLE shop_staff 
        ADD COLUMN hire_date DATE DEFAULT CURRENT_DATE;
        
        COMMENT ON COLUMN shop_staff.hire_date IS 'Date when the staff member was hired';
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shop_staff_available ON shop_staff(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_shop_staff_hire_date ON shop_staff(hire_date);

-- Update existing staff to have default values if null
UPDATE shop_staff 
SET leave_dates = '[]'::jsonb 
WHERE leave_dates IS NULL;

UPDATE shop_staff 
SET work_schedule = '{}'::jsonb 
WHERE work_schedule IS NULL;

UPDATE shop_staff 
SET is_available = true 
WHERE is_available IS NULL;

-- Verification
SELECT 
    '✅ STAFF LEAVE MANAGEMENT COLUMNS ADDED!' as status,
    'Staff members can now have leave dates, schedules, and availability status' as message,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'shop_staff' 
     AND column_name IN ('leave_dates', 'work_schedule', 'is_available', 'hire_date')) as columns_added;