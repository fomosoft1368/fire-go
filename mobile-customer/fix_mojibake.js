const fs = require('fs');
const file = 'd:/fire-go/mobile-customer/src/screens/HireDriverScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  ['// ====== DEPOSIT (Cá»ŒC) STATES ======', '// ====== DEPOSIT (CỌC) STATES ======'],
  ['// Chá»‰ search náº¿u text >= 5 kÃ½ tá»±', '// Chỉ search nếu text >= 5 ký tự'],
  ['// Debounce 800ms Ä‘á»ƒ giáº£m request', '// Debounce 800ms để giảm request'],
  ['// Chá»‰ search náº¿u text >= 3 kÃ½ tá»±', '// Chỉ search nếu text >= 3 ký tự'],
  ['// Debounce 500ms Ä‘á»ƒ giáº£m request', '// Debounce 500ms để giảm request'],
  ['setPickupLocation(\'HÃ  Ná»™i, Viá»‡t Nam\')', 'setPickupLocation(\'Hà Nội, Việt Nam\')'],
  ['// Polling Ä‘á»ƒ láº¥y thÃ´ng tin tÃ  xáº¿ khi driver nháº­n cuá»‘c', '// Polling để lấy thông tin tài xế khi driver nhận cuốc'],
  ['// TÃ­nh giÃ¡ cÆ°á»›c khi có Ä‘á»§ thÃ´ng tin', '// Tính giá cước khi có đủ thông tin'],
  ['// ============ LÃ I XE Há»˜ - TÃ­nh giÃ¡ theo nghiá»‡p vá»¥ phÃ­ má»Ÿ cá»­a + km miá»…n phÃ­ ============', '// ============ LÁI XE HỘ - Tính giá theo nghiệp vụ phí mở cửa + km miễn phí ============'],
  ['total: fare.total + \'Ä‘\'', 'total: fare.total + \'đ\''],
  ['openingFee: fare.openingFee + \'Ä‘\'', 'openingFee: fare.openingFee + \'đ\''],
  ['extraKmFee: fare.extraKmFee + \'Ä‘\'', 'extraKmFee: fare.extraKmFee + \'đ\''],
  ['pricePerExtraKm: fare.pricePerExtraKm + \'Ä‘/km\'', 'pricePerExtraKm: fare.pricePerExtraKm + \'đ/km\''],
  ['breakdown: `${fare.openingFee}Ä‘ + ${fare.extraKm}km Ã— ${fare.pricePerExtraKm}Ä‘ = ${fare.total}Ä‘`', 'breakdown: `${fare.openingFee}đ + ${fare.extraKm}km × ${fare.pricePerExtraKm}đ = ${fare.total}đ`'],
  ['// ====== DEPOSIT: Cáº­p nháº­t tÃ¬nh tráº¡ng Ä‘áº·t cá» c sau khi tÃ­nh giÃ¡ ======', '// ====== DEPOSIT: Cập nhật tình trạng đặt cọc sau khi tính giá ======'],
  ['// Fetch deposit config vÃ  sá»‘ dÆ° vÃ­ cá»§a khÃ¡ch', '// Fetch deposit config và số dư ví của khách'],
  ['// Láº¥y config lÃ¡i xe há»™ theo loáº¡i xe Ä‘ang chá» n', '// Lấy config lái xe hộ theo loại xe đang chọn'],
  ['console.log(\'[HireDriverScreen] ðŸŽ¯ Tá»”NG Káº¾T:\', {', 'console.log(\'[HireDriverScreen] 🎯 TỔNG KẾT:\', {'],
  ['finalPrice: fare.total + \'Ä‘\',', 'finalPrice: fare.total + \'đ\','],
  ['? `Trong ${fare.freeKm}km miá»…n phÃ­ â†’ Chá»‰ tÃ­nh phÃ­ má»Ÿ cá»­a ${fare.openingFee}Ä‘`', '? `Trong ${fare.freeKm}km miễn phí → Chỉ tính phí mở cửa ${fare.openingFee}đ`'],
  [': `${fare.openingFee}Ä‘ + (${route.distance} - ${fare.freeKm})km Ã— ${fare.pricePerExtraKm}Ä‘/km = ${fare.total}Ä‘`,', ': `${fare.openingFee}đ + (${route.distance} - ${fare.freeKm})km × ${fare.pricePerExtraKm}đ/km = ${fare.total}đ`,'],
  ['console.log(\'[HireDriverScreen] ===== Káº¾T THÃšC TÃ NH GIÃ  =====\\n\')', 'console.log(\'[HireDriverScreen] ===== KẾT THÚC TÍNH GIÁ =====\\n\')'],
  ['// ThÃ´ng bÃ¡o náº¿u Ä‘ang dÃ¹ng mock data', '// Thông báo nếu đang dùng mock data'],
  ['\'âš ï¸  Cháº¿ Ä‘á»™ Demo\'', '\'⚠️ Chế độ Demo\''],
  ['\'Hiá»‡n Ä‘ang sá»­ dá»¥ng dá»¯ liá»‡u giáº£ láº­p.\\n\\nÄ á»ƒ sá»­ dá»¥ng Google Maps tháº­t, vui lÃ²ng cáº¥u hÃ¬nh API key trong file .env\'', '\'Hiện đang sử dụng dữ liệu giả lập.\\n\\nĐể sử dụng Google Maps thật, vui lòng cấu hình API key trong file .env\''],
  ['Alert.alert(\'Lá»—i\', err.message || \'KhÃ´ng thá»ƒ tÃ­nh toÃ¡n tuyáº¿n Ä‘Æ°á» ng\')', 'Alert.alert(\'Lỗi\', err.message || \'Không thể tính toán tuyến đường\')'],
  ['// Validation vÃ  táº¡o cuá»‘c xe', '// Validation và tạo cuốc xe'],
  ['Alert.alert(\'YÃªu cáº§u Ä‘Äƒng nháº­p\', \'Báº¡n cáº§n Ä‘Äƒng nháº­p Ä‘á»ƒ Ä‘áº·t xe!\')', 'Alert.alert(\'Yêu cầu đăng nhập\', \'Bạn cần đăng nhập để đặt xe!\')'],
  ['Alert.alert(\'Thiáº¿u thÃ´ng tin\', \'Vui lÃ²ng nháº­p Ä‘iá»ƒm Ä‘Ã³n!\')', 'Alert.alert(\'Thiếu thông tin\', \'Vui lòng nhập điểm đón!\')'],
  ['Alert.alert(\'Thiáº¿u thÃ´ng tin\', \'Vui lÃ²ng nháº­p Ä‘iá»ƒm Ä‘áº¿n!\')', 'Alert.alert(\'Thiếu thông tin\', \'Vui lòng nhập điểm đến!\')'],
  ['Alert.alert(\'Thiáº¿u thÃ´ng tin\', \'Vui lÃ²ng nháº­p biá»ƒn sá»‘ xe!\')', 'Alert.alert(\'Thiếu thông tin\', \'Vui lòng nhập biển số xe!\')'],
  ['// Náº¿u chÆ°a tÃ­nh giÃ¡, tÃ­nh trÆ°á»›c', '// Nếu chưa tính giá, tính trước'],
  ['\'Vui lÃ²ng nháº¥n \"TÃ­nh giÃ¡\" trÆ°á»›c khi Ä‘áº·t xe!\',', '\'Vui lòng nhấn \"Tính giá\" trước khi đặt xe!\',']
];

let modifiedCount = 0;
for (const [bad, good] of replacements) {
  if (content.includes(bad)) {
    content = content.replace(bad, good);
    modifiedCount++;
  } else {
    console.log('Not found:', bad);
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log('Replacements made:', modifiedCount);
