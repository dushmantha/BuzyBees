-- Add Stripe subscription fields to users table
-- Migration: Add Stripe payment and subscription support

-- Add subscription and payment tracking columns
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

-- Create payments table for transaction history
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_payment_intent_id VARCHAR(255),
    stripe_session_id VARCHAR(255),
    subscription_id VARCHAR(255),
    amount INTEGER NOT NULL, -- Amount in cents
    currency VARCHAR(3) DEFAULT 'usd',
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'cancelled')),
    plan_type VARCHAR(20) CHECK (plan_type IN ('monthly', 'yearly')),
    payment_method VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session_id ON payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Create subscription_history table for tracking changes
CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id VARCHAR(255),
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'cancelled', 'expired', 'renewed'
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    plan_type VARCHAR(20),
    amount INTEGER,
    currency VARCHAR(3) DEFAULT 'usd',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for subscription_history table
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_action ON subscription_history(action);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON subscription_history(created_at);

-- Function to update user premium status based on subscription
CREATE OR REPLACE FUNCTION update_user_premium_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update is_premium based on subscription_status
    IF NEW.subscription_status = 'active' THEN
        NEW.is_premium = true;
    ELSE
        NEW.is_premium = false;
    END IF;
    
    -- Update updated_at timestamp
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update premium status
DROP TRIGGER IF EXISTS trigger_update_user_premium_status ON users;
CREATE TRIGGER trigger_update_user_premium_status
    BEFORE UPDATE ON users
    FOR EACH ROW
    WHEN (OLD.subscription_status IS DISTINCT FROM NEW.subscription_status)
    EXECUTE FUNCTION update_user_premium_status();

-- Function to create payment record
CREATE OR REPLACE FUNCTION create_payment_record(
    p_user_id UUID,
    p_stripe_session_id VARCHAR(255),
    p_subscription_id VARCHAR(255),
    p_amount INTEGER,
    p_currency VARCHAR(3),
    p_status VARCHAR(20),
    p_plan_type VARCHAR(20),
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    payment_id UUID;
BEGIN
    INSERT INTO payments (
        user_id,
        stripe_session_id,
        subscription_id,
        amount,
        currency,
        status,
        plan_type,
        metadata
    ) VALUES (
        p_user_id,
        p_stripe_session_id,
        p_subscription_id,
        p_amount,
        p_currency,
        p_status,
        p_plan_type,
        p_metadata
    )
    RETURNING id INTO payment_id;
    
    RETURN payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user subscription from Stripe webhook
CREATE OR REPLACE FUNCTION update_user_subscription_from_webhook(
    p_user_id UUID,
    p_subscription_id VARCHAR(255),
    p_subscription_status VARCHAR(20),
    p_plan_type VARCHAR(20),
    p_current_period_start TIMESTAMP WITH TIME ZONE,
    p_current_period_end TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update user subscription details
    UPDATE users 
    SET 
        subscription_id = p_subscription_id,
        subscription_status = p_subscription_status,
        subscription_type = p_plan_type,
        subscription_start_date = p_current_period_start,
        subscription_end_date = p_current_period_end,
        is_premium = CASE WHEN p_subscription_status = 'active' THEN true ELSE false END,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Log the subscription change
    INSERT INTO subscription_history (
        user_id,
        subscription_id,
        action,
        new_status,
        plan_type,
        metadata
    ) VALUES (
        p_user_id,
        p_subscription_id,
        'updated',
        p_subscription_status,
        p_plan_type,
        jsonb_build_object(
            'current_period_start', p_current_period_start,
            'current_period_end', p_current_period_end,
            'updated_by', 'webhook'
        )
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;