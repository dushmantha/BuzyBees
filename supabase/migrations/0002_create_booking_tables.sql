-- CUSTOMERS TABLE SCHEMA
-- This table stores customer information for bookings

DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE customers (
    -- Primary identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Provider relationship
    provider_id UUID NOT NULL, -- Which provider this customer belongs to
    
    -- Customer information
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    
    -- Customer preferences
    preferred_staff_id UUID, -- Preferred staff member
    notes TEXT, -- Special notes about customer
    
    -- Customer status
    is_active BOOLEAN DEFAULT true,
    total_bookings INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customers_provider_id ON customers(provider_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_is_active ON customers(is_active);

-- Unique constraint for phone per provider
CREATE UNIQUE INDEX idx_customers_provider_phone ON customers(provider_id, phone);

-- Update trigger
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

-- RLS Policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy for providers to manage their customers
DROP POLICY IF EXISTS "Providers can manage their customers" ON customers;
CREATE POLICY "Providers can manage their customers" ON customers
    FOR ALL USING (
        provider_id = auth.uid()
    );

-- Grant permissions
GRANT ALL ON customers TO postgres;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON customers TO service_role;

-- SHOP_BOOKINGS TABLE SCHEMA
-- This table stores all booking records for the BuzyBees app
-- Based on the normalized.ts createBooking function requirements

DROP TABLE IF EXISTS shop_bookings CASCADE;

CREATE TABLE shop_bookings (
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

-- Indexes for performance
CREATE INDEX idx_shop_bookings_shop_id ON shop_bookings(shop_id);
CREATE INDEX idx_shop_bookings_provider_id ON shop_bookings(provider_id);
CREATE INDEX idx_shop_bookings_customer_id ON shop_bookings(customer_id);
CREATE INDEX idx_shop_bookings_staff_id ON shop_bookings(staff_id);
CREATE INDEX idx_shop_bookings_booking_date ON shop_bookings(booking_date);
CREATE INDEX idx_shop_bookings_status ON shop_bookings(status);
CREATE INDEX idx_shop_bookings_payment_status ON shop_bookings(payment_status);
CREATE INDEX idx_shop_bookings_created_at ON shop_bookings(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_shop_bookings_provider_date ON shop_bookings(provider_id, booking_date);
CREATE INDEX idx_shop_bookings_shop_date ON shop_bookings(shop_id, booking_date);
CREATE INDEX idx_shop_bookings_customer_status ON shop_bookings(customer_id, status);

-- Update trigger
CREATE OR REPLACE FUNCTION update_shop_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_bookings_updated_at
    BEFORE UPDATE ON shop_bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_shop_bookings_updated_at();

-- RLS Policies
ALTER TABLE shop_bookings ENABLE ROW LEVEL SECURITY;

-- Policy for providers to manage their shop bookings
DROP POLICY IF EXISTS "Providers can manage their shop bookings" ON shop_bookings;
CREATE POLICY "Providers can manage their shop bookings" ON shop_bookings
    FOR ALL USING (
        provider_id = auth.uid()
    );

-- Policy for customers to create bookings
DROP POLICY IF EXISTS "Customers can create bookings" ON shop_bookings;
CREATE POLICY "Customers can create bookings" ON shop_bookings
    FOR INSERT WITH CHECK (true);

-- Policy for customers to view their own bookings
DROP POLICY IF EXISTS "Customers can view their bookings" ON shop_bookings;
CREATE POLICY "Customers can view their bookings" ON shop_bookings
    FOR SELECT USING (
        auth.uid() IS NOT NULL
    );

-- Policy for anonymous bookings (phone-based lookups)
DROP POLICY IF EXISTS "Anonymous booking access" ON shop_bookings;
CREATE POLICY "Anonymous booking access" ON shop_bookings
    FOR SELECT USING (
        customer_id IS NULL
    );

-- Grant permissions
GRANT ALL ON shop_bookings TO postgres;
GRANT ALL ON shop_bookings TO authenticated;
GRANT SELECT ON shop_bookings TO anon;
GRANT ALL ON shop_bookings TO service_role;

-- Booking conflict check function
CREATE OR REPLACE FUNCTION check_booking_conflict(
    p_shop_id UUID,
    p_staff_id UUID,
    p_booking_date DATE,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    -- Check for overlapping bookings
    SELECT COUNT(*)
    INTO conflict_count
    FROM shop_bookings
    WHERE shop_id = p_shop_id
        AND booking_date = p_booking_date
        AND status NOT IN ('cancelled', 'no_show')
        AND (
            -- New booking overlaps with existing booking
            (p_start_time < end_time AND p_end_time > start_time)
        )
        AND (
            -- If staff is specified, check staff conflict
            p_staff_id IS NULL OR staff_id IS NULL OR staff_id = p_staff_id
        );
    
    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on function
GRANT EXECUTE ON FUNCTION check_booking_conflict(UUID, UUID, DATE, TIME, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION check_booking_conflict(UUID, UUID, DATE, TIME, TIME) TO service_role;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';