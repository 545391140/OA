/**
 * 测试同步地理位置数据脚本（使用模拟数据）
 * 用于测试数据格式是否正确，不依赖API
 * 
 * 使用方法：
 * node backend/scripts/testSyncLocationMock.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

// 统计信息
const stats = {
  totalLocations: 0,
  createdLocations: 0,
  updatedLocations: 0,
  skippedLocations: 0,
  errors: []
};

/**
 * 生成模拟的POI数据（基于携程API格式）
 */
function generateMockPOIData() {
  return {
    dataList: [
      {
        provinceId: 15,
        provinceName: '江苏',
        provinceEnName: 'Jiangsu',
        prefectureLevelCityInfoList: [
          {
            cityId: 82,
            cityName: '南通',
            cityEnName: 'Nantong',
            cityCode: '320600',
            cityPinYin: 'Nantong',
            districtCode: '320600',
            corpTag: 0,
            stationInfo: {
              airportList: [
                {
                  airportCode: 'NTG',
                  airportName: '兴东国际机场',
                  airportEnName: 'Xingdong International Airport',
                  airportTypeList: [],
                  airportBuildingList: []
                }
              ],
              trainStationList: [
                {
                  trainCode: 'NUH',
                  trainName: '南通',
                  trainEnName: 'Nantong'
                }
              ],
              busStationList: [
                {
                  busName: '南通东站',
                  busPinYinName: 'nantongdongzhan'
                }
              ]
            },
            countyList: [
              {
                countyId: 697,
                countyName: '启东',
                countyEnName: 'Qidong',
                countyCode: '320681',
                countyPinyin: 'Qidong',
                corpTag: 0
              }
            ],
            districtList: [
              {
                districtId: 624,
                districtName: '崇川区',
                districtEnName: 'Chongchuan District'
              }
            ]
          }
        ]
      }
    ]
  };
}

/**
 * 将POI数据转换为Location格式
 */
