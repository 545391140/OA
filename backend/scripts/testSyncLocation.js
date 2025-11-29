/**
 * 测试同步地理位置数据脚本（单个国家）
 * 用于测试数据格式是否正确
 * 
 * 使用方法：
 * node backend/scripts/testSyncLocation.js [countryId]
 * 
 * 示例：
 * node backend/scripts/testSyncLocation.js 1  # 测试中国
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');
const ctripApiService = require('../services/ctripApiService');

// 强制使用测试环境
process.env.CTRIP_USE_TEST_ENV = 'true';

// 统计信息
const stats = {
  totalLocations: 0,
  createdLocations: 0,
  updatedLocations: 0,
  skippedLocations: 0,
  errors: []
};

/**
 * 将POI数据转换为Location格式并建立关联
 */
function convertPOIToLocations(poiData, countryInfo) {
  const locations = [];
  const { dataList } = poiData;

  if (!dataList || !Array.isArray(dataList)) {
    return locations;
  }

  // 存储城市Location的映射，用于建立parentId关联
  const cityMap = new Map();

  dataList.forEach((province) => {
    // 添加省份信息
    const provinceLocation = {
      name: province.provinceName,
      code: province.provinceId?.toString(),
      type: 'province',
      province: province.provinceName,
      country: countryInfo.name,
      countryCode: countryInfo.code,
      enName: province.provinceEnName,
      status: 'active',
      coordinates: { latitude: 0, longitude: 0 },
      timezone: countryInfo.code === 'CN' ? 'Asia/Shanghai' : 'UTC',
      ctripProvinceId: province.provinceId,
    };
    locations.push(provinceLocation);

    // 处理地级市
    province.prefectureLevelCityInfoList?.forEach((city) => {
      // 添加城市信息
      const cityLocation = {
        name: city.cityName,
        code: city.cityCode || city.cityId?.toString(),
        type: 'city',
        city: city.cityName,
        province: province.provinceName,
        country: countryInfo.name,
        countryCode: countryInfo.code,
        enName: city.cityEnName,
        pinyin: city.cityPinYin,
        cityLevel: 4,
        status: 'active',
        coordinates: { latitude: 0, longitude: 0 },
        timezone: countryInfo.code === 'CN' ? 'Asia/Shanghai' : 'UTC',
        riskLevel: 'low',
        noAirport: false,
        ctripCityId: city.cityId,
        ctripProvinceId: province.provinceId,
        corpTag: city.corpTag || 0,
        districtCode: city.districtCode || '',
        remark: city.corpTag === 1 ? '非标城市，仅用于机票预订' : '',
      };

      const cityKey = `${countryInfo.code}_${city.cityId}`;
      cityMap.set(cityKey, cityLocation);
      locations.push(cityLocation);

      // 处理机场（只取前3个作为测试）
      if (city.stationInfo?.airportList) {
        city.stationInfo.airportList.slice(0, 3).forEach((airport) => {
          const airportTypes = airport.airportTypeList || [];
          if (airportTypes.includes('2') || airportTypes.includes('3')) {
            return;
          }

          locations.push({
            name: airport.airportName,
            code: airport.airportCode,
            type: 'airport',
            city: city.cityName,
            province: province.provinceName,
            country: countryInfo.name,
            countryCode: countryInfo.code,
            enName: airport.airportEnName,
            parentId: null,
            status: 'active',
            coordinates: { latitude: 0, longitude: 0 },
            timezone: countryInfo.code === 'CN' ? 'Asia/Shanghai' : 'UTC',
            ctripCityId: city.cityId,
            ctripProvinceId: province.provinceId,
            remark: JSON.stringify({
              airportTypes: airportTypes,
              buildings: airport.airportBuildingList || []
            }),
          });
        });
      }

      // 处理火车站（只取前2个作为测试）
      if (city.stationInfo?.trainStationList) {
        city.stationInfo.trainStationList.slice(0, 2).forEach((station) => {
          locations.push({
            name: station.trainName,
            code: station.trainCode,
            type: 'station',
            city: city.cityName,
            province: province.provinceName,
            country: countryInfo.name,
            countryCode: countryInfo.code,
            enName: station.trainEnName,
            parentId: null,
            status: 'active',
            coordinates: { latitude: 0, longitude: 0 },
            timezone: countryInfo.code === 'CN' ? 'Asia/Shanghai' : 'UTC',
            ctripCityId: city.cityId,
            ctripProvinceId: province.provinceId,
          });
        });
      }

      // 处理汽车站（只取前2个作为测试）
      if (city.stationInfo?.busStationList) {
        city.stationInfo.busStationList.slice(0, 2).forEach((busStation) => {
          locations.push({
            name: busStation.busName,
            code: busStation.busPinYinName,
            type: 'bus',
            city: city.cityName,
            province: province.provinceName,
            country: countryInfo.name,
            countryCode: countryInfo.code,
            pinyin: busStation.busPinYinName,
            parentId: null,
            status: 'active',
            coordinates: { latitude: 0, longitude: 0 },
            timezone: countryInfo.code === 'CN' ? 'Asia/Shanghai' : 'UTC',
            ctripCityId: city.cityId,
            ctripProvinceId: province.provinceId,
          });
        });
      }

      // 处理县级市（只取前2个作为测试）
      if (city.countyList) {
        city.countyList.slice(0, 2).forEach((county) => {
          locations.push({
            name: county.countyName,
            code: county.countyCode || county.countyId?.toString(),
            type: 'city',
            city: county.countyName,
            province: province.provinceName,
            country: countryInfo.name,
            countryCode: countryInfo.code,
            enName: county.countyEnName,
            pinyin: county.countyPinyin,
            cityLevel: 4,
            status: 'active',
            coordinates: { latitude: 0, longitude: 0 },
            timezone: countryInfo.code === 'CN' ? 'Asia/Shanghai' : 'UTC',
            riskLevel: 'low',
            noAirport: false,
            ctripCountyId: county.countyId,
            ctripCityId: city.cityId,
            ctripProvinceId: province.provinceId,
            corpTag: county.corpTag || 0,
            remark: county.corpTag === 1 ? '非标城市，仅用于机票预订' : '',
          });
        });
      }

      // 处理行政区（只取前2个作为测试）
      if (city.districtList) {
        city.districtList.slice(0, 2).forEach((district) => {
          locations.push({
            name: district.districtName,
            code: district.districtId?.toString(),
            type: 'city',
            city: district.districtName,
            province: province.provinceName,
            country: countryInfo.name,
            countryCode: countryInfo.code,
            enName: district.districtEnName,
            district: district.districtName,
            status: 'active',
            coordinates: { latitude: 0, longitude: 0 },
            timezone: countryInfo.code === 'CN' ? 'Asia/Shanghai' : 'UTC',
            cityLevel: 4,
            riskLevel: 'low',
            noAirport: false,
            ctripDistrictId: district.districtId,
            ctripCityId: city.cityId,
            ctripProvinceId: province.provinceId,
            districtCode: city.districtCode || '',
          });
        });
      }
    });
  });

  return { locations, cityMap };
}

