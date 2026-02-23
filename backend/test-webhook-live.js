/**
 * Live Webhook Testing Tool
 * Creates a real pending transaction and provides instructions to trigger Sepay webhook
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/firego';

async function createTestTransaction() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    
    // Get first driver
    const driver = await db.collection('drivers').findOne({});
    if (!driver) {
      console.error('❌ No drivers found in database. Please run seed first.');
      return;
    }
    
    console.log('📱 Driver Found:');
    console.log('   Name:', driver.name);
    console.log('   Phone:', driver.phone);
    console.log('   Current Balance:', driver.walletBalance?.toLocaleString() || 0, 'VND\n');
    
    // Create test transaction
    const amount = 50000; // 50k VND for testing
    const transaction = {
      _id: new ObjectId(),
      userType: 'driver',
      driverId: driver._id,
      type: 'topup',
      amount: amount,
      status: 'pending',
      paymentMethod: 'bank_transfer',
      description: `Nạp tiền vào ví - Test webhook`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.collection('transactions').insertOne(transaction);
    
    const txIdStr = transaction._id.toString();
    const last8Chars = txIdStr.substring(txIdStr.length - 8).toUpperCase();
    const content = `NAPVI ${last8Chars}`;
    
    console.log('✅ Test Transaction Created!\n');
    console.log('═'.repeat(70));
    console.log('📋 TRANSACTION DETAILS:');
    console.log('═'.repeat(70));
    console.log('   Transaction ID:', txIdStr);
    console.log('   Last 8 chars:', last8Chars);
    console.log('   Amount:', amount.toLocaleString(), 'VND');
    console.log('   Status: PENDING');
    console.log('   Created:', transaction.createdAt.toLocaleString('vi-VN'));
    console.log('');
    
    console.log('═'.repeat(70));
    console.log('💳 BANK TRANSFER INFO:');
    console.log('═'.repeat(70));
    console.log('   Bank: MB Bank (970422)');
    console.log('   Account Number: 0986190053');
    console.log('   Account Name: HO VAN TRINH');
    console.log('   Amount:', amount.toLocaleString(), 'VND');
    console.log('   Content:', content);
    console.log('');
    
    console.log('═'.repeat(70));
    console.log('🎯 TESTING INSTRUCTIONS:');
    console.log('═'.repeat(70));
    console.log('1. Make sure backend and ngrok are running:');
    console.log('   - Backend: npm run start:dev (port 3000)');
    console.log('   - Ngrok: .\\ngrok.exe http 3000');
    console.log('');
    console.log('2. Start webhook monitor in new terminal:');
    console.log('   node monitor-webhook.js');
    console.log('');
    console.log('3. Transfer money to bank account with EXACT content:');
    console.log(`   Content: ${content}`);
    console.log('   Amount:', amount.toLocaleString(), 'VND');
    console.log('');
    console.log('4. Watch monitor-webhook.js for webhook notification');
    console.log('');
    console.log('5. Check transaction status after ~1-2 minutes:');
    console.log(`   node check-transaction-status.js ${txIdStr}`);
    console.log('');
    
    console.log('═'.repeat(70));
    console.log('🔍 QR CODE URL (VietQR):');
    console.log('═'.repeat(70));
    const qrUrl = `https://img.vietqr.io/image/970422-0986190053-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=HO%20VAN%20TRINH`;
    console.log(qrUrl);
    console.log('');
    
    console.log('💡 TIP: You can scan this QR with banking app to auto-fill transfer info\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

createTestTransaction();
