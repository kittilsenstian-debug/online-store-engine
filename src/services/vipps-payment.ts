/**
 * Vipps Payment Service
 * Handles integration with Vipps ePayment API
 */

export interface VippsPaymentConfig {
  clientId: string
  clientSecret: string
  subscriptionKey: string
  merchantSerialNumber: string
  isTestMode?: boolean
}

export interface VippsPaymentRequest {
  amount: number
  currency: string
  reference: string
  paymentDescription: string
  userInfo: {
    phoneNumber?: string
    email?: string
  }
  callbackUrl?: string
  returnUrl?: string
}

export interface VippsPaymentResponse {
  paymentId: string
  url: string
  status: string
}

export class VippsPaymentService {
  private config: VippsPaymentConfig
  private baseUrl: string
  private accessToken?: string
  private tokenExpiry?: Date

  constructor(config: VippsPaymentConfig) {
    this.config = config
    this.baseUrl = config.isTestMode
      ? "https://apitest.vipps.no"
      : "https://api.vipps.no"
  }

  /**
   * Get access token for Vipps API
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }

    // Request new token
    const basicAuth = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`
    ).toString("base64")

    const response = await fetch(`${this.baseUrl}/access-management-1.0/access/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
        "Ocp-Apim-Subscription-Key": this.config.subscriptionKey,
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get Vipps access token: ${errorText}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    // Set expiry to 55 minutes (tokens typically last 1 hour)
    this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000)

    return this.accessToken
  }

  /**
   * Create a payment session with Vipps
   */
  async createPayment(request: VippsPaymentRequest): Promise<VippsPaymentResponse> {
    const accessToken = await this.getAccessToken()

    const paymentRequest = {
      amount: {
        currency: request.currency,
        value: Math.round(request.amount * 100), // Convert to øre (smallest currency unit)
      },
      paymentMethod: {
        type: "WALLET",
      },
      reference: request.reference,
      paymentDescription: request.paymentDescription,
      userFlow: "WEB_REDIRECT",
      ...(request.userInfo.phoneNumber && {
        prefillCustomer: {
          phoneNumber: request.userInfo.phoneNumber,
        },
      }),
      ...(request.callbackUrl && {
        returnUrl: request.returnUrl,
      }),
    }

    const response = await fetch(
      `${this.baseUrl}/epayment/v1/payments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Ocp-Apim-Subscription-Key": this.config.subscriptionKey,
          "Vipps-System-Name": "medusa-commerce",
          "Vipps-System-Version": "2.0.0",
        },
        body: JSON.stringify(paymentRequest),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to create Vipps payment: ${errorText}`)
    }

    const data = await response.json()
    
    return {
      paymentId: data.paymentId,
      url: data.url,
      status: data.state,
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<any> {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/epayment/v1/payments/${paymentId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Ocp-Apim-Subscription-Key": this.config.subscriptionKey,
          "Vipps-System-Name": "medusa-commerce",
          "Vipps-System-Version": "2.0.0",
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to get Vipps payment status: ${errorText}`)
    }

    return await response.json()
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: string, reason?: string): Promise<void> {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/epayment/v1/payments/${paymentId}/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Ocp-Apim-Subscription-Key": this.config.subscriptionKey,
          "Vipps-System-Name": "medusa-commerce",
          "Vipps-System-Version": "2.0.0",
        },
        body: JSON.stringify({
          ...(reason && { reason }),
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to cancel Vipps payment: ${errorText}`)
    }
  }

  /**
   * Capture a payment (for authorized payments)
   */
  async capturePayment(paymentId: string): Promise<any> {
    const accessToken = await this.getAccessToken()

    const response = await fetch(
      `${this.baseUrl}/epayment/v1/payments/${paymentId}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Ocp-Apim-Subscription-Key": this.config.subscriptionKey,
          "Vipps-System-Name": "medusa-commerce",
          "Vipps-System-Version": "2.0.0",
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to capture Vipps payment: ${errorText}`)
    }

    return await response.json()
  }
}

