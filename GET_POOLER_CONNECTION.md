# Get the Correct Pooler Connection String

## Steps:

1. **Go to Supabase Dashboard**: https://app.supabase.com/project/ucjbyxytbauigbiqpkab/settings/database

2. **Scroll to "Connection string" section**

3. **Click on "Connection pooling" tab**

4. **Select "Transaction mode"** (or try "Session mode" if Transaction doesn't work)

5. **Copy the entire connection string** - it will look like one of these:

   **Transaction Mode:**
   ```
   postgresql://postgres.ucjbyxytbauigbiqpkab:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

   **Session Mode:**
   ```
   postgresql://postgres.ucjbyxytbauigbiqpkab:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
   ```

6. **Replace `[YOUR-PASSWORD]` with your actual password**: `kOkkolille32891657`

7. **Send me the complete connection string** so I can update the .env file

## What to Look For:

The connection string should have:
- ✅ `postgres.ucjbyxytbauigbiqpkab` (not `postgres:`)
- ✅ `aws-0-[REGION].pooler.supabase.com` (not `db.ucjbyxytbauigbiqpkab.supabase.co`)
- ✅ Port `6543` (Transaction mode) or `5432` (Session mode)

## Common Regions:

Your region could be one of:
- `us-east-1` (US East)
- `us-west-1` (US West)
- `eu-west-1` (Europe West)
- `eu-central-1` (Europe Central)
- `ap-southeast-1` (Asia Pacific)

But it's best to get the exact one from the Supabase dashboard!


