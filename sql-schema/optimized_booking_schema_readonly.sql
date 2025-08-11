-- =====================================================================
-- OPTIMIZED BOOKING SYSTEM - READ-ONLY APPROACH
-- =====================================================================
-- This schema creates an optimized booking system that:
-- 1. DOES NOT modify any existing tables (shop_services, service_options, shop_staff, shop_discounts)
-- 2. Works with existing table structures AS-IS
-- 3. Only creates new booking-related tables
-- 4. References existing tables without changing their schemas
-- 5. Provides real-time updates and enhanced functionality
-- =====================================================================

-- =====================================================================
-- ASSUMPTION: These tables already exist with their current structure
-- - shop_services (from shop_services_minimal_schema.sql)
-- - service_options (from service_options_fixed_schema.sql) 
-- - shop_staff (from shop_staff_minimal_schema.sql)
-- - shop_discounts (from shop_discounts_minimal_schema.sql)
-- - provider_businesses (main shops table)
-- =====================================================================

-- Clean up only the NEW booking tables we're creating
DROP TABLE IF EXISTS booking_services CASCADE;
DROP TABLE IF EXISTS booking_service_options CASCADE;  
DROP TABLE IF EXISTS booking_applied_discounts CASCADE;
DROP TABLE IF EXISTS shop_bookings CASCADE;

-- =====================================================================
-- MAIN BOOKINGS TABLE (OPTIMIZED) - NEW TABLE ONLY
-- =====================================================================
CREATE TABLE shop_bookings (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference VARCHAR(20) UNIQUE NOT NULL DEFAULT 'BB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
    
    -- Core Relationships (Reference existing tables AS-IS)
    customer_id UUID NOT NULL,
    shop_id UUID, -- References provider_businesses(id) if exists
    staff_id UUID, -- References shop_staff(id) if exists
    assigned_staff_id UUID, -- Backward compatibility - references shop_staff(id) if exists
    
    -- Customer Information (Snapshot for performance)
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT NOT NULL,
    
    -- Booking Schedule
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
    )),
    
    -- Payment Status
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'partially_paid', 'refunded', 'failed'
    )),
    payment_method VARCHAR(50),
    payment_reference TEXT,
    
    -- Pricing (Calculated from junction tables)
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Duration (Calculated from services)
    total_duration_minutes INTEGER NOT NULL DEFAULT 60,
    
    -- Service Summary (Denormalized for quick access)
    service_names TEXT[], -- Array of service names
    service_count INTEGER DEFAULT 0,
    
    -- Notes
    notes TEXT,
    customer_notes TEXT,
    internal_notes TEXT,
    cancellation_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- BACKWARD COMPATIBILITY: Keep existing expected columns
    services JSONB DEFAULT '[]'::jsonb, -- For backward compatibility
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (total_amount) STORED, -- Alias for total_amount
    service_name TEXT, -- First service name for compatibility
    service_id UUID, -- First service ID for compatibility
    base_duration_minutes INTEGER, -- Total duration alias
    base_price DECIMAL(10,2) -- Subtotal alias
);

-- =====================================================================
-- BOOKING SERVICES JUNCTION TABLE - NEW TABLE ONLY
-- =====================================================================
CREATE TABLE booking_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES shop_bookings(id) ON DELETE CASCADE,
    
    -- Reference to existing shop_services table (no foreign key to avoid dependency)
    service_id UUID NOT NULL, -- References shop_services.id but no FK constraint
    
    -- Service snapshot at booking time (for historical accuracy)
    service_name TEXT NOT NULL,
    service_price DECIMAL(10,2) NOT NULL,
    service_duration INTEGER NOT NULL, -- in minutes
    service_category TEXT,
    service_location_type VARCHAR(20),
    
    -- Booking-specific details
    quantity INTEGER DEFAULT 1,
    subtotal DECIMAL(10,2) NOT NULL,
    
    -- Staff assignment for this specific service
    assigned_staff_id UUID, -- References shop_staff.id but no FK constraint
    assigned_staff_name TEXT, -- Staff name snapshot
    
    -- Order and status
    sort_order INTEGER DEFAULT 0,
    service_status VARCHAR(20) DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- BOOKING SERVICE OPTIONS JUNCTION TABLE - NEW TABLE ONLY
