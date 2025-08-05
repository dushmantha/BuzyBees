#!/bin/bash

# ===============================================
# DEPLOY SUPABASE EDGE FUNCTIONS
# ===============================================
# This script deploys the email and SMS functions to Supabase
# Make sure you have Supabase CLI installed: https://supabase.com/docs/guides/cli

echo "🚀 Deploying Supabase Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    echo "   https://supabase.com/docs/guides/cli"
    exit 1
fi

# Login to Supabase (if not already logged in)
echo "🔐 Checking Supabase login status..."
if ! supabase projects list &> /dev/null; then
    echo "Please login to Supabase:"
    supabase login
fi

# Deploy the email function
echo "📧 Deploying send-email function..."
supabase functions deploy send-email

if [ $? -eq 0 ]; then
    echo "✅ send-email function deployed successfully"
else
    echo "❌ Failed to deploy send-email function"
    exit 1
fi

# Deploy the SMS function
echo "📱 Deploying send-sms function..."
supabase functions deploy send-sms

if [ $? -eq 0 ]; then
    echo "✅ send-sms function deployed successfully"
else
    echo "❌ Failed to deploy send-sms function"
    exit 1
fi

echo ""
echo "🎉 All functions deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Set up environment variables in Supabase Dashboard:"
echo "   - Go to Project Settings > Edge Functions"
echo "   - Add environment variables for:"
echo "     * RESEND_API_KEY (for email)"
echo "     * TWILIO_ACCOUNT_SID (for SMS)"
echo "     * TWILIO_AUTH_TOKEN (for SMS)"
echo "     * TWILIO_PHONE_NUMBER (for SMS)"
echo ""
echo "2. Run the database migration:"
echo "   - Execute create_communication_logs.sql in Supabase SQL Editor"
echo ""
echo "3. Test the functions:"
echo "   - Use the CustomersScreen to send test emails/SMS"
echo ""

# Optional: Test the functions
read -p "🧪 Would you like to test the functions now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📧 Testing send-email function..."
    curl -L -X POST "https://$(supabase status | grep 'API URL' | cut -d':' -f2- | tr -d ' ')/functions/v1/send-email" \
      -H 'Authorization: Bearer YOUR_ANON_KEY' \
      -H 'Content-Type: application/json' \
      -d '{
        "customers": [{"name": "Test User", "email": "test@example.com"}],
        "subject": "Test Email",
        "message": "This is a test email from BuzyBees!",
        "providerInfo": {"name": "Test Provider"}
      }'
    
    echo ""
    echo "📱 Testing send-sms function..."
    curl -L -X POST "https://$(supabase status | grep 'API URL' | cut -d':' -f2- | tr -d ' ')/functions/v1/send-sms" \
      -H 'Authorization: Bearer YOUR_ANON_KEY' \
      -H 'Content-Type: application/json' \
      -d '{
        "customers": [{"name": "Test User", "phone": "+1234567890"}],
        "message": "This is a test SMS from BuzyBees!",
        "providerInfo": {"name": "Test Provider"}
      }'
fi

echo ""
echo "✨ Deployment complete!"