const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const addonServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    icon: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    duration: { type: Number, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

const mockAddonServices = [
  {
    name: 'Vệ sinh Sofa',
    icon: 'sofa',
    description: 'Vệ sinh và khử mùi sofa chuyên sâu',
    price: 250000,
    duration: 30,
    status: 'active',
  },
  {
    name: 'Giặt rèm cửa',
    icon: 'window',
    description: 'Giặt và sấy rèm cửa chuyên nghiệp',
    price: 150000,
    duration: 45,
    status: 'active',
  },
  {
    name: 'Vệ sinh tủ lạnh',
    icon: 'refrigerator',
    description: 'Vệ sinh trong/ngoài tủ lạnh sạch sẽ',
    price: 100000,
    duration: 20,
    status: 'active',
  },
  {
    name: 'Vệ sinh điều hòa',
    icon: 'air_conditioner',
    description: 'Vệ sinh lọc điều hòa hiệu quả',
    price: 200000,
    duration: 25,
    status: 'active',
  },
  {
    name: 'Giặt nệm',
    icon: 'bed',
    description: 'Giặt và sấy nệm khô ráo',
    price: 350000,
    duration: 60,
    status: 'active',
  },
  {
    name: 'Giặt thảm',
    icon: 'carpet',
    description: 'Giặt thảm sạch sẽ với máy chuyên dụng',
    price: 300000,
    duration: 50,
    status: 'active',
  },
  {
    name: 'Vệ sinh máy giặt',
    icon: 'washing_machine',
    description: 'Vệ sinh bên trong máy giặt chu kỳ',
    price: 150000,
    duration: 30,
    status: 'active',
  },
  {
    name: 'Vệ sinh bếp',
    icon: 'kitchen',
    description: 'Vệ sinh bếp toàn bộ sạch sẽ',
    price: 350000,
    duration: 60,
    status: 'active',
  },
  {
    name: 'Vệ sinh phòng tắm',
    icon: 'bathroom',
    description: 'Vệ sinh phòng tắm deepclean',
    price: 300000,
    duration: 45,
    status: 'active',
  },
  {
    name: 'Vệ sinh cửa kính',
    icon: 'window',
    description: 'Vệ sinh cửa kính cho nhà sạch sẽ',
    price: 100000,
    duration: 20,
    status: 'inactive',
  },
];

async function seedAddonServices() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('addonservices');

    // Clear existing data
    await collection.deleteMany({});
    console.log('Cleared existing addon services');

    // Insert mock data
    const result = await collection.insertMany(mockAddonServices.map((service) => ({
      ...service,
      createdAt: new Date(),
      updatedAt: new Date(),
    })));

    console.log(`✅ Seeded ${result.insertedCount} addon services`);

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding addon services:', error);
    process.exit(1);
  }
}

seedAddonServices();
