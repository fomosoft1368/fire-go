const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/?retryWrites=true&w=majority&appName=NATECH';

async function forceDriversOnline() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('fire_go');
    
    const driverIds = [
      new ObjectId('6968adb0a7873e499b7886bc'),
      new ObjectId('6968adb0a7873e499b7886be'),
    ];
    
    console.log('\n=== FORCING DRIVERS ONLINE AND AVAILABLE ===\n');
    
    const result = await db.collection('drivers').updateMany(
      { _id: { $in: driverIds } },
      {
        $set: {
          status: 'online',
          isOnline: true,
          isAvailable: true,
          isVerified: true,
          currentLocation: {
            type: 'Point',
            coordinates: [105.6792845, 18.6582276],
          },
          lastOnlineTime: new Date(),
        }
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} drivers`);
    
    // Verify immediately
    const drivers = await db.collection('drivers').find({
      _id: { $in: driverIds }
    }).project({
      firstName: 1,
      lastName: 1,
      status: 1,
      isOnline: 1,
      isAvailable: 1,
    }).toArray();
    
    console.log('\nVerification:');
    drivers.forEach(d => {
      console.log(`${d.firstName} ${d.lastName}:`);
      console.log(`  status: ${d.status}`);
      console.log(`  isOnline: ${d.isOnline}`);
      console.log(`  isAvailable: ${d.isAvailable}`);
    });
    
    // Now test the query
    console.log('\n=== TESTING DELIVERY QUERY ===\n');
    
    const available = await db.collection('drivers').find({
      isAvailable: true,
      isOnline: true,
      isVerified: true,
      driverTypes: { $in: ['delivery'] },
    }).toArray();
    
    console.log(`Found ${available.length} available delivery drivers`);
    available.forEach(d => {
      console.log(`  ✅ ${d.firstName} ${d.lastName}`);
    });
    
    console.log('\n✅ Drivers are ready! Now create a delivery order from customer app.');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

forceDriversOnline();
