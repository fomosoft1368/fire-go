/**
 * Script để kiểm tra và sửa status của drivers
 * Chạy: node check-drivers-status.js
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
  currentLocation: {
    type: { type: String },
    coordinates: [Number],
  },
  lastLocationUpdate: Date,
}, { timestamps: true });

const Driver = mongoose.model('Driver', DriverSchema);

async function checkAndFixDriversStatus() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. Kiểm tra tất cả drivers
    console.log('📊 CHECKING ALL DRIVERS STATUS:');
    console.log('='.repeat(60));
    
    const allDrivers = await Driver.find({}).select('email firstName lastName status isOnline isAcceptingRides isSuspended currentLocation');
    
    console.log(`Total drivers: ${allDrivers.length}\n`);
    
    allDrivers.forEach((driver, index) => {
      console.log(`${index + 1}. ${driver.firstName} ${driver.lastName} (${driver.email})`);
      console.log(`   Status: ${driver.status}`);
      console.log(`   isOnline: ${driver.isOnline}`);
      console.log(`   isAcceptingRides: ${driver.isAcceptingRides}`);
      console.log(`   isSuspended: ${driver.isSuspended}`);
      console.log(`   Has location: ${!!driver.currentLocation}`);
      if (driver.currentLocation) {
        console.log(`   Coordinates: [${driver.currentLocation.coordinates}]`);
      }
      console.log('');
    });

    // 2. Tìm drivers có status là 'active' (sai)
    console.log('\n🔍 FINDING DRIVERS WITH INCORRECT STATUS:');
    console.log('='.repeat(60));
    
    const driversWithActiveStatus = await Driver.find({ status: 'active' });
    
    if (driversWithActiveStatus.length > 0) {
      console.log(`❌ Found ${driversWithActiveStatus.length} drivers with status 'active' (INCORRECT)`);
      
      driversWithActiveStatus.forEach((driver) => {
        console.log(`   - ${driver.firstName} ${driver.lastName} (${driver.email})`);
      });
      
      // 3. Sửa lại status
      console.log('\n🔧 FIXING INCORRECT STATUS...');
      const result = await Driver.updateMany(
        { status: 'active' },
        { $set: { status: 'online' } }
      );
      
      console.log(`✅ Fixed ${result.modifiedCount} drivers (changed 'active' → 'online')`);
    } else {
      console.log('✅ No drivers with incorrect status found');
    }

    // 4. Kiểm tra drivers online nhưng thiếu location
    console.log('\n📍 CHECKING ONLINE DRIVERS WITHOUT LOCATION:');
    console.log('='.repeat(60));
    
    const onlineWithoutLocation = await Driver.find({
      status: 'online',
      $or: [
        { currentLocation: { $exists: false } },
        { currentLocation: null },
        { 'currentLocation.coordinates': { $exists: false } },
      ],
    });
    
    if (onlineWithoutLocation.length > 0) {
      console.log(`⚠️  Found ${onlineWithoutLocation.length} online drivers WITHOUT location:`);
      onlineWithoutLocation.forEach((driver) => {
        console.log(`   - ${driver.firstName} ${driver.lastName} (${driver.email})`);
      });
      console.log('\n   ⚠️  These drivers will NOT appear in search results!');
      console.log('   💡 Drivers need to update their location from mobile app');
    } else {
      console.log('✅ All online drivers have location');
    }

    // 5. Hiển thị available drivers
    console.log('\n✅ AVAILABLE DRIVERS (should be found by auto-assign):');
    console.log('='.repeat(60));
    
    const availableDrivers = await Driver.find({
      status: 'online',
      isAcceptingRides: true,
      isSuspended: false,
      currentLocation: { $exists: true },
    });
    
    console.log(`Found ${availableDrivers.length} available drivers:`);
    
    availableDrivers.forEach((driver, index) => {
      console.log(`\n${index + 1}. ${driver.firstName} ${driver.lastName}`);
      console.log(`   Email: ${driver.email}`);
      console.log(`   Status: ${driver.status}`);
      console.log(`   Accepting Rides: ${driver.isAcceptingRides}`);
      console.log(`   Suspended: ${driver.isSuspended}`);
      console.log(`   Location: [${driver.currentLocation.coordinates}]`);
    });

    if (availableDrivers.length === 0) {
      console.log('\n❌ NO AVAILABLE DRIVERS FOUND!');
      console.log('\n📝 Checklist for drivers to be available:');
      console.log('   1. status must be "online" (not "offline", "active", etc.)');
      console.log('   2. isAcceptingRides must be true');
      console.log('   3. isSuspended must be false');
      console.log('   4. currentLocation must exist with coordinates');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Check completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

checkAndFixDriversStatus();
