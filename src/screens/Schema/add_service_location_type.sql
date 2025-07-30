-- ===============================================
-- ADD SERVICE LOCATION TYPE FEATURE
-- ===============================================
-- This script adds location_type column to shop_services table

-- Add location_type column to shop_services if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shop_services' AND column_name = 'location_type'
    ) THEN
        ALTER TABLE shop_services 
        ADD COLUMN location_type VARCHAR(20) DEFAULT 'in_house' 
        CHECK (location_type IN ('in_house', 'on_location'));
        
        -- Update existing services to have default location type
        UPDATE shop_services 
        SET location_type = 'in_house' 
        WHERE location_type IS NULL;
        
        RAISE NOTICE '✅ Added location_type column to shop_services';
    ELSE
        RAISE NOTICE '⚠️  location_type column already exists';
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_shop_services_location_type ON shop_services(location_type);

-- Add column comment for documentation
COMMENT ON COLUMN shop_services.location_type IS 'Service location: in_house (client comes to shop) or on_location (provider goes to client)';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SERVICE LOCATION TYPE FEATURE ADDED!';
    RAISE NOTICE '';
    RAISE NOTICE 'Location types available:';
    RAISE NOTICE '  📍 in_house - Client comes to shop (salon, barbershop, etc.)';
    RAISE NOTICE '  🚗 on_location - Provider goes to client (cleaning, lawnmowing, etc.)';
    RAISE NOTICE '';
    RAISE NOTICE 'All existing services defaulted to "in_house"';
    RAISE NOTICE 'Update your services as needed in the app!';
    RAISE NOTICE '';
END $$;