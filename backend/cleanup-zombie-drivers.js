/**
 * Script để kiểm tra và clean up drivers "zombie" 
 * (online nhưng không gửi heartbeat)
 * 
 * Chạy: node cleanup-zombie-drivers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fire-go';

const DriverSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  status: String,
  isOnline: Boolean,
  isAcceptingRides: Boolean,
  isSuspended: Boolean,
  lastOnlineTime: Date,
  currentLocation: {
    type: { type: String },
    coordinates: [Number],
  },
}, { timestamps: true });

const Driver = mongoose.model('Driver', DriverSchema);

async function cleanupZombieDrivers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Kiểm tra tất cả online drivers
    console.log('📊 CHECKING ONLINE DRIVERS:');
    console.log('='.repeat(60));
    
    const onlineDrivers = await Driver.find({ 
      isOnline: true 
    }).select('email firstName lastName status isOnline lastOnlineTime');
    
    console.log(`Total online drivers: ${onlineDrivers.length}\n`);

    const now = new Date();
    const threeMinutesAgo = new Date(now.getTime() - 3 * 60 * 1000);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    let recentActive = 0;
    let staleDrivers = [];
    let zombieDrivers = [];

    onlineDrivers.forEach((driver, index) => {
      const lastSeen = driver.lastOnlineTime || driver.updatedAt || driver.createdAt;
      const minutesInactive = Math.floor((now - lastSeen) / (60 * 1000));

      console.log(`${index + 1}. ${driver.firstName} ${driver.lastName} (${driver.email})`);
      console.log(`   Status: ${driver.status}`);
      console.log(`   isOnline: ${driver.isOnline}`);
      console.log(`   Last seen: ${lastSeen.toLocaleString()}`);
      console.log(`   Minutes inactive: ${minutesInactive}`);

      if (lastSeen >= threeMinutesAgo) {
        console.log(`   ✅ ACTIVE (heartbeat recent)`);
        recentActive++;
      } else if (lastSeen >= fiveMinutesAgo) {
        console.log(`   ⚠️  STALE (no heartbeat 3-5 min)`);
        staleDrivers.push(driver);
      } else {
        console.log(`   ❌ ZOMBIE (no heartbeat >5 min)`);
        zombieDrivers.push(driver);
      }
      console.log('');
    });

    // 2. Summary
    console.log('\n📈 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Active drivers (heartbeat < 3 min): ${recentActive}`);
    console.log(`⚠️  Stale drivers (heartbeat 3-5 min): ${staleDrivers.length}`);
    console.log(`❌ Zombie drivers (heartbeat > 5 min): ${zombieDrivers.length}`);

    // 3. Clean up zombie drivers
    if (zombieDrivers.length > 0) {
      console.log('\n🧹 CLEANING UP ZOMBIE DRIVERS:');
      console.log('='.repeat(60));
      
      const zombieIds = zombieDrivers.map(d => d._id);
      
      const result = await Driver.updateMany(
        { _id: { $in: zombieIds } },
        {
          $set: {
            isOnline: false,
            status: 'offline',
            isAvailable: false,
          }
        }
      );

      console.log(`✅ Set ${result.modifiedCount} zombie drivers to offline:`);
      zombieDrivers.forEach(driver => {
        console.log(`   - ${driver.firstName} ${driver.lastName} (${driver.email})`);
      });
    }

    // 4. Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('='.repeat(60));
    
    if (zombieDrivers.length > 0) {
      console.log('⚠️  Found zombie drivers! This indicates:');
      console.log('   1. Mobile app might not be sending heartbeat properly');
      console.log('   2. Drivers force-closed app without proper cleanup');
      console.log('   3. Network issues preventing heartbeat delivery');
      console.log('\n   ✅ Solution: Auto-offline cron job is running every minute');
      console.log('   ✅ Heartbeat interval: 15 seconds');
      console.log('   ✅ Auto-offline timeout: 3 minutes');
    } else {
      console.log('✅ No zombie drivers found! System is healthy.');
    }

    if (staleDrivers.length > 0) {
      console.log(`\n⚠️  ${staleDrivers.length} drivers are stale (3-5 min no heartbeat)`);
      console.log('   They will be auto-offlined in the next cleanup cycle if no heartbeat');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

cleanupZombieDrivers();
