-- Create storage buckets for image uploads
-- This fixes the storage bucket creation issue

-- Enable storage extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "storage";

-- Create shop-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'shop-images',
    'shop-images', 
    true,
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
) ON CONFLICT (id) DO NOTHING;

-- Create user-avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'user-avatars',
    'user-avatars',
    true, 
    52428800,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
) ON CONFLICT (id) DO NOTHING;

-- Create shop-logos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'shop-logos',
    'shop-logos',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
) ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for shop-images bucket
INSERT INTO storage.policies (id, bucket_id, name, operation, definition)
VALUES (
    'shop-images-public-read',
    'shop-images',
    'Public read access for shop images',
    'SELECT',
    'true'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.policies (id, bucket_id, name, operation, definition)
VALUES (
    'shop-images-authenticated-upload',
    'shop-images', 
    'Authenticated users can upload shop images',
    'INSERT',
    'auth.role() = ''authenticated'''
) ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for user-avatars bucket  
INSERT INTO storage.policies (id, bucket_id, name, operation, definition)
VALUES (
    'user-avatars-public-read',
    'user-avatars',
    'Public read access for user avatars',
    'SELECT',
    'true'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.policies (id, bucket_id, name, operation, definition)
VALUES (
    'user-avatars-authenticated-upload',
    'user-avatars',
    'Authenticated users can upload avatars',
    'INSERT', 
    'auth.role() = ''authenticated'''
) ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for shop-logos bucket
INSERT INTO storage.policies (id, bucket_id, name, operation, definition)
VALUES (
    'shop-logos-public-read',
    'shop-logos',
    'Public read access for shop logos',
    'SELECT',
    'true'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.policies (id, bucket_id, name, operation, definition)
VALUES (
    'shop-logos-authenticated-upload',
    'shop-logos',
    'Authenticated users can upload shop logos',
    'INSERT',
    'auth.role() = ''authenticated'''
) ON CONFLICT (id) DO NOTHING;

SELECT 'Storage buckets and policies created successfully!' as result;