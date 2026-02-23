# Sepay Webhook - Quick Start

## ✅ Đã Hoàn Thành

### Code Improvements
- ✅ **Content parsing linh hoạt hơn** - Hỗ trợ 3 patterns khác nhau
- ✅ **Transaction finding thông minh** - Tìm theo full ID hoặc last 8 chars
- ✅ **Detailed logging** - Dễ debug khi có vấn đề
- ✅ **Testing tools** - Monitor real-time và test scripts

### Files Changed
1. `sepay-webhook.controller.ts` - Improved content parsing
2. `wallet.service.ts` - Smart transaction finding
3. `sepay.service.ts` - Better QR generation logging

### New Files
1. `monitor-webhook.js` - Real-time webhook monitor
2. `test-webhook-live.js` - Create test transaction
3. `check-all-pending-transactions.js` - View all pending
4. `WEBHOOK_TESTING_GUIDE.md` - Complete guide

## 🚀 Test Ngay

### Cách 1: Test Nhanh (3 Commands)

```bash
# Terminal 1 - Monitor webhooks
cd D:\fire-go\backend
node monitor-webhook.js

# Terminal 2 - Create test transaction  
cd D:\fire-go\backend
node test-webhook-live.js

# Terminal 3 - Check pending transactions
cd D:\fire-go\backend
node check-all-pending-transactions.js
```

### Cách 2: Full Setup

```bash
# Terminal 1 - Backend
cd D:\fire-go\backend
npm run start:dev

# Terminal 2 - Ngrok (if not running)
cd D:\fire-go\backend
.\ngrok.exe http 3000

# Terminal 3 - Monitor
cd D:\fire-go\backend
node monitor-webhook.js

# Terminal 4 - Create test & transfer
cd D:\fire-go\backend
node test-webhook-live.js
# Copy content, transfer to MB 0986190053
```

## 📋 Transfer Info

Khi test, chuyển khoản đến:
- **Bank:** MB Bank (970422)
- **Account:** 0986190053
- **Name:** HO VAN TRINH
- **Content:** `NAPVI <8 chars>` (từ test script)
- **Amount:** Theo test script (ví dụ: 50,000 VND)

## 🔍 Check Status

```bash
# List tất cả pending transactions
node check-all-pending-transactions.js

# Check transaction cụ thể
node check-transaction-status.js <transactionId>

# Check driver balance
# (qua MongoDB hoặc API)
```

## ⚠️ Important Notes

1. **Content PHẢI chính xác:**
   - ✅ `NAPVI 07C2B288` (đúng)
   - ❌ `NAPVI  07C2B288` (2 space - sai)
   - ❌ `napvi 07c2b288` (lowercase - sai)
   - ❌ `NAPVI07C2B288` (không có space - vẫn OK nhờ pattern 2)

2. **Amount PHẢI khớp:**
   - Transaction: 50,000 → Transfer: 50,000 ✅
   - Transaction: 50,000 → Transfer: 50,001 ❌

3. **Webhook delay:**
   - Normal: 30s - 2 phút
   - Busy time: Có thể lên đến 5 phút

4. **Ngrok URL expires:**
   - Free ngrok: URL thay đổi mỗi lần restart
   - Cần update lại trên Sepay dashboard
   - Alternative: Deploy backend lên Railway/Render

## 🐛 Nếu Webhook Không Trigger

### Check List
- [ ] Backend đang chạy? (`Get-NetTCPConnection -LocalPort 3000`)
- [ ] Ngrok đang chạy? (`Get-Process | Where-Object {$_.ProcessName -like '*ngrok*'}`)
- [ ] Ngrok URL đã update trên Sepay? (https://my.sepay.vn/webhooks/23929)
- [ ] Content chuyển khoản CHÍNH XÁC? (copy từ test script)
- [ ] Amount khớp? (y chang test script)
- [ ] Đã đợi đủ lâu? (1-2 phút)

### Debug Steps

**1. Check Backend Logs:**
Look for:
```
[SepayWebhook] 📥 Received webhook
[WalletService] ✅ Found by last 8 chars
[WalletService] Transaction completed successfully
```

**2. Check Monitor:**
Should show:
```
🎯 WEBHOOK RECEIVED!
✅ Response: Transaction completed
```

**3. Check Ngrok Dashboard:**
- Open: http://127.0.0.1:4040
- Look for: POST /api/wallet/sepay/webhook
- Status: Should be 200

**4. Check Sepay Logs:**
- Go to: https://my.sepay.vn/webhooks/23929
- Tab: "Logs" or "Lịch sử"
- Look for delivery attempts

**5. Manual Test Webhook:**
```bash
cd D:\fire-go\backend
node test-sepay-webhook-live.js
# Use existing transaction ID from check-all-pending-transactions.js
```

## 📖 Full Documentation

Xem chi tiết: [WEBHOOK_TESTING_GUIDE.md](./WEBHOOK_TESTING_GUIDE.md)

## 🎯 Next Steps

1. **Test với transaction thật:**
   ```bash
   node test-webhook-live.js
   # Transfer money với content từ script
   # Watch monitor-webhook.js
   ```

2. **Nếu test OK → Deploy permanent:**
   - Option A: Deploy backend lên Railway
   - Option B: Paid ngrok (static URL)
   - Option C: VPS (cheap, Vietnam server)

3. **Integrate vào mobile app:**
   - App đã sẵn sàng (TopupScreen.tsx đã update)
   - Chỉ cần backend và webhook hoạt động
   - User nạp tiền → Auto cộng vào ví

## 💬 Support

Nếu còn vấn đề:
1. Run: `node check-all-pending-transactions.js`
2. Screenshot backend logs (terminal running `npm run start:dev`)
3. Screenshot monitor output (if webhook received)
4. Share transaction ID và content đã dùng

---

**Status:** ✅ Ready to test  
**Last Updated:** 2026-02-09