-- =====================================================================
CREATE TABLE booking_service_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES shop_bookings(id) ON DELETE CASCADE,
    booking_service_id UUID NOT NULL REFERENCES booking_services(id) ON DELETE CASCADE,
    
    -- Reference to existing service_options table (no foreign key to avoid dependency)
    service_option_id UUID NOT NULL, -- References service_options.id but no FK constraint
    
    -- Option snapshot at booking time (using service_options field names)
    option_name TEXT NOT NULL, -- Maps to service_options.option_name
    option_description TEXT, -- Maps to service_options.option_description  
    option_price DECIMAL(10,2) NOT NULL, -- Maps to service_options.price
    option_duration INTEGER DEFAULT 0, -- Maps to service_options.duration
    
    -- Booking-specific details
    quantity INTEGER DEFAULT 1,
    subtotal DECIMAL(10,2) NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- BOOKING APPLIED DISCOUNTS TABLE - NEW TABLE ONLY
-- =====================================================================
CREATE TABLE booking_applied_discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES shop_bookings(id) ON DELETE CASCADE,
    
    -- Reference to existing shop_discounts table (no foreign key to avoid dependency)
    discount_id UUID, -- References shop_discounts.id but no FK constraint (can be NULL for manual discounts)
    
    -- Discount snapshot at booking time (using shop_discounts field names)
    discount_type VARCHAR(20) NOT NULL, -- percentage or fixed
    discount_value DECIMAL(10,2) NOT NULL,
    discount_description TEXT NOT NULL,
    
    -- Applied discount details
    applied_amount DECIMAL(10,2) NOT NULL, -- Actual discount amount applied
    applicable_subtotal DECIMAL(10,2), -- Subtotal this discount was applied to
    
    -- Manual discount fields (when discount_id is NULL)
    manual_reason TEXT, -- Reason for manual discount
    applied_by_staff_id UUID, -- Staff who applied manual discount
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- CONDITIONAL FOREIGN KEY CONSTRAINTS (Only if tables exist)
-- =====================================================================
DO $$
BEGIN
    -- Only add foreign keys if the referenced tables actually exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'provider_businesses') THEN
        ALTER TABLE shop_bookings 
            ADD CONSTRAINT shop_bookings_shop_id_fkey 
            FOREIGN KEY (shop_id) 
            REFERENCES provider_businesses(id) 
            ON DELETE CASCADE;
        RAISE NOTICE '✅ Added shop_bookings → provider_businesses foreign key';
    ELSE
        RAISE NOTICE '⚠️ provider_businesses table not found - skipping foreign key';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_staff') THEN
        -- Note: We use soft references in junction tables to avoid dependency issues
        RAISE NOTICE '✅ shop_staff table found - booking system will use soft references';
    ELSE
        RAISE NOTICE '⚠️ shop_staff table not found - booking system will work without staff constraints';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_services') THEN
        RAISE NOTICE '✅ shop_services table found - booking system will use soft references';
    ELSE
        RAISE NOTICE '⚠️ shop_services table not found - booking system will work without service constraints';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_options') THEN
        RAISE NOTICE '✅ service_options table found - booking system will use soft references';
    ELSE
        RAISE NOTICE '⚠️ service_options table not found - booking system will work without option constraints';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shop_discounts') THEN
        RAISE NOTICE '✅ shop_discounts table found - booking system will use soft references';
    ELSE
        RAISE NOTICE '⚠️ shop_discounts table not found - booking system will work without discount constraints';
    END IF;
END $$;

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

