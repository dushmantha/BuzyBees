-- Service Options/Variations Schema
-- This schema allows shops to define multiple options for each service
-- For example: Hair Cut service can have Child, Men's, Women's, Clipper Cut options

-- Create service_options table to store service variations
CREATE TABLE IF NOT EXISTS service_options (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id UUID NOT NULL,
    shop_id UUID NOT NULL,
    option_name VARCHAR(100) NOT NULL, -- e.g., "Men's Hair Cut", "Child Hair Cut"
    option_description TEXT,
    price DECIMAL(10, 2) NOT NULL, -- Price for this specific option
    duration INTEGER NOT NULL, -- Duration in minutes for this option
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_service_options_shop
        FOREIGN KEY (shop_id) 
        REFERENCES provider_businesses(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_service_options_service
        FOREIGN KEY (service_id)
        REFERENCES shop_services(id)
        ON DELETE CASCADE,
    
    -- Ensure unique option names per service in a shop
    CONSTRAINT unique_service_option_per_shop 
        UNIQUE(shop_id, service_id, option_name)
);

-- Create indexes for better performance
CREATE INDEX idx_service_options_shop_id ON service_options(shop_id);
CREATE INDEX idx_service_options_service_id ON service_options(service_id);
CREATE INDEX idx_service_options_active ON service_options(is_active);

-- Add RLS policies
ALTER TABLE service_options ENABLE ROW LEVEL SECURITY;

-- Policy: Shop owners can view their own service options
CREATE POLICY "Shop owners can view own service options" ON service_options
    FOR SELECT
    USING (
        shop_id IN (
            SELECT id FROM provider_businesses 
            WHERE provider_id = auth.uid()
        )
    );

-- Policy: Shop owners can insert their own service options
CREATE POLICY "Shop owners can insert own service options" ON service_options
    FOR INSERT
    WITH CHECK (
        shop_id IN (
            SELECT id FROM provider_businesses 
            WHERE provider_id = auth.uid()
        )
    );

-- Policy: Shop owners can update their own service options
CREATE POLICY "Shop owners can update own service options" ON service_options
    FOR UPDATE
    USING (
        shop_id IN (
            SELECT id FROM provider_businesses 
            WHERE provider_id = auth.uid()
        )
    );

-- Policy: Shop owners can delete their own service options
CREATE POLICY "Shop owners can delete own service options" ON service_options
    FOR DELETE
    USING (
        shop_id IN (
            SELECT id FROM provider_businesses 
            WHERE provider_id = auth.uid()
        )
    );

-- Policy: Consumers can view active service options
CREATE POLICY "Consumers can view active service options" ON service_options
    FOR SELECT
    USING (is_active = true);

-- Add columns to shop_services table to link with options
ALTER TABLE shop_services ADD COLUMN IF NOT EXISTS has_options BOOLEAN DEFAULT false;
ALTER TABLE shop_services ADD COLUMN IF NOT EXISTS base_price DECIMAL(10, 2);
ALTER TABLE shop_services ADD COLUMN IF NOT EXISTS base_duration INTEGER;

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

-- Sample data for testing (Hair Salon example)
/*
INSERT INTO service_options (service_id, shop_id, option_name, option_description, price, duration, sort_order)
VALUES 
    ('service-uuid-1', 'shop-uuid-1', 'Child Hair Cut', 'Hair cut for children under 12', 25.00, 30, 1),
    ('service-uuid-1', 'shop-uuid-1', 'Men''s Hair Cut', 'Standard men''s hair cut and style', 35.00, 45, 2),
    ('service-uuid-1', 'shop-uuid-1', 'Women''s Hair Cut', 'Women''s hair cut and style', 55.00, 60, 3),
    ('service-uuid-1', 'shop-uuid-1', 'Clipper Cut', 'Quick clipper cut', 20.00, 20, 4),
    ('service-uuid-1', 'shop-uuid-1', 'Beard Trim', 'Professional beard trimming', 15.00, 15, 5);
*/

-- View to get services with their options
CREATE OR REPLACE VIEW shop_services_with_options AS
SELECT 
    s.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', so.id,
                'option_name', so.option_name,
                'option_description', so.option_description,
                'price', so.price,
                'duration', so.duration,
                'is_active', so.is_active,
                'sort_order', so.sort_order
            ) ORDER BY so.sort_order
        ) FILTER (WHERE so.id IS NOT NULL),
        '[]'::json
    ) as options
FROM shop_services s
LEFT JOIN service_options so ON s.id = so.service_id AND so.is_active = true
GROUP BY s.id;