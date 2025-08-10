-- ============================================
-- SETUP STORAGE BUCKETS FOR IMAGE UPLOADS
-- ============================================
-- Run this in your Supabase SQL Editor to create storage buckets

-- 1. Create shop-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shop-images',
  'shop-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 2. Create user-avatars bucket  
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 3. Create shop-logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shop-logos',
  'shop-logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE RLS POLICIES (with conflict handling)
-- ============================================

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Authenticated users can upload shop images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for shop images" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can delete their images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for user avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload shop logos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for shop logos" ON storage.objects;
DROP POLICY IF EXISTS "Shop owners can delete their logos" ON storage.objects;

-- Create policies fresh
-- Shop Images Policies
CREATE POLICY "Authenticated users can upload shop images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shop-images' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Public read access for shop images"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-images');

CREATE POLICY "Shop owners can delete their images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shop-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- User Avatars Policies
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-avatars' AND 
  auth.role() = 'authenticated' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public read access for user avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-avatars');

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Shop Logos Policies  
CREATE POLICY "Authenticated users can upload shop logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'shop-logos' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Public read access for shop logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-logos');

CREATE POLICY "Shop owners can delete their logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'shop-logos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if buckets were created successfully
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id IN ('shop-images', 'user-avatars', 'shop-logos')
ORDER BY created_at DESC;

-- Check storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'storage' 
ORDER BY tablename, policyname;