const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH');
    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('All collections in dat_xe:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // Check drivers collection count
    const driversCount = await db.collection('drivers').countDocuments();
    console.log(`\nTotal documents in drivers collection: ${driversCount}`);
    
    // Get all driver names
    const allDrivers = await db.collection('drivers').find({}).toArray();
    console.log('\nAll drivers:');
    allDrivers.forEach((d, i) => {
      console.log(`  ${i+1}. ${d.firstName} ${d.lastName} - Coords: [${d.currentLocation?.coordinates?.join(', ') || 'N/A'}]`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
