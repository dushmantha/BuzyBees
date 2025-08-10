#!/bin/bash

# Comprehensive Booking System Schema Deployment Script
# This script deploys the complete booking system schema with all necessary tables and relationships

echo "🚀 Deploying Comprehensive Booking System Schema..."
echo "📋 This includes: shop_services, shop_staff, service_options, shop_bookings, and booking_service_options"
echo ""

# Database connection details (replace with your own)
DB_URL="postgresql://postgres.hfhbmzgsfgcfqdpxtppq:BeesBuzy123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"

echo "📦 Deploying comprehensive_booking_system.sql..."
if command -v psql > /dev/null 2>&1; then
    psql "$DB_URL" -f sql-schema/comprehensive_booking_system.sql
    echo "✅ Schema deployment completed!"
else
    echo "❌ psql not found. Please install PostgreSQL client or deploy manually."
    echo "📝 Manual deployment instructions:"
    echo "1. Copy the contents of sql-schema/comprehensive_booking_system.sql"
    echo "2. Paste and run in your Supabase SQL Editor"
    echo "3. Check that all tables were created successfully"
fi

echo ""
echo "🔍 Schema includes the following tables:"
echo "- shop_services (with foreign key to provider_businesses)"
echo "- shop_staff (with foreign key to provider_businesses)"
echo "- service_options (with foreign key to shop_services)"
echo "- shop_bookings (with foreign keys to provider_businesses, shop_services, and shop_staff)"
echo "- booking_service_options (junction table for bookings and service options)"
echo ""
echo "✨ All relationships are properly defined to fix schema cache issues!"