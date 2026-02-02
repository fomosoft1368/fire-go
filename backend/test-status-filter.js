/**
 * TEST CASE: Verify recalculate logic với requests có status khác nhau
 */

console.log('\n🧪 TEST: recalculateFaresForCombinedTrip - Status Filtering\n');

// Giả sử database có các requests sau cho 1 trip:
const requests = [
  { _id: '001', customerId: 'A', distance: 75, status: 'accepted' },
  { _id: '002', customerId: 'B', distance: 50, status: 'accepted' },
  { _id: '003', customerId: 'C', distance: 60, status: 'accepted' },
  { _id: '004', customerId: 'D', distance: 40, status: 'pending' },    // ← Chờ
  { _id: '005', customerId: 'E', distance: 30, status: 'timeout' },    // ← Hết hạn
  { _id: '006', customerId: 'F', distance: 55, status: 'rejected' },   // ← Từ chối
];

console.log('📋 All requests in database:');
requests.forEach(r => {
  console.log(`  ${r._id}: ${r.customerId} (${r.distance}km) - status: ${r.status}`);
});

// LOGIC CŨ (SAI): status: { $ne: 'completed' }
const oldLogic = requests.filter(r => r.status !== 'completed');
console.log(`\n❌ OLD LOGIC (status !== 'completed'):`);
console.log(`  Found: ${oldLogic.length} requests`);
console.log(`  → Tính giá cho ${oldLogic.length} người → DISCOUNT SAI!`);

// LOGIC MỚI (ĐÚNG): status: { $in: ['accepted', 'in_progress'] }
const newLogic = requests.filter(r => ['accepted', 'in_progress'].includes(r.status));
console.log(`\n✅ NEW LOGIC (status in ['accepted', 'in_progress']):`);
console.log(`  Found: ${newLogic.length} requests`);
console.log(`  → Tính giá cho ${newLogic.length} người → DISCOUNT ĐÚNG!`);

// Test với pricing
const config = {
  pricePerKm: 2000,
  baseFee: 20000,
  carpoolDiscounts: [
    { passengers: 1, discount: 0 },
    { passengers: 2, discount: 10 },
    { passengers: 3, discount: 15 },
    { passengers: 4, discount: 20 },
  ]
};

console.log('\n💰 PRICE COMPARISON (75km):\n');

// Old logic (6 người - không có discount cho 6 người → dùng 4 người 20%)
const oldPassengers = oldLogic.length;
const oldDiscount = oldPassengers <= 4 ? config.carpoolDiscounts.find(d => d.passengers === oldPassengers)?.discount || 0 : 20;
const oldRaw = 75 * config.pricePerKm + config.baseFee;
const oldFinal = Math.round(oldRaw * (1 - oldDiscount / 100));
console.log(`OLD LOGIC (${oldPassengers} requests):`);
console.log(`  raw: ${oldRaw.toLocaleString()}đ`);
console.log(`  discount: ${oldDiscount}% (fallback for ${oldPassengers} people)`);
console.log(`  final: ${oldFinal.toLocaleString()}đ`);

// New logic (3 người - discount 15%)
const newPassengers = newLogic.length;
const newDiscount = config.carpoolDiscounts.find(d => d.passengers === newPassengers)?.discount || 0;
const newRaw = 75 * config.pricePerKm + config.baseFee;
const newFinal = Math.round(newRaw * (1 - newDiscount / 100));
console.log(`\nNEW LOGIC (${newPassengers} active requests):`);
console.log(`  raw: ${newRaw.toLocaleString()}đ`);
console.log(`  discount: ${newDiscount}%`);
console.log(`  final: ${newFinal.toLocaleString()}đ`);

console.log(`\n💡 DIFFERENCE: ${Math.abs(oldFinal - newFinal).toLocaleString()}đ`);
console.log(`   ${oldFinal > newFinal ? '↓' : '↑'} ${oldFinal > newFinal ? 'CHEAPER' : 'MORE EXPENSIVE'} with new logic`);

console.log('\n✅ NEW LOGIC chỉ tính người THỰC SỰ đang trong chuyến!');
console.log('   (không tính pending, timeout, rejected)\n');
