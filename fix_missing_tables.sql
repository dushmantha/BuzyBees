-- Fix Missing Tables and Views for Complete Functionality
-- This adds the tables that the normalized service expects

-- ===============================================
-- MISSING TABLES FOR BUSINESS HOURS
-- ===============================================

-- Business Hours Table
CREATE TABLE IF NOT EXISTS shop_business_hours (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    day VARCHAR(10) NOT NULL,
    is_open BOOLEAN DEFAULT true,
    open_time TIME DEFAULT '09:00',
    close_time TIME DEFAULT '17:00',
    is_always_open BOOLEAN DEFAULT false,
    timezone VARCHAR(50) DEFAULT 'Europe/Stockholm',
    priority INTEGER DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Special Days Table
CREATE TABLE IF NOT EXISTS shop_special_days (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL,
    date DATE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'holiday',
    is_open BOOLEAN DEFAULT false,
    open_time TIME,
    close_time TIME,
    is_always_open BOOLEAN DEFAULT false,
    recurring VARCHAR(20) DEFAULT 'none',
    recurring_until DATE,
    color VARCHAR(7) DEFAULT '#FF6B6B',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Shop Schedules Table (for advanced scheduling features)
CREATE TABLE IF NOT EXISTS shop_schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_start_time TIME DEFAULT '09:00',
    default_end_time TIME DEFAULT '17:00',
    timezone VARCHAR(50) DEFAULT 'Europe/Stockholm',
    advance_booking_days INTEGER DEFAULT 30,
    slot_duration INTEGER DEFAULT 60,
    buffer_time INTEGER DEFAULT 15,
    auto_approval BOOLEAN DEFAULT true,
    cancellation_hours INTEGER DEFAULT 24,
    enable_breaks BOOLEAN DEFAULT false,
    observe_public_holidays BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add schedule_id to provider_businesses if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'provider_businesses' AND column_name = 'schedule_id') THEN
        ALTER TABLE provider_businesses ADD COLUMN schedule_id UUID REFERENCES shop_schedules(id);
    END IF;
END $$;

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_shop_business_hours_shop_id ON shop_business_hours(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_business_hours_provider_id ON shop_business_hours(provider_id);
CREATE INDEX IF NOT EXISTS idx_shop_business_hours_day ON shop_business_hours(day);
CREATE INDEX IF NOT EXISTS idx_shop_business_hours_active ON shop_business_hours(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_shop_special_days_shop_id ON shop_special_days(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_special_days_provider_id ON shop_special_days(provider_id);
CREATE INDEX IF NOT EXISTS idx_shop_special_days_date ON shop_special_days(date);
CREATE INDEX IF NOT EXISTS idx_shop_special_days_active ON shop_special_days(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_shop_schedules_provider_id ON shop_schedules(provider_id);

-- ===============================================
-- ROW LEVEL SECURITY
-- ===============================================

ALTER TABLE shop_business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_special_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shop_business_hours
DROP POLICY IF EXISTS "Providers can manage own business hours" ON shop_business_hours;
CREATE POLICY "Providers can manage own business hours" ON shop_business_hours
    FOR ALL USING (auth.uid()::uuid = provider_id);

DROP POLICY IF EXISTS "Anyone can view active business hours" ON shop_business_hours;
CREATE POLICY "Anyone can view active business hours" ON shop_business_hours
    FOR SELECT USING (is_active = true);

-- RLS Policies for shop_special_days
DROP POLICY IF EXISTS "Providers can manage own special days" ON shop_special_days;
CREATE POLICY "Providers can manage own special days" ON shop_special_days
    FOR ALL USING (auth.uid()::uuid = provider_id);

DROP POLICY IF EXISTS "Anyone can view active special days" ON shop_special_days;
CREATE POLICY "Anyone can view active special days" ON shop_special_days
    FOR SELECT USING (is_active = true);

-- RLS Policies for shop_schedules
DROP POLICY IF EXISTS "Providers can manage own schedules" ON shop_schedules;
CREATE POLICY "Providers can manage own schedules" ON shop_schedules
    FOR ALL USING (auth.uid()::uuid = provider_id);

-- ===============================================
-- SHOP_COMPLETE VIEW
-- ===============================================

CREATE OR REPLACE VIEW shop_complete AS
SELECT 
    pb.*,
    -- Aggregate business hours
    COALESCE(
        (SELECT json_agg(
            json_build_object(
                'id', sbh.id,
                'day', sbh.day,
                'is_open', sbh.is_open,
                'open_time', sbh.open_time,
                'close_time', sbh.close_time,
                'is_always_open', sbh.is_always_open,
                'timezone', sbh.timezone,
                'priority', sbh.priority,
                'description', sbh.description,
                'is_active', sbh.is_active
            ) ORDER BY 
                CASE sbh.day
                    WHEN 'Monday' THEN 1
                    WHEN 'Tuesday' THEN 2
                    WHEN 'Wednesday' THEN 3
                    WHEN 'Thursday' THEN 4
                    WHEN 'Friday' THEN 5
                    WHEN 'Saturday' THEN 6
                    WHEN 'Sunday' THEN 7
                END
        )
        FROM shop_business_hours sbh 
        WHERE sbh.shop_id = pb.id AND sbh.is_active = true),
        '[]'::json
    ) as business_hours,
    -- Aggregate special days
    COALESCE(
        (SELECT json_agg(
            json_build_object(
                'id', ssd.id,
                'date', ssd.date,
                'name', ssd.name,
                'description', ssd.description,
                'type', ssd.type,
                'is_open', ssd.is_open,
                'open_time', ssd.open_time,
                'close_time', ssd.close_time,
                'is_always_open', ssd.is_always_open,
                'recurring', ssd.recurring,
                'recurring_until', ssd.recurring_until,
                'color', ssd.color,
                'priority', ssd.priority,
                'is_active', ssd.is_active
            ) ORDER BY ssd.date
        )
        FROM shop_special_days ssd 
        WHERE ssd.shop_id = pb.id AND ssd.is_active = true),
        '[]'::json
    ) as special_days,
    -- Aggregate staff
    COALESCE(
        (SELECT json_agg(
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
            ) ORDER BY ss.name
        )
        FROM shop_staff ss 
        WHERE ss.shop_id = pb.id AND ss.is_active = true),
        '[]'::json
    ) as staff,
    -- Aggregate services
    COALESCE(
        (SELECT json_agg(
            json_build_object(
                'id', srv.id,
                'name', srv.name,
                'description', srv.description,
                'category', srv.category,
                'price', srv.price,
                'duration', srv.duration,
                'has_options', srv.has_options,
                'base_price', srv.base_price,
                'base_duration', srv.base_duration,
                'assigned_staff', srv.assigned_staff,
                'image_url', srv.image_url,
                'is_active', srv.is_active
            ) ORDER BY srv.name
        )
        FROM shop_services srv 
        WHERE srv.shop_id = pb.id AND srv.is_active = true),
        '[]'::json
    ) as services,
    -- Aggregate discounts
    COALESCE(
        (SELECT json_agg(
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
            ) ORDER BY sd.start_date
        )
        FROM shop_discounts sd 
        WHERE sd.shop_id = pb.id AND sd.is_active = true),
        '[]'::json
    ) as discounts
FROM provider_businesses pb
WHERE pb.is_active = true;

-- ===============================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ===============================================

DROP TRIGGER IF EXISTS update_shop_business_hours_updated_at ON shop_business_hours;
CREATE TRIGGER update_shop_business_hours_updated_at 
    BEFORE UPDATE ON shop_business_hours 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shop_special_days_updated_at ON shop_special_days;
CREATE TRIGGER update_shop_special_days_updated_at 
    BEFORE UPDATE ON shop_special_days 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shop_schedules_updated_at ON shop_schedules;
CREATE TRIGGER update_shop_schedules_updated_at 
    BEFORE UPDATE ON shop_schedules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- VERIFICATION
-- ===============================================

SELECT 
    '✅ MISSING TABLES ADDED SUCCESSFULLY!' as status,
    'Business hours, special days, schedules, and shop_complete view are now available!' as message,
    (SELECT COUNT(*) FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name IN ('shop_business_hours', 'shop_special_days', 'shop_schedules')) as new_tables_created,
    (SELECT COUNT(*) FROM information_schema.views 
     WHERE table_schema = 'public' 
     AND table_name = 'shop_complete') as views_created;