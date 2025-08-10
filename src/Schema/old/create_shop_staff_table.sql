-- CREATE SHOP_STAFF TABLE FROM SCRATCH
-- Since the table doesn't exist, we'll create it fresh

-- 1. Create the shop_staff table with all columns
CREATE TABLE shop_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID,
    provider_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,
    bio TEXT,
    experience_years INTEGER DEFAULT 0,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
    availability JSONB DEFAULT '{}'::jsonb,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add foreign key constraint if provider_businesses exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'provider_businesses') THEN
        ALTER TABLE shop_staff 
            ADD CONSTRAINT shop_staff_shop_id_fkey 
            FOREIGN KEY (shop_id) 
            REFERENCES provider_businesses(id) 
            ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to provider_businesses';
    ELSE
        RAISE NOTICE 'provider_businesses table not found - skipping foreign key';
    END IF;
END $$;

-- 3. Create indexes for better performance
CREATE INDEX idx_shop_staff_shop_id ON shop_staff(shop_id);
CREATE INDEX idx_shop_staff_provider_id ON shop_staff(provider_id);
CREATE INDEX idx_shop_staff_email ON shop_staff(email);
CREATE INDEX idx_shop_staff_is_active ON shop_staff(is_active);

-- 4. Set up permissions (no RLS for now to avoid issues)
ALTER TABLE shop_staff DISABLE ROW LEVEL SECURITY;

-- Grant all permissions
GRANT ALL PRIVILEGES ON TABLE shop_staff TO postgres;
GRANT ALL PRIVILEGES ON TABLE shop_staff TO anon;
GRANT ALL PRIVILEGES ON TABLE shop_staff TO authenticated;
GRANT ALL PRIVILEGES ON TABLE shop_staff TO service_role;

-- 5. Create update trigger
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

-- 6. Test insert to verify all columns work
INSERT INTO shop_staff (
    provider_id,
    name,
    email,
    work_schedule,
    leave_dates
) VALUES (
    gen_random_uuid(),
    'TEST_STAFF_CREATION',
    'test@example.com',
    '{"monday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"}}'::jsonb,
    '[{"date": "2024-01-01", "reason": "Test"}]'::jsonb
);

-- 7. Verify the test insert worked
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'SUCCESS: shop_staff table created and test insert worked!'
        ELSE 'ERROR: Test insert failed'
    END as result
FROM shop_staff 
WHERE name = 'TEST_STAFF_CREATION';

-- 8. Clean up test record
DELETE FROM shop_staff WHERE name = 'TEST_STAFF_CREATION';

-- 9. Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';

-- 10. Final verification - show all columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'shop_staff'
ORDER BY ordinal_position;

-- 11. Confirm critical columns exist
SELECT 
    'work_schedule column exists: ' || 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_staff' AND column_name = 'work_schedule'
    ) THEN 'YES ✅' ELSE 'NO ❌' END as work_schedule_status,
    
    'leave_dates column exists: ' || 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_staff' AND column_name = 'leave_dates'  
    ) THEN 'YES ✅' ELSE 'NO ❌' END as leave_dates_status;

SELECT 'shop_staff table created successfully with work_schedule and leave_dates columns!' as final_result;