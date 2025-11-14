# Setup Instructions

## ✅ Completed Steps

1. ✅ Medusa project created
2. ✅ Environment variables configured with Supabase credentials
3. ✅ Secure JWT and Cookie secrets generated
4. ✅ Database connection string configured

## 🔧 Required Next Steps

### Step 1: Enable PostgreSQL Extensions in Supabase

Before running migrations, you need to enable required PostgreSQL extensions in your Supabase database:

1. Go to your Supabase Dashboard: https://app.supabase.com/project/ucjbyxytbauigbiqpkab
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy and paste the following SQL:

```sql
-- Enable required PostgreSQL extensions for Medusa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

5. Click **Run** (or press Ctrl+Enter)

### Step 2: Verify Database Connection

The connection string has been configured to use Supabase's connection pooling (port 6543), which is recommended for production.

If you encounter connection issues:
- Check that your Supabase project is active
- Verify the database password in the connection string matches your Supabase project password
- Try using direct connection (port 5432) instead of pooling (port 6543)

### Step 3: Run Database Migrations

Once extensions are enabled, run:

```bash
npx medusa db:migrate
```

### Step 4: Seed the Database (Optional)

To populate with sample data:

```bash
npm run seed
```

### Step 5: Start Development Server

```bash
npm run dev
```

Your Medusa store will be available at:
- **API**: http://localhost:9000
- **Admin Dashboard**: http://localhost:9000/app

## 🔍 Troubleshooting

### Connection Timeout Errors

If you get connection timeout errors:

1. **Check Supabase Status**: Ensure your Supabase project is running
2. **Verify Connection String**: Check that the password in `.env` matches your Supabase database password
3. **Try Direct Connection**: Change port from `6543` to `5432` in `.env`
4. **Check IP Restrictions**: Ensure your IP isn't blocked in Supabase settings

### Extension Errors

If migrations fail with extension errors:
- Ensure you've run the SQL commands in Supabase SQL Editor
- Check that extensions are enabled: Run `SELECT * FROM pg_extension;` in SQL Editor

## 📝 Notes

- Redis is optional for now. The store will work with in-memory alternatives.
- For production deployment, see `VPS_MIGRATION.md`
- Your credentials are stored in `.env` (which is gitignored for security)


