-- Check current authentication state for debugging
-- Run this in Supabase SQL Editor

-- 1. Check user exists
SELECT 'User' as check_type, id, email, created_at 
FROM "user" 
WHERE email = 'Kittilsen.stian@gmail.com';

-- 2. Check provider_identity details (including password in metadata)
SELECT 
    'Provider Identity' as check_type,
    id,
    provider,
    entity_id,
    auth_identity_id,
    provider_metadata,
    user_metadata,
    created_at
FROM provider_identity 
WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
AND provider = 'emailpass';

-- 3. Check auth_identity
SELECT 
    'Auth Identity' as check_type,
    id,
    app_metadata,
    created_at
FROM auth_identity
WHERE id IN (
    SELECT auth_identity_id 
    FROM provider_identity 
    WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
    AND provider = 'emailpass'
);

-- 4. Check invite
SELECT 
    'Invite' as check_type,
    id,
    email,
    accepted,
    metadata,
    expires_at
FROM invite 
WHERE email = 'Kittilsen.stian@gmail.com';

-- 5. Check if there are any auth sessions
SELECT 
    'Auth Session' as check_type,
    id,
    entity_id,
    provider_identity_id,
    created_at
FROM auth_session
WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P'
ORDER BY created_at DESC
LIMIT 5;


