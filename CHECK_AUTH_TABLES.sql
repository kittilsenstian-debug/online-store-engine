-- Check auth tables for old user ID references
-- Run this in Supabase SQL Editor

-- Step 1: Check all users
SELECT id, email, created_at FROM "user" ORDER BY created_at;

-- Step 2: Check auth_identity table (if exists) - this links auth to users
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%auth%' OR table_name LIKE '%session%' OR table_name LIKE '%identity%')
ORDER BY table_name;

-- Step 3: If auth_identity exists, check what's in it
-- SELECT * FROM auth_identity WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';
-- SELECT * FROM auth_identity WHERE provider_metadata::text LIKE '%Kittilsen%';

-- Step 4: Check invites
SELECT id, email, accepted, metadata FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

