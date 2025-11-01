require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const TravelStandard = require('../models/TravelStandard');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`📦 MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    process.exit(1);
  }
};

const migrateStandards = async () => {
  console.log('\n📝 开始迁移差旅标准数据...');
  try {
    // 查找所有没有priority字段的标准
    const standards = await TravelStandard.find({
      $or: [
        { priority: { $exists: false } },
        { conditionGroups: { $exists: false } },
        { expenseStandards: { $exists: false } }
      ]
    });

    console.log(`找到 ${standards.length} 个需要迁移的标准`);

    for (const standard of standards) {
      const updateData = {};
      
      // 设置默认优先级
      if (!standard.priority) {
        updateData.priority = 50;
      }
      
      // 确保conditionGroups存在（即使是空数组）
      if (!standard.conditionGroups) {
        updateData.conditionGroups = [];
      }
      
      // 确保expenseStandards存在（即使是空数组）
      if (!standard.expenseStandards) {
        updateData.expenseStandards = [];
      }

      if (Object.keys(updateData).length > 0) {
        await TravelStandard.findByIdAndUpdate(standard._id, updateData);
        console.log(`✅ 已更新标准: ${standard.standardCode}`);
      }
    }

    // 创建索引
    console.log('\n📊 创建索引...');
    try {
      await TravelStandard.collection.createIndex({ priority: -1 });
      console.log('✅ priority索引已创建');
    } catch (err) {
      if (err.code === 85) {
        console.log('ℹ️  priority索引已存在');
      } else {
        console.error('❌ 创建priority索引失败:', err.message);
      }
    }

    try {
      await TravelStandard.collection.createIndex({ 'conditionGroups.groupId': 1 });
      console.log('✅ conditionGroups索引已创建');
    } catch (err) {
      if (err.code === 85) {
        console.log('ℹ️  conditionGroups索引已存在');
      } else {
        console.error('❌ 创建conditionGroups索引失败:', err.message);
      }
    }

    console.log('\n✅ 迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    throw error;
  }
};

const main = async () => {
  await connectDB();
  await migrateStandards();
  mongoose.connection.close();
  process.exit(0);
};

main().catch((error) => {
  console.error('❌ 迁移脚本执行失败:', error);
  process.exit(1);
});

