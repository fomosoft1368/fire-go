const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

async function checkDriver() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/firego';
  console.log('🔗 Connecting to:', uri.replace(/\/\/.*@/, '//*****@')); // Hide credentials
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    
    // Lấy driver từ auth state (users collection trong mobile-driver app)
    const users = await db.collection('users').find({}).toArray();
    console.log('\n📱 Users in users collection:', users.length);
    if (users.length > 0) {
      console.log('First user:', {
        id: users[0]._id,
        email: users[0].email,
        role: users[0].role,
        firstName: users[0].firstName,
        lastName: users[0].lastName
      });
    }

    // Kiểm tra customers collection  
    const customers = await db.collection('customers').find({}).toArray();
    console.log('\n👤 Customers in customers collection:', customers.length);
    if (customers.length > 0) {
      console.log('First customer:', {
        id: customers[0]._id,
        email: customers[0].email,
        firstName: customers[0].firstName,
        lastName: customers[0].lastName
      });
    }

    // Kiểm tra drivers collection
    const drivers = await db.collection('drivers').find({}).toArray();
    console.log('\n🚗 Drivers in drivers collection:', drivers.length);
    if (drivers.length > 0) {
      console.log('First driver:', {
        id: drivers[0]._id,
        email: drivers[0].email,
        firstName: drivers[0].firstName,
        lastName: drivers[0].lastName,
        vehiclePlate: drivers[0].vehiclePlate,
        status: drivers[0].status
      });
    }

    // Kiểm tra rides collection và driver refs
    const rides = await db.collection('rides').find({ driverId: { $exists: true, $ne: null } }).toArray();
    console.log('\n🚕 Rides with driverId:', rides.length);
    if (rides.length > 0) {
      const ride = rides[0];
      console.log('First ride with driver:', {
        rideId: ride._id,
        driverId: ride.driverId,
        customerId: ride.customerId,
        status: ride.status
      });

      // Kiểm tra xem driver tồn tại không
      const driverExists = await db.collection('drivers').findOne({ _id: ride.driverId });
      console.log('Driver exists in drivers collection?', !!driverExists);
      
      if (!driverExists) {
        console.log('❌ WARNING: Driver ID in ride does not exist in drivers collection!');
        console.log('   This will cause populate to fail and return null');
      }

      // Kiểm tra xem customer tồn tại không
      const customerExists = await db.collection('customers').findOne({ _id: ride.customerId });
      console.log('Customer exists in customers collection?', !!customerExists);
      
      if (!customerExists) {
        console.log('❌ WARNING: Customer ID in ride does not exist in customers collection!');
        console.log('   This will cause populate to fail and return null');
        console.log('   Customer ID:', ride.customerId);
      } else {
        console.log('✅ Customer found:', {
          id: customerExists._id,
          email: customerExists.email,
          name: `${customerExists.firstName} ${customerExists.lastName}`
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkDriver();
