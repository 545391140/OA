/**
 * 迁移脚本：为所有现有的 travel 文档添加 multiCityRoutesBudget 字段
 * 
 * 使用方法：
 * node scripts/migrateMultiCityRoutesBudget.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

// 导入模型
const Travel = require('../models/Travel');

// 数据库连接配置
const connectDB = async () => {
  try {
    // 使用与服务器相同的数据库连接配置
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/travel-expense-system';
    const conn = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// 迁移函数
const migrateMultiCityRoutesBudget = async () => {
  try {
    console.log('开始迁移 multiCityRoutesBudget 字段...');
    
    // 查找所有没有 multiCityRoutesBudget 字段的文档
    const travels = await Travel.find({
      $or: [
        { multiCityRoutesBudget: { $exists: false } },
        { multiCityRoutesBudget: null }
      ]
    });
    
    console.log(`找到 ${travels.length} 个需要迁移的文档`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const travel of travels) {
      try {
        // 根据 multiCityRoutes 的长度初始化 multiCityRoutesBudget
        const routesLength = travel.multiCityRoutes ? travel.multiCityRoutes.length : 0;
        
        if (routesLength > 0) {
          // 如果有多程行程，初始化对应长度的数组
          travel.multiCityRoutesBudget = Array(routesLength).fill(null).map(() => ({}));
          console.log(`  文档 ${travel._id}: 初始化 ${routesLength} 个多程费用预算`);
        } else {
          // 如果没有多程行程，设置为空数组
          travel.multiCityRoutesBudget = [];
          console.log(`  文档 ${travel._id}: 设置为空数组`);
        }
        
        await travel.save();
        updated++;
      } catch (error) {
        console.error(`  文档 ${travel._id} 更新失败:`, error.message);
        skipped++;
      }
    }
    
    console.log('\n迁移完成！');
    console.log(`  成功更新: ${updated} 个文档`);
    console.log(`  跳过: ${skipped} 个文档`);
    
    // 验证迁移结果
    const remaining = await Travel.countDocuments({
      $or: [
        { multiCityRoutesBudget: { $exists: false } },
        { multiCityRoutesBudget: null }
      ]
    });
    
    if (remaining === 0) {
      console.log('✓ 所有文档都已包含 multiCityRoutesBudget 字段');
    } else {
      console.log(`⚠ 仍有 ${remaining} 个文档缺少 multiCityRoutesBudget 字段`);
    }
    
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
    throw error;
  }
};

// 主函数
const main = async () => {
  try {
    await connectDB();
    await migrateMultiCityRoutesBudget();
    process.exit(0);
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  }
};

// 运行迁移
if (require.main === module) {
  main();
}

module.exports = { migrateMultiCityRoutesBudget };