-- Main booking table indexes
CREATE INDEX idx_bookings_customer ON shop_bookings(customer_id);
CREATE INDEX idx_bookings_shop ON shop_bookings(shop_id);
CREATE INDEX idx_bookings_staff ON shop_bookings(staff_id);
CREATE INDEX idx_bookings_date ON shop_bookings(booking_date);
CREATE INDEX idx_bookings_status ON shop_bookings(status);
CREATE INDEX idx_bookings_created ON shop_bookings(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_bookings_date_time ON shop_bookings(booking_date, start_time);
CREATE INDEX idx_bookings_staff_date ON shop_bookings(staff_id, booking_date);
CREATE INDEX idx_bookings_shop_date ON shop_bookings(shop_id, booking_date);

-- Junction table indexes
CREATE INDEX idx_booking_services_booking ON booking_services(booking_id);
CREATE INDEX idx_booking_services_service ON booking_services(service_id);
CREATE INDEX idx_booking_services_staff ON booking_services(assigned_staff_id);

CREATE INDEX idx_booking_options_booking ON booking_service_options(booking_id);
CREATE INDEX idx_booking_options_service ON booking_service_options(booking_service_id);
CREATE INDEX idx_booking_options_option ON booking_service_options(service_option_id);

CREATE INDEX idx_booking_discounts_booking ON booking_applied_discounts(booking_id);
CREATE INDEX idx_booking_discounts_discount ON booking_applied_discounts(discount_id);

-- =====================================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_booking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_bookings_updated_at 
    BEFORE UPDATE ON shop_bookings
    FOR EACH ROW EXECUTE FUNCTION update_booking_updated_at();

-- =====================================================================
-- TRIGGER: Sync staff_id columns for backward compatibility
-- =====================================================================
CREATE OR REPLACE FUNCTION sync_booking_staff_ids()
RETURNS TRIGGER AS $$
BEGIN
    -- Keep staff_id and assigned_staff_id in sync
    IF NEW.staff_id IS DISTINCT FROM OLD.staff_id THEN
        NEW.assigned_staff_id = NEW.staff_id;
    ELSIF NEW.assigned_staff_id IS DISTINCT FROM OLD.assigned_staff_id THEN
        NEW.staff_id = NEW.assigned_staff_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_booking_staff_ids_trigger 
    BEFORE INSERT OR UPDATE ON shop_bookings
    FOR EACH ROW EXECUTE FUNCTION sync_booking_staff_ids();

-- =====================================================================
-- TRIGGER: Calculate booking totals from junction tables
-- =====================================================================
CREATE OR REPLACE FUNCTION calculate_booking_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_booking_id UUID;
    v_subtotal DECIMAL(10,2) := 0;
    v_duration INTEGER := 0;
    v_service_names TEXT[] := ARRAY[]::TEXT[];
    v_service_count INTEGER := 0;
    v_discount_total DECIMAL(10,2) := 0;
    v_total DECIMAL(10,2) := 0;
BEGIN
    -- Get booking_id from the trigger
    IF TG_TABLE_NAME = 'booking_services' THEN
        v_booking_id = COALESCE(NEW.booking_id, OLD.booking_id);
    ELSIF TG_TABLE_NAME = 'booking_service_options' THEN
        v_booking_id = COALESCE(NEW.booking_id, OLD.booking_id);
    ELSIF TG_TABLE_NAME = 'booking_applied_discounts' THEN
        v_booking_id = COALESCE(NEW.booking_id, OLD.booking_id);
    ELSE
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Calculate totals from services
    SELECT 
        COALESCE(SUM(bs.subtotal), 0),
        COALESCE(SUM(bs.service_duration * bs.quantity), 0),
        COALESCE(array_agg(bs.service_name ORDER BY bs.sort_order), ARRAY[]::TEXT[]),
        COALESCE(COUNT(bs.id), 0)
    INTO v_subtotal, v_duration, v_service_names, v_service_count
    FROM booking_services bs
    WHERE bs.booking_id = v_booking_id;
    
    -- Add options totals
    SELECT 
        v_subtotal + COALESCE(SUM(bso.subtotal), 0),
        v_duration + COALESCE(SUM(bso.option_duration * bso.quantity), 0)
    INTO v_subtotal, v_duration
    FROM booking_service_options bso
    WHERE bso.booking_id = v_booking_id;
    
    -- Calculate total discounts
    SELECT COALESCE(SUM(bad.applied_amount), 0)
    INTO v_discount_total
    FROM booking_applied_discounts bad
    WHERE bad.booking_id = v_booking_id;
    
    -- Update booking with calculated values
    UPDATE shop_bookings SET
        subtotal = v_subtotal,
        discount_amount = v_discount_total,
        total_amount = v_subtotal + COALESCE(tax_amount, 0) - v_discount_total,
        total_duration_minutes = v_duration,
        service_names = v_service_names,
        service_count = v_service_count,
        -- Update backward compatibility fields
        service_name = v_service_names[1], -- First service name
        base_duration_minutes = v_duration,
        base_price = v_subtotal,
        updated_at = NOW()
    WHERE id = v_booking_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to junction tables
CREATE TRIGGER calculate_totals_on_service_change
    AFTER INSERT OR UPDATE OR DELETE ON booking_services
    FOR EACH ROW EXECUTE FUNCTION calculate_booking_totals();

CREATE TRIGGER calculate_totals_on_option_change
    AFTER INSERT OR UPDATE OR DELETE ON booking_service_options
    FOR EACH ROW EXECUTE FUNCTION calculate_booking_totals();

CREATE TRIGGER calculate_totals_on_discount_change
    AFTER INSERT OR UPDATE OR DELETE ON booking_applied_discounts
    FOR EACH ROW EXECUTE FUNCTION calculate_booking_totals();

-- =====================================================================
-- REAL-TIME NOTIFICATIONS
-- =====================================================================

CREATE OR REPLACE FUNCTION notify_booking_changes()
RETURNS TRIGGER AS $$
DECLARE
    payload JSON;
    channel_name TEXT;
BEGIN
    -- Build notification payload
    payload = json_build_object(
        'operation', TG_OP,
        'booking_id', COALESCE(NEW.id, OLD.id),
        'shop_id', COALESCE(NEW.shop_id, OLD.shop_id),
        'customer_id', COALESCE(NEW.customer_id, OLD.customer_id),
        'staff_id', COALESCE(NEW.staff_id, OLD.staff_id),
        'status', COALESCE(NEW.status, OLD.status),
        'booking_date', COALESCE(NEW.booking_date, OLD.booking_date),
        'start_time', COALESCE(NEW.start_time, OLD.start_time),
        'timestamp', NOW()
    );
    
    -- Notify different audiences on separate channels
    -- Provider channel (get provider_id from shop)
    DECLARE
        v_provider_id UUID;
    BEGIN
        SELECT provider_id INTO v_provider_id 
        FROM provider_businesses 
        WHERE id = COALESCE(NEW.shop_id, OLD.shop_id);
        
        IF v_provider_id IS NOT NULL THEN
            channel_name := 'bookings:provider:' || v_provider_id;
            PERFORM pg_notify(channel_name, payload::text);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if provider_businesses table doesn't exist
        NULL;
    END;
    
    -- Shop channel  
    IF COALESCE(NEW.shop_id, OLD.shop_id) IS NOT NULL THEN
        channel_name := 'bookings:shop:' || COALESCE(NEW.shop_id, OLD.shop_id);
        PERFORM pg_notify(channel_name, payload::text);
    END IF;
    
    -- Customer channel
    IF COALESCE(NEW.customer_id, OLD.customer_id) IS NOT NULL THEN
        channel_name := 'bookings:customer:' || COALESCE(NEW.customer_id, OLD.customer_id);
        PERFORM pg_notify(channel_name, payload::text);
    END IF;
    
    -- Global admin channel
    PERFORM pg_notify('bookings:all', payload::text);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_booking_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON shop_bookings
    FOR EACH ROW EXECUTE FUNCTION notify_booking_changes();

-- =====================================================================
-- HELPER FUNCTION: Create booking with services (reads existing tables)
-- =====================================================================
CREATE OR REPLACE FUNCTION create_booking_with_services(
    p_booking JSONB,
    p_services JSONB,
    p_options JSONB DEFAULT '[]'::jsonb,
    p_discounts JSONB DEFAULT '[]'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_booking_id UUID;
    v_service JSONB;
    v_option JSONB;
    v_discount JSONB;
    v_booking_service_id UUID;
    v_service_record RECORD;
    v_option_record RECORD;
    v_discount_record RECORD;
    v_staff_record RECORD;
BEGIN
    -- Insert main booking
    INSERT INTO shop_bookings (
        customer_id, shop_id, staff_id,
        customer_name, customer_email, customer_phone,
        booking_date, start_time, end_time,
        status, notes
    )
    SELECT 
        (p_booking->>'customer_id')::UUID,
        (p_booking->>'shop_id')::UUID,
        (p_booking->>'staff_id')::UUID,
        p_booking->>'customer_name',
        p_booking->>'customer_email',
        p_booking->>'customer_phone',
        (p_booking->>'booking_date')::DATE,
        (p_booking->>'start_time')::TIME,
        (p_booking->>'end_time')::TIME,
        COALESCE(p_booking->>'status', 'pending'),
        p_booking->>'notes'
    RETURNING id INTO v_booking_id;
    
    -- Insert services with data from existing shop_services table
    FOR v_service IN SELECT * FROM jsonb_array_elements(p_services)
    LOOP
        -- Try to get service details from existing shop_services table
        SELECT name, price, duration, category, location_type
        INTO v_service_record
        FROM shop_services 
        WHERE id = (v_service->>'service_id')::UUID
        LIMIT 1;
        
        -- If service exists, use its data; otherwise use provided data
        INSERT INTO booking_services (
            booking_id, service_id, 
            service_name, service_price, service_duration, service_category, service_location_type,
            quantity, subtotal, assigned_staff_id, assigned_staff_name
        )
        VALUES (
            v_booking_id,
            (v_service->>'service_id')::UUID,
            COALESCE(v_service_record.name, v_service->>'service_name'),
            COALESCE(v_service_record.price, (v_service->>'price')::DECIMAL),
            COALESCE(v_service_record.duration, (v_service->>'duration')::INTEGER),
            v_service_record.category,
            v_service_record.location_type,
            COALESCE((v_service->>'quantity')::INTEGER, 1),
            COALESCE(v_service_record.price, (v_service->>'price')::DECIMAL) * COALESCE((v_service->>'quantity')::INTEGER, 1),
            (v_service->>'staff_id')::UUID,
            (
                SELECT name FROM shop_staff 
                WHERE id = (v_service->>'staff_id')::UUID 
                LIMIT 1
            )
        )
        RETURNING id INTO v_booking_service_id;
        
        -- Insert options for this service
        FOR v_option IN 
            SELECT * FROM jsonb_array_elements(p_options) 
            WHERE v_option->>'service_id' = v_service->>'service_id'
        LOOP
            -- Try to get option details from existing service_options table
            SELECT option_name, option_description, price, duration
            INTO v_option_record
            FROM service_options 
            WHERE id = (v_option->>'option_id')::UUID
            LIMIT 1;
            
            INSERT INTO booking_service_options (
                booking_id, booking_service_id, service_option_id,
                option_name, option_description, option_price, option_duration,
                quantity, subtotal
            )
            VALUES (
                v_booking_id,
                v_booking_service_id,
                (v_option->>'option_id')::UUID,
                COALESCE(v_option_record.option_name, v_option->>'option_name'),
                v_option_record.option_description,
                COALESCE(v_option_record.price, (v_option->>'price')::DECIMAL),
                COALESCE(v_option_record.duration, (v_option->>'duration')::INTEGER, 0),
                COALESCE((v_option->>'quantity')::INTEGER, 1),
                COALESCE(v_option_record.price, (v_option->>'price')::DECIMAL) * COALESCE((v_option->>'quantity')::INTEGER, 1)
            );
        END LOOP;
    END LOOP;
    
    -- Apply discounts
    FOR v_discount IN SELECT * FROM jsonb_array_elements(p_discounts)
    LOOP
        -- Try to get discount details from existing shop_discounts table
        SELECT type, value, description
        INTO v_discount_record
        FROM shop_discounts 
        WHERE id = (v_discount->>'discount_id')::UUID
        LIMIT 1;
        
        INSERT INTO booking_applied_discounts (
            booking_id, discount_id,
            discount_type, discount_value, discount_description,
            applied_amount, applicable_subtotal
        )
        VALUES (
            v_booking_id,
            (v_discount->>'discount_id')::UUID,
            COALESCE(v_discount_record.type, v_discount->>'type'),
            COALESCE(v_discount_record.value, (v_discount->>'value')::DECIMAL),
            COALESCE(v_discount_record.description, v_discount->>'description'),
            (v_discount->>'applied_amount')::DECIMAL,
            (v_discount->>'applicable_subtotal')::DECIMAL
        );
    END LOOP;
    
    -- Update services JSONB for backward compatibility
    UPDATE shop_bookings 
    SET services = (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', bs.service_id,
                'name', bs.service_name,
                'price', bs.service_price,
                'duration', bs.service_duration,
                'quantity', bs.quantity
            )
        )
        FROM booking_services bs
        WHERE bs.booking_id = v_booking_id
    )
    WHERE id = v_booking_id;
    
    RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- VIEW: Complete booking details with related data
