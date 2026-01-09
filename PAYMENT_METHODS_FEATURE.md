# Payment Methods Feature - Implementation Guide

## Overview
Added complete Payment Methods feature to manage customer's saved credit cards, debit cards, and bank accounts.

## Backend Implementation

### 1. Database Schema
**File**: `src/modules/payment/schemas/payment-method.schema.ts`
- `customerId`: Reference to Customer
- `type`: credit_card | debit_card | bank_account | wallet
- `name`: Display name (e.g., "My VISA", "Vietcombank Account")
- `cardNumber`: Last 4 digits (masked)
- `expiryDate`: MM/YY format for cards
- `bankName`: Name of the bank
- `accountNumber`: Bank account number
- `isDefault`: Mark as default payment method
- `isActive`: Soft delete support

### 2. Service Layer
**File**: `src/modules/payment/payment-method.service.ts`
- `createPaymentMethod()`: Add new payment method
- `getPaymentMethods()`: Get all customer's methods
- `getDefaultPaymentMethod()`: Get default payment method
- `updatePaymentMethod()`: Update method details
- `deletePaymentMethod()`: Soft delete method
- `setDefaultPaymentMethod()`: Set as default
- Auto-unsets other defaults when setting new default
- Auto-masks sensitive data

### 3. REST API
**File**: `src/modules/payment/payment-method.controller.ts`
**Base Route**: `/api/payment-methods` (all require JWT)

#### Endpoints:
```
POST   /api/payment-methods              - Create new payment method
GET    /api/payment-methods              - Get all payment methods
GET    /api/payment-methods/default      - Get default payment method
PATCH  /api/payment-methods/:id          - Update payment method
DELETE /api/payment-methods/:id          - Delete payment method
PATCH  /api/payment-methods/:id/set-default - Set as default
```

#### Payload Examples:

**Create Payment Method**:
```json
{
  "type": "credit_card",
  "name": "My VISA",
  "cardNumber": "1234",
  "cardholderName": "NGUYEN VAN A",
  "expiryDate": "12/26",
  "isDefault": false
}
```

**Create Bank Account**:
```json
{
  "type": "bank_account",
  "name": "Vietcombank Account",
  "bankName": "Vietcombank",
  "accountNumber": "0123456789",
  "accountHolder": "NGUYEN VAN A",
  "isDefault": true
}
```

### 4. Module Integration
**File**: `src/modules/payment/payment.module.ts`
- Added PaymentMethod schema to MongooseModule
- Added PaymentMethodService to providers
- Added PaymentMethodController to controllers
- Added services to exports for reuse

---

## Frontend Implementation

### 1. Service Layer
**File**: `src/services/paymentMethodService.ts`
- Handles all API communication
- Token management via AsyncStorage
- Error handling and logging
- TypeScript interfaces for type safety

#### Methods:
```typescript
getPaymentMethods(): Promise<PaymentMethod[]>
getDefaultPaymentMethod(): Promise<PaymentMethod | null>
createPaymentMethod(data): Promise<PaymentMethod>
updatePaymentMethod(methodId, data): Promise<PaymentMethod>
setDefaultPaymentMethod(methodId): Promise<PaymentMethod>
deletePaymentMethod(methodId): Promise<void>
```

### 2. Payment Methods Screen
**File**: `src/screens/PaymentMethodsScreen.tsx`

