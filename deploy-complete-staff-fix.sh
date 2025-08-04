#!/bin/bash

# ================================================
# COMPLETE STAFF AVAILABILITY DATABASE FIX
# ================================================
# This script applies both migrations needed for staff availability:
# 1. Add work_schedule and leave_dates columns to shop_staff table
# 2. Update shop_complete view to include these new fields
# 
# USAGE: Copy and paste each SQL block into Supabase SQL Editor

echo "🚀 COMPLETE STAFF AVAILABILITY DATABASE FIX"
echo "============================================="
echo ""
echo "⚠️  IMPORTANT: You need to run TWO SQL migrations in order:"
echo ""

echo "📋 STEP 1: Add staff scheduling columns to database"
echo "=================================================="
echo "Copy and paste this SQL into Supabase SQL Editor:"
echo ""
cat src/screens/Schema/staff_schedule_migration.sql
echo ""
echo "=================================================="
echo ""

echo "📋 STEP 2: Update the shop_complete view"
echo "=================================================="
echo "Copy and paste this SQL into Supabase SQL Editor:"
echo ""
cat src/screens/Schema/fix_shop_complete_view_staff.sql
echo ""
echo "=================================================="
echo ""

echo "✅ After running BOTH SQL blocks, the system will:"
echo "   1. Have work_schedule and leave_dates columns in shop_staff table"
echo "   2. Include these fields in the shop_complete view"  
echo "   3. Enable staff availability checking in provider booking calendar"
echo ""
echo "🔍 To verify the fix worked:"
echo "   1. Go to provider booking"
echo "   2. Select a specific staff member"
echo "   3. Calendar should show staff-specific availability (not all green)"
echo "   4. Staff schedules and leave dates should be reflected in calendar colors"