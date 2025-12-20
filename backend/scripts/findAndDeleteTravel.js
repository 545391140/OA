const mongoose = require('mongoose');
const Travel = require('../models/Travel');
const path = require('path');
// 尝试从多个位置加载 .env 文件
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

async function findAndDeleteTravel() {
  try {
    // 连接数据库
    const config = require('../config');
    const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI || 'mongodb://localhost:27017/travel-expense';
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

    console.log('\n📊 Travel Status:', travel.status);
    
    // 检查状态：只能删除草稿状态的申请
    if (travel.status !== 'draft') {
      console.log(`\n⚠️  Cannot delete travel request: status is "${travel.status}", only "draft" status can be deleted`);
      await mongoose.disconnect();
      return;
    }
    
    // 执行删除
    console.log('\n🗑️  Deleting travel request...');
    await Travel.deleteOne({ _id: travel._id });
    console.log('✅ Travel request deleted successfully!');
    
    // 验证删除
    const verifyTravel = await Travel.findOne({ travelNumber });
    if (!verifyTravel) {
      console.log('✅ Verification: Travel request no longer exists in database');
    } else {
      console.log('⚠️  Warning: Travel request still exists after deletion');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

findAndDeleteTravel();



