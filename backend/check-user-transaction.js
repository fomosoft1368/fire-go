/**
 * Check transaction with correct MongoDB Atlas connection
 */

const { MongoClient, ObjectId } = require('mongodb');

// Read .env for MongoDB URI
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/firego';
const TX_ID = '698a875b313f393c05af7f2e'; // From user

async function checkTransaction() {
  console.log('🔗 Connecting to:', MONGO_URI.substring(0, 30) + '...');
  
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
        const last8 = t._id.toString().substring(t._id.toString().length - 8).toUpperCase();
        console.log(`\n- ID: ${t._id}`);
        console.log(`  Last 8: ${last8}`);
        console.log(`  Content: NAPVI ${last8}`);
        console.log(`  Status: ${t.status}`);
        console.log(`  Amount: ${t.amount.toLocaleString()} VND`);
        console.log(`  Created: ${new Date(t.createdAt).toLocaleString('vi-VN')}`);
      }
      
      await client.close();
      return;
    }
    
    const txIdStr = tx._id.toString();
    const last8 = txIdStr.substring(txIdStr.length - 8).toUpperCase();
    const expectedContent = `NAPVI ${last8}`;
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 TRANSACTION FOUND:');
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
    console.log('🔍 WHAT TO DO NEXT:');
    console.log('═══════════════════════════════════════════════════════════════');
    
    if (tx.status === 'pending') {
      console.log('⚠️  TRANSACTION IS PENDING!');
      console.log('');
      console.log('✅ You need to transfer money with this content:');
      console.log('   Bank: MB Bank (970422)');
      console.log('   Account: 0986190053');
      console.log('   Name: HO VAN TRINH');
      console.log('   Amount:', tx.amount.toLocaleString(), 'VND');
      console.log('   Content:', expectedContent);
      console.log('');
      console.log('🔍 After transfer, check:');
      console.log('   1. Backend logs for webhook');
      console.log('   2. Ngrok dashboard: http://127.0.0.1:4040');
      console.log('   3. Sepay logs: https://my.sepay.vn/webhooks/23929');
      console.log('');
      console.log('🧪 Or test manually:');
      console.log(`   node test-manual-webhook.js ${txIdStr}`);
      console.log('');
    } else if (tx.status === 'completed') {
      console.log('✅ TRANSACTION ALREADY COMPLETED!');
      console.log('');
      console.log('Balance before:', tx.balanceBefore?.toLocaleString() || 'N/A', 'VND');
      console.log('Balance after:', tx.balanceAfter?.toLocaleString() || 'N/A', 'VND');
      console.log('Completed at:', new Date(tx.completedAt).toLocaleString('vi-VN'));
      console.log('');
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkTransaction();
