# 🔧 Sepay Payment Implementation - Complete Fix

## Your Sepay Account
```
Merchant ID: SP-LIVE-HVBB3B66
Secret Key: spsk_live_yr9jL5u7gm9gAwa9aQtsY9zvS4s5cey
Account: Hồ Văn Trịnh
Created: 25/02/2026 10:54:59
```

---

## 📋 Implementation Checklist

### ✅ Backend Setup

#### 1. Environment Variables (.env)
```bash
# Sepay Configuration
SEPAY_MERCHANT_ID=SP-LIVE-HVBB3B66
SEPAY_SECRET_KEY=spsk_live_yr9jL5u7gm9gAwa9aQtsY9zvS4s5cey
SEPAY_API_URL=https://api.sepay.vn/api/v2
SEPAY_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/wallet/sepay/webhook

# Example for ngrok:
# SEPAY_WEBHOOK_URL=https://abc123xyz.ngrok.io/api/wallet/sepay/webhook
```

#### 2. Transaction Schema
```typescript
// Should have these fields for Sepay integration:
{
  _id: ObjectId,
  userType: 'driver' | 'customer',  // ✅ CRITICAL
  driverId?: ObjectId,
  userId?: ObjectId,
  // ... rest of fields
  
  sepayTransactionId: String,  // External Sepay ID
  transactionContent: String,  // Format: DRV_<txId_last_8> or CUST_<txId_last_8>
}
```

#### 3. QR Code Generation Format
```
Payment Content Format:
- Driver: DRV_<transaction_id_last_8_chars>
- Customer: CUST_<transaction_id_last_8_chars>

Example for transaction ID "65f12a3b4c5d6e7f8a9b0c1d":
- Driver: DRV_8A9B0C1D
- Customer: CUST_8A9B0C1D
```

#### 4. Sepay QR API
```bash
# Generate QR Code Image
GET https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${content}&accountName=${accountName}

# Example:
https://img.vietqr.io/image/970422-0986190053-compact2.png?amount=100000&addInfo=DRV_8A9B0C1D&accountName=HO%20VAN%20TRINH

Parameters:
- bankCode: 970422 (VietComBank code)
- accountNumber: 0986190053
- accountName: HO VAN TRINH (URL encoded)
- amount: Transfer amount
- addInfo: Transaction content (DRV_xxx or CUST_xxx)
```

---

## 🔄 Payment Flow

### Driver Payment Flow

```
1. Driver clicks "Nạp tiền" button
   ↓
2. Select amount → POST /api/wallet/sepay/create
   {
     "amount": 100000,
     "userType": "driver"
   }
   ↓
3. Backend creates PENDING transaction with:
   - _id: 65f12a3b4c5d6e7f8a9b0c1d
   - userType: 'driver'
   - transactionContent: 'DRV_8A9B0C1D'
   ↓
4. Return QR Code:
   {
     "transactionId": "65f12a3b4c5d6e7f8a9b0c1d",
     "qrCodeUrl": "https://img.vietqr.io/image/970422-0986190053-compact2.png?amount=100000&addInfo=DRV_8A9B0C1D",
     "amount": 100000,
     "content": "DRV_8A9B0C1D",
     "accountNo": "0986190053",
     "accountName": "HO VAN TRINH",
     "bankName": "VietComBank"
   }
   ↓
5. Driver scans QR → transfers 100000 VND
   ↓
6. Bank detects transfer with content "DRV_8A9B0C1D"
   ↓
7. Sepay receives webhook:
   {
     "transferAmount": 100000,
     "content": "DRV_8A9B0C1D",
     "bankBrandName": "VietComBank"
   }
   ↓
8. Backend webhook handler (POST /api/wallet/sepay/webhook):
   - Parse content: DRV_8A9B0C1D → userType='driver', txId_last_8='8A9B0C1D'
   - Find transaction by last 8 chars
   - Verify amount matches (100000 == 100000) ✓
   - Mark transaction as COMPLETED
   - Add 100000 to driver.walletBalance
   - Return 200 OK
   ↓
9. Driver wallet updated ✅
   Balance: old_balance + 100000
```

### Customer Payment Flow (IDENTICAL)

```
Same as driver but:
- Endpoint: POST /api/wallets/topup (or unified /api/wallet/topup)
- Content prefix: CUST_ instead of DRV_
- Update customer wallet instead of driver wallet
```

---

## 🛠️ Implementation Files

### 1. Generate QR Service
**File**: `backend/src/modules/integrations/sepay/sepay.service.ts`

