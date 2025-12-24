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
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fire_go';
    console.log(`🔗 Connecting to MongoDB Atlas...`);
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', userSchema);
    const Customer = mongoose.model('Customer', customerSchema);

    console.log('\n🌱 Starting seed data...\n');

    // Drop old collections to remove old indexes
    try {
      await Customer.collection.drop();
      console.log('🗑️  Dropped old customers collection');
    } catch (err) {
      console.log('ℹ️  No old customers collection to drop');
    }

    try {
      await User.collection.drop();
      console.log('🗑️  Dropped old users collection');
    } catch (err) {
      console.log('ℹ️  No old users collection to drop');
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

        console.log(`✅ Created independent customer: ${customer.email}`);
      } catch (error: any) {
        console.error(`❌ Error:`, error.message);
      }
    }

    console.log('\n✨ Seed data completed!');
    console.log('\n📊 Sample Login Credentials:');
    console.log('━'.repeat(50));
    sampleCustomers.forEach(customer => {
      console.log(`Email:    ${customer.email}`);
      console.log(`Password: ${customer.password}`);
      console.log(`Phone:    ${customer.phone}`);
      console.log('─'.repeat(50));
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
