require('dotenv').config();
const mongoose = require('mongoose');

async function checkDriver() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const driverId = '69a0fa7be56ebb1bbe097d60';
    
    // Check in drivers collection
    const Driver = mongoose.model('Driver', new mongoose.Schema({}, { strict: false }), 'drivers');
    const driver = await Driver.findById(driverId);

    if (driver) {
      console.log('✅ Driver FOUND in database:');
      console.log('  ID:', driver._id);
      console.log('  Email:', driver.email);
      console.log('  Name:', driver.firstName, driver.lastName);
      console.log('  VehicleType:', driver.vehicleType);
      console.log('  Status:', driver.status);
    } else {
      console.log('❌ Driver NOT FOUND in database');
      console.log('');
      console.log('📋 Listing all drivers:');
      const allDrivers = await Driver.find({}).limit(5);
      allDrivers.forEach(d => {
        console.log(`  - ${d._id} | ${d.email} | ${d.firstName} ${d.lastName}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkDriver();
