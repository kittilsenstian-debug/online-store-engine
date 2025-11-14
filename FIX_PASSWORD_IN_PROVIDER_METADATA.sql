-- Fix password authentication for Medusa v2 emailpass provider
-- Medusa v2 stores password in provider_metadata, not in auth.users
-- Run this in Supabase SQL Editor

-- Step 1: Find or create auth_identity for the user
-- First, check if provider_identity already exists with an auth_identity_id
WITH existing_provider_identity AS (
    SELECT auth_identity_id 
    FROM provider_identity 
    WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
    AND provider = 'emailpass'
    LIMIT 1
),
-- Create auth_identity if it doesn't exist
new_auth_identity AS (
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
        SELECT 1 FROM existing_provider_identity WHERE auth_identity_id IS NOT NULL
    )
    RETURNING id
),
-- Get the auth_identity_id to use (either existing or newly created)
auth_identity_to_use AS (
    SELECT COALESCE(
        (SELECT auth_identity_id FROM existing_provider_identity),
        (SELECT id FROM new_auth_identity LIMIT 1),
        (SELECT id FROM auth_identity ORDER BY created_at DESC LIMIT 1)
    ) as auth_id
)

-- Step 2: Create or update provider_identity with password in provider_metadata
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
    'user_01KA00BB9FW0EM4E4TT4CYEX0P',
    (SELECT auth_id FROM auth_identity_to_use),
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
);

-- Step 3: Update existing provider_identity if it exists but doesn't have password
UPDATE provider_identity
SET 
    provider_metadata = COALESCE(
        provider_metadata,
        '{}'::jsonb
    ) || jsonb_build_object(
        'email', 'Kittilsen.stian@gmail.com',
        'password', 'kOkkolille32891657',  -- Plain text password - Medusa will hash it
        'provider', 'emailpass'
    ),
    user_metadata = COALESCE(
        user_metadata,
        '{}'::jsonb
    ) || jsonb_build_object('email', 'Kittilsen.stian@gmail.com')
WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
AND provider = 'emailpass'
AND (
    provider_metadata->>'password' IS NULL 
    OR provider_metadata->>'password' = ''
    OR provider_metadata->>'password' != 'kOkkolille32891657'
);

-- Step 4: Ensure admin invite exists
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
SELECT 'Provider Identity' as type, 
    entity_id::text as id, 
    provider::text as provider,
    provider_metadata->>'email' as email,
    CASE 
        WHEN provider_metadata->>'password' IS NOT NULL THEN 'Password set ✓'
        ELSE 'Password missing ✗'
    END as password_status
FROM provider_identity 
WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
AND provider = 'emailpass';

SELECT 'Invite' as type, id::text, email, accepted FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

-- After running this, try logging in at http://localhost:9000/app
-- Email: Kittilsen.stian@gmail.com
-- Password: kOkkolille32891657

