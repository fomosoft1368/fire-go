/**
 * Test Manual Webhook
 * Simulates Sepay webhook call to complete the transaction
 */

const http = require('http');

const txId = '698a875b313f393c05af7f2e'; // User's transaction
const last8 = txId.substring(txId.length - 8).toUpperCase();
const content = `NAPVI ${last8}`;

const payload = JSON.stringify({
  id: 'manual_test_' + Date.now(),
  gateway: 'VIETQR',
  transactionDate: new Date().toISOString(),
  accountNumber: '0986190053',
  transferType: 'in',
  transferAmount: 100000,
  accumulated: 500000,
  code: '970422',
  content: content,
  description: `Manual test for transaction ${txId}`,
  referenceCode: 'TEST' + Date.now(),
  subAccount: '',
  bankBrandName: 'MB Bank',
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/wallet/sepay/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

console.log('🧪 MANUAL WEBHOOK TEST');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Transaction ID:', txId);
console.log('Last 8 chars:', last8);
console.log('Content:', content);
console.log('Amount: 100,000 VND');
console.log('');
console.log('📤 Sending POST to http://localhost:3000/api/wallet/sepay/webhook');
console.log('');
console.log('Payload:');
console.log(JSON.stringify(JSON.parse(payload), null, 2));
console.log('');
console.log('═══════════════════════════════════════════════════════════════');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📥 RESPONSE:');
    console.log('Status Code:', res.statusCode);
    console.log('');
    
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('\n✅ WEBHOOK TEST SUCCESSFUL!');
        console.log('');
        console.log('🔍 Next steps:');
        console.log('   1. Run: node check-user-transaction.js');
        console.log('   2. Check driver balance in database/app');
        console.log('   3. Verify transaction status is "completed"');
      } else {
        console.log('\n❌ WEBHOOK TEST FAILED!');
        console.log('Error:', response.error || response.message);
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════');
  });
});

req.on('error', (error) => {
  console.error('\n❌ ERROR:', error.message);
  console.log('');
  console.log('💡 Make sure backend is running:');
  console.log('   cd D:\\fire-go\\backend');
  console.log('   npm run start:dev');
});

req.write(payload);
req.end();
