/**
 * Clean up invalid RideRequest records (those without driverId)
 * Run with: node clean-invalid-requests.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017/fire-go';

async function cleanInvalidRequests() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db();
    const rideRequests = db.collection('riderequests');
    
    // Find requests without driverId for combined trips
    const invalidRequests = await rideRequests.find({
      tripType: 'combined_trip',
      driverId: { $exists: false }
    }).toArray();
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🔍 INVALID RIDE REQUESTS (Combined trips without driverId)');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Found: ${invalidRequests.length} invalid requests\n`);
    
    if (invalidRequests.length > 0) {
      invalidRequests.forEach((req, idx) => {
        console.log(`${idx + 1}. Request ID: ${req._id}`);
        console.log(`   Trip ID: ${req.combinedTripId}`);
        console.log(`   Customer ID: ${req.customerId}`);
        console.log(`   Status: ${req.status}`);
        console.log(`   Created: ${req.createdAt}`);
        console.log(`   ⚠️  NO DRIVER ID - This causes broadcast to all drivers!\n`);
      });
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🗑️  DELETING INVALID REQUESTS');
      console.log('═══════════════════════════════════════════════════════════\n');
      
      const result = await rideRequests.deleteMany({
        tripType: 'combined_trip',
        driverId: { $exists: false }
      });
      
      console.log(`✅ Deleted ${result.deletedCount} invalid requests\n`);
    } else {
      console.log('✅ No invalid requests found. Database is clean!\n');
    }
    
    // Also check for requests with null driverId
    const nullDriverRequests = await rideRequests.find({
      tripType: 'combined_trip',
      driverId: null
    }).toArray();
    
    if (nullDriverRequests.length > 0) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('⚠️  REQUESTS WITH NULL DRIVER ID');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log(`Found: ${nullDriverRequests.length} requests with null driverId\n`);
      
      nullDriverRequests.forEach((req, idx) => {
        console.log(`${idx + 1}. Request ID: ${req._id}`);
        console.log(`   Trip ID: ${req.combinedTripId}`);
        console.log(`   driverId: ${req.driverId} (null)`);
        console.log('');
      });
      
      const result = await rideRequests.deleteMany({
        tripType: 'combined_trip',
        driverId: null
      });
      
      console.log(`✅ Deleted ${result.deletedCount} requests with null driverId\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

cleanInvalidRequests();
