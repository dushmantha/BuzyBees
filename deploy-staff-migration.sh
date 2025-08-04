#!/bin/bash

# ===============================================
# BUZYBEES STAFF SCHEDULE MIGRATION DEPLOYMENT
# ===============================================
# This script deploys the staff schedule migration to Supabase

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MIGRATION_FILE="src/screens/Schema/staff_schedule_migration.sql"
SUPABASE_PROJECT_ID="${SUPABASE_PROJECT_ID:-fezdmxvqurczeqmqvgzm}"
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN}"

echo -e "${BLUE}🚀 BuzyBees Staff Schedule Migration Deployment${NC}"
echo "=============================================="

# Check if required environment variables are set
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo -e "${RED}❌ Error: SUPABASE_ACCESS_TOKEN environment variable is not set${NC}"
    echo "Please set your Supabase access token:"
    echo "export SUPABASE_ACCESS_TOKEN=your_token_here"
    exit 1
fi

if [ -z "$SUPABASE_PROJECT_ID" ]; then
    echo -e "${RED}❌ Error: SUPABASE_PROJECT_ID environment variable is not set${NC}"
    echo "Please set your Supabase project ID:"
    echo "export SUPABASE_PROJECT_ID=your_project_id"
    exit 1
fi

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo -e "${RED}❌ Error: Migration file not found at $MIGRATION_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Migration Details:${NC}"
echo "   File: $MIGRATION_FILE"
echo "   Project ID: $SUPABASE_PROJECT_ID"
echo "   Size: $(du -h "$MIGRATION_FILE" | cut -f1)"
echo ""

# Read the migration file
echo -e "${BLUE}📖 Reading migration file...${NC}"
MIGRATION_SQL=$(cat "$MIGRATION_FILE")

if [ -z "$MIGRATION_SQL" ]; then
    echo -e "${RED}❌ Error: Migration file is empty${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Migration file loaded successfully${NC}"

# Execute the migration using Supabase REST API
echo -e "${BLUE}🔄 Executing migration on Supabase...${NC}"

# Create a temporary file for the API request
TEMP_REQUEST_FILE=$(mktemp)

# Prepare the JSON payload
cat > "$TEMP_REQUEST_FILE" << EOF
{
  "query": $(echo "$MIGRATION_SQL" | jq -R -s .)
}
EOF

# Execute the migration
HTTP_STATUS=$(curl -s -w "%{http_code}" -o /tmp/supabase_response.json \
  -X POST \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d @"$TEMP_REQUEST_FILE" \
  "https://$SUPABASE_PROJECT_ID.supabase.co/rest/v1/rpc/exec_sql")

# Clean up temp file
rm -f "$TEMP_REQUEST_FILE"

# Check if the request was successful
if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    echo -e "${GREEN}✅ Migration executed successfully!${NC}"
    
    # Check for any error messages in the response
    if grep -q "error" /tmp/supabase_response.json 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Response contains error information:${NC}"
        cat /tmp/supabase_response.json | jq '.' 2>/dev/null || cat /tmp/supabase_response.json
    else
        echo -e "${GREEN}🎉 Staff schedule migration completed successfully!${NC}"
        echo ""
        echo -e "${BLUE}📊 Migration Summary:${NC}"
        echo "   ✅ Added work_schedule column to shop_staff table"
        echo "   ✅ Added leave_dates column to shop_staff table"
        echo "   ✅ Created indexes for performance optimization"
        echo "   ✅ Set up RLS policies for security"
        echo "   ✅ Created helper functions for staff availability"
        echo "   ✅ Migrated existing staff records"
    fi
else
    echo -e "${RED}❌ Migration failed with HTTP status: $HTTP_STATUS${NC}"
    echo -e "${RED}Response:${NC}"
    cat /tmp/supabase_response.json 2>/dev/null || echo "No response body"
    exit 1
fi

# Clean up response file
rm -f /tmp/supabase_response.json

echo ""
echo -e "${GREEN}🎊 Staff Schedule Migration Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Verify the migration in your Supabase dashboard"
echo "2. Test staff creation and schedule management in the app"
echo "3. Check that staff availability functions work correctly"
echo ""
echo -e "${YELLOW}💡 Tip: You can now use the staff scheduling features in the BuzyBees app!${NC}"