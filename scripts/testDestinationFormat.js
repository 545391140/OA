/**
 * 测试目的地数据格式和自动判断逻辑
 * 验证 extractCountryFromLocation 和 determineTripType 函数能正确处理各种数据格式
 */

// 模拟 extractCountryFromLocation 函数
function extractCountryFromLocation(location) {
  if (!location) {
    console.log('[extractCountryFromLocation] No location provided');
    return null;
  }
  
  console.log('[extractCountryFromLocation] Input:', JSON.stringify(location), 'Type:', typeof location);
  
  if (typeof location === 'string') {
    // 如果是字符串格式 "城市, 国家"
    const parts = location.split(',');
    if (parts.length >= 2) {
      const country = parts[parts.length - 1].trim(); // 取最后一部分作为国家
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
    
    // 尝试从其他可能的字段提取
    if (location.name && location.type !== 'country') {
      // 可能是城市对象，尝试从 countryCode 或其他字段推断
      // 但这里我们主要依赖 country 字段
      console.log('[extractCountryFromLocation] Object has name but no country field, name:', location.name);
    }
  }
  
  console.log('[extractCountryFromLocation] Could not extract country, returning null');
  return null;
}

// 模拟 determineTripType 函数
function determineTripType(userResidenceCountry, destinations) {
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
    console.log('[determineTripType] Destination:', JSON.stringify(dest), '-> Country:', destCountry);
    if (destCountry && destCountry !== residenceCountryName) {
      // 找到非常驻国的目的地，返回跨境
      console.log('[determineTripType] Found cross-border destination:', destCountry, '!=', residenceCountryName);
      return 'cross_border';
    }
  }

  // 所有目的地都在常驻国，返回境内
  console.log('[determineTripType] All destinations in residence country, returning domestic');
  return 'domestic';
}

// 测试用例
console.log('='.repeat(80));
console.log('测试目的地数据格式和自动判断逻辑');
console.log('='.repeat(80));

// 测试用例1: RegionSelector 返回的标准对象格式
console.log('\n【测试用例1】RegionSelector 返回的标准对象格式');
const location1 = {
  id: '507f1f77bcf86cd799439011',
  _id: '507f1f77bcf86cd799439011',
  name: '北京',
  code: 'PEK',
  type: 'city',
  city: '北京',
  province: '北京',
  country: '中国',
  countryCode: 'CN',
  enName: 'Beijing',
  pinyin: 'beijing'
};
const country1 = extractCountryFromLocation(location1);
console.log('✅ 提取的国家:', country1);
console.assert(country1 === '中国', '应该提取到"中国"');

// 测试用例2: 字符串格式 "城市, 国家"
console.log('\n【测试用例2】字符串格式 "城市, 国家"');
const location2 = '北京, 中国';
const country2 = extractCountryFromLocation(location2);
console.log('✅ 提取的国家:', country2);
console.assert(country2 === '中国', '应该提取到"中国"');

// 测试用例3: 字符串格式（英文）
console.log('\n【测试用例3】字符串格式（英文）');
const location3 = 'New York, United States';
const country3 = extractCountryFromLocation(location3);
console.log('✅ 提取的国家:', country3);
console.assert(country3 === 'United States', '应该提取到"United States"');

// 测试用例4: 对象格式但 country 字段缺失
console.log('\n【测试用例4】对象格式但 country 字段缺失');
const location4 = {
  id: '507f1f77bcf86cd799439012',
  name: '上海',
  type: 'city',
  city: '上海'
};
const country4 = extractCountryFromLocation(location4);
console.log('⚠️  提取的国家:', country4);
console.assert(country4 === null, '应该返回 null（因为缺少 country 字段）');

// 测试用例5: 对象格式，country 是对象
console.log('\n【测试用例5】对象格式，country 是对象');
const location5 = {
  id: '507f1f77bcf86cd799439013',
  name: '东京',
  type: 'city',
  country: {
    name: '日本',
    code: 'JP'
  }
};
const country5 = extractCountryFromLocation(location5);
console.log('✅ 提取的国家:', country5);
console.assert(country5 === '日本', '应该提取到"日本"');

