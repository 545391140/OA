const mongoose = require('mongoose');
const Travel = require('../models/Travel');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

async function findAndDeleteTravel() {
  try {
    // 连接数据库
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/travel-expense';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // 查找差旅单
    const travelNumber = 'TR-20251206-0002';
    const travel = await Travel.findOne({ travelNumber }).lean();
    
    if (!travel) {
      console.log(`❌ Travel request ${travelNumber} not found`);
      await mongoose.disconnect();
      return;
    }

    console.log('\n📋 Travel Request Found:');
    console.log('ID:', travel._id);
    console.log('Travel Number:', travel.travelNumber);
    console.log('Employee:', travel.employee);
    console.log('Employee Type:', typeof travel.employee);
    console.log('Employee is null:', travel.employee === null);
    console.log('Employee is undefined:', travel.employee === undefined);
    
    if (travel.employee) {
      if (travel.employee instanceof mongoose.Types.ObjectId) {
        console.log('Employee is ObjectId:', travel.employee.toString());
      } else if (typeof travel.employee === 'object') {
        console.log('Employee is object:', JSON.stringify(travel.employee, null, 2));
        console.log('Employee._id:', travel.employee._id);
      } else {
        console.log('Employee is string/other:', travel.employee);
      }
    }

    console.log('\n🧪 Testing delete via API...');
    console.log('To test deletion, use:');
    console.log(`curl -X DELETE http://localhost:3001/api/travel/${travel._id} -H "Authorization: Bearer YOUR_TOKEN"`);
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

findAndDeleteTravel();


