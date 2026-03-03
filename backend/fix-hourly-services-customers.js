const mongoose = require('mongoose');
require('dotenv').config();

async function fixHourlyServices() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }));
    const HourlyService = mongoose.model('HourlyService', new mongoose.Schema({}, { strict: false }));

    // Get first real customer
    const realCustomers = await Customer.find().limit(3);
    
    if (realCustomers.length === 0) {
      console.log('❌ No customers found in database. Cannot fix services.');
      process.exit(1);
    }

    console.log(`✅ Found ${realCustomers.length} customers to use:\n`);
    realCustomers.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.firstName} ${c.lastName} (ID: ${c._id})`);
    });

    // Update all hourly services with invalid customer IDs
    const invalidCustomerId = '6968adb1a7873e499b7886c6';
    const services = await HourlyService.find({ customerId: invalidCustomerId });
    
    console.log(`\n🔧 Found ${services.length} services with invalid customer ID`);
    console.log('📝 Updating services to use real customers...\n');

    // Distribute services among real customers
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      const customerIndex = i % realCustomers.length;
      const newCustomerId = realCustomers[customerIndex]._id;
      
      await HourlyService.updateOne(
        { _id: service._id },
        { customerId: newCustomerId }
      );
      
      console.log(`  ✅ Service ${service._id} -> Customer: ${realCustomers[customerIndex].firstName} ${realCustomers[customerIndex].lastName}`);
    }

    console.log(`\n✅ Successfully updated ${services.length} hourly services`);

    // Verify
    console.log('\n🔍 Verification:');
    const verifyServices = await HourlyService.find().limit(3).populate('customerId', 'firstName lastName email phone');
    
    for (const service of verifyServices) {
      if (service.customerId) {
        console.log(`  ✅ Service ${service._id}`);
        console.log(`     Customer: ${service.customerId.firstName} ${service.customerId.lastName}`);
        console.log(`     Email: ${service.customerId.email}`);
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Done! Refresh your web admin page now.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixHourlyServices();
