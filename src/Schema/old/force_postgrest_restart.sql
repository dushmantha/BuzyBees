-- Force PostgREST to completely reload its schema cache
-- This is a more aggressive approach

-- 1. Send multiple reload signals
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload';

-- 2. Update pg_stat_statements to force cache invalidation
SELECT pg_stat_statements_reset();

-- 3. Create a temporary function to force schema change detection
CREATE OR REPLACE FUNCTION force_schema_reload() RETURNS void AS $$
BEGIN
    -- Force a schema change by altering a comment
    COMMENT ON TABLE shop_staff IS 'Staff table - Updated at ' || NOW()::text;
    
    -- Send reload notification
    NOTIFY pgrst, 'reload schema';
END;
$$ LANGUAGE plpgsql;

SELECT force_schema_reload();

-- 4. Verify the columns one more time
SELECT 
    'work_schedule exists: ' || 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_staff' AND column_name = 'work_schedule'
    ) THEN 'YES' ELSE 'NO' END as work_schedule_status,
    
    'leave_dates exists: ' || 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_staff' AND column_name = 'leave_dates'  
    ) THEN 'YES' ELSE 'NO' END as leave_dates_status;

SELECT 'PostgREST schema cache reload triggered!' as result;