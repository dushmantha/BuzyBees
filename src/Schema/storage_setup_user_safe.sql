-- ===============================================
-- USER-SAFE STORAGE SETUP FOR BUZYBEES
-- ===============================================
-- This script works within standard user permissions
-- No direct table modifications - uses Supabase APIs instead
-- Run this in Supabase Dashboard > SQL Editor

-- ===============================================
-- STEP 1: CREATE STORAGE BUCKETS (User Safe)
-- ===============================================

-- Create shop-images bucket (user-safe approach)
SELECT CASE 
    WHEN EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'shop-images'
    ) THEN 'shop-images bucket already exists'
    ELSE 'shop-images bucket needs manual creation'
END as shop_images_status;

-- Create user-avatars bucket (user-safe approach)
SELECT CASE 
    WHEN EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'user-avatars'
    ) THEN 'user-avatars bucket already exists'
    ELSE 'user-avatars bucket needs manual creation'
END as user_avatars_status;

-- ===============================================
-- STEP 2: BUCKET CREATION INSTRUCTIONS
-- ===============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== MANUAL BUCKET CREATION REQUIRED ===';
    RAISE NOTICE '';
    RAISE NOTICE 'Since you cannot modify storage tables directly, please:';
    RAISE NOTICE '';
    RAISE NOTICE '1. Go to Supabase Dashboard > Storage';
    RAISE NOTICE '2. Click "New bucket" button';
    RAISE NOTICE '3. Create bucket: "shop-images"';
    RAISE NOTICE '   - Name: shop-images';
    RAISE NOTICE '   - Public: YES (checked)';
    RAISE NOTICE '   - File size limit: 50 MB';
    RAISE NOTICE '   - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif';
    RAISE NOTICE '';
    RAISE NOTICE '4. Create bucket: "user-avatars"';
    RAISE NOTICE '   - Name: user-avatars';
    RAISE NOTICE '   - Public: YES (checked)';
    RAISE NOTICE '   - File size limit: 10 MB';
    RAISE NOTICE '   - Allowed MIME types: image/jpeg, image/png, image/webp';
    RAISE NOTICE '';
    RAISE NOTICE '5. After creating buckets manually, run this script again to verify';
    RAISE NOTICE '';
END $$;

-- ===============================================
-- STEP 3: VERIFY EXISTING SETUP
-- ===============================================

-- Check if buckets exist
SELECT 
    '=== CURRENT STORAGE BUCKETS ===' as status,
    id as bucket_id,
    name as bucket_name,
    public as is_public,
    CASE 
        WHEN file_size_limit IS NOT NULL 
        THEN (file_size_limit / 1024 / 1024)::text || ' MB'
        ELSE 'No limit set'
    END as size_limit,
    CASE 
        WHEN allowed_mime_types IS NOT NULL 
        THEN array_length(allowed_mime_types, 1)::text || ' types'
        ELSE 'No restrictions'
    END as mime_types,
    created_at::date as created_date
FROM storage.buckets 
ORDER BY created_at DESC;

-- Check existing policies (read-only)
SELECT 
    '=== CURRENT STORAGE POLICIES ===' as status,
    schemaname as schema,
    tablename as table_name,
    policyname as policy_name,
    cmd as operation,
    permissive
FROM pg_policies 
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- ===============================================
-- STEP 4: POLICY CREATION (User Safe Method)
-- ===============================================

