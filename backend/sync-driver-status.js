const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH';

async function syncDriverStatus() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const driversCollection = mongoose.connection.db.collection('drivers');

    // Get all drivers
    const allDrivers = await driversCollection.find({}).toArray();
    console.log(`📊 Found ${allDrivers.length} drivers total\n`);

    let syncedCount = 0;
    let alreadySyncedCount = 0;

    for (const driver of allDrivers) {
      const needsSync = 
        (driver.status === 'online' && !driver.isOnline) ||
        (driver.status === 'offline' && driver.isOnline) ||
        (driver.status === 'online' && !driver.lastOnlineTime);

      if (needsSync) {
        const updateData = {};
        
        // Sync isOnline with status
        if (driver.status === 'online') {
          updateData.isOnline = true;
          updateData.isAvailable = true;
          if (!driver.lastOnlineTime) {
            updateData.lastOnlineTime = new Date();
          }
        } else {
          updateData.isOnline = false;
          updateData.isAvailable = false;
        }

        await driversCollection.updateOne(
          { _id: driver._id },
          { $set: updateData }
        );

        console.log(`✅ Synced: ${driver.firstName} ${driver.lastName} (${driver.email})`);
        console.log(`   status: ${driver.status} → isOnline: ${updateData.isOnline}, isAvailable: ${updateData.isAvailable}`);
        syncedCount++;
      } else {
        alreadySyncedCount++;
      }
    }

    console.log('\n📊 SUMMARY:');
    console.log(`   Total drivers: ${allDrivers.length}`);
    console.log(`   ✅ Synced: ${syncedCount}`);
    console.log(`   ✓ Already synced: ${alreadySyncedCount}`);
    
    if (syncedCount > 0) {
      console.log('\n✨ All driver statuses are now synchronized!');
    } else {
      console.log('\n✨ All drivers were already synchronized!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

syncDriverStatus();
