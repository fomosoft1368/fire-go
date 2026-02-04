import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// User Schema
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    avatar: String,
    role: { type: String, required: true, enum: ['driver', 'customer', 'admin', 'staff'] },
    status: { type: String, default: 'active', enum: ['active', 'inactive', 'suspended', 'banned'] },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    lastLoginAt: Date,
    lastLogoutAt: Date,
  },
  { timestamps: true }
);

// Driver Schema
const driverSchema = new mongoose.Schema(
  {
    // Authentication fields (independent drivers)
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: Date,
    address: String,
    status: { type: String, default: 'offline', enum: ['offline', 'online', 'on_trip', 'break'] },
    vehicleLicense: String,
    vehicleModel: String,
    vehicleColor: String,
    vehiclePlate: { type: String, required: true },
    vehicleImage: String,
    licenseNumber: String,
    licenseExpiry: Date,
    licenseImage: String,
    licenseStatus: { type: String, default: 'approved', enum: ['pending', 'approved', 'rejected', 'expired'] },
    idNumber: String,
    idImage: String,
    idStatus: { type: String, default: 'approved', enum: ['pending', 'approved', 'rejected', 'expired'] },
    profilePhoto: String,
    profilePhotoStatus: { type: String, default: 'approved', enum: ['pending', 'approved', 'rejected', 'expired'] },
    bankName: String,
    bankAccount: String,
    bankAccountHolder: String,
    bankStatus: { type: String, default: 'verified', enum: ['pending', 'verified', 'failed'] },
    insuranceProvider: String,
    insurancePolicyNumber: String,
    insuranceExpiryDate: Date,
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number],
    },
    totalRides: { type: Number, default: 0 },
    completedRides: { type: Number, default: 0 },
    cancelledRides: { type: Number, default: 0 },
    averageRating: { type: Number, default: 5 },
    totalReviews: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    acceptanceRate: { type: Number, default: 100 },
    cancellationRate: { type: Number, default: 0 },
    allowNotifications: { type: Boolean, default: true },
    allowSMS: { type: Boolean, default: true },
    allowEmail: { type: Boolean, default: true },
    verificationStatus: { type: String, default: 'pending', enum: ['pending', 'verified', 'rejected'] },
    isBlacklisted: { type: Boolean, default: false },
    blacklistReason: String,
    isAccountLocked: { type: Boolean, default: false },
    isAcceptingRides: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },
    suspensionReason: String,
    suspendedUntil: Date,
    lastOnlineTime: Date,
    lastLocationUpdate: Date,
    backgroundCheckPassed: { type: Boolean, default: false },
    backgroundCheckDate: Date,
    vehicleRegistration: String,
    completionRate: { type: Number, default: 0 },
    approvedAt: Date,
    approvedBy: String,
  },
  { timestamps: true }
);

