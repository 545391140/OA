/**
 * 同步全球地理位置数据脚本
 * 从携程API获取所有国家的POI数据并保存到数据库
 * 
 * 使用方法：
 * node backend/scripts/syncGlobalLocations.js [选项]
 * 
 * 选项：
 *   --full         全量同步（默认）
 *   --incremental  增量同步（从上次同步时间开始）
 *   --start-date   指定开始日期（格式：YYYY-MM-DD）
 *   --country-id   指定国家ID（默认：只同步中国）
 *   --all          同步所有国家（全球同步）
 * 
 * 环境变量：
 * CTRIP_USE_TEST_ENV=true - 强制使用测试环境
 * 
 * 示例：
 *   # 全量同步中国数据（默认）
 *   node backend/scripts/syncGlobalLocations.js
 *   
 *   # 增量同步中国数据（从上次同步时间开始）
 *   node backend/scripts/syncGlobalLocations.js --incremental
 *   
 *   # 从指定日期开始同步中国数据
 *   node backend/scripts/syncGlobalLocations.js --start-date 2025-11-01
 *   
 *   # 同步指定国家（例如：美国）
 *   node backend/scripts/syncGlobalLocations.js --country-id 2
 *   
 *   # 同步所有国家（全球同步）
 *   node backend/scripts/syncGlobalLocations.js --all
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');
const ctripApiService = require('../services/ctripApiService');
const fs = require('fs');
const path = require('path');

// 默认使用生产环境（已修改为默认使用生产环境）
// 如需使用测试环境，请设置: process.env.CTRIP_USE_TEST_ENV = 'true';
// process.env.CTRIP_USE_TEST_ENV = 'true';

// 同步状态文件路径
const SYNC_STATUS_FILE = path.join(__dirname, '../.sync_status.json');

// 统计信息
const stats = {
  totalCountries: 0,
  processedCountries: 0,
  successCountries: 0,
  failedCountries: 0,
  totalLocations: 0,
  createdLocations: 0,
  skippedLocations: 0,
  errors: [],
  syncMode: 'full', // 'full' 或 'incremental'
  startDate: null, // 增量同步的开始日期
};

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    full: false,
    incremental: false,
    startDate: null,
    countryId: null,
    all: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--full') {
      options.full = true;
    } else if (arg === '--incremental') {
      options.incremental = true;
    } else if (arg === '--start-date' && i + 1 < args.length) {
      options.startDate = args[++i];
    } else if (arg === '--country-id' && i + 1 < args.length) {
      options.countryId = parseInt(args[++i], 10);
    } else if (arg === '--all') {
      options.all = true;
    }
  }

  return options;
}

/**
 * 读取上次同步时间
 */
function getLastSyncTime() {
  try {
    if (fs.existsSync(SYNC_STATUS_FILE)) {
      const data = fs.readFileSync(SYNC_STATUS_FILE, 'utf8');
      const status = JSON.parse(data);
      return status.lastSyncTime ? new Date(status.lastSyncTime) : null;
    }
  } catch (error) {
    console.warn('读取同步状态文件失败:', error.message);
  }
  return null;
}

/**
 * 保存同步时间
 */
