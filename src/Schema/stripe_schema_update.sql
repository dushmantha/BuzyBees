-- Add Stripe subscription fields to users table
-- Run this in Supabase SQL Editor if the fields don't exist yet

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(20) CHECK (subscription_type IN ('monthly', 'yearly')),
ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'expired', 'past_due')),
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_end_date ON users(subscription_end_date);
CREATE INDEX IF NOT EXISTS idx_users_is_premium ON users(is_premium);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_subscription_id ON users(subscription_id);

-- Add unique constraint on stripe_customer_id (if not exists)
DO $$ 
BEGIN
    ALTER TABLE users ADD CONSTRAINT unique_stripe_customer_id UNIQUE (stripe_customer_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;