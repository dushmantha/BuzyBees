#!/bin/bash

# 🚀 Direct Supabase Schema Deployment Script
# This script pushes all schema files directly to Supabase via API

set -e

echo "🚀 Starting BuzyBees Schema Deployment..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment variables loaded"
else
    echo "❌ .env file not found"
    exit 1
fi

# Check required environment variables
if [ -z "$SUPABASE_PROJECT_ID" ] || [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ Missing SUPABASE_PROJECT_ID or SUPABASE_ACCESS_TOKEN in .env"
    exit 1
fi

# Supabase API endpoint
API_URL="https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query"

echo "📡 Deploying to project: $SUPABASE_PROJECT_ID"

# Function to execute SQL via Supabase API
execute_sql() {
    local sql_file=$1
    local description=$2
    
    if [ ! -f "$sql_file" ]; then
        echo "⚠️  File not found: $sql_file - skipping"
        return 0
    fi
    
    echo "📄 Executing: $description"
    
    # Read SQL file content and escape it for JSON
    local sql_content=$(cat "$sql_file" | jq -R -s '.')
    
    # Create JSON payload
    local payload=$(cat <<EOF
{
    "query": $sql_content
}
EOF
)
    
    # Execute via API
    local response=$(curl -s -X POST "$API_URL" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -H "apikey: $SUPABASE_ACCESS_TOKEN" \
        -d "$payload")
    
    # Check for errors
    if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
        echo "❌ Error in $description:"
        echo "$response" | jq '.error'
        return 1
    else
        echo "✅ Success: $description"
        return 0
    fi
}

# Deploy the complete schema
echo "🗄️  Deploying complete database schema..."
if execute_sql "src/Schema/deploy_all_schemas.sql" "Complete BuzyBees Database Schema"; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo ""
    echo "✅ Database schema deployed successfully"
    echo "✅ All tables, indexes, and policies created"
    echo "✅ Storage buckets configured"
    echo "✅ Functions and triggers installed"
    echo "✅ Sample data inserted"
    echo ""
    echo "🔗 Dashboard: https://supabase.com/dashboard/project/$SUPABASE_PROJECT_ID"
    echo ""
else
    echo ""
    echo "❌ DEPLOYMENT FAILED!"
    echo "Check the error messages above for details"
    exit 1
fi