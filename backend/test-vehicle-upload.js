const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH')
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Get Ride model
    const rideSchema = new mongoose.Schema({}, { strict: false });
    const Ride = mongoose.model('Ride', rideSchema, 'rides');
    
    // Find the specific ride that was just uploaded
    const targetRideId = '69870d279dec13a6553bb5ac'; // From the upload log
    const ride = await Ride.findById(targetRideId).select('_id status vehicleCondition').lean();
    
    if (ride) {
      console.log(`\n📋 Target ride: ${ride._id}`);
      console.log(`  Status: ${ride.status}`);
      console.log(`  Has vehicleCondition: ${!!ride.vehicleCondition}`);
      if (ride.vehicleCondition) {
        console.log(`  PreTrip completed: ${ride.vehicleCondition.preTrip?.completed}`);
        console.log(`  PreTrip images: ${Object.keys(ride.vehicleCondition.preTrip?.images || {}).length} photos`);
        console.log(`  Image keys:`, Object.keys(ride.vehicleCondition.preTrip?.images || {}));
        console.log(`  Captured at: ${ride.vehicleCondition.preTrip?.capturedAt}`);
      }
    } else {
      console.log(`\n❌ Ride ${targetRideId} not found`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Done');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
