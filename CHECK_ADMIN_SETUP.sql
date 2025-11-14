-- Check if there are any users, invites, or teams in the database
-- Run these queries in Supabase SQL Editor to see what's preventing signup form

-- Check all users
SELECT id, email, created_at FROM "user" ORDER BY created_at;

-- Check all invites
SELECT id, email, role, accepted, created_at FROM invite ORDER BY created_at;

-- Check auth_provider table (if it exists)
SELECT * FROM auth_provider LIMIT 10;

-- If there are any invites or users, we need to delete them
-- Delete all invites (if any exist)
DELETE FROM invite;

-- Delete all users (if any remain)
DELETE FROM "user";

-- After running these, restart your server and you should see the signup form


