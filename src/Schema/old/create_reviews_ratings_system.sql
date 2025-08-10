-- ===============================================
-- CREATE REVIEWS AND RATINGS SYSTEM
-- ===============================================
-- This script creates tables and functions for customer reviews and ratings

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Booking and service info
  booking_id UUID NOT NULL REFERENCES shop_bookings(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES shop_services(id) ON DELETE SET NULL,
  
  -- Customer info
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  comment TEXT,
  
  -- Review metadata
  is_verified BOOLEAN DEFAULT true, -- Verified bookings only
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Response from provider
  provider_response TEXT,
  provider_responded_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reviews_shop_id ON reviews(shop_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_is_public ON reviews(is_public);

-- Create unique constraint to prevent duplicate reviews per booking
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_booking 
ON reviews(booking_id) WHERE is_public = true;

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
-- Customers can view public reviews for any shop
CREATE POLICY "Anyone can view public reviews" ON reviews
  FOR SELECT USING (is_public = true);

-- Providers can view all reviews for their shops
CREATE POLICY "Providers can view own shop reviews" ON reviews
  FOR SELECT USING (provider_id = auth.uid());

-- Only verified bookings can create reviews (handled by application logic)
CREATE POLICY "Customers can create reviews for their bookings" ON reviews
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shop_bookings 
      WHERE id = booking_id 
      AND status = 'completed'
      AND (customer_email = auth.email() OR customer_phone IS NOT NULL)
    )
  );

-- Providers can respond to reviews on their shops
CREATE POLICY "Providers can update responses to their reviews" ON reviews
  FOR UPDATE USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Add response time tracking to shop_bookings table
ALTER TABLE shop_bookings 
ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS response_action VARCHAR(20) CHECK (response_action IN ('accepted', 'rejected', 'auto_accepted'));

-- Create function to calculate and update response time
CREATE OR REPLACE FUNCTION update_booking_response_time()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed from pending to confirmed/cancelled and no response time set yet
  IF OLD.status = 'pending' 
     AND NEW.status IN ('confirmed', 'cancelled') 
     AND OLD.response_time_minutes IS NULL THEN
    
    NEW.responded_at = CURRENT_TIMESTAMP;
    NEW.response_time_minutes = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - NEW.created_at)) / 60;
    NEW.response_action = CASE 
      WHEN NEW.status = 'confirmed' THEN 'accepted'
      WHEN NEW.status = 'cancelled' THEN 'rejected'
      ELSE NULL
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for response time tracking
DROP TRIGGER IF EXISTS trigger_update_booking_response_time ON shop_bookings;
CREATE TRIGGER trigger_update_booking_response_time
  BEFORE UPDATE ON shop_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_response_time();

-- Function to get shop rating statistics
CREATE OR REPLACE FUNCTION get_shop_rating_stats(p_shop_id UUID)
RETURNS TABLE(
  average_rating DECIMAL(3,2),
  total_reviews INTEGER,
  rating_distribution JSON
) AS $$
BEGIN
  RETURN QUERY
  WITH rating_stats AS (
    SELECT 
      ROUND(AVG(rating), 2) as avg_rating,
      COUNT(*)::INTEGER as total_count,
      json_object_agg(
        rating::TEXT, 
        rating_count
      ) as distribution
    FROM (
      SELECT 
        rating,
        COUNT(*)::INTEGER as rating_count
      FROM reviews 
      WHERE shop_id = p_shop_id 
        AND is_public = true
      GROUP BY rating
    ) rating_breakdown
  )
  SELECT 
    COALESCE(avg_rating, 0.0)::DECIMAL(3,2),
    COALESCE(total_count, 0),
    COALESCE(distribution, '{}'::JSON)
  FROM rating_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get provider's overall rating across all shops
CREATE OR REPLACE FUNCTION get_provider_rating_stats(p_provider_id UUID)
RETURNS TABLE(
  average_rating DECIMAL(3,2),
  total_reviews INTEGER,
  shops_with_reviews INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ROUND(AVG(rating), 2), 0.0)::DECIMAL(3,2) as avg_rating,
    COUNT(*)::INTEGER as total_count,
    COUNT(DISTINCT shop_id)::INTEGER as shops_count
  FROM reviews 
  WHERE provider_id = p_provider_id 
    AND is_public = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get average response time for provider
CREATE OR REPLACE FUNCTION get_provider_response_stats(p_provider_id UUID)
RETURNS TABLE(
  average_response_minutes DECIMAL(8,2),
  response_rate_percentage INTEGER,
  total_responded INTEGER,
  total_bookings INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH response_stats AS (
    SELECT 
      AVG(response_time_minutes) as avg_response,
      COUNT(*) FILTER (WHERE response_time_minutes IS NOT NULL)::INTEGER as responded,
      COUNT(*)::INTEGER as total
    FROM shop_bookings 
    WHERE provider_id = p_provider_id
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND status IN ('confirmed', 'cancelled', 'completed')
  )
  SELECT 
    COALESCE(avg_response, 0.0)::DECIMAL(8,2),
    CASE 
      WHEN total > 0 THEN ROUND((responded::DECIMAL / total::DECIMAL) * 100)::INTEGER
      ELSE 0
    END,
    responded,
    total
  FROM response_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON reviews TO authenticated;
GRANT SELECT ON reviews TO anon;
GRANT INSERT ON reviews TO authenticated;
GRANT UPDATE ON reviews TO authenticated;

GRANT EXECUTE ON FUNCTION get_shop_rating_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_shop_rating_stats(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_provider_rating_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_response_stats(UUID) TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🌟 REVIEWS & RATINGS SYSTEM CREATED!';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables created:';
    RAISE NOTICE '  ✅ reviews - Customer reviews and ratings';
    RAISE NOTICE '';
    RAISE NOTICE 'Booking enhancements:';
    RAISE NOTICE '  ✅ response_time_minutes - Tracks provider response time';
    RAISE NOTICE '  ✅ responded_at - When provider responded';
    RAISE NOTICE '  ✅ response_action - accepted/rejected/auto_accepted';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions available:';
    RAISE NOTICE '  ✅ get_shop_rating_stats() - Average rating per shop';
    RAISE NOTICE '  ✅ get_provider_rating_stats() - Overall provider rating';
    RAISE NOTICE '  ✅ get_provider_response_stats() - Response time metrics';
    RAISE NOTICE '';
    RAISE NOTICE 'Features enabled:';
    RAISE NOTICE '  ⭐ 1-5 star rating system';
    RAISE NOTICE '  💬 Customer reviews with optional comments';
    RAISE NOTICE '  🔒 Verified reviews (only from completed bookings)';
    RAISE NOTICE '  💨 Automatic response time tracking';
    RAISE NOTICE '  📊 Rating statistics and response metrics';
    RAISE NOTICE '';
END $$;