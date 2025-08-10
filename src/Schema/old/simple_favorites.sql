-- Simple favorites table without RLS (for testing)
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, shop_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_shop_id ON user_favorites(shop_id);

-- Update trigger for updated_at
DROP TRIGGER IF EXISTS update_user_favorites_updated_at ON user_favorites;
CREATE TRIGGER update_user_favorites_updated_at 
  BEFORE UPDATE ON user_favorites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();