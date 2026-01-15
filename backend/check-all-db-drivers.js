const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();
    
    // Check each database for drivers
    const databases = ['dat_xe', 'chat_app', 'secure_api', 'xaydungsaigon'];
    
    for (const dbName of databases) {
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      if (collectionNames.includes('drivers')) {
        const count = await db.collection('drivers').countDocuments();
        console.log(`\n📊 Database: ${dbName}`);
        console.log(`   Drivers count: ${count}`);
        
        const drivers = await db.collection('drivers').find({}).project({ name: 1, status: 1, 'currentLocation.coordinates': 1 }).toArray();
        drivers.forEach(d => {
          const coords = d.currentLocation?.coordinates || 'N/A';
          console.log(`   - ${d.name}: ${d.status} at [${coords}]`);
        });
      }
    }
  } finally {
    await client.close();
  }
})();
