/**
 * test-zns-rsa.js
 * Kiểm tra RSA encryption + gọi Zalo ZNS ở chế độ RSA.
 *
 * Cách dùng:
 *   node test-zns-rsa.js <số_điện_thoại>
 *
 * Ví dụ:
 *   node test-zns-rsa.js 0901234567
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─────────────── CẤU HÌNH ───────────────────────────────────────────
// 1. Dán RSA Public Key từ Zalo Developers > Cài đặt kỹ thuật vào đây
//    HOẶC set biến môi trường: ZALO_RSA_PUBLIC_KEY
const RSA_PUBLIC_KEY_PEM = process.env.ZALO_RSA_PUBLIC_KEY
  ? process.env.ZALO_RSA_PUBLIC_KEY.replace(/\\n/g, '\n')
  : `-----BEGIN PUBLIC KEY-----
PASTE_YOUR_ZALO_RSA_PUBLIC_KEY_HERE
-----END PUBLIC KEY-----`;

// 2. Template ID dùng cho chế độ RSA (lấy từ Zalo App hoặc env)
const TEMPLATE_ID = process.env.ZALO_ZNS_ENCRYPTED_TEMPLATE_ID
                 || process.env.ZALO_ZNS_TEMPLATE_ID
                 || '562700';

// 3. Số điện thoại test (đối số dòng lệnh)
const rawPhone  = process.argv[2] || '0901234567';
// ────────────────────────────────────────────────────────────────────

function formatPhone(phone) {
  let p = phone.replace(/^0/, '84').replace(/[^0-9]/g, '');
  if (!p.startsWith('84')) p = '84' + p;
  return p;
}

function encryptRsa(data, publicKeyPem) {
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(data, 'utf8'),
  );
  return encrypted.toString('base64');
}

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log(' TEST: ZALO ZNS RSA ENCRYPTION MODE');
  console.log('══════════════════════════════════════════════════\n');

  // ── Bước 1: Kiểm tra Public Key ─────────────────────────────────
  if (RSA_PUBLIC_KEY_PEM.includes('PASTE_YOUR_ZALO_RSA_PUBLIC_KEY_HERE')) {
    console.error('❌ Chưa có RSA Public Key!');
    console.log('   → Vào Zalo Developers > App > Cài đặt kỹ thuật > RSA Public Key');
    console.log('   → Copy PEM rồi dán vào biến RSA_PUBLIC_KEY_PEM trong file này');
    console.log('   HOẶC chạy: set ZALO_RSA_PUBLIC_KEY=<key> && node test-zns-rsa.js\n');
    process.exit(1);
  }

  console.log('✅ RSA Public Key đã được cấu hình.\n');

  // ── Bước 2: Tạo OTP giả ─────────────────────────────────────────
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const formattedPhone = formatPhone(rawPhone);
  console.log(`📱 Số điện thoại : ${rawPhone} → ${formattedPhone}`);
  console.log(`🔑 OTP (raw)     : ${otp}`);

  // ── Bước 3: Kiểm tra mã hóa RSA ─────────────────────────────────
  let encryptedPhone, encryptedOtp;
  try {
    encryptedPhone = encryptRsa(formattedPhone, RSA_PUBLIC_KEY_PEM);
    encryptedOtp   = encryptRsa(otp, RSA_PUBLIC_KEY_PEM);
    console.log(`\n🔐 Đã mã hóa RSA thành công!`);
    console.log(`   Phone (base64) : ${encryptedPhone.substring(0, 40)}...`);
    console.log(`   OTP   (base64) : ${encryptedOtp.substring(0, 40)}...`);
  } catch (err) {
    console.error('\n❌ Lỗi mã hóa RSA:', err.message);
    console.log('   → Kiểm tra lại định dạng Public Key (phải là PEM PKCS#8)');
    process.exit(1);
  }

  // ── Bước 4: Đọc Access Token ─────────────────────────────────────
  const tokenFile = path.join(__dirname, 'zalo-token.json');
  let accessToken;
  try {
    const tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
    accessToken = tokens.access_token;
    if (!accessToken) throw new Error('access_token trống!');
    console.log(`\n🎟️  Access Token : ${accessToken.substring(0, 30)}...`);
  } catch (err) {
    console.error('\n❌ Không đọc được zalo-token.json:', err.message);
    process.exit(1);
  }

  // ── Bước 5: Gọi Zalo ZNS RSA API ────────────────────────────────
  const znsUrl = 'https://business.openapi.zalo.me/message/template';
  const payload = {
    phone: encryptedPhone,
    template_id: TEMPLATE_ID,
    template_data: { otp: encryptedOtp },
    tracking_id: 'fg_rsa_test_' + Date.now(),
    options: { encrypted: true },
  };

  console.log(`\n🚀 Đang gọi Zalo ZNS RSA API...`);
  console.log(`   URL         : ${znsUrl}`);
  console.log(`   Template ID : ${TEMPLATE_ID}`);

  try {
    const { default: fetch } = await import('node-fetch');
    const res  = await fetch(znsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': accessToken,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log('\n📨 Kết quả từ Zalo ZNS:\n', JSON.stringify(data, null, 2));

    if (data.error === 0) {
      console.log('\n✅ THÀNH CÔNG! OTP đã được gửi qua RSA ZNS.');
    } else {
      console.log(`\n⚠️  Zalo trả về lỗi ${data.error}: ${data.message}`);
      console.log('   → Xem hướng dẫn xử lý lỗi bên dưới.\n');
      printErrorGuide(data.error);
    }
  } catch (err) {
    console.error('\n❌ Lỗi gọi API:', err.message);
  }
}

function printErrorGuide(errorCode) {
  const guides = {
    '-201': 'OA chưa được cấp quyền gửi ZNS. Vào Zalo OA Manager > Cài đặt > Dịch vụ ZNS để kích hoạt.',
    '-202': 'Template chưa được duyệt hoặc sai template_id. Kiểm tra ZALO_ZNS_ENCRYPTED_TEMPLATE_ID.',
    '-210': 'RSA Public Key không khớp. Tạo lại RSA key pair trên Zalo Developers và cập nhật .env.',
    '-211': 'Dữ liệu mã hóa không hợp lệ. Đảm bảo dùng RSA/ECB/OAEPWITHSHA-256ANDMGF1PADDING.',
    '-300': 'Vượt quá giới hạn gửi trong ngày.',
  };
  const msg = guides[String(errorCode)];
  if (msg) console.log(`   💡 Gợi ý lỗi ${errorCode}: ${msg}`);
}

main().catch(console.error);
