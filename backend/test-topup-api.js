/**
 * Test Topup API và kiểm tra xem có lưu vào transactions collection
 * 
 * Chạy script này TRƯỚC KHI gọi API topup, sau đó gọi API, rồi chạy lại
 * để xem có transaction mới không
 */

const { connect, connection } = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/firgo';

async function checkRecentTransactions() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Connected\n');

    const db = connection.db;

    // Check collections exist
    const collections = await db.listCollections().toArray();
    const hasTransactions = collections.some(c => c.name === 'transactions');
    const hasWalletTransactions = collections.some(c => c.name === 'wallettransactions');

    console.log('📂 Collections Status:');
    console.log('═'.repeat(70));
    console.log(`   transactions: ${hasTransactions ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`   wallettransactions: ${hasWalletTransactions ? '⚠️  EXISTS (old)' : '✅ DELETED'}`);

    if (hasTransactions) {
      // Get recent transactions from unified collection
      console.log('\n💰 Recent Transactions (Last 5 from unified collection):');
      console.log('═'.repeat(70));
      
      const recentTxns = await db.collection('transactions')
        .find()
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

      if (recentTxns.length === 0) {
        console.log('   ❌ No transactions found');
        console.log('\n📝 To create a test transaction:');
        console.log('   1. Make sure backend is running: npm run start:dev');
        console.log('   2. Login as driver and get token');
        console.log('   3. Call: POST http://localhost:3000/api/wallet/sepay/create');
        console.log('      Body: { "amount": 100000 }');
        console.log('      Header: Authorization: Bearer YOUR_TOKEN');
      } else {
        recentTxns.forEach((txn, index) => {
          console.log(`\n${index + 1}. ID: ${txn._id}`);
          console.log(`   UserType: ${txn.userType || '⚠️  MISSING'}`);
          console.log(`   Type: ${txn.type}`);
          console.log(`   Amount: ${txn.amount?.toLocaleString()}đ`);
          console.log(`   Status: ${txn.status}`);
          console.log(`   Created: ${txn.createdAt}`);
          
          if (txn.userType === 'driver') {
            console.log(`   ✅ This is a DRIVER transaction (correct!)`);
            console.log(`   Driver ID: ${txn.driverId}`);
          } else if (txn.userType === 'customer') {
            console.log(`   Customer ID: ${txn.customerId}`);
          } else {
            console.log(`   ⚠️  Missing userType field!`);
          }
        });
      }

      // Count by userType
      console.log('\n\n📊 Transaction Count by UserType:');
      console.log('═'.repeat(70));
      
      const driverCount = await db.collection('transactions').countDocuments({ userType: 'driver' });
      const customerCount = await db.collection('transactions').countDocuments({ userType: 'customer' });
      const noTypeCount = await db.collection('transactions').countDocuments({ userType: { $exists: false } });

      console.log(`   Driver: ${driverCount}`);
      console.log(`   Customer: ${customerCount}`);
      console.log(`   No userType: ${noTypeCount}${noTypeCount > 0 ? ' ⚠️' : ''}`);
    }

    if (hasWalletTransactions) {
      const oldCount = await db.collection('wallettransactions').countDocuments();
      console.log(`\n\n⚠️  OLD Collection Still Exists:`);
      console.log('═'.repeat(70));
      console.log(`   wallettransactions: ${oldCount} records`);
      console.log('   This should be migrated to "transactions" collection');
      console.log('   Run: npx ts-node backend/migrate-wallet-transactions.ts');
    }

    console.log('\n\n✅ Check Complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await connection.close();
  }
}

checkRecentTransactions()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
