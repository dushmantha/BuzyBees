-- ===============================================
-- BUZYBEES COMPLETE DEPLOYMENT SCRIPT
-- ===============================================
-- This script deploys all schema files in the correct order
-- Run this entire file in your Supabase SQL editor

-- ===============================================
-- STEP 1: ENABLE EXTENSIONS
-- ===============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================================
-- STEP 2: STORAGE BUCKETS SETUP
-- ===============================================

-- Create shop-images bucket for shop logos and images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shop-images',
  'shop-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Create staff-avatars bucket for staff profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-avatars',
  'staff-avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Create service-images bucket for service images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-images',
  'service-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- ===============================================
-- STEP 3: STORAGE POLICIES
-- ===============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload shop images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own shop images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own shop images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access staff avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload staff avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own staff avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own staff avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Access service images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload service images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own service images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own service images" ON storage.objects;

-- Policy: Anyone can view shop images
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'shop-images');

-- Policy: Authenticated users can upload shop images
CREATE POLICY "Authenticated users can upload shop images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'shop-images' AND
    auth.uid() IS NOT NULL
  );

-- Policy: Users can update their own shop images
CREATE POLICY "Users can update own shop images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'shop-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own shop images
CREATE POLICY "Users can delete own shop images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'shop-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Similar policies for staff-avatars bucket
CREATE POLICY "Public Access staff avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'staff-avatars');

CREATE POLICY "Authenticated users can upload staff avatars" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'staff-avatars' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update own staff avatars" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'staff-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own staff avatars" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'staff-avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Similar policies for service-images bucket
CREATE POLICY "Public Access service images" ON storage.objects
  FOR SELECT USING (bucket_id = 'service-images');

CREATE POLICY "Authenticated users can upload service images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'service-images' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update own service images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'service-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own service images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'service-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ===============================================
-- STEP 4: MASTER SCHEMA - CORE TABLES
-- ===============================================

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Provider businesses (main shops table)
DROP TABLE IF EXISTS provider_businesses CASCADE;
CREATE TABLE provider_businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL,
    
    -- Business Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    
    -- Contact Information
    phone VARCHAR(20),
    email VARCHAR(255),
    website_url VARCHAR(255),
    
    -- Address Information
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Sweden',
    
    -- Business Hours
    business_hours_start TIME DEFAULT '09:00',
    business_hours_end TIME DEFAULT '17:00',
    timezone VARCHAR(50) DEFAULT 'Europe/Stockholm',
    
    -- Booking Settings
    advance_booking_days INTEGER DEFAULT 30,
    slot_duration INTEGER DEFAULT 60,
    buffer_time INTEGER DEFAULT 15,
    auto_approval BOOLEAN DEFAULT true,
    
    -- Media
    image_url TEXT,
    logo_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    
    -- Rating and Reviews
    rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
    
    -- Status Flags
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Shop staff
DROP TABLE IF EXISTS shop_staff CASCADE;
CREATE TABLE shop_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    
    -- Personal Information
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(100),
    
    -- Professional Information
    specialties JSONB DEFAULT '[]'::jsonb,
    bio TEXT,
    experience_years INTEGER DEFAULT 0 CHECK (experience_years >= 0),
    avatar_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_staff_email_per_shop UNIQUE(shop_id, email)
);

-- 3. Shop services
DROP TABLE IF EXISTS shop_services CASCADE;
CREATE TABLE shop_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    
    -- Service Information
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    
    -- Pricing and Duration
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    duration INTEGER NOT NULL CHECK (duration > 0), -- in minutes
    
    -- Service Options Support
    has_options BOOLEAN DEFAULT false,
    base_price DECIMAL(10,2),
    base_duration INTEGER,
    
    -- Staff Assignment
    assigned_staff JSONB DEFAULT '[]'::jsonb,
    
    -- Media
    image_url TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_service_name_per_shop UNIQUE(shop_id, name)
);

