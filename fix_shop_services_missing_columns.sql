-- FIX: Add missing columns to existing shop_services table
-- This fixes the "Could not find the 'base_price' column" error

-- Add missing columns that the application expects but don't exist in the deployed table
ALTER TABLE shop_services ADD COLUMN IF NOT EXISTS base_price DECIMAL(10,2);
ALTER TABLE shop_services ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE shop_services ADD COLUMN IF NOT EXISTS location_type VARCHAR(20) DEFAULT 'in_house';
ALTER TABLE shop_services ADD COLUMN IF NOT EXISTS assigned_staff UUID[] DEFAULT ARRAY[]::UUID[];
ALTER TABLE shop_services ADD COLUMN IF NOT EXISTS service_options_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- Copy existing values to new compatibility columns
UPDATE shop_services 
SET base_price = price 
WHERE base_price IS NULL AND price IS NOT NULL;

-- Copy duration to duration_minutes for compatibility
UPDATE shop_services 
SET duration_minutes = duration 
WHERE duration_minutes IS NULL AND duration IS NOT NULL;

-- Add check constraint for location_type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%location_type%' 
        AND table_name = 'shop_services'
    ) THEN
        ALTER TABLE shop_services 
        ADD CONSTRAINT shop_services_location_type_check 
        CHECK (location_type IN ('in_house', 'on_location'));
    END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_shop_services_base_price ON shop_services(base_price);
CREATE INDEX IF NOT EXISTS idx_shop_services_duration_minutes ON shop_services(duration_minutes);
CREATE INDEX IF NOT EXISTS idx_shop_services_location_type ON shop_services(location_type);
CREATE INDEX IF NOT EXISTS idx_shop_services_assigned_staff ON shop_services USING GIN(assigned_staff);
CREATE INDEX IF NOT EXISTS idx_shop_services_service_options_ids ON shop_services USING GIN(service_options_ids);

-- Test insert to verify all columns work
INSERT INTO shop_services (
    shop_id,
    name,
    description,
    price,
    base_price,
    duration,
    duration_minutes,
    category,
    location_type,
    assigned_staff,
    service_options_ids,
    image,
    is_active
) VALUES (
    gen_random_uuid(),
    'TEST_SERVICE_VERIFICATION',
    'Test service for verification',
    25.00,
    25.00,
    30,
    30, -- duration_minutes same as duration
    'Test Category',
    'in_house',
    ARRAY[]::UUID[],
    ARRAY[]::UUID[],
    NULL,
    true
) ON CONFLICT DO NOTHING;

-- Verify the test insert worked
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SUCCESS: All missing columns added and working!'
        ELSE '❌ ERROR: Test insert failed'
    END as result
FROM shop_services 
WHERE name = 'TEST_SERVICE_VERIFICATION';

-- Clean up test data
DELETE FROM shop_services WHERE name = 'TEST_SERVICE_VERIFICATION';

-- Show the updated table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'shop_services'
ORDER BY ordinal_position;

-- Success message
SELECT '🎉 shop_services table updated with missing columns!' as final_result;