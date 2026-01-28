/**
 * Script to check RideRequest records in database
 * Run with: node check-ride-requests.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017/fire-go';

async function checkRideRequests() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    const rideRequests = db.collection('riderequests');
    
    // Get all ride requests
    const requests = await rideRequests.find({}).toArray();
    
    console.log('\n📊 Total RideRequests:', requests.length);
    console.log('\n');
    
    // Group by combinedTripId
    const byTrip = {};
    requests.forEach(req => {
      const tripId = req.combinedTripId?.toString() || 'null';
      if (!byTrip[tripId]) {
        byTrip[tripId] = [];
      }
      byTrip[tripId].push(req);
    });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 REQUESTS GROUPED BY TRIP');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    Object.entries(byTrip).forEach(([tripId, reqs]) => {
      console.log(`🚗 Trip ID: ${tripId}`);
      console.log(`   Requests: ${reqs.length}\n`);
      
      reqs.forEach((req, idx) => {
        console.log(`   ${idx + 1}. Request ID: ${req._id}`);
        console.log(`      Driver ID: ${req.driverId || 'NO DRIVER ID ⚠️'}`);
        console.log(`      Customer ID: ${req.customerId || 'NO CUSTOMER ID ⚠️'}`);
        console.log(`      Status: ${req.status}`);
        console.log(`      Created By: ${req.createdBy || 'N/A'}`);
        console.log(`      Created At: ${req.createdAt}`);
        console.log('');
      });
      
      // Check if multiple drivers for same trip
      const driverIds = reqs.map(r => r.driverId?.toString()).filter(Boolean);
      const uniqueDrivers = [...new Set(driverIds)];
      
      if (uniqueDrivers.length > 1) {
        console.log(`   ⚠️⚠️⚠️ WARNING: ${uniqueDrivers.length} different drivers for same trip!`);
        console.log(`   Driver IDs:`, uniqueDrivers);
      } else if (uniqueDrivers.length === 1) {
        console.log(`   ✅ All requests sent to same driver: ${uniqueDrivers[0]}`);
      } else {
        console.log(`   ⚠️ No driver IDs found`);
      }
      
      console.log('\n-----------------------------------------------------------\n');
    });
    
    // Find requests with no driverId
    const noDriver = requests.filter(r => !r.driverId);
    if (noDriver.length > 0) {
      console.log('⚠️⚠️⚠️ REQUESTS WITH NO DRIVER ID:');
      noDriver.forEach(req => {
        console.log(`   - ${req._id} (trip: ${req.combinedTripId})`);
      });
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

checkRideRequests();
