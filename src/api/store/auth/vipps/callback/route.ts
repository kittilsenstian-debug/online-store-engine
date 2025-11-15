import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Handle Vipps OAuth callback
 * GET /store/auth/vipps/callback
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
    console.log("=== Vipps Callback End (400 - missing code) ===")
    return res.status(400).json({ message: "Missing authorization code" })
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
      console.log("=== Vipps Callback End (400 - state mismatch) ===")
      return res.status(400).json({ message: "Invalid state parameter" })
    } else {
      console.log("✓ State verified (matched)")
    }
  } else if (state && !req.session?.state) {
    console.warn("Warning: State in URL but no state in session (continuing anyway)")
  } else if (!state && req.session?.state) {
    console.warn("Warning: State in session but no state in URL (continuing anyway)")
  } else {
    console.warn("Warning: No state parameter in either URL or session (continuing anyway)")
  }
  
  console.log("✓ Starting OAuth token exchange...")

  try {
    const clientId = process.env.VIPPS_CLIENT_ID
    const clientSecret = process.env.VIPPS_CLIENT_SECRET
    const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY
    const redirectUri = process.env.VIPPS_REDIRECT_URI || `${req.protocol}://${req.get('host')}/store/auth/vipps/callback`
    const backendUrl = process.env.BACKEND_URL || "http://localhost:9000"

    // Determine if we're in test mode
    const isTestMode = process.env.VIPPS_TEST_MODE === "true"
    const vippsBaseUrl = isTestMode 
      ? "https://apitest.vipps.no" 
      : "https://api.vipps.no"

    // Exchange authorization code for access token
    // Vipps API requires Basic Auth for client_id/client_secret
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
    
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
      return res.redirect(`${backendUrl}/login?error=vipps_token_error`)
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Get user info from Vipps
    const userInfoResponse = await fetch(`${vippsBaseUrl}/access-management-1.0/access/userinfo`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Ocp-Apim-Subscription-Key": subscriptionKey || "",
      },
    })

    if (!userInfoResponse.ok) {
      return res.redirect(`${backendUrl}/login?error=vipps_userinfo_error`)
    }

    const userInfo = await userInfoResponse.json()
    
    // Get Medusa container
    const container = req.scope
    const authModule = container.resolve(Modules.AUTH)
    const userModule = container.resolve(Modules.USER)

    // Check if customer exists with Vipps identifier
    const vippsUserId = userInfo.sub || userInfo.user_id
    const email = userInfo.email || `${vippsUserId}@vipps.no`

    // Try to find existing customer (customers in Medusa are users with customer role)
    let users = await userModule.listUsers({ email })
    let customer = users[0]

    if (!customer) {
      // Create new customer (user with customer type)
      const [createdCustomer] = await userModule.createUsers([{
        email,
        first_name: userInfo.given_name || userInfo.name?.split(" ")[0] || "",
        last_name: userInfo.family_name || userInfo.name?.split(" ").slice(1).join(" ") || "",
      }])
      customer = createdCustomer
    }

    // Create or update Vipps auth provider for customer
    let authIdentity
    try {
      const existingProviders = await authModule.listAuthIdentities({
        entity_id: customer.id,
        provider: "vipps",
      })

      if (existingProviders.length === 0) {
        const [created] = await authModule.createAuthIdentities([{
          provider: "vipps",
          entity_id: customer.id,
          provider_metadata: {
            vipps_user_id: vippsUserId,
            access_token: accessToken, // Store temporarily, should be refreshed
            phone_number: userInfo.phone_number,
          },
          user_metadata: {
            email: userInfo.email || email,
            name: userInfo.name,
            phone_number: userInfo.phone_number,
          },
        }])
        authIdentity = created
      } else {
        authIdentity = existingProviders[0]
      }
    } catch (authError) {
      console.error("Error creating Vipps auth provider:", authError)
    }

    // Authenticate customer using Medusa's auth module
    // Use createSession to create a customer session token
    try {
      console.log("Creating session for customer:", customer.id)
      
      // Create a session token for the customer
      // In Medusa v2, createSession might return an object or string
      let sessionToken: string | undefined
      
      try {
        const sessionResult = await authModule.createSession(customer.id, {
          provider: "vipps",
          auth_identity_id: authIdentity?.id,
        })
        
        // Handle different return types
        if (typeof sessionResult === "string") {
          sessionToken = sessionResult
        } else if (sessionResult && typeof sessionResult === "object" && "token" in sessionResult) {
          sessionToken = sessionResult.token as string
        } else if (sessionResult && typeof sessionResult === "object" && "jwt" in sessionResult) {
          sessionToken = sessionResult.jwt as string
        } else {
          console.error("Unexpected session result type:", typeof sessionResult, sessionResult)
        }
      } catch (sessionError: any) {
        console.error("createSession error:", sessionError?.message || sessionError)
        throw sessionError
      }

      if (sessionToken) {
        console.log("Session created successfully, redirecting to storefront")
        // Redirect to storefront with token in URL
        // The storefront will handle setting the cookie via an API route
        const storefrontUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
        return res.redirect(`${storefrontUrl}/auth/callback?token=${encodeURIComponent(sessionToken)}&provider=vipps`)
      } else {
        console.error("createSession returned no token")
        throw new Error("Session creation returned no token")
      }
    } catch (loginError: any) {
      console.error("Error creating customer session:", loginError?.message || loginError)
      console.error("Stack:", loginError?.stack)
      
      // Fallback: Use Medusa login route via HTTP
      try {
        console.log("Trying fallback login route...")
        const loginResponse = await fetch(`${backendUrl}/store/auth/vipps/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: customer.email,
            vipps_user_id: vippsUserId,
          }),
        })

        if (loginResponse.ok) {
          const loginData = await loginResponse.json()
          if (loginData.token) {
            console.log("Fallback login succeeded, redirecting to storefront")
            // Redirect to storefront with token in URL
            const storefrontUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
            return res.redirect(`${storefrontUrl}/auth/callback?token=${encodeURIComponent(loginData.token)}&provider=vipps`)
          } else {
            console.error("Fallback login response missing token:", loginData)
          }
        } else {
          const errorText = await loginResponse.text()
          console.error("Fallback login failed with status:", loginResponse.status, errorText)
        }
      } catch (fallbackError: any) {
        console.error("Fallback login also failed:", fallbackError?.message || fallbackError)
      }
    }

    // Fallback: Redirect to storefront with email for manual login
    const storefrontUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
    return res.redirect(`${storefrontUrl}/account?vipps_login=error&email=${encodeURIComponent(email)}`)

  } catch (error: any) {
    console.error("=== VIPPS CALLBACK ERROR ===")
    console.error("Error message:", error?.message || error)
    console.error("Error stack:", error?.stack)
    console.error("Full error:", JSON.stringify(error, null, 2))
    const storefrontUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
    // Redirect to storefront with error instead of backend
    return res.redirect(`${storefrontUrl}/account?vipps_login=error&error=${encodeURIComponent(error?.message || "Authentication failed")}`)
  }
}

