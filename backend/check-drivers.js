const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/fire_go');
    const db = mongoose.connection.db;
    
    console.log('🔍 Checking all drivers...');
    const allDrivers = await db.collection('drivers').find({}).toArray();
    console.log('Total drivers:', allDrivers.length);
    
    if (allDrivers.length > 0) {
      const d = allDrivers[0];
      console.log('\nFirst driver:');
      console.log('  Name:', d.firstName, d.lastName);
      console.log('  Status:', d.status);
      console.log('  Accepting Rides:', d.isAcceptingRides);
      console.log('  Location:', d.currentLocation);
    }
    
    console.log('\n🔍 Drivers matching query...');
    const availableDrivers = await db.collection('drivers').find({
      status: 'online',
      isAcceptingRides: true,
      currentLocation: { $exists: true }
    }).toArray();
    
    console.log('Available drivers:', availableDrivers.length);
    availableDrivers.forEach(d => {
      console.log(`  - ${d.firstName} ${d.lastName} (${d.vehiclePlate})`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
