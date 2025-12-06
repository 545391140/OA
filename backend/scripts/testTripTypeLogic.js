const mongoose = require('mongoose');
const Travel = require('../models/Travel');
const User = require('../models/User');
const Location = require('../models/Location');
const config = require('../config');

// 连接数据库
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// 从Location对象或字符串中提取国家信息（模拟前端逻辑）
const extractCountryFromLocation = (location) => {
  if (!location) {
    console.log('[extractCountryFromLocation] No location provided');
    return null;
  }
  
  console.log('[extractCountryFromLocation] Input:', JSON.stringify(location), 'Type:', typeof location);
  
  if (typeof location === 'string') {
    // 如果是字符串格式 "城市, 国家"
    const parts = location.split(',');
    if (parts.length >= 2) {
      const country = parts[parts.length - 1].trim();
      console.log('[extractCountryFromLocation] Extracted from string:', country);
      return country;
    }
    console.log('[extractCountryFromLocation] String format invalid, parts:', parts);
    return null;
  }
  
  if (typeof location === 'object' && location !== null) {
    // 如果是对象，优先使用 country 字段
    if (location.country) {
      let country = null;
      if (typeof location.country === 'string') {
        country = location.country;
      } else if (typeof location.country === 'object' && location.country.name) {
        country = location.country.name;
      }
      console.log('[extractCountryFromLocation] Extracted from country field:', country);
      return country;
    }
    
    // 如果没有 country 字段，尝试从 name 中提取（如果是国家类型）
    if (location.type === 'country' && location.name) {
      console.log('[extractCountryFromLocation] Extracted from name (country type):', location.name);
      return location.name;
    }
  }
  
  console.log('[extractCountryFromLocation] Could not extract country, returning null');
  return null;
};

// 判断是否是跨境行程（模拟前端逻辑）
const determineTripType = (userResidenceCountry, destinations) => {
  console.log('\n=== determineTripType ===');
  console.log('userResidenceCountry:', JSON.stringify(userResidenceCountry));
  console.log('destinations:', JSON.stringify(destinations));
  
  // 如果没有常驻国信息，默认返回境内
  if (!userResidenceCountry) {
    console.log('[determineTripType] No residenceCountry, returning domestic');
    return 'domestic';
  }

  // 获取常驻国名称（可能是字符串或对象）
  let residenceCountryName = null;
  if (typeof userResidenceCountry === 'string') {
    residenceCountryName = userResidenceCountry;
  } else if (typeof userResidenceCountry === 'object' && userResidenceCountry !== null) {
    residenceCountryName = userResidenceCountry.name || userResidenceCountry.country || userResidenceCountry;
  }

  console.log('[determineTripType] Residence country name:', residenceCountryName);

  if (!residenceCountryName) {
    console.log('[determineTripType] Could not extract residence country name, returning domestic');
    return 'domestic';
  }

  // 检查所有行程目的地
  const allDestinations = [
    destinations.outbound,
    destinations.inbound,
    ...(destinations.multiCity || [])
  ].filter(Boolean);

  console.log('[determineTripType] All destinations:', allDestinations);

  // 如果没有任何目的地，默认返回境内
  if (allDestinations.length === 0) {
    console.log('[determineTripType] No destinations, returning domestic');
    return 'domestic';
  }

  // 检查是否有任何一个目的地不在常驻国
  for (const dest of allDestinations) {
    const destCountry = extractCountryFromLocation(dest);
    console.log('[determineTripType] Destination:', dest, '-> Country:', destCountry);
    console.log('[determineTripType] Comparing:', destCountry, '!==', residenceCountryName, '?', destCountry !== residenceCountryName);
    
    if (destCountry && destCountry !== residenceCountryName) {
      // 找到非常驻国的目的地，返回跨境
      console.log('[determineTripType] Found cross-border destination:', destCountry, '!=', residenceCountryName);
      return 'cross_border';
    }
  }

  // 所有目的地都在常驻国，返回境内
  console.log('[determineTripType] All destinations in residence country, returning domestic');
  return 'domestic';
};

// 测试函数
const testTripTypeLogic = async () => {
  try {
    await connectDB();

    console.log('\n=== 测试差旅类型自动判断逻辑 ===\n');

    // 1. 查询差旅单
    const travelNumber = 'TR-20251206-0002';
    const travel = await Travel.findOne({ travelNumber: travelNumber.toUpperCase() })
      .populate('employee', 'firstName lastName email residenceCountry residenceCity')
      .lean();

    if (!travel) {
      console.log('❌ 未找到差旅单');
      process.exit(1);
    }

    console.log('✅ 找到差旅单:', travel.travelNumber);
    console.log('   申请人:', travel.employee?.firstName, travel.employee?.lastName);
    console.log('   当前 tripType:', travel.tripType);

    // 2. 获取申请人的常驻国
    let residenceCountry = travel.employee?.residenceCountry;
    console.log('\n📋 申请人常驻国（原始）:', JSON.stringify(residenceCountry));
    
    // 如果是 ObjectId，查询详细信息
    if (residenceCountry && mongoose.Types.ObjectId.isValid(residenceCountry)) {
      const countryLocation = await Location.findById(residenceCountry).lean();
      if (countryLocation) {
        console.log('   查询后的 Location 对象:', JSON.stringify(countryLocation, null, 2));
        residenceCountry = countryLocation;
      }
    }

    // 3. 获取目的地信息
    const destinations = {
      outbound: travel.outbound?.destination,
      inbound: travel.inbound?.destination,
      multiCity: travel.multiCityRoutes?.map(route => route.destination) || []
    };

    console.log('\n🌍 行程目的地（原始）:');
    console.log('   去程:', JSON.stringify(destinations.outbound));
    console.log('   返程:', JSON.stringify(destinations.inbound));
    console.log('   多程:', JSON.stringify(destinations.multiCity));

    // 4. 模拟前端的数据处理（convertLocationToString）
    // 注意：前端会将对象转换为字符串，但我们需要保留原始格式用于判断
    const processedDestinations = {
      outbound: destinations.outbound,
      inbound: destinations.inbound,
      multiCity: destinations.multiCity
    };

    // 5. 执行判断
    console.log('\n🔍 执行自动判断...');
    const autoTripType = determineTripType(residenceCountry, processedDestinations);

    console.log('\n📊 判断结果:');
    console.log('   当前 tripType:', travel.tripType);
    console.log('   自动判断结果:', autoTripType);
    
    if (travel.tripType === autoTripType) {
      console.log('   ✅ 判断结果一致');
    } else {
      console.log('   ⚠️  判断结果不一致！');
    }

    // 6. 测试不同的数据格式
    console.log('\n\n=== 测试不同数据格式 ===\n');
    
    // 测试1: 字符串格式 "城市, 国家"
    console.log('测试1: 字符串格式');
    const test1 = determineTripType(
      { name: '中国' },
      { outbound: '迪拜, 阿联酋', inbound: '北京, 中国' }
    );
    console.log('结果:', test1, '\n');

    // 测试2: Location对象格式
    console.log('测试2: Location对象格式');
    const test2 = determineTripType(
      { name: '中国' },
      { 
        outbound: { name: '迪拜', country: '阿联酋' },
        inbound: { name: '北京', country: '中国' }
      }
    );
    console.log('结果:', test2, '\n');

    // 测试3: 只有境内行程
    console.log('测试3: 只有境内行程');
    const test3 = determineTripType(
      { name: '中国' },
      { outbound: '北京, 中国', inbound: '上海, 中国' }
    );
    console.log('结果:', test3, '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
};

testTripTypeLogic();