#### Features:
✅ **Display Payment Methods**
- Beautiful card design with type-specific colors
  - Credit Card: Blue (#3B82F6)
  - Debit Card: Green (#10B981)
  - Bank Account: Purple (#A78BFA)
  - Wallet: Red (#FCA5A5)
- Show default badge with checkmark
- Display masked sensitive info
- Last 4 digits for cards
- Masked account numbers

✅ **Card Actions**
- Set as default (button hidden if already default)
- Edit payment method
- Delete with confirmation
- Pull-to-refresh to reload

✅ **Add Payment Method Modal**
- Type selector (4 payment types)
- Dynamic form fields based on type
- Card info fields: cardholderName, expiryDate
- Bank fields: bankName, accountNumber, accountHolder
- Validation before submission
- Success feedback

✅ **Empty State**
- Wallet icon
- Message: "Chưa có phương thức thanh toán"
- Direct "Add" button

#### UI Components:
- Header with back button & add button
- Payment method cards with icon
- Modal for adding new methods
- Form inputs with icons
- Type selector with visual feedback
- Action buttons (Set Default, Edit, Delete)
- Pull-to-refresh
- Loading state
- Empty state

---

## Integration Points

### 1. Navigation
**File**: `src/App.tsx`
- Added `PaymentMethodsScreen` import
- Added screen to Stack Navigator
- Route: `PaymentMethods`

### 2. Profile Screen
**File**: `src/screens/ProfileScreen.tsx`
- Updated account menu item
- Added navigation handler
- Links to PaymentMethodsScreen

### 3. Update Exports
**File**: `src/screens/index.ts`
- Exported PaymentMethodsScreen

---

## API Response Format

```json
{
  "_id": "67a1234567890123456789ab",
  "customerId": "694e3210b3ef14d062806614",
  "type": "credit_card",
  "name": "My VISA",
  "cardNumber": "****1234",
  "cardholderName": "NGUYEN VAN A",
  "expiryDate": "12/26",
  "icon": "💳",
  "isDefault": true,
  "isActive": true,
  "createdAt": "2026-01-08T10:30:00Z",
  "updatedAt": "2026-01-08T10:30:00Z"
}
```

---

## Testing Guide

### Backend Testing:
```bash
# 1. Create payment method
POST /api/payment-methods
Authorization: Bearer {token}
{
  "type": "credit_card",
  "name": "Test Card",
  "cardNumber": "1234",
  "cardholderName": "TEST USER",
  "expiryDate": "12/26"
}

# 2. Get all payment methods
GET /api/payment-methods
Authorization: Bearer {token}

# 3. Get default payment method
GET /api/payment-methods/default
Authorization: Bearer {token}

# 4. Set as default
PATCH /api/payment-methods/{id}/set-default
Authorization: Bearer {token}

# 5. Delete payment method
DELETE /api/payment-methods/{id}
Authorization: Bearer {token}
```

### Frontend Testing:
1. Navigate to Profile → Payment Methods
2. Click "+" button to add new method
3. Select type (Credit Card, Debit Card, Bank Account, Wallet)
4. Fill required fields (name, and type-specific fields)
5. Submit form
6. Verify card appears in list
7. Test "Set as Default" (mark with checkmark)
8. Test "Delete" (with confirmation)
9. Test "Edit" (when implemented)
10. Pull down to refresh list

---

## Future Enhancements

1. **Edit Screen**: Create EditPaymentMethodScreen component
2. **Encryption**: Encrypt sensitive card data in database
3. **Validation**: Add card validation (Luhn algorithm for cards)
4. **Tokenization**: Integrate with payment gateway tokenization
5. **Transaction History**: Show recent transactions per method
6. **Analytics**: Track which methods are used most
7. **Security**: Add CVV verification on first use
8. **Limits**: Set spending limits per payment method
9. **Notifications**: Notify on unauthorized use attempts
10. **Backup Methods**: Auto-switch to backup if primary fails

---

## Database Indexes
- `{ customerId: 1, isActive: 1 }` - For active methods lookup

---

## Security Considerations

✅ **Implemented**:
- JWT authentication required
- Soft deletes (not hard delete)
- User isolation (can only manage own methods)
- Card number masking
- Account number masking

⚠️ **To Do**:
- SSL/TLS enforcement
- Payment gateway tokenization (don't store full card numbers)
- PCI DSS compliance
- Audit logging for sensitive operations
- Rate limiting on API endpoints

---

## File Summary

### Backend Files Created/Modified:
```
src/modules/payment/
├── schemas/
│   └── payment-method.schema.ts (NEW)
├── dto/
│   ├── payment-method.dto.ts (NEW)
│   └── index.ts (MODIFIED)
├── payment-method.controller.ts (NEW)
├── payment-method.service.ts (NEW)
└── payment.module.ts (MODIFIED)
```

### Frontend Files Created/Modified:
```
mobile-customer/src/
├── services/
│   └── paymentMethodService.ts (NEW)
├── screens/
│   ├── PaymentMethodsScreen.tsx (NEW)
│   ├── ProfileScreen.tsx (MODIFIED)
│   └── index.ts (MODIFIED)
└── App.tsx (MODIFIED)
```

---

## Next Steps

1. ✅ Backend: Create payment method endpoints
2. ✅ Frontend: Create PaymentMethodsScreen
3. ✅ Integration: Add to navigation
4. ⏳ Edit Screen: Create EditPaymentMethodScreen component
5. ⏳ Wallet Integration: Use selected payment method for payments
6. ⏳ Payment Processing: Integrate with VNPay/Stripe
