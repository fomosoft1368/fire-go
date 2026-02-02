// Test pricing calculation với config thật từ database
const config = {
  vehicleTypes: [
    {
      type: "sedan",
      baseFee: 20000,
      pricePerKm: 23000, // ← ĐÂY LÀ VẤN ĐỀ! Quá cao!
      minimumFare: 30000,
    }
  ],
  peakMultiplier: 1.5,
  carpoolDiscounts: [
    { passengers: 2, discount: 10 },
    { passengers: 3, discount: 15 },
    { passengers: 4, discount: 20 }
  ]
};

console.log('\n🧮 TEST PRICING với config THẬT từ database:\n');

// Test case: 75km, không peak, 1-4 người
const distance = 75;
const sedan = config.vehicleTypes[0];

for (let passengers = 1; passengers <= 4; passengers++) {
  const raw = distance * sedan.pricePerKm + sedan.baseFee;
  const base = raw; // không peak
  
  const discountConfig = config.carpoolDiscounts.find(d => d.passengers === passengers);
  const discountRate = discountConfig ? discountConfig.discount / 100 : 0;
  
  const final = Math.round(base * (1 - discountRate));
  
  console.log(`${passengers} người:`);
  console.log(`  raw = ${distance} × ${sedan.pricePerKm} + ${sedan.baseFee} = ${raw.toLocaleString()}đ`);
  console.log(`  discount = ${discountRate * 100}%`);
  console.log(`  final = ${raw.toLocaleString()} × ${1 - discountRate} = ${final.toLocaleString()}đ`);
  console.log('');
}

console.log('⚠️ VẤN ĐỀ: pricePerKm = 23,000đ quá cao!');
console.log('✅ NÊN LÀ: pricePerKm = 2,000đ');
console.log('\nVí dụ với 2,000đ/km:');
const correctPricePerKm = 2000;
const raw2 = distance * correctPricePerKm + sedan.baseFee;
const final2_4people = Math.round(raw2 * 0.8);
console.log(`  75km, 4 người: ${distance} × ${correctPricePerKm} + ${sedan.baseFee} = ${raw2.toLocaleString()}đ`);
console.log(`  Giảm 20%: ${final2_4people.toLocaleString()}đ ✅`);
