-- Fix all shop-related tables to ensure they exist with proper structure

-- 1. SHOP SERVICES TABLE
CREATE TABLE IF NOT EXISTS shop_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration INTEGER DEFAULT 60,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_shop_services_shop_id ON shop_services(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_services_provider_id ON shop_services(provider_id);

-- Fix RLS
ALTER TABLE shop_services DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all service operations" ON shop_services;
CREATE POLICY "Allow all service operations" ON shop_services
    FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
ALTER TABLE shop_services ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL PRIVILEGES ON shop_services TO PUBLIC;
GRANT ALL PRIVILEGES ON shop_services TO anon;
GRANT ALL PRIVILEGES ON shop_services TO authenticated;

-- 2. SHOP DISCOUNTS TABLE
CREATE TABLE IF NOT EXISTS shop_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    description TEXT,
    code VARCHAR(50),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_shop_discounts_shop_id ON shop_discounts(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_discounts_provider_id ON shop_discounts(provider_id);

-- Fix RLS
ALTER TABLE shop_discounts DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all discount operations" ON shop_discounts;
CREATE POLICY "Allow all discount operations" ON shop_discounts
    FOR ALL TO PUBLIC USING (true) WITH CHECK (true);
ALTER TABLE shop_discounts ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL PRIVILEGES ON shop_discounts TO PUBLIC;
GRANT ALL PRIVILEGES ON shop_discounts TO anon;
GRANT ALL PRIVILEGES ON shop_discounts TO authenticated;

SELECT 'All shop tables fixed and ready!' as result;