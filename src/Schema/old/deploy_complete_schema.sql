-- COMPLETE SCHEMA DEPLOYMENT FOR BUZYBEES
-- This deploys all tables with proper structure

-- ============================================
-- 1. PROVIDER_BUSINESSES TABLE (Main Shop Table)
-- ============================================
ALTER TABLE provider_businesses 
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '[
    {"day": "Monday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
    {"day": "Tuesday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
    {"day": "Wednesday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
    {"day": "Thursday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
    {"day": "Friday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
    {"day": "Saturday", "isOpen": true, "openTime": "10:00", "closeTime": "16:00"},
    {"day": "Sunday", "isOpen": false, "openTime": "10:00", "closeTime": "16:00"}
]'::jsonb;

ALTER TABLE provider_businesses 
ADD COLUMN IF NOT EXISTS special_days JSONB DEFAULT '[]'::jsonb;

ALTER TABLE provider_businesses 
ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb;

ALTER TABLE provider_businesses 
ADD COLUMN IF NOT EXISTS staff JSONB DEFAULT '[]'::jsonb;

ALTER TABLE provider_businesses 
ADD COLUMN IF NOT EXISTS discounts JSONB DEFAULT '[]'::jsonb;

ALTER TABLE provider_businesses 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- 2. SHOP_STAFF TABLE
-- ============================================
DROP TABLE IF EXISTS shop_staff CASCADE;

CREATE TABLE shop_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(100),
    specialties TEXT[] DEFAULT '{}',
    availability JSONB DEFAULT '{}',
    bio TEXT,
    experience_years INTEGER DEFAULT 0,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
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

-- ============================================
-- 3. SHOP_SERVICES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shop_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration INTEGER DEFAULT 60,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. SHOP_DISCOUNTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS shop_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    type VARCHAR(50) NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    description TEXT,
    code VARCHAR(50),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SHOP_ADDRESSES TABLE (for optimized schema)
-- ============================================
CREATE TABLE IF NOT EXISTS shop_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES provider_businesses(id) ON DELETE CASCADE,
    address_type VARCHAR(50) DEFAULT 'primary',
    street_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_shop_staff_shop_id ON shop_staff(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_provider_id ON shop_staff(provider_id);
CREATE INDEX IF NOT EXISTS idx_shop_services_shop_id ON shop_services(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_services_provider_id ON shop_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_shop_discounts_shop_id ON shop_discounts(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_discounts_provider_id ON shop_discounts(provider_id);
CREATE INDEX IF NOT EXISTS idx_shop_addresses_shop_id ON shop_addresses(shop_id);

-- ============================================
-- 7. SETUP ROW LEVEL SECURITY (RLS)
-- ============================================

-- Provider Businesses
ALTER TABLE provider_businesses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all shop operations" ON provider_businesses;
CREATE POLICY "Allow all shop operations" ON provider_businesses
    FOR ALL USING (true) WITH CHECK (true);

-- Shop Staff
ALTER TABLE shop_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all staff operations" ON shop_staff;
CREATE POLICY "Allow all staff operations" ON shop_staff
    FOR ALL USING (true) WITH CHECK (true);

-- Shop Services
ALTER TABLE shop_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all service operations" ON shop_services;
CREATE POLICY "Allow all service operations" ON shop_services
    FOR ALL USING (true) WITH CHECK (true);

-- Shop Discounts
ALTER TABLE shop_discounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all discount operations" ON shop_discounts;
CREATE POLICY "Allow all discount operations" ON shop_discounts
    FOR ALL USING (true) WITH CHECK (true);

-- Shop Addresses
ALTER TABLE shop_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all address operations" ON shop_addresses;
CREATE POLICY "Allow all address operations" ON shop_addresses
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================
GRANT ALL ON provider_businesses TO anon, authenticated, service_role;
GRANT ALL ON shop_staff TO anon, authenticated, service_role;
GRANT ALL ON shop_services TO anon, authenticated, service_role;
GRANT ALL ON shop_discounts TO anon, authenticated, service_role;
GRANT ALL ON shop_addresses TO anon, authenticated, service_role;

-- ============================================
-- 9. CREATE UPDATE TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to all tables
DROP TRIGGER IF EXISTS update_shop_staff_updated_at ON shop_staff;
CREATE TRIGGER update_shop_staff_updated_at
    BEFORE UPDATE ON shop_staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_shop_services_updated_at ON shop_services;
CREATE TRIGGER update_shop_services_updated_at
    BEFORE UPDATE ON shop_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_shop_discounts_updated_at ON shop_discounts;
CREATE TRIGGER update_shop_discounts_updated_at
    BEFORE UPDATE ON shop_discounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_shop_addresses_updated_at ON shop_addresses;
CREATE TRIGGER update_shop_addresses_updated_at
    BEFORE UPDATE ON shop_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 10. STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('shop-images', 'shop-images', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('user-avatars', 'user-avatars', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('shop-logos', 'shop-logos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 11. FORCE SCHEMA CACHE REFRESH
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ============================================
-- 12. VERIFY DEPLOYMENT
-- ============================================
DO $$
DECLARE
    missing_columns TEXT := '';
BEGIN
    -- Check shop_staff columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_staff' AND column_name = 'work_schedule') THEN
        missing_columns := missing_columns || 'shop_staff.work_schedule, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_staff' AND column_name = 'leave_dates') THEN
        missing_columns := missing_columns || 'shop_staff.leave_dates, ';
    END IF;
    
    -- Check provider_businesses columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provider_businesses' AND column_name = 'business_hours') THEN
        missing_columns := missing_columns || 'provider_businesses.business_hours, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'provider_businesses' AND column_name = 'special_days') THEN
        missing_columns := missing_columns || 'provider_businesses.special_days, ';
    END IF;
    
    IF missing_columns != '' THEN
        RAISE EXCEPTION 'Missing columns: %', missing_columns;
    ELSE
        RAISE NOTICE 'All required columns exist!';
    END IF;
END $$;

SELECT 'COMPLETE SCHEMA DEPLOYED SUCCESSFULLY!' as result,
       'All tables, columns, indexes, and permissions are ready.' as status;