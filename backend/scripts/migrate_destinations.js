// 数据清洗脚本：将 Travel 表中的字符串目的地转换为 ObjectId
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Travel = require('../models/Travel');
const Location = require('../models/Location');

// 连接数据库
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system';
    console.log(`🔌 Connecting to ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('📦 MongoDB Connected');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
}

async function migrateDestinations() {
  await connectDB();

  try {
    console.log('🔍 开始扫描需要迁移的 Travel 记录...');

    // 1. 查找所有 destination 字段为字符串类型的记录
    const stringDestTravels = await Travel.find({
      destination: { $type: 'string', $ne: null, $ne: '' }
    });

    console.log(`找到 ${stringDestTravels.length} 条主目的地为字符串的记录`);

    let updatedCount = 0;
    let failedCount = 0;

    for (const travel of stringDestTravels) {
      const destStr = travel.destination;
      // 取逗号前的部分作为城市名
      const cityName = destStr.split(',')[0].trim();
      
      // 使用正则不区分大小写精确匹配名称，且优先匹配城市类型
      const location = await Location.findOne({
        name: { $regex: new RegExp(`^${cityName}$`, 'i') },
        type: { $in: ['city', 'country'] } 
      }).sort({ type: 1 }); 

      if (location) {
        // 构造更新对象
        const update = {
            destination: location._id
        };

        // 同时检查并更新 outbound 和 inbound
        if (travel.outbound && typeof travel.outbound.destination === 'string' && travel.outbound.destination === destStr) {
             update['outbound.destination'] = location._id;
        }
        if (travel.inbound && typeof travel.inbound.destination === 'string' && travel.inbound.destination === destStr) {
             update['inbound.destination'] = location._id;
        }

        try {
          await Travel.updateOne({ _id: travel._id }, { $set: update });
          updatedCount++;
          if (updatedCount % 10 === 0) process.stdout.write('.');
        } catch (err) {
          console.error(`\n❌ 更新 Travel ${travel._id} 失败:`, err.message);
          failedCount++;
        }
      } else {
        // console.log(`\n⚠️  未找到匹配的 Location: "${destStr}"`);
        failedCount++;
      }
    }

    console.log('\n\n✅ 主目的地迁移完成');
    console.log(`- 成功更新: ${updatedCount}`);
    console.log(`- 匹配失败: ${failedCount}`);
    
    // 2. 处理 multiCityRoutes 中的字符串目的地
    console.log('\n🔍 开始扫描多程行程 (MultiCity)...');
    const multiCityTravels = await Travel.find({
      'multiCityRoutes.0': { $exists: true }
    });
    
    let multiCityUpdated = 0;
    
    for (const travel of multiCityTravels) {
        let hasChange = false;
        const routes = travel.multiCityRoutes;
        
        for (let i = 0; i < routes.length; i++) {
            const route = routes[i];
            if (typeof route.destination === 'string' && route.destination) {
                const cityName = route.destination.split(',')[0].trim();
                const location = await Location.findOne({
                    name: { $regex: new RegExp(`^${cityName}$`, 'i') },
                    type: { $in: ['city', 'country'] }
                });
                
                if (location) {
                    await Travel.updateOne(
                        { _id: travel._id },
                        { $set: { [`multiCityRoutes.${i}.destination`]: location._id } }
                    );
                    hasChange = true;
                }
            }
        }
        if (hasChange) multiCityUpdated++;
    }
    
    console.log(`✅ 多程行程迁移完成，涉及 ${multiCityUpdated} 条记录`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
}

migrateDestinations();
