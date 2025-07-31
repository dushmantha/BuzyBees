-- ===============================================
-- PAYMENT TABLE SCHEMA
-- ===============================================
-- This table stores payment records for completed bookings

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Booking reference
  booking_id VARCHAR(255) NOT NULL,
  
  -- Provider and client info
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES provider_businesses(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_phone VARCHAR(20),
  
  -- Service details
  service_title VARCHAR(255) NOT NULL,
  service_type VARCHAR(255),
  service_date DATE NOT NULL,
  service_time VARCHAR(50),
  duration VARCHAR(50),
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NZD',
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  
  -- Additional info
  notes TEXT,
  location_type VARCHAR(20) CHECK (location_type IN ('in_house', 'on_location')),
  location TEXT,
  
  -- Invoice details
  invoice_sent BOOLEAN DEFAULT false,
  invoice_number VARCHAR(100),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_id ON payments(provider_id);
CREATE INDEX IF NOT EXISTS idx_payments_shop_id ON payments(shop_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_service_date ON payments(service_date);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Create RLS policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Providers can view own payments" ON payments;
DROP POLICY IF EXISTS "Providers can insert own payments" ON payments;
DROP POLICY IF EXISTS "Providers can update own payments" ON payments;

-- Providers can view their own payments
CREATE POLICY "Providers can view own payments" ON payments
  FOR SELECT USING (provider_id = auth.uid());

-- Providers can insert their own payments
CREATE POLICY "Providers can insert own payments" ON payments
  FOR INSERT WITH CHECK (provider_id = auth.uid());

-- Providers can update their own payments
CREATE POLICY "Providers can update own payments" ON payments
  FOR UPDATE USING (provider_id = auth.uid());

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS trigger_update_payments_updated_at ON payments;
CREATE TRIGGER trigger_update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- Function to update paid_at when status changes to 'paid'
CREATE OR REPLACE FUNCTION update_payment_paid_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    NEW.paid_at = CURRENT_TIMESTAMP;
  ELSIF NEW.payment_status != 'paid' THEN
    NEW.paid_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update paid_at
DROP TRIGGER IF EXISTS trigger_update_payment_paid_at ON payments;
CREATE TRIGGER trigger_update_payment_paid_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_paid_at();