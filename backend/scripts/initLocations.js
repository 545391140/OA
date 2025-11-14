/**
 * 地理位置数据初始化脚本
 * 用于插入示例地理位置数据
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Location = require('../models/Location');

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

const initLocations = async () => {
  console.log('\n📝 开始初始化地理位置数据...');
  
  try {
    // 检查是否已有数据
    const existingCount = await Location.countDocuments();
    if (existingCount > 0) {
      console.log(`ℹ️  地理位置数据已存在 (${existingCount} 条)，跳过初始化`);
      console.log('💡 如需重新初始化，请先清空 locations 集合');
      return;
    }

    const locations = [
      // 中国主要城市
      {
        name: '北京',
        code: 'BJ',
        type: 'city',
        province: '北京',
        city: '北京',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Beijing',
        pinyin: 'Beijing',
        coordinates: { latitude: 39.9042, longitude: 116.4074 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 1, // 一线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '上海',
        code: 'SH',
        type: 'city',
        province: '上海',
        city: '上海',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Shanghai',
        pinyin: 'Shanghai',
        coordinates: { latitude: 31.2304, longitude: 121.4737 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 1, // 一线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '广州',
        code: 'GZ',
        type: 'city',
        province: '广东',
        city: '广州',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Guangzhou',
        pinyin: 'Guangzhou',
        coordinates: { latitude: 23.1291, longitude: 113.2644 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 1, // 一线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '深圳',
        code: 'SZ',
        type: 'city',
        province: '广东',
        city: '深圳',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Shenzhen',
        pinyin: 'Shenzhen',
        coordinates: { latitude: 22.5431, longitude: 114.0579 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 1, // 一线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '成都',
        code: 'CD',
        type: 'city',
        province: '四川',
        city: '成都',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Chengdu',
        pinyin: 'Chengdu',
        coordinates: { latitude: 30.5728, longitude: 104.0668 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 2, // 二线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '杭州',
        code: 'HZ',
        type: 'city',
        province: '浙江',
        city: '杭州',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Hangzhou',
        pinyin: 'Hangzhou',
        coordinates: { latitude: 30.2741, longitude: 120.1551 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 2, // 二线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '武汉',
        code: 'WH',
        type: 'city',
        province: '湖北',
        city: '武汉',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Wuhan',
        pinyin: 'Wuhan',
        coordinates: { latitude: 30.5928, longitude: 114.3055 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 2, // 二线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '西安',
        code: 'XA',
        type: 'city',
        province: '陕西',
        city: '西安',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Xi\'an',
        pinyin: 'Xi\'an',
        coordinates: { latitude: 34.3416, longitude: 108.9398 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 2, // 二线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '南京',
        code: 'NJ',
        type: 'city',
        province: '江苏',
        city: '南京',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Nanjing',
        pinyin: 'Nanjing',
        coordinates: { latitude: 32.0603, longitude: 118.7969 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 2, // 二线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '重庆',
        code: 'CQ',
        type: 'city',
        province: '重庆',
        city: '重庆',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Chongqing',
        pinyin: 'Chongqing',
        coordinates: { latitude: 29.4316, longitude: 106.9123 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 2, // 二线城市
        riskLevel: 'low',
        noAirport: false
      },
      // 北京市辖区示例
      {
        name: '朝阳区',
        code: 'BJ_CY',
        type: 'city',
        province: '北京',
        city: '北京',
        district: '朝阳区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Chaoyang District',
        pinyin: 'Chaoyang',
        coordinates: { latitude: 39.9219, longitude: 116.4435 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 1, // 属于一线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '海淀区',
        code: 'BJ_HD',
        type: 'city',
        province: '北京',
        city: '北京',
        district: '海淀区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Haidian District',
        pinyin: 'Haidian',
        coordinates: { latitude: 39.9561, longitude: 116.2981 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 1, // 属于一线城市
        riskLevel: 'low',
        noAirport: false
      },
      // 主要机场
      {
        name: '北京首都国际机场',
        code: 'PEK',
        type: 'airport',
        province: '北京',
        city: '北京',
        district: '顺义区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Beijing Capital International Airport',
        pinyin: 'Beijing Shoudu Guojijichang',
        coordinates: { latitude: 40.0799, longitude: 116.6031 },
        timezone: 'Asia/Shanghai',
        status: 'active'
      },
      {
        name: '上海浦东国际机场',
        code: 'PVG',
        type: 'airport',
        province: '上海',
        city: '上海',
        district: '浦东新区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Shanghai Pudong International Airport',
        pinyin: 'Shanghai Pudong Guojijichang',
        coordinates: { latitude: 31.1434, longitude: 121.8052 },
        timezone: 'Asia/Shanghai',
        status: 'active'
      },
      {
        name: '广州白云国际机场',
        code: 'CAN',
        type: 'airport',
        province: '广东',
        city: '广州',
        district: '白云区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Guangzhou Baiyun International Airport',
        pinyin: 'Guangzhou Baiyun Guojijichang',
        coordinates: { latitude: 23.3924, longitude: 113.2988 },
        timezone: 'Asia/Shanghai',
        status: 'active'
      },
      // 主要火车站
      {
        name: '北京站',
        code: 'BJP',
        type: 'station',
        province: '北京',
        city: '北京',
        district: '东城区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Beijing Railway Station',
        pinyin: 'Beijing Zhan',
        coordinates: { latitude: 39.9042, longitude: 116.4273 },
        timezone: 'Asia/Shanghai',
        status: 'active'
      },
      {
        name: '北京西站',
        code: 'BXP',
        type: 'station',
        province: '北京',
        city: '北京',
        district: '丰台区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Beijing West Railway Station',
        pinyin: 'Beijing Xizhan',
        coordinates: { latitude: 39.8964, longitude: 116.3203 },
        timezone: 'Asia/Shanghai',
        status: 'active'
      },
      {
        name: '上海虹桥站',
        code: 'SHQ',
        type: 'station',
        province: '上海',
        city: '上海',
        district: '闵行区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Shanghai Hongqiao Railway Station',
        pinyin: 'Shanghai Hongqiao Zhan',
        coordinates: { latitude: 31.1974, longitude: 121.3200 },
        timezone: 'Asia/Shanghai',
        status: 'active'
      },
      // 国际城市
      {
        name: '东京',
        code: 'TYO',
        type: 'city',
        province: '',
        city: '东京',
        district: '',
        county: '',
        country: '日本',
        countryCode: 'JP',
        enName: 'Tokyo',
        pinyin: 'Dongjing',
        coordinates: { latitude: 35.6762, longitude: 139.6503 },
        timezone: 'Asia/Tokyo',
        status: 'active',
        cityLevel: 4, // 其他城市（国际城市默认4级）
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '纽约',
        code: 'NYC',
        type: 'city',
        province: '纽约州',
        city: '纽约',
        district: '',
        county: '',
        country: '美国',
        countryCode: 'US',
        enName: 'New York',
        pinyin: 'Niuyue',
        coordinates: { latitude: 40.7128, longitude: -74.0060 },
        timezone: 'America/New_York',
        status: 'active',
        cityLevel: 4, // 其他城市（国际城市默认4级）
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '伦敦',
        code: 'LON',
        type: 'city',
        province: '',
        city: '伦敦',
        district: '',
        county: '',
        country: '英国',
        countryCode: 'GB',
        enName: 'London',
        pinyin: 'Lundun',
        coordinates: { latitude: 51.5074, longitude: -0.1278 },
        timezone: 'Europe/London',
        status: 'active',
        cityLevel: 4, // 其他城市（国际城市默认4级）
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '新加坡',
        code: 'SIN',
        type: 'city',
        province: '',
        city: '新加坡',
        district: '',
        county: '',
        country: '新加坡',
        countryCode: 'SG',
        enName: 'Singapore',
        pinyin: 'Xinjiapo',
        coordinates: { latitude: 1.3521, longitude: 103.8198 },
        timezone: 'Asia/Singapore',
        status: 'active',
        cityLevel: 4, // 其他城市（国际城市默认4级）
        riskLevel: 'low',
        noAirport: false
      },
      // 国际机场
      {
        name: '东京成田国际机场',
        code: 'NRT',
        type: 'airport',
        province: '',
        city: '东京',
        district: '',
        county: '',
        country: '日本',
        countryCode: 'JP',
        enName: 'Narita International Airport',
        pinyin: 'Dongjing Chengtianguo Ji Jichang',
        coordinates: { latitude: 35.7720, longitude: 140.3928 },
        timezone: 'Asia/Tokyo',
        status: 'active'
      },
      {
        name: '纽约肯尼迪国际机场',
        code: 'JFK',
        type: 'airport',
        province: '纽约州',
        city: '纽约',
        district: '',
        county: '',
        country: '美国',
        countryCode: 'US',
        enName: 'John F. Kennedy International Airport',
        pinyin: 'Niuyue Kennidi Guoji Jichang',
        coordinates: { latitude: 40.6413, longitude: -73.7781 },
        timezone: 'America/New_York',
        status: 'active'
      }
    ];

    await Location.insertMany(locations);
    console.log(`✅ 成功创建 ${locations.length} 条地理位置数据`);
    
    // 显示统计信息
    const stats = {
      cities: await Location.countDocuments({ type: 'city' }),
      airports: await Location.countDocuments({ type: 'airport' }),
      stations: await Location.countDocuments({ type: 'station' }),
      total: await Location.countDocuments(),
      cityLevel1: await Location.countDocuments({ type: 'city', cityLevel: 1 }),
      cityLevel2: await Location.countDocuments({ type: 'city', cityLevel: 2 }),
      cityLevel3: await Location.countDocuments({ type: 'city', cityLevel: 3 }),
      cityLevel4: await Location.countDocuments({ type: 'city', cityLevel: 4 })
    };
    
    console.log('\n📊 数据统计:');
    console.log(`  城市: ${stats.cities} 条`);
    console.log(`    - 1级（一线城市）: ${stats.cityLevel1} 条`);
    console.log(`    - 2级（二线城市）: ${stats.cityLevel2} 条`);
    console.log(`    - 3级（三线城市）: ${stats.cityLevel3} 条`);
    console.log(`    - 4级（其他城市）: ${stats.cityLevel4} 条`);
    console.log(`  机场: ${stats.airports} 条`);
    console.log(`  火车站: ${stats.stations} 条`);
    console.log(`  总计: ${stats.total} 条`);
    
  } catch (error) {
    console.error('❌ 初始化地理位置数据失败:', error.message);
    throw error;
  }
};

const main = async () => {
  console.log('🚀 开始初始化地理位置数据...\n');
  
  await connectDB();
  await initLocations();
  
  console.log('\n✅ 地理位置数据初始化完成！');
  process.exit(0);
};

// 运行初始化
main().catch((error) => {
  console.error('❌ 初始化失败:', error);
  process.exit(1);
});


 * 用于插入示例地理位置数据
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Location = require('../models/Location');

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

const initLocations = async () => {
  console.log('\n📝 开始初始化地理位置数据...');
  
  try {
    // 检查是否已有数据
    const existingCount = await Location.countDocuments();
    if (existingCount > 0) {
      console.log(`ℹ️  地理位置数据已存在 (${existingCount} 条)，跳过初始化`);
      console.log('💡 如需重新初始化，请先清空 locations 集合');
      return;
    }

    const locations = [
      // 中国主要城市
      {
        name: '北京',
        code: 'BJ',
        type: 'city',
        province: '北京',
        city: '北京',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Beijing',
        pinyin: 'Beijing',
        coordinates: { latitude: 39.9042, longitude: 116.4074 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 1, // 一线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '上海',
        code: 'SH',
        type: 'city',
        province: '上海',
        city: '上海',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Shanghai',
        pinyin: 'Shanghai',
        coordinates: { latitude: 31.2304, longitude: 121.4737 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 1, // 一线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '广州',
        code: 'GZ',
        type: 'city',
        province: '广东',
        city: '广州',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Guangzhou',
        pinyin: 'Guangzhou',
        coordinates: { latitude: 23.1291, longitude: 113.2644 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 1, // 一线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '深圳',
        code: 'SZ',
        type: 'city',
        province: '广东',
        city: '深圳',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Shenzhen',
        pinyin: 'Shenzhen',
        coordinates: { latitude: 22.5431, longitude: 114.0579 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 1, // 一线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '成都',
        code: 'CD',
        type: 'city',
        province: '四川',
        city: '成都',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Chengdu',
        pinyin: 'Chengdu',
        coordinates: { latitude: 30.5728, longitude: 104.0668 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 2, // 二线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '杭州',
        code: 'HZ',
        type: 'city',
        province: '浙江',
        city: '杭州',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Hangzhou',
        pinyin: 'Hangzhou',
        coordinates: { latitude: 30.2741, longitude: 120.1551 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 2, // 二线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '武汉',
        code: 'WH',
        type: 'city',
        province: '湖北',
        city: '武汉',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Wuhan',
        pinyin: 'Wuhan',
        coordinates: { latitude: 30.5928, longitude: 114.3055 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 2, // 二线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '西安',
        code: 'XA',
        type: 'city',
        province: '陕西',
        city: '西安',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Xi\'an',
        pinyin: 'Xi\'an',
        coordinates: { latitude: 34.3416, longitude: 108.9398 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 2, // 二线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '南京',
        code: 'NJ',
        type: 'city',
        province: '江苏',
        city: '南京',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Nanjing',
        pinyin: 'Nanjing',
        coordinates: { latitude: 32.0603, longitude: 118.7969 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 2, // 二线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '重庆',
        code: 'CQ',
        type: 'city',
        province: '重庆',
        city: '重庆',
        district: '',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Chongqing',
        pinyin: 'Chongqing',
        coordinates: { latitude: 29.4316, longitude: 106.9123 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 2, // 二线城市
        riskLevel: 'low',
        noAirport: false
      },
      // 北京市辖区示例
      {
        name: '朝阳区',
        code: 'BJ_CY',
        type: 'city',
        province: '北京',
        city: '北京',
        district: '朝阳区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Chaoyang District',
        pinyin: 'Chaoyang',
        coordinates: { latitude: 39.9219, longitude: 116.4435 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 1, // 属于一线城市
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '海淀区',
        code: 'BJ_HD',
        type: 'city',
        province: '北京',
        city: '北京',
        district: '海淀区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Haidian District',
        pinyin: 'Haidian',
        coordinates: { latitude: 39.9561, longitude: 116.2981 },
        timezone: 'Asia/Shanghai',
        status: 'active',
        cityLevel: 1, // 属于一线城市
        riskLevel: 'low',
        noAirport: false
      },
      // 主要机场
      {
        name: '北京首都国际机场',
        code: 'PEK',
        type: 'airport',
        province: '北京',
        city: '北京',
        district: '顺义区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Beijing Capital International Airport',
        pinyin: 'Beijing Shoudu Guojijichang',
        coordinates: { latitude: 40.0799, longitude: 116.6031 },
        timezone: 'Asia/Shanghai',
        status: 'active'
      },
      {
        name: '上海浦东国际机场',
        code: 'PVG',
        type: 'airport',
        province: '上海',
        city: '上海',
        district: '浦东新区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Shanghai Pudong International Airport',
        pinyin: 'Shanghai Pudong Guojijichang',
        coordinates: { latitude: 31.1434, longitude: 121.8052 },
        timezone: 'Asia/Shanghai',
        status: 'active'
      },
      {
        name: '广州白云国际机场',
        code: 'CAN',
        type: 'airport',
        province: '广东',
        city: '广州',
        district: '白云区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Guangzhou Baiyun International Airport',
        pinyin: 'Guangzhou Baiyun Guojijichang',
        coordinates: { latitude: 23.3924, longitude: 113.2988 },
        timezone: 'Asia/Shanghai',
        status: 'active'
      },
      // 主要火车站
      {
        name: '北京站',
        code: 'BJP',
        type: 'station',
        province: '北京',
        city: '北京',
        district: '东城区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Beijing Railway Station',
        pinyin: 'Beijing Zhan',
        coordinates: { latitude: 39.9042, longitude: 116.4273 },
        timezone: 'Asia/Shanghai',
        status: 'active'
      },
      {
        name: '北京西站',
        code: 'BXP',
        type: 'station',
        province: '北京',
        city: '北京',
        district: '丰台区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Beijing West Railway Station',
        pinyin: 'Beijing Xizhan',
        coordinates: { latitude: 39.8964, longitude: 116.3203 },
        timezone: 'Asia/Shanghai',
        status: 'active'
      },
      {
        name: '上海虹桥站',
        code: 'SHQ',
        type: 'station',
        province: '上海',
        city: '上海',
        district: '闵行区',
        county: '',
        country: '中国',
        countryCode: 'CN',
        enName: 'Shanghai Hongqiao Railway Station',
        pinyin: 'Shanghai Hongqiao Zhan',
        coordinates: { latitude: 31.1974, longitude: 121.3200 },
        timezone: 'Asia/Shanghai',
        status: 'active'
      },
      // 国际城市
      {
        name: '东京',
        code: 'TYO',
        type: 'city',
        province: '',
        city: '东京',
        district: '',
        county: '',
        country: '日本',
        countryCode: 'JP',
        enName: 'Tokyo',
        pinyin: 'Dongjing',
        coordinates: { latitude: 35.6762, longitude: 139.6503 },
        timezone: 'Asia/Tokyo',
        status: 'active',
        cityLevel: 4, // 其他城市（国际城市默认4级）
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '纽约',
        code: 'NYC',
        type: 'city',
        province: '纽约州',
        city: '纽约',
        district: '',
        county: '',
        country: '美国',
        countryCode: 'US',
        enName: 'New York',
        pinyin: 'Niuyue',
        coordinates: { latitude: 40.7128, longitude: -74.0060 },
        timezone: 'America/New_York',
        status: 'active',
        cityLevel: 4, // 其他城市（国际城市默认4级）
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '伦敦',
        code: 'LON',
        type: 'city',
        province: '',
        city: '伦敦',
        district: '',
        county: '',
        country: '英国',
        countryCode: 'GB',
        enName: 'London',
        pinyin: 'Lundun',
        coordinates: { latitude: 51.5074, longitude: -0.1278 },
        timezone: 'Europe/London',
        status: 'active',
        cityLevel: 4, // 其他城市（国际城市默认4级）
        riskLevel: 'low',
        noAirport: false
      },
      {
        name: '新加坡',
        code: 'SIN',
        type: 'city',
        province: '',
        city: '新加坡',
        district: '',
        county: '',
        country: '新加坡',
        countryCode: 'SG',
        enName: 'Singapore',
        pinyin: 'Xinjiapo',
        coordinates: { latitude: 1.3521, longitude: 103.8198 },
        timezone: 'Asia/Singapore',
        status: 'active',
        cityLevel: 4, // 其他城市（国际城市默认4级）
        riskLevel: 'low',
        noAirport: false
      },
      // 国际机场
      {
        name: '东京成田国际机场',
        code: 'NRT',
        type: 'airport',
        province: '',
        city: '东京',
        district: '',
        county: '',
        country: '日本',
        countryCode: 'JP',
        enName: 'Narita International Airport',
        pinyin: 'Dongjing Chengtianguo Ji Jichang',
        coordinates: { latitude: 35.7720, longitude: 140.3928 },
        timezone: 'Asia/Tokyo',
        status: 'active'
      },
      {
        name: '纽约肯尼迪国际机场',
        code: 'JFK',
        type: 'airport',
        province: '纽约州',
        city: '纽约',
        district: '',
        county: '',
        country: '美国',
        countryCode: 'US',
        enName: 'John F. Kennedy International Airport',
        pinyin: 'Niuyue Kennidi Guoji Jichang',
        coordinates: { latitude: 40.6413, longitude: -73.7781 },
        timezone: 'America/New_York',
        status: 'active'
      }
    ];

    await Location.insertMany(locations);
    console.log(`✅ 成功创建 ${locations.length} 条地理位置数据`);
    
    // 显示统计信息
    const stats = {
      cities: await Location.countDocuments({ type: 'city' }),
      airports: await Location.countDocuments({ type: 'airport' }),
      stations: await Location.countDocuments({ type: 'station' }),
      total: await Location.countDocuments(),
      cityLevel1: await Location.countDocuments({ type: 'city', cityLevel: 1 }),
      cityLevel2: await Location.countDocuments({ type: 'city', cityLevel: 2 }),
      cityLevel3: await Location.countDocuments({ type: 'city', cityLevel: 3 }),
      cityLevel4: await Location.countDocuments({ type: 'city', cityLevel: 4 })
    };
    
    console.log('\n📊 数据统计:');
    console.log(`  城市: ${stats.cities} 条`);
    console.log(`    - 1级（一线城市）: ${stats.cityLevel1} 条`);
    console.log(`    - 2级（二线城市）: ${stats.cityLevel2} 条`);
    console.log(`    - 3级（三线城市）: ${stats.cityLevel3} 条`);
    console.log(`    - 4级（其他城市）: ${stats.cityLevel4} 条`);
    console.log(`  机场: ${stats.airports} 条`);
    console.log(`  火车站: ${stats.stations} 条`);
    console.log(`  总计: ${stats.total} 条`);
    
  } catch (error) {
    console.error('❌ 初始化地理位置数据失败:', error.message);
    throw error;
  }
};

const main = async () => {
  console.log('🚀 开始初始化地理位置数据...\n');
  
  await connectDB();
  await initLocations();
  
  console.log('\n✅ 地理位置数据初始化完成！');
  process.exit(0);
};

// 运行初始化
main().catch((error) => {
  console.error('❌ 初始化失败:', error);
  process.exit(1);
});


