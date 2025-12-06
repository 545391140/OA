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

// 从Location对象或字符串中提取国家信息
const extractCountryFromLocation = (location) => {
  if (!location) return null;
  
  if (typeof location === 'string') {
    // 如果是字符串格式 "城市, 国家"
    const parts = location.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 1].trim();
    }
    return null;
  }
  
  if (typeof location === 'object' && location !== null) {
    // 如果是对象，优先使用 country 字段
    if (location.country) {
      return typeof location.country === 'string' ? location.country : (location.country.name || location.country);
    }
    // 如果没有 country 字段，尝试从 name 中提取（如果是国家类型）
    if (location.type === 'country' && location.name) {
      return location.name;
    }
  }
  
  return null;
};

// 判断是否是跨境行程
const determineTripType = async (userResidenceCountry, destinations) => {
  // 如果没有常驻国信息，默认返回境内
  if (!userResidenceCountry) {
    return 'domestic';
  }

  // 获取常驻国名称（可能是字符串或对象）
  let residenceCountryName = null;
  if (typeof userResidenceCountry === 'string') {
    residenceCountryName = userResidenceCountry;
  } else if (typeof userResidenceCountry === 'object' && userResidenceCountry !== null) {
    // 如果是 ObjectId，需要查询
    if (mongoose.Types.ObjectId.isValid(userResidenceCountry)) {
      const countryLocation = await Location.findById(userResidenceCountry).lean();
      if (countryLocation) {
        residenceCountryName = countryLocation.name || countryLocation.country;
      }
    } else {
      residenceCountryName = userResidenceCountry.name || userResidenceCountry.country || userResidenceCountry;
    }
  }

  if (!residenceCountryName) {
    return 'domestic';
  }

  // 检查所有行程目的地
  const allDestinations = [
    destinations.outbound,
    destinations.inbound,
    ...(destinations.multiCity || [])
  ].filter(Boolean);

  // 如果没有任何目的地，默认返回境内
  if (allDestinations.length === 0) {
    return 'domestic';
  }

  // 检查是否有任何一个目的地不在常驻国
  for (const dest of allDestinations) {
    let destCountry = extractCountryFromLocation(dest);
    
    // 如果目的地是 ObjectId，需要查询
    if (!destCountry && mongoose.Types.ObjectId.isValid(dest)) {
      const destLocation = await Location.findById(dest).lean();
      if (destLocation) {
        destCountry = destLocation.country || destLocation.name;
      }
    }
    
    if (destCountry && destCountry !== residenceCountryName) {
      // 找到非常驻国的目的地，返回跨境
      return 'cross_border';
    }
  }

  // 所有目的地都在常驻国，返回境内
  return 'domestic';
};

// 主函数
const checkTravelType = async (travelNumber) => {
  try {
    await connectDB();

    console.log(`\n查询差旅单号: ${travelNumber}\n`);

    // 查询差旅单
    const travel = await Travel.findOne({ travelNumber: travelNumber.toUpperCase() })
      .populate('employee', 'firstName lastName email residenceCountry residenceCity')
      .lean();

    if (!travel) {
      console.log('❌ 未找到该差旅单');
      process.exit(1);
    }

    console.log('✅ 找到差旅单:');
    console.log(`   ID: ${travel._id}`);
    console.log(`   差旅单号: ${travel.travelNumber}`);
    console.log(`   标题: ${travel.title || 'N/A'}`);
    console.log(`   当前 tripType: ${travel.tripType || 'N/A'}`);
    console.log(`   申请人: ${travel.employee?.firstName} ${travel.employee?.lastName} (${travel.employee?.email})`);
    console.log(`   申请人ID: ${travel.employee?._id}`);

    // 获取申请人的常驻国
    let residenceCountry = travel.employee?.residenceCountry;
    console.log(`\n📋 申请人常驻国信息:`);
    console.log(`   原始值: ${JSON.stringify(residenceCountry)}`);
    
    // 如果是 ObjectId，查询详细信息
    if (residenceCountry && mongoose.Types.ObjectId.isValid(residenceCountry)) {
      const countryLocation = await Location.findById(residenceCountry).lean();
      if (countryLocation) {
        console.log(`   国家名称: ${countryLocation.name}`);
        console.log(`   国家代码: ${countryLocation.countryCode || 'N/A'}`);
        residenceCountry = countryLocation;
      }
    } else if (typeof residenceCountry === 'string') {
      console.log(`   国家名称: ${residenceCountry}`);
    } else if (typeof residenceCountry === 'object') {
      console.log(`   国家名称: ${residenceCountry.name || residenceCountry.country || 'N/A'}`);
    }

    // 获取所有行程目的地
    const destinations = {
      outbound: travel.outbound?.destination,
      inbound: travel.inbound?.destination,
      multiCity: travel.multiCityRoutes?.map(route => route.destination) || []
    };

    console.log(`\n🌍 行程目的地信息:`);
    console.log(`   去程目的地: ${JSON.stringify(destinations.outbound)}`);
    console.log(`   返程目的地: ${JSON.stringify(destinations.inbound)}`);
    console.log(`   多程目的地: ${JSON.stringify(destinations.multiCity)}`);

    // 处理目的地，如果是 ObjectId 则查询详细信息
    const processedDestinations = {
      outbound: null,
      inbound: null,
      multiCity: []
    };

    if (destinations.outbound) {
      if (mongoose.Types.ObjectId.isValid(destinations.outbound)) {
        const loc = await Location.findById(destinations.outbound).lean();
        processedDestinations.outbound = loc;
        console.log(`\n   去程目的地详情: ${loc?.name || 'N/A'}, ${loc?.country || 'N/A'}`);
      } else {
        processedDestinations.outbound = destinations.outbound;
      }
    }

    if (destinations.inbound) {
      if (mongoose.Types.ObjectId.isValid(destinations.inbound)) {
        const loc = await Location.findById(destinations.inbound).lean();
        processedDestinations.inbound = loc;
        console.log(`   返程目的地详情: ${loc?.name || 'N/A'}, ${loc?.country || 'N/A'}`);
      } else {
        processedDestinations.inbound = destinations.inbound;
      }
    }

    for (let i = 0; i < destinations.multiCity.length; i++) {
      if (mongoose.Types.ObjectId.isValid(destinations.multiCity[i])) {
        const loc = await Location.findById(destinations.multiCity[i]).lean();
        processedDestinations.multiCity.push(loc);
        console.log(`   多程${i+1}目的地详情: ${loc?.name || 'N/A'}, ${loc?.country || 'N/A'}`);
      } else {
        processedDestinations.multiCity.push(destinations.multiCity[i]);
      }
    }

    // 自动判断行程类型
    const autoTripType = await determineTripType(residenceCountry, processedDestinations);

    console.log(`\n📊 验证结果:`);
    console.log(`   当前 tripType: ${travel.tripType || 'N/A'}`);
    console.log(`   自动判断结果: ${autoTripType}`);
    
    if (travel.tripType === autoTripType) {
      console.log(`   ✅ 差旅类型正确！`);
    } else {
      console.log(`   ⚠️  差旅类型不匹配！`);
      console.log(`   建议更新为: ${autoTripType}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
};

// 从命令行参数获取差旅单号
const travelNumber = process.argv[2] || 'TR-20251206-0002';

checkTravelType(travelNumber);

