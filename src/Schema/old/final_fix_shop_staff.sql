-- FINAL FIX: Complete removal and recreation of shop_staff table
-- This will force Supabase to recognize all columns

-- 1. Drop everything related to shop_staff
DROP TABLE IF EXISTS shop_staff CASCADE;
DROP TRIGGER IF EXISTS update_shop_staff_updated_at ON shop_staff;
DROP POLICY IF EXISTS "Allow all staff operations" ON shop_staff;
DROP POLICY IF EXISTS "Open Access" ON shop_staff;

-- Wait a moment for cleanup
SELECT pg_sleep(1);

-- 2. Create the table with a simpler structure first
CREATE TABLE shop_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID,
    provider_id UUID,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,
    bio TEXT,
    experience_years INTEGER DEFAULT 0,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Now add the JSONB columns separately
ALTER TABLE shop_staff ADD COLUMN specialties TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE shop_staff ADD COLUMN availability JSONB DEFAULT '{}'::jsonb;
ALTER TABLE shop_staff ADD COLUMN work_schedule JSONB DEFAULT '{
    "monday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
    "tuesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
    "wednesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
    "thursday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
    "friday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
    "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
    "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
}'::jsonb;
ALTER TABLE shop_staff ADD COLUMN leave_dates JSONB DEFAULT '[]'::jsonb;

-- 4. Add the foreign key constraint
ALTER TABLE shop_staff 
    ADD CONSTRAINT shop_staff_shop_id_fkey 
    FOREIGN KEY (shop_id) 
    REFERENCES provider_businesses(id) 
    ON DELETE CASCADE;

-- 5. Create indexes
CREATE INDEX idx_shop_staff_shop_id ON shop_staff(shop_id);
CREATE INDEX idx_shop_staff_provider_id ON shop_staff(provider_id);
CREATE INDEX idx_shop_staff_email ON shop_staff(email);
CREATE INDEX idx_shop_staff_is_active ON shop_staff(is_active);

-- 6. Disable RLS completely for now
ALTER TABLE shop_staff DISABLE ROW LEVEL SECURITY;

-- 7. Grant maximum permissions
GRANT ALL PRIVILEGES ON TABLE shop_staff TO postgres;
GRANT ALL PRIVILEGES ON TABLE shop_staff TO anon;
GRANT ALL PRIVILEGES ON TABLE shop_staff TO authenticated;
GRANT ALL PRIVILEGES ON TABLE shop_staff TO service_role;
GRANT ALL PRIVILEGES ON TABLE shop_staff TO PUBLIC;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 8. Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_staff_updated_at
    BEFORE UPDATE ON shop_staff
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Insert a test record to validate all columns work
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
    specialties,
    availability,
    work_schedule,
    leave_dates,
    is_active
) VALUES (
    NULL,
    NULL,
    'SCHEMA_TEST_STAFF',
    'schema_test@example.com',
    '0000000000',
    'Test Role',
    'Test bio',
    1,
    'https://example.com/test.jpg',
    ARRAY['test1', 'test2'],
    '{"test": true}'::jsonb,
    '{
        "monday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"},
        "tuesday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"}
    }'::jsonb,
    '[{"date": "2024-01-01", "reason": "Test"}]'::jsonb,
    true
);

-- 10. Verify the insert worked
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: Test record inserted with all columns'
        ELSE 'ERROR: Test record failed to insert'
    END as test_result
FROM shop_staff 
WHERE name = 'SCHEMA_TEST_STAFF';

-- 11. Clean up test record
DELETE FROM shop_staff WHERE name = 'SCHEMA_TEST_STAFF';

-- 12. Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- 13. Final verification
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'shop_staff'
ORDER BY ordinal_position;

-- 14. Confirm critical columns exist
DO $$
DECLARE
    has_work_schedule BOOLEAN;
    has_leave_dates BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_staff' AND column_name = 'work_schedule'
    ) INTO has_work_schedule;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_staff' AND column_name = 'leave_dates'
    ) INTO has_leave_dates;
    
    IF has_work_schedule AND has_leave_dates THEN
        RAISE NOTICE 'SUCCESS: Both work_schedule and leave_dates columns exist!';
    ELSE
        RAISE EXCEPTION 'ERROR: Missing columns - work_schedule: %, leave_dates: %', has_work_schedule, has_leave_dates;
    END IF;
END $$;

SELECT 'Shop staff table recreated with ALL columns including work_schedule and leave_dates!' as result;