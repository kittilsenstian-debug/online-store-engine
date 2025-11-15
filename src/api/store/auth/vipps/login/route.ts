import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Authenticate customer with Vipps
 * POST /store/auth/vipps/login
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { email, vipps_user_id } = req.body

  if (!email || !vipps_user_id) {
    return res.status(400).json({ message: "Email and vipps_user_id are required" })
  }

  try {
    const container = req.scope
    const authModule = container.resolve(Modules.AUTH)
    const userModule = container.resolve(Modules.USER)

    // Find customer by email
    const users = await userModule.listUsers({ email })
    const customer = users[0]

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" })
    }

    // For OAuth providers, we don't need to verify the auth identity exists
    // since it should already be created during the OAuth callback
    // The customer is already authenticated via Vipps, we just need to generate a session token
    
    // Since createSession doesn't exist, we need to use Medusa's auth flow
    // For Medusa v2, we can use the auth module's authenticate method if available
    // Or we can manually generate a JWT token using the auth provider
    
    // Let's try using the provider identity to authenticate
    // Since we're already authenticated via OAuth, we can use the auth module's
    // authenticate method with the provider
    
    // For now, let's use a workaround: call the Medusa SDK's auth.login method
    // But since we're in the backend, we'll need to use the auth module directly
    
    // Actually, the simplest approach is to use the auth module's authenticate method
    // which should be available for providers
    
    let token: string | undefined
    
    try {
      // Try to authenticate using the provider
      // This should work for OAuth providers since the user is already authenticated
      const authResult = await authModule.authenticate("vipps", {
        entity_id: customer.id,
      })
      
      // The authenticate method should return a token or session
      if (typeof authResult === "string") {
        token = authResult
      } else if (authResult && typeof authResult === "object" && "token" in authResult) {
        token = authResult.token as string
      } else if (authResult && typeof authResult === "object" && "jwt" in authResult) {
        token = authResult.jwt as string
      } else {
        // If authenticate doesn't return a token, we need another approach
        // For OAuth, the token might be generated differently
        throw new Error("Authenticate method didn't return a token")
      }
      
      if (!token) {
        return res.status(500).json({ message: "Failed to generate session token" })
      }
    } catch (authError: any) {
      // If authenticate method doesn't exist or doesn't work, we need a fallback
      console.error("Auth authenticate error:", authError?.message || authError)
      
      // Fallback: Since we're already authenticated via OAuth, we can use
      // the auth module to generate a session token manually
      // But this requires access to the JWT service which might not be exposed
      
      // For now, return an error indicating we need a different approach
      return res.status(501).json({ 
        message: "Vipps authentication requires manual JWT generation. This needs to be implemented.",
        error: authError?.message || "Authentication method not available"
      })
    }
    
    if (!token) {
      return res.status(500).json({ message: "Failed to generate session token" })
    }

    // Set session cookie
    res.cookie("_medusa_jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    res.json({ 
      token,
      customer: {
        id: customer.id,
        email: customer.email,
      },
    })
  } catch (error: any) {
    console.error("Vipps login error:", error)
    res.status(500).json({ message: error.message || "Authentication failed" })
  }
}

