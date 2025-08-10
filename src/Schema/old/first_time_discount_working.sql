-- Add first_time_discount_active column to provider_businesses table
ALTER TABLE provider_businesses
ADD COLUMN IF NOT EXISTS first_time_discount_active BOOLEAN DEFAULT true;

-- Update existing provider businesses to have the feature enabled by default
UPDATE provider_businesses
SET first_time_discount_active = true
WHERE first_time_discount_active IS NULL;

-- Create a comment for documentation
COMMENT ON COLUMN provider_businesses.first_time_discount_active IS 
'Indicates whether the shop offers automatic 25% discount to first-time customers. Default is true to encourage customer acquisition.';

-- Create first-time discount tracking table
-- Since bookings use email/phone instead of customer_id, we'll track by email
CREATE TABLE IF NOT EXISTS shop_first_time_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  booking_id UUID,
  discount_amount DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure each customer can only get first-time discount once per shop
  -- Use email as primary identifier, phone as fallback
  UNIQUE(shop_id, customer_email),
  CHECK (customer_email IS NOT NULL OR customer_phone IS NOT NULL)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_first_time_discounts_shop ON shop_first_time_discounts(shop_id);
CREATE INDEX IF NOT EXISTS idx_first_time_discounts_email ON shop_first_time_discounts(customer_email);
CREATE INDEX IF NOT EXISTS idx_first_time_discounts_phone ON shop_first_time_discounts(customer_phone);
CREATE INDEX IF NOT EXISTS idx_first_time_discounts_created ON shop_first_time_discounts(created_at);

-- Function to check if customer is eligible for first-time discount
CREATE OR REPLACE FUNCTION check_first_time_discount_eligibility(
  p_shop_id UUID,
  p_customer_email VARCHAR(255),
  p_customer_phone VARCHAR(20)
) RETURNS BOOLEAN AS $$
DECLARE
  v_shop_active BOOLEAN;
  v_has_previous_booking BOOLEAN;
  v_has_used_discount BOOLEAN;
BEGIN
  -- Check if shop has first-time discount active
  SELECT first_time_discount_active INTO v_shop_active
  FROM provider_businesses
  WHERE id = p_shop_id;
  
  IF NOT v_shop_active OR v_shop_active IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if customer has already used first-time discount
  SELECT EXISTS (
    SELECT 1 FROM shop_first_time_discounts
    WHERE shop_id = p_shop_id 
    AND (
      (customer_email IS NOT NULL AND customer_email = p_customer_email) OR
      (customer_phone IS NOT NULL AND customer_phone = p_customer_phone)
    )
  ) INTO v_has_used_discount;
  
  IF v_has_used_discount THEN
    RETURN false;
  END IF;
  
  -- Check if customer has any previous completed bookings
  SELECT EXISTS (
    SELECT 1 FROM shop_bookings
    WHERE shop_id = p_shop_id 
    AND (
      (customer_email IS NOT NULL AND customer_email = p_customer_email) OR
      (customer_phone IS NOT NULL AND customer_phone = p_customer_phone)
    )
    AND status IN ('completed', 'confirmed')
  ) INTO v_has_previous_booking;
  
  RETURN NOT v_has_previous_booking;
END;
$$ LANGUAGE plpgsql;

-- Function to apply first-time discount
CREATE OR REPLACE FUNCTION apply_first_time_discount(
  p_shop_id UUID,
  p_customer_email VARCHAR(255),
  p_customer_phone VARCHAR(20),
  p_booking_id UUID,
  p_original_price DECIMAL(10,2)
) RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_discount_amount DECIMAL(10,2);
  v_final_price DECIMAL(10,2);
BEGIN
  -- Check eligibility
  IF NOT check_first_time_discount_eligibility(p_shop_id, p_customer_email, p_customer_phone) THEN
    RETURN p_original_price;
  END IF;
  
  -- Calculate 25% discount
  v_discount_amount := p_original_price * 0.25;
  v_final_price := p_original_price - v_discount_amount;
  
  -- Record the discount usage
  INSERT INTO shop_first_time_discounts (
    shop_id, customer_email, customer_phone, booking_id, 
    discount_amount, original_price
  ) VALUES (
    p_shop_id, p_customer_email, p_customer_phone, p_booking_id,
    v_discount_amount, p_original_price
  ) ON CONFLICT (shop_id, customer_email) DO NOTHING;
  
  RETURN v_final_price;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically apply first-time discount on booking creation
