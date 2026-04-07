require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/firego';
  console.log('Connecting to MongoDB:', uri);
  
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  const drivers = await db.collection('drivers').find({ referralCode: { $exists: false } }).toArray();
  console.log(`Found ${drivers.length} drivers without referralCode`);
  
  for (const driver of drivers) {
    const code = 'FG' + Math.random().toString(36).substring(2, 8).toUpperCase();
    await db.collection('drivers').updateOne(
      { _id: driver._id }, 
      { $set: { referralCode: code, totalReferrals: 0, totalReferralEarnings: 0 } }
    );
    console.log(`Updated driver ${driver._id} with code ${code}`);
  }
  
  console.log('Migration completed.');
  process.exit(0);
}

run().catch(console.error);
