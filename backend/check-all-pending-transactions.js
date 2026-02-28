/**
 * Check All Pending Transactions
 * View all pending topup transactions for debugging
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/firego';

async function checkPendingTransactions() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    
    // Get all pending topup transactions
    const pendingTxs = await db.collection('transactions').find({
      userType: 'driver',
      type: 'topup',
      status: 'pending',
    }).sort({ createdAt: -1 }).toArray();
    
    console.log('═'.repeat(80));
    console.log(`📋 PENDING TOPUP TRANSACTIONS (${pendingTxs.length} total)`);
    console.log('═'.repeat(80));
    console.log('');
    
    if (pendingTxs.length === 0) {
      console.log('   ℹ️  No pending transactions found');
      console.log('');
      console.log('   To create a test transaction, run:');
      console.log('   node test-webhook-live.js');
      console.log('');
    } else {
      for (let i = 0; i < pendingTxs.length; i++) {
        const tx = pendingTxs[i];
        const txIdStr = tx._id.toString();
        const last8 = txIdStr.substring(txIdStr.length - 8).toUpperCase();
        const content = `NAPVI ${last8}`;
        
        console.log(`${i + 1}. Transaction #${i + 1}`);
        console.log('─'.repeat(80));
        console.log('   Full ID:', txIdStr);
        console.log('   Last 8 chars:', last8);
        console.log('   Expected Content:', content);
        console.log('   Amount:', tx.amount.toLocaleString(), 'VND');
        console.log('   Created:', new Date(tx.createdAt).toLocaleString('vi-VN'));
        console.log('   Age:', getAge(tx.createdAt));
        
        // Get driver info
        if (tx.driverId) {
          const driver = await db.collection('drivers').findOne({ _id: new ObjectId(tx.driverId) });
          if (driver) {
            console.log('   Driver:', driver.name, `(${driver.phone})`);
            console.log('   Current Balance:', driver.walletBalance?.toLocaleString() || 0, 'VND');
          }
        }
        
        // Generate QR URL
        const qrUrl = `https://img.vietqr.io/image/970422-0986190053-compact2.png?amount=${tx.amount}&addInfo=${encodeURIComponent(content)}&accountName=HO%20VAN%20TRINH`;
        console.log('   QR Code:', qrUrl);
        console.log('');
      }
      
      console.log('═'.repeat(80));
      console.log('💡 TESTING TIPS:');
      console.log('═'.repeat(80));
      console.log('1. Copy "Expected Content" for bank transfer');
      console.log('2. Transfer EXACT amount shown');
      console.log('3. Wait 1-2 minutes for Sepay webhook');
      console.log('4. Monitor webhook: node monitor-webhook.js');
      console.log('5. Check status: node check-transaction-status.js <Full ID>');
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

function getAge(createdAt) {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now - created;
  
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

checkPendingTransactions();
