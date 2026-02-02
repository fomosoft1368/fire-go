/**
 * Manual script to set a specific driver offline
 * Usage: node manual-offline-driver.js <driverId>
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH';

// Driver ID from user's image: 6968adb0a7873e499b7886bc (Hồ Văn Trình)
const driverId = process.argv[2] || '6968adb0a7873e499b7886bc';

async function setDriverOffline() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Driver = mongoose.connection.collection('drivers');

    // Set driver offline
    const result = await Driver.updateOne(
      { _id: new mongoose.Types.ObjectId(driverId) },
      {
        $set: {
          isOnline: false,
          isAvailable: false,
          status: 'offline'
        }
      }
    );

    console.log(`\n📊 Update result:`);
    console.log(`   Matched: ${result.matchedCount}`);
    console.log(`   Modified: ${result.modifiedCount}`);

    if (result.matchedCount === 0) {
      console.log(`\n❌ Driver ${driverId} not found`);
    } else if (result.modifiedCount > 0) {
      console.log(`\n✅ Driver ${driverId} is now OFFLINE`);
    } else {
      console.log(`\n⚠️  Driver ${driverId} was already offline`);
    }

    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setDriverOffline();
