const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH');
    const db = mongoose.connection.db;
    
    console.log('🔍 Checking drivers in dat_xe database...');
    const allDrivers = await db.collection('drivers').find({}).toArray();
    console.log('Total drivers:', allDrivers.length);
    
    if (allDrivers.length > 0) {
      const d = allDrivers[0];
      console.log('\n📍 First driver:');
      console.log('  Name:', d.firstName, d.lastName);
      console.log('  Status:', d.status);
      console.log('  Accepting Rides:', d.isAcceptingRides);
      console.log('  Location:', d.currentLocation);
    }
    
    console.log('\n🔍 Available drivers (online, accepting rides, with location)...');
    const availableDrivers = await db.collection('drivers').find({
      status: 'online',
      isAcceptingRides: true,
      currentLocation: { $exists: true }
    }).toArray();
    
    console.log('Available drivers:', availableDrivers.length);
    availableDrivers.forEach((d, i) => {
      console.log(`  ${i+1}. ${d.firstName} ${d.lastName} (${d.vehiclePlate})`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
