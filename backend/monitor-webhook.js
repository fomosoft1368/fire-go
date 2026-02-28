/**
 * Real-time Webhook Monitor
 * Monitor ngrok logs and backend logs для Sepay webhook debugging
 */

const { exec } = require('child_process');
const http = require('http');

const NGROK_API = 'http://127.0.0.1:4040/api/requests/http';
const CHECK_INTERVAL = 2000; // Check every 2 seconds

console.log('🔍 Starting Webhook Monitor...');
console.log('📡 Ngrok Dashboard: http://127.0.0.1:4040');
console.log('🔔 Listening for Sepay webhooks...\n');

let lastRequestTime = Date.now();

async function checkNgrokRequests() {
  return new Promise((resolve, reject) => {
    http.get(NGROK_API, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const requests = json.requests || [];
          
          // Filter for webhook requests since last check
          const webhookRequests = requests.filter(req => {
            const timestamp = new Date(req.start).getTime();
            return timestamp > lastRequestTime && 
                   req.uri.includes('/api/wallet/sepay/webhook');
          });
          
          if (webhookRequests.length > 0) {
            console.log(`\n🎯 WEBHOOK RECEIVED! (${webhookRequests.length} request(s))`);
            console.log('═'.repeat(60));
            
            webhookRequests.forEach((req, index) => {
              console.log(`\nRequest #${index + 1}:`);
              console.log('Time:', new Date(req.start).toLocaleString('vi-VN'));
              console.log('Method:', req.request.method);
              console.log('URI:', req.request.uri);
              console.log('Status:', req.response.status);
              
              // Try to parse and display body
              if (req.request.raw) {
                try {
                  const bodyMatch = req.request.raw.match(/\r\n\r\n(.*)/s);
                  if (bodyMatch) {
                    const body = JSON.parse(bodyMatch[1]);
                    console.log('\n📦 Payload:');
                    console.log('  - Transfer Amount:', body.transferAmount?.toLocaleString(), 'VND');
                    console.log('  - Content:', body.content);
                    console.log('  - Transaction Date:', body.transactionDate);
                    console.log('  - Account:', body.accountNumber);
                    console.log('  - Bank:', body.bankBrandName);
                  }
                } catch (e) {
                  console.log('Body:', req.request.raw.substring(0, 200));
                }
              }
              
              // Display response
              if (req.response.raw) {
                try {
                  const responseMatch = req.response.raw.match(/\r\n\r\n(.*)/s);
                  if (responseMatch) {
                    const respBody = JSON.parse(responseMatch[1]);
                    console.log('\n✅ Response:');
                    console.log('  - Success:', respBody.success);
                    console.log('  - Message:', respBody.message);
                    console.log('  - Transaction ID:', respBody.transactionId);
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
              
              console.log('─'.repeat(60));
            });
            
            lastRequestTime = Date.now();
          }
          
          resolve(webhookRequests.length);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        console.error('\n❌ Cannot connect to ngrok API. Make sure ngrok is running!');
        console.error('   Start ngrok: .\\ngrok.exe http 3000\n');
      }
      reject(error);
    });
  });
}

// Monitor loop
let checkCount = 0;
const monitor = setInterval(async () => {
  checkCount++;
  
  try {
    const webhookCount = await checkNgrokRequests();
    
    // Show heartbeat every 30 seconds
    if (checkCount % 15 === 0) {
      console.log(`\n💓 Monitoring... (${new Date().toLocaleTimeString('vi-VN')})`);
      console.log('   Waiting for Sepay webhook calls...');
    }
  } catch (error) {
    if (error.code !== 'ECONNREFUSED') {
      console.error('Error checking requests:', error.message);
    }
  }
}, CHECK_INTERVAL);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping monitor...');
  clearInterval(monitor);
  process.exit(0);
});

// Initial message
setTimeout(() => {
  console.log('\n📍 Current Setup:');
  console.log('   - Backend: http://localhost:3000');
  console.log('   - Ngrok Dashboard: http://127.0.0.1:4040');
  console.log('   - Webhook Endpoint: /api/wallet/sepay/webhook');
  console.log('\n🎯 To test webhook:');
  console.log('   1. Create topup in mobile app');
  console.log('   2. Transfer money with exact content from QR code');
  console.log('   3. Watch this screen for webhook notification\n');
}, 1000);