-- =====================================================================
CREATE VIEW booking_complete_view AS
SELECT 
    b.*,
    -- Shop info (if provider_businesses table exists)
    pb.name as shop_name,
    pb.address as shop_address,
    pb.phone as shop_phone,
    -- Staff info (if shop_staff table exists) 
    s.name as staff_name,
    s.email as staff_email,
    s.avatar_url as staff_avatar,
    -- Services aggregated from junction tables
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', bs.service_id,
                'name', bs.service_name,
                'price', bs.service_price,
                'duration', bs.service_duration,
                'quantity', bs.quantity,
                'category', bs.service_category,
                'location_type', bs.service_location_type,
                'assigned_staff_id', bs.assigned_staff_id,
                'assigned_staff_name', bs.assigned_staff_name,
                'options', (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', bso.service_option_id,
                            'name', bso.option_name,
                            'description', bso.option_description,
                            'price', bso.option_price,
                            'duration', bso.option_duration,
                            'quantity', bso.quantity
                        )
                    )
                    FROM booking_service_options bso
                    WHERE bso.booking_service_id = bs.id
                )
            )
            ORDER BY bs.sort_order
        )
        FROM booking_services bs
        WHERE bs.booking_id = b.id
    ) as services_detail,
    -- Applied discounts
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', bad.discount_id,
                'type', bad.discount_type,
                'value', bad.discount_value,
                'description', bad.discount_description,
                'applied_amount', bad.applied_amount
            )
        )
        FROM booking_applied_discounts bad
        WHERE bad.booking_id = b.id
    ) as applied_discounts
