# Final Cleanup and Fresh Start

## Problem
- Session is trying to use old user ID: `user_01K9ZSQWQ3SSXCE9W9R3JJ0V55` (doesn't exist)
- Even after clearing cookies, the issue persists
- Database has mixed references to old and new user IDs

## Solution: Clean Slate Approach

### Step 1: Delete All User Records

Run this SQL in Supabase SQL Editor:
```sql
-- Delete all users with this email
DELETE FROM "user" WHERE email = 'Kittilsen.stian@gmail.com';

-- Delete all invites for this email
DELETE FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

-- Check if there are auth_identity or session tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%auth%' OR table_name LIKE '%session%' OR table_name LIKE '%identity%')
ORDER BY table_name;
```

### Step 2: If Auth Tables Exist, Clean Them Too

If you see tables like `auth_identity`, `session`, or similar:
```sql
-- Delete auth records for old user IDs
DELETE FROM auth_identity WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';
DELETE FROM auth_identity WHERE entity_id = 'user_01K9ZVMT5J5M1ZDBTM51GYZHJF';

-- Clear sessions (if session table exists)
-- DELETE FROM session; -- Be careful with this!
```

### Step 3: Verify Everything is Deleted

```sql
-- Should return 0 for both
SELECT COUNT(*) FROM "user" WHERE email = 'Kittilsen.stian@gmail.com';
SELECT COUNT(*) FROM invite WHERE email = 'Kittilsen.stian@gmail.com';
```

### Step 4: Restart Server

1. Stop the server (Ctrl+C)
2. Clear browser cookies/cache one more time
3. Start server: `npm run dev`
4. Wait for "Server is ready on port: 9000"

### Step 5: Create User Through Signup Form

1. Visit: http://localhost:9000/app
2. **You should now see a SIGNUP form** (not just login)
3. Create admin account:
   - Email: `Kittilsen.stian@gmail.com`
   - Password: `kOkkolille32891657`
   - (Fill any other required fields)

## Why This Works

By deleting all user and invite records, Medusa will detect that no admin users exist and show the signup form instead of just the login form. Creating through the signup form ensures all relationships (user, invite, auth_identity, etc.) are created correctly and linked properly.

## Expected Result

After signup, you should be able to:
- ✅ Log in successfully
- ✅ Access admin dashboard
- ✅ No 404 errors
- ✅ No user ID mismatches

