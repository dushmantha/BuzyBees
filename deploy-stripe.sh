#!/bin/bash

# Stripe Deployment Script for Supabase
# Usage: 
#   export STRIPE_SECRET_KEY='your-stripe-secret-key'
#   ./deploy-stripe.sh

set -e  # Exit on any error

PROJECT_ID="fezdmxvqurczeqmqvgzm"

# Check if STRIPE_SECRET_KEY is set
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ Error: STRIPE_SECRET_KEY environment variable is not set"
    echo "Please set it before running this script:"
    echo "export STRIPE_SECRET_KEY='your-stripe-secret-key'"
    exit 1
fi

echo "🚀 Deploying Stripe Integration to Supabase"
echo "============================================="
echo "Project ID: $PROJECT_ID"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    if command -v brew &> /dev/null; then
        brew install supabase/tap/supabase
    else
        echo "Please install Supabase CLI manually: https://supabase.com/docs/guides/cli"
        exit 1
    fi
fi

echo "📝 Step 1: Logging in to Supabase..."
supabase login

echo "🔗 Step 2: Linking to project $PROJECT_ID..."
supabase link --project-ref $PROJECT_ID

echo "🔑 Step 3: Setting Stripe secret key..."
supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"

echo "📊 Step 4: Setting up database schema..."
supabase sql --file - << 'EOF'
-- Add subscription and Stripe fields to users table
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
EOF

echo "🔧 Step 5: Deploying Edge Functions..."
echo "  📦 1/6 Deploying stripe-create-payment-session..."
supabase functions deploy stripe-create-payment-session

echo "  📦 2/6 Deploying stripe-get-subscription..."
supabase functions deploy stripe-get-subscription

echo "  📦 3/6 Deploying stripe-cancel-subscription..."
supabase functions deploy stripe-cancel-subscription

echo "  📦 4/6 Deploying stripe-update-subscription..."
supabase functions deploy stripe-update-subscription

echo "  📦 5/6 Deploying stripe-check-payment-status..."
supabase functions deploy stripe-check-payment-status

echo "  📦 6/6 Deploying stripe-webhook..."
supabase functions deploy stripe-webhook

echo ""
echo "✅ Deployment Complete!"
echo "========================"
echo ""
echo "📌 Your Function URLs:"
echo "  • Create Payment: https://$PROJECT_ID.supabase.co/functions/v1/stripe-create-payment-session"
echo "  • Get Subscription: https://$PROJECT_ID.supabase.co/functions/v1/stripe-get-subscription"
echo "  • Cancel Subscription: https://$PROJECT_ID.supabase.co/functions/v1/stripe-cancel-subscription"
echo "  • Update Subscription: https://$PROJECT_ID.supabase.co/functions/v1/stripe-update-subscription"
echo "  • Check Payment: https://$PROJECT_ID.supabase.co/functions/v1/stripe-check-payment-status"
echo "  • Webhook: https://$PROJECT_ID.supabase.co/functions/v1/stripe-webhook"
echo ""
echo "🎯 Next Steps:"
echo "  1. Add webhook URL to Stripe Dashboard:"
echo "     https://dashboard.stripe.com/test/webhooks"
echo "     URL: https://$PROJECT_ID.supabase.co/functions/v1/stripe-webhook"
echo "     Events: checkout.session.completed, customer.subscription.created,"
echo "             customer.subscription.updated, customer.subscription.deleted,"
echo "             invoice.payment_succeeded, invoice.payment_failed"
echo ""
echo "  2. Test the integration:"
echo "     • Clean iOS build: cd ios && pod install && cd .."
echo "     • Rebuild app: npx react-native run-ios"
echo "     • Test subscription upgrade in app"
echo ""
echo "  3. Use test card for sandbox:"
echo "     • Success: 4242 4242 4242 4242"
echo "     • 3D Secure: 4000 0025 0000 3155"
echo "     • Declined: 4000 0000 0000 9995"
echo ""
echo "✨ Your Stripe integration is now live with Supabase!"
echo "   - Sandbox mode for safe testing"
echo "   - Automatic webhook handling"
echo "   - Deep linking for payment completion"