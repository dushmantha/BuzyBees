-- ===============================================
-- BUZYBEES NORMALIZED SCHEMA - SEPARATE TABLES
-- ===============================================
-- This schema creates separate tables for staff, services, and discounts
-- with proper foreign key relationships to shops and providers

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================================
-- PART 1: MAIN SHOP TABLE (SIMPLIFIED)
-- ===============================================

-- Update provider_businesses table to remove JSONB arrays
-- We'll keep the existing table and add the new normalized tables

-- ===============================================
-- PART 2: SHOP STAFF TABLE
-- ===============================================

CREATE TABLE IF NOT EXISTS shop_staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(100),
  
  -- Professional Info
  specialties JSONB DEFAULT '[]'::jsonb,
  bio TEXT,
  experience_years INTEGER DEFAULT 0,
  avatar_url TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- PART 3: SHOP SERVICES TABLE
-- ===============================================

CREATE TABLE IF NOT EXISTS shop_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Service Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  duration INTEGER NOT NULL DEFAULT 60 CHECK (duration > 0), -- in minutes
  category VARCHAR(100),
  
  -- Staff Assignment (array of staff IDs)
  assigned_staff JSONB DEFAULT '[]'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- PART 4: SHOP DISCOUNTS TABLE
-- ===============================================

CREATE TABLE IF NOT EXISTS shop_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Discount Info
  type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value DECIMAL(10,2) NOT NULL CHECK (value > 0),
  description TEXT NOT NULL,
  
  -- Validity
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Usage Limits
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  min_amount DECIMAL(10,2),
  max_discount DECIMAL(10,2),
  
  -- Applicable Services (array of service IDs)
  applicable_services JSONB DEFAULT '[]'::jsonb,
  
  -- Conditions
  conditions JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure end_date is after start_date
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- ===============================================
-- PART 5: INDEXES FOR PERFORMANCE
-- ===============================================

