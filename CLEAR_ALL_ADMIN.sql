-- Clear all admin users and invites to show signup form
-- Run this in Supabase SQL Editor

-- Step 1: Check what exists
SELECT 'Users:' as type, COUNT(*) as count FROM "user"
UNION ALL
SELECT 'Invites:' as type, COUNT(*) as count FROM invite;

-- Step 2: Delete all invites
DELETE FROM invite;

-- Step 3: Delete all users
DELETE FROM "user";

-- Step 4: Verify everything is deleted
SELECT 'Users after delete:' as type, COUNT(*) as count FROM "user"
UNION ALL
SELECT 'Invites after delete:' as type, COUNT(*) as count FROM invite;

-- After running this, restart your server and you should see the signup form at http://localhost:9000/app


