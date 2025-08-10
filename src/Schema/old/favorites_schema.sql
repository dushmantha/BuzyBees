-- ===============================================
-- FAVORITES SCHEMA
-- ===============================================
-- This schema creates a favorites table for users to save their favorite shops

-- ===============================================
-- FAVORITES TABLE
-- ===============================================

CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure user can only favorite a shop once
  UNIQUE(user_id, shop_id)
);

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_shop_id ON user_favorites(shop_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at);

-- ===============================================
-- UPDATE TRIGGER
-- ===============================================

-- Trigger for updated_at timestamp
DROP TRIGGER IF EXISTS update_user_favorites_updated_at ON user_favorites;
CREATE TRIGGER update_user_favorites_updated_at 
  BEFORE UPDATE ON user_favorites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- ROW LEVEL SECURITY
-- ===============================================

-- Enable RLS
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can manage their own favorites" ON user_favorites;

-- Users can only see and manage their own favorites
CREATE POLICY "Users can manage their own favorites" ON user_favorites
    FOR ALL USING (user_id = auth.uid());

-- ===============================================
-- HELPER FUNCTIONS
-- ===============================================

-- Function to toggle favorite status
CREATE OR REPLACE FUNCTION toggle_user_favorite(
  p_user_id UUID,
  p_shop_id UUID
)
RETURNS JSON AS $$
DECLARE
  existing_favorite UUID;
  result JSON;
BEGIN
  -- Check if favorite already exists
  SELECT id INTO existing_favorite 
  FROM user_favorites 
  WHERE user_id = p_user_id AND shop_id = p_shop_id;
  
  IF existing_favorite IS NOT NULL THEN
    -- Remove favorite
    DELETE FROM user_favorites WHERE id = existing_favorite;
    
    SELECT json_build_object(
      'success', true,
      'is_favorite', false,
      'message', 'Removed from favorites'
    ) INTO result;
  ELSE
    -- Add favorite
    INSERT INTO user_favorites (user_id, shop_id)
    VALUES (p_user_id, p_shop_id);
    
    SELECT json_build_object(
      'success', true,
      'is_favorite', true,
      'message', 'Added to favorites'
    ) INTO result;
  END IF;
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'is_favorite', false
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if shop is favorited by user
CREATE OR REPLACE FUNCTION is_shop_favorite(
  p_user_id UUID,
  p_shop_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  favorite_exists BOOLEAN := false;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_favorites 
    WHERE user_id = p_user_id AND shop_id = p_shop_id
  ) INTO favorite_exists;
  
  RETURN favorite_exists;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's favorite shops
CREATE OR REPLACE FUNCTION get_user_favorites(p_user_id UUID)
RETURNS TABLE (
  favorite_id UUID,
  shop_id UUID,
  shop_name TEXT,
  shop_category TEXT,
  shop_image_url TEXT,
  shop_logo_url TEXT,
  shop_rating NUMERIC,
  shop_city TEXT,
  shop_country TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uf.id as favorite_id,
    pb.id as shop_id,
    pb.name as shop_name,
    pb.category as shop_category,
    pb.image_url as shop_image_url,
    pb.logo_url as shop_logo_url,
    COALESCE(pb.rating, 0) as shop_rating,
    pb.city as shop_city,
    pb.country as shop_country,
    uf.created_at
  FROM user_favorites uf
  JOIN provider_businesses pb ON uf.shop_id = pb.id
  WHERE uf.user_id = p_user_id
  ORDER BY uf.created_at DESC;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error getting user favorites: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- VERIFICATION
-- ===============================================

SELECT 
    '✅ Favorites schema setup complete!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_favorites') as table_created,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_favorites') as columns_count;