// Kiểm tra zombie drivers trực tiếp qua MongoDB shell
// Copy và paste các câu lệnh sau vào MongoDB shell hoặc Compass

// 1. Kiểm tra tất cả drivers đang online và lastOnlineTime của họ
db.drivers.find(
  { isOnline: true },
  { 
    name: 1, 
    email: 1, 
    status: 1, 
    isOnline: 1, 
    lastOnlineTime: 1,
    'location.coordinates': 1 
  }
).forEach(function(driver) {
  const now = new Date();
  const lastOnline = new Date(driver.lastOnlineTime);
  const minutesAgo = Math.floor((now - lastOnline) / 1000 / 60);
  
  let statusEmoji = '🟢';
  if (minutesAgo > 5) statusEmoji = '⚠️ ZOMBIE';
  else if (minutesAgo > 3) statusEmoji = '🟡 STALE';
  
  print(`${statusEmoji} ${driver.name} (${driver.email})`);
  print(`  Status: ${driver.status} | Online: ${driver.isOnline}`);
  print(`  Last heartbeat: ${minutesAgo} phút trước (${lastOnline.toISOString()})`);
  print(`  Coordinates: [${driver.location.coordinates}]`);
  print('');
});

// 2. Đếm số lượng drivers theo category
print('\n📊 THỐNG KÊ:');
const now = new Date();
const threeMinutesAgo = new Date(now - 3 * 60 * 1000);
const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);

const activeCount = db.drivers.count({ 
  isOnline: true, 
  lastOnlineTime: { $gte: threeMinutesAgo } 
});

const staleCount = db.drivers.count({ 
  isOnline: true, 
  lastOnlineTime: { $gte: fiveMinutesAgo, $lt: threeMinutesAgo } 
});

const zombieCount = db.drivers.count({ 
  isOnline: true, 
  lastOnlineTime: { $lt: fiveMinutesAgo } 
});

print(`✅ Active (< 3 phút): ${activeCount} drivers`);
print(`🟡 Stale (3-5 phút): ${staleCount} drivers`);
print(`⚠️ Zombie (> 5 phút): ${zombieCount} drivers`);

// 3. Tự động fix zombie drivers (uncomment để chạy)
/*
print('\n🔧 FIXING ZOMBIE DRIVERS...');
const result = db.drivers.updateMany(
  { 
    isOnline: true, 
    lastOnlineTime: { $lt: fiveMinutesAgo } 
  },
  { 
    $set: { 
      isOnline: false, 
      status: 'offline' 
    } 
  }
);
print(`Fixed ${result.modifiedCount} zombie drivers`);
*/

// 4. MANUAL FIX COMMANDS (nếu cần fix thủ công)
print('\n📝 MANUAL FIX COMMANDS:');
print('// Fix tất cả zombie drivers:');
print('db.drivers.updateMany({ isOnline: true, lastOnlineTime: { $lt: new Date(new Date() - 5 * 60 * 1000) } }, { $set: { isOnline: false, status: "offline" } })');
print('\n// Fix 1 driver cụ thể (thay EMAIL):');
print('db.drivers.updateOne({ email: "driver@email.com" }, { $set: { isOnline: false, status: "offline" } })');
