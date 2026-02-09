// Test upload vehicle condition trực tiếp vào MongoDB
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH';

async function testDirectUpload() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected');

    // Define schemas
    const vehicleImagesSchema = new mongoose.Schema({
      front: String,
      back: String,
      left: String,
      right: String,
      interior: String,
    }, { _id: false });

    const tripPhaseSchema = new mongoose.Schema({
      completed: { type: Boolean, default: false },
      images: { type: vehicleImagesSchema, default: {} },
      capturedAt: { type: Date, default: null },
    }, { _id: false });

    const vehicleConditionSchema = new mongoose.Schema({
      preTrip: { type: tripPhaseSchema, default: () => ({ completed: false, images: {}, capturedAt: null }) },
      postTrip: { type: tripPhaseSchema, default: () => ({ completed: false, images: {}, capturedAt: null }) },
    }, { _id: false });

    const rideSchema = new mongoose.Schema({
      vehicleCondition: { type: vehicleConditionSchema, default: () => ({
        preTrip: { completed: false, images: {}, capturedAt: null },
        postTrip: { completed: false, images: {}, capturedAt: null }
      }) }
    }, { 
      strict: false,
      timestamps: true 
    });

    const Ride = mongoose.model('Ride', rideSchema, 'rides');

    // Find a ride
    console.log('\n📋 Finding test ride...');
    const ride = await Ride.findOne({});
    
    if (!ride) {
      console.log('❌ No rides found in database');
      await mongoose.disconnect();
      return;
    }

    console.log('✅ Found ride:', ride._id);
    console.log('Current vehicleCondition:', JSON.stringify(ride.vehicleCondition, null, 2));

    // Update vehicle condition
    console.log('\n📸 Updating vehicle condition...');
    
    const testImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDA=='; // tiny test image
    
    if (!ride.vehicleCondition) {
      ride.vehicleCondition = {
        preTrip: { completed: false, images: {}, capturedAt: null },
        postTrip: { completed: false, images: {}, capturedAt: null }
      };
    }

    ride.vehicleCondition.preTrip = {
      completed: true,
      images: {
        front: testImage,
        back: testImage,
        left: testImage
      },
      capturedAt: new Date()
    };

    await ride.save();
    console.log('✅ Saved!');

    // Verify
    console.log('\n🔍 Verifying...');
    const updated = await Ride.findById(ride._id);
    console.log('Updated vehicleCondition:', JSON.stringify(updated.vehicleCondition, null, 2));

    if (updated.vehicleCondition?.preTrip?.completed) {
      console.log('\n✅ SUCCESS! Data saved correctly!');
      console.log(`   - PreTrip completed: ${updated.vehicleCondition.preTrip.completed}`);
      console.log(`   - Images: ${Object.keys(updated.vehicleCondition.preTrip.images).length}`);
    } else {
      console.log('\n❌ FAILED! Data not saved properly.');
    }

    await mongoose.disconnect();
    console.log('\n✅ Done');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

testDirectUpload();
