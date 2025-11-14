-- Create admin invite with correct structure
-- Based on the actual invite table structure

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
    true,  -- Mark as accepted since we're creating it directly
    gen_random_uuid()::text,
    NOW() + INTERVAL '30 days',
    '{"role": "admin"}'::jsonb,  -- Store role in metadata
    NOW(),
    NOW()
);

-- Verify it was created
SELECT * FROM invite WHERE email = 'Kittilsen.stian@gmail.com';

-- After running this, try logging in at http://localhost:9000/app
-- Email: Kittilsen.stian@gmail.com
-- Password: kOkkolille32891657

