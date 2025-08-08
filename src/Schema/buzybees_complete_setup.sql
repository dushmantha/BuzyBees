-- ===============================================
-- BUZYBEES COMPLETE SETUP - ALL IN ONE
-- ===============================================
-- This is the ONLY SQL file you need to run for complete setup
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================================
-- PART 1: USER MANAGEMENT
-- ===============================================

-- Create users table (linked to auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  full_name VARCHAR(255),
  phone VARCHAR(20),
  avatar_url TEXT,
  gender VARCHAR(20) DEFAULT 'other' CHECK (gender IN ('male', 'female', 'other')),
  birth_date DATE,
  address TEXT,
  bio TEXT,
  user_type VARCHAR(20) DEFAULT 'customer' CHECK (user_type IN ('customer', 'provider', 'admin')),
  account_type VARCHAR(20) DEFAULT 'consumer' CHECK (account_type IN ('consumer', 'provider', 'admin')),
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- PART 2: PROVIDER BUSINESSES (SHOPS)
-- ===============================================

-- Create provider_businesses table with all fields
CREATE TABLE IF NOT EXISTS provider_businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Location
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Sweden',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Contact
  phone VARCHAR(20),
  email VARCHAR(255),
  website_url TEXT,
  
  -- Images
  image_url TEXT,
  logo_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  
  -- Enhanced Data (JSONB)
  staff JSONB DEFAULT '[]'::jsonb,
  services JSONB DEFAULT '[]'::jsonb,
  business_hours JSONB DEFAULT '[]'::jsonb,
  special_days JSONB DEFAULT '[]'::jsonb,
  discounts JSONB DEFAULT '[]'::jsonb,
  
  -- Schedule Settings
  business_hours_start TIME DEFAULT '09:00'::time,
  business_hours_end TIME DEFAULT '17:00'::time,
  timezone VARCHAR(50) DEFAULT 'Europe/Stockholm',
  
  -- Booking Settings
  advance_booking_days INTEGER DEFAULT 30,
  slot_duration INTEGER DEFAULT 60,
  buffer_time INTEGER DEFAULT 15,
  auto_approval BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- PART 3: HELPER FUNCTIONS
-- ===============================================

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_provider_businesses_updated_at ON provider_businesses;
CREATE TRIGGER update_provider_businesses_updated_at BEFORE UPDATE ON provider_businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- PART 4: SHOP CREATION FUNCTION
-- ===============================================

CREATE OR REPLACE FUNCTION create_shop_integrated(
  p_provider_id UUID,
  p_shop_data JSONB
)
RETURNS JSON AS $$
DECLARE
  new_shop_id UUID;
  result JSON;
  debug_info TEXT;
BEGIN
  -- Debug logging
  RAISE NOTICE 'Creating shop for provider: %', p_provider_id;
  RAISE NOTICE 'Shop data received: %', p_shop_data::TEXT;
  RAISE NOTICE 'Staff data: %', COALESCE(p_shop_data->'staff', '[]'::JSONB)::TEXT;
  RAISE NOTICE 'Services data: %', COALESCE(p_shop_data->'services', '[]'::JSONB)::TEXT;
  RAISE NOTICE 'Discounts data: %', COALESCE(p_shop_data->'discounts', '[]'::JSONB)::TEXT;
  
  -- Validate required fields
  IF p_shop_data->>'name' IS NULL OR p_shop_data->>'name' = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Shop name is required',
      'shop_id', NULL
    );
  END IF;
  
  -- Insert new shop with all fields
  INSERT INTO provider_businesses (
    provider_id, name, category, description, 
    address, city, state, country,
    phone, email, website_url,
    logo_url, image_url, images, 
    staff, services, business_hours, special_days, discounts,
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
    COALESCE(p_shop_data->'staff', '[]'::JSONB),
    COALESCE(p_shop_data->'services', '[]'::JSONB),
    COALESCE(p_shop_data->'business_hours', '[]'::JSONB),
    COALESCE(p_shop_data->'special_days', '[]'::JSONB),
    COALESCE(p_shop_data->'discounts', '[]'::JSONB),
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
  
  -- Return success response with complete shop data
  SELECT json_build_object(
    'success', true,
    'shop_id', new_shop_id,
    'message', 'Shop created successfully',
    'data', row_to_json(pb.*)
  ) INTO result
  FROM provider_businesses pb
  WHERE pb.id = new_shop_id;
  
  RAISE NOTICE 'Returning result: %', result::TEXT;
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating shop: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'shop_id', NULL,
      'debug_info', format('Provider: %s, Data: %s', p_provider_id, p_shop_data::TEXT)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- PART 5: INDEXES FOR PERFORMANCE
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_provider_businesses_provider_id ON provider_businesses(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_businesses_active ON provider_businesses(is_active);
CREATE INDEX IF NOT EXISTS idx_provider_businesses_category ON provider_businesses(category);
CREATE INDEX IF NOT EXISTS idx_provider_businesses_city_country ON provider_businesses(city, country);
CREATE INDEX IF NOT EXISTS idx_provider_businesses_created_at ON provider_businesses(created_at DESC);

-- ===============================================
-- PART 6: ROW LEVEL SECURITY
-- ===============================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_businesses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Anyone can view active businesses" ON provider_businesses;
DROP POLICY IF EXISTS "Providers can create their own businesses" ON provider_businesses;
DROP POLICY IF EXISTS "Providers can update their own businesses" ON provider_businesses;
DROP POLICY IF EXISTS "Providers can delete their own businesses" ON provider_businesses;

-- Users policies
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Provider businesses policies
CREATE POLICY "Anyone can view active businesses" ON provider_businesses
    FOR SELECT USING (is_active = true OR provider_id = auth.uid());

CREATE POLICY "Providers can create their own businesses" ON provider_businesses
    FOR INSERT WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update their own businesses" ON provider_businesses
    FOR UPDATE USING (provider_id = auth.uid());

CREATE POLICY "Providers can delete their own businesses" ON provider_businesses
    FOR DELETE USING (provider_id = auth.uid());

-- ===============================================
-- PART 7: STORAGE BUCKET CHECK
-- ===============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== IMPORTANT: STORAGE SETUP ===';
    RAISE NOTICE '';
    RAISE NOTICE 'This script sets up the database schema.';
    RAISE NOTICE 'For image uploads to work, you also need to:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Go to Supabase Dashboard > Storage';
    RAISE NOTICE '2. Create these public buckets:';
    RAISE NOTICE '   - shop-images (50MB limit)';
    RAISE NOTICE '   - user-avatars (10MB limit)';
    RAISE NOTICE '';
    RAISE NOTICE 'Or run storage_setup_user_safe.sql for instructions.';
    RAISE NOTICE '';
END $$;

-- ===============================================
-- FINAL VERIFICATION
-- ===============================================

SELECT 
    '✅ Schema setup complete!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('users', 'provider_businesses')) as tables_created,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'provider_businesses') as shop_columns,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'provider_businesses') as indexes_created;