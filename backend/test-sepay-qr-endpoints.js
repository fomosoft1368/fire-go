/**
 * Test Sepay QR Creation APIs
 * Tìm endpoint để tạo QR code có tracking
 */

require('dotenv').config();
const https = require('https');

const SEPAY_API_KEY = process.env.SEPAY_API_KEY;
const ACCOUNT_NUMBER = process.env.SEPAY_ACCOUNT_NUMBER;

console.log('\n🔍 Testing Sepay QR Creation APIs...\n');
console.log('='.repeat(80) + '\n');

// Test different QR creation endpoints
const QR_ENDPOINTS = [
  { method: 'POST', path: '/userapi/qr/create' },
  { method: 'POST', path: '/userapi/qrcode' },
  { method: 'POST', path: '/userapi/payment/create' },
  { method: 'POST', path: '/userapi/link/create' },
  { method: 'POST', path: '/api/qr' },
  { method: 'POST', path: '/api/v1/qr/create' },
  { method: 'GET', path: '/userapi/qr' },
  { method: 'GET', path: '/userapi/payment/link' },
];

async function testEndpoint(method, path) {
  return new Promise((resolve) => {
    const testPayload = {
      account_number: ACCOUNT_NUMBER,
      amount: 50000,
      content: 'TEST QR API',
      order_id: 'test_' + Date.now(),
    };
    
    const postData = method === 'POST' ? JSON.stringify(testPayload) : '';
    
    const options = {
      hostname: 'my.sepay.vn',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${SEPAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    };
    
    if (method === 'POST') {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`${method} ${path}`);
        console.log(`  Status: ${res.statusCode}`);
        
        if (res.statusCode < 400) {
          try {
            const json = JSON.parse(data);
            console.log('  ✅ SUCCESS!');
            console.log('  Response:', JSON.stringify(json, null, 2).substring(0, 200));
          } catch (e) {
            console.log('  Response:', data.substring(0, 100));
          }
        } else if (res.statusCode === 501) {
          console.log('  ❌ 501 - Not Implemented');
        } else if (res.statusCode === 404) {
          console.log('  ❌ 404 - Not Found');
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          console.log('  ❌ Unauthorized/Forbidden');
        } else {
          console.log('  Response:', data.substring(0, 100));
        }
        console.log('');
        resolve();
      });
    });

    req.on('error', (error) => {
      console.log(`${method} ${path}`);
      console.log(`  ❌ Error: ${error.message}\n`);
      resolve();
    });

    req.on('timeout', () => {
      console.log(`${method} ${path}`);
      console.log('  ⏱️ Timeout\n');
      req.destroy();
      resolve();
    });

    if (method === 'POST') {
      req.write(postData);
    }
    req.end();
  });
}

async function main() {
  console.log('Testing all possible QR creation endpoints...\n');
  
  for (const endpoint of QR_ENDPOINTS) {
    await testEndpoint(endpoint.method, endpoint.path);
  }
  
  console.log('='.repeat(80));
  console.log('\n📊 SUMMARY\n');
  console.log('Nếu tìm thấy endpoint work (status 200):');
  console.log('  → Response sẽ có qr_url hoặc payment_link');
  console.log('  → Integrate vào sepay.service.ts\n');
  console.log('Nếu tất cả fail:');
  console.log('  → QR phải tạo qua dashboard manual');
  console.log('  → Hoặc Sepay chỉ support monitoring mode (không tạo QR)\n');
  console.log('='.repeat(80) + '\n');
  
  console.log('🎯 NEXT STEPS:\n');
  console.log('1. Vào Sepay Dashboard → Menu "Tạo QR"');
  console.log('2. Tạo QR test với amount 20,000 VND');
  console.log('3. Screenshot form và kết quả');
  console.log('4. Xem có "API Documentation" link không\n');
}

main().catch(console.error);
