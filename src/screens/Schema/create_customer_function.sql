-- ===============================================
-- CREATE CUSTOMER FUNCTION
-- ===============================================
-- This function allows providers to create customer records
-- Run this in Supabase SQL Editor

-- Drop function if exists
DROP FUNCTION IF EXISTS create_customer_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

-- Create function to create customer users
CREATE OR REPLACE FUNCTION create_customer_user(
  p_email TEXT,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_user_type TEXT DEFAULT 'customer',
  p_account_type TEXT DEFAULT 'consumer',
  p_bio TEXT DEFAULT NULL,
  p_provider_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- Generate a new UUID for the customer
  new_user_id := gen_random_uuid();
  
  -- Insert new customer record
  INSERT INTO users (
    id,
    email,
    full_name,
    phone,
    user_type,
    account_type,
    bio,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    p_email,
    p_full_name,
    p_phone,
    p_user_type,
    p_account_type,
    p_bio,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
  
  -- Return the created user data
  SELECT json_build_object(
    'id', id,
    'email', email,
    'full_name', full_name,
    'phone', phone,
    'user_type', user_type,
    'account_type', account_type,
    'bio', bio,
    'is_active', is_active,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO result
  FROM users
  WHERE id = new_user_id;
  
  RETURN result;
  
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'A user with email % already exists', p_email;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating customer: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_customer_user TO authenticated;

-- Test the function (optional - remove in production)
-- SELECT create_customer_user('test@example.com', 'Test Customer', '+1234567890', 'customer', 'consumer', 'Test notes');