# Fresh Database Setup - Clean Start

## Why Fresh Database?

After many attempts to clean up old user/session records, creating a fresh database is the **fastest and cleanest solution**.

## Option 1: Create New Database in Supabase (Recommended)

### Step 1: Create New Database

1. Go to Supabase Dashboard: https://app.supabase.com/
2. Create a **new project**:
   - Click "New Project"
   - Name: `medusa-store-prod` (or any name)
   - Set a new database password
   - Choose a region
   - Wait for project to be created

### Step 2: Get Connection String

1. In new project, go to **Settings** > **Database**
2. Click **Connection pooling** tab
3. Select **Transaction mode**
4. Copy the connection string
5. Replace `[YOUR-PASSWORD]` with your database password

### Step 3: Update .env

Update your `.env` file with the new connection string:
```env
DATABASE_URL=postgresql://postgres.[NEW-PROJECT-REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres
```

### Step 4: Enable Extensions

Run this SQL in the NEW Supabase project:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Step 5: Run Migrations

```bash
cd C:\online-store-engine
npx medusa db:migrate
```

### Step 6: Start Server

```bash
npm run dev
```

### Step 7: Visit Admin Dashboard

1. Visit: http://localhost:9000/app
2. **You should see the SIGNUP form** (no old data blocking it)
3. Create admin account:
   - Email: `Kittilsen.stian@gmail.com`
   - Password: `kOkkolille32891657`

## Option 2: Reset Current Database (Alternative)

If you want to keep the current project, you can **reset all tables**:

### WARNING: This deletes ALL data

1. In Supabase, go to **Settings** > **Database**
2. Scroll to **Database reset** section
3. Click **Reset database** (or similar option)
4. This will drop all tables

Then:
1. Enable extensions again
2. Run migrations: `npx medusa db:migrate`
3. Start server and signup

## Recommendation

**Option 1 (New Database)** is safer and cleaner. You can delete the old project later if needed.

