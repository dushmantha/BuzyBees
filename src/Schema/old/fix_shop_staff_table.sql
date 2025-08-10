-- Fix shop_staff table by adding missing columns

-- First, ensure the shop_staff table exists
CREATE TABLE IF NOT EXISTS shop_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(100),
    specialties TEXT[],
    availability JSONB,
    bio TEXT,
    experience_years INTEGER DEFAULT 0,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    work_schedule JSONB DEFAULT '{
        "monday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "tuesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "wednesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "thursday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "friday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
    }'::jsonb,
    leave_dates JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add any missing columns to existing table
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS leave_dates JSONB DEFAULT '[]'::jsonb;
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS work_schedule JSONB DEFAULT '{
    "monday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
    "tuesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
    "wednesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
    "thursday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
    "friday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
    "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
    "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
}'::jsonb;
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS specialties TEXT[];
ALTER TABLE shop_staff ADD COLUMN IF NOT EXISTS availability JSONB;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shop_staff_shop_id ON shop_staff(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_provider_id ON shop_staff(provider_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_is_active ON shop_staff(is_active);

-- Fix RLS policies to be permissive
ALTER TABLE shop_staff DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all staff operations" ON shop_staff;

CREATE POLICY "Allow all staff operations" ON shop_staff
    FOR ALL 
    TO PUBLIC
    USING (true)
    WITH CHECK (true);

ALTER TABLE shop_staff ENABLE ROW LEVEL SECURITY;

-- Grant all permissions
GRANT ALL PRIVILEGES ON shop_staff TO PUBLIC;
GRANT ALL PRIVILEGES ON shop_staff TO anon;
GRANT ALL PRIVILEGES ON shop_staff TO authenticated;

SELECT 'Shop staff table fixed with all required columns!' as result;