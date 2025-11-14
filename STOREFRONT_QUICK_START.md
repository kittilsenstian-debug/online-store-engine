# 🚀 Storefront Quick Start Guide

Your production-ready Medusa Next.js storefront is now set up!

## ✅ What's Been Done

1. ✅ Medusa Next.js storefront cloned and configured
2. ✅ Environment variables file created (`.env.local`)
3. ✅ Backend CORS settings configured
4. ✅ Dependencies installed

## 🎯 Next Steps (5 Minutes)

### 1. Get Publishable API Key

The storefront needs a publishable API key to connect to your backend. Run:

```bash
cd C:\online-store-engine
npx medusa exec ./src/scripts/get-publishable-key.ts
```

This will display your publishable API key. Copy it and update `storefront/.env.local`:

**Option A: Using the script**
```bash
# The script will output the key - copy it and update .env.local manually
```

**Option B: From Admin Dashboard**
1. Start your backend: `npm run dev`
2. Go to http://localhost:9000/app
3. Navigate to **Settings** > **Publishable API Keys**
4. Copy the key (should start with `pk_`)
5. Update `storefront/.env.local`:
   ```env
   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_<your-key-here>
   ```

**Option C: Create if missing**
If you haven't run the seed script yet:
```bash
cd C:\online-store-engine
npm run seed
```
This will create a publishable API key automatically.

### 2. Update Storefront Environment

Edit `storefront/.env.local` and update:
```env
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_<your-actual-key>
```

### 3. Start Development Servers

You need both backend and storefront running in separate terminals:

**Terminal 1 - Backend:**
```bash
cd C:\online-store-engine
npm run dev
```

**Terminal 2 - Storefront:**
```bash
cd C:\online-store-engine\storefront
npm run dev
```

### 4. Access Your Storefront

- **Storefront**: http://localhost:8000 🛍️
- **Backend Admin**: http://localhost:9000/app ⚙️
- **Backend API**: http://localhost:9000 🔌

## 📋 Configuration Summary

### Backend CORS (Already Configured)
Your backend `.env` has:
```env
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:9000,http://localhost:7000,http://localhost:7001,http://localhost:5173
AUTH_CORS=http://localhost:9000,http://localhost:7000,http://localhost:7001,http://localhost:5173
```

### Storefront Environment Variables
Located in `storefront/.env.local`:
```env
MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_<your-key>
NEXT_PUBLIC_BASE_URL=http://localhost:8000
NEXT_PUBLIC_DEFAULT_REGION=us
```

## 🎨 Features Included

Your storefront includes:
- ✅ Product browsing and filtering
- ✅ Product detail pages with image galleries
- ✅ Shopping cart functionality
- ✅ Checkout flow
- ✅ Customer accounts and authentication
- ✅ Order history
- ✅ Collections and categories
- ✅ Stripe payment integration (optional)
- ✅ Responsive design
- ✅ SEO optimized

## 🔧 Troubleshooting

### "Missing publishable API key" error
- Make sure you've updated `storefront/.env.local` with `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- Run the seed script if you haven't: `npm run seed`
- Get the key: `npx medusa exec ./src/scripts/get-publishable-key.ts`

### CORS errors
- Make sure backend `.env` has `STORE_CORS=http://localhost:8000`
- Restart backend after updating CORS
- Check both servers are running

### Connection errors
- Verify backend is running on port 9000
- Check `MEDUSA_BACKEND_URL` in `storefront/.env.local` is correct
- Ensure backend is accessible: http://localhost:9000/health

### Port already in use
If port 8000 is taken, you can change it in `storefront/package.json`:
```json
"dev": "next dev --turbopack -p 8001"
```

## 🚀 Production Deployment

For production deployment:
- See `VPS_MIGRATION.md` for VPS deployment
- See `storefront/STOREFRONT_SETUP.md` for detailed setup guide
- Vercel deployment: https://docs.medusajs.com/resources/deployment/storefront/vercel

## 📚 Resources

- [Medusa Storefront Docs](https://docs.medusajs.com/resources/storefront-development)
- [Next.js Docs](https://nextjs.org/docs)
- [Medusa Admin Guide](https://docs.medusajs.com/resources/admin-development)

## 🎉 You're Ready!

Your production-ready storefront is configured and ready to use! Start both servers and visit http://localhost:8000 to see your store.