```typescript
@Injectable()
export class SepayService {
  private merchantId = process.env.SEPAY_MERCHANT_ID;
  private secretKey = process.env.SEPAY_SECRET_KEY;
  private bankCode = '970422'; // VietComBank
  private accountNumber = '0986190053'; // Your account
  private accountName = 'HO%20VAN%20TRINH'; // URL encoded

  /**
   * Generate QR Code URL for Sepay payment
   */
  generateQRURL(amount: number, contentPrefix: string, transactionId: string): string {
    // Extract last 8 chars of transaction ID
    const txId8 = transactionId.substring(transactionId.length - 8).toUpperCase();
    
    // Build content: DRV_8A9B0C1D or CUST_8A9B0C1D
    const content = `${contentPrefix}_${txId8}`;
    
    // Build URL with Sepay QR endpoint
    const url = `https://img.vietqr.io/image/${this.bankCode}-${this.accountNumber}-compact2.png`;
    const params = new URLSearchParams({
      amount: amount.toString(),
      addInfo: content,
      accountName: this.accountName,
    });
    
    return `${url}?${params.toString()}`;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    // Generate signature from payload
    const message = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', this.secretKey);
    const calculatedSignature = hmac.update(message).digest('hex');
    
    console.log('[SepayService] Signature verification:', {
      received: signature,
      calculated: calculatedSignature,
      match: signature === calculatedSignature,
    });
    
    return signature === calculatedSignature;
  }
}
```

### 2. Webhook Handler
**File**: `backend/src/modules/integrations/sepay/sepay-webhook.controller.ts`

```typescript
@Controller('api/wallet/sepay')
export class SepayWebhookController {
  constructor(
    private readonly sepayService: SepayService,
    private readonly walletsService: WalletsService,
    private readonly driverService: DriverService,
  ) {}

  /**
   * POST /api/wallet/sepay/webhook
   * Receives webhook from Sepay when bank transfer is confirmed
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    console.log('[SepayWebhook] 📥 Received webhook:', JSON.stringify(payload, null, 2));

    try {
      // Step 1: Check if incoming transfer
      if (payload.transferType !== 'in') {
        console.log('[SepayWebhook] ⏭️ Not incoming transfer, skipping');
        return { success: true, message: 'Not a topup transaction' };
      }

      // Step 2: Parse content to get transaction info
      const content = payload.content?.trim().toUpperCase() || '';
      console.log('[SepayWebhook] 📝 Content:', content);

      // Extract prefix (DRV or CUST) and transaction ID last 8 chars
      const match = content.match(/^(DRV|CUST)_([A-F0-9]{8})$/);
      
      if (!match) {
        console.error('[SepayWebhook] ❌ Invalid content format:', content);
        throw new BadRequestException(`Invalid content format: ${content}`);
      }

      const [, userTypePrefix, txIdLast8] = match;
      const userType = userTypePrefix === 'DRV' ? 'driver' : 'customer';

      console.log('[SepayWebhook] ✅ Parsed successfully:', {
        userType,
        txIdLast8,
        amount: payload.transferAmount,
      });

      // Step 3: Find transaction by last 8 chars
      const transaction = await this.findTransactionByLast8(
        userType,
        txIdLast8,
      );

      if (!transaction) {
        console.error('[SepayWebhook] ❌ Transaction not found');
        throw new NotFoundException(`Transaction not found for ${userType}`);
      }

      // Step 4: Verify amount
      if (Math.abs(transaction.amount - payload.transferAmount) > 1) {
        console.error('[SepayWebhook] ❌ Amount mismatch:', {
          expected: transaction.amount,
          received: payload.transferAmount,
        });
        throw new BadRequestException('Amount mismatch');
      }

      // Step 5: Mark as completed
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      transaction.sepayTransactionId = payload.id;
      await transaction.save();

      console.log('[SepayWebhook] ✅ Transaction marked completed:', transaction._id);

      // Step 6: Add balance to correct user
      if (userType === 'driver') {
        await this.driverService.updateWalletBalance(
          transaction.driverId,
          transaction.amount,
        );
        console.log('[SepayWebhook] ✅ Driver wallet updated');
      } else if (userType === 'customer') {
        await this.walletsService.addBalance(
          transaction.userId,
          transaction.amount,
        );
        console.log('[SepayWebhook] ✅ Customer wallet updated');
      }

      return { success: true, message: 'Transaction completed' };
    } catch (error: any) {
      console.error('[SepayWebhook] ❌ Error:', error.message);
      // ALWAYS return 200 to prevent Sepay retry
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Find transaction by last 8 chars
   */
  private async findTransactionByLast8(
    userType: string,
    last8: string,
  ) {
    const transactions = await this.transactionModel
      .find({
        userType,
        type: 'topup',
        status: 'pending',
      })
      .sort({ createdAt: -1 })
      .limit(50);

    for (const tx of transactions) {
      const txIdStr = tx._id.toString();
      const txLast8 = txIdStr.substring(txIdStr.length - 8).toUpperCase();
      
      if (txLast8 === last8) {
        return tx;
      }
    }

    return null;
  }

