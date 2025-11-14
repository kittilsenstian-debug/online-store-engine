-- Step 1: First, let's check what tables and columns actually exist
-- Run this in Supabase SQL Editor to see the structure

-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check columns in auth_identity table (if it exists)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'auth_identity' 
ORDER BY ordinal_position;

-- Check columns in user table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user' 
ORDER BY ordinal_position;

-- Check for invite table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'invite' 
ORDER BY ordinal_position;

-- Step 2: Delete the user (run after checking structure)
-- Try these queries (one at a time, depending on what columns exist):

-- Option A: If auth_identity uses different column names
-- First check what the user looks like:
SELECT * FROM "user" WHERE email = 'Kittilsen.stian@gmail.com';
SELECT * FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

-- Then delete (adjust column names based on what you see above):
-- Simple delete from user table (cascade should handle related records):
DELETE FROM "user" WHERE id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';

-- Delete any invites:
DELETE FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

-- If there's an auth_provider or auth_identity table, check its structure first:
SELECT * FROM auth_provider WHERE user_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';
-- Then delete based on actual column name


