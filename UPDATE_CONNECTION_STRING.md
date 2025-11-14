# How to Fix Connection String

## The Problem

The connection string can't resolve the hostname. This usually means:
1. **Supabase project is paused** (most common)
2. **Connection string format is outdated**

## Solution: Get Fresh Connection String from Supabase

### Step 1: Check if Project is Active

1. Go to https://app.supabase.com/
2. Find your project `ucjbyxytbauigbiqpkab`
3. **If it shows "Paused"**, click **Resume** or **Restore**

### Step 2: Get the Correct Connection String

1. Go to: https://app.supabase.com/project/ucjbyxytbauigbiqpkab/settings/database
2. Scroll to **Connection string** section
3. Select **Connection pooling** tab
4. Choose **Transaction mode** (port 6543) - this is more reliable
5. Click the **Copy** button next to the connection string
6. It will look something like:
   ```
   postgresql://postgres.ucjbyxytbauigbiqpkab:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

### Step 3: Update .env File

1. Open `C:\online-store-engine\.env`
2. Replace the `DATABASE_URL` line with the new connection string from Supabase
3. Make sure to replace `[YOUR-PASSWORD]` with your actual password: `kOkkolille32891657`
4. Save the file

### Step 4: Try Migrations Again

After updating, run:
```bash
cd C:\online-store-engine
npx medusa db:migrate
```

## Alternative: Use URI Format

If you prefer direct connection:
1. In Supabase dashboard, use the **URI** tab
2. Copy that connection string
3. Replace `[YOUR-PASSWORD]` with your password
4. Update `.env` file

## Quick Reference

**Current connection string format in credentials:**
```
postgresql://postgres:kOkkolille32891657@db.ucjbyxytbauigbiqpkab.supabase.co:5432/postgres
```

**Recommended format (Connection Pooling):**
```
postgresql://postgres.ucjbyxytbauigbiqpkab:kOkkolille32891657@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Note:** Replace `[REGION]` with your actual region (like `us-east-1`, `eu-west-1`, etc.)


