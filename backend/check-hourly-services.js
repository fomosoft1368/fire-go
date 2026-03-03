const mongoose = require('mongoose');
require('dotenv').config();

const hourlyServiceSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
  hours: Number,
  selectedDate: Number,
  selectedTime: String,
  address: String,
  notes: String,
  services: Array,
  estimatedPrice: Number,
  actualPrice: Number,
  status: String,
  createdAt: Date,
  updatedAt: Date,
});

async function checkHourlyServices() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    const HourlyService = mongoose.model('HourlyService', hourlyServiceSchema);
    const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }));

    // Check hourly services
    const services = await HourlyService.find().limit(5);
    console.log(`📊 Total hourly services: ${await HourlyService.countDocuments()}`);
    console.log(`📋 Pending services: ${await HourlyService.countDocuments({ status: 'pending' })}`);
    console.log(`✅ Completed services: ${await HourlyService.countDocuments({ status: 'completed' })}\n`);

    if (services.length > 0) {
      console.log('🔍 Sample services:');
      for (const service of services.slice(0, 3)) {
        const customer = await Customer.findById(service.customerId);
        console.log(`\nService ID: ${service._id}`);
        console.log(`  Status: ${service.status}`);
        console.log(`  Customer ID: ${service.customerId}`);
        if (customer) {
          console.log(`  Customer Name: ${customer.firstName} ${customer.lastName}`);
          console.log(`  Customer Email: ${customer.email}`);
          console.log(`  Customer Phone: ${customer.phone}`);
        } else {
          console.log('  ⚠️ Customer NOT FOUND in database');
        }
        console.log(`  Address: ${service.address}`);
        console.log(`  Hours: ${service.hours}h`);
        console.log(`  Price: ${service.estimatedPrice.toLocaleString('vi-VN')}đ`);
      }
    } else {
      console.log('⚠️ No hourly services found in database');
      console.log('\n💡 Tip: Create some hourly services via mobile app first');
    }

    // Check customers
    const customerCount = await Customer.countDocuments();
    console.log(`\n👥 Total customers in database: ${customerCount}`);
    
    if (customerCount > 0) {
      const sampleCustomers = await Customer.find().limit(3);
      console.log('\n📋 Sample customers:');
      sampleCustomers.forEach((c, i) => {
        console.log(`  ${i + 1}. ${c.firstName} ${c.lastName} (${c.email})`);
      });
    }

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkHourlyServices();
