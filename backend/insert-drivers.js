const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const driverSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  firstName: String,
  lastName: String,
  vehicleModel: String,
  vehicleColor: String,
  vehiclePlate: { type: String, required: true },
  status: { type: String, default: 'offline' },
  isAcceptingRides: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },
  currentLocation: {
    type: { type: String, enum: ['Point'] },
    coordinates: [Number],
  },
  totalRides: { type: Number, default: 0 },
  averageRating: { type: Number, default: 5 },
}, { timestamps: true });

const sampleDrivers = [
  {
    firstName: 'Hoàng',
    lastName: 'Anh',
    email: 'driver1@datxe.com',
    phone: '+84901000001',
    password: 'Driver@123',
    vehicleModel: 'Toyota Camry',
    vehicleColor: 'Trắng',
    vehiclePlate: '51A-123.45',
  },
  {
    firstName: 'Bình',
    lastName: 'Sơn',
    email: 'driver2@datxe.com',
    phone: '+84901000002',
    password: 'Driver@123',
    vehicleModel: 'Honda Civic',
    vehicleColor: 'Đen',
    vehiclePlate: '51B-456.78',
  },
  {
    firstName: 'Cường',
    lastName: 'Tâm',
    email: 'driver3@datxe.com',
    phone: '+84901000003',
    password: 'Driver@123',
    vehicleModel: 'Hyundai Accent',
    vehicleColor: 'Bạc',
    vehiclePlate: '51C-789.01',
  },
  {
    firstName: 'Dũng',
    lastName: 'Hải',
    email: 'driver4@datxe.com',
    phone: '+84901000004',
    password: 'Driver@123',
    vehicleModel: 'Kia Morning',
    vehicleColor: 'Đỏ',
    vehiclePlate: '51D-234.56',
  },
  {
    firstName: 'Ếu',
    lastName: 'Mạnh',
    email: 'driver5@datxe.com',
    phone: '+84901000005',
    password: 'Driver@123',
    vehicleModel: 'Ford Focus',
    vehicleColor: 'Xám',
    vehiclePlate: '51E-567.89',
  },
];

(async () => {
  try {
    const collection = await mongoose.connect('mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH');
    
    const db = collection.connection.db;
    
    // Drop and recreate
    try {
      await db.collection('drivers').drop();
      console.log('✅ Dropped old drivers collection');
    } catch (e) {
      console.log('ℹ️  No old drivers to drop');
    }
    
    const Driver = mongoose.model('Driver', driverSchema);
    
    console.log('\n📝 Creating drivers...');
    for (const data of sampleDrivers) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(data.password, salt);
      
      const result = await Driver.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        vehicleModel: data.vehicleModel,
        vehicleColor: data.vehicleColor,
        vehiclePlate: data.vehiclePlate,
        status: 'online',
        isAcceptingRides: true,
        isSuspended: false,
        currentLocation: {
          type: 'Point',
          coordinates: [105.6909, 18.6867], // Nghệ An - Vinh
        },
        totalRides: Math.floor(Math.random() * 100) + 10,
        averageRating: (Math.random() * 1 + 4.5).toFixed(1),
      });
      
      console.log(`✅ Created: ${data.email} (${result._id})`);
    }
    
    // Verify
    const count = await Driver.countDocuments();
    console.log(`\n📊 Total drivers: ${count}`);
    
    const available = await Driver.countDocuments({
      status: 'online',
      isAcceptingRides: true,
      currentLocation: { $exists: true }
    });
    console.log(`📍 Available drivers: ${available}`);
    
    await mongoose.disconnect();
    console.log('\n✨ Done!');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
