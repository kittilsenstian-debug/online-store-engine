# Vipps Payment Provider Implementation

## Overview
This document describes the Vipps payment provider implementation for Medusa v2.

## Structure

### Files Created

1. **`src/modules/vipps-payment/service.ts`**
   - Main payment provider service extending `AbstractPaymentProvider`
   - Implements all required payment provider methods
   - Handles Vipps ePayment API integration

2. **`src/modules/vipps-payment/index.ts`**
   - Module export file
   - Exports the VippsPaymentProvider service

3. **`src/services/vipps-payment.ts`**
   - Vipps ePayment API client service
   - Handles OAuth token management
   - Implements Vipps API calls (create, status, cancel, capture)

4. **`medusa-config.ts`**
   - Payment provider registration
   - Configuration with environment variables

## Payment Provider Methods

The VippsPaymentProvider implements the following methods:

1. **`getIdentifier()`** - Returns `"pp_vipps_vipps"`
2. **`initiatePayment()`** - Creates a Vipps payment session
3. **`authorizePayment()`** - Checks payment status from Vipps
4. **`capturePayment()`** - Captures an authorized payment
5. **`refundPayment()`** - Handles refunds (not yet fully implemented)
6. **`cancelPayment()`** - Cancels a payment
7. **`deletePayment()`** - Deletes a payment session
8. **`getPaymentStatus()`** - Gets current payment status
9. **`getWebhookActionAndData()`** - Handles Vipps webhooks

## Configuration

Environment variables required:
- `VIPPS_CLIENT_ID` - Vipps OAuth client ID
- `VIPPS_CLIENT_SECRET` - Vipps OAuth client secret
- `VIPPS_SUBSCRIPTION_KEY` - Vipps API subscription key
- `VIPPS_MSN` or `VIPPS_MERCHANT_SERIAL_NUMBER` - Merchant serial number
- `VIPPS_TEST_MODE` - Set to "true" for test environment
- `BACKEND_URL` - Backend URL for callbacks
- `NEXT_PUBLIC_BASE_URL` - Frontend URL for redirects

## Payment Flow

1. **Customer selects Vipps payment** → `initiatePayment()` is called
2. **Vipps payment is created** → Returns payment URL
3. **Customer redirected to Vipps** → Completes payment in Vipps app
4. **Vipps redirects back** → Customer returns to storefront
5. **Payment status checked** → `authorizePayment()` or `getPaymentStatus()` is called
6. **Payment captured** → `capturePayment()` is called (if needed)
7. **Order completed** → Payment is finalized

## Status Mapping

Vipps payment statuses are mapped to Medusa statuses:

| Vipps Status | Medusa Status |
|-------------|---------------|
| AUTHORIZED | authorized |
| CAPTURED | authorized |
| TERMINATED | canceled |
| FAILED | error |
| REJECTED | error |
| CREATED | pending |
| INITIATED | pending |

## Known Issues & Limitations

1. **Customer Info Retrieval**: Customer email/phone retrieval in `initiatePayment()` is simplified to avoid container access issues. Pass customer info via context if needed.

2. **Refunds**: Refund functionality is not yet fully implemented. Returns a "not supported" error.

3. **Webhook Handling**: Webhook endpoint needs to be created separately at `/store/payments/vipps/webhook`.

4. **Testing**: Ensure Vipps test mode is properly configured before testing.

## Next Steps

1. Create webhook endpoint for Vipps callbacks
2. Update storefront to handle Vipps payment redirects
3. Add Vipps payment option to payment info map
4. Implement refund functionality
5. Add comprehensive error handling
6. Add logging for debugging

## Testing

To test the payment provider:

1. Ensure all environment variables are set
2. Start Medusa server: `npm run dev`
3. Check payment providers: `GET /store/payment-providers?region_id=<region_id>`
4. Verify Vipps provider appears in the list
5. Create a cart and test payment flow

## Troubleshooting

If the payment provider doesn't appear:

1. Check `medusa-config.ts` has correct module registration
2. Verify environment variables are set
3. Check server logs for registration errors
4. Verify provider ID matches: `pp_vipps_vipps`

If payment sessions fail:

1. Check Vipps API credentials
2. Verify callback URLs are correct
3. Check payment session data structure
4. Review Vipps API response for errors

