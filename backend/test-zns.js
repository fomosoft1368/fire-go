const fs = require('fs');
const fetch = require('node-fetch'); // Needs node-fetch depending on node version

async function testZNS() {
  try {
    const tokens = JSON.parse(fs.readFileSync('./zalo-token.json', 'utf8'));
    const accessToken = tokens.access_token;
    
    if (!accessToken) {
      console.log('No access token found in zalo-token.json');
      return;
    }

    const templateId = '562700'; // The template ID we saw in the logs
    const phone = '84396861480'; // The phone number from the log

    const url = 'https://business.openapi.zalo.me/message/template';
    
    const bodyArgs = {
      phone: phone,
      template_id: templateId,
      template_data: {
        otp: '123456'
      }
    };

    console.log('Sending ZNS request with body:', bodyArgs);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'access_token': accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyArgs)
    });

    const data = await res.json();
    console.log('ZNS Response:', data);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testZNS();
