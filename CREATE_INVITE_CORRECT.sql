-- Step 1: First check the table structure
-- Run this query first to see what columns exist:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invite'
ORDER BY ordinal_position;

-- Step 2: Based on the results, we'll need to adjust the INSERT statement
-- Common column names in Medusa v2 invite table might be:
-- id, email, token, expires_at, created_at, updated_at, accepted, role (maybe), user_role (maybe)

-- If the table has different columns, we need to adapt.
-- Once you run Step 1 and share the results, I can provide the exact INSERT statement.

-- Alternative: Try this INSERT that matches common Medusa v2 structure:
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

-- But this won't set the role to 'admin'. We need to check if there's a separate table
-- for user roles, or if the invite table has a different structure.

