/**
 * 测试 organizeLocationsByHierarchy 函数是否会过滤掉 Tokyo
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

// 复制前端的 organizeLocationsByHierarchy 函数逻辑
function getMatchScore(location, keywordLower, precomputed) {
  const { nameLower, codeLower, pinyinLower, enNameLower } = precomputed;
  
  // 完全匹配（最高优先级）
  if (nameLower === keywordLower || 
      codeLower === keywordLower || 
      pinyinLower === keywordLower || 
      enNameLower === keywordLower) {
    return 100;
  }
  
  // 前缀匹配（高优先级）
  if (nameLower.startsWith(keywordLower) || 
      codeLower.startsWith(keywordLower) || 
      pinyinLower.startsWith(keywordLower) || 
      enNameLower.startsWith(keywordLower)) {
    return 80;
  }
  
  // 包含匹配（中等优先级）
  if (nameLower.includes(keywordLower) || 
      codeLower.includes(keywordLower) || 
      pinyinLower.includes(keywordLower) || 
      enNameLower.includes(keywordLower)) {
    return 60;
  }
  
  return 0;
}

function organizeLocationsByHierarchy(locations, searchKeyword = '') {
  if (!locations || locations.length === 0) {
    return [];
  }

  const result = [];
  const parentMap = new Map();
  const childrenMap = new Map();
  const independentItems = [];

  // 预计算搜索关键词的小写版本
  const keywordLower = searchKeyword ? searchKeyword.trim().toLowerCase() : '';
  
  // 预计算所有位置的小写字符串和匹配分数
  const locationMetadata = new Map();
  locations.forEach(location => {
    const precomputed = {
      nameLower: (location.name || '').toLowerCase(),
      codeLower: (location.code || '').toLowerCase(),
      pinyinLower: (location.pinyin || '').toLowerCase(),
      enNameLower: (location.enName || '').toLowerCase()
    };
    
    const metadata = {
      ...precomputed,
      matchScore: keywordLower ? getMatchScore(location, keywordLower, precomputed) : 0
    };
    locationMetadata.set(location.id || location._id, metadata);
  });

  // 第一步：收集所有城市
  const allCities = new Map();
  const cityNameMap = new Map();
  
  locations.forEach(location => {
    if (location.type === 'city') {
      const cityId = (location.id || location._id).toString();
      allCities.set(cityId, location);
      
      // 建立城市名称映射（用于匹配）
      const cityName = (location.name || '').trim().toLowerCase();
      if (cityName) {
        if (!cityNameMap.has(cityName)) {
          cityNameMap.set(cityName, []);
        }
        cityNameMap.get(cityName).push(cityId);
      }
    }
  });

  // 建立城市ID映射（处理不同的ID格式）
  const cityIdMapping = new Map();
  allCities.forEach((city, cityId) => {
    const idStr = cityId.toString();
    cityIdMapping.set(idStr, cityId);
    if (city._id) {
      cityIdMapping.set(city._id.toString(), cityId);
    }
    if (city.id) {
      cityIdMapping.set(city.id.toString(), cityId);
    }
  });

  // 建立城市名称+国家代码映射
  const cityNameCountryMap = new Map();
  allCities.forEach((city, cityId) => {
    const cityName = (city.name || '').trim().toLowerCase();
    const countryCode = (city.countryCode || '').trim().toUpperCase();
    const key = countryCode ? `${cityName}_${countryCode}` : cityName;
    if (!cityNameCountryMap.has(key)) {
      cityNameCountryMap.set(key, []);
    }
    cityNameCountryMap.get(key).push(cityId);
  });

  // 第二步：处理机场/火车站/汽车站
  locations.forEach(location => {
    if ((location.type === 'airport' || location.type === 'station' || location.type === 'bus') && location.parentId) {
      let parentId;
      if (typeof location.parentId === 'object') {
        parentId = location.parentId._id || location.parentId.id || location.parentId.toString();
      } else {
        parentId = location.parentId.toString();
      }
      
      if (parentId) {
        const parentIdStr = parentId.toString();
        let matchedCityId = cityIdMapping.get(parentIdStr);
        
        if (!matchedCityId && location.city) {
          const cityName = location.city.trim().toLowerCase();
          const countryCode = (location.countryCode || '').trim().toUpperCase();
          const key = countryCode ? `${cityName}_${countryCode}` : cityName;
          let matchingCityIds = cityNameCountryMap.get(key);
          
          if (!matchingCityIds || matchingCityIds.length === 0) {
            matchingCityIds = cityNameCountryMap.get(cityName);
          }
          
          if (matchingCityIds && matchingCityIds.length > 0) {
            if (matchingCityIds.length === 1) {
              matchedCityId = matchingCityIds[0];
            } else if (countryCode) {
              const cityWithCountryCode = matchingCityIds.find(id => {
                const city = allCities.get(id);
                return city && (city.countryCode || '').trim().toUpperCase() === countryCode;
              });
              matchedCityId = cityWithCountryCode || matchingCityIds[0];
            } else {
              matchedCityId = matchingCityIds[0];
            }
          }
        }
        
        if (matchedCityId) {
          if (!childrenMap.has(matchedCityId)) {
            childrenMap.set(matchedCityId, []);
          }
          childrenMap.get(matchedCityId).push(location);
        } else {
          independentItems.push(location);
        }
      } else {
        independentItems.push(location);
      }
    } else if (location.type === 'city') {
      // 城市类型的 location 会被添加到 parentMap
      const cityId = (location.id || location._id).toString();
      parentMap.set(cityId, location);
    } else {
      independentItems.push(location);
    }
  });

  // 第三步：按匹配分数排序城市
  const sortedCities = Array.from(parentMap.entries()).sort((a, b) => {
    const scoreA = locationMetadata.get(a[0])?.matchScore || 0;
    const scoreB = locationMetadata.get(b[0])?.matchScore || 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return (a[1].name || '').localeCompare(b[1].name || '');
  });

  // 第四步：构建结果（城市 + 子项）
  sortedCities.forEach(([cityId, city]) => {
    result.push(city);
    const children = childrenMap.get(cityId);
    if (children && children.length > 0) {
      children.forEach(child => result.push(child));
    }
  });

  // 第五步：添加独立的项目（机场/火车站等，没有匹配到城市的）
  const allTransportationItems = locations.filter(loc => 
    loc.type === 'airport' || loc.type === 'station' || loc.type === 'bus'
  );
  
  const addedAirportIds = new Set();
  sortedCities.forEach(([cityId, city]) => {
    const children = childrenMap.get(cityId);
    if (children) {
      children.forEach(child => {
        addedAirportIds.add((child.id || child._id).toString());
      });
    }
  });
  
  const remainingItems = allTransportationItems.filter(item => {
    const itemId = (item.id || item._id).toString();
    if (item.type === 'airport' && addedAirportIds.has(itemId)) {
      return false;
    }
    return true;
  });
  
  remainingItems.forEach(item => result.push(item));

  return result;
}

async function testOrganizeLocations() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    const searchTerm = 'Tokyo';
    
    console.log('='.repeat(80));
    console.log('测试 organizeLocationsByHierarchy 函数');
    console.log('='.repeat(80));
    console.log(`搜索词: ${searchTerm}\n`);
    
    // 1. 获取 Tokyo 数据（模拟前端接收到的数据）
    const tokyoData = await Location.findOne({ enName: 'Tokyo' }).lean();
    
    if (!tokyoData) {
      console.log('✗ 未找到 Tokyo 数据');
      return;
    }
    
    // 转换为前端格式
    const frontendData = {
      id: tokyoData._id.toString(),
      _id: tokyoData._id.toString(),
      name: tokyoData.name,
      code: tokyoData.code || '',
      type: tokyoData.type,
      city: tokyoData.city || tokyoData.name,
      province: tokyoData.province || '',
      district: tokyoData.district || '',
      county: tokyoData.county || '',
      country: tokyoData.country || '',
      countryCode: tokyoData.countryCode || '',
      enName: tokyoData.enName || '',
      pinyin: tokyoData.pinyin || '',
      coordinates: tokyoData.coordinates || { latitude: 0, longitude: 0 },
      timezone: tokyoData.timezone || 'Asia/Shanghai',
      status: tokyoData.status || 'active',
      parentId: tokyoData.parentId?.toString() || tokyoData.parentId || null,
      parentCity: tokyoData.parentCity || null,
      parentIdObj: tokyoData.parentIdObj || null,
      riskLevel: tokyoData.riskLevel || 'low',
      noAirport: tokyoData.noAirport || false
    };
    
    console.log('【1】前端数据格式:');
    console.log(JSON.stringify(frontendData, null, 2));
    
    // 2. 测试 organizeLocationsByHierarchy
    console.log('\n【2】测试 organizeLocationsByHierarchy');
    console.log('-'.repeat(80));
    
    const inputLocations = [frontendData];
    console.log(`输入数据数量: ${inputLocations.length}`);
    console.log(`输入数据类型: ${inputLocations[0].type}`);
    console.log(`输入数据 name: ${inputLocations[0].name}`);
    console.log(`输入数据 enName: ${inputLocations[0].enName}`);
    console.log(`输入数据 pinyin: ${inputLocations[0].pinyin}`);
    
    const organized = organizeLocationsByHierarchy(inputLocations, searchTerm);
    
    console.log(`\n输出数据数量: ${organized.length}`);
    
    if (organized.length === 0) {
      console.log('\n✗ organizeLocationsByHierarchy 返回空结果！');
      console.log('问题：Tokyo 被过滤掉了');
    } else {
      console.log('\n✓ organizeLocationsByHierarchy 返回结果');
      organized.forEach((loc, idx) => {
        console.log(`\n  [${idx + 1}] ${loc.name} (${loc.enName}, ${loc.pinyin})`);
        console.log(`      type: ${loc.type}`);
        console.log(`      id: ${loc.id || loc._id}`);
      });
    }
    
    // 3. 检查匹配分数
    console.log('\n【3】检查匹配分数');
    console.log('-'.repeat(80));
    
    const keywordLower = searchTerm.toLowerCase();
    const precomputed = {
      nameLower: (frontendData.name || '').toLowerCase(),
      codeLower: (frontendData.code || '').toLowerCase(),
      pinyinLower: (frontendData.pinyin || '').toLowerCase(),
      enNameLower: (frontendData.enName || '').toLowerCase()
    };
    
    const matchScore = getMatchScore(frontendData, keywordLower, precomputed);
    console.log(`keywordLower: "${keywordLower}"`);
    console.log(`nameLower: "${precomputed.nameLower}"`);
    console.log(`enNameLower: "${precomputed.enNameLower}"`);
    console.log(`pinyinLower: "${precomputed.pinyinLower}"`);
    console.log(`matchScore: ${matchScore}`);
    
    // 4. 检查城市处理逻辑
    console.log('\n【4】检查城市处理逻辑');
    console.log('-'.repeat(80));
    
    if (frontendData.type === 'city') {
      console.log('✓ Tokyo 是城市类型');
      console.log(`  id: ${frontendData.id}`);
      console.log(`  _id: ${frontendData._id}`);
      console.log('  应该被添加到 parentMap');
    }
    
    // 5. 总结
    console.log('\n【5】问题诊断总结');
    console.log('='.repeat(80));
    
    if (organized.length === 0) {
      console.log('✗ 发现问题：organizeLocationsByHierarchy 返回空结果');
      console.log('\n可能的原因：');
      console.log('1. 城市处理逻辑有问题');
      console.log('2. ID 格式不匹配');
      console.log('3. 数据格式不符合预期');
    } else {
      console.log('✓ organizeLocationsByHierarchy 正常工作');
      console.log('  问题可能在其他地方');
    }
    
    console.log('\n✓ 测试完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testOrganizeLocations();

