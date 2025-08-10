-- ===============================================
-- FIX CUSTOMER CREATION RLS POLICY
-- ===============================================
-- This allows providers to create customer records
-- Run this in Supabase SQL Editor

-- First, let's add a policy that allows providers to insert customer records
CREATE POLICY "Providers can create customer records" ON users
  FOR INSERT WITH CHECK (
    user_type = 'customer' AND 
    account_type = 'consumer' AND
    auth.uid() IS NOT NULL
  );

-- Also allow providers to view customer records they might have created
CREATE POLICY "Providers can view customer records" ON users
  FOR SELECT USING (
    user_type = 'customer' OR 
    auth.uid() = id
  );

-- Refresh the policies
SELECT 'RLS policies updated for customer creation' as status;