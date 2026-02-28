/**
 * Check Transaction Schema and Verify Unified Structure
 */

const { connect, connection } = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/firgo';

async function checkTransactionSchema() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = connection.db;

    // Check collections
    console.log('📂 Collections in database:');
    console.log('═'.repeat(60));
    const collections = await db.listCollections().toArray();
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    // Check if old wallettransactions exists
    const hasWalletTxns = collections.some(c => c.name === 'wallettransactions');
    const hasTxns = collections.some(c => c.name === 'transactions');

    console.log('\n📊 Transaction Collections Status:');
    console.log('═'.repeat(60));
    console.log(`   wallettransactions: ${hasWalletTxns ? '⚠️  EXISTS (old schema)' : '✅ NOT FOUND (migrated)'}`);
    console.log(`   transactions: ${hasTxns ? '✅ EXISTS (unified schema)' : '❌ NOT FOUND'}`);

    if (hasTxns) {
      // Count transactions by userType
      const customerCount = await db.collection('transactions').countDocuments({ userType: 'customer' });
      const driverCount = await db.collection('transactions').countDocuments({ userType: 'driver' });
      const noUserTypeCount = await db.collection('transactions').countDocuments({ userType: { $exists: false } });

      console.log('\n💰 Transactions by User Type:');
      console.log('═'.repeat(60));
      console.log(`   Customer transactions: ${customerCount}`);
      console.log(`   Driver transactions: ${driverCount}`);
      console.log(`   Missing userType: ${noUserTypeCount}`);

      if (noUserTypeCount > 0) {
        console.log('\n   ⚠️  WARNING: Found transactions without userType field!');
        console.log('   These need to be migrated or assigned a userType.');
      }

      // Sample driver transaction
      if (driverCount > 0) {
        console.log('\n📝 Sample Driver Transaction:');
        console.log('═'.repeat(60));
        const sample = await db.collection('transactions').findOne({ userType: 'driver' });
        console.log(JSON.stringify(sample, null, 2));
      }

      // Transaction types
      const types = await db.collection('transactions').aggregate([
        {
          $group: {
            _id: { userType: '$userType', type: '$type' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.userType': 1, count: -1 } },
      ]).toArray();

      if (types.length > 0) {
        console.log('\n📈 Transaction Types Breakdown:');
        console.log('═'.repeat(60));
        types.forEach(t => {
          console.log(`   ${t._id.userType || 'NO_TYPE'} - ${t._id.type}: ${t.count}`);
        });
      }
    }

    if (hasWalletTxns) {
      const walletTxnCount = await db.collection('wallettransactions').countDocuments();
      console.log('\n⚠️  Old WalletTransactions Collection:');
      console.log('═'.repeat(60));
      console.log(`   Records: ${walletTxnCount}`);
      console.log('   Status: Ready for migration');
      console.log('   Command: npx ts-node backend/migrate-wallet-transactions.ts');
    }

    console.log('\n\n✨ Schema Check Complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkTransactionSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
