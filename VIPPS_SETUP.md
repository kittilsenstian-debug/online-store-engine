# Vipps Login Integration Guide

This guide explains how to set up Vipps login for Norwegian users in your Medusa store.

## ✅ What's Been Implemented

1. ✅ Vipps OAuth routes (`/store/auth/vipps` and `/store/auth/vipps/callback`)
2. ✅ Vipps login button component for storefront
3. ✅ Environment variables configuration

## 🔧 Configuration

### 1. Environment Variables

Add these to your `.env` file:

```env
# Vipps OAuth Configuration
VIPPS_CLIENT_ID=your_client_id_here
VIPPS_CLIENT_SECRET=your_client_secret_here
VIPPS_SUBSCRIPTION_KEY=your_subscription_key_here
VIPPS_REDIRECT_URI=http://localhost:9000/store/auth/vipps/callback
VIPPS_MSN=414355
```

For production, update:
```env
VIPPS_REDIRECT_URI=https://yourdomain.com/store/auth/vipps/callback
```

### 2. Vipps Portal Configuration

In your Vipps Portal:
1. Go to your application settings
2. Add redirect URI: `http://localhost:9000/store/auth/vipps/callback` (for development)
3. Add redirect URI: `https://yourdomain.com/store/auth/vipps/callback` (for production)

### 3. Vipps API Endpoints

**Development/Test:**
- Authorization: `https://apitest.vipps.no/access-management-1.0/access/oauth2/auth`
- Token: `https://apitest.vipps.no/access-management-1.0/access/oauth2/token`
- Userinfo: `https://apitest.vipps.no/access-management-1.0/access/userinfo`

**Production:**
- Authorization: `https://api.vipps.no/access-management-1.0/access/oauth2/auth`
- Token: `https://api.vipps.no/access-management-1.0/access/oauth2/token`
- Userinfo: `https://api.vipps.no/access-management-1.0/access/userinfo`

## 🚀 Usage

### For Users

1. Click "Log in with Vipps" button on the login page
2. You'll be redirected to Vipps login
3. After successful authentication, you'll be redirected back to your store
4. A user account will be created automatically if it doesn't exist

### Testing

1. Start your backend: `npm run dev`
2. Start your storefront: `cd storefront && npm run dev`
3. Go to the login page
4. Click "Log in with Vipps"
5. Use Vipps test credentials if available

## 📝 Notes

- Vipps login is currently configured for production environment
- To use test environment, update the API URLs in the route handlers
- The access token is stored in the provider_metadata (should be refreshed periodically)
- Phone numbers from Vipps are stored in user metadata
- Users are automatically created if they don't exist

## 🔗 Resources

- [Vipps Login API Documentation](https://developer.vippsmobilepay.com/docs/APIs/login-api)
- [Vipps Developer Portal](https://developer.vippsmobilepay.com/)