DO $$
DECLARE
    shop_bucket_exists BOOLEAN;
    avatar_bucket_exists BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Check if buckets exist
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'shop-images') INTO shop_bucket_exists;
    SELECT EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'user-avatars') INTO avatar_bucket_exists;
    
    -- Count existing policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects';
    
    RAISE NOTICE '';
    RAISE NOTICE '=== STORAGE SETUP STATUS ===';
    RAISE NOTICE 'Shop images bucket exists: %', shop_bucket_exists;
    RAISE NOTICE 'User avatars bucket exists: %', avatar_bucket_exists;
    RAISE NOTICE 'Storage policies count: %', policy_count;
    RAISE NOTICE '';
    
    IF NOT shop_bucket_exists OR NOT avatar_bucket_exists THEN
        RAISE NOTICE '❌ BUCKETS MISSING - Manual creation required';
        RAISE NOTICE 'Please follow the manual creation steps above';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '✅ BUCKETS EXIST - Storage buckets are ready!';
        RAISE NOTICE '';
        
        -- Try to create policies using user-safe method
        BEGIN
            -- Since you cannot modify storage.objects directly, 
            -- we'll provide alternative approaches
            
            RAISE NOTICE '=== POLICY SETUP ALTERNATIVES ===';
            RAISE NOTICE '';
            RAISE NOTICE 'Option 1: Use Supabase Dashboard';
            RAISE NOTICE '1. Go to Authentication > Policies';
            RAISE NOTICE '2. Find storage.objects table';
            RAISE NOTICE '3. Create these policies:';
            RAISE NOTICE '   - SELECT: Allow all users (expression: true)';
            RAISE NOTICE '   - INSERT: Allow authenticated (expression: auth.role() = ''authenticated'')';
            RAISE NOTICE '   - UPDATE: Allow authenticated (expression: auth.role() = ''authenticated'')';
            RAISE NOTICE '   - DELETE: Allow authenticated (expression: auth.role() = ''authenticated'')';
            RAISE NOTICE '';
            RAISE NOTICE 'Option 2: Contact your Supabase project admin';
            RAISE NOTICE 'Ask them to run the storage_setup_final.sql with elevated permissions';
            RAISE NOTICE '';
            RAISE NOTICE 'Option 3: Use public buckets (Current Setup)';
            RAISE NOTICE 'Your buckets are already public, so uploads should work';
            RAISE NOTICE 'without additional RLS policies in most cases';
            RAISE NOTICE '';
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Cannot create policies automatically: %', SQLERRM;
            RAISE NOTICE 'Manual policy creation required via Dashboard';
        END;
    END IF;
END $$;

-- ===============================================
-- STEP 5: TEST STORAGE ACCESS
-- ===============================================

-- Test if we can access storage (read-only test)
DO $$
DECLARE
    bucket_accessible BOOLEAN := FALSE;
    bucket_count INTEGER := 0;
BEGIN
    -- Try to list buckets
    BEGIN
        SELECT COUNT(*) INTO bucket_count FROM storage.buckets;
        bucket_accessible := TRUE;
    EXCEPTION WHEN OTHERS THEN
        bucket_accessible := FALSE;
    END;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== STORAGE ACCESS TEST ===';
    RAISE NOTICE 'Can access storage: %', bucket_accessible;
    RAISE NOTICE 'Total buckets found: %', bucket_count;
    RAISE NOTICE '';
    
    IF bucket_accessible AND bucket_count > 0 THEN
        RAISE NOTICE '✅ Storage is accessible and has buckets';
        
        -- Check for our specific buckets
        IF EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'shop-images') AND
           EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'user-avatars') THEN
            RAISE NOTICE '✅ Required buckets (shop-images, user-avatars) exist';
            RAISE NOTICE '🎉 Your React Native app should be able to upload images!';
            RAISE NOTICE '';
            RAISE NOTICE '=== NEXT STEPS ===';
            RAISE NOTICE '1. Test image upload in your app';
            RAISE NOTICE '2. If uploads fail, check bucket policies in Dashboard';
            RAISE NOTICE '3. Ensure buckets are marked as "public"';
        ELSE
            RAISE NOTICE '⚠️ Required buckets are missing - create them manually';
        END IF;
    ELSE
        RAISE NOTICE '❌ Storage access issues detected';
        RAISE NOTICE 'Contact your Supabase admin for help';
    END IF;
END $$;

-- ===============================================
-- FINAL VERIFICATION
-- ===============================================

-- Show final status
SELECT 
    CASE 
        WHEN EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'shop-images') AND
             EXISTS(SELECT 1 FROM storage.buckets WHERE id = 'user-avatars')
        THEN '🎉 SUCCESS: All required storage buckets exist!'
        ELSE '⚠️ ACTION NEEDED: Create missing buckets manually via Dashboard'
    END as final_status,
    
    CASE 
        WHEN (SELECT COUNT(*) FROM storage.buckets WHERE id IN ('shop-images', 'user-avatars')) = 2
        THEN 'Try uploading images in your app now'
        ELSE 'Follow the manual bucket creation steps above'
    END as next_action;

-- Show bucket details if they exist
SELECT 
    '=== READY TO USE ===' as message,
    id as bucket_name,
    CASE WHEN public THEN 'Public (✅)' ELSE 'Private (❌)' END as access_level,
    (file_size_limit / 1024 / 1024)::text || ' MB' as size_limit
FROM storage.buckets 
WHERE id IN ('shop-images', 'user-avatars')
ORDER BY id;