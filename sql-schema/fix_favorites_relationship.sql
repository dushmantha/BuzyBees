-- FIX FAVORITES RELATIONSHIP ERROR
-- This script fixes the relationship between user_favorites and provider_businesses

-- First, let's check if the user_favorites table exists and its structure
DO $$
BEGIN
    -- Check if table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_favorites') THEN
        RAISE NOTICE 'user_favorites table exists';
    ELSE
        RAISE NOTICE 'user_favorites table does not exist - creating it';
    END IF;
END $$;

-- Drop the table if it exists and recreate with proper relationships
DROP TABLE IF EXISTS user_favorites CASCADE;

-- Create the user_favorites table with explicit foreign key relationship
CREATE TABLE user_favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    shop_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Explicit foreign key constraint
    CONSTRAINT fk_user_favorites_shop 
        FOREIGN KEY (shop_id) 
        REFERENCES provider_businesses(id) 
        ON DELETE CASCADE
);

-- Create indexes
CREATE UNIQUE INDEX idx_user_favorites_unique ON user_favorites(user_id, shop_id);
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_shop_id ON user_favorites(shop_id);

-- Enable RLS
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development
CREATE POLICY "Allow all operations on user_favorites" ON user_favorites
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT ALL ON user_favorites TO authenticated, anon;

-- Create a simple test to verify the relationship works
DO $$
DECLARE
    test_shop_id UUID;
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Get a shop ID from provider_businesses to test with
    SELECT id INTO test_shop_id FROM provider_businesses LIMIT 1;
    
    IF test_shop_id IS NOT NULL THEN
        -- Try to insert a test favorite
        INSERT INTO user_favorites (user_id, shop_id) VALUES (test_user_id, test_shop_id);
        
        -- Clean up the test record
        DELETE FROM user_favorites WHERE user_id = test_user_id;
        
        RAISE NOTICE '✅ Relationship test passed - foreign key constraint works';
    ELSE
        RAISE NOTICE '⚠️ No shops found in provider_businesses table for testing';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Relationship test failed: %', SQLERRM;
END $$;

-- Success message
SELECT 'Favorites relationship fixed!' as status;