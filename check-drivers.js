const mongoose = require('mongoose');

const mongoUri = 'mongodb://localhost:27017/fire_go';

mongoose.connect(mongoUri).then(async () => {
  const db = mongoose.connection.db;
  
  console.log('🔍 Checking all drivers...');
  const allDrivers = await db.collection('drivers').find({}).toArray();
  console.log(`Total drivers: ${allDrivers.length}`);
  
  if (allDrivers.length > 0) {
    console.log('\n📋 First driver:');
    console.log(JSON.stringify(allDrivers[0], null, 2));
  }
  
  console.log('\n🔍 Checking available drivers (status=online, isAcceptingRides=true, currentLocation exists)...');
  const availableDrivers = await db.collection('drivers').find({
    status: 'online',
    isAcceptingRides: true,
    currentLocation: { $exists: true }
  }).toArray();
  
  console.log(`Available drivers: ${availableDrivers.length}`);
  if (availableDrivers.length > 0) {
    availableDrivers.forEach((driver, i) => {
      console.log(`${i+1}. ${driver.firstName} ${driver.lastName} - ${driver.status} - ${driver.vehiclePlate}`);
    });
  }
  
  mongoose.disconnect();
}).catch(err => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});
