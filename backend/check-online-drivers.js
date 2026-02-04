const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH';

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('🔗 Connected to MongoDB\n');
  
  const drivers = await mongoose.connection.db.collection('drivers').find({ 
    isOnline: true 
  }).toArray();
  
  console.log('🚗 DRIVERS ĐANG ONLINE TRONG DATABASE:\n');
  
  const now = new Date();
  
  drivers.forEach(driver => {
    const lastOnline = new Date(driver.lastOnlineTime);
    const minutesAgo = Math.floor((now - lastOnline) / 1000 / 60);
    
    let statusEmoji = '🟢 ACTIVE';
    if (minutesAgo > 5) statusEmoji = '⚠️ ZOMBIE';
    else if (minutesAgo > 3) statusEmoji = '🟡 STALE';
    
    console.log(`${statusEmoji} ${driver.name} (${driver.email})`);
    console.log(`  Status: ${driver.status} | Online: ${driver.isOnline}`);
    console.log(`  Last heartbeat: ${minutesAgo} phút trước (${lastOnline.toLocaleString('vi-VN')})`);
    console.log('');
  });
  
  const activeCount = drivers.filter(d => (now - new Date(d.lastOnlineTime)) < 3*60*1000).length;
  const staleCount = drivers.filter(d => {
    const diff = now - new Date(d.lastOnlineTime);
    return diff >= 3*60*1000 && diff < 5*60*1000;
  }).length;
  const zombieCount = drivers.filter(d => (now - new Date(d.lastOnlineTime)) >= 5*60*1000).length;
  
  console.log(`\n📊 THỐNG KÊ:`);
  console.log(`   Tổng số: ${drivers.length} drivers đang isOnline=true`);
  console.log(`   🟢 Active (< 3 phút): ${activeCount}`);
  console.log(`   🟡 Stale (3-5 phút): ${staleCount}`);
  console.log(`   ⚠️ Zombie (> 5 phút): ${zombieCount}`);
  
  if (zombieCount > 0) {
    console.log('\n🔧 FIX ZOMBIE DRIVERS:');
    console.log('   Để fix các zombie drivers, chạy: node fix-zombie-drivers.js');
  }
  
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
