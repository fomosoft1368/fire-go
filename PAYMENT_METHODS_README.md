# 💳 Payment Methods Feature

Complete payment method management system for Fire-Go customer app. Customers can save and manage multiple credit cards, debit cards, and bank accounts.

## 🎨 UI Features

### Payment Methods List Screen
- **Beautiful Card Design**: Color-coded by payment type
  - 💳 Credit Card: Blue gradient
  - 💳 Debit Card: Green gradient  
  - 🏦 Bank Account: Purple gradient
  - 👛 Wallet: Red gradient

- **Card Information Display**:
  - Payment method icon (emoji)
  - Method type (localized Vietnamese)
  - Custom name (user-friendly)
  - Masked card number (last 4 digits)
  - Masked account number
  - Default payment badge with checkmark

- **Card Actions**:
  - Set as Default (if not already)
  - Edit method (placeholder for future)
  - Delete with confirmation dialog

- **Additional Features**:
  - Pull-to-refresh to reload list
  - Empty state with wallet icon
  - Loading indicator on first load
  - Success/error alerts for all actions

### Add Payment Method Modal
- **Type Selection**: 4 payment types available
- **Dynamic Form Fields**: Fields change based on type
- **Card Type Fields**:
  - Card number (last 4 digits)
  - Cardholder name
  - Expiry date (MM/YY)

- **Bank Type Fields**:
  - Bank name
  - Account number
  - Account holder name

- **All Types**: Require custom name for easy identification

## 🔧 Backend API

### Base URL
```
/api/payment-methods
```

### Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer {token}
```

### Endpoints

#### 1. Create Payment Method
```http
POST /api/payment-methods
Content-Type: application/json

{
  "type": "credit_card",
  "name": "My VISA",
  "cardNumber": "1234",
  "cardholderName": "NGUYEN VAN A",
  "expiryDate": "12/26",
  "isDefault": false
}
```

**Response (201)**:
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
  "isDefault": false,
  "isActive": true,
  "createdAt": "2026-01-08T10:30:00Z",
  "updatedAt": "2026-01-08T10:30:00Z"
}
```

#### 2. Get All Payment Methods
```http
GET /api/payment-methods
```

**Response (200)**: Array of payment methods (sorted by default first, then by creation date)

#### 3. Get Default Payment Method
```http
GET /api/payment-methods/default
```

**Response (200)**:
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

**Response (404)**: If no default method set
```json
null
```

#### 4. Update Payment Method
```http
PATCH /api/payment-methods/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "isDefault": true
}
```

**Response (200)**: Updated payment method object

#### 5. Set as Default
```http
PATCH /api/payment-methods/:id/set-default
```

**Behavior**:
- Sets this method as default
- Automatically unsets all other defaults
- Returns updated method object

**Response (200)**: Updated payment method with `isDefault: true`

#### 6. Delete Payment Method
```http
DELETE /api/payment-methods/:id
```

**Behavior**: Soft delete (marks as inactive, preserves data)

**Response (204)**: No content

## 📱 Frontend Service Usage

### Import Service
```typescript
import { paymentMethodService, PaymentMethod } from '../services/paymentMethodService'
```

### Get All Methods
```typescript
const methods = await paymentMethodService.getPaymentMethods()
// Returns: PaymentMethod[]
```

### Get Default Method
```typescript
const defaultMethod = await paymentMethodService.getDefaultPaymentMethod()
// Returns: PaymentMethod | null
```

### Create New Method
```typescript
const newMethod = await paymentMethodService.createPaymentMethod({
  type: 'credit_card',
  name: 'My VISA',
  cardNumber: '1234',
  cardholderName: 'NGUYEN VAN A',
  expiryDate: '12/26',
  isDefault: false,
})
```

### Update Method
```typescript
const updated = await paymentMethodService.updatePaymentMethod(methodId, {
  name: 'Updated Name',
})
```

### Set as Default
```typescript
const setDefault = await paymentMethodService.setDefaultPaymentMethod(methodId)
```

### Delete Method
```typescript
await paymentMethodService.deletePaymentMethod(methodId)
```

## 🗂️ File Structure

### Backend
```
backend/src/modules/payment/
├── schemas/
│   ├── payment.schema.ts (existing)
│   └── payment-method.schema.ts (NEW)
├── dto/
│   ├── create-payment.dto.ts (existing)
│   ├── payment-method.dto.ts (NEW)
│   └── index.ts
├── payment.service.ts (existing)
├── payment-method.service.ts (NEW)
├── payment.controller.ts (existing)
├── payment-method.controller.ts (NEW)
└── payment.module.ts (updated)
```

