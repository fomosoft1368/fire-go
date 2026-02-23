const axios = require('axios');

/**
 * Test Sepay Webhook với transaction đã tạo
 * Transaction ID: 6989a32913d67c16edde68d0
 */

async function testWebhook() {
  try {
    console.log('🧪 Testing Sepay Webhook for existing transaction...\n');

    // Webhook payload giả lập như Sepay gửi
    const webhookPayload = {
      gateway: 'MB',
      transactionDate: '2026-02-09 09:07:00',
      accountNumber: '0986190053',
      code: 'FT26040123456', // Fake transaction reference
      transferType: 'transfer',
      transferAmount: 100000,
      accumulated: 100000,
      subAccId: null,
      refCode: '6989a32913d67c16edde68d0', // Transaction ID từ database
      description: 'NAPTIEN 6989a32913d67c16edde68d0',
      transactionType: 'IN',
    };

    console.log('📤 Sending webhook to backend:');
    console.log(JSON.stringify(webhookPayload, null, 2));
    console.log();

    const response = await axios.post(
      'http://localhost:3000/api/wallet/sepay/webhook',
      webhookPayload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Webhook Response:', response.data);
    console.log('\n🎉 SUCCESS! Transaction should be completed now.');
    console.log('💰 Check driver balance in database.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.error('\nFull error:', error.response?.data);
  }
}

testWebhook();
