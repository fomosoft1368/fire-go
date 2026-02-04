const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fire-go', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const driverSchema = new mongoose.Schema({}, { strict: false, collection: 'drivers' });
const Driver = mongoose.model('Driver', driverSchema);

async function updateDriverStatus() {
  try {
    console.log('🔄 Updating driver status...\n');

    // 1. Get all drivers with status 'online'
    const onlineDrivers = await Driver.find({ status: 'online' });
    console.log(`Found ${onlineDrivers.length} drivers with status 'online'\n`);

    // 2. Update each driver
    for (const driver of onlineDrivers) {
      console.log(`📝 Updating driver: ${driver.firstName} ${driver.lastName} (${driver.email})`);
      
      const updateData = {
        isOnline: true,
        isAvailable: true,
        isVerified: true,
        isAcceptingRides: true, // For ride/hire driver service
        isSuspended: false,
      };

      // Add default currentLocation if missing
      if (!driver.currentLocation || !driver.currentLocation.coordinates) {
        // Default to Hanoi center coordinates (can adjust based on your needs)
        updateData.currentLocation = {
          type: 'Point',
          coordinates: [105.8342, 21.0278] // [longitude, latitude]
        };
        console.log('  ⚠️  Added default currentLocation (Hanoi center)');
      }

      await Driver.updateOne(
        { _id: driver._id },
        { $set: updateData }
      );

      console.log('  ✅ Updated successfully');
      console.log('     - isOnline: true');
      console.log('     - isAvailable: true');
      console.log('     - isVerified: true');
      console.log('     - isAcceptingRides: true');
      console.log('     - isSuspended: false');
      if (updateData.currentLocation) {
        console.log(`     - currentLocation: [${updateData.currentLocation.coordinates}]`);
      }
      console.log('');
    }

    // 3. Display summary
    console.log('\n📊 Summary:');
    const updated = await Driver.countDocuments({
      isOnline: true,
      isAvailable: true,
      isVerified: true,
      isAcceptingRides: true
    });
    console.log(`✅ ${updated} drivers are now online, available, verified and accepting rides`);

    // 4. Display drivers with currentLocation
    const withLocation = await Driver.countDocuments({
      currentLocation: { $exists: true, $ne: null }
    });
    console.log(`📍 ${withLocation} drivers have currentLocation set`);

    // 5. Show sample driver data
    console.log('\n📋 Sample driver data:');
    const sampleDriver = await Driver.findOne({
      isOnline: true,
      isAvailable: true,
      isVerified: true
    });
    
    if (sampleDriver) {
      console.log({
        name: `${sampleDriver.firstName} ${sampleDriver.lastName}`,
        email: sampleDriver.email,
        status: sampleDriver.status,
        isOnline: sampleDriver.isOnline,
        isAvailable: sampleDriver.isAvailable,
        isVerified: sampleDriver.isVerified,
        isAcceptingRides: sampleDriver.isAcceptingRides,
        isSuspended: sampleDriver.isSuspended,
        currentLocation: sampleDriver.currentLocation,
      });
    }

    console.log('\n✅ Update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateDriverStatus();
