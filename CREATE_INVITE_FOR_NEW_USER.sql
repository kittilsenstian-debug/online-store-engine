-- Create admin invite for the newly created user
-- User ID: user_01KA00BB9FW0EM4E4TT4CYEX0P
-- Email: Kittilsen.stian@gmail.com

-- Step 1: Create admin invite with correct structure
INSERT INTO invite (
    id,
    email,
    accepted,
    token,
    expires_at,
    metadata,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Kittilsen.stian@gmail.com',
    true,  -- Mark as accepted
    gen_random_uuid()::text,
    NOW() + INTERVAL '30 days',
    '{"role": "admin"}'::jsonb,
    NOW(),
    NOW()
);

-- Step 2: Verify invite was created
SELECT * FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

-- Step 3: Check if user exists
SELECT id, email FROM "user" WHERE email = 'Kittilsen.stian@gmail.com';

-- Step 4: Check if provider_identity needs to be created (this links user to auth)
-- First check structure:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'provider_identity'
ORDER BY ordinal_position;

-- After creating invite, try logging in - it should work now!

