-- Enable required PostgreSQL extensions for Medusa
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql

-- Enable uuid-ossp extension (for UUID generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto extension (for cryptographic functions)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verify extensions are enabled
SELECT * FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');


