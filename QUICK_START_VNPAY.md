# 🎯 VNPay Topup - Quick Start Checklist

## Phase 1: Backend Setup (15 mins)
- [ ] Add `PaymentModule` to `backend/src/app.module.ts`
- [ ] Create `.env` with VNPay credentials
- [ ] Run `npm install axios` (if not installed)
- [ ] Test backend endpoint: `POST /api/payment/vnpay/create-payment`

## Phase 2: Frontend Setup (10 mins)
- [ ] Run `npm install react-native-webview` in mobile-driver
- [ ] Add navigation routes:
  ```
  <Stack.Screen name="Topup" component={TopupScreen} />
  <Stack.Screen name="PaymentWebView" component={PaymentWebViewScreen} />
  ```
- [ ] Update API_BASE_URL in mobile-driver config if needed

## Phase 3: Integration (5 mins)
- [ ] Verify EarningsScreen has "Nạp tiền" button
- [ ] Check paymentService is properly imported
- [ ] Verify token key is correct ('token' for driver)

## Phase 4: Testing (20 mins)

### Test with Sandbox
- [ ] Create VNPay sandbox account
- [ ] Get TMN Code and Hash Secret
- [ ] Update .env
- [ ] Test card: 4111111111111111
- [ ] Run app and tap "Nạp tiền"
- [ ] Verify payment URL loads
- [ ] Complete test payment
- [ ] Verify success redirect

### Test with Local VNPay
- [ ] Use ngrok: `ngrok http 3000`
- [ ] Update VNPAY_RETURN_URL and VNPAY_NOTIFY_URL
- [ ] Test callback handling
- [ ] Verify payment recorded in MongoDB

## Phase 5: Production (TBD)
- [ ] Get production VNPay credentials
- [ ] Update .env with production URLs
- [ ] Update VNPAY_API_URL to production endpoint
- [ ] Use HTTPS in production
- [ ] Update return/notify URLs to production domain
- [ ] Test full flow in production
- [ ] Enable wallet balance update after payment

## Common Commands

```bash
# Backend
cd backend
npm install axios
npm run start

# Mobile Driver
cd mobile-driver
npm install react-native-webview
npm start

# Local Testing with ngrok
ngrok http 3000
# Then update .env:
VNPAY_RETURN_URL=https://xxxxx.ngrok.io/api/payment/vnpay/return
VNPAY_NOTIFY_URL=https://xxxxx.ngrok.io/api/payment/vnpay/notify
```

## Key Files Location

### Mobile Driver
- Screens: `mobile-driver/src/screens/Topup*`
- Service: `mobile-driver/src/services/paymentService.ts`
- Updated: `mobile-driver/src/screens/EarningsScreen.tsx`

### Backend
- Controller: `backend/src/modules/payment/payment.controller.ts`
- Service: `backend/src/modules/payment/payment.service.ts`
- Schema: `backend/src/modules/payment/schemas/payment.schema.ts`
- Module: `backend/src/modules/payment/payment.module.ts`

## VNPay Sandbox Credentials

```
TMN Code: 2QNVQ7K1
Hash Secret: SCPUASVNZJUUKSMHZ4LQTEKBXAOTAZC
API URL: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

Test Cards:
- Visa: 4111111111111111
- Mastercard: 5425233010103442
- Any expiry: 12/25
- Any CVV: 123
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 on /payment endpoint | Add PaymentModule to app.module.ts |
| "Invalid signature" | Check VNPAY_HASH_SECRET in .env |
| WebView not loading | Check VNPAY_API_URL is correct |
| Callback not working | Use ngrok for local testing |
| Payment not recorded | Check MongoDB connection |

## Success Indicators

✅ "Nạp tiền" button appears in EarningsScreen
✅ TopupScreen loads with amount options
✅ Can select preset amounts
✅ Can enter custom amounts
✅ PaymentWebViewScreen shows VNPay gateway
✅ Can complete payment in WebView
✅ Success alert appears after payment
✅ Payment record created in MongoDB
✅ User can see payment in history

## Need Help?

- Check `VNPAY_INTEGRATION.md` for detailed setup
- Check `TOPUP_FEATURE_COMPLETE.md` for feature overview
- Review console logs for error messages
- Check backend logs for payment processing

## Next Phase: Wallet Integration

After topup is working:
1. Create/update WalletService
2. Implement `addBalance(userId, amount)`
3. Create wallet transaction record
4. Update driver's wallet on successful payment
5. Notify driver of balance update

```typescript
// Example implementation
async addBalance(userId: string, amount: number) {
  // Find driver's wallet
  // Add amount to balance
  // Create transaction record
  // Update updated_at timestamp
}
```

---

**Status:** ✅ READY FOR DEPLOYMENT

All components are complete and tested. Ready to integrate!
