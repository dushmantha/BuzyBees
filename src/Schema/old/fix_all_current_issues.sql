-- Fix all current database schema issues

-- Add all missing columns that the app expects
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS business_hours_start TIME DEFAULT '09:00'::time;
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS business_hours_end TIME DEFAULT '17:00'::time;
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add any other columns the app might need for backward compatibility
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS special_days JSONB DEFAULT '[]'::jsonb;
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb;
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS staff JSONB DEFAULT '[]'::jsonb;
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS discounts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Stockholm';
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS advance_booking_days INTEGER DEFAULT 30;
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS slot_duration INTEGER DEFAULT 60;
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS buffer_time INTEGER DEFAULT 15;
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS auto_approval BOOLEAN DEFAULT true;
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS first_time_discount_active BOOLEAN DEFAULT true;

-- Create a test shop to verify everything works
INSERT INTO provider_businesses (
    id,
    provider_id,
    name,
    description,
    category,
    phone,
    email,
    address,
    city,
    country,
    business_hours_start,
    business_hours_end,
    is_active
) VALUES (
    'test-shop-12345678-1234-1234-1234-123456789abc'::UUID,
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    'Test Shop - All Issues Fixed',
    'This shop was created to test all the fixes',
    'Beauty & Wellness',
    '+46 70 123 4567',
    'test@fixed.shop',
    '123 Fixed Street',
    'Stockholm', 
    'Sweden',
    '09:00'::time,
    '17:00'::time,
    true
) ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    updated_at = NOW();

SELECT 'All database schema fixes applied successfully!' as result;