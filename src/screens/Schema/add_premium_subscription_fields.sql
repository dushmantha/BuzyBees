-- ===============================================
-- ADD PREMIUM SUBSCRIPTION FIELDS TO USERS TABLE
-- ===============================================
-- This script adds subscription management fields to the users table

-- Add subscription management fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(20) CHECK (subscription_type IN ('monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'expired'));

-- Create index on subscription fields
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_end_date ON users(subscription_end_date);
CREATE INDEX IF NOT EXISTS idx_users_is_premium ON users(is_premium);

-- Update RLS policies for users table (if needed)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to check if user has active premium subscription
CREATE OR REPLACE FUNCTION is_user_premium(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT is_premium, subscription_end_date, subscription_status
    INTO user_record
    FROM users
    WHERE id = user_id;
    
    -- If no user found, return false
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user is premium and subscription is active
    IF user_record.is_premium = TRUE AND 
       user_record.subscription_status = 'active' AND
       (user_record.subscription_end_date IS NULL OR user_record.subscription_end_date > NOW()) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to expire subscriptions automatically
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
BEGIN
    -- Update expired subscriptions
    UPDATE users 
    SET 
        is_premium = FALSE,
        subscription_status = 'expired',
        updated_at = NOW()
    WHERE 
        is_premium = TRUE 
        AND subscription_status = 'active'
        AND subscription_end_date IS NOT NULL 
        AND subscription_end_date < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled function to run daily (you'll need to set this up in your backend)
-- For now, just create the function that can be called manually or via cron job
COMMENT ON FUNCTION expire_subscriptions() IS 'Run this function daily to automatically expire subscriptions. Returns count of expired subscriptions.';

-- Sample data verification
DO $$
BEGIN
    RAISE NOTICE 'Premium subscription fields added successfully!';
    RAISE NOTICE 'New fields: subscription_type, subscription_id, subscription_start_date, subscription_end_date, subscription_status';
    RAISE NOTICE 'Functions created: is_user_premium(), expire_subscriptions()';
    RAISE NOTICE 'Remember to call expire_subscriptions() daily in your backend to handle expired subscriptions';
END $$;