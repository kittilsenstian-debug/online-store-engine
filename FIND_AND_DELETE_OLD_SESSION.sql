-- Find and delete all references to the old user ID
-- Run this in Supabase SQL Editor

-- Step 1: Find all tables that might contain user references
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE '%auth%' 
  OR table_name LIKE '%session%' 
  OR table_name LIKE '%identity%'
  OR table_name LIKE '%provider%'
  OR table_name = 'session'
)
ORDER BY table_name;

-- Step 2: If auth_provider table exists, check and delete
-- SELECT * FROM auth_provider WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';
-- DELETE FROM auth_provider WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';

-- Step 3: If auth_identity table exists, check and delete
-- SELECT * FROM auth_identity WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';
-- DELETE FROM auth_identity WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';

-- Step 4: Check for any tables with columns that might reference user IDs
SELECT 
    t.table_name,
    c.column_name,
    c.data_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
AND (
    c.column_name LIKE '%user_id%'
    OR c.column_name LIKE '%entity_id%'
    OR c.column_name LIKE '%auth_identity_id%'
    OR c.column_name = 'user_id'
)
AND c.column_name != 'created_by'  -- Exclude common columns
ORDER BY t.table_name, c.column_name;

-- Step 5: Delete from common tables (uncomment as needed)
-- DELETE FROM auth_provider WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';
-- DELETE FROM auth_identity WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';

