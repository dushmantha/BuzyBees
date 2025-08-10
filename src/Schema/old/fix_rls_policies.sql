-- Fix Row Level Security policies
ALTER TABLE provider_businesses DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shops" ON provider_businesses;
DROP POLICY IF EXISTS "Users can insert shops" ON provider_businesses;
DROP POLICY IF EXISTS "Users can update own shops" ON provider_businesses;
DROP POLICY IF EXISTS "Users can delete own shops" ON provider_businesses;
DROP POLICY IF EXISTS "Allow all shop operations" ON provider_businesses;

CREATE POLICY "Allow all shop operations" ON provider_businesses
    FOR ALL 
    TO PUBLIC
    USING (true)
    WITH CHECK (true);

ALTER TABLE provider_businesses ENABLE ROW LEVEL SECURITY;

GRANT ALL PRIVILEGES ON provider_businesses TO PUBLIC;
GRANT ALL PRIVILEGES ON provider_businesses TO anon;
GRANT ALL PRIVILEGES ON provider_businesses TO authenticated;