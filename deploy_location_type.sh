#!/bin/bash

# 🔧 Add location_type column to shop_services table
# This fixes the missing column error

set -e

echo "🔧 Adding location_type column to shop_services..."

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

echo "📡 Adding location_type column to project: $SUPABASE_PROJECT_ID"

# Read SQL file content and escape it for JSON
sql_content=$(cat "add_location_type.sql" | jq -R -s '.')

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
    echo "❌ Column addition failed:"
    echo "$response" | jq '.error'
    exit 1
else
    echo "✅ location_type column added successfully!"
    echo ""
    echo "🎉 SERVICE LOCATION FEATURE NOW AVAILABLE!"
    echo ""
    echo "✅ location_type column added to shop_services"
    echo "✅ Default value: 'in_house'"
    echo "✅ Supports: 'in_house' and 'on_location'"
    echo "✅ Performance index created"
    echo ""
    echo "🏪 in_house: Client comes to shop (salon, barbershop, etc.)"
    echo "🚗 on_location: Provider goes to client (cleaning, delivery, etc.)"
    echo ""
    echo "🔗 Dashboard: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID"
fi