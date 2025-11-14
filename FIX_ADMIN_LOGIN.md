# Fix Admin User Login Issue

## Problem
You created a user with `npx medusa user` but cannot login. This is because in Medusa v2, users need to be assigned to an admin team through an invite system.

## ✅ Verified
- ✅ User exists: `Kittilsen.stian@gmail.com` (ID: `user_01K9ZSQWQ3SSXCE9W9R3JJ0V55`)
- ❌ User is not assigned to any team (no admin access)

## Solution Options

### Option 1: Delete and Recreate Through Admin Dashboard (Recommended)

1. **Delete the existing user**:
   ```bash
   # Connect to your Supabase database and delete the user
   # Or use this SQL in Supabase SQL Editor:
   ```
   Go to Supabase SQL Editor and run:
   ```sql
   DELETE FROM auth_identity WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';
   DELETE FROM user WHERE id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';
   ```

2. **Start your Medusa server**:
   ```bash
   npm run dev
   ```

3. **Visit the admin dashboard**:
   - Go to: http://localhost:9000/app
   - If no users exist, you should see a **signup form** (not just login)
   - Create your admin account through the signup form

### Option 2: Create Admin Invite via API

1. **Start your Medusa server**:
   ```bash
   npm run dev
   ```

2. **Create an invite using curl or Postman**:
   ```bash
   curl -X POST http://localhost:9000/admin/invites \
   -H "Content-Type: application/json" \
   -d '{
     "email": "Kittilsen.stian@gmail.com",
     "role": "admin"
   }'
   ```

   However, this requires admin authentication first, which creates a chicken-and-egg problem.

### Option 3: Use SQL to Create Invite Directly (Quick Fix)

1. **Go to Supabase SQL Editor**: https://app.supabase.com/project/ucjbyxytbauigbiqpkab/sql/new

2. **Run this SQL** to create an admin invite:
   ```sql
   -- Create an admin invite for the user
   INSERT INTO invite (
     id,
     email,
     role,
     accepted,
     token,
     expires_at,
     created_at,
     updated_at
   ) VALUES (
     gen_random_uuid(),
     'Kittilsen.stian@gmail.com',
     'admin',
     true,
     gen_random_uuid()::text,
     NOW() + INTERVAL '30 days',
     NOW(),
     NOW()
   );
   ```

3. **Link the invite to the user** (this might require additional steps depending on Medusa's schema)

### Option 4: Simplest Solution - Delete User and Start Fresh

1. **Stop your server** if it's running (Ctrl+C)

2. **Delete the user from database** via Supabase SQL Editor:
   ```sql
   -- First check what tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE '%user%' OR table_name LIKE '%invite%' OR table_name LIKE '%auth%';
   
   -- Then delete user and related records
   DELETE FROM auth_identity WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';
   DELETE FROM invite WHERE email = 'Kittilsen.stian@gmail.com';
   DELETE FROM user WHERE id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';
   ```

3. **Start your server**:
   ```bash
   npm run dev
   ```

4. **Visit http://localhost:9000/app**
   - If no admin users exist, you should see a **signup form**
   - Create your admin account with:
     - Email: `Kittilsen.stian@gmail.com`
     - Password: `kOkkolille32891657`

## Why This Happens

In Medusa v2, the `npx medusa user` command creates a user but doesn't automatically grant admin access. Users must be invited to a team with an admin role. The admin dashboard shows a signup form only when no admin users exist in the system.

## Recommended Steps

I recommend **Option 4** (delete and recreate):
1. It's the simplest and most reliable
2. Ensures proper team/invite setup
3. You'll see the signup form instead of just login

After deleting the user, when you visit http://localhost:9000/app with no admin users, Medusa will show you a signup form to create the first admin user.