  /**
   * POST /api/wallet/sepay/create
   * Called by mobile app to create topup and get QR code
   */
  @Post('create')
  @UseGuards(JwtAuthGuard)
  async createTopup(
    @Request() req: any,
    @Body() { amount, userType }: { amount: number; userType: 'driver' | 'customer' },
  ) {
    console.log('[SepayWebhook] Creating topup:', { userId: req.user.id, amount, userType });

    try {
      // Determine actual userType from request
      const actualUserType = req.user.type || userType;

      // Create transaction
      let transaction;
      if (actualUserType === 'driver') {
        transaction = await this.driverService.createTopupTransaction(
          req.user.id,
          amount,
        );
      } else {
        transaction = await this.walletsService.createTopupTransaction(
          req.user.id,
          amount,
        );
      }

      // Generate QR code
      const contentPrefix = actualUserType === 'driver' ? 'DRV' : 'CUST';
      const qrCodeUrl = this.sepayService.generateQRURL(
        amount,
        contentPrefix,
        transaction._id.toString(),
      );

      console.log('[SepayWebhook] ✅ QR generated:', qrCodeUrl);

      return {
        success: true,
        transactionId: transaction._id,
        qrCodeUrl,
        amount,
        accountNo: '0986190053',
        accountName: 'HO VAN TRINH',
        bankName: 'VietComBank',
        content: `${contentPrefix}_${transaction._id.toString().substring(transaction._id.toString().length - 8).toUpperCase()}`,
      };
    } catch (error: any) {
      console.error('[SepayWebhook] Error creating topup:', error);
      throw error;
    }
  }
}
```

### 3. Driver Service Update
**File**: `backend/src/modules/drivers/services/wallet.service.ts`

```typescript
async updateWalletBalance(driverId: string, amount: number) {
  const driver = await this.driverModel.findById(driverId);
  
  if (!driver) {
    throw new NotFoundException('Driver not found');
  }

  driver.walletBalance = (driver.walletBalance || 0) + amount;
  
  // Unlock if balance sufficient
  if (driver.walletBalance >= driver.minimumBalance) {
    driver.isWalletLocked = false;
  }

  await driver.save();
  
  console.log('[WalletService] ✅ Driver wallet updated:', {
    driverId,
    newBalance: driver.walletBalance,
  });

  return driver;
}
```

---

## 📱 Mobile App Implementation

### Driver App (mobile-driver)
```typescript
// POST /api/wallet/sepay/create
const response = await driverService.createSepayTopup(100000);

// Response:
{
  transactionId: "65f12a3b...",
  qrCodeUrl: "https://img.vietqr.io/...",
  content: "DRV_8A9B0C1D",
  amount: 100000,
  accountNo: "0986190053",
  accountName: "HO VAN TRINH"
}

// Show QR code to user
```

### Customer App (mobile-customer)
```typescript
// POST /api/wallet/topup or /api/wallets/topup
const response = await walletService.createSepayTopup(100000);

// Response same as driver but with CUST_ prefix
{
  content: "CUST_8A9B0C1D"
}
```

---

## 🧪 Testing

### 1. Test QR Code Generation
```bash
# Should return proper URL
curl -X POST http://localhost:3000/api/wallet/sepay/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100000}'
```

### 2. Test Webhook Manually
```bash
# Use ngrok
WEBHOOK_URL=https://abc123.ngrok.io/api/wallet/sepay/webhook

curl -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "transferType": "in",
    "transferAmount": 100000,
    "content": "DRV_8A9B0C1D",
    "id": "sepay_123"
  }'
```

### 3. Monitor Logs
```bash
# Watch backend logs for webhook events
npm start 2>&1 | grep -i webhook
npm start 2>&1 | grep -i sepay
```

---

## ✅ Verification Checklist

- [ ] .env has correct SEPAY credentials
- [ ] QR URL generates with correct format
- [ ] Webhook endpoint accessible via ngrok
- [ ] Transaction marked PENDING on creation
- [ ] Webhook received and parsed correctly
- [ ] Transaction marked COMPLETED
- [ ] Driver/Customer wallet balance updated
- [ ] Mobile app shows success message
- [ ] Transaction history shows completed payment

---

## 🆘 Troubleshooting

### QR shows but transfer fails
- Check account number and name
- Verify amount is in VND (no decimals)

### Webhook not called
- Check ngrok URL in Sepay dashboard
- Verify SEPAY_WEBHOOK_URL env var
- Check firewall/network blocking

### Transaction not found
- Verify transaction was created with correct userType
- Check transaction content format (DRV_ or CUST_)
- Look for transaction in last 50 pending

### Amount mismatch
- Ensure int, not float
- Verify transfer amount exact match

