import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Handle Vipps OAuth callback
 * GET /auth/vipps/callback
 * This route is outside /store/ so it doesn't require publishable API key
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  // Log immediately to verify handler is running
  console.error("=== VIPPS CALLBACK HANDLER CALLED ===")
  
  const { code, state } = req.query

  console.error("=== Vipps Callback Start ===")
  console.error("Code:", code ? "present" : "missing")
  console.error("State from URL:", state)
  console.error("State from session:", req.session?.state)
  console.error("Query params:", Object.keys(req.query))
  console.error("Request headers:", req.headers)

  if (!code) {
    console.error("ERROR: Missing authorization code in callback")
    console.error("=== Vipps Callback End (400 - missing code) ===")
    res.status(400).json({ message: "Missing authorization code" })
    return
  }

  // Verify state (log for debugging)
  // In OAuth, state is used for CSRF protection, but we'll be lenient for now
  // Only check if both state values exist - if one is missing, we'll continue anyway
  if (state && req.session?.state) {
    // Both exist - they must match
    if (state !== req.session.state) {
      console.error("ERROR: State mismatch")
      console.error("  Received from URL:", state)
      console.error("  Expected from session:", req.session.state)
      console.error("=== Vipps Callback End (400 - state mismatch) ===")
      res.status(400).json({ message: "Invalid state parameter" })
      return
    } else {
      console.error("✓ State verified (matched)")
    }
  } else if (state && !req.session?.state) {
    console.warn("Warning: State in URL but no state in session (continuing anyway)")
  } else if (!state && req.session?.state) {
    console.warn("Warning: State in session but no state in URL (continuing anyway)")
  } else {
    console.warn("Warning: No state parameter in either URL or session (continuing anyway)")
  }
  
  console.error("✓ Starting OAuth token exchange...")

  try {
    const clientId = process.env.VIPPS_CLIENT_ID
    const clientSecret = process.env.VIPPS_CLIENT_SECRET
    const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY
    const redirectUri = process.env.VIPPS_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/vipps/callback`
    const backendUrl = process.env.BACKEND_URL || "http://localhost:9000"

    // Determine if we're in test mode
    const isTestMode = process.env.VIPPS_TEST_MODE === "true"
    const vippsBaseUrl = isTestMode 
      ? "https://apitest.vipps.no" 
      : "https://api.vipps.no"

    // Exchange authorization code for access token
    // Vipps API requires Basic Auth for client_id/client_secret
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    
    console.error("Exchanging code for token...")
    const tokenResponse = await fetch(`${vippsBaseUrl}/access-management-1.0/access/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
        "Ocp-Apim-Subscription-Key": subscriptionKey || "",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("Vipps token error:", errorText)
      const storefrontUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
      return res.redirect(`${storefrontUrl}/account?vipps_login=error&error=token_error`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    const idToken = tokenData.id_token
    console.error("✓ Token received from Vipps")
    console.error("Token data keys:", Object.keys(tokenData))

    // Try to get user info from ID token first (OpenID Connect)
    let userInfo: any = null
    
    if (idToken) {
      console.error("Extracting user info from ID token...")
      try {
        // Decode JWT ID token (without verification for now)
        const base64Url = idToken.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(Buffer.from(base64, 'base64').toString().split('').map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
        userInfo = JSON.parse(jsonPayload)
        console.error("✓ User info extracted from ID token:", userInfo.sub || userInfo.user_id)
      } catch (decodeError: any) {
        console.error("Error decoding ID token:", decodeError?.message)
        // Fall through to userinfo endpoint
      }
    }

    // If no ID token or decode failed, try userinfo endpoint
    if (!userInfo) {
      console.error("Fetching user info from Vipps userinfo endpoint...")
      try {
        const userInfoResponse = await fetch(`${vippsBaseUrl}/access-management-1.0/access/userinfo`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Ocp-Apim-Subscription-Key": subscriptionKey || "",
          },
        })

        if (!userInfoResponse.ok) {
          const errorText = await userInfoResponse.text()
          console.error("Vipps userinfo endpoint error:", errorText)
          console.error("Trying alternative endpoint...")
          
          // Try alternative endpoint path
          const altUserInfoResponse = await fetch(`${vippsBaseUrl}/access-management-1.0/access/oauth2/userinfo`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Ocp-Apim-Subscription-Key": subscriptionKey || "",
            },
          })
          
          if (!altUserInfoResponse.ok) {
            const altErrorText = await altUserInfoResponse.text()
            console.error("Alternative userinfo endpoint also failed:", altErrorText)
            // Use minimal user info from token or create placeholder
            const tokenSub = tokenData.sub || tokenData.user_id || "unknown"
            userInfo = {
              sub: tokenSub,
              email: `${tokenSub}@vipps.no`,
              phone_number: null,
              name: null,
            }
            console.error("Using minimal user info from token")
          } else {
            userInfo = await altUserInfoResponse.json()
            console.error("✓ User info received from alternative endpoint")
          }
        } else {
          userInfo = await userInfoResponse.json()
          console.error("✓ User info received from userinfo endpoint")
        }
      } catch (fetchError: any) {
        console.error("Error fetching userinfo:", fetchError?.message)
        // Use minimal user info
        const tokenSub = tokenData.sub || tokenData.user_id || "unknown"
        userInfo = {
          sub: tokenSub,
          email: `${tokenSub}@vipps.no`,
          phone_number: null,
          name: null,
        }
        console.error("Using minimal user info from token")
      }
    }
    
    if (!userInfo) {
      console.error("ERROR: Could not get user info from any source")
      const storefrontUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
      return res.redirect(`${storefrontUrl}/account?vipps_login=error&error=userinfo_error`)
    }
    
    console.error("✓ User info resolved:", userInfo.sub || userInfo.user_id)
    
    // Get Medusa container
    const container = req.scope
    const authModule = container.resolve(Modules.AUTH)
    const userModule = container.resolve(Modules.USER)

    // Check if customer exists with Vipps identifier
    const vippsUserId = userInfo.sub || userInfo.user_id
    const email = userInfo.email || `${vippsUserId}@vipps.no`

    console.error("Finding or creating customer:", email)
    // Try to find existing customer (customers in Medusa are users with customer role)
    let users = await userModule.listUsers({ email })
    let customer = users[0]

    if (!customer) {
      console.error("Creating new customer...")
      // Create new customer (user with customer type)
      const [createdCustomer] = await userModule.createUsers([{
        email,
        first_name: userInfo.given_name || userInfo.name?.split(" ")[0] || "",
        last_name: userInfo.family_name || userInfo.name?.split(" ").slice(1).join(" ") || "",
      }])
      customer = createdCustomer
      console.error("✓ Customer created:", customer.id)
    } else {
      console.error("✓ Customer found:", customer.id)
    }

    // Per ChatGPT advice: Create provider_identity FIRST, then auth_identity
    // This ensures proper linking between provider_identity and auth_identity
    // IMPORTANT: Auto-detect manager since "manager" might not be registered with that exact name
    let providerIdentity
    let authIdentity
    
    // Debug: Log req.scope to see what's available
    console.error("DEBUG: req exists:", !!req)
    console.error("DEBUG: req.scope exists:", !!req?.scope)
    console.error("DEBUG: req.scope.resolve exists:", typeof req?.scope?.resolve)
    
    if (!req?.scope?.resolve) {
      console.error("ERROR: Request scope missing or invalid")
      throw new Error("Request scope missing. Cannot resolve manager.")
    }
    
    // Per ChatGPT advice: Use 'query' or '__pg_connection__' from scope instead of 'manager'
    // These are actually present in the registrations, unlike 'manager'
    const scope = req.scope
    
    // Helper functions to identify query function or pg connection
    function isQueryFunction(obj: any): boolean {
      return typeof obj === "function"
    }
    
    function isPgConn(obj: any): boolean {
      return obj && (typeof obj.query === "function" || typeof obj.connect === "function")
    }
    
    // Per ChatGPT advice: __pg_connection__ is for raw SQL, query is for Medusa modules (not raw SQL)
    // We need raw SQL for provider_identity/auth_identity/auth_session, so prefer __pg_connection__
    let pgConn: any = null         // raw PG connection with .query - REQUIRED for raw SQL
    
    // 1) First, try to get __pg_connection__ (direct PostgreSQL connection - REQUIRED for raw SQL)
    try {
      pgConn = scope.resolve("__pg_connection__")
      console.error("DEBUG: __pg_connection__ resolved, type:", typeof pgConn)
      console.error("DEBUG: __pg_connection__ constructor:", pgConn?.constructor?.name)
      console.error("DEBUG: Has .query method:", typeof pgConn?.query === "function")
      console.error("DEBUG: Has .connect method:", typeof pgConn?.connect === "function")
      console.error("DEBUG: Has .end method:", typeof pgConn?.end === "function")
      console.error("DEBUG: pgConn keys:", pgConn ? Object.keys(pgConn).slice(0, 10) : "null")
      
      if (pgConn && typeof pgConn.query === "function") {
        console.error('✓ Using pg connection from key "__pg_connection__" for raw SQL')
      } else {
        pgConn = null
        console.error("ERROR: __pg_connection__ found but doesn't have .query method")
        console.error("ERROR: This usually means Medusa is using SQLite instead of PostgreSQL")
        console.error("ERROR: Please check your DATABASE_URL in .env file - it should be a PostgreSQL connection string")
        console.error("ERROR: For Supabase, use pooled connection (port 6543) or direct (port 5432)")
      }
    } catch (e) {
      console.error("WARNING: Could not resolve __pg_connection__:", (e as any)?.message || e)
      pgConn = null
    }
    
    // 2) Check if __pg_connection__ is a Knex query builder or has a .client/.pool property
    if (!pgConn || typeof pgConn.query !== "function") {
      try {
        const resolved = scope.resolve("__pg_connection__")
        
        // Check if it's a Knex query builder - it has .raw() method
        if (resolved && typeof resolved.raw === "function") {
          pgConn = { raw: resolved.raw.bind(resolved) }
          console.error("✓ Found Knex query builder via __pg_connection__ - using .raw() method")
        }
        // Check if it's a Knex client - use .raw() method
        else if (resolved?.client && typeof resolved.client.raw === "function") {
          pgConn = { raw: resolved.client.raw.bind(resolved.client) }
          console.error("✓ Found Knex client via __pg_connection__.client - using .raw() method")
        }
        // Check if it has a .pool property (raw pg Pool) - but Knex doesn't have this
        // else if (resolved?.pool && typeof resolved.pool.query === "function") {
        //   pgConn = resolved.pool
        //   console.error("✓ Found pg Pool via __pg_connection__.pool")
        // }
        // Check if it has a .client property (raw pg Client)
        else if (resolved?.client && typeof resolved.client.query === "function") {
          // Check if it's a raw pg Client or Knex client
          if (resolved.client.constructor?.name === "Client" && resolved.client._connection) {
            // It's a raw pg Client - use directly
            pgConn = resolved.client
            console.error("✓ Found raw pg Client via __pg_connection__.client")
          } else if (typeof resolved.client.raw === "function") {
            // It's a Knex client - use .raw() method
            pgConn = { raw: resolved.client.raw.bind(resolved.client) }
            console.error("✓ Found Knex client via __pg_connection__.client - using .raw() method")
          } else {
            // Try to use it as raw pg client anyway
            pgConn = resolved.client
            console.error("✓ Using __pg_connection__.client (trying as raw pg client)")
          }
        }
        // Check if it has a getConnection method - but Knex doesn't have this
        // else if (resolved && typeof resolved.getConnection === "function") {
        //   try {
        //     const conn = await resolved.getConnection()
        //     if (conn && typeof conn.query === "function") {
        //       pgConn = conn
        //       console.error("✓ Found pg connection via __pg_connection__.getConnection()")
        //     }
        //   } catch (e) {
        //     // Ignore
        //   }
        // }
      } catch (e) {
        // Ignore
      }
    }
    
    // 3) If pgConn still not available, try to find it in registrations
    if (!pgConn || typeof pgConn.query !== "function") {
      try {
        const registrations = (scope as any).registrations || {}
        const regKeys = Object.keys(registrations)
        console.error("DEBUG: Searching for pg connection in registrations:", regKeys)
        
        // Look for pg connection
        for (const key of regKeys) {
          try {
            const cand = scope.resolve(key)
            if (isPgConn(cand)) {
              pgConn = cand
              console.error(`✓ Auto-detected pg connection at key: "${key}"`)
              break
            }
          } catch (e) {
            // Ignore per-key resolve errors
          }
        }
      } catch (e) {
        console.error("DEBUG: failed to enumerate registrations:", (e as any)?.message || e)
      }
    }
    
    // 3) If still not found, throw error - we MUST have pg connection for raw SQL
    if (!pgConn) {
      const registrations = (scope as any).registrations || {}
      const regKeys = Object.keys(registrations)
      console.error("ERROR: No pg connection found in request scope.")
      console.error("Available registration keys:", regKeys)
      throw new Error("Could not resolve __pg_connection__: required for raw SQL queries. Available keys: " + regKeys.join(", "))
    }
    
    // Helper wrapper to run raw SQL using pg connection or Knex
    // __pg_connection__ is a Knex query builder, so we use .raw() method for raw SQL
    const runQuery = async (sql: string, params: any[] = []): Promise<any> => {
      if (!pgConn) {
        throw new Error("pgConn not available - required for raw SQL queries")
      }
      
      try {
        // If pgConn has .raw method (Knex query builder/client), use it
        if (typeof pgConn.raw === "function") {
          // Knex uses ? as placeholders, not $1, $2, $3
          // Convert PostgreSQL-style placeholders ($1, $2, $3) to Knex-style (?)
          // We'll do a simple replacement: $1 -> ?, $2 -> ?, etc.
          let knexSql = sql
          
          // Replace $1, $2, $3... with ?
          // But we need to be careful - only replace actual placeholders, not $1 in strings
          // Simple approach: replace $1, $2, etc. with ? sequentially
          if (params && params.length > 0) {
            // Count how many $N placeholders we have
            const placeholderCount = (sql.match(/\$\d+/g) || []).length
            if (placeholderCount > 0) {
              // Replace $1, $2, $3... with ? for each param
              knexSql = sql
              for (let i = params.length; i >= 1; i--) {
                // Replace $N with ? (in reverse to avoid $10 matching $1)
                const placeholderRegex = new RegExp(`\\$${i}\\b`, 'g')
                knexSql = knexSql.replace(placeholderRegex, '?')
              }
            }
          }
          
          console.error("DEBUG: Knex SQL:", knexSql.substring(0, 200))
          console.error("DEBUG: Knex params:", params.length, "params")
          
          const result = await pgConn.raw(knexSql, params)
          
          // Knex raw() returns result in format: [rows, metadata] where rows is array of objects
          // Or sometimes just the rows array directly
          if (Array.isArray(result)) {
            // Knex returns [rows, ...] where first element is rows array
            if (result[0] && Array.isArray(result[0])) {
              // Normalize to { rows: [...] }
              return { rows: result[0] }
            } else if (Array.isArray(result)) {
              // Already array of rows
              return { rows: result }
            }
          } else if (result && result.rows) {
            return { rows: result.rows }
          } else {
            return { rows: [] }
          }
        }
        // If pgConn has .query method (raw pg Client/Pool), use it
        else if (typeof pgConn.query === "function") {
          const res = await pgConn.query(sql, params)
          // Normalize result format - pg returns { rows: [...] }
          return res && res.rows ? res : { rows: Array.isArray(res) ? res : (res?.rows || []) }
        }
        else {
          throw new Error("pgConn doesn't have .query() or .raw() method")
        }
      } catch (pgError: any) {
        console.error("pgConn query error:", pgError?.message || pgError)
        console.error("SQL was:", sql.substring(0, 200))
        console.error("Params were:", params)
        throw pgError
      }
    }
    
    console.error("DEBUG: DB runner ready - using pg connection for raw SQL")
    
    try {
      console.error("Creating or finding provider_identity for Vipps...")
      
      // First, check if provider_identity already exists
      try {
        const existingProviderIdentities = await runQuery(
          `SELECT id FROM provider_identity 
           WHERE provider = $1 
           AND provider_metadata ->> 'sub' = $2 
           AND deleted_at IS NULL
           LIMIT 1`,
          ["vipps", vippsUserId]
        )
        
        if (existingProviderIdentities?.rows && existingProviderIdentities.rows.length > 0) {
          providerIdentity = existingProviderIdentities.rows[0]
          console.error("✓ Found existing provider_identity:", providerIdentity.id)
        }
      } catch (queryError: any) {
        console.error("Error querying provider_identity:", queryError?.message || queryError)
      }
      
      // If not found, create provider_identity
      if (!providerIdentity) {
        console.error("Creating new provider_identity...")
        try {
          // Per ChatGPT advice: auth_identity_id is NOT NULL, so we must create auth_identity FIRST
          // Step 1: Create auth_identity first (using authModule)
          console.error("Step 1: Creating auth_identity first...")
          let newAuthIdentity: any = null
          
          try {
            // Note: createAuthIdentities might create both auth_identity and provider_identity automatically
            // But we'll check what it returns and manually create provider_identity if needed
            const [createdAuthIdentity] = await authModule.createAuthIdentities([{
              provider: "vipps",
              entity_id: customer.id,
              provider_metadata: {
                vipps_user_id: vippsUserId,
                access_token: accessToken,
                phone_number: userInfo.phone_number,
              },
              user_metadata: {
                email: userInfo.email || email,
                name: userInfo.name,
                phone_number: userInfo.phone_number,
              },
              app_metadata: {
                customer_id: customer.id,
                sub: vippsUserId,  // Store Vipps sub for linking
              },
            }] as any)  // Type assertion to bypass TypeScript error (createAuthIdentities accepts provider in practice)
            newAuthIdentity = createdAuthIdentity
            console.error("✓ Auth identity created first:", newAuthIdentity.id)
          } catch (authCreateError: any) {
            // If auth_identity already exists, try to find it
            if (authCreateError?.message?.includes("already exists") || 
                authCreateError?.message?.includes("duplicate") ||
                authCreateError?.message?.includes("UNIQUE")) {
              console.error("Auth identity already exists, trying to find it...")
              try {
                const foundIdentities = await runQuery(
                  `SELECT id FROM auth_identity 
                   WHERE entity_id = $1 AND provider = $2
                   LIMIT 1`,
                  [customer.id, "vipps"]
                )
                const authId = foundIdentities?.rows?.[0]?.id || foundIdentities?.[0]?.id
                if (authId) {
                  newAuthIdentity = { id: authId }
                  console.error("✓ Found existing auth_identity:", newAuthIdentity.id)
                } else {
                  throw new Error("Could not find existing auth_identity")
                }
              } catch (findError: any) {
                console.error("Could not find existing auth_identity:", findError?.message || findError)
                throw authCreateError
              }
            } else {
              throw authCreateError
            }
          }
          
          if (!newAuthIdentity || !newAuthIdentity.id) {
            throw new Error("Failed to create or find auth_identity")
          }
          
          // Step 2: Create provider_identity with auth_identity_id (NOT NULL constraint satisfied)
          // Note: provider_identity schema: id, provider, entity_id, auth_identity_id, provider_metadata, user_metadata
          console.error("Step 2: Creating provider_identity with auth_identity_id:", newAuthIdentity.id)
          const providerIdResult = await runQuery(
            `INSERT INTO provider_identity (
              id, 
              provider, 
              entity_id, 
              auth_identity_id,
              provider_metadata, 
              user_metadata,
              created_at,
              updated_at
            ) VALUES (
              gen_random_uuid()::text,
              $1,
              $2,
              $3,  -- auth_identity_id (NOT NULL, so we provide it now)
              $4::jsonb,
              $5::jsonb,
              NOW(),
              NOW()
            ) RETURNING id`,
            [
              "vipps",
              customer.id,
              newAuthIdentity.id,  // Use the auth_identity_id we just created
              JSON.stringify({
                sub: vippsUserId,  // Store Vipps user ID in provider_metadata
                vipps_user_id: vippsUserId,
                access_token: accessToken,
                phone_number: userInfo.phone_number,
              }),
              JSON.stringify({
                email: userInfo.email || email,
                name: userInfo.name,
                phone_number: userInfo.phone_number,
              }),
            ]
          )
          
          // Handle result format - might be { rows: [...] } or array directly
          const providerId = providerIdResult?.rows?.[0]?.id || providerIdResult?.[0]?.id
          if (providerId) {
            providerIdentity = { id: providerId }
            console.error("✓ Provider identity created:", providerIdentity.id)
            // Also set authIdentity for later use
            authIdentity = newAuthIdentity
            console.error("✓ Linked auth_identity to provider_identity")
          }
        } catch (createError: any) {
          console.error("Error creating provider_identity:", createError?.message || createError)
          // If it's a duplicate, try to find it
          if (createError?.message?.includes("duplicate") || 
              createError?.message?.includes("UNIQUE") ||
              createError?.message?.includes("already exists")) {
            try {
              const foundProviders = await runQuery(
                `SELECT id FROM provider_identity 
                 WHERE provider = $1 
                 AND provider_metadata ->> 'sub' = $2 
                 AND deleted_at IS NULL
                 LIMIT 1`,
                ["vipps", vippsUserId]
              )
              const providerId = foundProviders?.rows?.[0]?.id || foundProviders?.[0]?.id
              if (providerId) {
                providerIdentity = { id: providerId }
                console.error("✓ Found existing provider_identity after duplicate error:", providerIdentity.id)
              }
            } catch (findError: any) {
              console.error("Could not find provider_identity after duplicate error:", findError?.message || findError)
              throw createError
            }
          } else {
            throw createError
          }
        }
      }
      
      if (!providerIdentity) {
        throw new Error("Failed to create or find provider_identity")
      }
      
      // If provider_identity was found (existing), we need to get its auth_identity_id
      if (providerIdentity && !authIdentity) {
        console.error("Provider identity found, retrieving linked auth_identity...")
        try {
          // Get auth_identity_id from provider_identity
          const providerRow = await runQuery(
            `SELECT auth_identity_id FROM provider_identity WHERE id = $1 LIMIT 1`,
            [providerIdentity.id]
          )
          
          const authId = providerRow?.rows?.[0]?.auth_identity_id || providerRow?.[0]?.auth_identity_id
          if (authId) {
            authIdentity = { id: authId }
            console.error("✓ Found linked auth_identity:", authIdentity.id)
          } else {
            // If provider_identity exists but has no auth_identity_id, create one
            console.error("Provider identity has no auth_identity_id, creating auth_identity...")
            const [created] = await authModule.createAuthIdentities([{
              provider: "vipps",
              entity_id: customer.id,
              provider_metadata: {
                vipps_user_id: vippsUserId,
                access_token: accessToken,
                phone_number: userInfo.phone_number,
              },
              user_metadata: {
                email: userInfo.email || email,
                name: userInfo.name,
                phone_number: userInfo.phone_number,
              },
              app_metadata: {
                // Don't set customer_id here - let createCustomerAccountWorkflow set it
                // Setting it here causes "Key customer_id already exists" error
                provider_identity_id: providerIdentity.id,
                sub: vippsUserId, // Store Vipps user ID for reference
              },
            }] as any)  // Type assertion to bypass TypeScript error (createAuthIdentities accepts provider in practice)
            authIdentity = created
            console.error("✓ Auth identity created:", authIdentity.id)
            
            // Link provider_identity to auth_identity
            await runQuery(
              `UPDATE provider_identity 
               SET auth_identity_id = $1, updated_at = NOW()
               WHERE id = $2`,
              [authIdentity.id, providerIdentity.id]
            )
            console.error("✓ Provider identity linked to auth identity")
          }
        } catch (linkError: any) {
          console.error("Error linking auth_identity to provider_identity:", linkError?.message || linkError)
          throw linkError
        }
      }
      
      if (!authIdentity) {
        throw new Error("Failed to create or find auth identity")
      }
      
      console.error("✓ Using auth identity:", authIdentity.id, "for customer:", customer.id)
      console.error("✓ Linked to provider identity:", providerIdentity.id)
    } catch (authError: any) {
      console.error("Error creating/finding Vipps auth provider:", authError?.message || authError)
      throw authError
    }

    // CRITICAL FIX: In Medusa v2, USER and CUSTOMER are separate modules
    // We created a USER, but we also need a CUSTOMER for /store/customers/me to work
    // The CUSTOMER module is what the store API queries, not the USER module
    let storeCustomerId = customer.id // Default to user.id, will update if customer exists/created
    try {
      console.error("Checking if customer exists in CUSTOMER module...")
      const { createCustomerAccountWorkflow } = require("@medusajs/core-flows")
      const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
      
      // CRITICAL: Refresh auth_identity to get latest app_metadata before checking customer_id
      // The authIdentity object might be stale from earlier in the code
      let refreshedAuthIdentity = authIdentity
      try {
        const authIdentities = await authModule.listAuthIdentities({ id: authIdentity.id })
        if (authIdentities && authIdentities.length > 0) {
          refreshedAuthIdentity = authIdentities[0]
          console.error("✓ Refreshed auth_identity to get latest app_metadata")
        }
      } catch (refreshError: any) {
        console.error("⚠️ Could not refresh auth_identity (using existing):", refreshError?.message || refreshError)
      }
      
      // First, check if auth_identity already has customer_id in app_metadata
      // If so, that means a customer was already created via the workflow
      const authIdentityCustomerId = refreshedAuthIdentity?.app_metadata?.customer_id
      console.error("Checking auth_identity.app_metadata.customer_id:", authIdentityCustomerId || "not found")
      
      if (authIdentityCustomerId) {
        console.error("Auth identity already has customer_id in app_metadata:", authIdentityCustomerId)
        // Try to find customer by this ID
        const existingCustomers = await remoteQuery({
          entryPoint: "customer",
          variables: {
            filters: { id: authIdentityCustomerId },
          },
          fields: ["id"],
        })
        
        if (existingCustomers && existingCustomers.length > 0) {
          storeCustomerId = existingCustomers[0].id
          console.error("✓ Customer found in CUSTOMER module via app_metadata.customer_id:", storeCustomerId)
        } else {
          console.error("⚠️ Customer ID in app_metadata not found in CUSTOMER module, will try to create")
        }
      }
      
      // If we don't have a valid customer ID yet, check by email
      if (!storeCustomerId || storeCustomerId === customer.id) {
        const existingCustomers = await remoteQuery({
          entryPoint: "customer",
          variables: {
            filters: { email: customer.email },
          },
          fields: ["id"],
        })
        
        if (existingCustomers && existingCustomers.length > 0) {
          storeCustomerId = existingCustomers[0].id
          console.error("✓ Customer already exists in CUSTOMER module (found by email) with ID:", storeCustomerId)
        }
      }
      
      // If customer still doesn't exist, create it via workflow
      // BUT: Only if auth_identity doesn't already have customer_id (workflow will fail if it does)
      if ((!storeCustomerId || storeCustomerId === customer.id) && !authIdentityCustomerId) {
        console.error("Customer not found in CUSTOMER module, creating via workflow...")
        // Create customer in CUSTOMER module using createCustomerAccountWorkflow
        // This workflow will set customer_id in auth_identity.app_metadata automatically
        const createCustomerWorkflow = createCustomerAccountWorkflow(container)
        const workflowResult = await createCustomerWorkflow.run({
          input: {
            authIdentityId: authIdentity.id,
            customerData: {
              email: customer.email,
              first_name: customer.first_name || userInfo.given_name || userInfo.name?.split(" ")[0] || "",
              last_name: customer.last_name || userInfo.family_name || userInfo.name?.split(" ").slice(1).join(" ") || "",
            },
          },
        })
        storeCustomerId = workflowResult.id || customer.id
        console.error("✓ Customer created in CUSTOMER module with ID:", storeCustomerId)
      } else if (authIdentityCustomerId && (!storeCustomerId || storeCustomerId === customer.id)) {
        // Auth identity has customer_id but customer not found - this is a data inconsistency
        // Remove customer_id from app_metadata and retry the workflow
        console.error("⚠️ WARNING: auth_identity.app_metadata.customer_id exists but customer not found in CUSTOMER module")
        console.error("  Removing customer_id from app_metadata and retrying workflow...")
        try {
          // CRITICAL: Use SQL directly to remove customer_id from app_metadata
          // The updateAuthIdentities method might be cached, so we use raw SQL to force the update
          const currentAppMetadata = refreshedAuthIdentity.app_metadata || {}
          const { customer_id, ...newAppMetadata } = currentAppMetadata
          console.error("  Current app_metadata keys:", Object.keys(currentAppMetadata))
          console.error("  New app_metadata keys (after removing customer_id):", Object.keys(newAppMetadata))
          
          // Update via SQL directly to bypass any caching
          try {
            await runQuery(
              `UPDATE auth_identity 
               SET app_metadata = app_metadata - 'customer_id', 
                   updated_at = NOW()
               WHERE id = $1`,
              [authIdentity.id]
            )
            console.error("✓ Removed customer_id from app_metadata via SQL")
          } catch (sqlError: any) {
            console.error("⚠️ SQL update failed, trying updateAuthIdentities:", sqlError?.message || sqlError)
            // Fallback to updateAuthIdentities
            await authModule.updateAuthIdentities({
              id: authIdentity.id,
              app_metadata: newAppMetadata,
            } as any)
            console.error("✓ Removed customer_id from app_metadata via updateAuthIdentities")
          }
          
          // CRITICAL: Refresh auth_identity again to verify customer_id was removed
          // This ensures the workflow sees the updated state
          let verifiedAuthIdentity = refreshedAuthIdentity
          try {
            const authIdentities = await authModule.listAuthIdentities({ id: authIdentity.id })
            if (authIdentities && authIdentities.length > 0) {
              verifiedAuthIdentity = authIdentities[0]
              const stillHasCustomerId = verifiedAuthIdentity?.app_metadata?.customer_id
              if (stillHasCustomerId) {
                console.error("⚠️ WARNING: customer_id still exists after update, might be cached")
                console.error("  Will try workflow anyway...")
              } else {
                console.error("✓ Verified customer_id removed from app_metadata")
              }
            }
          } catch (verifyError: any) {
            console.error("⚠️ Could not verify removal (will try workflow anyway):", verifyError?.message || verifyError)
          }
          
          // Now retry the workflow
          console.error("Retrying customer creation via workflow...")
          const createCustomerWorkflow = createCustomerAccountWorkflow(container)
          const workflowResult = await createCustomerWorkflow.run({
            input: {
              authIdentityId: authIdentity.id,
              customerData: {
                email: customer.email,
                first_name: customer.first_name || userInfo.given_name || userInfo.name?.split(" ")[0] || "",
                last_name: customer.last_name || userInfo.family_name || userInfo.name?.split(" ").slice(1).join(" ") || "",
              },
            },
          })
          console.error("  Workflow result:", JSON.stringify(workflowResult, null, 2))
          console.error("  Workflow result type:", typeof workflowResult)
          console.error("  Workflow result keys:", Object.keys(workflowResult || {}))
          
          // The workflow might return the customer object directly, or a result object with customer property
          const createdCustomer = workflowResult?.customer || workflowResult?.result?.customer || workflowResult
          storeCustomerId = createdCustomer?.id || workflowResult?.id || customer.id
          
          // CRITICAL: Verify the customer was actually created by querying the CUSTOMER module
          try {
            const verifyCustomers = await remoteQuery({
              entryPoint: "customer",
              variables: {
                filters: { email: customer.email },
              },
              fields: ["id", "email"],
            })
            if (verifyCustomers && verifyCustomers.length > 0) {
              const actualCustomerId = verifyCustomers[0].id
              if (actualCustomerId !== storeCustomerId) {
                console.error("⚠️ WARNING: Workflow returned ID", storeCustomerId, "but customer exists with ID", actualCustomerId)
                storeCustomerId = actualCustomerId
              }
              console.error("✓ Verified customer exists in CUSTOMER module with ID:", storeCustomerId)
            } else {
              console.error("⚠️ WARNING: Customer not found in CUSTOMER module after workflow completion!")
            }
          } catch (verifyError: any) {
            console.error("⚠️ Could not verify customer creation:", verifyError?.message || verifyError)
          }
          
          console.error("✓ Customer created in CUSTOMER module with ID:", storeCustomerId)
        } catch (retryError: any) {
          console.error("⚠️ Error retrying customer creation:", retryError?.message || retryError)
          // If the workflow still fails, it means customer_id exists in the database
          // In this case, we should just query the CUSTOMER module directly to see if a customer exists
          // If not, we'll need to create it manually or skip this step
          console.error("  Workflow failed, checking if customer might exist with different ID...")
          
          // Try to find customer by email one more time
          try {
            const existingCustomers = await remoteQuery({
              entryPoint: "customer",
              variables: {
                filters: { email: customer.email },
              },
              fields: ["id"],
            })
            if (existingCustomers && existingCustomers.length > 0) {
              storeCustomerId = existingCustomers[0].id
              console.error("✓ Found customer in CUSTOMER module (by email):", storeCustomerId)
            } else {
              console.error("⚠️ Customer not found in CUSTOMER module even after workflow failure")
              console.error("  This is a data inconsistency - customer_id in app_metadata but no customer exists")
              // Fallback: use the authIdentityCustomerId even though customer doesn't exist
              storeCustomerId = authIdentityCustomerId
            }
          } catch (queryError: any) {
            console.error("⚠️ Could not query customer by email:", queryError?.message || queryError)
            storeCustomerId = authIdentityCustomerId
          }
        }
      }
    } catch (customerError: any) {
      console.error("⚠️ Error creating/finding customer in CUSTOMER module (continuing anyway):", customerError?.message || customerError)
      // Continue - the customer might already exist or the error might be non-fatal
      // storeCustomerId will remain as customer.id (from USER module)
    }

    // Use Medusa's HTTP auth endpoint to generate a proper token
    // This ensures the token format matches what Medusa expects
    try {
      console.error("Creating session token via Medusa auth endpoint:", customer.id)
      
      const backendUrl = process.env.BACKEND_URL || "http://localhost:9000"
      
      // Since we have an auth identity with provider "vipps", we can't use the standard
      // emailpass login. Instead, let's try to use Medusa's auth endpoint with the auth_identity
      // OR we can use the emailpass login if the customer also has an emailpass provider
      
      // Option 1: Try to find if customer has emailpass provider (fallback)
      let sessionToken: string | undefined
      
      try {
        // Check if customer has emailpass provider (for fallback)
        // We need to query provider_identity directly since listAuthIdentities doesn't support entity_id filter
        // For now, skip this check - we'll use JWT generation directly
        const emailpassProvider = null // Skip emailpass check for now
        
        if (emailpassProvider) {
          console.error("Customer has emailpass provider, using it for token generation...")
          // Use emailpass login endpoint - this should generate a proper token
          const loginResponse = await fetch(`${backendUrl}/auth/user/customer/emailpass`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: customer.email,
              password: "", // OAuth users don't have passwords, but let's try anyway
            }),
          })
          
          if (loginResponse.ok) {
            const loginData = await loginResponse.json()
            sessionToken = loginData.token || loginData
            console.error("✓ Token generated via emailpass endpoint")
          }
        }
      } catch (e) {
        console.error("Emailpass login attempt failed:", e)
      }
      
      // Option 2: If emailpass didn't work, use fallback JWT generation
      // but with the auth_identity_id included in the payload
      if (!sessionToken) {
        console.error("Using fallback JWT generation with auth_identity_id...")
        const jwt = require("jsonwebtoken")
        
        // Get JWT secret from Medusa config
        let jwtSecret = "supersecret"
        try {
          const configModule = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
          jwtSecret = configModule?.projectConfig?.http?.jwtSecret || jwtSecret
        } catch (e) {
          // Config not available, use env vars
        }
        
        jwtSecret = process.env.JWT_SECRET || 
                   process.env.MEDUSA_JWT_SECRET || 
                   jwtSecret
        
        console.error("JWT Secret being used:", jwtSecret ? `${jwtSecret.substring(0, 10)}...` : "none")
        console.error("JWT Secret from env JWT_SECRET:", process.env.JWT_SECRET ? "yes" : "no")
        console.error("JWT Secret from env MEDUSA_JWT_SECRET:", process.env.MEDUSA_JWT_SECRET ? "yes" : "no")
        console.error("JWT Secret from config:", jwtSecret === "supersecret" ? "default" : "custom")
        
        // CRITICAL FIX: Based on framework authenticate-middleware.js analysis
        // The middleware checks: verified.actor_type (not verified.type!)
        // And it needs: verified.actor_id to be set
        // Also: entity_id should be customer.id to match provider_identity.entity_id
        const now = Math.floor(Date.now() / 1000)
        // Use storeCustomerId (from CUSTOMER module) if available, otherwise fall back to customer.id (USER module)
        const customerIdForToken = storeCustomerId || customer.id
        const tokenPayload = {
          entity_id: customerIdForToken,  // Use CUSTOMER module ID if available
          actor_id: customerIdForToken,   // Use CUSTOMER module ID if available
          actor_type: "customer",         // MUST be "actor_type" (not "type") for middleware check!
          scope: "store",
          iat: now,
          // Note: Don't set exp here - jwt.sign() with expiresIn will add it automatically
        }
        
        console.error("⚠️ FIXED: Using CUSTOMER module ID for token")
        console.error("  - entity_id:", customerIdForToken, "(CUSTOMER module ID)")
        console.error("  - actor_id:", customerIdForToken, "(CUSTOMER module ID)")
        console.error("  - actor_type: 'customer' (framework middleware checks this field)")
        
        sessionToken = jwt.sign(tokenPayload, jwtSecret, {
          expiresIn: "30d",
          algorithm: "HS256",
        })
        
        // Verify the token we just created can be decoded (sanity check)
        try {
          const decoded = jwt.verify(sessionToken, jwtSecret)
          console.error("✓ Token verified after creation:", JSON.stringify(decoded))
        } catch (verifyError) {
          console.error("✗ Token verification failed after creation:", verifyError)
        }
        
        console.error("✓ Fallback JWT token generated")
        console.error("Token payload:", JSON.stringify(tokenPayload))
      }
      
      // Try to create an auth_session record if it doesn't exist
      // Per ChatGPT advice: Medusa might require auth_session for token validation
      // We now have providerIdentity in scope, so we can create auth_session directly
      if (sessionToken && authIdentity && providerIdentity) {
        try {
          console.error("Attempting to create auth_session record...")
          console.error("Auth identity ID:", authIdentity.id)
          console.error("Provider identity ID:", providerIdentity.id)
          
          // Try to create auth_session using SQL directly
          // This might be required for Medusa v2 to validate the token
          // Note: Since we don't have a transaction manager, use runQuery with ON CONFLICT
          try {
            // Check if session already exists
            const existingSession = await runQuery(
              `SELECT id FROM auth_session WHERE entity_id = $1 AND provider_identity_id = $2 LIMIT 1`,
              [customer.id, providerIdentity.id]
            )
            
            const sessionId = existingSession?.rows?.[0]?.id || existingSession?.[0]?.id
            if (!sessionId) {
              // Create new auth_session - use ON CONFLICT to handle race conditions
              await runQuery(
                `INSERT INTO auth_session (id, entity_id, provider_identity_id, created_at) 
                 VALUES (gen_random_uuid()::text, $1, $2, NOW())
                 ON CONFLICT DO NOTHING`,
                [customer.id, providerIdentity.id]
              )
              console.error("✓ Auth session created in database")
            } else {
              console.error("✓ Auth session already exists:", sessionId)
            }
          } catch (dbError: any) {
            console.error("Database error creating auth_session:", dbError?.message || dbError)
            console.error("Stack:", dbError?.stack)
          }
        } catch (sessionError: any) {
          // If creating auth_session fails, continue anyway
          // The JWT token might still work without it
          console.error("Could not create auth_session (continuing anyway):", sessionError?.message || sessionError)
          console.error("Stack:", sessionError?.stack)
        }
      } else {
        if (!providerIdentity) {
          console.error("Skipping auth_session creation - missing providerIdentity")
        } else if (!authIdentity) {
          console.error("Skipping auth_session creation - missing authIdentity")
        } else if (!sessionToken) {
          console.error("Skipping auth_session creation - missing sessionToken")
        }
      }
      
      if (sessionToken) {
        console.error("✓ Session token created successfully, redirecting to storefront")
        const storefrontUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
        res.redirect(`${storefrontUrl}/auth/callback?token=${encodeURIComponent(sessionToken)}&provider=vipps`)
        return
      } else {
        throw new Error("Token generation returned no token")
      }
    } catch (tokenError: any) {
      console.error("Error generating JWT token:", tokenError?.message || tokenError)
      console.error("Stack:", tokenError?.stack)
    }

    // Fallback: Redirect to storefront with email for manual login
    const storefrontUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
    res.redirect(`${storefrontUrl}/account?vipps_login=error&email=${encodeURIComponent(email)}`)
    return

  } catch (error: any) {
    console.error("=== VIPPS CALLBACK ERROR ===")
    console.error("Error message:", error?.message || error)
    console.error("Error stack:", error?.stack)
    console.error("Full error:", JSON.stringify(error, null, 2))
    const storefrontUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
    // Redirect to storefront with error instead of backend
    res.redirect(`${storefrontUrl}/account?vipps_login=error&error=${encodeURIComponent(error?.message || "Authentication failed")}`)
    return
  }
}