/**
 * 保存或更新Location数据
 */
async function saveOrUpdateLocation(locationData, cityMap) {
  try {
    const cleanData = { ...locationData };
    
    // 1. code字段转换为大写
    if (cleanData.code && typeof cleanData.code === 'string') {
      cleanData.code = cleanData.code.toUpperCase();
    }
    
    // 2. countryCode转换为大写
    if (cleanData.countryCode && typeof cleanData.countryCode === 'string') {
      cleanData.countryCode = cleanData.countryCode.toUpperCase();
    }
    
    // 3. 确保coordinates字段存在
    if (!cleanData.coordinates) {
      cleanData.coordinates = { latitude: 0, longitude: 0 };
    }
    
    // 4. 确保timezone字段存在
    if (!cleanData.timezone) {
      cleanData.timezone = cleanData.countryCode === 'CN' ? 'Asia/Shanghai' : 'UTC';
    }
    
    // 5. 处理parentId关联
    if ((cleanData.type === 'airport' || cleanData.type === 'station' || cleanData.type === 'bus') 
        && cleanData.ctripCityId) {
      const cityLocation = await Location.findOne({
        type: 'city',
        ctripCityId: cleanData.ctripCityId,
        country: cleanData.country
      });
      
      if (cityLocation) {
        cleanData.parentId = cityLocation._id;
      } else {
        cleanData.parentId = null;
      }
    } else {
      cleanData.parentId = cleanData.parentId || null;
    }
    
    // 6. 确保status字段有效
    if (!cleanData.status || !['active', 'inactive'].includes(cleanData.status)) {
      cleanData.status = 'active';
    }
    
    // 7. 确保corpTag字段有效
    if (cleanData.corpTag === undefined || cleanData.corpTag === null) {
      cleanData.corpTag = 0;
    }
    
    // 构建查询条件：优先使用携程ID
    const query = {
      type: cleanData.type,
      country: cleanData.country,
    };

    if (cleanData.type === 'city' && cleanData.ctripCityId) {
      query.ctripCityId = cleanData.ctripCityId;
    } else if (cleanData.type === 'province' && cleanData.ctripProvinceId) {
      query.ctripProvinceId = cleanData.ctripProvinceId;
    } else if (cleanData.type === 'city' && cleanData.ctripCountyId) {
      query.ctripCountyId = cleanData.ctripCountyId;
    } else if (cleanData.type === 'city' && cleanData.ctripDistrictId) {
      query.ctripDistrictId = cleanData.ctripDistrictId;
    } else if (cleanData.code) {
      query.code = cleanData.code.toUpperCase();
    } else {
      query.name = cleanData.name;
      if (cleanData.city) {
        query.city = cleanData.city;
      }
    }

    const existingLocation = await Location.findOne(query);

    if (existingLocation) {
      // 更新现有记录
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] !== undefined && cleanData[key] !== null) {
          existingLocation[key] = cleanData[key];
        }
      });
      await existingLocation.save();
      stats.updatedLocations++;
      return existingLocation;
    } else {
      // 创建新记录
      const newLocation = await Location.create(cleanData);
      stats.createdLocations++;
      return newLocation;
    }
  } catch (error) {
    console.error(`保存Location失败 [${locationData.name}]:`, error.message);
    stats.errors.push({
      location: locationData.name,
      error: error.message
    });
    stats.skippedLocations++;
    return null;
  }
}

