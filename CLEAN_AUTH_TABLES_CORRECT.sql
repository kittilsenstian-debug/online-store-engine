-- Clean up auth references using correct table names
-- Based on actual table structure found

-- Step 1: Check what's in provider_identity for old user ID
SELECT * FROM provider_identity WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';

-- Step 2: Check auth_identity table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'auth_identity'
ORDER BY ordinal_position;

-- Step 3: Check what's in auth_identity
SELECT * FROM auth_identity WHERE id IN (
  SELECT auth_identity_id FROM provider_identity WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55'
);

-- Step 4: Delete from provider_identity (this is where the reference likely is)
DELETE FROM provider_identity WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';

-- Step 5: Delete from auth_identity if needed (check structure first)
-- DELETE FROM auth_identity WHERE id = '<id-from-step3>';

-- Step 6: Check if users still exist (this is why signup form isn't showing)
SELECT COUNT(*) as user_count FROM "user";
SELECT id, email FROM "user";

-- Step 7: Check if invites exist
SELECT COUNT(*) as invite_count FROM invite;
SELECT id, email, accepted FROM invite;

-- Step 8: Delete ALL users and invites to show signup form
DELETE FROM "user";
DELETE FROM invite;
DELETE FROM provider_identity;
-- Be careful with auth_identity - check structure first

