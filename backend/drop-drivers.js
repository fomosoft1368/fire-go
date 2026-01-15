const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH');
    const db = mongoose.connection.db;
    
    console.log('🗑️  Dropping drivers collection...');
    try {
      await db.collection('drivers').drop();
      console.log('✅ Dropped');
    } catch (e) {
      console.log('ℹ️  Collection does not exist');
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
