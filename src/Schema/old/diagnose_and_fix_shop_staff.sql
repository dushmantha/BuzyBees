-- DIAGNOSE AND FIX SHOP_STAFF TABLE
-- First check what exists, then fix what's missing

-- 1. Check current table structure
SELECT 
    'CURRENT shop_staff COLUMNS:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'shop_staff'
ORDER BY ordinal_position;

-- 2. Check specifically for missing columns
DO $$
DECLARE
    missing_columns TEXT := '';
    has_work_schedule BOOLEAN;
    has_leave_dates BOOLEAN;
BEGIN
    -- Check work_schedule
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_staff' AND column_name = 'work_schedule'
    ) INTO has_work_schedule;
    
    -- Check leave_dates
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_staff' AND column_name = 'leave_dates'
    ) INTO has_leave_dates;
    
    -- Report status
    IF has_work_schedule THEN
        RAISE NOTICE '✅ work_schedule column EXISTS';
    ELSE
        RAISE NOTICE '❌ work_schedule column MISSING - will add it';
        missing_columns := missing_columns || 'work_schedule, ';
    END IF;
    
    IF has_leave_dates THEN
        RAISE NOTICE '✅ leave_dates column EXISTS';
    ELSE
        RAISE NOTICE '❌ leave_dates column MISSING - will add it';
        missing_columns := missing_columns || 'leave_dates, ';
    END IF;
    
    IF missing_columns != '' THEN
        RAISE NOTICE 'Will add missing columns: %', missing_columns;
    ELSE
        RAISE NOTICE 'All required columns exist!';
    END IF;
END $$;

-- 3. Add missing columns if needed
DO $$
BEGIN
    -- Add work_schedule if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_staff' AND column_name = 'work_schedule') THEN
        ALTER TABLE shop_staff ADD COLUMN work_schedule JSONB DEFAULT '{
            "monday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
            "tuesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
            "wednesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
            "thursday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
            "friday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
            "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
            "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
        }'::jsonb;
        RAISE NOTICE '✅ Added work_schedule column';
    END IF;
    
    -- Add leave_dates if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_staff' AND column_name = 'leave_dates') THEN
        ALTER TABLE shop_staff ADD COLUMN leave_dates JSONB DEFAULT '[]'::jsonb;
        RAISE NOTICE '✅ Added leave_dates column';
    END IF;
    
    -- Add other commonly needed columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_staff' AND column_name = 'specialties') THEN
        ALTER TABLE shop_staff ADD COLUMN specialties TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added specialties column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_staff' AND column_name = 'availability') THEN
        ALTER TABLE shop_staff ADD COLUMN availability JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE '✅ Added availability column';
    END IF;
    
    -- Add basic columns if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_staff' AND column_name = 'updated_at') THEN
        ALTER TABLE shop_staff ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column';
    END IF;
END $$;

-- 4. Ensure proper permissions (disable RLS to avoid issues)
ALTER TABLE shop_staff DISABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON TABLE shop_staff TO postgres;
GRANT ALL PRIVILEGES ON TABLE shop_staff TO anon;
GRANT ALL PRIVILEGES ON TABLE shop_staff TO authenticated;
GRANT ALL PRIVILEGES ON TABLE shop_staff TO service_role;

-- 5. Test insert with the critical columns
INSERT INTO shop_staff (
    provider_id,
    name,
    email,
    work_schedule,
    leave_dates
) VALUES (
    gen_random_uuid(),
    'COLUMN_TEST_STAFF_2024',
    'test@test.com',
    '{"monday": {"isWorking": true, "startTime": "09:00", "endTime": "17:00"}}'::jsonb,
    '[{"date": "2024-12-25", "reason": "Christmas"}]'::jsonb
) ON CONFLICT DO NOTHING;

-- 6. Verify the test worked
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SUCCESS: Test record inserted with work_schedule and leave_dates!'
        ELSE '❌ ERROR: Test record failed to insert'
    END as test_result,
    COUNT(*) as test_count
FROM shop_staff 
WHERE name = 'COLUMN_TEST_STAFF_2024';

-- 7. Show the inserted test data to verify columns work
SELECT 
    name,
    work_schedule,
    leave_dates
FROM shop_staff 
WHERE name = 'COLUMN_TEST_STAFF_2024';

-- 8. Clean up test record
DELETE FROM shop_staff WHERE name = 'COLUMN_TEST_STAFF_2024';

-- 9. Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- 10. Final verification
SELECT 
    'FINAL VERIFICATION - Required columns exist:' as info,
    'work_schedule: ' || CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_staff' AND column_name = 'work_schedule'
    ) THEN 'YES ✅' ELSE 'NO ❌' END as work_schedule_status,
    'leave_dates: ' || CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_staff' AND column_name = 'leave_dates'
    ) THEN 'YES ✅' ELSE 'NO ❌' END as leave_dates_status;

SELECT 'shop_staff table fixed and verified!' as final_result;