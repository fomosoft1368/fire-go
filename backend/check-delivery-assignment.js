const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/?retryWrites=true&w=majority&appName=NATECH';

async function checkDeliveryAssignment() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('fire_go');
    
    // 1. Check latest delivery orders
    console.log('\n=== LATEST DELIVERY ORDERS ===');
    const deliveries = await db.collection('deliveries')
      .find({})
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();
    
    deliveries.forEach(d => {
      console.log(`\nDelivery ${d._id}`);
      console.log(`  Status: ${d.status}`);
      console.log(`  Created: ${d.createdAt}`);
      console.log(`  Pickup: ${d.pickupAddress}`);
      console.log(`  Pickup coords: [${d.pickupCoordinates}]`);
      console.log(`  Driver: ${d.driverId || 'NONE'}`);
    });
    
    // 2. Check assignment requests
    console.log('\n\n=== DELIVERY ASSIGNMENT REQUESTS ===');
    const requests = await db.collection('deliveryassignmentrequests')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    console.log(`Found ${requests.length} assignment requests`);
    requests.forEach(r => {
      console.log(`\nRequest ${r._id}`);
      console.log(`  Delivery: ${r.deliveryId}`);
      console.log(`  Driver: ${r.driverId}`);
      console.log(`  Status: ${r.status}`);
      console.log(`  Score: ${r.score}`);
      console.log(`  Created: ${r.createdAt}`);
      console.log(`  Expires: ${r.expiresAt}`);
    });
    
    // 3. Check available drivers
    console.log('\n\n=== AVAILABLE DRIVERS CHECK ===');
    const pickupCoords = [105.6792845, 18.6582276]; // From latest delivery
    
    const availableDrivers = await db.collection('drivers').find({
      isAvailable: true,
      isOnline: true,
      isVerified: true,
      driverTypes: { $in: ['delivery'] },
    })
    .project({
      firstName: 1,
      lastName: 1,
      isAvailable: 1,
      isOnline: 1,
      isVerified: 1,
      driverTypes: 1,
      currentLocation: 1,
      status: 1,
    })
    .toArray();
    
    console.log(`Found ${availableDrivers.length} available delivery drivers`);
    availableDrivers.forEach(d => {
      console.log(`\n${d.firstName} ${d.lastName} (${d._id})`);
      console.log(`  isAvailable: ${d.isAvailable}`);
      console.log(`  isOnline: ${d.isOnline}`);
      console.log(`  isVerified: ${d.isVerified}`);
      console.log(`  status: ${d.status}`);
      console.log(`  driverTypes: ${JSON.stringify(d.driverTypes)}`);
      console.log(`  currentLocation: ${d.currentLocation ? JSON.stringify(d.currentLocation.coordinates) : 'NONE'}`);
      
      if (d.currentLocation) {
        const driverCoords = d.currentLocation.coordinates;
        const distance = getDistanceFromLatLonInKm(
          pickupCoords[1], pickupCoords[0],
          driverCoords[1], driverCoords[0]
        );
        console.log(`  Distance from pickup: ${distance.toFixed(2)} km`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

checkDeliveryAssignment();
