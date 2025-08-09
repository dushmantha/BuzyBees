#!/bin/bash

# 🧪 Test Shop Creation Function
# This script tests if the create_shop_normalized function works

set -e

echo "🧪 Testing create_shop_normalized function..."

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

echo "📡 Testing function for project: $SUPABASE_PROJECT_ID"

# Read SQL file content and escape it for JSON
sql_content=$(cat "test_shop_function.sql" | jq -R -s '.')

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
    echo "❌ Function test failed:"
    echo "$response" | jq '.error'
    exit 1
else
    echo "✅ Function test successful!"
    echo "Response:"
    echo "$response" | jq '.'
fi