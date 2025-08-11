-- RUN THIS SQL IN YOUR SUPABASE DASHBOARD SQL EDITOR
-- This will create the shop_bookings and customers tables needed for booking functionality

-- First, create the shop_bookings table
CREATE TABLE IF NOT EXISTS shop_bookings (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    customer_id UUID, -- Can be null for anonymous bookings
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL, -- Owner of the shop
    staff_id UUID, -- Can be null for "any staff"
    service_id UUID, -- References the service being booked
    
    -- Service options and discounts
    service_option_ids UUID[] DEFAULT ARRAY[]::UUID[],
    discount_id UUID, -- Applied discount if any
    
    -- Customer information (stored for historical record)
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    
    -- Booking date and time
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone TEXT DEFAULT 'UTC',
    
    -- Service snapshot (for historical record)
    service_name TEXT NOT NULL,
    
    -- Pricing
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
    
    -- Payment status
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    
    -- Additional information
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shop_bookings_shop_id ON shop_bookings(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_bookings_provider_id ON shop_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_shop_bookings_customer_id ON shop_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_shop_bookings_booking_date ON shop_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_shop_bookings_status ON shop_bookings(status);

-- Enable RLS
ALTER TABLE shop_bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Providers can manage their shop bookings" ON shop_bookings;
CREATE POLICY "Providers can manage their shop bookings" ON shop_bookings
    FOR ALL USING (
        provider_id = auth.uid()
    );

DROP POLICY IF EXISTS "Customers can create bookings" ON shop_bookings;
CREATE POLICY "Customers can create bookings" ON shop_bookings
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can view their bookings" ON shop_bookings;
CREATE POLICY "Customers can view their bookings" ON shop_bookings
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "Service role full access" ON shop_bookings;
CREATE POLICY "Service role full access" ON shop_bookings
    FOR ALL TO service_role
    USING (true);

-- Grant permissions
GRANT ALL ON shop_bookings TO postgres;
GRANT ALL ON shop_bookings TO authenticated;
GRANT SELECT ON shop_bookings TO anon;
GRANT ALL ON shop_bookings TO service_role;

-- Create customers table (optional, for future use)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    total_bookings INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Providers can manage their customers" ON customers;
CREATE POLICY "Providers can manage their customers" ON customers
    FOR ALL USING (
        provider_id = auth.uid()
    );

DROP POLICY IF EXISTS "Service role full access on customers" ON customers;
CREATE POLICY "Service role full access on customers" ON customers
    FOR ALL TO service_role
    USING (true);

-- Grant permissions for customers
GRANT ALL ON customers TO postgres;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON customers TO service_role;

SELECT 'Booking tables created successfully!' as result;