### Frontend
```
mobile-customer/src/
├── services/
│   └── paymentMethodService.ts (NEW)
├── screens/
│   ├── PaymentMethodsScreen.tsx (NEW)
│   ├── ProfileScreen.tsx (updated)
│   └── index.ts (updated)
└── App.tsx (updated)
```

## 🚀 Usage Flow

### 1. User Navigates to Payment Methods
- User opens Profile → Payment Methods
- Screen loads and fetches all payment methods
- List displays with default method highlighted

### 2. Add New Payment Method
- User clicks "+" button
- Modal shows up with payment type selector
- User selects type and fills required fields
- Clicks "Add" to submit
- Method is created and appears in list
- Success alert shown

### 3. Set as Default
- User clicks "Set Default" on a card
- Request sent to backend
- Other defaults are cleared
- List updates with new default badge
- Success alert shown

### 4. Delete Payment Method
- User clicks "Delete" on a card
- Confirmation dialog appears
- User confirms deletion
- Method is soft-deleted
- List updates and method disappears
- Success alert shown

## 🔐 Security

- JWT authentication on all endpoints
- User isolation (can only manage own methods)
- Soft deletes (data preserved, marked inactive)
- Sensitive data masking:
  - Card numbers: Show last 4 digits only
  - Account numbers: Masked except last 4 digits
- No CVV storage (best practice)
- Input validation on all fields

## 🎯 Data Validation

### Card Type
- Required field
- Must be one of: credit_card, debit_card, bank_account, wallet

### Name
- Required field
- Displayed to user as friendly identifier
- Example: "My VISA", "Vietcombank Account"

### Card Number (Credit/Debit)
- Optional for storage
- Must be 4 digits (last 4 only)
- Stored as "****" + last 4 digits in response

### Cardholder Name
- Optional field
- Full name format preferred

### Expiry Date
- Format: MM/YY (e.g., "12/26")
- Optional field

### Bank Details
- Bank name: Required for bank accounts
- Account number: Required for bank accounts
- Account holder: Required for bank accounts

## 🌐 Localization

All UI text is in Vietnamese (Tiếng Việt):
- Labels and buttons
- Error messages
- Success alerts
- Placeholders

## 📊 Database Schema

```typescript
{
  customerId: ObjectId,        // Reference to Customer
  type: String,                // credit_card, debit_card, bank_account, wallet
  name: String,                // "My VISA"
  cardNumber: String,          // "****1234"
  cardholderName: String,      // "NGUYEN VAN A"
  expiryDate: String,          // "12/26"
  bankName: String,            // "Vietcombank"
  accountNumber: String,       // "0123456789"
  accountHolder: String,       // "NGUYEN VAN A"
  isDefault: Boolean,          // true/false
  isActive: Boolean,           // true/false (soft delete)
  deletedAt: Date,             // Soft delete timestamp
  metadata: Object,            // Extra data for future use
  createdAt: Date,             // Auto
  updatedAt: Date              // Auto
}
```

## ⚡ Performance

- Indexes: `{ customerId: 1, isActive: 1 }`
- Fast lookups for user's active methods
- Efficient default method queries

## 🔮 Future Enhancements

1. **Edit Screen**: Edit payment method details
2. **Payment Integration**: Use selected method for payments
3. **Transaction History**: Show recent transactions per method
4. **Card Validation**: Implement Luhn algorithm for cards
5. **Advanced Security**: 
   - PCI DSS compliance
   - Tokenization with payment gateway
   - CVV verification on first use
   - Audit logging
6. **Analytics**: Track method usage statistics
7. **Spending Limits**: Set limits per payment method
8. **Backup Methods**: Auto-fallback for failed transactions
9. **QR Code**: Generate QR for bank transfers
10. **Notifications**: Alert on method expiry or unauthorized use

## 🐛 Known Issues

None at this time.

## ✅ Testing Checklist

- [ ] Create credit card payment method
- [ ] Create debit card payment method
- [ ] Create bank account payment method
- [ ] Create wallet payment method
- [ ] View all payment methods
- [ ] Set as default payment method
- [ ] Delete payment method (confirm dialog)
- [ ] Update payment method name
- [ ] Pull to refresh list
- [ ] Empty state displays correctly
- [ ] Form validation works
- [ ] Success alerts show
- [ ] Error handling works
- [ ] Loading state displays
- [ ] Back button navigation works

## 📝 License

Part of Fire-Go rideshare platform