-- ===============================================
-- STEP 5: SERVICE OPTIONS TABLE (FIXED)
-- ===============================================

-- Create service_options table to store service variations
DROP TABLE IF EXISTS service_options CASCADE;
CREATE TABLE service_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    service_id UUID NOT NULL,
    shop_id UUID NOT NULL,
    option_name VARCHAR(100) NOT NULL,
    option_description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_service_options_shop
        FOREIGN KEY (shop_id) 
        REFERENCES provider_businesses(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_service_options_service
        FOREIGN KEY (service_id)
        REFERENCES shop_services(id)
        ON DELETE CASCADE,
    
    -- Ensure unique option names per service in a shop
    CONSTRAINT unique_service_option_per_shop 
        UNIQUE(shop_id, service_id, option_name)
);

-- ===============================================
-- STEP 6: ADDITIONAL CORE TABLES
-- ===============================================

-- Shop discounts
DROP TABLE IF EXISTS shop_discounts CASCADE;
CREATE TABLE shop_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    
    -- Discount Information
    type VARCHAR(20) NOT NULL CHECK (type IN ('percentage', 'fixed')),
    value DECIMAL(10,2) NOT NULL CHECK (value > 0),
    description TEXT NOT NULL,
    
    -- Validity Period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Usage Limits
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    min_amount DECIMAL(10,2),
    max_discount DECIMAL(10,2),
    
    -- Applicable Services
    applicable_services JSONB DEFAULT '[]'::jsonb,
    
    -- Additional Conditions
    conditions JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_discount_date_range CHECK (end_date >= start_date)
);

-- Shop bookings
DROP TABLE IF EXISTS shop_bookings CASCADE;
CREATE TABLE shop_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL,
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES shop_staff(id) ON DELETE CASCADE,
    
    -- Booking Details
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Booking Status
    status VARCHAR(20) DEFAULT 'confirmed' 
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    
    -- Pricing
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    
    -- Service Details
    services JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    
    -- Cancellation
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by UUID,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_booking_time CHECK (end_time > start_time),
    CONSTRAINT valid_booking_date CHECK (booking_date >= CURRENT_DATE - INTERVAL '1 year')
);

-- User favorites
DROP TABLE IF EXISTS user_favorites CASCADE;
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_user_shop_favorite UNIQUE(user_id, shop_id)
);

-- ===============================================
-- STEP 7: INDEXES FOR PERFORMANCE
-- ===============================================

