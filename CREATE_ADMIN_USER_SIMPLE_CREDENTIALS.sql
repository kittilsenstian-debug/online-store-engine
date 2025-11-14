-- Delete existing admin user and recreate with simple credentials
-- Email: admin@admin.com
-- Password: admin
-- Run this in Supabase SQL Editor

-- Step 1: Delete existing provider_identity for old user
DELETE FROM provider_identity
WHERE entity_id = 'user_01KA00BB9FW0EM4E4TT4CYEX0P' 
AND provider = 'emailpass';

-- Step 2: Delete old user (optional - comment out if you want to keep it)
-- DELETE FROM "user" WHERE email = 'Kittilsen.stian@gmail.com';

-- Step 3: Delete old invite (optional - comment out if you want to keep it)
-- DELETE FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

-- After running this SQL, run:
-- npx medusa exec ./src/scripts/create-admin-simple.ts
-- 
-- This will create a new admin user with:
-- Email: admin@admin.com
-- Password: admin