CREATE OR REPLACE FUNCTION auto_apply_first_time_discount()
RETURNS TRIGGER AS $$
DECLARE
  v_is_eligible BOOLEAN;
  v_discount_amount DECIMAL(10,2);
  v_original_price DECIMAL(10,2);
BEGIN
  -- Only apply on insert, not update
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Skip if discount already applied
  IF NEW.discount_amount IS NOT NULL AND NEW.discount_amount > 0 THEN
    RETURN NEW;
  END IF;
  
  -- Get the original price from total_amount
  v_original_price := NEW.total_amount;
  
  -- Check if eligible for first-time discount
  v_is_eligible := check_first_time_discount_eligibility(NEW.shop_id, NEW.customer_email, NEW.customer_phone);
  
  IF v_is_eligible THEN
    -- Apply 25% discount
    v_discount_amount := v_original_price * 0.25;
    NEW.discount_amount := COALESCE(NEW.discount_amount, 0) + v_discount_amount;
    NEW.final_price := v_original_price - NEW.discount_amount;
    
    -- Add a note about the discount
    NEW.notes := COALESCE(NEW.notes || E'\n', '') || 
                 'First-time customer discount (25%) applied: -' || v_discount_amount::TEXT || ' kr';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Check if shop_bookings table exists before creating trigger
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_bookings') THEN
    -- Add columns to shop_bookings if they don't exist
    ALTER TABLE shop_bookings
    ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS final_price DECIMAL(10,2);

    -- Update final_price for existing bookings where it's NULL
    UPDATE shop_bookings
    SET final_price = total_amount - COALESCE(discount_amount, 0)
    WHERE final_price IS NULL AND total_amount IS NOT NULL;
    
    -- Create or replace the trigger
    DROP TRIGGER IF EXISTS apply_first_time_discount_trigger ON shop_bookings;
    CREATE TRIGGER apply_first_time_discount_trigger
      BEFORE INSERT ON shop_bookings
      FOR EACH ROW
      EXECUTE FUNCTION auto_apply_first_time_discount();
  END IF;
END $$;

-- Create a simple function to get discount status for display
CREATE OR REPLACE FUNCTION get_first_time_discount_status(
  p_shop_id UUID,
  p_customer_email VARCHAR(255),
  p_customer_phone VARCHAR(20)
) RETURNS TABLE (
  is_eligible BOOLEAN,
  discount_percentage INTEGER,
  discount_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    check_first_time_discount_eligibility(p_shop_id, p_customer_email, p_customer_phone),
    25,
    COALESCE((SELECT first_time_discount_active FROM provider_businesses WHERE id = p_shop_id), false);
END;
$$ LANGUAGE plpgsql;

-- Create a view for analytics showing first-time discount usage
CREATE OR REPLACE VIEW first_time_discount_analytics AS
SELECT 
  pb.id as shop_id,
  pb.name as shop_name,
  pb.first_time_discount_active,
  COUNT(DISTINCT ftd.id) as total_discounts_used,
  SUM(ftd.discount_amount) as total_discount_amount,
  AVG(ftd.discount_amount) as avg_discount_amount,
  COUNT(DISTINCT COALESCE(ftd.customer_email, ftd.customer_phone)) as unique_customers
FROM provider_businesses pb
LEFT JOIN shop_first_time_discounts ftd ON ftd.shop_id = pb.id
GROUP BY pb.id, pb.name, pb.first_time_discount_active;

-- Add a function to manually apply first-time discount to a booking
-- This can be used when creating bookings through the app
CREATE OR REPLACE FUNCTION calculate_booking_with_first_time_discount(
  p_shop_id UUID,
  p_customer_email VARCHAR(255),
  p_customer_phone VARCHAR(20),
  p_service_price DECIMAL(10,2),
  p_duration_minutes INTEGER
) RETURNS TABLE (
  original_amount DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  final_amount DECIMAL(10,2),
  is_first_time_discount BOOLEAN,
  discount_message TEXT
) AS $$
DECLARE
  v_is_eligible BOOLEAN;
  v_discount DECIMAL(10,2);
BEGIN
  -- Check eligibility
  v_is_eligible := check_first_time_discount_eligibility(p_shop_id, p_customer_email, p_customer_phone);
  
  IF v_is_eligible THEN
    v_discount := p_service_price * 0.25;
    RETURN QUERY SELECT
      p_service_price,
      v_discount,
      p_service_price - v_discount,
      true,
      'First-time customer discount (25% off) applied!'::TEXT;
  ELSE
    RETURN QUERY SELECT
      p_service_price,
      0::DECIMAL(10,2),
      p_service_price,
      false,
      NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;