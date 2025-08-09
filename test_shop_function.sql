-- Test the create_shop_normalized function
SELECT create_shop_normalized(
    '00000000-0000-0000-0000-000000000001'::uuid,
    '{
        "name": "Test Shop Creation",
        "category": "Beauty & Wellness",
        "description": "Testing shop creation",
        "address": "Test Address",
        "city": "Stockholm",
        "country": "Sweden",
        "phone": "+46701234567",
        "email": "test@example.com",
        "is_active": true
    }'::jsonb
) as test_result;