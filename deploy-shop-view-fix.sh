#!/bin/bash

# ================================================
# DEPLOY SHOP VIEW FIX
# ================================================
# This script applies the shop_complete view fix to include staff scheduling fields
# 
# USAGE:
# 1. Make sure you have DATABASE_URL set in your environment
# 2. Run: bash deploy-shop-view-fix.sh
# 
# OR copy and paste the SQL content into Supabase SQL Editor

echo "🚀 Deploying shop_complete view fix..."
echo "📄 SQL file: src/screens/Schema/fix_shop_complete_view_staff.sql"
echo ""
echo "⚠️  IMPORTANT: Copy and paste the following SQL into your Supabase SQL Editor:"
echo "================================================"
cat src/screens/Schema/fix_shop_complete_view_staff.sql
echo ""
echo "================================================"
echo ""
echo "📋 Instructions:"
echo "1. Go to your Supabase project dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Copy and paste the SQL above"
echo "4. Click 'Run' to apply the changes"
echo ""
echo "✅ This will update the shop_complete view to include:"
echo "   - work_schedule field from shop_staff table"
echo "   - leave_dates field from shop_staff table"
echo ""
echo "🔄 After running this SQL, the provider booking calendar will"
echo "   correctly fetch and display staff availability from the database."