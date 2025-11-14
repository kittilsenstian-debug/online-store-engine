-- Check the actual structure of auth_identity and provider_identity tables
-- Run this in Supabase SQL Editor to understand the schema

-- Check auth_identity table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'auth_identity'
ORDER BY ordinal_position;

-- Check provider_identity table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'provider_identity'
ORDER BY ordinal_position;

-- Check if there's an existing auth_identity for the user (via provider_identity)
SELECT 
    pi.entity_id,
    pi.provider,
    pi.auth_identity_id,
    ai.id as auth_identity_id_check,
    ai.app_metadata
FROM provider_identity pi
LEFT JOIN auth_identity ai ON pi.auth_identity_id = ai.id
WHERE pi.entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P';

-- Check existing auth_identity records
SELECT id, app_metadata, created_at FROM auth_identity LIMIT 5;