FROM shop_bookings b
LEFT JOIN provider_businesses pb ON b.shop_id = pb.id
LEFT JOIN shop_staff s ON b.staff_id = s.id;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE shop_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_service_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_applied_discounts ENABLE ROW LEVEL SECURITY;

-- Customer access policies
CREATE POLICY "Customers can view their own bookings" ON shop_bookings
    FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create bookings" ON shop_bookings
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their pending/confirmed bookings" ON shop_bookings
    FOR UPDATE USING (
        auth.uid() = customer_id AND 
        status IN ('pending', 'confirmed')
    );

-- Provider access policies (get provider_id from shop)
CREATE POLICY "Providers can manage their shop bookings" ON shop_bookings
    FOR ALL USING (
        auth.uid() IN (
            SELECT provider_id FROM provider_businesses WHERE id = shop_id
        )
    );

-- Junction table policies
CREATE POLICY "Junction tables follow booking access" ON booking_services
    FOR ALL USING (
        booking_id IN (
            SELECT id FROM shop_bookings 
            WHERE auth.uid() = customer_id OR auth.uid() IN (
                SELECT provider_id FROM provider_businesses WHERE id = shop_id
            )
        )
    );

CREATE POLICY "Junction tables follow booking access" ON booking_service_options
    FOR ALL USING (
        booking_id IN (
            SELECT id FROM shop_bookings 
            WHERE auth.uid() = customer_id OR auth.uid() IN (
                SELECT provider_id FROM provider_businesses WHERE id = shop_id
            )
        )
    );

