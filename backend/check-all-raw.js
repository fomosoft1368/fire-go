const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect('mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH');
    const db = mongoose.connection.db;
    
    // Check ALL drivers without filter
    const allDrivers = await db.collection('drivers').find({}).toArray();
    console.log('Total ALL drivers (no filter):', allDrivers.length);
    
    allDrivers.forEach((d, i) => {
      console.log(`\n${i+1}. ${d.firstName} ${d.lastName}`);
      console.log(`   Email: ${d.email}`);
      console.log(`   Status: ${d.status}`);
      console.log(`   Location: [${d.currentLocation?.coordinates?.join(', ') || 'NONE'}]`);
    });
    
    // Check only "dat_xe" database
    console.log('\n\n=== Check MongoDB info ===');
    const adminDb = db.admin();
    const databases = await adminDb.listDatabases();
    console.log('All databases:');
    databases.databases.forEach(db => {
      console.log(`  - ${db.name}`);
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
