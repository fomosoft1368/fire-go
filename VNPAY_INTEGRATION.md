# VNPay Integration Guide

## Overview
This guide explains how to integrate VNPay payment gateway for the Fire-Go driver app.

## Frontend Changes (Mobile Driver)

### 1. New Screens Created
- **TopupScreen** (`mobile-driver/src/screens/TopupScreen.tsx`)
  - Shows preset amounts (100k, 200k, 500k, 1M, 2M, 5M)
  - Allows custom amount input
  - Displays available payment methods
  - Shows fee breakdown
  - Confirmation modal before payment

- **PaymentWebViewScreen** (`mobile-driver/src/screens/PaymentWebViewScreen.tsx`)
  - WebView to display VNPay payment gateway
  - Handles payment callback
  - Shows success/failure alerts
  - Auto-redirects on completion

### 2. Payment Service
- **paymentService** (`mobile-driver/src/services/paymentService.ts`)
  - `createVNPayPayment(amount)` - Creates payment URL
  - `verifyVNPayPayment(vnpParams)` - Verifies payment
  - `getPaymentHistory()` - Gets transaction history
  - `checkPaymentStatus(transactionId)` - Checks payment status
  - `parseVNPayResponse(url)` - Parses VNPay callback URL

### 3. UI Updates
- Added "Nạp tiền" (Topup) button in EarningsScreen
- Button navigates to TopupScreen when clicked

### 4. Installation Steps

**Install WebView dependency:**
```bash
cd mobile-driver
npm install react-native-webview
```

**Update Navigation (src/navigation/index.tsx or wherever navigation is configured):**
```typescript
import { TopupScreen, PaymentWebViewScreen } from '../screens'

// Add to your navigation stack:
<Stack.Screen name="Topup" component={TopupScreen} />
<Stack.Screen name="PaymentWebView" component={PaymentWebViewScreen} />
```

## Backend Changes

### 1. New Payment Module
Create payment module in `backend/src/modules/payment/`

**Files created:**
- `payment.controller.ts` - API endpoints
- `payment.service.ts` - Business logic
- `payment.module.ts` - Module definition
- `dto/create-payment.dto.ts` - Data Transfer Objects
- `schemas/payment.schema.ts` - MongoDB schema

### 2. Database Schema
Payment records stored in MongoDB with:
- userId
- amount
- method (vnpay, wallet, bank_transfer)
- type (topup, withdrawal, refund)
- status (pending, completed, failed, cancelled)
- VNPay transaction details

### 3. API Endpoints

```
POST   /api/payment/vnpay/create-payment   - Create payment URL
GET    /api/payment/vnpay/return           - VNPay callback (return URL)
POST   /api/payment/vnpay/notify           - VNPay webhook (notify URL)
POST   /api/payment/vnpay/verify-payment   - Verify payment
GET    /api/payment/history                - Get payment history
GET    /api/payment/:id/status             - Check payment status
POST   /api/payment/:id/cancel             - Cancel payment
```

### 4. Installation Steps

**Create payment module directory:**
```bash
cd backend/src/modules
mkdir payment
mkdir payment/dto
mkdir payment/schemas
```

**Create all files** (they are provided above)

**Update app.module.ts:**
```typescript
import { PaymentModule } from './modules/payment/payment.module'

@Module({
  imports: [
    // ... other imports
    PaymentModule,
  ],
})
export class AppModule {}
```

**Install required packages:**
```bash
npm install axios
```

### 5. Environment Variables

Add these to your `.env` file:

```env
# VNPay Configuration
VNPAY_TMN_CODE=2QNVQ7K1
VNPAY_HASH_SECRET=SCPUASVNZJUUKSMHZ4LQTEKBXAOTAZC
VNPAY_API_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

# Callback URLs (update with your domain)
VNPAY_RETURN_URL=https://yourdomain.com/api/payment/vnpay/return
VNPAY_NOTIFY_URL=https://yourdomain.com/api/payment/vnpay/notify

# For local development with ngrok
VNPAY_RETURN_URL=https://xxxxx.ngrok.io/api/payment/vnpay/return
VNPAY_NOTIFY_URL=https://xxxxx.ngrok.io/api/payment/vnpay/notify
```

### 6. VNPay Setup

1. Go to https://sandbox.vnpayment.vn
2. Register for a merchant account
3. Get TMN Code and Hash Secret
4. Configure return/notify URLs
5. Update `.env` with your credentials

### 7. Testing

**Test in Sandbox:**
1. Use any card number (test cards provided by VNPay)
2. Any expiry date in future (e.g., 12/25)
3. Any 3-digit CVV

**Common Test Cards:**
- Card: 4111111111111111 (Visa)
- Card: 5425233010103442 (Mastercard)

## Payment Flow

```
1. User enters amount in TopupScreen
2. Clicks "Tiếp tục" button
3. Confirmation modal appears
4. On confirm:
   - paymentService.createVNPayPayment() called
   - Backend generates VNPay URL
   - PaymentWebViewScreen opens with URL
5. User completes payment on VNPay gateway
6. VNPay redirects to return URL
7. PaymentWebViewScreen handles redirect
8. Success/failure alert shown
9. Auto-navigate to Earnings or show error

```

## Security Notes

1. **Never commit credentials** - Always use environment variables
2. **Hash verification** - All VNPay callbacks verified with SHA512 hash
3. **HTTPS only** - Production must use HTTPS
4. **User verification** - All endpoints protected with JWT
5. **Amount validation** - Min: 50k, Max: 100M VND

## Wallet Integration (TODO)

After payment completion, you need to integrate wallet update:

In `payment.service.ts`, uncomment and implement:
```typescript
// await this.walletService.addBalance(userId, amount)
```

Create or update WalletService to:
1. Find driver's wallet record
2. Add topup amount to balance
3. Create wallet transaction history record

## Troubleshooting

### Payment URL not generating
- Check VNPay credentials in .env
- Verify API URL is correct
- Check network connectivity

### Callback not working
- Ensure return/notify URLs are publicly accessible
- Use ngrok for local testing: `ngrok http 3000`
- Update VNPAY_RETURN_URL and VNPAY_NOTIFY_URL in .env

### Signature verification failed
- Hash Secret must match VNPay merchant account
- Check for typos in environment variables
- Ensure SHA512 implementation is correct

### Payment shows but doesn't complete
- Check browser console for errors
- Verify iframe/WebView settings
- Check VNPay sandbox status

## Next Steps

1. ✅ Frontend screens and payment service created
2. ✅ Backend payment module created
3. ⏳ Create payment module in app.module.ts
4. ⏳ Setup environment variables
5. ⏳ Integrate with wallet service
6. ⏳ Test with VNPay sandbox
7. ⏳ Deploy to production with real credentials

## Support

For VNPay issues:
- Documentation: https://sandbox.vnpayment.vn
- Contact: support@vnpay.vn

For Fire-Go issues:
- Check console logs for [PaymentService] and [PaymentController] messages
- Verify all environment variables are set
- Ensure payment module is imported in app.module.ts
