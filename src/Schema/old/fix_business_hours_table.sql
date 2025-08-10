-- Create shop_business_hours table if missing and fix RLS
CREATE TABLE IF NOT EXISTS shop_business_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    is_open BOOLEAN NOT NULL DEFAULT true,
    open_time TIME,
    close_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shop_id, day_of_week)
);

-- Fix RLS on business hours table
ALTER TABLE shop_business_hours DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage business hours" ON shop_business_hours;
DROP POLICY IF EXISTS "Allow all business hours operations" ON shop_business_hours;

CREATE POLICY "Allow all business hours operations" ON shop_business_hours
    FOR ALL 
    TO PUBLIC
    USING (true)
    WITH CHECK (true);

ALTER TABLE shop_business_hours ENABLE ROW LEVEL SECURITY;

GRANT ALL PRIVILEGES ON shop_business_hours TO PUBLIC;
GRANT ALL PRIVILEGES ON shop_business_hours TO anon;
GRANT ALL PRIVILEGES ON shop_business_hours TO authenticated;