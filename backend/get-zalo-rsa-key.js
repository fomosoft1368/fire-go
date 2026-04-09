/**
 * get-zalo-rsa-key.js
 * ─────────────────────────────────────────────────────────────────────────
 * Lấy hoặc tạo RSA Public Key từ Zalo ZNS Business API.
 * Key này dùng để mã hóa phone & OTP khi gửi ZNS chế độ bảo mật.
 *
 * Chạy:  node get-zalo-rsa-key.js
 * ─────────────────────────────────────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

const TOKEN_FILE   = path.join(__dirname, 'zalo-token.json');
const RSA_KEY_FILE = path.join(__dirname, 'zalo-rsa-key.json');

async function getAccessToken() {
  if (!fs.existsSync(TOKEN_FILE)) {
    throw new Error('Không tìm thấy zalo-token.json! Chạy get-zalo-token.js trước.');
  }
  const tokens = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
  if (!tokens.access_token) throw new Error('access_token trống trong zalo-token.json!');
  return tokens.access_token;
}

async function getExistingRsaKey(accessToken, fetch) {
  console.log('🔍 Đang kiểm tra RSA key hiện có (/rsa/key/get)...');
  const res = await fetch('https://business.openapi.zalo.me/rsa/key/get', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'access_token': accessToken,
    },
  });
  return res.json();
}

async function createNewRsaKey(accessToken, fetch) {
  console.log('🆕 Đang tạo RSA key pair mới (/rsa/key/gen)...');
  const res = await fetch('https://business.openapi.zalo.me/rsa/key/gen', {
    method: 'GET',   // Zalo dùng GET cho cả tạo mới
    headers: {
      'Content-Type': 'application/json',
      'access_token': accessToken,
    },
  });
  return res.json();
}

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log(' LẤY RSA PUBLIC KEY TỪ ZALO ZNS');
  console.log('══════════════════════════════════════════════════════\n');

  const { default: fetch } = await import('node-fetch');

  // 1. Lấy access token
  let accessToken;
  try {
    accessToken = await getAccessToken();
    console.log(`✅ Access Token: ${accessToken.substring(0, 30)}...\n`);
  } catch (err) {
    console.error('❌', err.message);
    process.exit(1);
  }

  // 2. Thử lấy key đã có
  let keyData;
  try {
    const existing = await getExistingRsaKey(accessToken, fetch);
    console.log('📦 Kết quả GET key:', JSON.stringify(existing, null, 2));

    if (existing.error === 0 && existing.data && existing.data.public_key) {
      keyData = existing.data;
      console.log('\n✅ Đã có RSA key pair!\n');
    } else {
      // Key chưa tồn tại → tạo mới
      console.log('⚠️  Chưa có key. Đang tạo key mới...\n');
      const created = await createNewRsaKey(accessToken, fetch);
      console.log('📦 Kết quả CREATE key:', JSON.stringify(created, null, 2));

      if (created.error === 0 && created.data && created.data.public_key) {
        keyData = created.data;
        console.log('\n✅ Tạo RSA key mới thành công!\n');
      } else {
        console.error('\n❌ Không thể tạo RSA key:', created);
        printTroubleshoot(created.error);
        process.exit(1);
      }
    }
  } catch (err) {
    console.error('\n❌ Lỗi gọi API:', err.message);
    process.exit(1);
  }

  // 3. Lưu key vào file
  const output = {
    key_id:     keyData.key_id || keyData.id || '',
    public_key: keyData.public_key,
    created_at: new Date().toISOString(),
  };
  fs.writeFileSync(RSA_KEY_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`💾 Đã lưu key vào: ${RSA_KEY_FILE}\n`);

  // 4. Hiển thị cách copy vào .env
  const publicKeyForEnv = keyData.public_key.replace(/\n/g, '\\n');

  console.log('══════════════════════════════════════════════════════');
  console.log(' COPY CÁC DÒNG SAU VÀO FILE .env');
  console.log('══════════════════════════════════════════════════════\n');
  console.log(`ZALO_USE_RSA=true`);
  console.log(`ZALO_ZNS_ENCRYPTED_TEMPLATE_ID=562700`);
  console.log(`ZALO_RSA_PUBLIC_KEY="${publicKeyForEnv}"\n`);
  console.log('══════════════════════════════════════════════════════\n');

  console.log('📌 Public Key (PEM format):');
  console.log('─'.repeat(54));
  console.log(keyData.public_key);
  console.log('─'.repeat(54));
  console.log('\n✅ XONG! Bây giờ:');
  console.log('  1. Paste nội dung trên vào .env');
  console.log('  2. Chạy:  node test-zns-rsa.js 0901234567  (để test)');
  console.log('  3. Restart backend\n');
}

function printTroubleshoot(errorCode) {
  const guide = {
    '-201': 'OA chưa được kích hoạt dịch vụ ZNS Business. Vào Zalo OA Manager để đăng ký.',
    '-401': 'Access token hết hạn. Chạy lại get-zalo-token.js để làm mới token.',
    '-1':   'Lỗi hệ thống Zalo. Thử lại sau ít phút.',
  };
  const msg = guide[String(errorCode)];
  if (msg) console.log(`\n💡 Gợi ý lỗi ${errorCode}: ${msg}`);
}

main().catch(err => {
  console.error('Lỗi không xác định:', err);
  process.exit(1);
});
