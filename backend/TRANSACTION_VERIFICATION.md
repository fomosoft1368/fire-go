# Transaction Verification - Critical Issue

## 🚨 VẤN ĐỀ NGHIÊM TRỌNG

### Auto-Complete Không An Toàn

**Tình huống:**
1. User tạo transaction (pending)
2. **User KHÔNG chuyển tiền** (quên, hủy, hoặc chuyển sai)
3. Auto-checker tự động complete sau 2 phút
4. **Balance tăng dù không có tiền thật vào** ❌

**Hậu quả:**
- ❌ Driver có tiền "ảo" trong ví
- ❌ Hệ thống mất tiền
- ❌ Báo cáo tài chính sai
- ❌ Fraud risk cao

## ✅ GIẢI PHÁP

### Option 1: Manual Verification (Recommended - AN TOÀN NHẤT)

**Workflow:**
1. User tạo topup → Transaction PENDING
2. User scan QR + chuyển khoản
3. **Admin check MB Bank** (app/web banking)
4. **Verify transfer:** 
   - ✓ Có transfer vào 0986190053?
   - ✓ Amount đúng không?
   - ✓ Content đúng `NAPVI XXXXXXXX`?
5. **Admin chạy manual script:** 
   ```bash
   node test-manual-webhook-698a875b313f393c05af7f2e.js
   ```

**Pros:**
- ✅ 100% accurate
- ✅ No fraud risk
- ✅ Simple to implement

**Cons:**
- ❌ Requires manual work
- ❌ Not real-time
- ❌ Cannot scale

**Best for:** Small team, low volume (<100 topups/day)

---

### Option 2: Sepay API Integration (Recommended - TỰ ĐỘNG + AN TOÀN)

**Requirements:**
1. Check if Sepay has API: `GET /api/transactions/list`
2. API must return recent bank transfers

**Workflow:**
1. User tạo topup → Transaction PENDING
2. User scan QR + chuyển khoản
3. **Auto-checker polls Sepay API** mỗi 30s
4. **Match transaction:**
   ```javascript
   const sepayTx = sepayTransactions.find(tx => 
     tx.content.includes('NAPVI 05AF7F2E') &&
     tx.amount === 100000 &&
     tx.status === 'success'
   );
   ```
5. **If match found** → Auto-complete ✅
6. **If no match after 24h** → Cancel transaction

**Implementation:**
```javascript
async function getSepayTransactions() {
  const response = await axios.get('https://my.sepay.vn/userapi/transactions/list', {
    headers: {
      'Authorization': `Bearer ${SEPAY_API_KEY}`,
    },
    params: {
      account_number: '0986190053',
      limit: 100,
      from_date: new Date(Date.now() - 24*60*60*1000).toISOString(),
    }
  });
  return response.data.transactions || [];
}

async function verifyAndComplete(pendingTx) {
  const sepayTxs = await getSepayTransactions();
  const last8 = pendingTx._id.toString().slice(-8).toUpperCase();
  
  // Find matching transfer
  const match = sepayTxs.find(tx => 
    tx.content.toUpperCase().includes(last8) &&
    Math.abs(tx.amount - pendingTx.amount) <= 1 &&
    tx.transferType === 'in'
  );
  
  if (match) {
    console.log('✅ Verified! Real transfer found');
    await completeTransaction(pendingTx, match.id);
  } else {
    console.log('⏳ No matching transfer yet');
  }
}
```

**Pros:**
- ✅ Fully automated
- ✅ 100% verified với bank data
- ✅ Scalable
- ✅ Real-time (30s-2min delay)

**Cons:**
- ❌ Requires Sepay API access
- ❌ API might not exist or have limits
- ❌ Need to handle API errors

**Best for:** Production, high volume

---

### Option 3: Notification Only (Tạm Thời)

**Change auto-checker to notification-only:**

```javascript
// Don't auto-complete, just notify
if (new Date(tx.createdAt) < threshold) {
  console.log('⚠️  PENDING TRANSACTION NEEDS ATTENTION:');
  console.log(`   ID: ${tx._id}`);
  console.log(`   Content: NAPVI ${last8}`);
  console.log(`   Created: ${age} minutes ago`);
  console.log(`   Action: Verify in MB Bank, then run:`);
  console.log(`   node complete-transaction.js ${tx._id}\n`);
  
  // Optionally: Send notification to admin
  // await sendAdminNotification(tx);
}
```

