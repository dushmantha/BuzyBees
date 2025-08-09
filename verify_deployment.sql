-- Verify deployment was successful
-- Check if tables exist
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN (
        'provider_businesses',
        'shop_services', 
        'shop_staff',
        'service_options',
        'shop_bookings',
        'user_favorites'
    )
ORDER BY table_name;

-- Check if functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN (
        'create_shop_normalized',
        'update_updated_at_column'
    )
ORDER BY routine_name;

-- Check if storage buckets exist
SELECT 
    id,
    name,
    public,
    created_at
FROM storage.buckets 
WHERE id IN ('shop-images', 'staff-avatars', 'service-images')
ORDER BY id;