// 测试用例6: 自动判断 - 境内行程
console.log('\n【测试用例6】自动判断 - 境内行程');
const userResidence1 = '中国';
const destinations1 = {
  outbound: {
    name: '北京',
    country: '中国'
  },
  inbound: {
    name: '上海',
    country: '中国'
  },
  multiCity: []
};
const tripType1 = determineTripType(userResidence1, destinations1);
console.log('✅ 判断结果:', tripType1);
console.assert(tripType1 === 'domestic', '应该是境内行程');

// 测试用例7: 自动判断 - 跨境行程
console.log('\n【测试用例7】自动判断 - 跨境行程');
const userResidence2 = '中国';
const destinations2 = {
  outbound: {
    name: '北京',
    country: '中国'
  },
  inbound: {
    name: 'New York',
    country: 'United States'
  },
  multiCity: []
};
const tripType2 = determineTripType(userResidence2, destinations2);
console.log('✅ 判断结果:', tripType2);
console.assert(tripType2 === 'cross_border', '应该是跨境行程');

// 测试用例8: 自动判断 - 字符串格式的目的地
console.log('\n【测试用例8】自动判断 - 字符串格式的目的地');
const userResidence3 = '中国';
const destinations3 = {
  outbound: '北京, 中国',
  inbound: 'Tokyo, 日本',
  multiCity: []
};
const tripType3 = determineTripType(userResidence3, destinations3);
console.log('✅ 判断结果:', tripType3);
console.assert(tripType3 === 'cross_border', '应该是跨境行程');

// 测试用例9: 自动判断 - 混合格式（对象和字符串）
console.log('\n【测试用例9】自动判断 - 混合格式（对象和字符串）');
const userResidence4 = '中国';
const destinations4 = {
  outbound: {
    name: '北京',
    country: '中国'
  },
  inbound: 'Shanghai, 中国',
  multiCity: ['Guangzhou, 中国']
};
const tripType4 = determineTripType(userResidence4, destinations4);
console.log('✅ 判断结果:', tripType4);
console.assert(tripType4 === 'domestic', '应该是境内行程');

// 测试用例10: 多程行程包含跨境目的地
console.log('\n【测试用例10】多程行程包含跨境目的地');
const userResidence5 = '中国';
const destinations5 = {
  outbound: {
    name: '北京',
    country: '中国'
  },
  inbound: {
    name: '上海',
    country: '中国'
  },
  multiCity: [
    {
      name: 'Tokyo',
      country: '日本'
    }
  ]
};
const tripType5 = determineTripType(userResidence5, destinations5);
console.log('✅ 判断结果:', tripType5);
console.assert(tripType5 === 'cross_border', '应该是跨境行程（因为多程行程中有日本）');

// 测试用例11: RegionSelector 实际返回的数据格式（基于 transformLocationData）
console.log('\n【测试用例11】RegionSelector 实际返回的数据格式');
const locationFromRegionSelector = {
  id: '507f1f77bcf86cd799439014',
  _id: '507f1f77bcf86cd799439014',
  name: '北京',
  code: 'PEK',
  type: 'city',
  city: '北京',
  province: '北京',
  district: '',
  county: '',
  country: '中国',
  countryCode: 'CN',
  enName: 'Beijing',
  pinyin: 'beijing',
  coordinates: { latitude: 39.9042, longitude: 116.4074 },
  timezone: 'Asia/Shanghai',
  status: 'active',
  parentId: null,
  parentCity: null,
  parentIdObj: null,
  riskLevel: 'low',
  noAirport: false
};
const country11 = extractCountryFromLocation(locationFromRegionSelector);
console.log('✅ 提取的国家:', country11);
console.assert(country11 === '中国', '应该提取到"中国"');

// 测试用例12: 空值和边界情况
console.log('\n【测试用例12】空值和边界情况');
console.log('测试 null:', extractCountryFromLocation(null));
console.log('测试 undefined:', extractCountryFromLocation(undefined));
console.log('测试空字符串:', extractCountryFromLocation(''));
console.log('测试空对象:', extractCountryFromLocation({}));
console.log('测试无效字符串格式:', extractCountryFromLocation('北京')); // 没有逗号

console.log('\n' + '='.repeat(80));
console.log('✅ 所有测试用例执行完成');
console.log('='.repeat(80));

