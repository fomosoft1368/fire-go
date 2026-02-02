const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH';

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('🔗 Connected to MongoDB\n');
  
  const allDrivers = await mongoose.connection.db.collection('drivers').find({}).toArray();
  
  console.log('👥 TẤT CẢ DRIVERS TRONG HỆ THỐNG:\n');
  
  const now = new Date();
  
  allDrivers.forEach(driver => {
    const lastOnline = driver.lastOnlineTime ? new Date(driver.lastOnlineTime) : null;
    const minutesAgo = lastOnline ? Math.floor((now - lastOnline) / 1000 / 60) : 999;
    
    let statusIcon = driver.isOnline ? '🟢' : '⚫';
    
    console.log(`${statusIcon} ${driver.name} (${driver.email})`);
    console.log(`  Status: ${driver.status} | isOnline: ${driver.isOnline}`);
    if (lastOnline) {
      console.log(`  Last heartbeat: ${minutesAgo} phút trước (${lastOnline.toLocaleString('vi-VN')})`);
    } else {
      console.log(`  Last heartbeat: Chưa có`);
    }
    console.log('');
  });
  
  const onlineCount = allDrivers.filter(d => d.isOnline === true).length;
  const offlineCount = allDrivers.filter(d => d.isOnline === false).length;
  const statusOnline = allDrivers.filter(d => d.status === 'online').length;
  const statusOffline = allDrivers.filter(d => d.status === 'offline').length;
  
  console.log(`\n📊 THỐNG KÊ:`);
  console.log(`   Tổng số drivers: ${allDrivers.length}`);
  console.log(`   🟢 isOnline=true: ${onlineCount}`);
  console.log(`   ⚫ isOnline=false: ${offlineCount}`);
  console.log(`   📍 status='online': ${statusOnline}`);
  console.log(`   📍 status='offline': ${statusOffline}`);
  
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