function convertPOIToLocations(poiData, countryInfo) {
  const locations = [];
  const { dataList } = poiData;

  if (!dataList || !Array.isArray(dataList)) {
    return locations;
  }

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
      locations.push(cityLocation);

      // 处理机场
      if (city.stationInfo?.airportList) {
        city.stationInfo.airportList.forEach((airport) => {
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

      // 处理火车站
      if (city.stationInfo?.trainStationList) {
        city.stationInfo.trainStationList.forEach((station) => {
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

      // 处理汽车站
      if (city.stationInfo?.busStationList) {
        city.stationInfo.busStationList.forEach((busStation) => {
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

      // 处理县级市
      if (city.countyList) {
        city.countyList.forEach((county) => {
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

      // 处理行政区
      if (city.districtList) {
        city.districtList.forEach((district) => {
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

  return { locations };
}

/**
 * 验证数据格式
 */
function validateLocationData(location) {
  const issues = [];
  
  if (!location.name) issues.push('缺少name字段');
  if (!location.type) issues.push('缺少type字段');
  
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
  
  if (location.ctripCityId !== undefined && typeof location.ctripCityId !== 'number') {
    issues.push(`ctripCityId应该是Number类型，当前是: ${typeof location.ctripCityId}`);
  }
  
  return issues;
}

/**
 * 保存或更新Location数据
 */
async function saveOrUpdateLocation(locationData) {
  try {
    const cleanData = { ...locationData };
    
    if (cleanData.code && typeof cleanData.code === 'string') {
      cleanData.code = cleanData.code.toUpperCase();
    }
    
    if (cleanData.countryCode && typeof cleanData.countryCode === 'string') {
      cleanData.countryCode = cleanData.countryCode.toUpperCase();
    }
    
    if (!cleanData.coordinates) {
      cleanData.coordinates = { latitude: 0, longitude: 0 };
    }
    
    if (!cleanData.timezone) {
      cleanData.timezone = cleanData.countryCode === 'CN' ? 'Asia/Shanghai' : 'UTC';
    }
    
    // 处理parentId关联
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
    
    if (!cleanData.status || !['active', 'inactive'].includes(cleanData.status)) {
      cleanData.status = 'active';
    }
    
    if (cleanData.corpTag === undefined || cleanData.corpTag === null) {
      cleanData.corpTag = 0;
    }
    
    // 构建查询条件
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
      Object.keys(cleanData).forEach(key => {
        if (cleanData[key] !== undefined && cleanData[key] !== null) {
          existingLocation[key] = cleanData[key];
        }
      });
      await existingLocation.save();
      stats.updatedLocations++;
      return existingLocation;
    } else {
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
 * 主函数
 */
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('测试同步地理位置数据（使用模拟数据）');
    console.log('='.repeat(60));

    // 连接数据库
    await connectDB();
    console.log('✓ 数据库连接成功');

    // 使用模拟数据
    const countryInfo = {
      countryId: 1,
      name: '中国',
      code: 'CN',
      enName: 'China'
    };

    console.log(`\n使用模拟数据 - 国家: ${countryInfo.name}`);
    
    const poiData = generateMockPOIData();
    console.log('✓ 生成模拟POI数据');

    // 转换数据格式
    const { locations } = convertPOIToLocations(poiData, countryInfo);
    stats.totalLocations = locations.length;
    
    console.log(`✓ 转换得到 ${locations.length} 条地理位置数据`);

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
      const sampleData = {
        name: loc.name,
        type: loc.type,
        code: loc.code,
        ctripCityId: loc.ctripCityId,
        ctripProvinceId: loc.ctripProvinceId,
        corpTag: loc.corpTag,
        districtCode: loc.districtCode
      };
      console.log('  关键字段:', JSON.stringify(sampleData, null, 2));
    });

    // 保存数据
    console.log('\n' + '='.repeat(60));
    console.log('开始保存数据到数据库...');
    console.log(`将创建/更新 ${locations.length} 条记录`);
    console.log('='.repeat(60));

    let savedCount = 0;
    for (const location of locations) {
      const saved = await saveOrUpdateLocation(location);
      if (saved) {
        savedCount++;
        process.stdout.write('.');
      }
    }

    console.log(`\n✓ 成功保存 ${savedCount} 条数据`);

    // 验证保存的数据
    console.log('\n验证保存的数据...');
    const savedLocations = await Location.find({ country: countryInfo.name }).limit(10);
    console.log(`✓ 数据库中已有 ${savedLocations.length} 条记录（显示前10条）`);
    
    savedLocations.forEach((loc, index) => {
      console.log(`\n[${index + 1}] ${loc.name} (${loc.type})`);
      console.log(`  _id: ${loc._id}`);
      console.log(`  code: ${loc.code}`);
      console.log(`  ctripCityId: ${loc.ctripCityId || 'N/A'}`);
      console.log(`  ctripProvinceId: ${loc.ctripProvinceId || 'N/A'}`);
      console.log(`  ctripCountyId: ${loc.ctripCountyId || 'N/A'}`);
      console.log(`  ctripDistrictId: ${loc.ctripDistrictId || 'N/A'}`);
      console.log(`  corpTag: ${loc.corpTag}`);
      console.log(`  districtCode: ${loc.districtCode || 'N/A'}`);
      console.log(`  parentId: ${loc.parentId || 'N/A'}`);
    });

    // 测试查询新字段
    console.log('\n' + '='.repeat(60));
    console.log('测试新字段查询功能:');
    console.log('='.repeat(60));
    
    // 测试1: 按ctripCityId查询
    const cityByCtripId = await Location.findOne({ ctripCityId: 82, type: 'city' });
    if (cityByCtripId) {
      console.log('✓ 按ctripCityId查询成功:', cityByCtripId.name);
    }
    
    // 测试2: 按corpTag过滤
    const standardCities = await Location.find({ corpTag: 0, type: 'city' });
    console.log(`✓ 查询标准城市（corpTag=0）: ${standardCities.length} 条`);
    
    // 测试3: 按districtCode查询
    const citiesByDistrictCode = await Location.find({ districtCode: '320600' });
    console.log(`✓ 按districtCode查询: ${citiesByDistrictCode.length} 条`);

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
      stats.errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.location}: ${err.error}`);
      });
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

