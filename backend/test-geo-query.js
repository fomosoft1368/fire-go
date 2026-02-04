const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH')
  .then(async () => {
    console.log('Testing geospatial query...\n');
    
    // Test coordinates (near Vinh city)
    const testCoords = [105.674, 18.67];
    console.log('Searching for drivers near:', testCoords);
    console.log('Max distance: 10km\n');
    
    const drivers = await mongoose.connection.db.collection('drivers').find({
      isOnline: true,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: testCoords,
          },
          $maxDistance: 10000, // 10km
        },
      },
    }).toArray();
    
    console.log('✅ Found', drivers.length, 'drivers within 10km');
    
    if (drivers.length > 0) {
      console.log('\nDriver details:');
      drivers.forEach(d => {
        console.log(`- ${d.firstName} ${d.lastName} (${d.email})`);
        console.log(`  Status: ${d.status}, isOnline: ${d.isOnline}`);
        console.log(`  Location: ${d.currentLocation?.coordinates}`);
        console.log(`  isAvailable: ${d.isAvailable}, isAcceptingRides: ${d.isAcceptingRides}`);
      });
    } else {
      console.log('\n⚠️ No drivers found! Checking available drivers...\n');
      
      const onlineDrivers = await mongoose.connection.db.collection('drivers').find({ isOnline: true }).toArray();
      console.log('Total online drivers:', onlineDrivers.length);
      
      onlineDrivers.forEach(d => {
        console.log(`- ${d.firstName} ${d.lastName}`);
        console.log(`  Status: ${d.status}, Location: ${d.currentLocation?.coordinates || 'NONE'}`);
      });
    }
    
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
