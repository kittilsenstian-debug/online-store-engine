-- Create admin invite for the user directly in database
-- Run this in Supabase SQL Editor

-- First, get the user ID (should match what was created)
-- The user ID from the script was: user_01K9ZVMT5J5M1ZDBTM51GYZHJF

-- Step 1: Create an admin invite
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
    true,  -- Mark as accepted since we're creating it directly
    gen_random_uuid()::text,
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    accepted = true,
    updated_at = NOW();

-- Step 2: Verify the invite was created
SELECT * FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

-- Step 3: Check if user exists
SELECT id, email FROM "user" WHERE email = 'Kittilsen.stian@gmail.com';

-- After running this, try logging in at http://localhost:9000/app
-- Email: Kittilsen.stian@gmail.com
-- Password: kOkkolille32891657

