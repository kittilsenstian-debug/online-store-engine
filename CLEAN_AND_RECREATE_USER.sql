-- Clean up all old user records and recreate properly
-- Run this in Supabase SQL Editor

-- Step 1: Delete old user by ID (the one causing 404)
DELETE FROM "user" WHERE id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';

-- Step 2: Delete current user (we'll recreate it properly)
DELETE FROM "user" WHERE id = 'user_01K9ZVMT5J5M1ZDBTM51GYZHJF';

-- Step 3: Delete all invites for this email
DELETE FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

-- Step 4: Check if auth_identity or session tables exist and clean them
-- First check what tables exist:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE '%auth%' 
  OR table_name LIKE '%session%' 
  OR table_name LIKE '%identity%'
  OR table_name = 'session'
)
ORDER BY table_name;

-- If auth_identity exists, delete old references:
-- DELETE FROM auth_identity WHERE entity_id IN ('user_01K9ZSQWQ3SSXCE9W9R3JJ0V55', 'user_01K9ZVMT5J5M1ZDBTM51GYZHJF');

-- Step 5: Verify everything is clean
SELECT COUNT(*) as user_count FROM "user" WHERE email = 'Kittilsen.stian@gmail.com';
SELECT COUNT(*) as invite_count FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

-- After this, we'll recreate the user properly through the admin dashboard

