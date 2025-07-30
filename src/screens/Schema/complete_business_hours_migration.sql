-- ===============================================
-- COMPLETE BUSINESS HOURS MIGRATION
-- ===============================================
-- This migration adds comprehensive business hours support

-- Create shop_business_hours table if it doesn't exist
CREATE TABLE IF NOT EXISTS shop_business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
  day INTEGER NOT NULL CHECK (day >= 0 AND day <= 6), -- 0=Sunday, 1=Monday, etc.
  is_open BOOLEAN NOT NULL DEFAULT true,
  open_time TIME,
  close_time TIME,
  is_always_open BOOLEAN DEFAULT false,
  timezone VARCHAR(50) DEFAULT 'Europe/Stockholm',
  priority INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create shop_special_days table if it doesn't exist
CREATE TABLE IF NOT EXISTS shop_special_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES provider_businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type VARCHAR(20) DEFAULT 'holiday' CHECK (type IN ('holiday', 'special_hours', 'closed', 'custom')),
  is_open BOOLEAN DEFAULT false,
  open_time TIME,
  close_time TIME,
  is_always_open BOOLEAN DEFAULT false,
  recurring BOOLEAN DEFAULT false,
  recurring_until DATE,
  color VARCHAR(7) DEFAULT '#ff0000',
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shop_business_hours_shop_id ON shop_business_hours(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_business_hours_day ON shop_business_hours(day);
CREATE INDEX IF NOT EXISTS idx_shop_special_days_shop_id ON shop_special_days(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_special_days_date ON shop_special_days(date);

-- Enable RLS
ALTER TABLE shop_business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_special_days ENABLE ROW LEVEL SECURITY;

-- Create policies for business hours
CREATE POLICY "Providers can manage own business hours" ON shop_business_hours
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM provider_businesses pb 
      WHERE pb.id = shop_business_hours.shop_id 
      AND pb.provider_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active business hours" ON shop_business_hours
  FOR SELECT USING (is_active = true);

-- Create policies for special days
CREATE POLICY "Providers can manage own special days" ON shop_special_days
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM provider_businesses pb 
      WHERE pb.id = shop_special_days.shop_id 
      AND pb.provider_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view active special days" ON shop_special_days
  FOR SELECT USING (is_active = true);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Business hours migration completed successfully!';
    RAISE NOTICE 'Tables created: shop_business_hours, shop_special_days';
    RAISE NOTICE 'Indexes and RLS policies applied';
END $$;