-- FIX: Drop all existing functions that have name conflicts
-- This fixes the "function name is not unique" error

-- Drop all variations of shop creation functions
DROP FUNCTION IF EXISTS create_shop CASCADE;
DROP FUNCTION IF EXISTS buzybees_create_shop CASCADE;
DROP FUNCTION IF EXISTS buzybees_create_complete_shop CASCADE;

-- Drop all update shop functions
DROP FUNCTION IF EXISTS update_shop CASCADE;
DROP FUNCTION IF EXISTS buzybees_update_shop CASCADE;
DROP FUNCTION IF EXISTS buzybees_update_complete_shop CASCADE;

-- Drop all delete shop functions  
DROP FUNCTION IF EXISTS delete_shop CASCADE;
DROP FUNCTION IF EXISTS buzybees_delete_shop CASCADE;
DROP FUNCTION IF EXISTS buzybees_delete_complete_shop CASCADE;

-- Drop all get shop functions
DROP FUNCTION IF EXISTS get_shop CASCADE;
DROP FUNCTION IF EXISTS buzybees_get_shop CASCADE;
DROP FUNCTION IF EXISTS buzybees_get_complete_shop CASCADE;

-- Drop booking functions that might conflict
DROP FUNCTION IF EXISTS create_booking CASCADE;
DROP FUNCTION IF EXISTS create_booking_with_services CASCADE;
DROP FUNCTION IF EXISTS update_booking CASCADE;
DROP FUNCTION IF EXISTS delete_booking CASCADE;

-- Drop trigger functions that might conflict
DROP FUNCTION IF EXISTS notify_booking_changes CASCADE;
DROP FUNCTION IF EXISTS calculate_booking_totals CASCADE;
DROP FUNCTION IF EXISTS update_booking_updated_at CASCADE;
DROP FUNCTION IF EXISTS sync_booking_staff_ids CASCADE;
DROP FUNCTION IF EXISTS update_shop_staff_updated_at CASCADE;
DROP FUNCTION IF EXISTS update_shop_services_updated_at CASCADE;
DROP FUNCTION IF EXISTS update_service_options_updated_at CASCADE;

-- Drop any functions with parameter default conflicts
DROP FUNCTION IF EXISTS buzybees_update_complete_shop(
    uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, text[], text, jsonb, jsonb, text, integer, integer, integer, boolean, boolean, boolean
) CASCADE;

-- Drop functions by searching for common patterns
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop all functions that start with 'buzybees_' 
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND proname LIKE 'buzybees_%'
    LOOP
        BEGIN
            EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.proname || '(' || func_record.argtypes || ') CASCADE';
            RAISE NOTICE 'Dropped function: %(%)', func_record.proname, func_record.argtypes;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop function: %(%)', func_record.proname, func_record.argtypes;
        END;
    END LOOP;
    
    -- Drop all functions that contain 'shop' in the name
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as argtypes
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND proname ILIKE '%shop%'
        AND proname NOT IN ('update_shop_staff_updated_at', 'update_shop_services_updated_at') -- Keep basic update functions
    LOOP
        BEGIN
            EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.proname || '(' || func_record.argtypes || ') CASCADE';
            RAISE NOTICE 'Dropped shop function: %(%)', func_record.proname, func_record.argtypes;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not drop shop function: %(%)', func_record.proname, func_record.argtypes;
        END;
    END LOOP;
END $$;

-- Success message
SELECT 'All conflicting functions have been dropped!' as result;