function saveSyncTime() {
  try {
    const status = {
      lastSyncTime: new Date().toISOString(),
      syncMode: stats.syncMode,
      startDate: stats.startDate,
    };
    fs.writeFileSync(SYNC_STATUS_FILE, JSON.stringify(status, null, 2), 'utf8');
    console.log(`\n✓ 同步时间已保存: ${status.lastSyncTime}`);
  } catch (error) {
    console.warn('保存同步状态文件失败:', error.message);
  }
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 调整日期以满足API要求（startDate必须是1-15天前）
 * API要求：startTime must be between 1 and 15 days ago
 */
function adjustStartDate(dateString) {
  if (!dateString) return null;
  
  const targetDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 设置为今天的开始时间
  
  const diffDays = Math.floor((today - targetDate) / (1000 * 60 * 60 * 24));
  
  // 如果日期是今天或未来，调整为15天前
  if (diffDays <= 0) {
    const adjustedDate = new Date(today);
    adjustedDate.setDate(adjustedDate.getDate() - 15);
    console.log(`  ⚠ 日期调整为15天前（API要求：1-15天前）`);
    return formatDate(adjustedDate);
  }
  
  // 如果日期超过15天前，调整为15天前
  if (diffDays > 15) {
    const adjustedDate = new Date(today);
    adjustedDate.setDate(adjustedDate.getDate() - 15);
    console.log(`  ⚠ 日期调整为15天前（API要求：最多15天前）`);
    return formatDate(adjustedDate);
  }
  
  // 如果日期少于1天前，调整为1天前
  if (diffDays < 1) {
    const adjustedDate = new Date(today);
    adjustedDate.setDate(adjustedDate.getDate() - 1);
    console.log(`  ⚠ 日期调整为1天前（API要求：至少1天前）`);
    return formatDate(adjustedDate);
  }
  
  // 日期在1-15天范围内，直接返回
  return dateString;
}

/**
 * 验证日期格式
 */
function validateDate(dateString) {
  if (!dateString) return null;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    throw new Error(`日期格式错误，应为 YYYY-MM-DD: ${dateString}`);
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`无效的日期: ${dateString}`);
  }
  return dateString;
}

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
    // 添加省份信息（跳过没有名称的省份）
    if (!province.provinceName || province.provinceName.trim() === '') {
      return; // 跳过无效省份
    }
    
    const provinceLocation = {
      name: province.provinceName.trim(),
      code: province.provinceId?.toString(),
      type: 'province',
      province: province.provinceName.trim(),
      country: countryInfo.name,
      countryCode: countryInfo.code,
      enName: province.provinceEnName,
      status: 'active',
      coordinates: { latitude: 0, longitude: 0 }, // 默认坐标
      timezone: countryInfo.code === 'CN' ? 'Asia/Shanghai' : 'UTC', // 根据国家设置时区
      ctripProvinceId: province.provinceId, // 携程省份ID
    };
    locations.push(provinceLocation);

    // 处理地级市
    if (!province.prefectureLevelCityInfoList || province.prefectureLevelCityInfoList.length === 0) {
      // 如果没有地级市数据，输出警告（仅在调试时有用）
      if (process.env.DEBUG_SYNC === 'true') {
        console.warn(`  警告: 省份 "${province.provinceName}" 没有地级市数据`);
      }
    } else {
      province.prefectureLevelCityInfoList.forEach((city) => {
        // 跳过没有名称的城市
        if (!city.cityName || city.cityName.trim() === '') {
          return;
        }
      
      // 添加城市信息（地级市）
      const cityCode = city.cityCode || city.cityId?.toString();
      const cityLocation = {
        name: city.cityName.trim(),
        code: cityCode || '',
        type: 'city',
        city: city.cityName || '',
        province: province.provinceName || '',
        country: countryInfo.name || '中国',
        countryCode: countryInfo.code || 'CN',
        enName: city.cityEnName || '',
        pinyin: city.cityPinYin || '',
        district: null, // 城市类型（地级市），区字段应为空
        county: null, // 城市类型（地级市），县字段应为空
        cityLevel: 4, // 默认4级，需要根据实际情况设置
        status: 'active',
        coordinates: { latitude: 0, longitude: 0 }, // 默认坐标
        timezone: countryInfo.code === 'CN' ? 'Asia/Shanghai' : 'UTC', // 根据国家设置时区
        riskLevel: 'low', // 默认风险等级
        noAirport: false, // 默认有机场
        parentId: null, // 城市类型，所属城市字段应为空
        ctripCityId: city.cityId || null, // 携程城市ID
        ctripProvinceId: province.provinceId || null, // 携程省份ID
        ctripCountyId: null, // 地级市没有县级市ID
        ctripDistrictId: null, // 地级市没有行政区ID
        corpTag: city.corpTag || 0, // 非标城市标识：0:标准城市, 1:非标城市
        districtCode: cityCode || '', // 行政区划代码 = 城市代码
        remark: city.corpTag === 1 ? '非标城市，仅用于机票预订' : '',
      };

      const cityKey = `${countryInfo.code}_${city.cityId}`;
      cityMap.set(cityKey, cityLocation);
      locations.push(cityLocation);

      // 处理机场
      if (city.stationInfo?.airportList) {
        city.stationInfo.airportList.forEach((airport) => {
          // 过滤无效机场
          const airportTypes = airport.airportTypeList || [];
          if (airportTypes.includes('2') || airportTypes.includes('3')) {
            // 2: 无效废弃机场, 3: 火车站/停机坪/城市等
            return;
          }

          // 跳过没有名称的机场
          if (!airport.airportName || airport.airportName.trim() === '') {
            return;
          }
          
          locations.push({
            name: airport.airportName.trim(),
            code: airport.airportCode,
            type: 'airport',
            city: city.cityName,
            province: province.provinceName,
            country: countryInfo.name,
            countryCode: countryInfo.code,
            enName: airport.airportEnName,
            parentId: null, // 将在保存时关联到城市
            status: 'active',
            coordinates: { latitude: 0, longitude: 0 }, // 默认坐标
            timezone: countryInfo.code === 'CN' ? 'Asia/Shanghai' : 'UTC', // 根据国家设置时区
            ctripCityId: city.cityId, // 携程城市ID（用于关联）
            ctripProvinceId: province.provinceId, // 携程省份ID
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
          // 跳过没有名称的火车站
          if (!station.trainName || station.trainName.trim() === '') {
            return;
          }
          
          locations.push({
            name: station.trainName.trim(),
            code: station.trainCode,
            type: 'station',
            city: city.cityName,
            province: province.provinceName,
            country: countryInfo.name,
            countryCode: countryInfo.code,
            enName: station.trainEnName,
            parentId: null, // 将在保存时关联到城市
            status: 'active',
            coordinates: { latitude: 0, longitude: 0 }, // 默认坐标
            timezone: countryInfo.code === 'CN' ? 'Asia/Shanghai' : 'UTC', // 根据国家设置时区
            ctripCityId: city.cityId, // 携程城市ID（用于关联）
            ctripProvinceId: province.provinceId, // 携程省份ID
          });
        });
      }

      // 处理汽车站
      if (city.stationInfo?.busStationList) {
        city.stationInfo.busStationList.forEach((busStation) => {
          // 跳过没有名称的汽车站
          if (!busStation.busName || busStation.busName.trim() === '') {
            return;
          }
          
          locations.push({
            name: busStation.busName.trim(),
            code: busStation.busPinYinName,
            type: 'bus',
            city: city.cityName,
            province: province.provinceName,
            country: countryInfo.name,
            countryCode: countryInfo.code,
            pinyin: busStation.busPinYinName,
            parentId: null, // 将在保存时关联到城市
            status: 'active',
            coordinates: { latitude: 0, longitude: 0 }, // 默认坐标
            timezone: countryInfo.code === 'CN' ? 'Asia/Shanghai' : 'UTC', // 根据国家设置时区
            ctripCityId: city.cityId, // 携程城市ID（用于关联）
            ctripProvinceId: province.provinceId, // 携程省份ID
          });
        });
      }

      // 处理县级市
      if (city.countyList) {
        city.countyList.forEach((county) => {
          // 跳过没有名称的县级市
          if (!county.countyName || county.countyName.trim() === '') {
            return;
          }
          
          const countyCode = county.countyCode || county.countyId?.toString();
          locations.push({
            name: county.countyName.trim(),
            code: countyCode || '',
            type: 'city',
            city: city.cityName || '', // 修复：使用地级市名称，而不是县级市名称
            province: province.provinceName || '',
            country: countryInfo.name || '中国',
            countryCode: countryInfo.code || 'CN',
            enName: county.countyEnName || '',
            pinyin: county.countyPinyin || '',
            district: null, // 城市类型（县级市），区字段应为空
            county: county.countyName || '', // 县级市名称
            cityLevel: 4,
            status: 'active',
            coordinates: { latitude: 0, longitude: 0 }, // 默认坐标
            timezone: countryInfo.code === 'CN' ? 'Asia/Shanghai' : 'UTC', // 根据国家设置时区
            riskLevel: 'low', // 默认风险等级
            noAirport: false, // 默认有机场
            parentId: null, // 城市类型，所属城市字段应为空
            ctripCountyId: county.countyId || null, // 携程县级市ID
            ctripCityId: city.cityId || null, // 关联的地级市ID
            ctripProvinceId: province.provinceId || null, // 携程省份ID
            ctripDistrictId: null, // 县级市没有行政区ID
            corpTag: county.corpTag || 0, // 非标城市标识：0:标准城市, 1:非标城市
            districtCode: countyCode || '', // 行政区划代码 = 县级市代码
            remark: county.corpTag === 1 ? '非标城市，仅用于机票预订' : '',
          });
        });
      }

      // 不再处理行政区（districtList），城市只保存到县级市级别
      });
    }
  });

  return { locations, cityMap };
}

