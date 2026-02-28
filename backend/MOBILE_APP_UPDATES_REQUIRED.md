# 📱 Mobile App Updates Required

## Driver App (mobile-driver)

### Update TopupScreen.tsx

**Current Implementation**: Uses `/api/wallet/sepay/create`  
**New Endpoint**: POST `/api/wallet/sepay/create-topup`

```typescript
// OLD - Don't use anymore:
await walletService.createSepayPayment(amount);

// NEW - Use this:
const response = await axiosInstance.post('/api/wallet/sepay/create-topup', {
  amount: topupAmount,
});

// Response structure:
{
  "success": true,
  "transactionId": "65f12a3b4c5d6e7f8a9b0c1d",
  "qrCodeUrl": "https://img.vietqr.io/image/...",
  "content": "DRV_8A9B0C1D",
  "accountNo": "0986190053",
  "accountName": "HO VAN TRINH",
  "bankName": "VietComBank",
  "bankId": "970422"
}
```

### Update polling logic

```typescript
// Polling to check if payment completed
setInterval(async () => {
  const wallet = await walletService.getBalance();
  // If balance > oldBalance, payment succeeded
  // Display success message and close modal
}, 2000);
```

---

## Customer App (mobile-customer)

### Update WalletScreen.tsx

**Current Implementation**: May be using old endpoints  
**New Endpoint**: POST `/api/wallets/sepay-topup`

```typescript
// OLD - Don't use anymore:
await walletService.deposit(amount, paymentMethodId);

// NEW - Use this:
const response = await axiosInstance.post('/api/wallets/sepay-topup', {
  amount: depositAmount,
});

// Response structure:
{
  "success": true,
  "transactionId": "75g23b4c5d6e7f8a9b0c2d2e",
  "qrCodeUrl": "https://img.vietqr.io/image/...",
  "content": "CUST_9B0C2D2E",
  "accountNo": "0986190053",
  "accountName": "HO VAN TRINH",
  "bankName": "VietComBank",
  "bankId": "970422"
}
```

### Update polling logic

```typescript
// Polling to check if payment completed
setInterval(async () => {
  const wallet = await walletService.getWallet();
  // If balance > oldBalance, payment succeeded
  // Display success message and close modal
}, 2000);
```

---

## Common Updates for Both Apps

### 1. Display QR Code

```typescript
import { Image } from 'react-native';

// In JSX:
<Image
  source={{ uri: response.data.qrCodeUrl }}
  style={{ height: 300, width: 300 }}
  resizeMode="contain"
/>

<Text>Chuyển khoản: {response.data.content}</Text>
<Text>Số tiền: {response.data.amount} VND</Text>
<Text>Tài khoản: {response.data.accountNo}</Text>
<Text>Tên: {response.data.accountName}</Text>
<Text>Ngân hàng: {response.data.bankName}</Text>
```

### 2. Error Handling

```typescript
try {
  const response = await axiosInstance.post(endpoint, { amount });
  // Display QR code
  setQRData(response.data);
  
  // Start polling
  startPolling();
} catch (error) {
  if (error.response?.data?.message) {
    Alert.alert('Lỗi', error.response.data.message);
  } else {
    Alert.alert('Lỗi', 'Không thể tạo yêu cầu nạp tiền');
  }
}
```

### 3. Polling Implementation

```typescript
const [isPolling, setIsPolling] = useState(false);
const [oldBalance, setOldBalance] = useState(0);

const startPolling = () => {
  setIsPolling(true);
  const pollInterval = setInterval(async () => {
    try {
      // Driver: /api/wallet/me
      // Customer: /api/wallets/me
      const walletResponse = await axiosInstance.get(walletEndpoint);
      const newBalance = walletResponse.data.balance;
      
      // If balance increased, payment succeeded
      if (newBalance > oldBalance) {
        clearInterval(pollInterval);
        setIsPolling(false);
        Alert.alert('Thành công', 'Nạp tiền thành công!');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  }, 2000);
  
  // Timeout after 60 seconds
  setTimeout(() => {
    clearInterval(pollInterval);
    setIsPolling(false);
    Alert.alert('Hết thời gian', 'Vui lòng kiểm tra lại sau');
  }, 60000);
};

// Cleanup on unmount
useEffect(() => {
  return () => {
    if (isPolling) {
      // Clear any active polling
    }
  };
}, []);
```

### 4. Success/Failure UI

```typescript
// After confirmation
<Modal visible={showConfirmation}>
  <View style={styles.confirmationView}>
    <Text style={styles.title}>Xác nhận nạp tiền</Text>
    
    <Image
      source={{ uri: qrCodeUrl }}
      style={styles.qrCode}
    />
    
    <Text>Vui lòng quét mã QR để chuyển khoản</Text>
    
    <View style={styles.details}>
      <Text>Số tiền: {amount} VND</Text>
      <Text>Nội dung chuyển: {content}</Text>
      <Text>Tài khoản nhận: {accountNo}</Text>
      <Text>Chủ tài khoản: {accountName}</Text>
    </View>
    
    {isPolling ? (
      <ActivityIndicator size="large" />
    ) : (
      <Button
        title="Đã chuyển khoản"
        onPress={handleConfirmPayment}
      />
    )}
  </View>
</Modal>
```

---

## Testing Checklist

Driver App:
- [ ] TopupScreen opens successfully
- [ ] Enter amount → QR code displays
- [ ] QR code image loads correctly
- [ ] Content shows "DRV_" prefix
- [ ] Polling starts after transfer
- [ ] Success message shows on wallet update
- [ ] Navigation back to wallet works

Customer App:
- [ ] WalletScreen opens successfully
- [ ] Click deposit → Create topup form
- [ ] Enter amount → QR code displays
- [ ] QR code image loads correctly
- [ ] Content shows "CUST_" prefix
- [ ] Polling starts after transfer
- [ ] Success message shows on wallet update
- [ ] Balance updated correctly

---

## Manual Testing Steps

### For Driver:
1. Start driver app
2. Open TopupScreen
3. Enter 100000
4. See QR code with "DRV_" content
5. Use phone to scan and transfer 100000 VND
6. Watch polling indicator
7. See success message
8. Check wallet balance increased

### For Customer:
1. Start customer app
2. Open WalletScreen
3. Click "Deposit" button
4. Enter 50000
5. See QR code with "CUST_" content
6. Use phone to scan and transfer 50000 VND
7. Watch polling indicator
8. See success message
9. Check wallet balance increased

---

## API Endpoint Reference

**Driver Endpoints:**
- Create topup: `POST /api/wallet/sepay/create-topup`
- Get balance: `GET /api/wallet/me`
- Wallet details: `GET /api/wallet/balance`

**Customer Endpoints:**
- Create topup: `POST /api/wallets/sepay-topup`
- Get balance: `GET /api/wallets/me`
- Wallet details: `GET /api/wallets/balance`

---

## Backend Implementation Status

✅ **Completed**:
- Create topup endpoints (driver & customer)
- QR code generation (DRV_ and CUST_ prefixes)
- Webhook handling for both user types
- Wallet balance updates via webhook
- Transaction history tracking

⏳ **Mobile App Updates Needed**:
- Driver: TopupScreen integration
- Customer: WalletScreen integration
- Both: QR display and polling logic

