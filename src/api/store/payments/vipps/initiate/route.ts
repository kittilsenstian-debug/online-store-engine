import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { VippsPaymentService } from "../../../../../services/vipps-payment"

/**
 * Initiate a Vipps payment session
 * POST /store/payments/vipps/initiate
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    const { cart_id, amount, currency } = req.body

    if (!cart_id || !amount || !currency) {
      return res.status(400).json({
        message: "Missing required fields: cart_id, amount, currency",
      })
    }

    // Get Vipps configuration
    const clientId = process.env.VIPPS_CLIENT_ID
    const clientSecret = process.env.VIPPS_CLIENT_SECRET
    const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY
    const merchantSerialNumber = process.env.VIPPS_MSN || process.env.VIPPS_MERCHANT_SERIAL_NUMBER
    const isTestMode = process.env.VIPPS_TEST_MODE === "true"
    const backendUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`
    const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"

    if (!clientId || !clientSecret || !subscriptionKey) {
      return res.status(500).json({
        message: "Vipps payment configuration is missing",
      })
    }

    // Get cart information
    const cartModule = req.scope.resolve(Modules.CART)
    const cart = await cartModule.retrieveCart(cart_id)

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" })
    }

    // Initialize Vipps payment service
    const vippsService = new VippsPaymentService({
      clientId,
      clientSecret,
      subscriptionKey,
      merchantSerialNumber: merchantSerialNumber || "",
      isTestMode,
    })

    // Create payment reference (use cart ID)
    const reference = `CART-${cart_id.substring(0, 50)}`

    // Get customer email/phone if available
    const customerModule = req.scope.resolve(Modules.CUSTOMER)
    let customerEmail: string | undefined
    let customerPhone: string | undefined

    if (cart.customer_id) {
      try {
        const customer = await customerModule.retrieveCustomer(cart.customer_id)
        customerEmail = customer.email
        customerPhone = customer.phone
      } catch (error) {
        // Customer not found, continue without customer info
      }
    }

    // Create payment description
    const paymentDescription = cart.items
      ? `Order for ${cart.items.length} item${cart.items.length > 1 ? "s" : ""}`
      : "Order payment"

    // Create Vipps payment
    const payment = await vippsService.createPayment({
      amount: amount / 100, // Convert from smallest currency unit to main unit
      currency: currency.toUpperCase(),
      reference,
      paymentDescription,
      userInfo: {
        email: customerEmail,
        phoneNumber: customerPhone,
      },
      returnUrl: `${frontendUrl}/checkout?payment_success=true&cart_id=${cart_id}`,
      callbackUrl: `${backendUrl}/store/payments/vipps/callback`,
    })

    // Store payment ID in payment session data
    // This will be used when the user returns from Vipps

    res.json({
      payment_id: payment.paymentId,
      url: payment.url,
      status: payment.status,
    })
  } catch (error: any) {
    console.error("Vipps payment initiation error:", error)
    res.status(500).json({
      message: error.message || "Failed to initiate Vipps payment",
    })
  }
}

