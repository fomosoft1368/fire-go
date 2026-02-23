/**
 * Debug script - Check which model is being used
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking compiled JavaScript files...\n');

const walletServicePath = path.join(__dirname, 'dist', 'modules', 'drivers', 'services', 'wallet.service.js');
const driversModulePath = path.join(__dirname, 'dist', 'modules', 'drivers', 'drivers.module.js');

if (fs.existsSync(walletServicePath)) {
  const content = fs.readFileSync(walletServicePath, 'utf8');
  
  console.log('📄 wallet.service.js:');
  console.log('═'.repeat(70));
  
  if (content.includes('wallets/schemas/transaction.schema')) {
    console.log('   ✅ Imports Transaction from wallets/schemas/transaction.schema');
  } else {
    console.log('   ❌ Still imports from wallet-transaction.schema');
  }
  
  if (content.includes('userType: transaction_schema_1.UserType.DRIVER')) {
    console.log('   ✅ Sets userType: DRIVER');
  } else {
    console.log('   ❌ Missing userType field');
  }
  
  if (content.includes('this.transactionModel')) {
    console.log('   ✅ Uses transactionModel');
  } else if (content.includes('this.walletTransactionModel')) {
    console.log('   ❌ Still uses walletTransactionModel');
  }
  
  console.log('\n📄 drivers.module.js:');
  console.log('═'.repeat(70));
  
  const moduleContent = fs.readFileSync(driversModulePath, 'utf8');
  
  if (moduleContent.includes('transaction_schema_1.Transaction.name')) {
    console.log('   ✅ Registers Transaction model');
  } else if (moduleContent.includes('WalletTransaction.name')) {
    console.log('   ❌ Still registers WalletTransaction model');
  }
  
  console.log('\n🎯 Verdict:');
  console.log('═'.repeat(70));
  
  const isCorrect = content.includes('userType: transaction_schema_1.UserType.DRIVER') &&
                    content.includes('this.transactionModel') &&
                    moduleContent.includes('transaction_schema_1.Transaction.name');
  
  if (isCorrect) {
    console.log('   ✅ Code is CORRECT - using unified Transaction schema');
    console.log('   ✅ Backend will save to "transactions" collection');
    console.log('\n   Next steps:');
    console.log('   1. RESTART backend: npm run start:dev');
    console.log('   2. Test API: POST /api/wallet/sepay/create');
    console.log('   3. Check MongoDB: should see document in "transactions" collection');
  } else {
    console.log('   ❌ Code is WRONG - still using old schema');
    console.log('\n   Fix:');
    console.log('   1. Run: npm run build');
    console.log('   2. Restart backend');
  }
  
} else {
  console.log('❌ dist folder not found - run: npm run build');
}

console.log('');
