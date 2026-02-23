const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH';

async function fixDriverBalance() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    const driverId = new ObjectId('6968adb1a7873e499b7886c4');
    
    // Get current balance
    const driver = await db.collection('drivers').findOne({ _id: driverId });
    console.log('Current balance:', (driver.walletBalance || 0).toLocaleString('vi-VN'), 'đ');
    
    // Add 100k from completed transaction
    const result = await db.collection('drivers').updateOne(
      { _id: driverId },
      { $inc: { walletBalance: 100000 } }
    );
    
    console.log('✅ Updated driver balance');
    
    // Verify
    const updated = await db.collection('drivers').findOne({ _id: driverId });
    console.log('New balance:', (updated.walletBalance || 0).toLocaleString('vi-VN'), 'đ');
    console.log('\n🎉 Success! Tiền đã được cộng vào ví tài xế.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

fixDriverBalance();
