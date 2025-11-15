import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Initiate Vipps OAuth login
 * GET /store/auth/vipps
 * Supports both redirect (default) and JSON response (if Accept: application/json header is present)
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const clientId = process.env.VIPPS_CLIENT_ID
  const redirectUri = process.env.VIPPS_REDIRECT_URI || `${req.protocol}://${req.get('host')}/auth/vipps/callback`
  const state = req.query.state as string || Math.random().toString(36).substring(7)
  
  // Store state in session for verification
  req.session.state = state

  // Determine if we're in test mode (you can set VIPPS_TEST_MODE=true in .env for testing)
  const isTestMode = process.env.VIPPS_TEST_MODE === "true"
  const vippsBaseUrl = isTestMode 
    ? "https://apitest.vipps.no" 
    : "https://api.vipps.no"
  
  // Vipps OAuth authorization URL
  const vippsAuthUrl = `${vippsBaseUrl}/access-management-1.0/access/oauth2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}&scope=openid name phoneNumber address email`

  // If client requests JSON (for AJAX/fetch calls), return the URL as JSON
  const acceptHeader = req.get("accept") || ""
  if (acceptHeader.includes("application/json")) {
    res.json({ authUrl: vippsAuthUrl, state })
    return
  }

  // Otherwise, redirect directly
  res.redirect(vippsAuthUrl)
}

