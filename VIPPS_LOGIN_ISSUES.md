# Vipps Login Integration Issues - Summary

## Overview
Implementing "Login with Vipps" OAuth integration for Norwegian users in a Medusa v2 e-commerce storefront with Next.js.

---

## The Main Problem

After successful Vipps OAuth authentication, the user is redirected back to the login page instead of being authenticated. The OAuth flow completes successfully, but session token creation fails.

---

## Current Flow

1. ✅ User clicks "Log in with Vipps" button on storefront
2. ✅ Storefront fetches OAuth URL from `/store/auth/vipps` endpoint
3. ✅ User is redirected to Vipps for authentication
4. ✅ User authenticates with Vipps (enters phone number, confirms with 2-digit code)
5. ✅ Vipps redirects back to `/auth/vipps/callback` with authorization code
6. ✅ Callback handler:
   - ✅ Exchanges authorization code for access token
   - ✅ Extracts user info from ID token
   - ✅ Finds or creates customer in Medusa
   - ✅ Creates or finds Vipps auth identity
   - ❌ **FAILS** when trying to create session token via `/store/auth/vipps/login`
7. ❌ User gets redirected back to login page because session creation fails

---

## Root Cause

### Issue 1: Publishable API Key Required
**Error**: `Publishable API key required in the request header: x-publishable-api-key`

**Location**: `src/api/auth/vipps/callback/route.ts` line 263-273

**Problem**: 
- The callback route (at `/auth/vipps/callback`) calls `/store/auth/vipps/login` to create a session token
- The `/store/auth/vipps/login` endpoint requires a publishable API key header
- The callback route is a server-side route that doesn't have access to the publishable key in the request headers
- When the callback tries to call the login endpoint, it gets a 400 error because the publishable key is missing

