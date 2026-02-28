/**
 * Check specific transaction by ID
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/firego';
const TX_ID = process.argv[2] || '698a875b313f393c05af7f2e';

async function checkTransaction() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
const db = client.db();
    
    // Get transaction
    const tx = await db.collection('transactions').findOne({ _id: new ObjectId(TX_ID) });
    
    if (!tx) {
      console.log('❌ Transaction NOT FOUND:', TX_ID);
      console.log('\n💡 Checking all recent topup transactions...\n');
      
      const allTx = await db.collection('transactions').find({
        type: 'topup'
      }).sort({ createdAt: -1 }).limit(10).toArray();
      
      console.log(`Found ${allTx.length} recent topup transactions:`);
      for (const t of allTx) {
        console.log(`- ${t._id} | ${t.status} | ${t.amount} VND | ${new Date(t.createdAt).toLocaleString('vi-VN')}`);
      }
      
      await client.close();
      return;
    }
    
    const txIdStr = tx._id.toString();
    const last8 = txIdStr.substring(txIdStr.length - 8).toUpperCase();
    const expectedContent = `NAPVI ${last8}`;
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 TRANSACTION DETAILS:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Full ID:', txIdStr);
    console.log('Last 8 chars:', last8);
    console.log('Expected Content:', expectedContent);
    console.log('Amount:', tx.amount.toLocaleString(), 'VND');
    console.log('Status:', tx.status.toUpperCase());
    console.log('Created:', new Date(tx.createdAt).toLocaleString('vi-VN'));
    if (tx.completedAt) {
      console.log('Completed:', new Date(tx.completedAt).toLocaleString('vi-VN'));
    }
    console.log('');
    
    // Get driver
    if (tx.driverId) {
      const driver = await db.collection('drivers').findOne({ _id: new ObjectId(tx.driverId) });
      if (driver) {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('👤 DRIVER INFO:');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('Name:', driver.name);
        console.log('Phone:', driver.phone);
        console.log('Current Balance:', driver.walletBalance?.toLocaleString() || 0, 'VND');
        console.log('');
      }
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 DEBUGGING INFO:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    if (tx.status === 'pending') {
      console.log('⚠️  TRANSACTION IS STILL PENDING!');
      console.log('');
      console.log('❓ Possible reasons:');
      console.log('   1. Sepay webhook was never called');
      console.log('   2. Transfer content did not match:', expectedContent);
      console.log('   3. Ngrok is not running or URL changed');
      console.log('   4. Backend is not running');
      console.log('');
      console.log('🔍 Check these:');
      console.log('   1. Backend running? Check: Get-NetTCPConnection -LocalPort 3000');
      console.log('   2. Ngrok running? Check: Get-Process | Where-Object {$_.ProcessName -like "*ngrok*"}');
console.log('   3. Ngrok dashboard: http://127.0.0.1:4040');
      console.log('   4. Sepay webhook logs: https://my.sepay.vn/webhooks/23929');
      console.log('');
      console.log('🧪 Manual test webhook:');
      console.log(`   node test-manual-webhook.js ${txIdStr} 100000 "${expectedContent}"`);
      console.log('');
    } else if (tx.status === 'completed') {
      console.log('✅ TRANSACTION COMPLETED SUCCESSFULLY!');
      console.log('');
      console.log('Balance before:', tx.balanceBefore?.toLocaleString() || 'N/A', 'VND');
      console.log('Balance after:', tx.balanceAfter?.toLocaleString() || 'N/A', 'VND');
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkTransaction();
