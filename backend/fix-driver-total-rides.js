require('dotenv').config();
const mongoose = require('mongoose');

async function fixDriverTotalRides() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Driver = mongoose.model('Driver', new mongoose.Schema({}, { strict: false }), 'drivers');
    const Ride = mongoose.model('Ride', new mongoose.Schema({}, { strict: false }), 'rides');
    const CombinedTrip = mongoose.model('CombinedTrip', new mongoose.Schema({}, { strict: false }), 'combinedtrips');
    const Delivery = mongoose.model('Delivery', new mongoose.Schema({}, { strict: false }), 'deliveries');

    // Get all drivers
    const drivers = await Driver.find({});
    console.log(`\n📊 Found ${drivers.length} drivers\n`);

    for (const driver of drivers) {
      // Count completed rides
      const completedRides = await Ride.countDocuments({
        driverId: driver._id,
        status: 'completed',
      });

      // Count completed combined trips
      const completedCombinedTrips = await CombinedTrip.countDocuments({
        driverId: driver._id,
        status: 'completed',
      });

      // Count completed deliveries
      const completedDeliveries = await Delivery.countDocuments({
        driverId: driver._id,
        status: 'delivered',
      });

      // Total actual completed trips
      const actualTotalRides = completedRides + completedCombinedTrips + completedDeliveries;
      const actualCompletedRides = completedRides + completedCombinedTrips + completedDeliveries;

      console.log(`\n👤 Driver: ${driver.firstName} ${driver.lastName} (${driver._id})`);
      console.log(`   Email: ${driver.email}`);
      console.log(`   Current totalRides: ${driver.totalRides || 0}`);
      console.log(`   Current completedRides: ${driver.completedRides || 0}`);
      console.log(`   ─────────────────────────────────`);
      console.log(`   Actual completed rides: ${completedRides}`);
      console.log(`   Actual combined trips: ${completedCombinedTrips}`);
      console.log(`   Actual deliveries: ${completedDeliveries}`);
      console.log(`   ─────────────────────────────────`);
      console.log(`   📊 TOTAL ACTUAL: ${actualTotalRides}`);

      // Update driver if numbers don't match
      if (driver.totalRides !== actualTotalRides || driver.completedRides !== actualCompletedRides) {
        await Driver.findByIdAndUpdate(driver._id, {
          totalRides: actualTotalRides,
          completedRides: actualCompletedRides,
        });
        console.log(`   ✅ UPDATED: totalRides ${driver.totalRides} → ${actualTotalRides}, completedRides ${driver.completedRides} → ${actualCompletedRides}`);
      } else {
        console.log(`   ✓ Already correct`);
      }
    }

    console.log('\n✅ All drivers updated!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixDriverTotalRides();
