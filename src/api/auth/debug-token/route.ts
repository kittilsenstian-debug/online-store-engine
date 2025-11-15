import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Debug endpoint to check token validation
 * GET /auth/debug-token?token=xxx
 * This helps us understand why Medusa is rejecting valid tokens
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const token = req.query.token as string
    
    if (!token) {
      res.status(400).json({ error: "Token required in query string" })
      return
    }
    
    // Decode token
    const jwt = require("jsonwebtoken")
    const tokenParts = token.split(".")
    if (tokenParts.length !== 3) {
      res.status(400).json({ error: "Invalid token format" })
      return
    }
    
    const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString())
    
    console.error("=== TOKEN DEBUG ===")
    console.error("Token payload:", JSON.stringify(payload, null, 2))
    
    const container = req.scope
    const authModule = container.resolve(Modules.AUTH)
    
    // Try to verify token with JWT secret
    let jwtSecret = "supersecret"
    try {
      const configModule = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
      jwtSecret = configModule?.projectConfig?.http?.jwtSecret || jwtSecret
    } catch (e) {
      // Config not available
    }
    
    jwtSecret = process.env.JWT_SECRET || 
               process.env.MEDUSA_JWT_SECRET || 
               jwtSecret
    
    let verified = false
    try {
      const decoded = jwt.verify(token, jwtSecret)
      verified = true
      console.error("✓ JWT verification passed")
      console.error("Decoded token:", JSON.stringify(decoded, null, 2))
    } catch (e: any) {
      console.error("✗ JWT verification failed:", e?.message || e)
    }
    
    // Check if auth_identity exists
    let authIdentityExists = false
    let authIdentityDetails: any = null
    try {
      const authIdentities = await authModule.listAuthIdentities({
        id: payload.entity_id,
      })
      if (authIdentities && authIdentities.length > 0) {
        authIdentityExists = true
        authIdentityDetails = authIdentities[0]
        console.error("✓ Auth identity found:", authIdentityDetails.id)
        console.error("  Full auth identity details:", JSON.stringify(authIdentityDetails, null, 2))
      } else {
        console.error("✗ Auth identity NOT found:", payload.entity_id)
      }
    } catch (e: any) {
      console.error("✗ Error checking auth identity:", e?.message || e)
    }
    
    // Also check provider_identity to see the full relationship
    let providerIdentityDetails: any = null
    try {
      const pgConn = req.scope.resolve("__pg_connection__")
      if (pgConn && typeof pgConn.raw === "function") {
        // Convert $1, $2 to ? for Knex
        let sql = `SELECT * FROM provider_identity WHERE auth_identity_id = $1 LIMIT 1`
        const placeholderCount = (sql.match(/\$\d+/g) || []).length
        let knexSql = sql
        for (let i = placeholderCount; i >= 1; i--) {
          const placeholderRegex = new RegExp(`\\$${i}\\b`, 'g')
          knexSql = knexSql.replace(placeholderRegex, '?')
        }
        const result = await pgConn.raw(knexSql, [payload.entity_id])
        const rows = result[0] || result.rows || []
        if (rows.length > 0) {
          providerIdentityDetails = rows[0]
          console.error("✓ Provider identity found:", providerIdentityDetails.id)
          console.error("  Provider:", providerIdentityDetails.provider)
          console.error("  Entity ID:", providerIdentityDetails.entity_id)
          console.error("  Auth identity ID:", providerIdentityDetails.auth_identity_id)
        }
      }
    } catch (e: any) {
      console.error("✗ Error checking provider identity:", e?.message || e)
    }
    
    // Check if customer exists
    const userModule = container.resolve(Modules.USER)
    let customerExists = false
    let customerDetails: any = null
    try {
      const users = await userModule.listUsers({
        id: payload.actor_id,
      })
      if (users && users.length > 0) {
        customerExists = true
        customerDetails = users[0]
        console.error("✓ Customer found:", customerDetails.id)
      } else {
        console.error("✗ Customer NOT found:", payload.actor_id)
      }
    } catch (e: any) {
      console.error("✗ Error checking customer:", e?.message || e)
    }
    
    res.json({
      token_payload: payload,
      jwt_verification: verified ? "passed" : "failed",
      auth_identity: {
        exists: authIdentityExists,
        id: authIdentityDetails?.id || null,
        entity_id: authIdentityDetails?.entity_id || null,
        provider: authIdentityDetails?.provider || null,
        full_details: authIdentityDetails,
      },
      provider_identity: {
        exists: !!providerIdentityDetails,
        id: providerIdentityDetails?.id || null,
        provider: providerIdentityDetails?.provider || null,
        entity_id: providerIdentityDetails?.entity_id || null,
        auth_identity_id: providerIdentityDetails?.auth_identity_id || null,
      },
      customer: {
        exists: customerExists,
        id: customerDetails?.id || null,
        email: customerDetails?.email || null,
      },
      summary: {
        jwt_valid: verified,
        auth_identity_found: authIdentityExists,
        customer_found: customerExists,
        token_entity_id_matches_auth_identity: authIdentityExists && authIdentityDetails?.id === payload.entity_id,
        token_actor_id_matches_customer: customerExists && customerDetails?.id === payload.actor_id,
      },
    })
  } catch (error: any) {
    console.error("Debug token error:", error?.message || error)
    res.status(500).json({ 
      error: error?.message || "Internal server error",
      stack: error?.stack,
    })
  }
}