/**
 * 保存或更新Location数据
 */
async function saveOrUpdateLocation(locationData, cityMap) {
  try {
    // 数据格式化和清理
    const cleanData = { ...locationData };
    
    // 0. 验证必需字段 name（模型要求必填）
    if (!cleanData.name || typeof cleanData.name !== 'string' || cleanData.name.trim() === '') {
      // 尝试从其他字段获取名称
      if (cleanData.enName && cleanData.enName.trim() !== '') {
        cleanData.name = cleanData.enName.trim();
      } else if (cleanData.city && cleanData.city.trim() !== '') {
        cleanData.name = cleanData.city.trim();
      } else if (cleanData.province && cleanData.province.trim() !== '') {
        cleanData.name = cleanData.province.trim();
      } else if (cleanData.code && cleanData.code.trim() !== '') {
        cleanData.name = `Location-${cleanData.code}`;
      } else {
        // 如果所有字段都为空，跳过这条数据
        console.warn(`跳过无效数据: type=${cleanData.type}, 缺少name字段`);
        stats.skippedLocations++;
        return null;
      }
    }
    
    // 确保name字段去除首尾空格
    cleanData.name = cleanData.name.trim();
    
    // 对于城市类型，确保所有字段都有值（没有值的设为null或空字符串）
    if (cleanData.type === 'city') {
      cleanData.code = cleanData.code || '';
      cleanData.city = cleanData.city || '';
      cleanData.province = cleanData.province || '';
      cleanData.country = cleanData.country || '中国';
      cleanData.countryCode = cleanData.countryCode || 'CN';
      cleanData.enName = cleanData.enName || '';
      cleanData.pinyin = cleanData.pinyin || '';
      cleanData.district = cleanData.district || null; // 城市类型，区字段应为空
      cleanData.county = cleanData.county || null; // 地级市没有县字段，县级市有县字段
      cleanData.parentId = cleanData.parentId || null; // 城市类型，所属城市字段应为空
      cleanData.ctripCityId = cleanData.ctripCityId || null;
      cleanData.ctripProvinceId = cleanData.ctripProvinceId || null;
      cleanData.ctripCountyId = cleanData.ctripCountyId || null;
      cleanData.ctripDistrictId = cleanData.ctripDistrictId || null;
      cleanData.districtCode = cleanData.districtCode || '';
      cleanData.remark = cleanData.remark || '';
    }
    
    // 1. code字段转换为大写（模型要求uppercase）
    if (cleanData.code && typeof cleanData.code === 'string') {
      cleanData.code = cleanData.code.toUpperCase();
    }
    
    // 2. countryCode转换为大写（模型要求uppercase）
    if (cleanData.countryCode && typeof cleanData.countryCode === 'string') {
      cleanData.countryCode = cleanData.countryCode.toUpperCase();
    }
    
    // 3. 确保coordinates字段存在（即使为默认值）
    if (!cleanData.coordinates) {
      cleanData.coordinates = {
        latitude: 0,
        longitude: 0
      };
    }
    
    // 4. 确保timezone字段存在（根据国家设置默认值）
    if (!cleanData.timezone) {
      // 根据国家设置默认时区
      if (cleanData.country === '中国' || cleanData.countryCode === 'CN') {
        cleanData.timezone = 'Asia/Shanghai';
      } else {
        cleanData.timezone = 'UTC'; // 其他国家的默认时区，后续可以根据需要完善
      }
    }
    
    // 5. 处理parentId关联（机场、火车站、汽车站关联到城市）
    if ((cleanData.type === 'airport' || cleanData.type === 'station' || cleanData.type === 'bus') 
        && cleanData.ctripCityId) {
      // 优先使用ctripCityId查找对应的城市Location
      const cityLocation = await Location.findOne({
        type: 'city',
        ctripCityId: cleanData.ctripCityId,
        country: cleanData.country
      });
      
      if (cityLocation) {
        cleanData.parentId = cityLocation._id;
      } else if (cleanData.city && cleanData.countryCode) {
        // 降级：使用城市名称查找
        const cityLocationByName = await Location.findOne({
          type: 'city',
          city: cleanData.city,
          country: cleanData.country,
          countryCode: cleanData.countryCode
        });
        if (cityLocationByName) {
          cleanData.parentId = cityLocationByName._id;
        } else {
          cleanData.parentId = null;
        }
      } else {
        cleanData.parentId = null;
      }
    } else {
      // 非机场/火车站/汽车站类型，parentId设为null
      cleanData.parentId = cleanData.parentId || null;
    }
    
    // 6. 确保status字段有效
    if (!cleanData.status || !['active', 'inactive'].includes(cleanData.status)) {
      cleanData.status = 'active';
    }
    
    // 7. 确保corpTag字段有效
    if (cleanData.corpTag === undefined || cleanData.corpTag === null) {
      cleanData.corpTag = 0; // 默认为标准城市
    }
    
    // 构建查询条件：优先使用携程ID，降级使用code和name
    const query = {
      type: cleanData.type,
      country: cleanData.country,
    };

    // 优先使用携程ID查询（更准确）
    // 注意：县级市也有ctripCityId（关联的地级市ID），所以需要优先使用ctripCountyId
    if (cleanData.type === 'city' && cleanData.ctripCountyId) {
      // 县级市：优先使用ctripCountyId（唯一标识）
      query.ctripCountyId = cleanData.ctripCountyId;
    } else if (cleanData.type === 'city' && cleanData.ctripCityId && !cleanData.ctripCountyId) {
      // 地级市：使用ctripCityId，但必须确保ctripCountyId为null（避免匹配到县级市）
      query.ctripCityId = cleanData.ctripCityId;
      query.ctripCountyId = null; // 确保是地级市，不是县级市
    } else if (cleanData.type === 'province' && cleanData.ctripProvinceId) {
      query.ctripProvinceId = cleanData.ctripProvinceId;
    } else if (cleanData.type === 'city' && cleanData.ctripDistrictId) {
      query.ctripDistrictId = cleanData.ctripDistrictId;
    } else if (cleanData.code) {
      // 降级：使用code查询
      query.code = cleanData.code.toUpperCase();
    } else {
      // 最后降级：使用name查询
      query.name = cleanData.name;
      if (cleanData.city) {
        query.city = cleanData.city;
      }
    }

    const existingLocation = await Location.findOne(query);

    if (existingLocation) {
      // 对于城市类型的数据，完全替换所有字段
      if (cleanData.type === 'city') {
        // 完全替换：删除旧记录，创建新记录
        await Location.deleteOne({ _id: existingLocation._id });
        const newLocation = await Location.create(cleanData);
        stats.createdLocations++; // 统计为更新
        console.log(`  ✓ 替换城市数据: ${cleanData.name} (${cleanData.city || ''})`);
        return newLocation;
      } else {
        // 非城市类型的数据，检查是否需要更新city字段（修复之前同步的错误数据）
        // 对于县级市和行政区，如果city字段不正确，需要更新
        const needsUpdate = 
          ((cleanData.ctripCountyId || cleanData.ctripDistrictId) &&
           existingLocation.city !== cleanData.city);
        
        if (needsUpdate) {
          // 更新city字段以修复错误数据
          existingLocation.city = cleanData.city;
          await existingLocation.save();
          console.log(`  ✓ 更新 ${cleanData.name} 的city字段: "${existingLocation.city}" -> "${cleanData.city}"`);
          return existingLocation;
        } else {
          // 数据已存在且正确，跳过写入（不更新，不创建）
          stats.skippedLocations++;
          return existingLocation;
        }
      }
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
 * 处理单个国家的数据
 */
async function processCountry(country, startDate = null) {
  try {
    console.log(`\n处理国家: ${country.name} (ID: ${country.countryId})`);
    if (startDate) {
      console.log(`  增量同步模式，开始日期: ${startDate}`);
    } else {
      console.log(`  全量同步模式`);
    }
    stats.processedCountries++;

    // 首先创建或更新国家类型的记录
    const countryLocation = {
      name: country.name,
      code: country.code || country.countryId?.toString(),
      type: 'country',
      country: country.name,
      countryCode: country.code,
      enName: country.enName || country.name,
      status: 'active',
      coordinates: { latitude: 0, longitude: 0 }, // 默认坐标，后续可以从API获取
      timezone: country.code === 'CN' ? 'Asia/Shanghai' : 'UTC',
    };
    
    // 保存国家记录
    const countryQuery = {
      type: 'country',
      country: country.name
    };
    const existingCountry = await Location.findOne(countryQuery);
    if (existingCountry) {
      // 国家记录已存在，跳过写入（不更新，不创建）
      console.log(`  国家 "${country.name}" 已存在，跳过`);
    } else {
      // 创建新国家记录
      await Location.create(countryLocation);
      stats.createdLocations++;
    }

    // 构建POI查询参数
    const poiOptions = {
      countryId: country.countryId,
      returnDistrict: true,
      returnCounty: true,
      returnAirport: true,
      returnTrainStation: true,
      returnBusStation: true,
    };

    // 如果是增量同步，添加startDate参数
    if (startDate) {
      poiOptions.startDate = startDate;
      console.log(`  使用增量查询，开始日期: ${startDate}`);
    }

    // 获取该国家的POI数据
    const poiData = await ctripApiService.getAllPOIInfo(poiOptions);

    // 调试：检查API返回的数据结构
    if (poiData.dataList && poiData.dataList.length > 0) {
      const firstProvince = poiData.dataList[0];
      const cityCount = firstProvince.prefectureLevelCityInfoList?.length || 0;
      console.log(`  调试信息: 第一个省份 "${firstProvince.provinceName}" 包含 ${cityCount} 个地级市`);
      if (cityCount === 0 && !startDate) {
        console.warn(`  ⚠ 警告: 全量同步模式下未获取到地级市数据，请检查API返回`);
      }
    }

    // 转换数据格式
    const { locations, cityMap } = convertPOIToLocations(poiData, country);
    stats.totalLocations += locations.length;

    // 统计各类数据的数量
    const typeStats = {
      country: 0,
      province: 0,
      city: 0,
      airport: 0,
      station: 0,
      bus: 0
    };
    locations.forEach(loc => {
      if (typeStats.hasOwnProperty(loc.type)) {
        typeStats[loc.type]++;
      }
    });

    console.log(`  获取到 ${locations.length} 条地理位置数据`);
    console.log(`  数据分类统计: 国家=${typeStats.country}, 省份=${typeStats.province}, 城市=${typeStats.city}, 机场=${typeStats.airport}, 火车站=${typeStats.station}, 汽车站=${typeStats.bus}`);

    // 批量保存数据
    let savedCount = 0;
    for (const location of locations) {
      const saved = await saveOrUpdateLocation(location, cityMap);
      if (saved) {
        savedCount++;
      }
      // 每100条输出一次进度
      if (savedCount % 100 === 0) {
        process.stdout.write('.');
      }
    }

    console.log(`\n  ✓ 成功保存 ${savedCount} 条数据`);
    stats.successCountries++;

    // 处理失效的地理信息
    if (poiData.invalidGeoList && poiData.invalidGeoList.length > 0) {
      console.log(`  ⚠ 发现 ${poiData.invalidGeoList.length} 条失效的地理信息`);
      // 可以在这里处理失效数据，例如标记为inactive
    }

    return true;
  } catch (error) {
    console.error(`\n  ✗ 处理国家失败 [${country.name}]:`, error.message);
    stats.failedCountries++;
    stats.errors.push({
      country: country.name,
      error: error.message
    });
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    // 解析命令行参数
    const options = parseArgs();
    
    // 确定同步模式
    if (options.incremental) {
      stats.syncMode = 'incremental';
      // 如果指定了开始日期，使用指定的日期
      if (options.startDate) {
        const validatedDate = validateDate(options.startDate);
        stats.startDate = adjustStartDate(validatedDate);
      } else {
        // 否则从上次同步时间开始
        const lastSyncTime = getLastSyncTime();
        if (lastSyncTime) {
          const formattedDate = formatDate(lastSyncTime);
          stats.startDate = adjustStartDate(formattedDate);
          console.log(`上次同步时间: ${lastSyncTime.toISOString()}`);
          if (stats.startDate !== formattedDate) {
            console.log(`调整后的开始日期: ${stats.startDate}`);
          }
        } else {
          console.log('⚠ 未找到上次同步时间，将进行全量同步');
          stats.syncMode = 'full';
        }
      }
    } else if (options.startDate) {
      // 指定了开始日期，使用增量模式
      stats.syncMode = 'incremental';
      const validatedDate = validateDate(options.startDate);
      stats.startDate = adjustStartDate(validatedDate);
    } else {
      stats.syncMode = 'full';
    }

    console.log('='.repeat(60));
    console.log('开始同步全球地理位置数据');
    console.log('='.repeat(60));
    console.log(`同步模式: ${stats.syncMode === 'incremental' ? '增量同步' : '全量同步'}`);
    if (stats.startDate) {
      console.log(`开始日期: ${stats.startDate}`);
    }
    console.log(`使用环境: ${process.env.CTRIP_USE_TEST_ENV === 'true' ? '测试环境' : '生产环境'}`);
    console.log(`API地址: 已配置`);

    // 连接数据库
    await connectDB();
    console.log('✓ 数据库连接成功');

    // 获取国家列表
    console.log('\n获取国家列表...');
    const allCountries = await ctripApiService.getAllCountries('zh-CN');
    console.log(`✓ 获取到 ${allCountries.length} 个国家`);
    
    // 确定要同步的国家
    let countries;
    if (options.countryId) {
      // 指定了国家ID
      const country = allCountries.find(c => c.countryId === options.countryId);
      if (!country) {
        throw new Error(`未找到国家ID为 ${options.countryId} 的数据`);
      }
      countries = [country];
      console.log(`✓ 将同步指定国家: ${country.name} (ID: ${country.countryId})`);
    } else if (options.all) {
      // 同步所有国家
      countries = allCountries;
      console.log(`✓ 将同步所有国家 (共 ${countries.length} 个国家)`);
    } else {
      // 默认只同步中国
      const china = allCountries.find(c => 
        c.countryId === 1 || c.code === 'CN' || c.name === '中国' || c.name === 'China'
      );
      
      if (china) {
        countries = [china];
        console.log(`✓ 将同步中国数据 (ID: ${china.countryId})`);
        console.log(`  提示: 如需同步所有国家，请使用 --all 参数`);
        console.log(`  提示: 如需同步其他国家，请使用 --country-id 参数`);
      } else {
        throw new Error('未找到中国数据，请检查国家列表');
      }
    }
    
    stats.totalCountries = countries.length;

    // 处理数据
    console.log(`\n开始处理${stats.syncMode === 'incremental' ? '增量' : '全量'}数据...`);
    for (let i = 0; i < countries.length; i++) {
      const country = countries[i];
      console.log(`\n[${i + 1}/${countries.length}]`);
      await processCountry(country, stats.startDate);

      // 每处理10个国家，输出一次统计
      if ((i + 1) % 10 === 0) {
        console.log('\n' + '='.repeat(60));
        console.log('当前统计:');
        console.log(`  已处理: ${stats.processedCountries}/${stats.totalCountries}`);
        console.log(`  成功: ${stats.successCountries}, 失败: ${stats.failedCountries}`);
        console.log(`  总数据: ${stats.totalLocations}, 创建: ${stats.createdLocations}, 跳过: ${stats.skippedLocations}`);
        console.log('='.repeat(60));
      }

      // 避免请求过快，每个国家之间延迟1秒
      if (i < countries.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 输出最终统计
    console.log('\n' + '='.repeat(60));
    console.log('同步完成！最终统计:');
    console.log('='.repeat(60));
    console.log(`总国家数: ${stats.totalCountries}`);
    console.log(`处理国家数: ${stats.processedCountries}`);
    console.log(`成功: ${stats.successCountries}`);
    console.log(`失败: ${stats.failedCountries}`);
    console.log(`总地理位置数据: ${stats.totalLocations}`);
    console.log(`创建: ${stats.createdLocations}`);
    console.log(`跳过: ${stats.skippedLocations}`);

    if (stats.errors.length > 0) {
      console.log(`\n错误列表 (${stats.errors.length}):`);
      stats.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.country || err.location}: ${err.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`  ... 还有 ${stats.errors.length - 10} 个错误`);
      }
    }

    // 保存同步时间
    saveSyncTime();

    console.log('='.repeat(60));
    process.exit(0);
  } catch (error) {
    console.error('\n同步失败:', error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { main, processCountry, convertPOIToLocations };

