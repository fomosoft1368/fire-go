/**
 * Test Sepay API Endpoints
 * 
 * Kiểm tra xem Sepay có API để:
 * 1. List transactions (GET /transactions)
 * 2. Get transaction detail (GET /transactions/:id)
 * 3. Create transaction (POST /transactions/create) ← QUAN TRỌNG
 */

require('dotenv').config();
const https = require('https');

const SEPAY_API_KEY = process.env.SEPAY_API_KEY;
const ACCOUNT_NUMBER = process.env.SEPAY_ACCOUNT_NUMBER;

console.log('\n🔍 Testing Sepay API...\n');
console.log('API Key:', SEPAY_API_KEY ? `${SEPAY_API_KEY.slice(0, 10)}...` : 'MISSING');
console.log('Account:', ACCOUNT_NUMBER);
console.log('\n' + '='.repeat(80) + '\n');

// ============================================================================
// Test 1: GET /userapi/transactions - List recent transactions
// ============================================================================
async function testListTransactions() {
  console.log('📋 TEST 1: GET /userapi/transactions (List recent transactions)\n');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'my.sepay.vn',
      path: '/userapi/transactions',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SEPAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Headers:', JSON.stringify(res.headers, null, 2));
        
        try {
          const json = JSON.parse(data);
          console.log('Response:', JSON.stringify(json, null, 2));
          
          if (res.statusCode === 200 && json.transactions) {
            console.log('\n✅ API WORKS! Found transactions:');
            json.transactions.slice(0, 3).forEach((tx, i) => {
              console.log(`\n  Transaction ${i + 1}:`);
              console.log(`    Amount: ${tx.amount || tx.transferAmount} VND`);
              console.log(`    Content: ${tx.content || tx.description}`);
              console.log(`    Date: ${tx.transactionDate || tx.created_at}`);
            });
          }
        } catch (e) {
          console.log('Response (text):', data);
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      resolve();
    });

    req.end();
  });
}

// ============================================================================
// Test 2: POST /userapi/transactions/create - Create new transaction
// ============================================================================
async function testCreateTransaction() {
  console.log('\n' + '='.repeat(80));
  console.log('\n💳 TEST 2: POST /userapi/transactions/create (Create QR with tracking)\n');
  
  const testPayload = {
    account_number: ACCOUNT_NUMBER,
    amount: 50000, // 50k test
    content: 'TEST SEPAY API',
    note: 'Testing Sepay API endpoint',
  };
  
  console.log('Payload:', JSON.stringify(testPayload, null, 2));
  console.log('');
  
  return new Promise((resolve) => {
    const postData = JSON.stringify(testPayload);
    
    const options = {
      hostname: 'my.sepay.vn',
      path: '/userapi/transactions/create',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SEPAY_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        
        try {
          const json = JSON.parse(data);
          console.log('Response:', JSON.stringify(json, null, 2));
          
          if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('\n✅ CREATE API WORKS!');
            if (json.qr_url || json.qrCodeUrl) {
              console.log(`\n🎯 QR URL: ${json.qr_url || json.qrCodeUrl}`);
              console.log('👉 Use this URL instead of VietQR in sepay.service.ts!');
            }
            if (json.transaction_id) {
              console.log(`📝 Transaction ID: ${json.transaction_id}`);
            }
          }
        } catch (e) {
          console.log('Response (text):', data);
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

// ============================================================================
// Test 3: Alternative endpoints
// ============================================================================
async function testAlternativeEndpoints() {
  console.log('\n' + '='.repeat(80));
  console.log('\n🔄 TEST 3: Alternative endpoints\n');
  
  const endpoints = [
    '/userapi/qrcode',
    '/userapi/bank/transactions',
    '/api/v1/transactions',
    '/api/transactions/list',
  ];
  
  for (const endpoint of endpoints) {
    console.log(`Testing: GET ${endpoint}`);
    
    await new Promise((resolve) => {
      const options = {
        hostname: 'my.sepay.vn',
        path: endpoint,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SEPAY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      };

      const req = https.request(options, (res) => {
        console.log(`  Status: ${res.statusCode}`);
        if (res.statusCode < 400) {
          console.log('  ✅ Endpoint exists!\n');
        } else {
          console.log(`  ❌ Not found\n`);
        }
        res.resume(); // Drain response
        resolve();
      });

      req.on('error', (error) => {
        console.log(`  ❌ Error: ${error.message}\n`);
        resolve();
      });

      req.on('timeout', () => {
        console.log('  ⏱️ Timeout\n');
        req.destroy();
        resolve();
      });

      req.end();
    });
  }
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  if (!SEPAY_API_KEY) {
    console.error('❌ ERROR: SEPAY_API_KEY not found in .env');
    console.log('\nAdd to backend/.env:');
    console.log('SEPAY_API_KEY=your_api_key_here');
    process.exit(1);
  }

  await testListTransactions();
  await testCreateTransaction();
  await testAlternativeEndpoints();
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 SUMMARY\n');
  console.log('Nếu thấy:');
  console.log('  ✅ GET /transactions works:');
  console.log('     → Sepay CÓ account monitoring');
  console.log('     → Check dashboard xem có bật auto-webhook không\n');
  console.log('  ✅ POST /transactions/create works:');
  console.log('     → Sepay CÓ Transaction API');
  console.log('     → Integrate vào sepay.service.ts\n');
  console.log('  ❌ All endpoints fail:');
  console.log('     → API key sai');
  console.log('     → Hoặc Sepay không có public API');
  console.log('     → Cần dùng dashboard manual\n');
  console.log('='.repeat(80) + '\n');
}

main().catch(console.error);
