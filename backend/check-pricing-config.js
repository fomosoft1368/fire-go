const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/ride-sharing-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function checkConfig() {
  try {
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // List all collections first
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📂 ALL COLLECTIONS:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Try to find pricing config in different collection names
    const possibleNames = ['pricingconfigs', 'pricing_configs', 'PricingConfigs'];
    
    for (const collectionName of possibleNames) {
      console.log(`\n🔍 Checking collection: ${collectionName}`);
      const Schema = new mongoose.Schema({}, { strict: false });
      const Model = mongoose.model(collectionName + '_check', Schema, collectionName);
      
      const count = await Model.countDocuments({});
      console.log(`   Count: ${count}`);
      
      if (count > 0) {
        const config = await Model.findOne({});
        console.log('\n✅ FOUND PRICING CONFIG:');
        console.log('_id:', config._id);
        console.log('\nvehicleTypes:');
        config.vehicleTypes?.forEach(v => {
          console.log(`  - ${v.type}: ${v.pricePerKm}đ/km, base: ${v.baseFee}đ`);
        });
        console.log('\ncarpoolDiscounts:');
        config.carpoolDiscounts?.forEach(d => {
          console.log(`  - ${d.passengers} người: giảm ${d.discount}%`);
        });
        console.log('\npeakMultiplier:', config.peakMultiplier);
        console.log('driverShare:', config.driverShare + '%');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  }
}

checkConfig();
