const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH');
    const db = mongoose.connection.db;
    
    console.log('🔍 Checking ALL drivers in detail...');
    const allDrivers = await db.collection('drivers').find({}).toArray();
    console.log('Total drivers:', allDrivers.length);
    
    allDrivers.forEach((d, i) => {
      console.log(`\n--- Driver ${i+1} ---`);
      console.log('  Name:', d.firstName, d.lastName);
      console.log('  Status:', d.status);
      console.log('  Suspended:', d.isSuspended);
      console.log('  Accepting Rides:', d.isAcceptingRides);
      console.log('  Current Location:', JSON.stringify(d.currentLocation, null, 2));
      console.log('  Has Location Field:', d.currentLocation ? 'YES' : 'NO');
    });
    
    console.log('\n\n📊 SUMMARY:');
    const availableDrivers = await db.collection('drivers').find({
      status: 'online',
      isSuspended: false,
      isAcceptingRides: true,
      currentLocation: { $exists: true }
    }).toArray();
    
    console.log('Available drivers:', availableDrivers.length);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