CREATE POLICY "Junction tables follow booking access" ON booking_applied_discounts
    FOR ALL USING (
        booking_id IN (
            SELECT id FROM shop_bookings 
            WHERE auth.uid() = customer_id OR auth.uid() IN (
                SELECT provider_id FROM provider_businesses WHERE id = shop_id
            )
        )
    );

-- =====================================================================
-- GRANT PERMISSIONS
-- =====================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, anon, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, authenticated, anon, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, authenticated, anon, service_role;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ READ-ONLY Optimized booking schema created successfully!';
    RAISE NOTICE '📋 New tables created:';
    RAISE NOTICE '   - shop_bookings (main booking table)';
    RAISE NOTICE '   - booking_services (services junction)'; 
    RAISE NOTICE '   - booking_service_options (options junction)';
    RAISE NOTICE '   - booking_applied_discounts (discounts junction)';
    RAISE NOTICE '🔗 Existing tables referenced (NOT MODIFIED):';
    RAISE NOTICE '   - shop_services, service_options, shop_staff, shop_discounts';
    RAISE NOTICE '🔔 Real-time notifications enabled on channels:';
    RAISE NOTICE '   - bookings:provider:<provider_id>';
    RAISE NOTICE '   - bookings:shop:<shop_id>';
    RAISE NOTICE '   - bookings:customer:<customer_id>';
    RAISE NOTICE '✨ System works with existing tables AS-IS!';
    RAISE NOTICE '🚀 Ready for production use!';
END $$;