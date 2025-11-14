-- Check ALL user-related records that might prevent signup form
-- Run this in Supabase SQL Editor

-- Step 1: Check users
SELECT 'Users' as table_name, COUNT(*) as count FROM "user"
UNION ALL
SELECT 'Invites', COUNT(*) FROM invite
UNION ALL
SELECT 'Provider Identity', COUNT(*) FROM provider_identity
UNION ALL
SELECT 'Auth Identity', COUNT(*) FROM auth_identity;

-- Step 2: Check if team table exists and has records
SELECT 'Teams' as table_name, COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'team'
UNION ALL
SELECT 'Team Member', COUNT(*) 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'team_member';

-- Step 3: See actual data (if any)
SELECT '--- Users ---' as section;
SELECT id, email, created_at FROM "user" ORDER BY created_at;

SELECT '--- Invites ---' as section;
SELECT id, email, accepted, metadata FROM invite ORDER BY created_at;

SELECT '--- Provider Identity ---' as section;
SELECT * FROM provider_identity LIMIT 10;

-- Step 4: Check store table (might affect signup form logic)
SELECT '--- Store ---' as section;
SELECT * FROM store LIMIT 5;

