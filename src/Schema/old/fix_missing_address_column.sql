-- Fix the missing address column error
-- Add backward compatibility columns to provider_businesses table

-- Add the missing address column for backward compatibility
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Sweden';
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Ensure all required columns exist for the old app code
ALTER TABLE provider_businesses ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Create storage buckets for images (safe operation)
SELECT 'Adding missing columns for backward compatibility' as status;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'provider_businesses' 
ORDER BY ordinal_position;