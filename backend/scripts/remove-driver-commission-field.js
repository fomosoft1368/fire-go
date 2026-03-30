/**
 * Migration: Remove commissionRate from Driver documents
 * 
 * Reason: Commission rate is now dynamic from PricingConfig
 * Formula: commissionRate = 100 - driverShare
 * Example: driverShare=80 → app takes 20% commission
 * 
 * Run: node backend/scripts/remove-driver-commission-field.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/firego';

async function removeCommissionRateField() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db();
    const driversCollection = db.collection('drivers');

    // Remove commissionRate field from all driver documents
    const result = await driversCollection.updateMany(
      { commissionRate: { $exists: true } },
      { $unset: { commissionRate: '' } }
    );

    console.log(`✅ Removed commissionRate from ${result.modifiedCount} driver documents`);
    console.log('ℹ️  Commission rate will now be calculated dynamically from PricingConfig');
    console.log('ℹ️  Formula: commissionRate = 100 - driverShare');

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('✅ Migration completed');
  }
}

removeCommissionRateField();
