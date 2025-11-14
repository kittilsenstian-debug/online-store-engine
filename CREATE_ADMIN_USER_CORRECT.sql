-- Complete admin user creation for Medusa v2
-- CORRECTED: Medusa v2 emailpass provider stores password in provider_metadata, not in auth.users
-- Run this in Supabase SQL Editor

-- Step 1: Check if user exists (should already exist from npx medusa user command)
-- User ID: user_01KA00BB9FW0EM4E4TT4CYEX0P
-- Email: Kittilsen.stian@gmail.com

-- Step 2: Create auth_identity row (REQUIRED - auth_identity_id is NOT NULL in provider_identity)
INSERT INTO auth_identity (
    id,
    app_metadata
)
SELECT
    gen_random_uuid()::text,
    jsonb_build_object(
        'email', 'Kittilsen.stian@gmail.com',
        'created_by', 'admin_setup_script'
    )
WHERE NOT EXISTS (
    SELECT 1 FROM auth_identity ai
    JOIN provider_identity pi ON pi.auth_identity_id = ai.id
    WHERE pi.entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P'
)
RETURNING id;

-- Step 3: Create or update provider_identity with password in provider_metadata
-- Medusa v2 emailpass provider expects password in provider_metadata.password
INSERT INTO provider_identity (
    id,
    provider,
    entity_id,
    auth_identity_id,
    provider_metadata,
    user_metadata
)
SELECT
    gen_random_uuid()::text,
    'emailpass',
    'user_01KA00BB9FW0EM4E4TT4CYEX0P',  -- Medusa user ID
    (SELECT id FROM auth_identity ORDER BY created_at DESC LIMIT 1),  -- Use the most recent auth_identity
    jsonb_build_object(
        'email', 'Kittilsen.stian@gmail.com',
        'password', 'kOkkolille32891657',  -- Plain text password - Medusa will hash it
        'provider', 'emailpass'
    ),
    jsonb_build_object('email', 'Kittilsen.stian@gmail.com')
WHERE NOT EXISTS (
    SELECT 1 FROM provider_identity 
    WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
    AND provider = 'emailpass'
)
RETURNING *;

-- If provider_identity already exists, update it with the password
UPDATE provider_identity
SET 
    provider_metadata = jsonb_build_object(
        'email', 'Kittilsen.stian@gmail.com',
        'password', 'kOkkolille32891657',  -- Plain text password - Medusa will hash it
        'provider', 'emailpass'
    ),
    user_metadata = jsonb_build_object('email', 'Kittilsen.stian@gmail.com')
WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
AND provider = 'emailpass'
AND (provider_metadata->>'password' IS NULL OR provider_metadata->>'password' = '');

-- Step 4: Create admin invite
INSERT INTO invite (
    id,
    email,
    accepted,
    token,
    expires_at,
    metadata,
    created_at,
    updated_at
) 
SELECT
    gen_random_uuid(),
    'Kittilsen.stian@gmail.com',
    true,
    gen_random_uuid()::text,
    NOW() + INTERVAL '30 days',
    '{"role": "admin"}'::jsonb,
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM invite WHERE email = 'Kittilsen.stian@gmail.com'
);

-- Step 5: Verify everything was created/updated
SELECT 'User' as type, id::text as id, email FROM "user" WHERE email = 'Kittilsen.stian@gmail.com'
UNION ALL
SELECT 'Auth Identity' as type, id::text as id, app_metadata->>'email' as email FROM auth_identity WHERE app_metadata->>'email' = 'Kittilsen.stian@gmail.com'
UNION ALL
SELECT 'Provider Identity' as type, entity_id::text as id, provider::text as email FROM provider_identity WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P'
UNION ALL
SELECT 'Invite' as type, id::text, email FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

-- Check if password is in provider_metadata
SELECT 
    'Provider Identity Check' as check_type,
    entity_id,
    provider,
    provider_metadata->>'email' as email_in_metadata,
    CASE 
        WHEN provider_metadata->>'password' IS NOT NULL THEN 'Password set'
        ELSE 'Password missing'
    END as password_status
FROM provider_identity 
WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
AND provider = 'emailpass';

-- After running this, try logging in at http://localhost:9000/app
-- Email: Kittilsen.stian@gmail.com
-- Password: kOkkolille32891657

