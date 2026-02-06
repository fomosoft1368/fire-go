const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/?retryWrites=true&w=majority&appName=NATECH';

async function debugQuery() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('fire_go');
    
    const pickupCoords = [105.6792845, 18.6582276];
    
    console.log('\n========== STEP-BY-STEP QUERY DEBUG ==========\n');
    
    // Step 1: All delivery drivers
    console.log('STEP 1: Drivers with delivery type');
    const step1 = await db.collection('drivers').find({
      driverTypes: { $in: ['delivery'] },
    }).toArray();
    console.log(`Found: ${step1.length} drivers`);
    step1.forEach(d => {
      console.log(`  ${d.firstName} ${d.lastName}: ${JSON.stringify(d.driverTypes)}`);
    });
    
    // Step 2: + online
    console.log('\nSTEP 2: + isOnline: true');
    const step2 = await db.collection('drivers').find({
      driverTypes: { $in: ['delivery'] },
      isOnline: true,
    }).toArray();
    console.log(`Found: ${step2.length} drivers`);
    step2.forEach(d => {
      console.log(`  ${d.firstName} ${d.lastName}: online=${d.isOnline}`);
    });
    
    // Step 3: + available
    console.log('\nSTEP 3: + isAvailable: true');
    const step3 = await db.collection('drivers').find({
      driverTypes: { $in: ['delivery'] },
      isOnline: true,
      isAvailable: true,
    }).toArray();
    console.log(`Found: ${step3.length} drivers`);
    step3.forEach(d => {
      console.log(`  ${d.firstName} ${d.lastName}: available=${d.isAvailable}`);
    });
    
    // Step 4: + verified
    console.log('\nSTEP 4: + isVerified: true');
    const step4 = await db.collection('drivers').find({
      driverTypes: { $in: ['delivery'] },
      isOnline: true,
      isAvailable: true,
      isVerified: true,
    }).toArray();
    console.log(`Found: ${step4.length} drivers`);
    step4.forEach(d => {
      console.log(`  ${d.firstName} ${d.lastName}: verified=${d.isVerified}, hasLocation=${!!d.currentLocation}`);
    });
    
    // Step 5: + location exists
    console.log('\nSTEP 5: + currentLocation exists');
    const step5 = await db.collection('drivers').find({
      driverTypes: { $in: ['delivery'] },
      isOnline: true,
      isAvailable: true,
      isVerified: true,
      currentLocation: { $exists: true, $ne: null },
    }).toArray();
    console.log(`Found: ${step5.length} drivers`);
    step5.forEach(d => {
      console.log(`  ${d.firstName} ${d.lastName}: location=${JSON.stringify(d.currentLocation.coordinates)}`);
    });
    
    // Step 6: Full query with $near
    console.log('\nSTEP 6: + $near geospatial query');
    try {
      const step6 = await db.collection('drivers').find({
        driverTypes: { $in: ['delivery'] },
        isOnline: true,
        isAvailable: true,
        isVerified: true,
        currentLocation: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: pickupCoords,
            },
            $maxDistance: 5000,
          },
        },
      }).toArray();
      console.log(`Found: ${step6.length} drivers`);
      step6.forEach(d => {
        console.log(`  ${d.firstName} ${d.lastName}: ${JSON.stringify(d.currentLocation.coordinates)}`);
      });
    } catch (error) {
      console.error('❌ $near query error:', error.message);
      console.log('\nChecking for 2dsphere index on currentLocation...');
      const indexes = await db.collection('drivers').indexes();
      console.log('Indexes:', JSON.stringify(indexes, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

debugQuery();
