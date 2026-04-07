const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/firego');
  console.log('Connected to DB');
  
  const db = mongoose.connection.db;
  const drivers = await db.collection('drivers').find({ referralCode: { $exists: false } }).toArray();
  
  console.log(`Found ${drivers.length} drivers without referralCode`);
  
  for (const driver of drivers) {
    const code = 'FG' + Math.random().toString(36).substring(2, 8).toUpperCase();
    await db.collection('drivers').updateOne({ _id: driver._id }, { $set: { referralCode: code, totalReferrals: 0, totalReferralEarnings: 0 } });
    console.log(`Updated driver ${driver.phone || driver.email} with code ${code}`);
  }
  
  console.log('Done');
  process.exit(0);
}
run();
