const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH';

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('🔗 Connected to MongoDB\n');
  
  console.log('🔍 Tìm zombie drivers (isOnline=true nhưng không có lastOnlineTime)...\n');
  
  const zombies = await mongoose.connection.db.collection('drivers').find({ 
    isOnline: true,
    lastOnlineTime: null
  }).toArray();
  
  console.log(`⚠️ Tìm thấy ${zombies.length} zombie drivers:\n`);
  
  zombies.forEach(driver => {
    console.log(`  - ${driver.name || 'Unknown'} (${driver.email})`);
  });
  
  if (zombies.length > 0) {
    console.log('\n🔧 Đang fix zombie drivers...');
    
    const result = await mongoose.connection.db.collection('drivers').updateMany(
      { 
        isOnline: true,
        lastOnlineTime: null
      },
      { 
        $set: { 
          isOnline: false,
          status: 'offline'
        }
      }
    );
    
    console.log(`✅ Đã cập nhật ${result.modifiedCount} drivers về offline\n`);
  } else {
    console.log('\n✅ Không có zombie drivers\n');
  }
  
  // Kiểm tra lại
  const stillOnline = await mongoose.connection.db.collection('drivers').countDocuments({ 
    isOnline: true 
  });
  
  console.log(`📊 Số drivers đang online sau khi fix: ${stillOnline}`);
  
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
