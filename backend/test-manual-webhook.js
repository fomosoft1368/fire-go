/**
 * MANUAL TEST - Giả lập Sepay Webhook (Không cần API thật)
 * 
 * Flow:
 * 1. Tạo giao dịch nạp tiền → Lấy transactionId
 * 2. Chạy script này để giả lập webhook
 * 3. Tiền tự động cộng vào ví
 */

const BACKEND_URL = 'http://localhost:3000';

async function simulateWebhook() {
  console.log('🧪 MANUAL WEBHOOK TEST - Giả lập Sepay\n');

  // Step 1: List recent pending transactions
  console.log('📋 Step 1: Lấy danh sách giao dịch PENDING...');
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/firgo');

  const db = mongoose.connection.db;
  const pendingTxns = await db.collection('transactions')
    .find({
      userType: 'driver',
      type: { $in: ['topup', 'TOPUP'] },
      status: { $in: ['pending', 'PENDING'] },
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();

  if (pendingTxns.length === 0) {
    console.log('❌ Không có giao dịch PENDING nào!');
    console.log('\nCách tạo giao dịch:');
    console.log('1. Login driver trong mobile app');
    console.log('2. Vào Wallet → Nạp tiền → Nhập số tiền');
    console.log('3. Hoặc gọi API: POST /api/wallet/sepay/create');
    await mongoose.connection.close();
    return;
  }

  console.log(`\n✅ Tìm thấy ${pendingTxns.length} giao dịch PENDING:\n`);
  pendingTxns.forEach((txn, i) => {
    const txnId = txn._id.toString();
    const last8 = txnId.substring(txnId.length - 8).toUpperCase();
    console.log(`${i + 1}. ID: ${txnId}`);
    console.log(`   Amount: ${txn.amount.toLocaleString()}đ`);
    console.log(`   Content: NAPVI ${last8}`);
    console.log(`   Created: ${txn.createdAt}`);
    console.log('');
  });

  // Step 2: Select transaction to simulate
  const selectedTxn = pendingTxns[0];
  const txnId = selectedTxn._id.toString();
  const last8 = txnId.substring(txnId.length - 8).toUpperCase();
  const content = `NAPVI ${last8}`;

  console.log(`🎯 Giả lập webhook cho giao dịch đầu tiên:`);
  console.log(`   Transaction ID: ${txnId}`);
  console.log(`   Amount: ${selectedTxn.amount.toLocaleString()}đ`);
  console.log(`   Content: ${content}\n`);

  // Step 3: Call webhook API
  console.log('📡 Step 2: Gọi webhook API...\n');

  const webhookPayload = {
    id: `sepay_manual_${Date.now()}`,
    gateway: 'VIETQR',
    transactionDate: new Date().toISOString(),
    accountNumber: '0986190053',
    transferType: 'in',
    transferAmount: selectedTxn.amount,
    accumulated: 0,
    code: '970422',
    content: content, // NAPVI ABC12345
    description: `Nạp tiền ${selectedTxn.amount.toLocaleString()}đ`,
    referenceCode: `REF${Date.now()}`,
    subAccount: '',
    bankBrandName: 'MB Bank',
  };

  console.log('Payload gửi đến webhook:');
  console.log(JSON.stringify(webhookPayload, null, 2));
  console.log('');

  try {
    const response = await fetch(`${BACKEND_URL}/api/wallet/sepay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    const result = await response.json();
    
    console.log('📥 Response từ webhook:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');

    if (result.success) {
      console.log('✅ THÀNH CÔNG! Webhook đã xử lý giao dịch');
      console.log('');

      // Step 4: Verify balance updated
      console.log('🔍 Step 3: Kiểm tra số dư đã cập nhật...\n');

      const updatedTxn = await db.collection('transactions').findOne({ _id: selectedTxn._id });
      const driver = await db.collection('drivers').findOne({ _id: selectedTxn.driverId });

      console.log('Transaction sau khi cập nhật:');
      console.log(`   Status: ${updatedTxn.status} ${updatedTxn.status === 'completed' ? '✅' : '❌'}`);
      console.log(`   Balance Before: ${updatedTxn.balanceBefore?.toLocaleString() || 'N/A'}đ`);
      console.log(`   Balance After: ${updatedTxn.balanceAfter?.toLocaleString() || 'N/A'}đ`);
      console.log('');

      if (driver) {
        console.log('Driver wallet:');
        console.log(`   Current Balance: ${driver.walletBalance?.toLocaleString() || 0}đ ✅`);
        console.log(`   Is Locked: ${driver.isWalletLocked || false}`);
      }

      console.log('\n🎉 HOÀN THÀNH! Tiền đã được cộng vào ví tài xế!');
    } else {
      console.log('❌ LỖI! Webhook không xử lý được:');
      console.log(`   Error: ${result.error || result.message}`);
    }

  } catch (error) {
    console.error('❌ Lỗi khi gọi webhook:', error.message);
    console.log('\n💡 Kiểm tra:');
    console.log('   1. Backend có chạy không? (npm run start:dev)');
    console.log('   2. URL đúng không? (http://localhost:3000)');
    console.log('   3. Check console backend xem có log gì không');
  }

  await mongoose.connection.close();
}

// Run test
simulateWebhook()
  .then(() => {
    console.log('\n✨ Test hoàn tất!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
