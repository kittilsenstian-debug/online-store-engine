-- Update password directly in provider_metadata
-- This is a workaround since Medusa API doesn't support password updates
-- Run this in Supabase SQL Editor

-- Step 1: Check current provider_identity state
SELECT 
    id,
    provider,
    entity_id,
    provider_metadata->>'email' as email,
    CASE 
        WHEN provider_metadata->>'password' IS NOT NULL THEN 'Password exists'
        ELSE 'No password'
    END as password_status,
    provider_metadata,
    created_at
FROM provider_identity 
WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
AND provider = 'emailpass';

-- Step 2: Update provider_metadata with password
-- IMPORTANT: Medusa v2 might need the password to be hashed, but let's try plain text first
-- If this doesn't work, we'll need to hash it using Medusa's algorithm
UPDATE provider_identity
SET 
    provider_metadata = jsonb_build_object(
        'email', 'Kittilsen.stian@gmail.com',
        'password', 'kOkkolille32891657',  -- Plain text password
        'provider', 'emailpass'
    ),
    user_metadata = jsonb_build_object('email', 'Kittilsen.stian@gmail.com'),
    updated_at = NOW()
WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
AND provider = 'emailpass';

-- Step 3: Verify the update
SELECT 
    id,
    provider,
    entity_id,
    provider_metadata->>'email' as email,
    CASE 
        WHEN provider_metadata->>'password' IS NOT NULL 
             AND provider_metadata->>'password' = 'kOkkolille32891657' 
        THEN 'Password set correctly ✓'
        ELSE 'Password not set ✗'
    END as password_status,
    updated_at
FROM provider_identity 
WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
AND provider = 'emailpass';

-- After running this, try logging in at http://localhost:9000/app
-- Email: Kittilsen.stian@gmail.com
-- Password: kOkkolille32891657


