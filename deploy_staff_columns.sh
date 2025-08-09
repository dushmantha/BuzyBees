#!/bin/bash

# 🔧 Add staff management columns to shop_staff table
# This fixes the missing leave_dates column error

set -e

echo "🔧 Adding staff management columns to shop_staff table..."

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

echo "📡 Adding staff management columns to project: $SUPABASE_PROJECT_ID"

# Read SQL file content and escape it for JSON
sql_content=$(cat "add_leave_dates.sql" | jq -R -s '.')

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
    echo "❌ Staff columns addition failed:"
    echo "$response" | jq '.error'
    exit 1
else
    echo "✅ Staff management columns added successfully!"
    echo ""
    echo "🎉 STAFF LEAVE MANAGEMENT NOW AVAILABLE!"
    echo ""
    echo "✅ leave_dates column added (JSONB array)"
    echo "✅ work_schedule column added (JSONB object)"
    echo "✅ is_available column added (Boolean)"
    echo "✅ hire_date column added (Date)"
    echo "✅ Performance indexes created"
    echo ""
    echo "📅 Features now supported:"
    echo "   • Staff leave/vacation tracking"
    echo "   • Work schedule management"
    echo "   • Staff availability status"
    echo "   • Hire date tracking"
    echo ""
    echo "🔗 Dashboard: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID"
fi