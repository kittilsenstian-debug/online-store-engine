# Quick Start Guide - Medusa with Supabase

## ✅ What's Already Done

1. ✅ Medusa project created and configured
2. ✅ Environment variables set up with your Supabase credentials
3. ✅ Secure JWT and Cookie secrets generated
4. ✅ Configuration files ready

## 🚀 Next Steps (5 Minutes)

### Step 1: Enable PostgreSQL Extensions (Required!)

**This is critical** - Medusa requires these extensions before connecting:

1. Go to your Supabase SQL Editor: https://app.supabase.com/project/ucjbyxytbauigbiqpkab/sql/new
2. Copy and paste this SQL:

```sql
-- Enable required PostgreSQL extensions for Medusa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

3. Click **Run** (or press Ctrl+Enter)
4. You should see "Success. No rows returned"

**Without this step, migrations will fail with connection timeout errors!**

### Step 2: Run Database Migrations

Once extensions are enabled, run:

```bash
cd C:\online-store-engine
npx medusa db:migrate
```

This will create all the necessary database tables.

### Step 3: Seed Database (Optional)

Add sample data:

```bash
npm run seed
```

### Step 4: Start Development Server

```bash
npm run dev
```

Your Medusa store will be available at:
- **Admin Dashboard**: http://localhost:9000/app
- **API**: http://localhost:9000

## 📋 Files Created

- `.env` - Your environment variables (with Supabase credentials)
- `medusa-config.ts` - Medusa configuration
- `supabase-setup.sql` - SQL script for enabling extensions
- `SETUP_INSTRUCTIONS.md` - Detailed setup instructions
- `VPS_MIGRATION.md` - Guide for VPS deployment

## 🔧 Configuration Details

### Database Connection
- **Database**: Supabase PostgreSQL
- **Connection String**: Configured in `.env`
- **Password**: From your credentials file

### Security
- **JWT Secret**: Generated secure random string
- **Cookie Secret**: Generated secure random string

## ⚠️ Troubleshooting

### Connection Timeout Error

If you see "KnexTimeoutError" or "connection timeout":

1. **Enable Extensions First** (see Step 1 above)
2. **Check Supabase Status**: Ensure your project is active
3. **Verify Password**: The password in `.env` should match your Supabase database password
4. **Try Direct Connection**: The connection string uses port 5432 (direct connection)

### Can't Find SQL Editor in Supabase

1. Go to https://app.supabase.com/
2. Select your project: `ucjbyxytbauigbiqpkab`
3. Click **SQL Editor** in the left sidebar
4. Click **New Query** button

## 🎉 Once Running

After completing the steps above, you'll have:
- ✅ Working Medusa backend
- ✅ Connected to Supabase database
- ✅ Admin dashboard accessible
- ✅ Ready for development

## 📚 Additional Resources

- See `SETUP_INSTRUCTIONS.md` for detailed troubleshooting
- See `VPS_MIGRATION.md` for deployment instructions
- Medusa Docs: https://docs.medusajs.com


