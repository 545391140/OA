// 数据清洗脚本：将 Travel 表中的字符串目的地转换为 ObjectId
const mongoose = require('mongoose');
require('dotenv').config({ path: '../backend/.env' });
const Travel = require('../backend/models/Travel');
const Location = require('../backend/models/Location');

// 连接数据库
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system';
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
    // 注意：MongoDB 中 $type: 'string' 用于匹配字符串类型
    const stringDestTravels = await Travel.find({
      destination: { $type: 'string', $ne: null, $ne: '' }
    });

    console.log(`找到 ${stringDestTravels.length} 条主目的地为字符串的记录`);

    let updatedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // 预加载常用 Location 数据以减少查询次数 (可选优化)
    // 这里我们简单地逐条处理，因为是一次性脚本

    for (const travel of stringDestTravels) {
      const destStr = travel.destination;
      
      // 尝试在 Location 表中查找匹配的城市
      // 通常字符串格式可能是 "City" 或 "City, Country"
      // 我们主要匹配 City 部分
      const cityName = destStr.split(',')[0].trim();
      
      // 使用正则不区分大小写精确匹配名称，且优先匹配城市类型
      const location = await Location.findOne({
        name: { $regex: new RegExp(`^${cityName}$`, 'i') },
        type: { $in: ['city', 'country'] } // 优先匹配城市或国家
      }).sort({ type: 1 }); // 如果有多个匹配，优先取 city (因为 enum 中 city 在前? 不一定，这里只是简单排序)
      
      // 更严谨的排序：优先城市
       // 这里其实只要找到一个匹配的就行，通常城市名是唯一的或我们取第一个

      if (location) {
        // 更新 destination 为 ObjectId
        travel.destination = location._id;
        
        // 同时检查并更新 outbound 和 inbound
        if (travel.outbound && typeof travel.outbound.destination === 'string' && travel.outbound.destination === destStr) {
             travel.outbound.destination = location._id;
        }
        if (travel.inbound && typeof travel.inbound.destination === 'string' && travel.inbound.destination === destStr) {
             travel.inbound.destination = location._id;
        }

        try {
          // 使用 updateOne 避免触发 pre/post save hooks (如自动生成费用等)
          // 但这里我们需要修改 Mixed 类型字段，直接 save 可能更安全，但要注意 hooks
          // 为了安全，我们使用 updateOne 直接操作数据库
          await Travel.updateOne({ _id: travel._id }, { 
            $set: { 
                destination: location._id,
                'outbound.destination': (travel.outbound && typeof travel.outbound.destination === 'string' && travel.outbound.destination === destStr) ? location._id : travel.outbound?.destination,
                'inbound.destination': (travel.inbound && typeof travel.inbound.destination === 'string' && travel.inbound.destination === destStr) ? location._id : travel.inbound?.destination
            } 
          });
          
          updatedCount++;
          if (updatedCount % 10 === 0) process.stdout.write('.');
        } catch (err) {
          console.error(`\n❌ 更新 Travel ${travel._id} 失败:`, err.message);
          failedCount++;
        }
      } else {
        // console.log(`\n⚠️  未找到匹配的 Location: "${destStr}" (Travel ID: ${travel._id})`);
        failedCount++;
      }
    }

    console.log('\n\n✅ 主目的地迁移完成');
    console.log(`- 成功更新: ${updatedCount}`);
    console.log(`- 匹配失败: ${failedCount}`);
    
    // 2. 处理 multiCityRoutes 中的字符串目的地
    console.log('\n🔍 开始扫描多程行程 (MultiCity)...');
    // 查找包含多程行程且目的地为字符串的记录
    // 这个查询比较复杂，我们简单点：查找所有有多程行程的记录，然后在代码里检查
    const multiCityTravels = await Travel.find({
      'multiCityRoutes.0': { $exists: true }
    });
    
    let multiCityUpdated = 0;
    
    for (const travel of multiCityTravels) {
        let hasChange = false;
        const newRoutes = [...travel.multiCityRoutes]; // Clone
        
        for (let i = 0; i < newRoutes.length; i++) {
            const route = newRoutes[i];
            if (typeof route.destination === 'string' && route.destination) {
                const cityName = route.destination.split(',')[0].trim();
                const location = await Location.findOne({
                    name: { $regex: new RegExp(`^${cityName}$`, 'i') },
                    type: { $in: ['city', 'country'] }
                });
                
                if (location) {
                    // 这里稍微麻烦点，因为 multiCityRoutes 是数组
                    // 我们构造一个更新操作
                    await Travel.updateOne(
                        { _id: travel._id, [`multiCityRoutes.${i}.destination`]: route.destination },
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
  }
}

migrateDestinations();

