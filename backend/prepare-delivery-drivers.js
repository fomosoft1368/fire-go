const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/?retryWrites=true&w=majority&appName=NATECH';

async function prepareDrivers() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('fire_go');
    
    const driverIds = [
      new ObjectId('6968adb0a7873e499b7886bc'), // Hồ Văn Trình
      new ObjectId('6968adb0a7873e499b7886be'), // Hoàng Danh Long
    ];
    
    // First, check current status
    console.log('\n=== CURRENT DRIVER STATUS ===');
    const currentDrivers = await db.collection('drivers').find({
      _id: { $in: driverIds }
    }).toArray();
    
    currentDrivers.forEach(d => {
      console.log(`\n${d.firstName} ${d.lastName} (${d._id})`);
      console.log(`  isOnline: ${d.isOnline}`);
      console.log(`  isAvailable: ${d.isAvailable}`);
      console.log(`  isVerified: ${d.isVerified}`);
      console.log(`  status: ${d.status}`);
      console.log(`  driverTypes: ${JSON.stringify(d.driverTypes)}`);
      console.log(`  currentLocation: ${d.currentLocation ? JSON.stringify(d.currentLocation.coordinates) : 'NONE'}`);
    });
    
    // Update both drivers to be ready for delivery
    console.log('\n\n=== UPDATING DRIVERS ===');
    
    const updateResult = await db.collection('drivers').updateMany(
      { _id: { $in: driverIds } },
      {
        $set: {
          isOnline: true,
          isAvailable: true,
          isVerified: true,
          status: 'available',
          driverTypes: ['rideshare', 'delivery', 'hire'],
          currentLocation: {
            type: 'Point',
            coordinates: [105.6792845, 18.6582276], // Near pickup location
          },
        }
      }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} drivers`);
    
    // Verify update
    console.log('\n=== UPDATED DRIVER STATUS ===');
    const updatedDrivers = await db.collection('drivers').find({
      _id: { $in: driverIds }
    }).toArray();
    
    updatedDrivers.forEach(d => {
      console.log(`\n${d.firstName} ${d.lastName} (${d._id})`);
      console.log(`  isOnline: ${d.isOnline}`);
      console.log(`  isAvailable: ${d.isAvailable}`);
      console.log(`  isVerified: ${d.isVerified}`);
      console.log(`  status: ${d.status}`);
      console.log(`  driverTypes: ${JSON.stringify(d.driverTypes)}`);
      console.log(`  currentLocation: ${JSON.stringify(d.currentLocation.coordinates)}`);
    });
    
    console.log('\n✅ Drivers are now ready to receive delivery requests!');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

prepareDrivers();