/**
 * 验证数据格式
 */
function validateLocationData(location) {
  const issues = [];
  
  // 检查必填字段
  if (!location.name) issues.push('缺少name字段');
  if (!location.type) issues.push('缺少type字段');
  
  // 检查枚举值
  const validTypes = ['airport', 'station', 'city', 'province', 'country', 'bus'];
  if (!validTypes.includes(location.type)) {
    issues.push(`type字段值无效: ${location.type}`);
  }
  
  const validStatus = ['active', 'inactive'];
  if (location.status && !validStatus.includes(location.status)) {
    issues.push(`status字段值无效: ${location.status}`);
  }
  
  if (location.corpTag !== undefined && ![0, 1].includes(location.corpTag)) {
    issues.push(`corpTag字段值无效: ${location.corpTag}`);
  }
  
  // 检查字段类型
  if (location.ctripCityId !== undefined && typeof location.ctripCityId !== 'number') {
    issues.push(`ctripCityId应该是Number类型，当前是: ${typeof location.ctripCityId}`);
  }
  
  return issues;
}

/**
 * 主函数
 */
async function main() {
  try {
    const countryId = process.argv[2] ? parseInt(process.argv[2]) : 1; // 默认中国
    
    console.log('='.repeat(60));
    console.log('测试同步地理位置数据（单个国家）');
    console.log('='.repeat(60));
    console.log(`使用环境: ${process.env.CTRIP_USE_TEST_ENV === 'true' ? '测试环境' : '生产环境'}`);
    console.log(`测试国家ID: ${countryId}`);

    // 连接数据库
    await connectDB();
    console.log('✓ 数据库连接成功');

    // 获取国家信息
    console.log('\n获取国家信息...');
    const countries = await ctripApiService.getAllCountries('zh-CN');
    const country = countries.find(c => c.countryId === countryId);
    
    if (!country) {
      throw new Error(`未找到国家ID为 ${countryId} 的国家`);
    }
    
    console.log(`✓ 国家: ${country.name} (${country.enName})`);

    // 获取该国家的POI数据
    console.log('\n获取POI数据...');
    const poiData = await ctripApiService.getAllPOIInfo({
      countryId: country.countryId,
      returnDistrict: true,
      returnCounty: true,
      returnAirport: true,
      returnTrainStation: true,
      returnBusStation: true,
    });

    // 转换数据格式
    const { locations, cityMap } = convertPOIToLocations(poiData, country);
    stats.totalLocations = locations.length;
    
    console.log(`✓ 获取到 ${locations.length} 条地理位置数据（测试模式：已限制数量）`);

    // 验证数据格式
    console.log('\n验证数据格式...');
    let validationErrors = 0;
    locations.forEach((loc, index) => {
      const issues = validateLocationData(loc);
      if (issues.length > 0) {
        console.error(`  [${index + 1}] ${loc.name} (${loc.type}):`, issues.join(', '));
        validationErrors++;
      }
    });
    
    if (validationErrors > 0) {
      console.log(`\n⚠️  发现 ${validationErrors} 条数据格式问题`);
    } else {
      console.log('✓ 所有数据格式验证通过');
    }

    // 显示示例数据
    console.log('\n示例数据（前3条）:');
    locations.slice(0, 3).forEach((loc, index) => {
      console.log(`\n[${index + 1}] ${loc.name} (${loc.type})`);
      console.log('  字段:', Object.keys(loc).join(', '));
      console.log('  数据:', JSON.stringify(loc, null, 2).substring(0, 200) + '...');
    });

    // 询问是否保存
    console.log('\n' + '='.repeat(60));
    console.log('准备保存数据到数据库...');
    console.log(`将创建/更新 ${locations.length} 条记录`);
    console.log('='.repeat(60));

    // 批量保存数据
    console.log('\n开始保存数据...');
    let savedCount = 0;
    for (const location of locations) {
      const saved = await saveOrUpdateLocation(location, cityMap);
      if (saved) {
        savedCount++;
        if (savedCount % 10 === 0) {
          process.stdout.write('.');
        }
      }
    }

    console.log(`\n✓ 成功保存 ${savedCount} 条数据`);

    // 验证保存的数据
    console.log('\n验证保存的数据...');
    const savedLocations = await Location.find({ country: country.name }).limit(10);
    console.log(`✓ 数据库中已有 ${savedLocations.length} 条记录（显示前10条）`);
    
    savedLocations.forEach((loc, index) => {
      console.log(`\n[${index + 1}] ${loc.name} (${loc.type})`);
      console.log(`  ID: ${loc._id}`);
      console.log(`  ctripCityId: ${loc.ctripCityId || 'N/A'}`);
      console.log(`  ctripProvinceId: ${loc.ctripProvinceId || 'N/A'}`);
      console.log(`  corpTag: ${loc.corpTag}`);
      console.log(`  districtCode: ${loc.districtCode || 'N/A'}`);
      console.log(`  parentId: ${loc.parentId || 'N/A'}`);
    });

    // 输出统计
    console.log('\n' + '='.repeat(60));
    console.log('测试完成！统计:');
    console.log('='.repeat(60));
    console.log(`总数据: ${stats.totalLocations}`);
    console.log(`创建: ${stats.createdLocations}`);
    console.log(`更新: ${stats.updatedLocations}`);
    console.log(`跳过: ${stats.skippedLocations}`);

    if (stats.errors.length > 0) {
      console.log(`\n错误列表 (${stats.errors.length}):`);
      stats.errors.slice(0, 5).forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.location}: ${err.error}`);
      });
      if (stats.errors.length > 5) {
        console.log(`  ... 还有 ${stats.errors.length - 5} 个错误`);
      }
    }

    console.log('='.repeat(60));
    process.exit(0);
  } catch (error) {
    console.error('\n测试失败:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { main, convertPOIToLocations, validateLocationData };

