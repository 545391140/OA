/**
 * 数据库初始化脚本
 * 用于创建所有集合、索引和初始数据
 */

require('dotenv').config();
const mongoose = require('mongoose');

// 导入所有模型
const User = require('../models/User');
const Travel = require('../models/Travel');
const Expense = require('../models/Expense');
const TravelStandard = require('../models/TravelStandard');
const CityLevel = require('../models/CityLevel');
const JobLevel = require('../models/JobLevel');
const Location = require('../models/Location');
const TravelTransportStandard = require('../models/TravelTransportStandard');
const TravelAccommodationStandard = require('../models/TravelAccommodationStandard');
const TravelMealStandard = require('../models/TravelMealStandard');
const TravelAllowanceStandard = require('../models/TravelAllowanceStandard');

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

const createIndexes = async () => {
  console.log('\n📑 创建索引...');
  
  try {
    // 创建所有模型的索引
    await Promise.all([
      User.createIndexes(),
      Travel.createIndexes(),
      Expense.createIndexes(),
      TravelStandard.createIndexes(),
      CityLevel.createIndexes(),
      JobLevel.createIndexes(),
      Location.createIndexes(),
      TravelTransportStandard.createIndexes(),
      TravelAccommodationStandard.createIndexes(),
      TravelMealStandard.createIndexes(),
      TravelAllowanceStandard.createIndexes(),
    ]);
    
    console.log('✅ 所有索引创建完成');
  } catch (error) {
    console.error('❌ 创建索引失败:', error.message);
  }
};

const initBaseData = async () => {
  console.log('\n📝 初始化基础数据...');
  
  try {
    // 检查是否已有数据
    const existingCityLevels = await CityLevel.countDocuments();
    const existingJobLevels = await JobLevel.countDocuments();
    
    // 创建城市级别数据
    if (existingCityLevels === 0) {
      const cityLevels = [
        { cityCode: 'BJ', cityName: '北京', province: '北京', country: '中国', level: 1 },
        { cityCode: 'SH', cityName: '上海', province: '上海', country: '中国', level: 1 },
        { cityCode: 'GZ', cityName: '广州', province: '广东', country: '中国', level: 1 },
        { cityCode: 'SZ', cityName: '深圳', province: '广东', country: '中国', level: 1 },
        { cityCode: 'CD', cityName: '成都', province: '四川', country: '中国', level: 2 },
        { cityCode: 'HZ', cityName: '杭州', province: '浙江', country: '中国', level: 2 },
        { cityCode: 'WH', cityName: '武汉', province: '湖北', country: '中国', level: 2 },
        { cityCode: 'XA', cityName: '西安', province: '陕西', country: '中国', level: 2 },
      ];
      
      await CityLevel.insertMany(cityLevels);
      console.log(`✅ 创建了 ${cityLevels.length} 个城市级别数据`);
    } else {
      console.log(`ℹ️  城市级别数据已存在 (${existingCityLevels} 条)`);
    }
    
    // 创建职级数据
    if (existingJobLevels === 0) {
      const jobLevels = [
        { levelCode: 'L1', levelName: 'L1-初级', levelOrder: 1, description: '初级员工', status: 'active' },
        { levelCode: 'L2', levelName: 'L2-中级', levelOrder: 2, description: '中级员工', status: 'active' },
        { levelCode: 'L3', levelName: 'L3-高级', levelOrder: 3, description: '高级员工', status: 'active' },
        { levelCode: 'M1', levelName: 'M1-初级经理', levelOrder: 4, description: '初级经理', status: 'active' },
        { levelCode: 'M2', levelName: 'M2-中级经理', levelOrder: 5, description: '中级经理', status: 'active' },
        { levelCode: 'M3', levelName: 'M3-高级经理', levelOrder: 6, description: '高级经理', status: 'active' },
        { levelCode: 'D1', levelName: 'D1-总监', levelOrder: 7, description: '总监', status: 'active' },
        { levelCode: 'VP', levelName: 'VP-副总裁', levelOrder: 8, description: '副总裁', status: 'active' },
      ];
      
      await JobLevel.insertMany(jobLevels);
      console.log(`✅ 创建了 ${jobLevels.length} 个职级数据`);
    } else {
      console.log(`ℹ️  职级数据已存在 (${existingJobLevels} 条)`);
    }
    
    console.log('✅ 基础数据初始化完成');
  } catch (error) {
    console.error('❌ 初始化基础数据失败:', error.message);
  }
};

const showDatabaseInfo = async () => {
  console.log('\n📊 数据库信息:');
  
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`\n数据库名称: ${db.databaseName}`);
    console.log(`集合数量: ${collections.length}`);
    console.log('\n集合列表:');
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  - ${collection.name}: ${count} 条文档`);
    }
  } catch (error) {
    console.error('❌ 获取数据库信息失败:', error.message);
  }
};

const main = async () => {
  console.log('🚀 开始初始化数据库...\n');
  
  await connectDB();
  await createIndexes();
  await initBaseData();
  await showDatabaseInfo();
  
  console.log('\n✅ 数据库初始化完成！');
  process.exit(0);
};

// 运行初始化
main().catch((error) => {
  console.error('❌ 初始化失败:', error);
  process.exit(1);
});
