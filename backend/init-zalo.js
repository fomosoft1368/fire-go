const fs = require('fs');
const path = require('path');

const appId = "14037921524403009";
const appSecret = "IT9StPQxKAkrxLEmfPDk";
const oauthCode = "y4l4sbkBYMh9RUdYLuAWJSvDqTuPifzgXa2fv1YYe7k2LVp_9hkIVi5vukbEZwf_adxipZNu-dwK3ShJ2lYJLQmSzDKhoOnpjY_tp67OkNtnUzBsNOtYNS5nweWpbeS0yYx4mttHXLd-T9djK8ZnDwGbr8WIhjP1xnNjcMVwkW_-59N6TRU4CQnHnDuQel5eWL-y-mMStNQPPjpc58c41u4-bk9ydVeIWolGgdloaohP1UpODelOCgDjpFijpv8yuchtw5s8iHY48R7EFyVaGwuplQSteC1Kim7Vfd1duntdXPJbbalDOpUkgkYbGk0E3OIiZlr2qWftXvozeQwQYS6ydXfRQycBBmCnBPR5IQmYGc0FpQ0yaGyyO2_nq4IqAYv3NCsZ6RzGDqHBNbacmA8qVsA7mK8";

async function getZaloToken() {
  const url = 'https://oauth.zaloapp.com/v4/oa/access_token';
  
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'secret_key': appSecret
  };
  
  const body = new URLSearchParams({
    code: oauthCode,
    app_id: appId,
    grant_type: 'authorization_code'
  });

  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url, { method: 'POST', headers, body });
    const data = await response.json();
    
    if (data.access_token) {
      console.log('Got tokens successfully! Saving to zalo-token.json...');
      
      const tokenData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (parseInt(data.expires_in) * 1000)
      };
      
      fs.writeFileSync(path.join(__dirname, 'zalo-token.json'), JSON.stringify(tokenData, null, 2));
      console.log('Saved to zalo-token.json');
    } else {
      console.error('Failed to get tokens:', data);
    }
  } catch (err) {
    console.error('Error fetching token:', err);
  }
}

getZaloToken();
