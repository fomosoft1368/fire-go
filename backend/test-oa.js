const fs = require('fs');
const fetch = require('node-fetch');

async function checkOA() {
  try {
    const tokens = JSON.parse(fs.readFileSync('./zalo-token.json', 'utf8'));
    const accessToken = tokens.access_token;
    
    if (!accessToken) {
      console.log('No access token found!');
      return;
    }

    const url = 'https://openapi.zalo.me/v2.0/oa/getoa';
    console.log('Fetching OA info...');

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'access_token': accessToken
      }
    });

    const data = await res.json();
    console.log('OA Response:', data);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

checkOA();
