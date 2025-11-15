import { AbstractPaymentProvider, isPaymentProviderError, PaymentProviderError, PaymentProviderSessionResponse, ProviderWebhookPayload } from "@medusajs/framework/utils"
import { VippsPaymentService, VippsPaymentConfig } from "../../services/vipps-payment"

type VippsProviderOptions = {
  clientId: string
  clientSecret: string
  subscriptionKey: string
  merchantSerialNumber: string
  isTestMode?: boolean
}

/**
 * Vipps Payment Provider
 * Implements Medusa's AbstractPaymentProvider interface for Vipps payments
 */
class VippsPaymentProvider extends AbstractPaymentProvider<VippsProviderOptions> {
  static identifier = "pp_vipps_vipps"
  protected vippsService_: VippsPaymentService | null = null

  protected getVippsService(): VippsPaymentService {
    if (!this.vippsService_) {
      const options = this.options
      if (!options.clientId || !options.clientSecret || !options.subscriptionKey) {
        throw new PaymentProviderError(
          "Vipps payment provider is not configured. Please provide clientId, clientSecret, and subscriptionKey."
        )
      }

      this.vippsService_ = new VippsPaymentService({
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        subscriptionKey: options.subscriptionKey,
        merchantSerialNumber: options.merchantSerialNumber || "",
        isTestMode: options.isTestMode ?? false,
      })
    }

    return this.vippsService_
  }

  /**
   * Get the identifier for this payment provider
   */
  getIdentifier(): string {
    return VippsPaymentProvider.identifier
  }

  /**
   * Initialize a payment session
   * This is called when a customer selects Vipps as their payment method
   */
  async initiatePayment(context: any): Promise<PaymentProviderError | PaymentProviderSessionResponse> {
    try {
      const { amount, currency_code, context: sessionContext } = context
      const cartId = sessionContext?.cart_id
      const customerId = sessionContext?.customer_id

      if (!amount || !currency_code) {
        return this.buildError("Amount and currency are required", PaymentProviderError.Codes.INVALID_DATA)
      }

      // Get Vipps service
      const vippsService = this.getVippsService()

      // Create payment reference (use cart ID or generate one)
      const reference = cartId ? `CART-${cartId.substring(0, 40)}` : `PAY-${Date.now()}`

      // Determine frontend and backend URLs
      const backendUrl = process.env.BACKEND_URL || "http://localhost:9000"
      const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"

      // Create payment description
      const paymentDescription = sessionContext?.description || "Order payment"

      // Get customer info if available
      let customerEmail: string | undefined
      let customerPhone: string | undefined

      // Note: Customer info retrieval might need to be handled differently
      // For now, we'll skip it to avoid container access issues
      // Customer info can be passed via context if needed
      if (customerId && sessionContext?.customer_email) {
        customerEmail = sessionContext.customer_email as string
      }
      if (customerId && sessionContext?.customer_phone) {
        customerPhone = sessionContext.customer_phone as string
      }

      // Create Vipps payment
      const vippsPayment = await vippsService.createPayment({
        amount: amount / 100, // Convert from smallest currency unit to main unit (øre to NOK)
        currency: currency_code.toUpperCase(),
        reference,
        paymentDescription,
        userInfo: {
          email: customerEmail,
          phoneNumber: customerPhone,
        },
        returnUrl: `${frontendUrl}/checkout?payment_success=true&cart_id=${cartId || ""}`,
        callbackUrl: `${backendUrl}/store/payments/vipps/webhook`,
      })

      // Return payment session response
      return {
        data: {
          vipps_payment_id: vippsPayment.paymentId,
          url: vippsPayment.url,
          status: this.mapVippsStatusToMedusaStatus(vippsPayment.status),
          reference,
        },
      }
    } catch (error: any) {
      if (isPaymentProviderError(error)) {
        return error
      }
      return this.buildError(
        error.message || "Failed to initiate Vipps payment",
        PaymentProviderError.Codes.UNKNOWN
      )
    }
  }

