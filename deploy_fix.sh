#!/bin/bash

# 🔧 Deploy Missing Tables Fix
# This script adds the missing database components

set -e

echo "🔧 Deploying missing tables fix..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "❌ .env file not found"
    exit 1
fi

# Supabase API endpoint
API_URL="https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query"

echo "📡 Adding missing tables to project: $SUPABASE_PROJECT_ID"

# Read SQL file content and escape it for JSON
sql_content=$(cat "fix_missing_tables.sql" | jq -R -s '.')

# Create JSON payload
payload=$(cat <<EOF
{
    "query": $sql_content
}
EOF
)

# Execute via API
response=$(curl -s -X POST "$API_URL" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -H "apikey: $SUPABASE_ACCESS_TOKEN" \
    -d "$payload")

# Check for errors
if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
    echo "❌ Fix deployment failed:"
    echo "$response" | jq '.error'
    exit 1
else
    echo "✅ Missing tables fix deployed successfully!"
    echo ""
    echo "🎉 ALL DATABASE FEATURES NOW AVAILABLE!"
    echo ""
    echo "✅ Business hours tables added"
    echo "✅ Special days table added"
    echo "✅ Shop schedules table added"
    echo "✅ shop_complete view created"
    echo "✅ All RLS policies configured"
    echo ""
    echo "🔗 Dashboard: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID"
fi