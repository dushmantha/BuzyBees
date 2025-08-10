-- COMPREHENSIVE SHOP CRUD FUNCTIONS
-- Complete system for managing shops with all related tables:
-- - provider_businesses (main shop)
-- - shop_staff (staff management)
-- - shop_services (services with options mapping)
-- - shop_discounts (discount management)
-- - service_options (linked to services)

-- ============================================
-- 1. COMPLETE SHOP CREATION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION buzybees_create_complete_shop(
    -- Shop Basic Info
    p_provider_id UUID,
    p_name TEXT,
    p_description TEXT DEFAULT '',
    p_category TEXT DEFAULT 'Beauty & Wellness',
    p_phone TEXT DEFAULT '',
    p_email TEXT DEFAULT '',
    p_website_url TEXT DEFAULT NULL,
    p_address TEXT DEFAULT '',
    p_city TEXT DEFAULT '',
    p_state TEXT DEFAULT '',
    p_country TEXT DEFAULT 'Sweden',
    p_image_url TEXT DEFAULT NULL,
    p_images TEXT[] DEFAULT ARRAY[]::TEXT[],
    p_logo_url TEXT DEFAULT NULL,
    p_business_hours JSONB DEFAULT '[
        {"day": "Monday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        {"day": "Tuesday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        {"day": "Wednesday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        {"day": "Thursday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        {"day": "Friday", "isOpen": true, "openTime": "09:00", "closeTime": "17:00"},
        {"day": "Saturday", "isOpen": true, "openTime": "10:00", "closeTime": "16:00"},
        {"day": "Sunday", "isOpen": false, "openTime": "10:00", "closeTime": "16:00"}
    ]'::jsonb,
    p_special_days JSONB DEFAULT '[]'::jsonb,
    p_timezone TEXT DEFAULT 'Europe/Stockholm',
    p_advance_booking_days INTEGER DEFAULT 30,
    p_slot_duration INTEGER DEFAULT 60,
    p_buffer_time INTEGER DEFAULT 15,
    p_auto_approval BOOLEAN DEFAULT true,
    p_first_time_discount_active BOOLEAN DEFAULT true,
    p_is_active BOOLEAN DEFAULT true
)
RETURNS TABLE(
    shop_id UUID,
    success BOOLEAN,
    message TEXT,
    staff_created INTEGER,
    services_created INTEGER,
    discounts_created INTEGER,
    shop_data JSONB
) LANGUAGE plpgsql AS $$
DECLARE
    new_shop_id UUID;
    staff_count INTEGER := 0;
    services_count INTEGER := 0;
    discounts_count INTEGER := 0;
    monday_hours JSONB;
    start_time TIME;
    end_time TIME;
    created_shop RECORD;
BEGIN
    -- Validate required fields
    IF p_provider_id IS NULL OR p_name IS NULL OR trim(p_name) = '' THEN
        RETURN QUERY SELECT 
            NULL::UUID, false, 'Provider ID and shop name are required'::TEXT, 
            0, 0, 0, NULL::JSONB;
        RETURN;
    END IF;
    
    -- Extract business hours for legacy fields
    monday_hours := p_business_hours->0;
    start_time := COALESCE((monday_hours->>'openTime')::TIME, '09:00'::TIME);
    end_time := COALESCE((monday_hours->>'closeTime')::TIME, '17:00'::TIME);
    
    -- Create shop in provider_businesses table (triggers will run automatically)
    INSERT INTO provider_businesses (
        provider_id, name, description, category, phone, email, website_url,
        address, city, state, country, image_url, images, logo_url,
        business_hours, special_days, timezone, advance_booking_days,
        slot_duration, buffer_time, auto_approval, first_time_discount_active,
        business_hours_start, business_hours_end, is_active
    ) VALUES (
        p_provider_id, trim(p_name), trim(p_description), p_category,
        trim(p_phone), trim(p_email), NULLIF(trim(p_website_url), ''),
        trim(p_address), trim(p_city), trim(p_state), p_country,
        NULLIF(trim(p_image_url), ''), p_images, NULLIF(trim(p_logo_url), ''),
        p_business_hours, p_special_days, p_timezone, p_advance_booking_days,
        p_slot_duration, p_buffer_time, p_auto_approval, p_first_time_discount_active,
        start_time, end_time, p_is_active
    ) RETURNING id INTO new_shop_id;
    
    -- Wait for automatic trigger to create related records
    PERFORM pg_sleep(0.3);
    
    -- Count created records
    SELECT COUNT(*) INTO staff_count FROM shop_staff s WHERE s.shop_id = new_shop_id;
    SELECT COUNT(*) INTO services_count FROM shop_services sv WHERE sv.shop_id = new_shop_id;
    SELECT COUNT(*) INTO discounts_count FROM shop_discounts d WHERE d.shop_id = new_shop_id;
    
    -- Get complete shop data
    SELECT * INTO created_shop FROM provider_businesses WHERE id = new_shop_id;
    
    RETURN QUERY SELECT 
        new_shop_id, true, 'Shop created successfully with all related data'::TEXT,
        staff_count, services_count, discounts_count, to_jsonb(created_shop);

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
        NULL::UUID, false, 'Error creating shop: ' || SQLERRM, 
        0, 0, 0, NULL::JSONB;
END $$;

-- ============================================
-- 2. COMPLETE SHOP UPDATE FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION buzybees_update_complete_shop(
    p_shop_id UUID,
    p_provider_id UUID DEFAULT NULL,
    -- Shop fields (pass NULL to skip updating)
    p_name TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL,
    p_website_url TEXT DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_country TEXT DEFAULT NULL,
    p_image_url TEXT DEFAULT NULL,
    p_images TEXT[] DEFAULT NULL,
    p_logo_url TEXT DEFAULT NULL,
    p_business_hours JSONB DEFAULT NULL,
    p_special_days JSONB DEFAULT NULL,
    p_timezone TEXT DEFAULT NULL,
    p_advance_booking_days INTEGER DEFAULT NULL,
    p_slot_duration INTEGER DEFAULT NULL,
    p_buffer_time INTEGER DEFAULT NULL,
    p_auto_approval BOOLEAN DEFAULT NULL,
    p_first_time_discount_active BOOLEAN DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    updated_fields TEXT[],
    shop_data JSONB
) LANGUAGE plpgsql AS $$
DECLARE
    current_shop RECORD;
    updated_fields_list TEXT[] := ARRAY[]::TEXT[];
    monday_hours JSONB;
    start_time TIME;
    end_time TIME;
    updated_shop RECORD;
BEGIN
    -- Validate required parameters
    IF p_shop_id IS NULL THEN
        RETURN QUERY SELECT false, 'Shop ID is required'::TEXT, 
                           ARRAY[]::TEXT[], NULL::JSONB;
        RETURN;
    END IF;

    -- Validate shop exists and belongs to provider (if provider_id is provided)
    IF p_provider_id IS NOT NULL THEN
        SELECT * INTO current_shop 
        FROM provider_businesses 
        WHERE id = p_shop_id AND provider_id = p_provider_id;
    ELSE
        SELECT * INTO current_shop 
        FROM provider_businesses 
        WHERE id = p_shop_id;
    END IF;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Shop not found or access denied'::TEXT, 
                           ARRAY[]::TEXT[], NULL::JSONB;
        RETURN;
    END IF;
    
    -- Extract business hours for legacy fields if provided
    IF p_business_hours IS NOT NULL THEN
        monday_hours := p_business_hours->0;
        start_time := COALESCE((monday_hours->>'openTime')::TIME, current_shop.business_hours_start);
        end_time := COALESCE((monday_hours->>'closeTime')::TIME, current_shop.business_hours_end);
    ELSE
        start_time := current_shop.business_hours_start;
        end_time := current_shop.business_hours_end;
    END IF;
    
    -- Update shop with only provided fields
    UPDATE provider_businesses SET
        name = CASE WHEN p_name IS NOT NULL THEN trim(p_name) ELSE name END,
        description = CASE WHEN p_description IS NOT NULL THEN trim(p_description) ELSE description END,
        category = CASE WHEN p_category IS NOT NULL THEN p_category ELSE category END,
        phone = CASE WHEN p_phone IS NOT NULL THEN trim(p_phone) ELSE phone END,
        email = CASE WHEN p_email IS NOT NULL THEN trim(p_email) ELSE email END,
        website_url = CASE WHEN p_website_url IS NOT NULL THEN NULLIF(trim(p_website_url), '') ELSE website_url END,
        address = CASE WHEN p_address IS NOT NULL THEN trim(p_address) ELSE address END,
        city = CASE WHEN p_city IS NOT NULL THEN trim(p_city) ELSE city END,
        state = CASE WHEN p_state IS NOT NULL THEN trim(p_state) ELSE state END,
        country = CASE WHEN p_country IS NOT NULL THEN p_country ELSE country END,
        image_url = CASE WHEN p_image_url IS NOT NULL THEN NULLIF(trim(p_image_url), '') ELSE image_url END,
        images = CASE WHEN p_images IS NOT NULL THEN p_images ELSE images END,
        logo_url = CASE WHEN p_logo_url IS NOT NULL THEN NULLIF(trim(p_logo_url), '') ELSE logo_url END,
        business_hours = CASE WHEN p_business_hours IS NOT NULL THEN p_business_hours ELSE business_hours END,
        special_days = CASE WHEN p_special_days IS NOT NULL THEN p_special_days ELSE special_days END,
        timezone = CASE WHEN p_timezone IS NOT NULL THEN p_timezone ELSE timezone END,
        advance_booking_days = CASE WHEN p_advance_booking_days IS NOT NULL THEN p_advance_booking_days ELSE advance_booking_days END,
        slot_duration = CASE WHEN p_slot_duration IS NOT NULL THEN p_slot_duration ELSE slot_duration END,
        buffer_time = CASE WHEN p_buffer_time IS NOT NULL THEN p_buffer_time ELSE buffer_time END,
        auto_approval = CASE WHEN p_auto_approval IS NOT NULL THEN p_auto_approval ELSE auto_approval END,
        first_time_discount_active = CASE WHEN p_first_time_discount_active IS NOT NULL THEN p_first_time_discount_active ELSE first_time_discount_active END,
        business_hours_start = start_time,
        business_hours_end = end_time,
        is_active = CASE WHEN p_is_active IS NOT NULL THEN p_is_active ELSE is_active END,
        updated_at = NOW()
    WHERE id = p_shop_id;
    
    -- Build list of updated fields
    IF p_name IS NOT NULL THEN updated_fields_list := array_append(updated_fields_list, 'name'); END IF;
    IF p_description IS NOT NULL THEN updated_fields_list := array_append(updated_fields_list, 'description'); END IF;
    IF p_category IS NOT NULL THEN updated_fields_list := array_append(updated_fields_list, 'category'); END IF;
    IF p_phone IS NOT NULL THEN updated_fields_list := array_append(updated_fields_list, 'phone'); END IF;
    IF p_email IS NOT NULL THEN updated_fields_list := array_append(updated_fields_list, 'email'); END IF;
    IF p_business_hours IS NOT NULL THEN updated_fields_list := array_append(updated_fields_list, 'business_hours'); END IF;
    IF p_is_active IS NOT NULL THEN updated_fields_list := array_append(updated_fields_list, 'is_active'); END IF;
    
    -- Get updated shop data
    SELECT * INTO updated_shop FROM provider_businesses WHERE id = p_shop_id;
    
    RETURN QUERY SELECT 
        true, 'Shop updated successfully'::TEXT,
        updated_fields_list, to_jsonb(updated_shop);

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
        false, 'Error updating shop: ' || SQLERRM,
        ARRAY[]::TEXT[], NULL::JSONB;
END $$;

-- ============================================
-- 3. ADD STAFF TO SHOP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION buzybees_add_staff_to_shop(
    p_shop_id UUID,
    p_provider_id UUID,
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT DEFAULT '',
    p_role TEXT DEFAULT 'Staff',
    p_specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
    p_bio TEXT DEFAULT '',
    p_experience_years INTEGER DEFAULT 0,
    p_avatar_url TEXT DEFAULT NULL,
    p_work_schedule JSONB DEFAULT '{
        "monday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "tuesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "wednesday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "thursday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "friday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "saturday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"},
        "sunday": {"isWorking": false, "startTime": "09:00", "endTime": "17:00"}
    }'::jsonb,
    p_leave_dates JSONB DEFAULT '[]'::jsonb,
    p_is_active BOOLEAN DEFAULT true
)
RETURNS TABLE(
    staff_id UUID,
    success BOOLEAN,
    message TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    new_staff_id UUID;
    shop_exists BOOLEAN;
BEGIN
    -- Validate shop exists and belongs to provider
    SELECT EXISTS(
        SELECT 1 FROM provider_businesses 
        WHERE id = p_shop_id AND provider_id = p_provider_id
    ) INTO shop_exists;
    
    IF NOT shop_exists THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Shop not found or access denied'::TEXT;
        RETURN;
    END IF;
    
    -- Validate required fields
    IF p_name IS NULL OR trim(p_name) = '' OR p_email IS NULL OR trim(p_email) = '' THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Staff name and email are required'::TEXT;
        RETURN;
    END IF;
    
    -- Insert staff record
    INSERT INTO shop_staff (
        shop_id, provider_id, name, email, phone, role, specialties,
        bio, experience_years, avatar_url, work_schedule, leave_dates, is_active
    ) VALUES (
        p_shop_id, p_provider_id, trim(p_name), trim(p_email), trim(p_phone),
        p_role, p_specialties, trim(p_bio), p_experience_years, 
        NULLIF(trim(p_avatar_url), ''), p_work_schedule, p_leave_dates, p_is_active
    ) RETURNING id INTO new_staff_id;
    
    -- Update shop's staff_ids array
    UPDATE provider_businesses 
    SET staff_ids = array_append(staff_ids, new_staff_id),
        updated_at = NOW()
    WHERE id = p_shop_id;
    
    RETURN QUERY SELECT new_staff_id, true, 'Staff added successfully'::TEXT;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Error adding staff: ' || SQLERRM;
END $$;

-- ============================================
-- 4. ADD SERVICE TO SHOP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION buzybees_add_service_to_shop(
    p_shop_id UUID,
    p_provider_id UUID,
    p_name TEXT,
    p_price DECIMAL(10,2),
    p_description TEXT DEFAULT '',
    p_duration INTEGER DEFAULT 60,
    p_category TEXT DEFAULT '',
    p_location_type VARCHAR(20) DEFAULT 'in_house',
    p_assigned_staff UUID[] DEFAULT ARRAY[]::UUID[],
    p_image TEXT DEFAULT NULL,
    p_is_active BOOLEAN DEFAULT true,
    -- Service options
    p_service_options JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE(
    service_id UUID,
    success BOOLEAN,
    message TEXT,
    options_created INTEGER
) LANGUAGE plpgsql AS $$
DECLARE
    new_service_id UUID;
    shop_exists BOOLEAN;
    option_record JSONB;
    new_option_id UUID;
    option_ids UUID[] := ARRAY[]::UUID[];
    options_count INTEGER := 0;
BEGIN
    -- Validate shop exists and belongs to provider
    SELECT EXISTS(
        SELECT 1 FROM provider_businesses 
        WHERE id = p_shop_id AND provider_id = p_provider_id
    ) INTO shop_exists;
    
    IF NOT shop_exists THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Shop not found or access denied'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Validate required fields
    IF p_name IS NULL OR trim(p_name) = '' OR p_price IS NULL OR p_price <= 0 THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Service name and valid price are required'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Insert service record
    INSERT INTO shop_services (
        shop_id, name, description, price, duration, category,
        location_type, assigned_staff, image, is_active
    ) VALUES (
        p_shop_id, trim(p_name), trim(p_description), p_price, p_duration, p_category,
        p_location_type, p_assigned_staff, NULLIF(trim(p_image), ''), p_is_active
    ) RETURNING id INTO new_service_id;
    
    -- Create service options if provided
    IF jsonb_array_length(p_service_options) > 0 THEN
        FOR option_record IN SELECT * FROM jsonb_array_elements(p_service_options)
        LOOP
            INSERT INTO service_options (
                service_id, shop_id, option_name, option_description,
                price, duration, is_active, sort_order
            ) VALUES (
                new_service_id, p_shop_id,
                option_record->>'option_name',
                COALESCE(option_record->>'option_description', ''),
                COALESCE((option_record->>'price')::DECIMAL, 0),
                COALESCE((option_record->>'duration')::INTEGER, 30),
                COALESCE((option_record->>'is_active')::BOOLEAN, true),
                COALESCE((option_record->>'sort_order')::INTEGER, options_count)
            ) RETURNING id INTO new_option_id;
            
            option_ids := array_append(option_ids, new_option_id);
            options_count := options_count + 1;
        END LOOP;
    END IF;
    
    -- Update service with option IDs
    UPDATE shop_services 
    SET service_options_ids = option_ids
    WHERE id = new_service_id;
    
    -- Update shop's service_ids array
    UPDATE provider_businesses 
    SET service_ids = array_append(service_ids, new_service_id),
        updated_at = NOW()
    WHERE id = p_shop_id;
    
    RETURN QUERY SELECT new_service_id, true, 'Service added successfully'::TEXT, options_count;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Error adding service: ' || SQLERRM, 0;
END $$;

-- ============================================
-- 5. ADD DISCOUNT TO SHOP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION buzybees_add_discount_to_shop(
    p_shop_id UUID,
    p_provider_id UUID,
    p_type VARCHAR(20),
    p_value DECIMAL(10,2),
    p_description TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_min_amount DECIMAL(10,2) DEFAULT NULL,
    p_max_discount DECIMAL(10,2) DEFAULT NULL,
    p_usage_limit INTEGER DEFAULT NULL,
    p_applicable_services UUID[] DEFAULT ARRAY[]::UUID[],
    p_conditions JSONB DEFAULT '{}'::jsonb,
    p_is_active BOOLEAN DEFAULT true
)
RETURNS TABLE(
    discount_id UUID,
    success BOOLEAN,
    message TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    new_discount_id UUID;
    shop_exists BOOLEAN;
BEGIN
    -- Validate shop exists and belongs to provider
    SELECT EXISTS(
        SELECT 1 FROM provider_businesses 
        WHERE id = p_shop_id AND provider_id = p_provider_id
    ) INTO shop_exists;
    
    IF NOT shop_exists THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Shop not found or access denied'::TEXT;
        RETURN;
    END IF;
    
    -- Validate required fields
    IF p_type NOT IN ('percentage', 'fixed', 'bogo', 'package') OR 
       p_value IS NULL OR p_value <= 0 OR
       p_description IS NULL OR trim(p_description) = '' OR
       p_start_date IS NULL OR p_end_date IS NULL OR p_end_date < p_start_date THEN
        RETURN QUERY SELECT NULL::UUID, false, 'Invalid discount parameters'::TEXT;
        RETURN;
    END IF;
    
    -- Insert discount record
    INSERT INTO shop_discounts (
        shop_id, type, value, description, min_amount, max_discount,
        start_date, end_date, usage_limit, used_count, applicable_services,
        conditions, is_active
    ) VALUES (
        p_shop_id, p_type, p_value, trim(p_description), p_min_amount, p_max_discount,
        p_start_date, p_end_date, p_usage_limit, 0, p_applicable_services,
        p_conditions, p_is_active
    ) RETURNING id INTO new_discount_id;
    
    -- Update shop's discount_ids array
    UPDATE provider_businesses 
    SET discount_ids = array_append(discount_ids, new_discount_id),
        updated_at = NOW()
    WHERE id = p_shop_id;
    
    RETURN QUERY SELECT new_discount_id, true, 'Discount added successfully'::TEXT;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Error adding discount: ' || SQLERRM;
END $$;

-- ============================================
-- 6. GET COMPLETE SHOP DATA FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION buzybees_get_complete_shop_data(
    p_shop_id UUID,
    p_provider_id UUID DEFAULT NULL -- NULL for public view, UUID for owner view
)
RETURNS TABLE(
    shop_data JSONB,
    staff_data JSONB,
    services_data JSONB,
    discounts_data JSONB,
    service_options_data JSONB
) LANGUAGE plpgsql AS $$
DECLARE
    shop_record RECORD;
    staff_records JSONB;
    services_records JSONB;
    discounts_records JSONB;
    service_options_records JSONB;
BEGIN
    -- Get shop data with access control
    IF p_provider_id IS NOT NULL THEN
        -- Owner view - get all data
        SELECT * INTO shop_record 
        FROM provider_businesses 
        WHERE id = p_shop_id AND provider_id = p_provider_id;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT NULL::JSONB, NULL::JSONB, NULL::JSONB, NULL::JSONB, NULL::JSONB;
            RETURN;
        END IF;
        
        -- Get all staff (including inactive for owner)
        SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb) INTO staff_records
        FROM shop_staff s WHERE s.shop_id = p_shop_id;
        
        -- Get all services (including inactive for owner)
        SELECT COALESCE(jsonb_agg(to_jsonb(sv)), '[]'::jsonb) INTO services_records
        FROM shop_services sv WHERE sv.shop_id = p_shop_id;
        
        -- Get all discounts (including inactive for owner)
        SELECT COALESCE(jsonb_agg(to_jsonb(d)), '[]'::jsonb) INTO discounts_records
        FROM shop_discounts d WHERE d.shop_id = p_shop_id;
    ELSE
        -- Public view - only active data
        SELECT * INTO shop_record 
        FROM provider_businesses 
        WHERE id = p_shop_id AND is_active = true;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT NULL::JSONB, NULL::JSONB, NULL::JSONB, NULL::JSONB, NULL::JSONB;
            RETURN;
        END IF;
        
        -- Get only active staff
        SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb) INTO staff_records
        FROM shop_staff s WHERE s.shop_id = p_shop_id AND s.is_active = true;
        
        -- Get only active services
        SELECT COALESCE(jsonb_agg(to_jsonb(sv)), '[]'::jsonb) INTO services_records
        FROM shop_services sv WHERE sv.shop_id = p_shop_id AND sv.is_active = true;
        
        -- Get only active discounts that are currently valid
        SELECT COALESCE(jsonb_agg(to_jsonb(d)), '[]'::jsonb) INTO discounts_records
        FROM shop_discounts d 
        WHERE d.shop_id = p_shop_id AND d.is_active = true
        AND d.start_date <= CURRENT_DATE AND d.end_date >= CURRENT_DATE;
    END IF;
    
    -- Get all active service options for this shop
    SELECT COALESCE(jsonb_agg(to_jsonb(so)), '[]'::jsonb) INTO service_options_records
    FROM service_options so
    WHERE so.shop_id = p_shop_id AND so.is_active = true
    ORDER BY so.service_id, so.sort_order;
    
    RETURN QUERY SELECT
        to_jsonb(shop_record),
        staff_records,
        services_records,
        discounts_records,
        service_options_records;

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::JSONB, NULL::JSONB, NULL::JSONB, NULL::JSONB, NULL::JSONB;
END $$;

-- ============================================
-- 7. SYNC ALL SHOP ARRAYS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION buzybees_sync_all_shop_arrays(p_shop_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    staff_synced INTEGER,
    services_synced INTEGER,
    discounts_synced INTEGER
) LANGUAGE plpgsql AS $$
DECLARE
    staff_ids_array UUID[];
    service_ids_array UUID[];
    discount_ids_array UUID[];
    staff_count INTEGER;
    service_count INTEGER;
    discount_count INTEGER;
BEGIN
    -- Get current IDs from related tables
    SELECT array_agg(id) INTO staff_ids_array FROM shop_staff WHERE shop_id = p_shop_id;
    SELECT array_agg(id) INTO service_ids_array FROM shop_services WHERE shop_id = p_shop_id;
    SELECT array_agg(id) INTO discount_ids_array FROM shop_discounts WHERE shop_id = p_shop_id;
    
    -- Handle NULL arrays
    staff_ids_array := COALESCE(staff_ids_array, ARRAY[]::UUID[]);
    service_ids_array := COALESCE(service_ids_array, ARRAY[]::UUID[]);
    discount_ids_array := COALESCE(discount_ids_array, ARRAY[]::UUID[]);
    
    -- Update provider_businesses with synced arrays
    UPDATE provider_businesses SET
        staff_ids = staff_ids_array,
        service_ids = service_ids_array,
        discount_ids = discount_ids_array,
        updated_at = NOW()
    WHERE id = p_shop_id;
    
    -- Get counts
    staff_count := array_length(staff_ids_array, 1);
    service_count := array_length(service_ids_array, 1);
    discount_count := array_length(discount_ids_array, 1);
    
    RETURN QUERY SELECT
        true, 'All arrays synced successfully'::TEXT,
        COALESCE(staff_count, 0),
        COALESCE(service_count, 0),
        COALESCE(discount_count, 0);

EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT
        false, 'Error syncing arrays: ' || SQLERRM,
        0, 0, 0;
END $$;

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION buzybees_create_complete_shop TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION buzybees_update_complete_shop TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION buzybees_add_staff_to_shop TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION buzybees_add_service_to_shop TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION buzybees_add_discount_to_shop TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION buzybees_get_complete_shop_data TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION buzybees_sync_all_shop_arrays TO authenticated, service_role;

-- ============================================
-- 9. USAGE EXAMPLES
-- ============================================
/*
-- 1. Create a complete shop
SELECT * FROM buzybees_create_complete_shop(
    p_provider_id := 'your-provider-uuid',
    p_name := 'Modern Hair Salon',
    p_description := 'Premium hair services in Stockholm',
    p_phone := '+46 70 123 4567',
    p_email := 'info@salon.se'
);

-- 2. Update shop
SELECT * FROM buzybees_update_complete_shop(
    p_shop_id := 'shop-uuid',
    p_provider_id := 'provider-uuid',
    p_name := 'Updated Salon Name',
    p_phone := '+46 70 999 8888'
);

-- 3. Add staff member
SELECT * FROM buzybees_add_staff_to_shop(
    p_shop_id := 'shop-uuid',
    p_provider_id := 'provider-uuid',
    p_name := 'John Doe',
    p_email := 'john@salon.se',
    p_role := 'Senior Barber',
    p_specialties := ARRAY['hair_cutting', 'beard_trimming']
);

-- 4. Add service with options
SELECT * FROM buzybees_add_service_to_shop(
    p_shop_id := 'shop-uuid',
    p_provider_id := 'provider-uuid',
    p_name := 'Men\'s Haircut',
    p_description := 'Professional haircut service',
    p_price := 35.00,
    p_duration := 45,
    p_service_options := '[
        {"option_name": "Basic Cut", "price": 25.00, "duration": 30},
        {"option_name": "Premium Cut", "price": 45.00, "duration": 60}
    ]'::jsonb
);

-- 5. Add discount
SELECT * FROM buzybees_add_discount_to_shop(
    p_shop_id := 'shop-uuid',
    p_provider_id := 'provider-uuid',
    p_type := 'percentage',
    p_value := 20.00,
    p_description := '20% off first visit',
    p_start_date := CURRENT_DATE,
    p_end_date := CURRENT_DATE + INTERVAL '30 days'
);

-- 6. Get complete shop data (owner view)
SELECT * FROM buzybees_get_complete_shop_data(
    p_shop_id := 'shop-uuid',
    p_provider_id := 'provider-uuid'
);

-- 7. Get shop data (public view)
SELECT * FROM buzybees_get_complete_shop_data(
    p_shop_id := 'shop-uuid'
);

-- 8. Sync all arrays
SELECT * FROM buzybees_sync_all_shop_arrays('shop-uuid');
*/

SELECT 'Comprehensive shop CRUD functions created successfully!' as result;