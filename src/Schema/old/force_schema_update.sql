-- Force schema update to refresh Supabase's cache
-- This will ensure all columns are recognized by the API

-- 1. Drop and recreate the shop_staff table with all columns
DROP TABLE IF EXISTS shop_staff CASCADE;

CREATE TABLE shop_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(100),
    specialties TEXT[] DEFAULT '{}',
    availability JSONB DEFAULT '{}',
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

-- 2. Create indexes
CREATE INDEX idx_shop_staff_shop_id ON shop_staff(shop_id);
CREATE INDEX idx_shop_staff_provider_id ON shop_staff(provider_id);
CREATE INDEX idx_shop_staff_is_active ON shop_staff(is_active);

-- 3. Set up RLS policies
ALTER TABLE shop_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on shop_staff" ON shop_staff
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- 4. Grant permissions
GRANT ALL ON shop_staff TO anon;
GRANT ALL ON shop_staff TO authenticated;
GRANT ALL ON shop_staff TO service_role;

-- 5. Refresh the schema cache by creating a trigger
CREATE OR REPLACE FUNCTION refresh_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_staff_updated_at
    BEFORE UPDATE ON shop_staff
    FOR EACH ROW
    EXECUTE FUNCTION refresh_updated_at();

-- 6. Force schema cache refresh
NOTIFY pgrst, 'reload schema';

-- 7. Verify the table structure
SELECT 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'shop_staff'
ORDER BY ordinal_position;

SELECT 'Schema updated successfully! All columns including work_schedule and leave_dates are now available.' as result;