-- Standalone Service Options Schema
-- This version works independently without requiring a services table
-- Service options are linked directly to shops

-- Drop existing objects if needed
DROP TABLE IF EXISTS service_options CASCADE;
DROP VIEW IF EXISTS shop_services_with_options CASCADE;

-- Create service_options table
CREATE TABLE IF NOT EXISTS service_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID NOT NULL,
    service_name VARCHAR(100) NOT NULL, -- Base service name like "Hair Cut", "Massage"
    option_name VARCHAR(100) NOT NULL, -- Option like "Men's Hair Cut", "60 Minutes"
    option_description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration INTEGER NOT NULL, -- in minutes
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key to shops
    CONSTRAINT fk_service_options_shop
        FOREIGN KEY (shop_id) 
        REFERENCES provider_businesses(id) 
        ON DELETE CASCADE,
    
    -- Unique constraint
    CONSTRAINT unique_service_option_per_shop 
        UNIQUE(shop_id, service_name, option_name)
);

-- Create indexes
CREATE INDEX idx_service_options_shop_id ON service_options(shop_id);
CREATE INDEX idx_service_options_service_name ON service_options(service_name);
CREATE INDEX idx_service_options_active ON service_options(is_active);

-- Enable RLS
ALTER TABLE service_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Shop owners can view their own service options
CREATE POLICY "Shop owners can view own service options" ON service_options
    FOR SELECT
    USING (
        shop_id IN (
            SELECT id FROM provider_businesses 
            WHERE provider_id = auth.uid()
        )
    );

-- Shop owners can insert their own service options
CREATE POLICY "Shop owners can insert own service options" ON service_options
    FOR INSERT
    WITH CHECK (
        shop_id IN (
            SELECT id FROM provider_businesses 
            WHERE provider_id = auth.uid()
        )
    );

-- Shop owners can update their own service options
CREATE POLICY "Shop owners can update own service options" ON service_options
    FOR UPDATE
    USING (
        shop_id IN (
            SELECT id FROM provider_businesses 
            WHERE provider_id = auth.uid()
        )
    );

-- Shop owners can delete their own service options
CREATE POLICY "Shop owners can delete own service options" ON service_options
    FOR DELETE
    USING (
        shop_id IN (
            SELECT id FROM provider_businesses 
            WHERE provider_id = auth.uid()
        )
    );

-- Consumers can view active service options
CREATE POLICY "Consumers can view active service options" ON service_options
    FOR SELECT
    USING (is_active = true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_options_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_service_options_updated_at_trigger
    BEFORE UPDATE ON service_options
    FOR EACH ROW
    EXECUTE FUNCTION update_service_options_updated_at();

-- View to group options by service
CREATE OR REPLACE VIEW service_options_grouped AS
SELECT 
    shop_id,
    service_name,
    json_agg(
        json_build_object(
            'id', id,
            'option_name', option_name,
            'option_description', option_description,
            'price', price,
            'duration', duration,
            'is_active', is_active,
            'sort_order', sort_order
        ) ORDER BY sort_order
    ) as options
FROM service_options
WHERE is_active = true
GROUP BY shop_id, service_name;

-- Sample data for testing
/*
-- Example for a hair salon
INSERT INTO service_options (shop_id, service_name, option_name, option_description, price, duration, sort_order)
VALUES 
    ('your-shop-uuid', 'Hair Cut', 'Child Hair Cut', 'Hair cut for children under 12', 250, 30, 1),
    ('your-shop-uuid', 'Hair Cut', 'Men''s Hair Cut', 'Standard men''s hair cut and style', 350, 45, 2),
    ('your-shop-uuid', 'Hair Cut', 'Women''s Hair Cut', 'Women''s hair cut and style', 550, 60, 3),
    ('your-shop-uuid', 'Hair Cut', 'Clipper Cut', 'Quick clipper cut', 200, 20, 4),
    ('your-shop-uuid', 'Hair Cut', 'Beard Trim', 'Professional beard trimming', 150, 15, 5);

-- Example for a massage service
INSERT INTO service_options (shop_id, service_name, option_name, option_description, price, duration, sort_order)
VALUES 
    ('your-shop-uuid', 'Massage', '30 Minutes', 'Quick relaxation massage', 450, 30, 1),
    ('your-shop-uuid', 'Massage', '60 Minutes', 'Full body massage', 750, 60, 2),
    ('your-shop-uuid', 'Massage', '90 Minutes', 'Extended therapeutic massage', 1050, 90, 3);

-- Example for cleaning service
INSERT INTO service_options (shop_id, service_name, option_name, option_description, price, duration, sort_order)
VALUES 
    ('your-shop-uuid', 'Home Cleaning', 'Basic Clean', 'Standard cleaning service', 350, 120, 1),
    ('your-shop-uuid', 'Home Cleaning', 'Deep Clean', 'Thorough deep cleaning', 550, 240, 2),
    ('your-shop-uuid', 'Home Cleaning', 'Move-in/out Clean', 'Complete cleaning for moving', 750, 360, 3);
*/