**Pros:**
- ✅ Safe (no auto-complete)
- ✅ Reminder for admin
- ✅ Easy to implement

**Cons:**
- ❌ Still requires manual work
- ❌ Just a better reminder system

**Best for:** Transition period while building API integration

---

## 📋 RECOMMENDED APPROACH

### Phase 1: Immediate (Now)

**Disable auto-complete:**
```javascript
// In auto-transaction-checker.js
// Comment out auto-complete line
// await completeTransaction(tx);  ← DISABLED
```

**Create manual verification script:**
```bash
# backend/verify-and-complete.js
# Admin runs this after checking MB Bank
node verify-and-complete.js <transactionId>
```

### Phase 2: Short-term (This Week)

**Check Sepay API availability:**
1. Contact Sepay support
2. Ask for API docs: `GET /transactions/list`
3. Test API with your account

**If API available:** Implement Option 2
**If NO API:** Build admin dashboard for Option 1

### Phase 3: Long-term (Production)

**Option A: Sepay API Integration**
- Auto-verify + auto-complete
- Monitor 24/7
- Alert on anomalies

**Option B: Admin Dashboard**
- List pending transactions
- Show QR code + content
- One-click verify (after checking bank)
- Transaction history + search

**Option C: Deploy Backend to Cloud**
- Railway/Render with static URL
- Proper webhook setup
- May enable real-time Sepay webhooks

---

## 🛠️ QUICK FIX (Right Now)

### 1. Create Manual Verification Script

```bash
# backend/complete-verified-transaction.js
```

```javascript
const txId = process.argv[2];
if (!txId) {
  console.log('Usage: node complete-verified-transaction.js <transactionId>');
  process.exit(1);
}

console.log('⚠️  MANUAL VERIFICATION REQUIRED');
console.log('Before running this:');
console.log('1. Open MB Bank app/website');
console.log('2. Check transaction history for 0986190053');
console.log('3. Verify transfer with content: NAPVI ' + txId.slice(-8).toUpperCase());
console.log('4. Confirm amount matches\n');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Have you verified the transfer in MB Bank? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    console.log('✅ Proceeding with completion...');
    // Trigger webhook
    const http = require('http');
    const payload = JSON.stringify({
      id: 'manual_' + Date.now(),
      transferType: 'in',
      transferAmount: 100000, // Get from DB
      content: 'NAPVI ' + txId.slice(-8).toUpperCase(),
      // ... rest of payload
    });
    
    http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/wallet/sepay/webhook',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      console.log('✅ Transaction completed!');
      readline.close();
    }).end(payload);
  } else {
    console.log('❌ Cancelled - transaction NOT completed');
    readline.close();
  }
});
```

### 2. Update Auto-Checker to Notification-Only

Already done ✅ (disabled auto-complete)

### 3. Workflow

```
User tạo topup
     ↓
Pending (app shows QR)
     ↓
User chuyển khoản
     ↓
Admin checks MB Bank ✅
     ↓
Admin runs: node complete-verified-transaction.js <id>
     ↓
Script confirms: "Verified?"
     ↓
Admin: "yes"
     ↓
Transaction completed ✅
```

---

## ❓ NEXT STEPS

**Cần quyết định:**

1. **Sepay API có tồn tại không?**
   - Contact Sepay support
   - Check docs: https://docs.sepay.vn
   - Test endpoint với API key

2. **Volume topup bao nhiêu/ngày?**
   - <10/day → Manual OK
   - 10-100/day → Need automation
   - >100/day → Must have API

3. **Deploy backend production?**
   - Railway/Render (free tier)
   - Static URL for real webhooks
   - May solve webhook problem

**Tôi recommend:**

**Short-term (hôm nay):**
- ✅ Use manual verification script
- ✅ Check each transfer in MB Bank
- ✅ Safe but slow

**Long-term (tuần sau):**
- 🔍 Investigate Sepay API
- 🚀 If API exists → Integrate for auto-verify
- 🌐 If no API → Deploy backend + admin dashboard

---

**Status:** ⚠️  Auto-complete DISABLED (safe mode)
**Current:** Manual verification required
**Next:** Decide on long-term solution
