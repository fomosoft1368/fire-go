/**
 * Seed Delivery Pricing Config to Database
 * Run: node seed-delivery-pricing.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// MongoDB connection - Sử dụng connection string từ .env
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/firego';

console.log('📍 Database URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials

const PricingConfigSchema = new mongoose.Schema({
  vehicleTypes: [{ 
    type: { type: String },
    name: String,
    baseFee: Number,
    pricePerKm: Number,
    minimumFare: Number
  }],
  peakMultiplier: Number,
  driverShare: Number,
  maxDiscountRate: Number,
  carpoolDiscounts: [{
    passengers: Number,
    discount: Number
  }],
  peakHours: [{
    id: String,
    name: String,
    startTime: String,
    endTime: String,
    multiplier: Number
  }],
  // Delivery config
  deliveryGoodsTypes: [{
    key: String,
    label: String,
    icon: String,
    surcharge: Number
  }],
  deliveryWeightRanges: [{
    key: String,
    label: String,
    surcharge: Number
  }],
  deliveryVehicleTypes: [{
    key: String,
    label: String,
    description: String,
    icon: String,
    vehicleTypeMapping: String
  }],
  // Hire driver config
  hireDriverPricing: [{
    vehicleType: String,
    name: String,
    openingFee: Number,
    freeKm: Number,
    pricePerExtraKm: Number,
    description: String
  }]
}, { timestamps: true });

const PricingConfig = mongoose.model('PricingConfig', PricingConfigSchema);

async function seedDeliveryPricing() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Lấy config hiện tại hoặc tạo mới
    let config = await PricingConfig.findOne();
    
    if (!config) {
      console.log('📝 Creating new pricing config...');
      config = new PricingConfig({
        vehicleTypes: [
          { type: 'bike', name: 'Xe máy', baseFee: 15000, pricePerKm: 1500, minimumFare: 20000 },
          { type: 'sedan', name: 'Sedan (4-5 chỗ)', baseFee: 20000, pricePerKm: 2000, minimumFare: 30000 },
          { type: 'suv', name: 'SUV (7 chỗ)', baseFee: 25000, pricePerKm: 2500, minimumFare: 40000 },
          { type: 'truck', name: 'Truck (Bán tải)', baseFee: 30000, pricePerKm: 3000, minimumFare: 50000 }
        ],
        peakMultiplier: 1.5,
        driverShare: 85,
        maxDiscountRate: 30,
        carpoolDiscounts: [
          { passengers: 1, discount: 0 },
          { passengers: 2, discount: 15 },
          { passengers: 3, discount: 25 },
          { passengers: 4, discount: 30 }
        ],
        peakHours: []
      });
    }

    // ============ CẬP NHẬT VEHICLE TYPES ============
    console.log('🚗 Updating vehicle types (adding bike if not exists)...');
    
    // Kiểm tra nếu chưa có bike thì thêm vào
    const hasBike = config.vehicleTypes.some(v => v.type === 'bike');
    if (!hasBike) {
      console.log('➕ Adding bike to vehicleTypes...');
      config.vehicleTypes.unshift({
        type: 'bike',
        name: 'Xe máy',
        baseFee: 15000,
        pricePerKm: 1500,
        minimumFare: 20000
      });
    } else {
      console.log('✓ Bike already exists in vehicleTypes');
    }

    // ============ GIAO HÀNG - Seed Delivery Config ============
    console.log('🚚 Seeding delivery pricing config...');
    
    config.deliveryGoodsTypes = [
      {
        key: 'light',
        label: 'Hàng nhẹ',
        icon: 'cube-outline',
        surcharge: 0
      },
      {
        key: 'bulky',
        label: 'Cồng kềnh',
        icon: 'archive-outline',
        surcharge: 10000
      },
      {
        key: 'food',
        label: 'Thực phẩm',
        icon: 'food-apple-outline',
        surcharge: 5000
      }
    ];

    config.deliveryWeightRanges = [
      {
        key: '<20',
        label: '< 20kg',
        surcharge: 5000
      },
      {
        key: '20-50',
        label: '20-50kg',
        surcharge: 15000
      },
      {
        key: '>50',
        label: '> 50kg',
        surcharge: 30000
      }
    ];

    config.deliveryVehicleTypes = [
      {
        key: 'bike',
        label: 'Xe máy',
        description: 'Phù hợp hàng nhỏ',
        icon: 'motorbike',
        vehicleTypeMapping: 'bike'
      },
      {
        key: 'truck',
        label: 'Xe tải nhỏ',
        description: 'Sức tải 500kg',
        icon: 'truck-outline',
        vehicleTypeMapping: 'truck'
      }
    ];

    // ============ LÁI XE HỘ - Seed Hire Driver Pricing ============
    console.log('🚗 Seeding hire driver pricing config...');
    
    config.hireDriverPricing = [
      {
        vehicleType: 'bike',
        name: 'Xe máy',
        openingFee: 50000,
        freeKm: 5,
        pricePerExtraKm: 5000,
        description: 'Phí mở cửa 50k bao gồm 5km đầu, vượt 5k/km'
      },
      {
        vehicleType: 'sedan',
        name: 'Sedan (4-5 chỗ)',
        openingFee: 100000,
        freeKm: 10,
        pricePerExtraKm: 10000,
        description: 'Phí mở cửa 100k bao gồm 10km đầu, vượt 10k/km'
      },
      {
        vehicleType: 'suv',
        name: 'SUV (7 chỗ)',
        openingFee: 150000,
        freeKm: 10,
        pricePerExtraKm: 15000,
        description: 'Phí mở cửa 150k bao gồm 10km đầu, vượt 15k/km'
      },
      {
        vehicleType: 'truck',
        name: 'Truck (Bán tải)',
        openingFee: 200000,
        freeKm: 10,
        pricePerExtraKm: 20000,
        description: 'Phí mở cửa 200k bao gồm 10km đầu, vượt 20k/km'
      }
    ];

    await config.save();
    
    console.log('✅ Delivery & Hire Driver pricing config seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`  • Goods Types: ${config.deliveryGoodsTypes.length}`);
    config.deliveryGoodsTypes.forEach(g => {
      console.log(`    - ${g.label} (${g.key}): +${g.surcharge.toLocaleString('vi-VN')}đ`);
    });
    
    console.log(`  • Weight Ranges: ${config.deliveryWeightRanges.length}`);
    config.deliveryWeightRanges.forEach(w => {
      console.log(`    - ${w.label}: +${w.surcharge.toLocaleString('vi-VN')}đ`);
    });
    
    console.log(`  • Vehicle Types: ${config.deliveryVehicleTypes.length}`);
    config.deliveryVehicleTypes.forEach(v => {
      console.log(`    - ${v.label} (${v.icon}) → maps to ${v.vehicleTypeMapping}`);
    });

    console.log(`  • Hire Driver Pricing: ${config.hireDriverPricing.length}`);
    config.hireDriverPricing.forEach(h => {
      console.log(`    - ${h.name}: ${h.openingFee.toLocaleString('vi-VN')}đ (${h.freeKm}km) + ${h.pricePerExtraKm.toLocaleString('vi-VN')}đ/km`);
    });

  } catch (error) {
    console.error('❌ Error seeding delivery pricing:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

seedDeliveryPricing();
