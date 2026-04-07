/**
 * Script lấy Zalo OA Access Token từ Authorization Code
 * Cách dùng: node get-zalo-token.js CODE_CUA_BAN
 */

const fs = require('fs');
const path = require('path');

const code = process.argv[2];
if (!code) {
  console.error('❌ Thiếu Authorization Code!');
  console.log('Cách dùng: node get-zalo-token.js <CODE>');
  console.log('Ví dụ:     node get-zalo-token.js abc123xyz');
  process.exit(1);
}

const APP_ID    = '14037921524403009';
const APP_SECRET = 'IT9StPQxKAkrxLEmfPDk';
const REDIRECT_URI = 'https://firego.vn/';

async function exchangeCode() {
  console.log('🔄 Đang đổi Authorization Code lấy Access Token...');

  const response = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'secret_key': APP_SECRET
    },
    body: new URLSearchParams({
      code: code,
      app_id: APP_ID,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI
    }).toString()
  });

  const data = await response.json();
  console.log('\n📦 Zalo Response:', data);

  if (data.access_token) {
    const tokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || '',
      expires_at: Date.now() + ((data.expires_in || 3600) * 1000) - 60000
    };

    const tokenPath = path.join(__dirname, 'zalo-token.json');
    fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), 'utf8');

    console.log('\n✅ Token đã được lưu vào zalo-token.json!');
    console.log(`🔑 Access Token: ${data.access_token.substring(0, 30)}...`);
    console.log(`⏰ Hết hạn lúc: ${new Date(tokens.expires_at).toLocaleString('vi-VN')}`);
    console.log('\n🚀 Bây giờ restart lại Backend là xong!');
  } else {
    console.error('\n❌ Lỗi:', data);
    if (data.error_description) {
      console.error('Chi tiết:', data.error_description);
    }
    console.log('\n💡 Gợi ý: Code chỉ dùng được 1 lần và hết hạn trong 60 giây. Hãy lấy Code mới!');
  }
}

exchangeCode().catch(console.error);
