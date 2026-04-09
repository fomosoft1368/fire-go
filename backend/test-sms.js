/**
 * test-sms.js – Test SpeedSMS: Kiểm tra tài khoản + thử các sms_type
 * Chạy: node test-sms.js
 */

const SPEEDSMS_TOKEN = 'zJjODLrNMBa9aN8eb6ZlFwFkSNZZuM1T';
const TEST_PHONE     = '0396861480';
const OTP            = Math.floor(100000 + Math.random() * 900000).toString();
const AUTH_HEADER    = 'Basic ' + Buffer.from(SPEEDSMS_TOKEN + ':x').toString('base64');

async function main() {
  const { default: fetch } = await import('node-fetch');

  console.log('\n══════════════════════════════════════════════');
  console.log(' SPEEDSMS – KIỂM TRA TÀI KHOẢN + TEST SMS');
  console.log('══════════════════════════════════════════════\n');

  // ── Bước 1: Kiểm tra số dư ──────────────────────────────────────
  console.log('📊 [1/3] Kiểm tra thông tin tài khoản SpeedSMS...');
  try {
    const balRes  = await fetch('https://api.speedsms.vn/index.php/user/info', {
      method: 'GET',
      headers: { 'Authorization': AUTH_HEADER },
    });
    const balData = await balRes.json();
    console.log('Tài khoản:', JSON.stringify(balData, null, 2), '\n');
  } catch (e) {
    console.log('Không lấy được thông tin tài khoản:', e.message, '\n');
  }

  // ── Bước 2: Lấy danh sách sender đã đăng ký ────────────────────
  console.log('📋 [2/3] Lấy danh sách Sender đã đăng ký...');
  try {
    const senderRes  = await fetch('https://api.speedsms.vn/index.php/sender/list', {
      method: 'GET',
      headers: { 'Authorization': AUTH_HEADER },
    });
    const senderData = await senderRes.json();
    console.log('Senders:', JSON.stringify(senderData, null, 2), '\n');
  } catch (e) {
    console.log('Không lấy được Sender list:', e.message, '\n');
  }

  // ── Bước 3: Thử gửi SMS với các sms_type khác nhau ─────────────
  console.log('📤 [3/3] Thử gửi SMS...');
  console.log(`   SĐT: ${TEST_PHONE} | OTP: ${OTP}\n`);

  const CONTENT = `Ma xac thuc FireGo cua ban la ${OTP}. Co hieu luc trong 5 phut.`;

  // Danh sách các type cần thử
  const attempts = [
    // type 4 không cần brandname (đầu số cá nhân)
    { sms_type: 4, label: 'Type 4 – Đầu số cá nhân (không brandname)' },
    // type 2 brandname transactional (OTP) – yêu cầu đăng ký brandname
    { sms_type: 2, sender: 'Baotrixemay', label: 'Type 2 – Brandname Baotrixemay' },
    { sms_type: 2, sender: 'FireGo',      label: 'Type 2 – Brandname FireGo' },
  ];

  for (const attempt of attempts) {
    console.log(`\n🔄 Thử: ${attempt.label}`);
    const body = {
      to:       [TEST_PHONE],
      content:  CONTENT,
      sms_type: attempt.sms_type,
      ...(attempt.sender ? { sender: attempt.sender } : {}),
    };

    try {
      const res  = await fetch('https://api.speedsms.vn/index.php/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': AUTH_HEADER,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      console.log(`   Kết quả:`, JSON.stringify(data));

      if (data.status === 'success') {
        console.log(`\n✅ THÀNH CÔNG với ${attempt.label}!`);
        console.log(`   → Cập nhật sms_type=${attempt.sms_type} vào auth.service.ts\n`);
        break;
      }
    } catch (e) {
      console.log(`   Lỗi kết nối: ${e.message}`);
    }
  }
}

main().catch(console.error);
