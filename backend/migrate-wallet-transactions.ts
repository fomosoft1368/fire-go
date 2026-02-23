import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/firgo';

/**
 * Migration script to merge wallettransactions into transactions
 * Adds userType field to distinguish between driver and customer transactions
 */
async function migrateWalletTransactions() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = connection.db;

    // Check if wallettransactions collection exists
    const collections = await db.listCollections().toArray();
    const hasWalletTransactions = collections.some(c => c.name === 'wallettransactions');

    if (!hasWalletTransactions) {
      console.log('⚠️  No wallettransactions collection found. Nothing to migrate.');
      process.exit(0);
    }

    // Get count of documents to migrate
    const walletTransactionsCount = await db.collection('wallettransactions').countDocuments();
    console.log(`📊 Found ${walletTransactionsCount} driver wallet transactions to migrate`);

    if (walletTransactionsCount === 0) {
      console.log('⚠️  No documents to migrate.');
      process.exit(0);
    }

    // Migrate data
    console.log('🔄 Starting migration...');

    const walletTransactions = await db.collection('wallettransactions').find({}).toArray();
    let migratedCount = 0;
    let skippedCount = 0;

    for (const walletTxn of walletTransactions) {
      // Check if already migrated (by _id)
      const existing = await db.collection('transactions').findOne({ _id: walletTxn._id });
      
      if (existing) {
        console.log(`⏭️  Skipping transaction ${walletTxn._id} (already exists)`);
        skippedCount++;
        continue;
      }

      // Map WalletTransaction to unified Transaction schema
      const transaction = {
        ...walletTxn,
        userType: 'driver', // Add userType discriminator
        // Keep driverId as is (already exists in wallet transactions)
        // Map type if needed (wallet uses TOPUP, unified uses topup/TOPUP both)
        // Status mapping: COMPLETED → completed (already compatible)
        // All other fields compatible
      };

      // Insert into transactions collection
      await db.collection('transactions').insertOne(transaction);
      migratedCount++;

      if (migratedCount % 100 === 0) {
        console.log(`   Migrated ${migratedCount}/${walletTransactionsCount}...`);
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   - Migrated: ${migratedCount}`);
    console.log(`   - Skipped (already exists): ${skippedCount}`);
    console.log(`   - Total processed: ${walletTransactionsCount}`);

    // Ask user if they want to drop the old collection
    console.log(`\n⚠️  Old collection 'wallettransactions' still exists.`);
    console.log(`   To drop it manually, run:`);
    console.log(`   > use firgo`);
    console.log(`   > db.wallettransactions.drop()`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrateWalletTransactions()
  .then(() => {
    console.log('\n✨ Migration process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
