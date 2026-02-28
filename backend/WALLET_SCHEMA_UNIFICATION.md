# Database Schema Unification - Wallet Transactions

## Overview
Merged driver `wallettransactions` collection into unified `transactions` collection with `userType` discriminator field.

## Changes Made

### 1. Unified Schema (`backend/src/modules/wallets/schemas/transaction.schema.ts`)

**Added:**
- `userType: 'customer' | 'driver'` - Discriminator field
- `driverId: ObjectId` - Driver reference (parallel to customerId)
- `tripId: ObjectId` - Trip reference for driver commissions
- `commissionRate: number` - Commission percentage
- `bankAccountNumber: string` - Direct bank details for drivers
- `bankName: string`
- `accountHolderName: string`
- `completedAt: Date`
- `note: string`

**Merged Enums:**
```typescript
// TransactionType now includes both customer and driver types
TOP_UP, PAYMENT, REFUND, TRANSFER, EARNING, WITHDRAWAL, DEPOSIT, WITHDRAW,
TOPUP, COMMISSION, BONUS, PENALTY

// TransactionStatus
PENDING, PROCESSING, TRANSFERRING, COMPLETED, SUCCESS, FAILED, CANCELLED

// PaymentMethod
BANK_TRANSFER, MOMO, ZALOPAY, VNPAY, CASH
```

**Indexes:**
- Added: `{ userType: 1 }`
- Added: `{ driverId: 1, createdAt: -1 }`
- Added: `{ type: 1, driverId: 1 }`
- Added: `{ tripId: 1 }`
- Kept all existing customer indexes

### 2. Updated WalletService (`backend/src/modules/drivers/services/wallet.service.ts`)

**Changes:**
- Import `Transaction` from `wallets/schemas/transaction.schema`
- All new transactions include `userType: UserType.DRIVER`
- All queries filter by `{ userType: UserType.DRIVER, driverId: ... }`
- Uses `transactionModel` instead of `walletTransactionModel`

**Methods Updated:**
- `topup()` - Creates driver topup transactions
- `withdraw()` - Creates withdrawal requests
- `deductCommission()` - Deducts commission from trips
- `getTransactions()` - Gets driver transaction history
- `getStats()` - Calculates earnings stats
- `findPendingTransactionByContent()` - Sepay webhook lookup
- `completeTopupTransaction()` - Completes Sepay transfers
- `getAllTransactions()` - Admin queries

### 3. Updated DriversModule (`backend/src/modules/drivers/drivers.module.ts`)

**Changes:**
- Import `Transaction` and `TransactionSchema` from wallets module
- Register Transaction model: `{ name: Transaction.name, schema: TransactionSchema }`
- Removed `WalletTransaction` and `WalletTransactionSchema`

### 4. Updated Controllers

**WalletAdminController:**
- Import `TransactionType`, `TransactionStatus` from unified schema

**WalletController:**
- Import `PaymentMethod` from unified schema

## Migration

### Running the Migration Script

```bash
cd backend
npx ts-node migrate-wallet-transactions.ts
```

The script will:
1. Connect to MongoDB
2. Count existing driver wallet transactions
3. Copy all `wallettransactions` → `transactions` with `userType: 'driver'`
4. Skip already migrated records (by `_id`)
5. Print migration summary

**Output:**
```
🔄 Connecting to MongoDB...
✅ Connected to MongoDB
📊 Found 1234 driver wallet transactions to migrate
🔄 Starting migration...
   Migrated 100/1234...
   Migrated 200/1234...
   ...

✅ Migration completed!
   - Migrated: 1234
   - Skipped (already exists): 0
   - Total processed: 1234

⚠️  Old collection 'wallettransactions' still exists.
   To drop it manually, run:
   > use firgo
   > db.wallettransactions.drop()
```

### Manual Cleanup (After Verification)

**DO NOT drop the old collection until you've verified the migration:**

1. Check transaction counts match:
```javascript
> use firgo
> db.wallettransactions.countDocuments()  // Old count
> db.transactions.countDocuments({ userType: 'driver' })  // Should match
```

2. Verify sample data:
```javascript
> db.transactions.findOne({ userType: 'driver', type: 'topup' })
> db.transactions.findOne({ userType: 'driver', type: 'commission' })
```

3. Test app functionality:
- Driver topup flow
- Admin wallet transactions page
- Earnings screen
- Commission deduction

4. **After confirming everything works**, drop old collection:
```javascript
> db.wallettransactions.drop()
```

## Query Examples

### Customer Transactions
```typescript
await transactionModel.find({ 
  userType: UserType.CUSTOMER,
  customerId: customerId 
});
```

### Driver Transactions
```typescript
await transactionModel.find({ 
  userType: UserType.DRIVER,
  driverId: driverId 
});
```

### All Topup Transactions (Both Types)
```typescript
await transactionModel.find({ 
  type: { $in: [TransactionType.TOP_UP, TransactionType.TOPUP] },
  status: TransactionStatus.PENDING
});
```

### Admin: All Transactions
```typescript
await transactionModel.find()
  .populate('customerId', 'firstName lastName phoneNumber')
  .populate('driverId', 'firstName lastName phoneNumber');
```

## Benefits

✅ **Single Source of Truth** - All monetary transactions in one collection
✅ **Easier Reporting** - Query all transactions without union queries
✅ **Reduced Code Duplication** - One schema, shared enums
✅ **Better Data Consistency** - Unified field names and types
✅ **Simplified Admin Queries** - Filter by userType instead of multiple collections

## Backward Compatibility

- Old enum values preserved (both `TOPUP` and `TOP_UP` supported)
- All existing customer transactions untouched
- Driver balance calculations unchanged
- Sepay webhook integration works with unified schema

## Files Changed

**Backend:**
- `src/modules/wallets/schemas/transaction.schema.ts` - Extended schema
- `src/modules/drivers/services/wallet.service.ts` - Updated all methods
- `src/modules/drivers/drivers.module.ts` - Changed model registration
- `src/modules/drivers/controllers/wallet-admin.controller.ts` - Updated imports
- `src/modules/drivers/controllers/wallet.controller.ts` - Updated imports
- `migrate-wallet-transactions.ts` - Migration script (new)

**No Frontend Changes Required:**
- Web admin queries backend API (透明切换)
- Mobile apps use service layer (no schema knowledge)

## Rollback Plan

If issues occur:
1. Restore old `wallettransactions` collection from backup
2. Revert `DriversModule` to use `WalletTransaction` model
3. Revert `WalletService` imports and queries
4. Delete migrated driver records from `transactions`:
   ```javascript
   > db.transactions.deleteMany({ userType: 'driver' })
   ```

## Testing Checklist

- [ ] Run migration script successfully
- [ ] Verify record count matches
- [ ] Test driver topup (Sepay webhook)
- [ ] Test driver withdrawal request
- [ ] Test commission deduction from trip
- [ ] Test earnings screen stats
- [ ] Test admin wallet transactions page
- [ ] Verify customer transactions unaffected
- [ ] Drop old `wallettransactions` collection

---

**Note:** Always backup your database before running migrations!
```bash
mongodump --uri="mongodb://localhost:27017/firgo" --out=./backup-before-migration
```
