const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect('mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH');
  const Users = mongoose.connection.collection('users');
  const fStaff = await Users.find({ 
    role: { $in: ['f1_lead', 'f2_sub_lead', 'f3_staff_mkt'] }, 
    referralCode: { $exists: false } 
  }).toArray();
  
  for (let user of fStaff) { 
    const code = 'MKT' + Math.random().toString(36).substring(2, 6).toUpperCase(); 
    await Users.updateOne({ _id: user._id }, { $set: { referralCode: code } }); 
    console.log('Updated', user.email, 'with code', code); 
  }
  
  const withoutCodeButExists = await Users.find({ 
    role: { $in: ['f1_lead', 'f2_sub_lead', 'f3_staff_mkt'] }, 
    referralCode: null 
  }).toArray();
  
  for (let user of withoutCodeButExists) { 
    const code = 'MKT' + Math.random().toString(36).substring(2, 6).toUpperCase(); 
    await Users.updateOne({ _id: user._id }, { $set: { referralCode: code } }); 
    console.log('Updated null', user.email, 'with code', code); 
  }
  
  console.log('Done fixing ' + (fStaff.length + withoutCodeButExists.length) + ' users.');
  process.exit(0);
}

fix();
