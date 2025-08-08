-- Create user_favorites table manually
-- Run this in your Supabase SQL editor

DROP TABLE IF EXISTS user_favorites;

CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  shop_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, shop_id)
);

-- Create indexes
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_shop_id ON user_favorites(shop_id);

-- Verify table was created
SELECT 
    'user_favorites table created successfully' as status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_favorites') as columns_count;