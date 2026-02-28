/**
 * Script để khôi phục topupDiscount bị mất do bug updateConfig()
 * 
 * Bug: updateConfig() đã xóa & tạo mới document → mất hết fields khác
 * Fix: Đã sửa updateConfig() để preserve existing fields
 * 
 * Chạy script này để set lại topupDiscount nếu cần
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fire-go';

const pricingConfigSchema = new mongoose.Schema({
  topupDiscountCustomer: Number,
  topupDiscountDriver: Number,
  minTopupAmountDriver: Number,
  minTopupAmountCustomer: Number,
  minWalletBalanceToGoOnline: Number,
  maxTopupAmount: Number,
}, { timestamps: true, strict: false });

const PricingConfig = mongoose.model('PricingConfig', pricingConfigSchema, 'pricingconfigs');

async function restoreTopupDiscount() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const config = await PricingConfig.findOne();
    
    if (!config) {
      console.log('❌ Không tìm thấy PricingConfig');
      process.exit(1);
    }

    console.log('\n📊 Current config:');
    console.log('- topupDiscountCustomer:', config.topupDiscountCustomer ?? 'undefined');
    console.log('- topupDiscountDriver:', config.topupDiscountDriver ?? 'undefined');
    console.log('- minTopupAmountDriver:', config.minTopupAmountDriver ?? 'undefined');
    console.log('- minTopupAmountCustomer:', config.minTopupAmountCustomer ?? 'undefined');
    console.log('- minWalletBalanceToGoOnline:', config.minWalletBalanceToGoOnline ?? 'undefined');
    console.log('- maxTopupAmount:', config.maxTopupAmount ?? 'undefined');

    // Set default topupDiscount nếu bị mất
    let updated = false;

    if (config.topupDiscountCustomer === undefined || config.topupDiscountCustomer === null) {
      config.topupDiscountCustomer = 0; // Hoặc set giá trị bạn muốn, ví dụ: 3
      updated = true;
      console.log('\n✅ Set topupDiscountCustomer = 0 (default)');
    }

    if (config.topupDiscountDriver === undefined || config.topupDiscountDriver === null) {
      config.topupDiscountDriver = 0; // Hoặc set giá trị bạn muốn, ví dụ: 5
      updated = true;
      console.log('✅ Set topupDiscountDriver = 0 (default)');
    }

    // Set các limits nếu chưa có
    if (config.minTopupAmountDriver === undefined) {
      config.minTopupAmountDriver = 10000;
      updated = true;
      console.log('✅ Set minTopupAmountDriver = 10,000');
    }

    if (config.minTopupAmountCustomer === undefined) {
      config.minTopupAmountCustomer = 10000;
      updated = true;
      console.log('✅ Set minTopupAmountCustomer = 10,000');
    }

    if (config.minWalletBalanceToGoOnline === undefined) {
      config.minWalletBalanceToGoOnline = 100000;
      updated = true;
      console.log('✅ Set minWalletBalanceToGoOnline = 100,000');
    }

    if (config.maxTopupAmount === undefined) {
      config.maxTopupAmount = 100000000;
      updated = true;
      console.log('✅ Set maxTopupAmount = 100,000,000');
    }

    if (updated) {
      await config.save();
      console.log('\n✅ Đã lưu config mới');
      
      console.log('\n📊 Config sau khi restore:');
      console.log('- topupDiscountCustomer:', config.topupDiscountCustomer);
      console.log('- topupDiscountDriver:', config.topupDiscountDriver);
      console.log('- minTopupAmountDriver:', config.minTopupAmountDriver);
      console.log('- minTopupAmountCustomer:', config.minTopupAmountCustomer);
      console.log('- minWalletBalanceToGoOnline:', config.minWalletBalanceToGoOnline);
      console.log('- maxTopupAmount:', config.maxTopupAmount);
    } else {
      console.log('\n✅ Config đã đầy đủ, không cần restore');
    }

    console.log('\n💡 Lưu ý:');
    console.log('- Nếu muốn set chiết khấu khác 0%, vào Web Admin → Settings → System tab');
    console.log('- Hoặc sửa script này và set giá trị mong muốn (line 48, 53)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

restoreTopupDiscount();