-- Provider businesses indexes
CREATE INDEX IF NOT EXISTS idx_provider_businesses_provider_id ON provider_businesses(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_businesses_category ON provider_businesses(category);
CREATE INDEX IF NOT EXISTS idx_provider_businesses_active ON provider_businesses(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_provider_businesses_city ON provider_businesses(city);
CREATE INDEX IF NOT EXISTS idx_provider_businesses_rating ON provider_businesses(rating) WHERE rating > 0;

-- Shop staff indexes
CREATE INDEX IF NOT EXISTS idx_shop_staff_shop_id ON shop_staff(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_provider_id ON shop_staff(provider_id);
CREATE INDEX IF NOT EXISTS idx_shop_staff_active ON shop_staff(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shop_staff_email ON shop_staff(email);

-- Shop services indexes
CREATE INDEX IF NOT EXISTS idx_shop_services_shop_id ON shop_services(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_services_provider_id ON shop_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_shop_services_active ON shop_services(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shop_services_category ON shop_services(category);

-- Service options indexes
CREATE INDEX IF NOT EXISTS idx_service_options_service_id ON service_options(service_id);
CREATE INDEX IF NOT EXISTS idx_service_options_shop_id ON service_options(shop_id);
CREATE INDEX IF NOT EXISTS idx_service_options_active ON service_options(is_active) WHERE is_active = true;

-- Shop discounts indexes
CREATE INDEX IF NOT EXISTS idx_shop_discounts_shop_id ON shop_discounts(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_discounts_provider_id ON shop_discounts(provider_id);
CREATE INDEX IF NOT EXISTS idx_shop_discounts_active ON shop_discounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shop_discounts_dates ON shop_discounts(start_date, end_date);

-- Shop bookings indexes
CREATE INDEX IF NOT EXISTS idx_shop_bookings_customer_id ON shop_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_shop_bookings_shop_id ON shop_bookings(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_bookings_staff_id ON shop_bookings(staff_id);
CREATE INDEX IF NOT EXISTS idx_shop_bookings_date ON shop_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_shop_bookings_status ON shop_bookings(status);
CREATE INDEX IF NOT EXISTS idx_shop_bookings_staff_date ON shop_bookings(staff_id, booking_date);

-- User favorites indexes
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_shop_id ON user_favorites(shop_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at);

-- ===============================================
-- STEP 8: ROW LEVEL SECURITY
-- ===============================================

-- Enable RLS on all tables
ALTER TABLE provider_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Providers can manage own businesses" ON provider_businesses;
DROP POLICY IF EXISTS "Anyone can view active businesses" ON provider_businesses;
DROP POLICY IF EXISTS "Providers can manage own staff" ON shop_staff;
DROP POLICY IF EXISTS "Anyone can view active staff" ON shop_staff;
DROP POLICY IF EXISTS "Providers can manage own services" ON shop_services;
DROP POLICY IF EXISTS "Anyone can view active services" ON shop_services;
DROP POLICY IF EXISTS "Providers can manage own service options" ON service_options;
DROP POLICY IF EXISTS "Anyone can view active service options" ON service_options;
DROP POLICY IF EXISTS "Providers can manage own discounts" ON shop_discounts;
DROP POLICY IF EXISTS "Anyone can view active discounts" ON shop_discounts;
DROP POLICY IF EXISTS "Users can view own bookings" ON shop_bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON shop_bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON shop_bookings;
DROP POLICY IF EXISTS "Providers can view shop bookings" ON shop_bookings;
DROP POLICY IF EXISTS "Users can manage own favorites" ON user_favorites;

-- Provider businesses policies
CREATE POLICY "Providers can manage own businesses" ON provider_businesses
    FOR ALL USING (auth.uid()::uuid = provider_id);

CREATE POLICY "Anyone can view active businesses" ON provider_businesses
    FOR SELECT USING (is_active = true);

-- Shop staff policies
CREATE POLICY "Providers can manage own staff" ON shop_staff
    FOR ALL USING (auth.uid()::uuid = provider_id);

CREATE POLICY "Anyone can view active staff" ON shop_staff
    FOR SELECT USING (is_active = true);

-- Shop services policies
CREATE POLICY "Providers can manage own services" ON shop_services
    FOR ALL USING (auth.uid()::uuid = provider_id);

CREATE POLICY "Anyone can view active services" ON shop_services
    FOR SELECT USING (is_active = true);

-- Service options policies
CREATE POLICY "Providers can manage own service options" ON service_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM provider_businesses 
            WHERE id = service_options.shop_id 
            AND provider_id = auth.uid()::uuid
        )
    );

CREATE POLICY "Anyone can view active service options" ON service_options
    FOR SELECT USING (is_active = true);

-- Shop discounts policies
CREATE POLICY "Providers can manage own discounts" ON shop_discounts
    FOR ALL USING (auth.uid()::uuid = provider_id);

CREATE POLICY "Anyone can view active discounts" ON shop_discounts
    FOR SELECT USING (is_active = true AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE);

-- Shop bookings policies
CREATE POLICY "Users can view own bookings" ON shop_bookings
    FOR SELECT USING (auth.uid()::uuid = customer_id);

CREATE POLICY "Users can create own bookings" ON shop_bookings
    FOR INSERT WITH CHECK (auth.uid()::uuid = customer_id);

CREATE POLICY "Users can update own bookings" ON shop_bookings
    FOR UPDATE USING (auth.uid()::uuid = customer_id);

CREATE POLICY "Providers can view shop bookings" ON shop_bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM provider_businesses 
            WHERE id = shop_bookings.shop_id 
            AND provider_id = auth.uid()::uuid
        )
    );

-- User favorites policies
CREATE POLICY "Users can manage own favorites" ON user_favorites
    FOR ALL USING (auth.uid()::uuid = user_id);

-- ===============================================
-- STEP 9: TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ===============================================

-- Create triggers for all tables
DROP TRIGGER IF EXISTS update_provider_businesses_updated_at ON provider_businesses;
CREATE TRIGGER update_provider_businesses_updated_at 
    BEFORE UPDATE ON provider_businesses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shop_staff_updated_at ON shop_staff;
CREATE TRIGGER update_shop_staff_updated_at 
    BEFORE UPDATE ON shop_staff 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shop_services_updated_at ON shop_services;
CREATE TRIGGER update_shop_services_updated_at 
    BEFORE UPDATE ON shop_services 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_service_options_updated_at ON service_options;
CREATE TRIGGER update_service_options_updated_at 
    BEFORE UPDATE ON service_options 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shop_discounts_updated_at ON shop_discounts;
CREATE TRIGGER update_shop_discounts_updated_at 
    BEFORE UPDATE ON shop_discounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shop_bookings_updated_at ON shop_bookings;
CREATE TRIGGER update_shop_bookings_updated_at 
    BEFORE UPDATE ON shop_bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_favorites_updated_at ON user_favorites;
CREATE TRIGGER update_user_favorites_updated_at 
    BEFORE UPDATE ON user_favorites 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- STEP 10: FIXED SHOP CREATION FUNCTION
-- ===============================================

-- Drop all versions of the function
DO $$
BEGIN
    DROP FUNCTION IF EXISTS create_shop_normalized(UUID, JSONB);
    DROP FUNCTION IF EXISTS create_shop_normalized(UUID, JSONB, JSONB);
    DROP FUNCTION IF EXISTS create_shop_normalized(UUID, JSONB, JSONB, JSONB);
    DROP FUNCTION IF EXISTS create_shop_normalized(UUID, JSONB, JSONB, JSONB, JSONB);
    DROP FUNCTION IF EXISTS create_shop_normalized(UUID, JSONB, JSONB, JSONB, JSONB, JSONB);
    DROP FUNCTION IF EXISTS create_shop_normalized(UUID, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB);
    DROP FUNCTION IF EXISTS create_shop_normalized(UUID, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB, JSONB);
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore errors if functions don't exist
END $$;

-- Create a clean version of the function
CREATE OR REPLACE FUNCTION create_shop_normalized(
  p_provider_id UUID,
  p_shop_data JSONB,
  p_staff JSONB DEFAULT '[]'::JSONB,
  p_services JSONB DEFAULT '[]'::JSONB,
  p_business_hours JSONB DEFAULT '[]'::JSONB,
  p_discounts JSONB DEFAULT '[]'::JSONB,
  p_schedule_data JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB AS $$
DECLARE
  new_shop_id UUID;
  staff_item JSONB;
  service_item JSONB;
  discount_item JSONB;
  cleaned_item JSONB;
BEGIN
  -- Validate required fields
  IF p_shop_data->>'name' IS NULL OR p_shop_data->>'name' = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Shop name is required'
    );
  END IF;
  
  BEGIN
    -- Insert new shop
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
      COALESCE(p_shop_data->>'image_url', ''),
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
    
    -- Insert staff if provided
    IF jsonb_array_length(p_staff) > 0 THEN
      FOR staff_item IN SELECT * FROM jsonb_array_elements(p_staff)
      LOOP
        -- Only insert if name exists
        IF staff_item->>'name' IS NOT NULL AND staff_item->>'name' != '' THEN
          INSERT INTO shop_staff (
            shop_id, provider_id, name, email, phone, role,
            specialties, bio, experience_years, avatar_url, is_active
          )
          VALUES (
            new_shop_id,
            p_provider_id,
            staff_item->>'name',
            COALESCE(staff_item->>'email', ''),
            staff_item->>'phone',
            staff_item->>'role',
            COALESCE(staff_item->'specialties', '[]'::JSONB),
            staff_item->>'bio',
            COALESCE((staff_item->>'experience_years')::INTEGER, 0),
            staff_item->>'avatar_url',
            COALESCE((staff_item->>'is_active')::BOOLEAN, true)
          );
        END IF;
      END LOOP;
    END IF;
    
    -- Insert services if provided
    IF jsonb_array_length(p_services) > 0 THEN
      FOR service_item IN SELECT * FROM jsonb_array_elements(p_services)
      LOOP
        -- Only insert if name exists
        IF service_item->>'name' IS NOT NULL AND service_item->>'name' != '' THEN
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
        END IF;
      END LOOP;
    END IF;
    
    -- Insert discounts if provided
    IF jsonb_array_length(p_discounts) > 0 THEN
      FOR discount_item IN SELECT * FROM jsonb_array_elements(p_discounts)
      LOOP
        -- Only insert if valid discount
        IF discount_item->>'type' IS NOT NULL AND discount_item->>'description' IS NOT NULL THEN
          INSERT INTO shop_discounts (
            shop_id, provider_id, type, value, description,
            start_date, end_date, usage_limit, min_amount, max_discount,
            applicable_services, conditions, is_active
          )
          VALUES (
            new_shop_id,
            p_provider_id,
            discount_item->>'type',
            COALESCE((discount_item->>'value')::DECIMAL, 0),
            discount_item->>'description',
            COALESCE((discount_item->>'start_date')::DATE, CURRENT_DATE),
            COALESCE((discount_item->>'end_date')::DATE, CURRENT_DATE + INTERVAL '30 days'),
            (discount_item->>'usage_limit')::INTEGER,
            (discount_item->>'min_amount')::DECIMAL,
            (discount_item->>'max_discount')::DECIMAL,
            COALESCE(discount_item->'applicable_services', '[]'::JSONB),
            COALESCE(discount_item->'conditions', '{}'::JSONB),
            COALESCE((discount_item->>'is_active')::BOOLEAN, true)
          );
        END IF;
      END LOOP;
    END IF;
    
    -- Return success
    RETURN jsonb_build_object(
      'success', true,
      'shop_id', new_shop_id,
      'message', 'Shop created successfully'
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Return error without any NULL values
      RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
      );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_shop_normalized TO authenticated;
GRANT EXECUTE ON FUNCTION create_shop_normalized TO anon;

-- ===============================================
-- STEP 11: SAMPLE DATA FOR TESTING
-- ===============================================

-- Insert a sample business for testing
INSERT INTO provider_businesses (
    provider_id, name, description, category, phone, email, city, country, is_active
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'BuzyBees Demo Salon',
    'Premium beauty and wellness services for testing',
    'Beauty & Wellness',
    '+46 70 123 4567',
    'demo@buzybees.com',
    'Stockholm',
    'Sweden',
    true
) ON CONFLICT DO NOTHING;

-- ===============================================
-- STEP 12: VERIFICATION
-- ===============================================

SELECT 
    '✅ BUZYBEES DATABASE DEPLOYMENT COMPLETED!' as status,
    'All tables, indexes, policies, functions, and storage buckets created successfully!' as message,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('provider_businesses', 'shop_staff', 'shop_services', 'service_options', 'shop_discounts', 'shop_bookings', 'user_favorites')) as tables_created,
    (SELECT COUNT(*) FROM storage.buckets WHERE id IN ('shop-images', 'staff-avatars', 'service-images')) as storage_buckets_created,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'create_shop_normalized') as functions_created;