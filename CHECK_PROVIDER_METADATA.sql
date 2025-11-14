-- Check what's actually in provider_metadata to see if password is set correctly
-- Run this in Supabase SQL Editor

-- Check all provider_identity records for our users
SELECT 
    'Provider Identity' as check_type,
    id,
    provider,
    entity_id,
    auth_identity_id,
    provider_metadata,
    user_metadata,
    created_at,
    updated_at
FROM provider_identity 
WHERE entity_id IN (
    SELECT id FROM "user" WHERE email IN ('admin@admin.com', 'Kittilsen.stian@gmail.com')
)
ORDER BY created_at DESC;

-- Check if password field exists in provider_metadata
SELECT 
    'Password Check' as check_type,
    entity_id,
    provider,
    provider_metadata->>'email' as email_in_metadata,
    provider_metadata->>'password' as password_in_metadata,
    CASE 
        WHEN provider_metadata->>'password' IS NOT NULL 
             AND provider_metadata->>'password' != '' 
        THEN 'Password exists ✓'
        ELSE 'Password missing ✗'
    END as password_status,
    LENGTH(provider_metadata->>'password') as password_length,
    LEFT(provider_metadata->>'password', 10) as password_preview
FROM provider_identity 
WHERE entity_id IN (
    SELECT id FROM "user" WHERE email IN ('admin@admin.com', 'Kittilsen.stian@gmail.com')
)
ORDER BY created_at DESC;

-- Check users
SELECT 
    'User' as check_type,
    id,
    email,
    created_at
FROM "user" 
WHERE email IN ('admin@admin.com', 'Kittilsen.stian@gmail.com')
ORDER BY created_at DESC;


