-- Step 1: First, check what columns the invite table actually has
-- Run this FIRST in Supabase SQL Editor:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invite'
ORDER BY ordinal_position;

-- Step 2: Based on Medusa v2 structure, try this INSERT (without role column):
-- Common structure might be: id, email, token, expires_at, accepted, created_at, updated_at
INSERT INTO invite (
    id,
    email,
    token,
    expires_at,
    accepted,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Kittilsen.stian@gmail.com',
    gen_random_uuid()::text,
    NOW() + INTERVAL '30 days',
    true,
    NOW(),
    NOW()
);

-- Step 3: Verify it was created
SELECT * FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

-- Note: The role might be stored in a different table (like user_role or team_member)
-- After creating the invite, we might need to link it to admin role separately
-- Or try logging in - Medusa might handle role assignment during login

