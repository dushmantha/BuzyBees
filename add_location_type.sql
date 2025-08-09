-- Add missing location_type column to shop_services table
-- This column is needed to distinguish between in-house and on-location services

-- Add location_type column to shop_services table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'shop_services' AND column_name = 'location_type') THEN
        ALTER TABLE shop_services 
        ADD COLUMN location_type VARCHAR(20) DEFAULT 'in_house' 
        CHECK (location_type IN ('in_house', 'on_location'));
        
        COMMENT ON COLUMN shop_services.location_type IS 'Service location: in_house (client comes to shop) or on_location (provider goes to client)';
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_shop_services_location_type ON shop_services(location_type);

-- Update existing services to have default location_type if null
UPDATE shop_services 
SET location_type = 'in_house' 
WHERE location_type IS NULL;

-- Verification
SELECT 
    '✅ LOCATION_TYPE COLUMN ADDED!' as status,
    'Services can now be categorized as in-house or on-location' as message,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'shop_services' AND column_name = 'location_type') as column_exists;