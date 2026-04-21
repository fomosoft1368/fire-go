const fs = require('fs');
const file = 'd:/fire-go/mobile-customer/src/screens/HireDriverScreen.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacements = [
  ['[HireDriverScreen] ðŸ“  Requesting location permission...', '[HireDriverScreen] 📍 Requesting location permission...'],
  ['[HireDriverScreen] âš ï¸  Location permission denied', '[HireDriverScreen] ⚠️ Location permission denied'],
  ['[HireDriverScreen] âœ… Getting current position...', '[HireDriverScreen] ✅ Getting current position...'],
  ['[HireDriverScreen] ðŸ“  Current position:', '[HireDriverScreen] 📍 Current position:'],
  ['[HireDriverScreen] ðŸ   Address from coordinates:', '[HireDriverScreen] 🏠 Address from coordinates:'],
  ['[HireDriverScreen] â Œ Error getting location:', '[HireDriverScreen] ❌ Error getting location:'],
  ['[HireDriverScreen] ðŸ”„ Starting polling for rideId:', '[HireDriverScreen] 🔄 Starting polling for rideId:'],
  ['[HireDriverScreen] ðŸ“Š Polling result:', '[HireDriverScreen] 📊 Polling result:'],
  ['[HireDriverScreen] âœ… Driver found!', '[HireDriverScreen] ✅ Driver found!'],
  ['[HireDriverScreen] ðŸ“  Driver location:', '[HireDriverScreen] 📍 Driver location:'],
  ['[HireDriverScreen] â Œ Polling error:', '[HireDriverScreen] ❌ Polling error:'],
  ['[HireDriverScreen] ðŸš— ===== Báº®T Ä áº¦U TÃ NH GIÃ  =====', '[HireDriverScreen] 🚗 ===== BẮT ĐẦU TÍNH GIÁ ====='],
  ['[HireDriverScreen] ðŸ“  Input:', '[HireDriverScreen] 📍 Input:'],
  ['[HireDriverScreen] ðŸ—ºï¸  Route info:', '[HireDriverScreen] 🗺️ Route info:']
];

let modifiedCount = 0;
for (const [bad, good] of replacements) {
  if (content.includes(bad)) {
    content = content.replace(bad, good);
    modifiedCount++;
  } else {
    // If not found, output what wasn\'t found
    console.log('Not found:', bad);
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log('Replacements made:', modifiedCount);
