const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/fire_go');
    const db = mongoose.connection.db;
    
    const collections = await db.listCollections().toArray();
    console.log('📚 Collections in fire_go database:');
    collections.forEach(c => {
      console.log('  -', c.name);
    });
    
    // Kiểm tra drivers collection
    const driverCount = await db.collection('drivers').countDocuments();
    console.log('\n🚗 drivers collection has', driverCount, 'documents');
    
    // Kiểm tra Driver collection (singular)
    try {
      const Driver = await db.collection('Driver');
      const count = await Driver.countDocuments();
      console.log('Driver collection has', count, 'documents');
    } catch (e) {
      console.log('Driver collection does not exist');
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
