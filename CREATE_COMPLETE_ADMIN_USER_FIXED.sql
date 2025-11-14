-- Complete admin user creation for Medusa v2 with Supabase Auth (FIXED)
-- This creates the user in Supabase Auth, links it via provider_identity, and creates admin invite
-- Run this in Supabase SQL Editor

-- Step 1: Create user in Supabase Auth (auth.users table)
WITH new_auth_user AS (
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_sent_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',  -- default instance
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'Kittilsen.stian@gmail.com',
    crypt('kOkkolille32891657', gen_salt('bf')),  -- encrypted password
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    NOW(),
    NOW()
  ) RETURNING id, email
)

-- Step 2: Find or get the auth_identity for the Medusa user
-- First, let's check if auth_identity exists for this user
, existing_auth_identity AS (
  SELECT id FROM auth_identity WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P'
)

-- Step 3: Create provider_identity to link auth user to Medusa user
-- Using provider_metadata to store Supabase auth user ID (as recommended)
INSERT INTO provider_identity (
    provider,
    entity_id,
    auth_identity_id,
    provider_metadata,
    user_metadata
)
SELECT
    'emailpass',
    'user_01KA00BB9FW0EM4E4TT4CYEX0P',  -- Medusa user ID from script
    COALESCE(
        (SELECT id FROM existing_auth_identity LIMIT 1),
        (SELECT id FROM auth_identity WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' LIMIT 1)
    ),  -- Use existing auth_identity_id if found
    jsonb_build_object('supabase_user_id', new_auth_user.id, 'email', new_auth_user.email),
    jsonb_build_object('email', new_auth_user.email)
FROM new_auth_user
WHERE NOT EXISTS (
    SELECT 1 FROM provider_identity 
    WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
    AND provider = 'emailpass'
);

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

-- Step 5: Verify everything was created
SELECT 'Auth User' as type, id::text as id, email FROM auth.users WHERE email = 'Kittilsen.stian@gmail.com'
UNION ALL
SELECT 'Provider Identity' as type, entity_id::text as id, provider::text as email FROM provider_identity WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P'
UNION ALL
SELECT 'Invite' as type, id::text, email FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

-- After running this, try logging in at http://localhost:9000/app

