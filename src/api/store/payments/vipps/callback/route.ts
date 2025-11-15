import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { VippsPaymentService } from "../../../../../services/vipps-payment"

/**
 * Handle Vipps payment callback
 * POST /store/payments/vipps/callback
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { paymentId } = req.body

    if (!paymentId) {
      return res.status(400).json({ message: "Missing paymentId" })
    }

    // Get Vipps configuration
    const clientId = process.env.VIPPS_CLIENT_ID
    const clientSecret = process.env.VIPPS_CLIENT_SECRET
    const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY
    const merchantSerialNumber = process.env.VIPPS_MSN || process.env.VIPPS_MERCHANT_SERIAL_NUMBER
    const isTestMode = process.env.VIPPS_TEST_MODE === "true"

    if (!clientId || !clientSecret || !subscriptionKey) {
      return res.status(500).json({
        message: "Vipps payment configuration is missing",
      })
    }

    // Initialize Vipps payment service
    const vippsService = new VippsPaymentService({
      clientId,
      clientSecret,
      subscriptionKey,
      merchantSerialNumber: merchantSerialNumber || "",
      isTestMode,
    })

    // Get payment status from Vipps
    const paymentStatus = await vippsService.getPaymentStatus(paymentId)

    console.log("Vipps payment callback:", {
      paymentId,
      status: paymentStatus.state,
      amount: paymentStatus.amount,
    })

    // Update payment session based on status
    // The payment session should be linked to the cart via the reference
    const reference = paymentStatus.reference
    const cartId = reference?.replace("CART-", "")

    if (cartId) {
      const cartModule = req.scope.resolve(Modules.CART)
      const paymentModule = req.scope.resolve(Modules.PAYMENT)

      try {
        // Find the payment session for this cart
        const cart = await cartModule.retrieveCart(cartId)
        
        if (cart.payment_collection_id) {
          const paymentCollection = await paymentModule.retrievePaymentCollection(
            cart.payment_collection_id
          )

          if (paymentCollection) {
            // Find Vipps payment session
            const vippsSession = paymentCollection.payment_sessions?.find(
              (session: any) =>
                session.provider_id === "vipps" &&
                session.data?.vipps_payment_id === paymentId
            )

            if (vippsSession) {
              // Update payment session status based on Vipps payment state
              let sessionStatus = vippsSession.status

              switch (paymentStatus.state) {
                case "AUTHORIZED":
                case "CAPTURED":
                  sessionStatus = "authorized"
                  break
                case "TERMINATED":
                  sessionStatus = "canceled"
                  break
                case "FAILED":
                  sessionStatus = "error"
                  break
                default:
                  sessionStatus = "pending"
              }

              // Update payment session
              await paymentModule.updatePaymentSession(vippsSession.id, {
                status: sessionStatus,
                data: {
                  ...vippsSession.data,
                  vipps_payment_status: paymentStatus.state,
                  vipps_payment_data: paymentStatus,
                },
              })
            }
          }
        }
      } catch (error) {
        console.error("Error updating payment session:", error)
        // Continue anyway - the callback should still return success to Vipps
      }
    }

    // Return success to Vipps
    res.status(200).json({ status: "ok" })
  } catch (error: any) {
    console.error("Vipps payment callback error:", error)
    res.status(500).json({
      message: error.message || "Failed to process Vipps payment callback",
    })
  }
}

