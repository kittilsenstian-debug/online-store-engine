# Fix User ID Mismatch Issue

## Problem
- ✅ Login succeeds (200 response)
- ❌ User lookup fails (404) - "User with id: user_01K9ZSQWQ3SSXCE9W9R3JJ0V55 was not found"
- This is the OLD user ID from when we first created the user

## Cause
The session is storing the old user ID, but we created a NEW user with a different ID:
- Old user ID: `user_01K9ZSQWQ3SSXCE9W9R3JJ0V55` (doesn't exist)
- New user ID: `user_01K9ZVMT5J5M1ZDBTM51GYZHJF` (exists)

## Solutions

### Solution 1: Clear Browser Session/Cookies (Easiest)
1. Open browser developer tools (F12)
2. Go to Application/Storage tab
3. Clear cookies for `localhost:9000`
4. Clear session storage
5. Hard refresh (Ctrl+Shift+R)
6. Try logging in again

### Solution 2: Check Database for Old User
Run this SQL in Supabase SQL Editor:
```sql
-- Check what users exist
SELECT id, email, created_at FROM "user" ORDER BY created_at;

-- Check if old user ID still exists
SELECT * FROM "user" WHERE id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';

-- If old user doesn't exist, check auth sessions/identities
SELECT * FROM auth_identity WHERE entity_id = 'user_01K9ZSQWQ3SSXCE9W9R3JJ0V55';
```

### Solution 3: Check Invite Linkage
The invite might be linked to the wrong user. Check:
```sql
-- See invite details
SELECT * FROM invite WHERE email = 'Kittilsen.stian@gmail.com';
```

### Solution 4: Use Incognito/Private Window
Try logging in from an incognito/private browser window to avoid cookie/session issues.

## Quick Fix
**Clear browser cookies and try again** - this is most likely the issue!