// Customer Schema (independent, not linked to User)
const customerSchema = new mongoose.Schema(
  {
    // Authentication fields
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    avatar: String,

    // Contact information
    dateOfBirth: Date,
    gender: String,
    address: String,
    shareRidePreference: { type: Boolean, default: true },
    preferredDriverGender: String,
    savedAddresses: [
      {
        label: String,
        address: String,
        coordinates: {
          type: { type: String, enum: ['Point'], default: 'Point' },
          coordinates: [Number],
        },
      },
    ],
    emergencyContacts: [
      {
        name: String,
        phone: String,
        relationship: String,
      },
    ],
    totalRides: { type: Number, default: 0 },
    completedRides: { type: Number, default: 0 },
    cancelledRides: { type: Number, default: 0 },
    averageRating: { type: Number, default: 5 },
    totalReviews: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    allowNotifications: { type: Boolean, default: true },
    allowSMS: { type: Boolean, default: true },
    allowEmail: { type: Boolean, default: true },
    shareLocationDuringRide: { type: Boolean, default: false },
    notifyEmergencyContacts: { type: Boolean, default: false },
    isBlacklisted: { type: Boolean, default: false },
    blacklistReason: String,
    isAccountLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH';
    console.log(`🔗 Connecting to MongoDB...`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', userSchema);
    const Driver = mongoose.model('Driver', driverSchema);
    const Customer = mongoose.model('Customer', customerSchema);

    console.log('\n🌱 Starting seed data...\n');

    // Drop old collections to remove old indexes
    try {
      await User.collection.drop();
      console.log('🗑️  Dropped old users collection');
    } catch (err) {
      console.log('ℹ️  No old users collection to drop');
    }

    try {
      await Driver.collection.drop();
      console.log('🗑️  Dropped old drivers collection');
    } catch (err) {
      console.log('ℹ️  No old drivers collection to drop');
    }

    try {
      await Customer.collection.drop();
      console.log('🗑️  Dropped old customers collection');
    } catch (err) {
      console.log('ℹ️  No old customers collection to drop');
    }

    // Sample driver data
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
        licenseNumber: 'DL12345678',
        licenseExpiry: new Date('2026-12-31'),
        idNumber: 'ID12345678',
        bankName: 'Vietcombank',
        bankAccount: '1234567890',
        bankAccountHolder: 'Hoàng Anh',
      },
      {
        firstName: 'Minh',
        lastName: 'Tuấn',
        email: 'driver2@datxe.com',
        phone: '+84901000002',
        password: 'Driver@123',
        vehicleModel: 'Honda Civic',
        vehicleColor: 'Đen',
        vehiclePlate: '51B-456.78',
        licenseNumber: 'DL87654321',
        licenseExpiry: new Date('2026-06-30'),
        idNumber: 'ID87654321',
        bankName: 'Techcombank',
        bankAccount: '0987654321',
        bankAccountHolder: 'Minh Tuấn',
      },
      {
        firstName: 'Việt',
        lastName: 'Hùng',
        email: 'driver3@datxe.com',
        phone: '+84901000003',
        password: 'Driver@123',
        vehicleModel: 'Hyundai Accent',
        vehicleColor: 'Bạc',
        vehiclePlate: '51C-789.01',
        licenseNumber: 'DL11223344',
        licenseExpiry: new Date('2025-09-15'),
        idNumber: 'ID11223344',
        bankName: 'Agribank',
        bankAccount: '1122334455',
        bankAccountHolder: 'Việt Hùng',
      },
      {
        firstName: 'Quang',
        lastName: 'Hải',
        email: 'driver4@datxe.com',
        phone: '+84901000004',
        password: 'Driver@123',
        vehicleModel: 'Kia Morning',
        vehicleColor: 'Đỏ',
        vehiclePlate: '51D-234.56',
        licenseNumber: 'DL55667788',
        licenseExpiry: new Date('2027-03-20'),
        idNumber: 'ID55667788',
        bankName: 'MB Bank',
        bankAccount: '5566778899',
        bankAccountHolder: 'Quang Hải',
      },
      {
        firstName: 'Thắng',
        lastName: 'Sơn',
        email: 'driver5@datxe.com',
        phone: '+84901000005',
        password: 'Driver@123',
        vehicleModel: 'Ford Focus',
        vehicleColor: 'Xám',
        vehiclePlate: '51E-567.89',
        licenseNumber: 'DL99887766',
        licenseExpiry: new Date('2026-11-10'),
        idNumber: 'ID99887766',
        bankName: 'ACB',
        bankAccount: '9988776655',
        bankAccountHolder: 'Thắng Sơn',
      },
    ];

    // Create drivers (independent accounts - no User collection needed)
    for (const driverData of sampleDrivers) {
      try {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(driverData.password, salt);

        // Create driver profile with authentication fields
        console.log(`[DEBUG] Creating driver ${driverData.email}...`);
        const driver = await Driver.create({
          firstName: driverData.firstName,
          lastName: driverData.lastName,
          email: driverData.email,
          phone: driverData.phone,
          password: hashedPassword,
          vehicleModel: driverData.vehicleModel,
          vehicleColor: driverData.vehicleColor,
          vehiclePlate: driverData.vehiclePlate,
          licenseNumber: driverData.licenseNumber,
          licenseExpiry: driverData.licenseExpiry,
          licenseStatus: 'approved',
          idNumber: driverData.idNumber,
          idStatus: 'approved',
          bankName: driverData.bankName,
          bankAccount: driverData.bankAccount,
          bankAccountHolder: driverData.bankAccountHolder,
          bankStatus: 'verified',
          status: 'online',
          isOnline: true, // Sync with status field
          isAvailable: true,
          isAcceptingRides: true,
          isSuspended: false,
          verificationStatus: 'verified',
          lastOnlineTime: new Date(), // Set initial heartbeat
          currentLocation: {
            type: 'Point',
            coordinates: [105.8542, 21.0285], // Hà Nội
          },
          totalRides: Math.floor(Math.random() * 100) + 10,
          completedRides: Math.floor(Math.random() * 90) + 5,
          cancelledRides: Math.floor(Math.random() * 10),
          averageRating: (Math.random() * 1 + 4.5).toFixed(1), // 4.5 - 5.5
          totalEarnings: Math.floor(Math.random() * 50000000) + 5000000,
        });

        console.log(`✅ Created driver: ${driverData.email} (ID: ${driver._id})`);
      } catch (error: any) {
        console.error(`❌ Error creating ${driverData.email}:`, error.message);
        console.error('Full error:', error);
      }
    }

    // Sample customer data
    const sampleCustomers = [
      {
        firstName: 'Nguyễn',
        lastName: 'Văn A',
        email: 'nguyenvana@example.com',
        phone: '+84987100100',
        password: 'password123',
      },
      {
        firstName: 'Trần',
        lastName: 'Thị B',
        email: 'tranthib@example.com',
        phone: '+84987100200',
        password: 'password123',
      },
      {
        firstName: 'Phạm',
        lastName: 'Văn C',
        email: 'phamvanc@example.com',
        phone: '+84987100300',
        password: 'password123',
      },
      {
        firstName: 'Lê',
        lastName: 'Thị D',
        email: 'lethid@example.com',
        phone: '+84987100400',
        password: 'password123',
      },
      {
        firstName: 'Võ',
        lastName: 'Văn E',
        email: 'vovane@example.com',
        phone: '+84987100500',
        password: 'password123',
      },
    ];

    // Create customers (independent accounts)
    for (const customerData of sampleCustomers) {
      try {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(customerData.password, salt);

        // Create customer with all authentication fields
        const customer = await Customer.create({
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          email: customerData.email,
          phone: customerData.phone,
          password: hashedPassword,
          shareRidePreference: true,
          savedAddresses: [
            {
              label: 'Nhà',
              address: 'Hà Nội, Việt Nam',
              coordinates: {
                type: 'Point',
                coordinates: [105.8542, 21.0285],
              },
            },
            {
              label: 'Công ty',
              address: 'Trung tâm TP. Hồ Chí Minh',
              coordinates: {
                type: 'Point',
                coordinates: [106.7015, 10.7769],
              },
            },
          ],
          emergencyContacts: [],
        });

        console.log(`✅ Created customer: ${customer.email}`);
      } catch (error: any) {
        console.error(`❌ Error:`, error.message);
      }
    }

    console.log('\n✨ Seed data completed!');
    console.log('\n📊 Sample Driver Login Credentials:');
    console.log('━'.repeat(60));
    sampleDrivers.forEach(driver => {
      console.log(`Email:    ${driver.email}`);
      console.log(`Password: ${driver.password}`);
      console.log(`Phone:    ${driver.phone}`);
      console.log(`Vehicle:  ${driver.vehicleModel} (${driver.vehicleColor})`);
      console.log(`Plate:    ${driver.vehiclePlate}`);
      console.log('─'.repeat(60));
    });

    console.log('\n📊 Sample Customer Login Credentials:');
    console.log('━'.repeat(60));
    sampleCustomers.forEach(customer => {
      console.log(`Email:    ${customer.email}`);
      console.log(`Password: ${customer.password}`);
      console.log('─'.repeat(60));
    });

  } catch (error) {
    console.error('❌ Seed failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from MongoDB');
    process.exit(0);
  }
}

seed();
