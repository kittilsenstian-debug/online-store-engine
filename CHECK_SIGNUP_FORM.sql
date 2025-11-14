-- Check why signup form isn't showing
-- Run these queries in Supabase SQL Editor

-- 1. Check for any users
SELECT 'Users' as table_name, COUNT(*) as count FROM "user";

-- 2. Check for any invites
SELECT 'Invites' as table_name, COUNT(*) as count FROM invite;

-- 3. Check for teams (if table exists)
SELECT 'Teams' as table_name, COUNT(*) as count FROM team;

-- 4. Check auth_provider table
SELECT 'Auth Providers' as table_name, COUNT(*) as count FROM auth_provider;

-- 5. Check what tables exist related to auth/user
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
  table_name LIKE '%user%' 
  OR table_name LIKE '%invite%' 
  OR table_name LIKE '%team%' 
  OR table_name LIKE '%auth%'
)
ORDER BY table_name;

-- If all counts are 0, try this:
-- Delete everything related to users/auth (be careful!)
DELETE FROM invite;
DELETE FROM auth_provider;
DELETE FROM "user";
-- Only run these if you're sure you want to clear everything