**Attempted Fixes**:
- Tried adding `x-publishable-api-key` header from `process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- This doesn't work because the environment variable might not be available on the backend

### Issue 2: No `createSession` Method
**Error**: `authModule.createSession is not a function`

**Location**: `src/api/store/auth/vipps/login/route.ts`

**Problem**: 
- Medusa v2's auth module doesn't have a `createSession` method
- Attempted to use `authModule.authenticate()` instead, but this method may not exist or work for OAuth providers

---

## What We've Tried

### Attempt 1: Using `authModule.createSession()`
- **Status**: ❌ Failed
- **Error**: `authModule.createSession is not a function`
- **Location**: Multiple callback routes

### Attempt 2: Using `authModule.authenticate()`
- **Status**: ❓ Untested (need to verify method exists)
- **Approach**: Use authenticate method with provider and entity_id
- **Location**: `src/api/store/auth/vipps/login/route.ts`

### Attempt 3: Using HTTP API Endpoints
- **Status**: ❌ Failed
- **Error**: Publishable API key required
- **Approach**: Call `/store/auth/vipps/login` from callback route
- **Location**: `src/api/auth/vipps/callback/route.ts`

### Attempt 4: Extracting User Info from ID Token
- **Status**: ✅ Success
- **Approach**: Decode JWT ID token to get user info instead of calling userinfo endpoint
- **Location**: `src/api/auth/vipps/callback/route.ts` lines 100-186

### Attempt 5: Moving Callback Route Outside `/store/`
- **Status**: ✅ Partial Success
- **Approach**: Moved callback from `/store/auth/vipps/callback` to `/auth/vipps/callback` to bypass publishable API key requirement
- **Location**: `src/api/auth/vipps/callback/route.ts`

---

## Current State

### What's Working ✅
1. Vipps OAuth URL generation
2. User authentication with Vipps
3. OAuth callback handler receives authorization code
4. Token exchange with Vipps API
5. User info extraction from ID token
6. Customer creation/finding in Medusa
7. Auth identity creation in Medusa

### What's Not Working ❌
1. **Session token generation** - Can't create JWT token for customer
2. **Login endpoint accessibility** - `/store/auth/vipps/login` requires publishable key

---

## Technical Details

### Medusa v2 Architecture
- Uses modular architecture with separate modules (AUTH, USER)
- Authentication uses `auth_identity` and `provider_identity` tables
- Session tokens are JWT tokens stored in cookies as `_medusa_jwt`
- `/store/*` routes require publishable API key header

### Vipps OAuth Flow
- Authorization Code flow with OpenID Connect
- Test environment: `https://apitest.vipps.no`
- ID token contains user info (email, name, phone number, etc.)
- Access token can be used to call userinfo endpoint (optional)

### Current Implementation Files
- `src/api/store/auth/vipps/route.ts` - Initiates OAuth flow
- `src/api/auth/vipps/callback/route.ts` - Handles OAuth callback
- `src/api/store/auth/vipps/login/route.ts` - Creates session token (not working)
- `storefront/src/modules/account/components/login/vipps-button.tsx` - Frontend button
- `storefront/src/app/auth/callback/route.ts` - Sets cookie from token in URL

---

## Potential Solutions

### Solution 1: Generate JWT Token Directly in Callback
**Approach**: 
- Use Medusa's JWT service directly in the callback route
- Generate token without calling another endpoint
- Requires finding the correct JWT service/module

**Pros**: 
- No publishable key needed
- Single place for token generation
- Simpler flow

**Cons**: 
- Need to find correct JWT service/module
- May require understanding Medusa v2 internals

### Solution 2: Move Login Endpoint Outside `/store/`
**Approach**: 
- Move `/store/auth/vipps/login` to `/auth/vipps/login`
- This endpoint won't require publishable API key
- Can be called directly from callback

**Pros**: 
- Simple fix
- Maintains separation of concerns

**Cons**: 
- Still need to fix session token generation method

### Solution 3: Use Medusa SDK's Auth Methods
**Approach**: 
- Use Medusa SDK's built-in auth methods if available
- Similar to how storefront uses `sdk.auth.login()`

**Pros**: 
- Uses official Medusa API
- More likely to work

**Cons**: 
- Need to check if SDK methods work server-side
- May require different approach than client-side

### Solution 4: Create Auth Identity and Use Standard Login
**Approach**: 
- Create auth identity during callback
- Use Medusa's standard login endpoint with provider credentials
- May require creating a "password" or token in provider_metadata

**Pros**: 
- Uses existing Medusa auth flow

**Cons**: 
- OAuth providers don't have passwords
- May not fit OAuth flow

---

## Next Steps

1. **Investigate Medusa v2 JWT Token Generation**
   - Find how Medusa v2 generates JWT tokens for customers
   - Check if there's a JWT service or module we can use directly
   - Look for examples in Medusa v2 codebase or documentation

2. **Test `authModule.authenticate()` Method**
   - Verify if this method exists and what it returns
   - Test with Vipps provider
   - Check return format (string token, object with token, etc.)

3. **Check Medusa v2 Auth Module API**
   - Review available methods on auth module
   - Look for session creation methods
   - Check documentation or type definitions

4. **Alternative: Use Medusa Admin API**
   - Check if admin API has methods to create customer sessions
   - May require different authentication

---

## Environment Variables

Required for Vipps integration:
- `VIPPS_CLIENT_ID` - OAuth client ID
- `VIPPS_CLIENT_SECRET` - OAuth client secret
- `VIPPS_SUBSCRIPTION_KEY` - API subscription key
- `VIPPS_REDIRECT_URI` - OAuth redirect URI (currently `http://localhost:9000/auth/vipps/callback`)
- `VIPPS_MSN` - Merchant Serial Number
- `VIPPS_TEST_MODE` - Set to `true` for test environment
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` - Publishable API key for storefront
- `NEXT_PUBLIC_BASE_URL` - Storefront URL (for redirects)

---

## Error Logs Summary

### Most Recent Error (error22.txt)
```
Login endpoint failed: 400 {"type":"not_allowed","message":"Publishable API key required in the request header: x-publishable-api-key. You can manage your keys in settings in the dashboard."}
```

This happens at:
- `src/api/auth/vipps/callback/route.ts:278`
- When calling `POST /store/auth/vipps/login`

### Previous Errors
- `authModule.createSession is not a function` - Method doesn't exist
- `Trying to query by not existing property AuthIdentity.entity_id` - Can't filter by entity_id
- `no Route matched with those values` - Userinfo endpoint path issue (fixed by using ID token)

---

## Notes

- The OAuth flow itself works perfectly - all steps complete successfully
- The only blocker is generating the JWT session token after authentication
- Medusa v2's authentication system may work differently than expected
- Need to find the correct way to create a customer session in Medusa v2

---

Last Updated: Current session
Status: Blocked on session token generation

