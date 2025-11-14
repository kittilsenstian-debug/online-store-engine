-- Comprehensive cleanup of all auth/session references
-- Run this in Supabase SQL Editor

-- Step 1: Find all auth-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE '%auth%' 
  OR table_name LIKE '%session%' 
  OR table_name LIKE '%identity%'
  OR table_name LIKE '%provider%'
)
ORDER BY table_name;

-- Step 2: Once you see the tables, check what's in them for the old user ID
-- Replace 'table_name' with actual table names found in Step 1:

-- Example for auth_provider (if exists):
-- SELECT * FROM auth_provider WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';
-- DELETE FROM auth_provider WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';

-- Example for auth_identity (if exists):
-- SELECT * FROM auth_identity WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';
-- DELETE FROM auth_identity WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';

-- Step 3: Also delete ALL users and invites to start completely fresh
DELETE FROM "user" WHERE email = 'Kittilsen.stian@gmail.com';
DELETE FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

-- Step 4: Find columns that reference user IDs across all tables
SELECT 
    t.table_name,
    c.column_name,
    c.data_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public'
AND (
    c.column_name LIKE '%entity_id%'
    OR c.column_name LIKE '%user_id%'
    OR c.column_name LIKE '%auth_identity_id%'
)
AND t.table_name NOT LIKE 'pg_%'
AND t.table_name NOT LIKE '_prisma%'
ORDER BY t.table_name, c.column_name;

-- After running Step 4, you'll see which tables have user ID columns
-- Then run DELETE statements for each table that has references

