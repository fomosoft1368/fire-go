const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const driverSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: String,
  status: String,
  isAcceptingRides: { type: Boolean, default: true },
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number],
  },
}, { timestamps: true });

(async () => {
  try {
    await mongoose.connect('mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH');
    
    // Test collection name
    const Driver = mongoose.model('Driver', driverSchema);
    console.log('Collection name:', Driver.collection.name);
    
    // Try creating
    const driver = await Driver.create({
      email: 'test-driver@example.com',
      password: 'test123',
      firstName: 'Test',
      status: 'online',
      isAcceptingRides: true,
      currentLocation: {
        type: 'Point',
        coordinates: [105.8542, 21.0285]
      }
    });
    
    console.log('✅ Created:', driver._id);
    
    // Check count
    const count = await Driver.countDocuments();
    console.log('Total drivers:', count);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