-- Staff indexes
CREATE INDEX IF NOT EXISTS idx_shop_staff_shop_id ON shop_staff(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_provider_id ON shop_staff(provider_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_active ON shop_staff(is_active);
CREATE INDEX IF NOT EXISTS idx_shop_staff_email ON shop_staff(email);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_shop_services_shop_id ON shop_services(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_services_provider_id ON shop_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_shop_services_active ON shop_services(is_active);
CREATE INDEX IF NOT EXISTS idx_shop_services_category ON shop_services(category);

-- Discounts indexes  
CREATE INDEX IF NOT EXISTS idx_shop_discounts_shop_id ON shop_discounts(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_discounts_provider_id ON shop_discounts(provider_id);
CREATE INDEX IF NOT EXISTS idx_shop_discounts_active ON shop_discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_shop_discounts_dates ON shop_discounts(start_date, end_date);

-- ===============================================
-- PART 6: UPDATE TRIGGERS
-- ===============================================

-- Triggers for updated_at timestamps
DROP TRIGGER IF EXISTS update_shop_staff_updated_at ON shop_staff;
CREATE TRIGGER update_shop_staff_updated_at BEFORE UPDATE ON shop_staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shop_services_updated_at ON shop_services;  
CREATE TRIGGER update_shop_services_updated_at BEFORE UPDATE ON shop_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shop_discounts_updated_at ON shop_discounts;
CREATE TRIGGER update_shop_discounts_updated_at BEFORE UPDATE ON shop_discounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- PROVIDER CONSISTENCY TRIGGERS
-- ===============================================

-- Function to validate provider consistency
CREATE OR REPLACE FUNCTION validate_provider_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the provider_id matches the shop's provider_id
  IF NOT EXISTS (
    SELECT 1 FROM provider_businesses 
    WHERE id = NEW.shop_id AND provider_id = NEW.provider_id
  ) THEN
    RAISE EXCEPTION 'Provider ID does not match shop owner. Cannot create % for shop % with provider %', 
      TG_TABLE_NAME, NEW.shop_id, NEW.provider_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply consistency triggers
DROP TRIGGER IF EXISTS validate_staff_provider_consistency ON shop_staff;
CREATE TRIGGER validate_staff_provider_consistency 
  BEFORE INSERT OR UPDATE ON shop_staff
  FOR EACH ROW EXECUTE FUNCTION validate_provider_consistency();

DROP TRIGGER IF EXISTS validate_service_provider_consistency ON shop_services;
CREATE TRIGGER validate_service_provider_consistency 
  BEFORE INSERT OR UPDATE ON shop_services
  FOR EACH ROW EXECUTE FUNCTION validate_provider_consistency();

DROP TRIGGER IF EXISTS validate_discount_provider_consistency ON shop_discounts;
CREATE TRIGGER validate_discount_provider_consistency 
  BEFORE INSERT OR UPDATE ON shop_discounts
  FOR EACH ROW EXECUTE FUNCTION validate_provider_consistency();

-- ===============================================
-- PART 7: ROW LEVEL SECURITY
-- ===============================================

-- Enable RLS
ALTER TABLE shop_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_discounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Providers can manage their shop staff" ON shop_staff;
DROP POLICY IF EXISTS "Providers can manage their shop services" ON shop_services;
DROP POLICY IF EXISTS "Providers can manage their shop discounts" ON shop_discounts;

-- Staff policies
CREATE POLICY "Providers can manage their shop staff" ON shop_staff
    FOR ALL USING (provider_id = auth.uid());

-- Services policies  
CREATE POLICY "Providers can manage their shop services" ON shop_services
    FOR ALL USING (provider_id = auth.uid());

-- Discounts policies
CREATE POLICY "Providers can manage their shop discounts" ON shop_discounts
    FOR ALL USING (provider_id = auth.uid());

-- ===============================================
-- PART 8: HELPER FUNCTIONS
-- ===============================================

-- Function to create a shop with normalized tables
CREATE OR REPLACE FUNCTION create_shop_normalized(
  p_provider_id UUID,
  p_shop_data JSONB,
  p_staff JSONB DEFAULT '[]'::JSONB,
  p_services JSONB DEFAULT '[]'::JSONB,
  p_discounts JSONB DEFAULT '[]'::JSONB
)
RETURNS JSON AS $$
DECLARE
  new_shop_id UUID;
  staff_item JSONB;
  service_item JSONB;
  discount_item JSONB;
  result JSON;
BEGIN
  -- Debug logging
  RAISE NOTICE 'Creating normalized shop for provider: %', p_provider_id;
  RAISE NOTICE 'Shop data: %', p_shop_data::TEXT;
  RAISE NOTICE 'Staff count: %', jsonb_array_length(p_staff);
  RAISE NOTICE 'Services count: %', jsonb_array_length(p_services);
  RAISE NOTICE 'Discounts count: %', jsonb_array_length(p_discounts);
  
  -- Validate required fields
  IF p_shop_data->>'name' IS NULL OR p_shop_data->>'name' = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Shop name is required',
      'shop_id', NULL
    );
  END IF;
  
  -- Insert new shop (basic fields only, no JSONB arrays)
  INSERT INTO provider_businesses (
    provider_id, name, category, description, 
    address, city, state, country,
    phone, email, website_url,
    logo_url, image_url, images,
    business_hours_start, business_hours_end,
    timezone, advance_booking_days, slot_duration, buffer_time, auto_approval,
    is_active
  )
  VALUES (
    p_provider_id, 
    p_shop_data->>'name',
    COALESCE(p_shop_data->>'category', 'Beauty & Wellness'),
    COALESCE(p_shop_data->>'description', ''),
    COALESCE(p_shop_data->>'address', ''),
    COALESCE(p_shop_data->>'city', ''),
    COALESCE(p_shop_data->>'state', ''),
    COALESCE(p_shop_data->>'country', 'Sweden'),
    COALESCE(p_shop_data->>'phone', ''),
    COALESCE(p_shop_data->>'email', ''),
    p_shop_data->>'website_url',
    p_shop_data->>'logo_url',
    COALESCE(p_shop_data->>'image_url', p_shop_data->>'logo_url', ''),
    COALESCE(p_shop_data->'images', '[]'::JSONB),
    COALESCE((p_shop_data->>'business_hours_start')::TIME, '09:00'::TIME),
    COALESCE((p_shop_data->>'business_hours_end')::TIME, '17:00'::TIME),
    COALESCE(p_shop_data->>'timezone', 'Europe/Stockholm'),
    COALESCE((p_shop_data->>'advance_booking_days')::INTEGER, 30),
    COALESCE((p_shop_data->>'slot_duration')::INTEGER, 60),
    COALESCE((p_shop_data->>'buffer_time')::INTEGER, 15),
    COALESCE((p_shop_data->>'auto_approval')::BOOLEAN, true),
    COALESCE((p_shop_data->>'is_active')::BOOLEAN, true)
  )
  RETURNING id INTO new_shop_id;
  
  RAISE NOTICE 'Shop created with ID: %', new_shop_id;
  
  -- Insert staff members
  FOR staff_item IN SELECT * FROM jsonb_array_elements(p_staff)
  LOOP
    INSERT INTO shop_staff (
      shop_id, provider_id, name, email, phone, role,
      specialties, bio, experience_years, avatar_url, is_active
    )
    VALUES (
      new_shop_id,
      p_provider_id,
      staff_item->>'name',
      staff_item->>'email',
      staff_item->>'phone',
      staff_item->>'role',
      COALESCE(staff_item->'specialties', '[]'::JSONB),
      staff_item->>'bio',
      COALESCE((staff_item->>'experience_years')::INTEGER, 0),
      staff_item->>'avatar_url',
      COALESCE((staff_item->>'is_active')::BOOLEAN, true)
    );
    RAISE NOTICE 'Inserted staff: %', staff_item->>'name';
  END LOOP;
  
  -- Insert services
  FOR service_item IN SELECT * FROM jsonb_array_elements(p_services)
  LOOP
    INSERT INTO shop_services (
      shop_id, provider_id, name, description, price, duration,
      category, assigned_staff, is_active
    )
    VALUES (
      new_shop_id,
      p_provider_id,
      service_item->>'name',
      service_item->>'description',
      COALESCE((service_item->>'price')::DECIMAL, 0),
      COALESCE((service_item->>'duration')::INTEGER, 60),
      service_item->>'category',
      COALESCE(service_item->'assigned_staff', '[]'::JSONB),
      COALESCE((service_item->>'is_active')::BOOLEAN, true)
    );
    RAISE NOTICE 'Inserted service: %', service_item->>'name';
  END LOOP;
  
  -- Insert discounts
  FOR discount_item IN SELECT * FROM jsonb_array_elements(p_discounts)
  LOOP
    INSERT INTO shop_discounts (
      shop_id, provider_id, type, value, description,
      start_date, end_date, usage_limit, min_amount, max_discount,
      applicable_services, conditions, is_active
    )
    VALUES (
      new_shop_id,
      p_provider_id,
      discount_item->>'type',
      (discount_item->>'value')::DECIMAL,
      discount_item->>'description',
      (discount_item->>'start_date')::DATE,
      (discount_item->>'end_date')::DATE,
      (discount_item->>'usage_limit')::INTEGER,
      (discount_item->>'min_amount')::DECIMAL,
      (discount_item->>'max_discount')::DECIMAL,
      COALESCE(discount_item->'applicable_services', '[]'::JSONB),
      COALESCE(discount_item->'conditions', '{}'::JSONB),
      COALESCE((discount_item->>'is_active')::BOOLEAN, true)
    );
    RAISE NOTICE 'Inserted discount: %', discount_item->>'description';
  END LOOP;
  
  -- Return success response
  SELECT json_build_object(
    'success', true,
    'shop_id', new_shop_id,
    'message', 'Shop created successfully with normalized data',
    'data', json_build_object(
      'shop_id', new_shop_id,
      'staff_count', jsonb_array_length(p_staff),
      'services_count', jsonb_array_length(p_services),
      'discounts_count', jsonb_array_length(p_discounts)
    )
  ) INTO result;
  
  RAISE NOTICE 'Returning result: %', result::TEXT;
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating normalized shop: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'shop_id', NULL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- PART 9: HELPER VIEWS FOR EASY QUERYING
-- ===============================================

-- View to get complete shop data with related records
-- Drop existing view first to avoid column conflicts
DO $$
BEGIN
    DROP VIEW IF EXISTS shop_complete CASCADE;
    RAISE NOTICE '✅ Dropped existing shop_complete view';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not drop view (may not exist): %', SQLERRM;
END $$;

CREATE VIEW shop_complete AS
SELECT 
  pb.id,
  pb.provider_id,
  pb.name,
  pb.description,
  pb.category,
  pb.address,
  pb.city,
  pb.state,
  pb.country,
  pb.phone,
  pb.email,
  pb.website_url,
  pb.image_url,
  pb.logo_url,
  pb.images,
  pb.business_hours_start,
  pb.business_hours_end,
  pb.timezone,
  pb.advance_booking_days,
  pb.slot_duration,
  pb.buffer_time,
  pb.auto_approval,
  pb.is_active,
  pb.is_verified,
  pb.created_at,
  pb.updated_at,
  -- Aggregated related data
  COALESCE(
    json_agg(
      json_build_object(
        'id', ss.id,
        'name', ss.name,
        'email', ss.email,
        'phone', ss.phone,
        'role', ss.role,
        'specialties', ss.specialties,
        'bio', ss.bio,
        'experience_years', ss.experience_years,
        'avatar_url', ss.avatar_url,
        'is_active', ss.is_active
      )
    ) FILTER (WHERE ss.id IS NOT NULL), 
    '[]'::json
  ) as staff,
  COALESCE(
    json_agg(
      json_build_object(
        'id', srv.id,
        'name', srv.name,
        'description', srv.description,
        'price', srv.price,
        'duration', srv.duration,
        'category', srv.category,
        'assigned_staff', srv.assigned_staff,
        'is_active', srv.is_active
      )
    ) FILTER (WHERE srv.id IS NOT NULL),
    '[]'::json
  ) as services,
  COALESCE(
    json_agg(
      json_build_object(
        'id', sd.id,
        'type', sd.type,
        'value', sd.value,
        'description', sd.description,
        'start_date', sd.start_date,
        'end_date', sd.end_date,
        'usage_limit', sd.usage_limit,
        'used_count', sd.used_count,
        'min_amount', sd.min_amount,
        'max_discount', sd.max_discount,
        'applicable_services', sd.applicable_services,
        'conditions', sd.conditions,
        'is_active', sd.is_active
      )
    ) FILTER (WHERE sd.id IS NOT NULL),
    '[]'::json
  ) as discounts
FROM provider_businesses pb
LEFT JOIN shop_staff ss ON pb.id = ss.shop_id AND ss.is_active = true
LEFT JOIN shop_services srv ON pb.id = srv.shop_id AND srv.is_active = true  
LEFT JOIN shop_discounts sd ON pb.id = sd.shop_id AND sd.is_active = true
GROUP BY pb.id, pb.provider_id, pb.name, pb.description, pb.category, pb.address, pb.city, pb.state, pb.country, pb.phone, pb.email, pb.website_url, pb.image_url, pb.logo_url, pb.images, pb.business_hours_start, pb.business_hours_end, pb.timezone, pb.advance_booking_days, pb.slot_duration, pb.buffer_time, pb.auto_approval, pb.is_active, pb.is_verified, pb.created_at, pb.updated_at;

-- ===============================================
-- FINAL VERIFICATION
-- ===============================================

SELECT 
    '✅ Normalized schema setup complete!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('shop_staff', 'shop_services', 'shop_discounts')) as new_tables_created,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'shop_staff') as staff_columns,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'shop_services') as service_columns,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'shop_discounts') as discount_columns;