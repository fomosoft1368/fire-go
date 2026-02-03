require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

const PricingConfigSchema = new mongoose.Schema({
  vehicleTypes: Array,
  hireDriverPricing: Array,
}, { timestamps: true });

const PricingConfig = mongoose.model('PricingConfig', PricingConfigSchema);

async function testHireDriverPricing() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const config = await PricingConfig.findOne();
    
    if (!config) {
      console.log('❌ No pricing config found');
      return;
    }

    console.log('\n📊 Hire Driver Pricing Config:');
    console.log('=====================================');
    
    if (!config.hireDriverPricing || config.hireDriverPricing.length === 0) {
      console.log('❌ No hire driver pricing found');
      return;
    }

    config.hireDriverPricing.forEach(h => {
      console.log(`\n🚗 ${h.name}:`);
      console.log(`   Phí mở cửa: ${h.openingFee.toLocaleString('vi-VN')}đ`);
      console.log(`   KM miễn phí: ${h.freeKm}km`);
      console.log(`   Phí vượt: ${h.pricePerExtraKm.toLocaleString('vi-VN')}đ/km`);
      console.log(`   Description: ${h.description || 'N/A'}`);
      
      // Test calculation
      const testDistances = [5, 10, 15, 20];
      console.log(`   Ví dụ tính giá:`);
      testDistances.forEach(distance => {
        const extraKm = Math.max(0, distance - h.freeKm);
        const total = h.openingFee + (extraKm * h.pricePerExtraKm);
        console.log(`     ${distance}km → ${total.toLocaleString('vi-VN')}đ`);
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

testHireDriverPricing();
