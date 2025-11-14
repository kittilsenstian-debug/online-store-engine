-- First, check the actual structure of the invite table
-- Run this in Supabase SQL Editor

-- Check invite table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invite'
ORDER BY ordinal_position;

-- This will show us what columns actually exist so we can create the correct INSERT statement

