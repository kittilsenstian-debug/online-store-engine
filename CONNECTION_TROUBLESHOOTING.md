# Connection Troubleshooting Guide

## Issue: DNS Resolution Error (ENOTFOUND)

The connection string format might be incorrect or the Supabase project might be paused.

## Steps to Fix:

### Step 1: Verify Supabase Project is Active

1. Go to https://app.supabase.com/
2. Check if your project `ucjbyxytbauigbiqpkab` is **active** (not paused)
3. If paused, click **Resume** or **Restore**

### Step 2: Get the Correct Connection String from Supabase

1. Go to your Supabase Dashboard: https://app.supabase.com/project/ucjbyxytbauigbiqpkab
2. Navigate to **Settings** > **Database**
3. Scroll to **Connection string** section
4. You'll see different connection modes:
   - **URI** (Direct connection)
   - **Connection pooling** (Transaction mode - recommended)
   - **Session mode**

### Step 3: Use the Correct Connection String Format

**Option A: Direct Connection (URI)**
```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Option B: Connection Pooling (Recommended for Production)**
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Option C: Session Mode Pooling**
```
postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

### Step 4: Update .env File

1. Copy the connection string from Supabase dashboard
2. Replace `[YOUR-PASSWORD]` with your actual password: `kOkkolille32891657`
3. Update `DATABASE_URL` in your `.env` file

### Step 5: Test Connection Again

After updating the connection string, run:

```bash
cd C:\online-store-engine
npx medusa db:migrate
```

## Common Issues:

### Issue 1: Project is Paused
**Solution**: Resume your Supabase project from the dashboard

### Issue 2: Wrong Connection String Format
**Solution**: Use the connection string directly from Supabase dashboard > Settings > Database

### Issue 3: Password Contains Special Characters
**Solution**: URL-encode special characters in the password
- `@` becomes `%40`
- `+` becomes `%2B`
- etc.

### Issue 4: IP Restrictions
**Solution**: Check Supabase Settings > Network > Allowed IPs and add your IP if needed

## Quick Test Connection

To test if the connection works, you can use:

```bash
node -e "const pg = require('pg'); const client = new pg.Client({ connectionString: 'YOUR_CONNECTION_STRING_HERE' }); client.connect().then(() => { console.log('✅ Connection successful!'); client.end(); }).catch(err => { console.error('❌ Connection failed:', err.message); });"
```

Replace `YOUR_CONNECTION_STRING_HERE` with your actual connection string.


