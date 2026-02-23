const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH';

async function checkTransaction() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    
    // Check transaction
    const transaction = await db.collection('transactions').findOne({
      _id: new ObjectId('6989a32913d67c16edde68d0')
    });
    
    if (transaction) {
      console.log('📄 Transaction Details:');
      console.log('  ID:', transaction._id);
      console.log('  Type:', transaction.type);
      console.log('  Status:', transaction.status);
      console.log('  Amount:', transaction.amount.toLocaleString('vi-VN'), 'đ');
      console.log('  Balance Before:', transaction.balanceBefore?.toLocaleString('vi-VN') || 'N/A');
      console.log('  Balance After:', transaction.balanceAfter?.toLocaleString('vi-VN') || 'N/A');
      console.log('  Created:', transaction.createdAt);
      console.log('  Completed:', transaction.completedAt || 'Not completed');
      console.log();
    } else {
      console.log('❌ Transaction not found');
    }
    
    // Check driver balance
    const driver = await db.collection('drivers').findOne({
      _id: new ObjectId('6968adb1a7873e499b7886c4')
    });
    
    if (driver) {
      console.log('👤 Driver Details:');
      console.log('  ID:', driver._id);
      console.log('  Email:', driver.email);
      console.log('  Name:', driver.fullName);
      console.log('  💰 Wallet Balance:', (driver.walletBalance || 0).toLocaleString('vi-VN'), 'đ');
      console.log('  Locked:', driver.isWalletLocked ? 'Yes' : 'No');
      console.log();
    } else {
      console.log('❌ Driver not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkTransaction();
