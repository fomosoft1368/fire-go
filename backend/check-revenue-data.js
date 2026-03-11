const mongoose = require('mongoose');

// MongoDB connection string - thay đổi nếu cần
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH';

async function checkRevenueData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Check all completed rides (regardless of rideType)
    console.log('\n🔍 ALL RIDES (any status):');
    const allRides = await db.collection('rides').find({}).toArray();
    console.log(`  - Total rides: ${allRides.length}`);
    
    if (allRides.length > 0) {
      // Group by status
      const statusCounts = {};
      allRides.forEach(ride => {
        const status = ride.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('  - Rides by status:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`    - ${status}: ${count}`);
      });
      
      console.log('  - Sample rides (first 3):');
      allRides.slice(0, 3).forEach((ride, idx) => {
        console.log(`    ${idx + 1}. id: ${ride._id}, status: ${ride.status}, totalFare: ${ride.totalFare || 0}`);
      });
    }
    
    const completedRides = await db.collection('rides').find({ status: 'completed' }).toArray();
    console.log(`  - Completed rides: ${completedRides.length}`);

    // 1. Hire rides (Lái xe hộ) - ALL rides from rides table
    console.log('\n📊 HIRE RIDES (Lái xe hộ - from rides table):');
    const hireRidesStats = await db.collection('rides').aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalFare' }
        }
      }
    ]).toArray();
    
    const hireCount = hireRidesStats[0]?.count || 0;
    const hireRevenue = hireRidesStats[0]?.totalRevenue || 0;
    console.log(`  - Count: ${hireCount}`);
    console.log(`  - Revenue: ${hireRevenue.toLocaleString('vi-VN')} VND`);

    // 2. Share rides (Ghép xe) - from riderequests/combined_trips table
    console.log('\n📊 SHARE RIDES (Ghép xe - from riderequests table):');
    
    // Check which collection name exists
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log(`  - Available collections: ${collectionNames.filter(n => n.includes('ride') || n.includes('request') || n.includes('combined')).join(', ')}`);
    
    let combinedTripsCount = 0;
    let combinedTripsRevenue = [{ total: 0 }];
    
    // Try different possible collection names - prioritize the schema-defined name
    const possibleNames = ['combinedtriprequests', 'combinedtrips', 'riderequests', 'ride_requests'];
    for (const collName of possibleNames) {
      if (collectionNames.includes(collName)) {
        console.log(`  - Using collection: ${collName}`);
        
        // Check ALL records first
        const allRecords = await db.collection(collName).find({}).toArray();
        console.log(`  - Total records: ${allRecords.length}`);
        
        if (allRecords.length > 0) {
          // Show status breakdown
          const statusCounts = {};
          allRecords.forEach(rec => {
            const status = rec.status || 'unknown';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
          });
          console.log(`  - Records by status:`);
          Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`    - ${status}: ${count}`);
          });
          
          // Show sample  records
          console.log(`  - Sample records (first 3):`);
          allRecords.slice(0, 3).forEach((rec, idx) => {
            console.log(`    ${idx + 1}. status: ${rec.status}, fare: ${rec.fare || 0}, hasCombinedTripId: ${!!rec.combinedTripId}`);
          });
        }
        
        // Now check completed WITH combinedTripId
        combinedTripsCount = await db.collection(collName).countDocuments({
          status: 'completed',
          combinedTripId: { $exists: true }
        });
        combinedTripsRevenue = await db.collection(collName).aggregate([
          { $match: { status: 'completed', combinedTripId: { $exists: true } } },
          { $group: { _id: null, total: { $sum: '$fare' } } }
        ]).toArray();
        break;
      }
    }
    
    console.log(`  - Count: ${combinedTripsCount}`);
    console.log(`  - Revenue: ${combinedTripsRevenue[0]?.total?.toLocaleString('vi-VN') || 0} VND`);

    // 3. Deliveries (Giao hàng) - from deliveries table
    console.log('\n📊 DELIVERIES (Giao hàng - from deliveries table):');
    
    // Check ALL deliveries first
    const allDeliveries = await db.collection('deliveries').find({}).toArray();
    console.log(`  - Total deliveries: ${allDeliveries.length}`);
    
    // Check all delivery statuses
    const deliveryStatuses = await db.collection('deliveries').aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray();
    console.log('  - All delivery statuses:');
    deliveryStatuses.forEach(s => {
      console.log(`    - ${s._id}: ${s.count}`);
    });
    
    if (allDeliveries.length > 0) {
      console.log('  - Sample deliveries (first 3):');
      allDeliveries.slice(0, 3).forEach((delivery, idx) => {
        console.log(`    ${idx + 1}. status: ${delivery.status}, fare: ${delivery.fare || 0}`);
      });
    }
    
    const deliveriesCount = await db.collection('deliveries').countDocuments({ status: 'delivered' });
    const deliveriesRevenue = await db.collection('deliveries').aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$fare' } } }
    ]).toArray();
    
    console.log(`  - Count: ${deliveriesCount}`);
    console.log(`  - Revenue: ${deliveriesRevenue[0]?.total?.toLocaleString('vi-VN') || 0} VND`);

    // 4. Hourly services (Dọn dẹp) - from hourlyservices table
    console.log('\n📊 HOURLY SERVICES (Dọn dẹp - from hourlyservices table):');
    
    // Check collection name
    const hourlyCollName = collectionNames.includes('hourlyservices') ? 'hourlyservices' : 'hourly_services';
    console.log(`  - Using collection: ${hourlyCollName}`);
    
    // Check ALL hourly services first
    const allHourly = await db.collection(hourlyCollName).find({}).toArray();
    console.log(`  - Total hourly services: ${allHourly.length}`);
    
    if (allHourly.length > 0) {
      // Show status breakdown
      const statusCounts = {};
      allHourly.forEach(rec => {
        const status = rec.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log(`  - Hourly services by status:`);
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`    - ${status}: ${count}`);
      });
      
      console.log('  - Sample hourly services (first 3):');
      allHourly.slice(0, 3).forEach((service, idx) => {
        console.log(`    ${idx + 1}. status: ${service.status}, actualPrice: ${service.actualPrice || 0}, estimatedPrice: ${service.estimatedPrice || 0}`);
      });
    }
    
    const hourlyCount = await db.collection(hourlyCollName).countDocuments({ status: 'completed' });
    const hourlyRevenue = await db.collection(hourlyCollName).aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$actualPrice', '$estimatedPrice'] } }
        }
      }
    ]).toArray();
    
    console.log(`  - Count: ${hourlyCount}`);
    console.log(`  - Revenue: ${hourlyRevenue[0]?.total?.toLocaleString('vi-VN') || 0} VND`);

    // Summary
    console.log('\n📈 SUMMARY (4 separate tables):');
    const totalRides = hireCount + combinedTripsCount + deliveriesCount + hourlyCount;
    const totalRevenue = hireRevenue + (combinedTripsRevenue[0]?.total || 0) + (deliveriesRevenue[0]?.total || 0) + (hourlyRevenue[0]?.total || 0);

    console.log(`  - Lái xe hộ (rides table): ${hireCount} rides (${totalRides > 0 ? ((hireCount / totalRides) * 100).toFixed(1) : 0}%) - ${hireRevenue.toLocaleString('vi-VN')} VND`);
    console.log(`  - Ghép xe (riderequests table): ${combinedTripsCount} trips (${totalRides > 0 ? ((combinedTripsCount / totalRides) * 100).toFixed(1) : 0}%) - ${(combinedTripsRevenue[0]?.total || 0).toLocaleString('vi-VN')} VND`);
    console.log(`  - Giao hàng (deliveries table): ${deliveriesCount} orders (${totalRides > 0 ? ((deliveriesCount / totalRides) * 100).toFixed(1) : 0}%) - ${(deliveriesRevenue[0]?.total || 0).toLocaleString('vi-VN')} VND`);
    console.log(`  - Dọn dẹp (hourlyservices table): ${hourlyCount} services (${totalRides > 0 ? ((hourlyCount / totalRides) * 100).toFixed(1) : 0}%) - ${(hourlyRevenue[0]?.total || 0).toLocaleString('vi-VN')} VND`);
    console.log(`  - ======================================`);
    console.log(`  - TOTAL: ${totalRides} trips, ${totalRevenue.toLocaleString('vi-VN')} VND`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkRevenueData();