  /**
   * Authorize a payment
   * Called when verifying a payment session
   */
  async authorizePayment(
    paymentSessionData: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<PaymentProviderError | {
    status: PaymentProviderSessionResponse["status"]
    data: PaymentProviderSessionResponse["data"]
  }> {
    try {
      const vippsPaymentId = paymentSessionData.vipps_payment_id as string

      if (!vippsPaymentId) {
        return this.buildError("Vipps payment ID is missing", PaymentProviderError.Codes.INVALID_DATA)
      }

      // Get Vipps service
      const vippsService = this.getVippsService()

      // Get payment status from Vipps
      const paymentStatus = await vippsService.getPaymentStatus(vippsPaymentId)

      // Map Vipps status to Medusa status
      const medusaStatus = this.mapVippsStatusToMedusaStatus(paymentStatus.state)

      return {
        status: medusaStatus,
        data: {
          ...paymentSessionData,
          vipps_payment_status: paymentStatus.state,
          vipps_payment_data: paymentStatus,
        },
      }
    } catch (error: any) {
      if (isPaymentProviderError(error)) {
        return error
      }
      return this.buildError(
        error.message || "Failed to authorize Vipps payment",
        PaymentProviderError.Codes.UNKNOWN
      )
    }
  }

  /**
   * Capture a payment
   * Called when finalizing a payment after authorization
   */
  async capturePayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
    try {
      const vippsPaymentId = paymentSessionData.vipps_payment_id as string

      if (!vippsPaymentId) {
        return this.buildError("Vipps payment ID is missing", PaymentProviderError.Codes.INVALID_DATA)
      }

      // Get Vipps service
      const vippsService = this.getVippsService()

      // Check payment status first
      const paymentStatus = await vippsService.getPaymentStatus(vippsPaymentId)

      // If already captured, return success
      if (paymentStatus.state === "CAPTURED") {
        return {
          ...paymentSessionData,
          vipps_payment_status: paymentStatus.state,
          vipps_payment_data: paymentStatus,
        }
      }

      // If authorized but not captured, capture it
      if (paymentStatus.state === "AUTHORIZED") {
        await vippsService.capturePayment(vippsPaymentId)
        
        // Get updated status
        const updatedStatus = await vippsService.getPaymentStatus(vippsPaymentId)
        
        return {
          ...paymentSessionData,
          vipps_payment_status: updatedStatus.state,
          vipps_payment_data: updatedStatus,
        }
      }

      // Payment is not in a capturable state
      return this.buildError(
        `Payment is not in a capturable state. Current status: ${paymentStatus.state}`,
        PaymentProviderError.Codes.INVALID_DATA
      )
    } catch (error: any) {
      if (isPaymentProviderError(error)) {
        return error
      }
      return this.buildError(
        error.message || "Failed to capture Vipps payment",
        PaymentProviderError.Codes.UNKNOWN
      )
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    paymentSessionData: Record<string, unknown>,
    refundAmount: number
  ): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
    try {
      // Vipps ePayment API doesn't support partial refunds in the same way
      // This would need to be implemented based on Vipps' refund API
      // For now, return an error indicating refunds need to be handled manually
      return this.buildError(
        "Refunds are not yet supported for Vipps payments. Please process refunds manually through the Vipps portal.",
        PaymentProviderError.Codes.NOT_SUPPORTED
      )
    } catch (error: any) {
      if (isPaymentProviderError(error)) {
        return error
      }
      return this.buildError(
        error.message || "Failed to refund Vipps payment",
        PaymentProviderError.Codes.UNKNOWN
      )
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
    try {
      const vippsPaymentId = paymentSessionData.vipps_payment_id as string

      if (!vippsPaymentId) {
        return this.buildError("Vipps payment ID is missing", PaymentProviderError.Codes.INVALID_DATA)
      }

      // Get Vipps service
      const vippsService = this.getVippsService()

      // Cancel the payment
      await vippsService.cancelPayment(vippsPaymentId, "Payment cancelled by customer")

      // Get updated status
      const paymentStatus = await vippsService.getPaymentStatus(vippsPaymentId)

      return {
        ...paymentSessionData,
        vipps_payment_status: paymentStatus.state,
        vipps_payment_data: paymentStatus,
      }
    } catch (error: any) {
      if (isPaymentProviderError(error)) {
        return error
      }
      return this.buildError(
        error.message || "Failed to cancel Vipps payment",
        PaymentProviderError.Codes.UNKNOWN
      )
    }
  }

  /**
   * Delete a payment session
   */
  async deletePayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse["data"]> {
    // For Vipps, deleting a payment session means cancelling the payment
    return this.cancelPayment(paymentSessionData)
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentSessionData: Record<string, unknown>): Promise<"authorized" | "pending" | "requires_more" | "error" | "canceled"> {
    try {
      const vippsPaymentId = paymentSessionData.vipps_payment_id as string

      if (!vippsPaymentId) {
        return "error"
      }

      // Get Vipps service
      const vippsService = this.getVippsService()

      // Get payment status from Vipps
      const paymentStatus = await vippsService.getPaymentStatus(vippsPaymentId)

      // Map Vipps status to Medusa status
      return this.mapVippsStatusToMedusaStatus(paymentStatus.state)
    } catch (error) {
      return "error"
    }
  }

  /**
   * Handle webhook from Vipps
   */
  async getWebhookActionAndData(payload: ProviderWebhookPayload["payload"]): Promise<{
    action: string
    data: Record<string, unknown>
  } | PaymentProviderError> {
    try {
      // Vipps webhook payload structure
      const paymentId = payload.paymentId || payload.payment_id
      const state = payload.state || payload.status

      if (!paymentId) {
        return this.buildError("Payment ID is missing from webhook payload", PaymentProviderError.Codes.INVALID_DATA)
      }

      return {
        action: "update",
        data: {
          vipps_payment_id: paymentId,
          vipps_payment_status: state,
          vipps_payment_data: payload,
        },
      }
    } catch (error: any) {
      return this.buildError(
        error.message || "Failed to process webhook",
        PaymentProviderError.Codes.UNKNOWN
      )
    }
  }

  /**
   * Map Vipps payment status to Medusa payment status
   */
  private mapVippsStatusToMedusaStatus(vippsStatus: string): "authorized" | "pending" | "requires_more" | "error" | "canceled" {
    switch (vippsStatus?.toUpperCase()) {
      case "AUTHORIZED":
      case "CAPTURED":
        return "authorized"
      case "TERMINATED":
        return "canceled"
      case "FAILED":
      case "REJECTED":
        return "error"
      case "CREATED":
      case "INITIATED":
      default:
        return "pending"
    }
  }
}

export default VippsPaymentProvider

