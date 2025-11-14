-- Delete existing emailpass provider so we can recreate it via Medusa API
-- This ensures Medusa hashes the password correctly
-- Run this in Supabase SQL Editor

-- Step 1: Check current state
SELECT 
    'Before Delete' as step,
    id,
    provider,
    entity_id,
    provider_metadata->>'email' as email,
    provider_metadata->>'password' as password_status,
    created_at
FROM provider_identity 
WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
AND provider = 'emailpass';

-- Step 2: Delete the existing provider_identity
DELETE FROM provider_identity
WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
AND provider = 'emailpass';

-- Step 3: Verify deletion
SELECT 
    'After Delete' as step,
    COUNT(*) as remaining_providers
FROM provider_identity 
WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
AND provider = 'emailpass';

-- After running this SQL:
-- 1. Run: npx medusa exec ./src/scripts/set-password-via-api.ts
-- 2. This will create the provider via Medusa API with proper password hashing
-- 3. Then try logging in at http://localhost:9000/app


