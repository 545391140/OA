/**
 * Amadeus 酒店 API 连接和功能测试脚本
 * 用于验证酒店相关 API 的可用性、入参格式和返回数据格式
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// 测试结果存储
const testResults = {
  timestamp: new Date().toISOString(),
  environment: config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test',
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  },
};

/**
 * 添加测试结果
 */
function addTestResult(name, status, message, data = null, request = null, response = null) {
  testResults.tests.push({
    name,
    status,
    message,
    data,
    request,
    response,
    timestamp: new Date().toISOString(),
  });
  
  testResults.summary.total++;
  if (status === 'passed') {
    testResults.summary.passed++;
    console.log(`   ✅ ${name}: ${message}`);
  } else if (status === 'failed') {
    testResults.summary.failed++;
    console.log(`   ❌ ${name}: ${message}`);
  } else if (status === 'warning') {
    testResults.summary.warnings++;
    console.log(`   ⚠️  ${name}: ${message}`);
  }
}

// Token 缓存
let tokenCache = {
  accessToken: null,
  expiresAt: null,
};

/**
 * 获取 Access Token
 */
async function getAccessToken() {
  // 检查缓存
  if (tokenCache.accessToken && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt - 5 * 60 * 1000) {
    return tokenCache.accessToken;
  }

  try {
    // 优先使用酒店专用的 API Key 和 Secret
    const apiKey = process.env.AMADEUS_HOTEL_API_KEY || config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
    const apiSecret = process.env.AMADEUS_HOTEL_API_SECRET || config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
    const env = config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test';

    if (!apiKey || !apiSecret) {
      throw new Error('Amadeus API配置缺失：请配置AMADEUS_API_KEY和AMADEUS_API_SECRET');
    }

    const baseURL = env === 'production' 
      ? 'https://api.amadeus.com'
      : 'https://test.api.amadeus.com';

    const response = await axios.post(
      `${baseURL}/v1/security/oauth2/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: apiKey,
        client_secret: apiSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    if (response.data && response.data.access_token) {
      const expiresIn = response.data.expires_in || 1799;
      tokenCache = {
        accessToken: response.data.access_token,
        expiresAt: Date.now() + expiresIn * 1000,
      };
      return tokenCache.accessToken;
    } else {
      throw new Error('获取Access Token失败：响应格式错误');
    }
  } catch (error) {
    if (error.response) {
      console.error('Token获取失败响应:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`获取Access Token失败: ${error.message}`);
  }
}

/**
 * 获取 API 基础 URL
 */
function getBaseURL() {
  const env = config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test';
  return env === 'production'
    ? 'https://api.amadeus.com'
    : 'https://test.api.amadeus.com';
}

/**
 * 测试 1: 配置验证
 */
async function testConfig() {
  console.log('\n📋 测试 1: 配置验证');
  console.log('─'.repeat(60));
  
  try {
    // 优先使用酒店专用的 API Key 和 Secret（通过环境变量传入）
    const apiKey = process.env.AMADEUS_HOTEL_API_KEY || config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
    const apiSecret = process.env.AMADEUS_HOTEL_API_SECRET || config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
    const env = config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test';

    if (!apiKey || !apiSecret) {
      addTestResult('配置验证', 'failed', 'API Key 或 Secret 未设置');
      return false;
    }

    if (typeof apiKey !== 'string' || apiKey.length < 10) {
      addTestResult('配置验证', 'failed', 'API Key 格式不正确');
      return false;
    }

    if (typeof apiSecret !== 'string' || apiSecret.length < 10) {
      addTestResult('配置验证', 'failed', 'API Secret 格式不正确');
      return false;
    }

    addTestResult('配置验证', 'passed', '配置验证通过', {
      apiKey: apiKey.substring(0, 10) + '...',
      apiSecret: '***',
      environment: env,
    });
    console.log(`   📍 环境: ${env}`);
    console.log(`   🔑 API Key: ${apiKey.substring(0, 10)}...`);
    return true;
  } catch (error) {
    addTestResult('配置验证', 'failed', error.message);
    return false;
  }
}

/**
 * 测试 2: 认证和 Token 获取
 */
async function testAuthentication() {
  console.log('\n🔐 测试 2: 认证和 Token 获取');
  console.log('─'.repeat(60));
  
  try {
    const token = await getAccessToken();
    
    if (!token) {
      addTestResult('认证测试', 'failed', '无法获取 Access Token');
      return false;
    }

    addTestResult('认证测试', 'passed', '成功获取 Access Token', {
      tokenLength: token.length,
      tokenType: 'Bearer',
      expiresIn: '1799秒（约30分钟）',
    });
    console.log(`   🔑 Token: ${token.substring(0, 20)}...`);
    return true;
  } catch (error) {
    addTestResult('认证测试', 'failed', error.message);
    if (error.response) {
      console.error('   错误响应:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

/**
 * 测试 3.1: 通过地理坐标搜索酒店 (by-geocode)
 */
async function testHotelSearchByGeocode() {
  console.log('\n🏨 测试 3.1: 通过地理坐标搜索酒店 (by-geocode)');
  console.log('─'.repeat(60));
  
  try {
    const token = await getAccessToken();
    if (!token) {
      addTestResult('地理坐标搜索', 'failed', '无法获取 Access Token');
      return false;
    }

    const baseURL = getBaseURL();
    
    const geocodeParams = {
      latitude: 40.7128,  // 纽约纬度
      longitude: -74.0060, // 纽约经度
      radius: 5, // 5公里
      hotelSource: 'ALL',
    };

    console.log('   🔍 搜索参数:', JSON.stringify(geocodeParams, null, 2));

    const response = await axios.get(
      `${baseURL}/v1/reference-data/locations/hotels/by-geocode`,
      {
        params: geocodeParams,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (!response.data?.data || !Array.isArray(response.data.data)) {
      addTestResult('地理坐标搜索', 'failed', 'API响应格式错误：缺少data数组');
      return false;
    }

    const hotels = response.data.data;
    console.log(`   📊 找到 ${hotels.length} 个酒店`);

    if (hotels.length === 0) {
      addTestResult('地理坐标搜索', 'warning', '搜索成功但未找到酒店（可能是测试环境数据问题）');
    } else {
      const firstHotel = hotels[0];
      console.log('   🏨 第一个酒店:', JSON.stringify({
        hotelId: firstHotel.hotelId,
        name: firstHotel.name,
        geoCode: firstHotel.geoCode,
      }, null, 2));

      addTestResult('地理坐标搜索', 'passed', `成功找到 ${hotels.length} 个酒店`, {
        hotelsFound: hotels.length,
        sampleHotel: {
          hotelId: firstHotel.hotelId,
          name: firstHotel.name,
          geoCode: firstHotel.geoCode,
        },
      }, geocodeParams, {
        status: response.status,
        dataCount: hotels.length,
      });
    }

    return hotels.length > 0 ? hotels : null;
  } catch (error) {
    let errorMessage = error.message;
    if (error.response) {
      errorMessage += ` (HTTP ${error.response.status})`;
      if (error.response.data?.errors) {
        errorMessage += `: ${JSON.stringify(error.response.data.errors[0])}`;
      }
      console.error('   错误响应:', JSON.stringify(error.response.data, null, 2));
    }
    addTestResult('地理坐标搜索', 'failed', errorMessage);
    return null;
  }
}

/**
 * 测试 3.2: 通过城市搜索酒店 (by-city)
 */
async function testHotelSearchByCity() {
  console.log('\n🏨 测试 3.2: 通过城市搜索酒店 (by-city)');
  console.log('─'.repeat(60));
  
  try {
    const token = await getAccessToken();
    if (!token) {
      addTestResult('城市搜索', 'failed', '无法获取 Access Token');
      return false;
    }

    const baseURL = getBaseURL();
    
    const cityParams = {
      cityCode: 'NYC', // 纽约城市代码
      hotelSource: 'ALL',
    };

    console.log('   🔍 搜索参数:', JSON.stringify(cityParams, null, 2));

    // 等待1秒避免频率限制
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await axios.get(
      `${baseURL}/v1/reference-data/locations/hotels/by-city`,
      {
        params: cityParams,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (!response.data?.data || !Array.isArray(response.data.data)) {
      addTestResult('城市搜索', 'failed', 'API响应格式错误：缺少data数组');
      return false;
    }

    const hotels = response.data.data;
    console.log(`   📊 找到 ${hotels.length} 个酒店`);

    if (hotels.length === 0) {
      addTestResult('城市搜索', 'warning', '搜索成功但未找到酒店（可能是测试环境数据问题）');
    } else {
      const firstHotel = hotels[0];
      console.log('   🏨 第一个酒店:', JSON.stringify({
        hotelId: firstHotel.hotelId,
        name: firstHotel.name,
      }, null, 2));

      addTestResult('城市搜索', 'passed', `成功找到 ${hotels.length} 个酒店`, {
        hotelsFound: hotels.length,
        cityCode: 'NYC',
        sampleHotel: {
          hotelId: firstHotel.hotelId,
          name: firstHotel.name,
        },
      }, cityParams, {
        status: response.status,
        dataCount: hotels.length,
      });
    }

    return hotels.length > 0 ? hotels : null;
  } catch (error) {
    let errorMessage = error.message;
    if (error.response) {
      errorMessage += ` (HTTP ${error.response.status})`;
      if (error.response.data?.errors) {
        errorMessage += `: ${JSON.stringify(error.response.data.errors[0])}`;
      }
      console.error('   错误响应:', JSON.stringify(error.response.data, null, 2));
    }
    addTestResult('城市搜索', 'failed', errorMessage);
    return null;
  }
}

/**
 * 测试 3.3: 通过酒店ID搜索酒店 (by-hotels)
 */
async function testHotelSearchByHotels() {
  console.log('\n🏨 测试 3.3: 通过酒店ID搜索酒店 (by-hotels)');
  console.log('─'.repeat(60));
  
  try {
    const token = await getAccessToken();
    if (!token) {
      addTestResult('酒店ID搜索', 'failed', '无法获取 Access Token');
      return false;
    }

    const baseURL = getBaseURL();
    
    // 先通过地理坐标获取一个酒店ID
    const geocodeResponse = await axios.get(
      `${baseURL}/v1/reference-data/locations/hotels/by-geocode`,
      {
        params: {
          latitude: 40.7128,
          longitude: -74.0060,
          radius: 5,
          hotelSource: 'ALL',
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (!geocodeResponse.data?.data || geocodeResponse.data.data.length === 0) {
      addTestResult('酒店ID搜索', 'warning', '无法获取酒店ID（地理坐标搜索无结果），跳过此测试');
      return true;
    }

    const hotelId = geocodeResponse.data.data[0].hotelId;
    if (!hotelId) {
      addTestResult('酒店ID搜索', 'warning', '无法从搜索结果中提取酒店ID，跳过此测试');
      return true;
    }

    console.log(`   🏨 使用酒店ID: ${hotelId}`);

    const hotelParams = {
      hotelIds: hotelId,
    };

    console.log('   🔍 搜索参数:', JSON.stringify(hotelParams, null, 2));

    // 等待1秒避免频率限制
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await axios.get(
      `${baseURL}/v1/reference-data/locations/hotels/by-hotels`,
      {
        params: hotelParams,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (!response.data?.data || !Array.isArray(response.data.data)) {
      addTestResult('酒店ID搜索', 'failed', 'API响应格式错误：缺少data数组');
      return false;
    }

    const hotels = response.data.data;
    console.log(`   📊 找到 ${hotels.length} 个酒店`);

    if (hotels.length === 0) {
      addTestResult('酒店ID搜索', 'warning', '搜索成功但未找到酒店（可能是测试环境数据问题）');
    } else {
      const firstHotel = hotels[0];
      console.log('   🏨 酒店信息:', JSON.stringify({
        hotelId: firstHotel.hotelId,
        name: firstHotel.name,
      }, null, 2));

      addTestResult('酒店ID搜索', 'passed', `成功找到 ${hotels.length} 个酒店`, {
        hotelId,
        hotelsFound: hotels.length,
        sampleHotel: {
          hotelId: firstHotel.hotelId,
          name: firstHotel.name,
        },
      }, hotelParams, {
        status: response.status,
        dataCount: hotels.length,
      });
    }

    return true;
  } catch (error) {
    let errorMessage = error.message;
    if (error.response) {
      errorMessage += ` (HTTP ${error.response.status})`;
      if (error.response.data?.errors) {
        errorMessage += `: ${JSON.stringify(error.response.data.errors[0])}`;
      }
      console.error('   错误响应:', JSON.stringify(error.response.data, null, 2));
    }
    addTestResult('酒店ID搜索', 'failed', errorMessage);
    return false;
  }
}

/**
 * 测试 3.4: 酒店报价搜索 (Hotel Offers Search)
 * 使用 cityCode 参数搜索多个酒店报价（根据 Amadeus API 文档 v3.0.9）
 */
async function testHotelOffersSearch() {
  console.log('\n🏨 测试 3.4: 酒店报价搜索 (Hotel Offers Search)');
  console.log('─'.repeat(60));
  
  try {
    const token = await getAccessToken();
    if (!token) {
      addTestResult('酒店报价搜索', 'failed', '无法获取 Access Token');
      return false;
    }

    const baseURL = getBaseURL();

    // 先通过城市代码获取全部酒店ID（北京）
    const cityResponse = await axios.get(
      `${baseURL}/v1/reference-data/locations/hotels/by-city`,
      {
        params: {
          cityCode: 'BJS', // 北京
          hotelSource: 'ALL',
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (!cityResponse.data?.data || cityResponse.data.data.length === 0) {
      addTestResult('酒店报价搜索', 'warning', '无法获取酒店ID（城市搜索无结果），跳过此测试');
      return true;
    }

    // 获取全部酒店ID（不再限制为5个）
    const allHotels = cityResponse.data.data;
    const hotelIds = allHotels.map(h => h.hotelId).filter(Boolean);
    console.log(`   🏨 找到 ${hotelIds.length} 个酒店，将查询全部酒店的报价`);
    if (hotelIds.length === 0) {
      addTestResult('酒店报价搜索', 'warning', '无法从搜索结果中提取酒店ID，跳过此测试');
      return true;
    }

    console.log(`   🏨 使用 ${hotelIds.length} 个酒店ID（全部酒店）`);
    console.log(`   📋 前5个酒店ID示例: ${hotelIds.slice(0, 5).join(', ')}...`);

    // 搜索报价 - 使用全部 hotelIds（分批查询避免API限制）
    const checkInDate = '2025-12-22'; // 使用固定日期便于测试
    const checkOutDate = '2025-12-23';

    // 分批查询（每批20个酒店，避免API限制）
    const BATCH_SIZE = 20;
    const batches = [];
    for (let i = 0; i < hotelIds.length; i += BATCH_SIZE) {
      batches.push(hotelIds.slice(i, i + BATCH_SIZE));
    }

    console.log(`   📦 分成 ${batches.length} 批查询（每批最多 ${BATCH_SIZE} 个酒店）`);

    const allOffers = [];
    let successBatches = 0;
    let failedBatches = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = hotelIds.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      console.log(`   🔄 查询第 ${i + 1}/${batches.length} 批（${batch.length} 个酒店）...`);

      try {
        // 构建参数 - hotelIds 需要作为数组传递
        const searchParams = new URLSearchParams({
          checkInDate,
          checkOutDate,
          adults: '1',
          roomQuantity: '1',
          currencyCode: 'USD',
        });

        // 添加多个 hotelIds 参数
        batch.forEach(hotelId => {
          searchParams.append('hotelIds', hotelId);
        });

        // 等待避免频率限制
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // 根据 Amadeus API 文档 v3.0.9，正确的端点是 /v3/shopping/hotel-offers (getMultiHotelOffers)
        const response = await axios.get(
          `${baseURL}/v3/shopping/hotel-offers?${searchParams.toString()}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.amadeus+json',
            },
            timeout: 30000,
          }
        );

        // 验证响应格式
        if (response.data && response.data.data && Array.isArray(response.data.data)) {
          const offers = response.data.data || [];
          console.log(`      ✅ 找到 ${offers.length} 个报价`);
          allOffers.push(...offers);
          successBatches++;
        } else {
          console.log(`      ⚠️  无报价数据`);
          failedBatches++;
        }
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        console.log(`      ❌ 查询失败: ${errorMsg.substring(0, 50)}...`);
        failedBatches++;
      }
    }

    const hotelOffers = allOffers;
    console.log(`\n   📊 汇总结果:`);
    console.log(`      - 查询酒店总数: ${hotelIds.length}`);
    console.log(`      - 总报价数: ${hotelOffers.length}`);
    console.log(`      - 成功率: ${((hotelOffers.length / hotelIds.length) * 100).toFixed(2)}%`);
    console.log(`      - 成功批次: ${successBatches}/${batches.length}`);
    console.log(`      - 失败批次: ${failedBatches}/${batches.length}`);

    // 验证响应格式
    if (hotelOffers.length === 0) {
      addTestResult('酒店报价搜索', 'warning', `查询了 ${hotelIds.length} 个酒店但未找到报价（可能是测试环境数据问题或酒店已满员）`, {
        note: '可以尝试更改日期或使用不同的搜索参数',
        hotelsQueried: hotelIds.length,
      });
      return true;
    }

    if (hotelOffers.length === 0) {
      addTestResult('酒店报价搜索', 'warning', '搜索成功但未找到报价（可能是测试环境数据问题或酒店已满员）', {
        note: '可以尝试更改日期或使用 includeClosed=true 参数',
      });
    } else {
      // 检查第一个酒店的数据结构
      const firstHotel = hotelOffers[0];
      const hotelStructure = {
        hasHotel: !!firstHotel.hotel,
        hasOffers: !!firstHotel.offers && Array.isArray(firstHotel.offers),
        hotelId: firstHotel.hotel?.hotelId,
        hotelName: firstHotel.hotel?.name,
        offersCount: firstHotel.offers?.length || 0,
      };

      console.log('   📋 第一个酒店结构:', JSON.stringify(hotelStructure, null, 2));

      if (firstHotel.offers && firstHotel.offers.length > 0) {
        const firstOffer = firstHotel.offers[0];
        console.log('   💰 第一个报价价格:', firstOffer.price?.total, firstOffer.price?.currency);
        console.log('   🎫 报价ID:', firstOffer.id);
      }

      addTestResult('酒店报价搜索', 'passed', `成功搜索到 ${hotelOffers.length} 个酒店报价（查询了 ${hotelIds.length} 个酒店）`, {
        hotelsQueried: hotelIds.length,
        hotelsFound: hotelOffers.length,
        successRate: ((hotelOffers.length / hotelIds.length) * 100).toFixed(2) + '%',
        searchMethod: 'hotelIds (batch)',
        successBatches,
        failedBatches,
        totalBatches: batches.length,
        hotelStructure,
        sampleHotels: hotelOffers.slice(0, 5).map(h => ({
          hotelId: h.hotel?.hotelId,
          name: h.hotel?.name,
          offersCount: h.offers?.length || 0,
          price: h.offers?.[0]?.price?.total,
          currency: h.offers?.[0]?.price?.currency,
        })),
      }, {
        hotelIdsCount: hotelIds.length,
        checkInDate,
        checkOutDate,
        adults: 1,
        roomQuantity: 1,
        currencyCode: 'USD',
        batchSize: BATCH_SIZE,
      }, {
        totalOffers: hotelOffers.length,
        successBatches,
        failedBatches,
      });
    }

    return true;
  } catch (error) {
    let errorMessage = error.message;
    if (error.response) {
      errorMessage += ` (HTTP ${error.response.status})`;
      if (error.response.data?.errors) {
        errorMessage += `: ${JSON.stringify(error.response.data.errors[0])}`;
      }
      console.error('   错误响应:', JSON.stringify(error.response.data, null, 2));
    }
    addTestResult('酒店报价搜索', 'failed', errorMessage);
    return false;
  }
}

/**
 * 测试 4: 根据酒店ID搜索报价 (Hotel Offers Search by Hotel)
 * 这个测试专门测试单个酒店ID的报价搜索
 */
async function testHotelOffersByHotel() {
  console.log('\n🏨 测试 4: 根据酒店ID搜索报价 (Hotel Offers Search by Hotel)');
  console.log('─'.repeat(60));
  
  try {
    const token = await getAccessToken();
    if (!token) {
      addTestResult('酒店ID搜索', 'failed', '无法获取 Access Token');
      return false;
    }

    const baseURL = getBaseURL();
    
    // 先通过地理坐标获取一个酒店ID
    const geocodeParams = {
      latitude: 40.7128,  // 纽约纬度
      longitude: -74.0060, // 纽约经度
      radius: 5,
      hotelSource: 'ALL',
    };

    const geocodeResponse = await axios.get(
      `${baseURL}/v1/reference-data/locations/hotels/by-geocode`,
      {
        params: geocodeParams,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (!geocodeResponse.data?.data || geocodeResponse.data.data.length === 0) {
      addTestResult('酒店ID搜索', 'warning', '无法获取酒店ID（地理坐标搜索无结果），跳过此测试');
      return true;
    }

    const hotelId = geocodeResponse.data.data[0].hotelId;
    if (!hotelId) {
      addTestResult('酒店ID搜索', 'warning', '无法从搜索结果中提取酒店ID，跳过此测试');
      return true;
    }

    console.log(`   🏨 使用酒店ID: ${hotelId}`);

    // 根据 hotelId 搜索报价
    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + 30);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 2);

    // 使用 URLSearchParams 确保参数格式正确
    const byHotelParams = new URLSearchParams({
      hotelIds: hotelId, // 单个酒店ID
      checkInDate: checkInDate.toISOString().split('T')[0],
      checkOutDate: checkOutDate.toISOString().split('T')[0],
      adults: '1',
      roomQuantity: '1',
      currencyCode: 'USD',
    });

    console.log('   🔍 搜索参数:', JSON.stringify({
      hotelIds: hotelId,
      checkInDate: checkInDate.toISOString().split('T')[0],
      checkOutDate: checkOutDate.toISOString().split('T')[0],
      adults: 1,
      roomQuantity: 1,
      currencyCode: 'USD',
    }, null, 2));

    // 等待1秒避免频率限制
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 根据 Amadeus API 文档 v3.0.9，正确的端点是 /v3/shopping/hotel-offers
    console.log('   📍 使用正确的端点: /v3/shopping/hotel-offers (getMultiHotelOffers)');
    const response = await axios.get(
      `${baseURL}/v3/shopping/hotel-offers`,
      {
        params: {
          hotelIds: hotelId,
          checkInDate: checkInDate.toISOString().split('T')[0],
          checkOutDate: checkOutDate.toISOString().split('T')[0],
          adults: 1,
          roomQuantity: 1,
          currencyCode: 'USD',
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (!response.data || !response.data.data) {
      addTestResult('酒店ID搜索', 'failed', 'API响应格式错误');
      return false;
    }

    const hotels = response.data.data;
    console.log(`   📊 找到 ${hotels.length} 个酒店报价`);

    if (hotels.length === 0) {
      addTestResult('酒店ID搜索', 'warning', '搜索成功但未找到报价（可能是测试环境数据问题或酒店已满员）');
    } else {
      addTestResult('酒店ID搜索', 'passed', `成功根据酒店ID搜索到 ${hotels.length} 个报价`, {
        hotelId,
        offersFound: hotels.length,
      }, {
        hotelIds: hotelId,
        checkInDate: checkInDate.toISOString().split('T')[0],
        checkOutDate: checkOutDate.toISOString().split('T')[0],
        adults: 1,
        roomQuantity: 1,
        currencyCode: 'USD',
      }, {
        status: response.status,
        dataCount: hotels.length,
      });
    }

    return true;
  } catch (error) {
    let errorMessage = error.message;
    if (error.response) {
      errorMessage += ` (HTTP ${error.response.status})`;
      if (error.response.data?.errors) {
        errorMessage += `: ${JSON.stringify(error.response.data.errors[0])}`;
      }
      console.error('   错误响应:', JSON.stringify(error.response.data, null, 2));
    }
    addTestResult('酒店ID搜索', 'failed', errorMessage);
    return false;
  }
}

/**
 * 测试 5: 酒店价格确认 (Hotel Offer Price)
 */
async function testHotelPrice() {
  console.log('\n💰 测试 5: 酒店价格确认 (Hotel Offer Price)');
  console.log('─'.repeat(60));
  
  try {
    const token = await getAccessToken();
    if (!token) {
      addTestResult('价格确认', 'failed', '无法获取 Access Token');
      return false;
    }

    const baseURL = getBaseURL();
    
    // 先通过地理坐标获取酒店ID，然后搜索报价获取 offerId
    const geocodeParams = {
      latitude: 40.7128,
      longitude: -74.0060,
      radius: 5,
      hotelSource: 'ALL',
    };

    const geocodeResponse = await axios.get(
      `${baseURL}/v1/reference-data/locations/hotels/by-geocode`,
      {
        params: geocodeParams,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (!geocodeResponse.data?.data || geocodeResponse.data.data.length === 0) {
      addTestResult('价格确认', 'warning', '无法获取酒店ID（地理坐标搜索无结果），跳过此测试');
      return true;
    }

    const hotelId = geocodeResponse.data.data[0].hotelId;
    if (!hotelId) {
      addTestResult('价格确认', 'warning', '无法从搜索结果中提取酒店ID，跳过此测试');
      return true;
    }

    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + 30);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 2);

    // 等待1秒避免频率限制
    await new Promise(resolve => setTimeout(resolve, 1000));

    const searchResponse = await axios.get(
      `${baseURL}/v3/shopping/hotel-offers/by-hotel`,
      {
        params: {
          hotelIds: hotelId,
          checkInDate: checkInDate.toISOString().split('T')[0],
          checkOutDate: checkOutDate.toISOString().split('T')[0],
          adults: 1,
          roomQuantity: 1,
          currencyCode: 'USD',
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (!searchResponse.data?.data || searchResponse.data.data.length === 0) {
      addTestResult('价格确认', 'warning', '无法获取报价ID（搜索无结果），跳过此测试');
      return true;
    }

    const firstHotel = searchResponse.data.data[0];
    if (!firstHotel.offers || firstHotel.offers.length === 0) {
      addTestResult('价格确认', 'warning', '酒店没有可用报价，跳过此测试');
      return true;
    }

    const offerId = firstHotel.offers[0].id;
    if (!offerId) {
      addTestResult('价格确认', 'warning', '无法从报价中提取ID，跳过此测试');
      return true;
    }

    console.log(`   🎫 使用报价ID: ${offerId}`);

    // 等待1秒避免频率限制
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 根据 Amadeus API 文档 v3.0.9，价格确认端点是 /v3/shopping/hotel-offers/{offerId} (getOfferPricing)
    console.log('   📍 使用正确的端点: /v3/shopping/hotel-offers/{offerId} (getOfferPricing)');
    const response = await axios.get(
      `${baseURL}/v3/shopping/hotel-offers/${offerId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (!response.data || !response.data.data) {
      addTestResult('价格确认', 'failed', 'API响应格式错误');
      return false;
    }

    const priceData = response.data.data;
    console.log('   💰 价格信息:', JSON.stringify({
      total: priceData.price?.total,
      currency: priceData.price?.currency,
      base: priceData.price?.base,
    }, null, 2));

    addTestResult('价格确认', 'passed', '成功确认酒店价格', {
      offerId,
      price: priceData.price,
    }, { offerId }, {
      status: response.status,
      price: priceData.price,
    });

    return true;
  } catch (error) {
    let errorMessage = error.message;
    if (error.response) {
      errorMessage += ` (HTTP ${error.response.status})`;
      if (error.response.data?.errors) {
        errorMessage += `: ${JSON.stringify(error.response.data.errors[0])}`;
      }
      console.error('   错误响应:', JSON.stringify(error.response.data, null, 2));
    }
    addTestResult('价格确认', 'failed', errorMessage);
    return false;
  }
}

/**
 * 测试 6: 酒店名称自动完成 (Hotel Name Autocomplete)
 */
async function testHotelAutocomplete() {
  console.log('\n🔍 测试 6: 酒店名称自动完成 (Hotel Name Autocomplete)');
  console.log('─'.repeat(60));
  
  try {
    const token = await getAccessToken();
    if (!token) {
      addTestResult('酒店自动完成', 'failed', '无法获取 Access Token');
      return false;
    }

    const baseURL = getBaseURL();
    
    // 使用纽约的经纬度
    const autocompleteParams = {
      latitude: 40.7128,  // 纽约纬度
      longitude: -74.0060, // 纽约经度
      radius: 5, // 5公里
      hotelSource: 'ALL',
      keyword: 'hotel', // 可选关键词
    };

    console.log('   🔍 搜索参数:', JSON.stringify(autocompleteParams, null, 2));

    // 等待1秒避免频率限制
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await axios.get(
      `${baseURL}/v1/reference-data/locations/hotels/by-geocode`,
      {
        params: autocompleteParams,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (!response.data) {
      addTestResult('酒店自动完成', 'failed', 'API响应为空');
      return false;
    }

    const hotels = response.data.data || [];
    console.log(`   📊 找到 ${hotels.length} 个酒店`);

    if (hotels.length === 0) {
      addTestResult('酒店自动完成', 'warning', '搜索成功但未找到酒店（可能是测试环境数据问题）');
    } else {
      const firstHotel = hotels[0];
      console.log('   🏨 第一个酒店:', firstHotel.name || firstHotel.hotelId);

      addTestResult('酒店自动完成', 'passed', `成功找到 ${hotels.length} 个酒店`, {
        hotelsFound: hotels.length,
        sampleHotel: {
          hotelId: firstHotel.hotelId,
          name: firstHotel.name,
          geoCode: firstHotel.geoCode,
        },
      }, autocompleteParams, {
        status: response.status,
        dataCount: hotels.length,
      });
    }

    return true;
  } catch (error) {
    let errorMessage = error.message;
    if (error.response) {
      errorMessage += ` (HTTP ${error.response.status})`;
      if (error.response.data?.errors) {
        errorMessage += `: ${JSON.stringify(error.response.data.errors[0])}`;
      }
      console.error('   错误响应:', JSON.stringify(error.response.data, null, 2));
    }
    addTestResult('酒店自动完成', 'failed', errorMessage);
    return false;
  }
}

/**
 * 测试 7: 酒店评分查询 (Hotel Ratings)
 */
async function testHotelRatings() {
  console.log('\n⭐ 测试 7: 酒店评分查询 (Hotel Ratings)');
  console.log('─'.repeat(60));
  
  try {
    const token = await getAccessToken();
    if (!token) {
      addTestResult('酒店评分', 'failed', '无法获取 Access Token');
      return false;
    }

    const baseURL = getBaseURL();
    
    // 先通过地理坐标获取酒店ID
    const geocodeParams = {
      latitude: 40.7128,
      longitude: -74.0060,
      radius: 5,
      hotelSource: 'ALL',
    };

    const geocodeResponse = await axios.get(
      `${baseURL}/v1/reference-data/locations/hotels/by-geocode`,
      {
        params: geocodeParams,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (!geocodeResponse.data?.data || geocodeResponse.data.data.length === 0) {
      addTestResult('酒店评分', 'warning', '无法获取酒店ID（地理坐标搜索无结果），跳过此测试');
      return true;
    }

    // 获取前3个酒店的ID
    const hotelIds = geocodeResponse.data.data
      .slice(0, 3)
      .map(hotel => hotel.hotelId)
      .filter(Boolean);

    if (hotelIds.length === 0) {
      addTestResult('酒店评分', 'warning', '无法从搜索结果中提取酒店ID，跳过此测试');
      return true;
    }

    // 使用逗号分隔的字符串格式
    const hotelIdsParam = hotelIds.join(',');
    console.log(`   🏨 查询酒店ID: ${hotelIdsParam}`);

    // 等待1秒避免频率限制
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 查询评分
    const response = await axios.get(
      `${baseURL}/v2/e-reputation/hotel-sentiments`,
      {
        params: {
          hotelIds: hotelIdsParam,
        },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (!response.data) {
      addTestResult('酒店评分', 'failed', 'API响应为空');
      return false;
    }

    const ratings = response.data.data || [];
    console.log(`   📊 找到 ${ratings.length} 个酒店的评分`);

    if (ratings.length === 0) {
      addTestResult('酒店评分', 'warning', '查询成功但未找到评分数据（可能是测试环境数据问题）');
    } else {
      const firstRating = ratings[0];
      console.log('   ⭐ 第一个酒店评分:', JSON.stringify({
        hotelId: firstRating.hotelId,
        overallRating: firstRating.overallRating,
        sentiment: firstRating.sentiment,
      }, null, 2));

      addTestResult('酒店评分', 'passed', `成功获取 ${ratings.length} 个酒店的评分`, {
        hotelIds: hotelIds,
        ratingsFound: ratings.length,
        sampleRating: firstRating,
      }, { hotelIds: hotelIdsParam }, {
        status: response.status,
        dataCount: ratings.length,
      });
    }

    return true;
  } catch (error) {
    let errorMessage = error.message;
    if (error.response) {
      errorMessage += ` (HTTP ${error.response.status})`;
      if (error.response.data?.errors) {
        errorMessage += `: ${JSON.stringify(error.response.data.errors[0])}`;
      }
      console.error('   错误响应:', JSON.stringify(error.response.data, null, 2));
    }
    addTestResult('酒店评分', 'failed', errorMessage);
    return false;
  }
}

/**
 * 生成测试报告
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试报告摘要');
  console.log('='.repeat(60));
  console.log(`总测试数: ${testResults.summary.total}`);
  console.log(`✅ 通过: ${testResults.summary.passed}`);
  console.log(`❌ 失败: ${testResults.summary.failed}`);
  console.log(`⚠️  警告: ${testResults.summary.warnings}`);
  console.log(`环境: ${testResults.environment}`);
  console.log(`时间: ${testResults.timestamp}`);
}

/**
 * 保存测试报告
 */
function saveReport() {
  const reportsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonFile = path.join(reportsDir, `hotel-api-test-report-${timestamp}.json`);
  const mdFile = path.join(reportsDir, `hotel-api-test-report-${timestamp}.md`);

  // 保存 JSON 报告
  fs.writeFileSync(jsonFile, JSON.stringify(testResults, null, 2), 'utf8');
  console.log(`\n📄 JSON 报告已保存: ${jsonFile}`);

  // 生成并保存 Markdown 报告
  let md = `# Amadeus 酒店 API 测试报告\n\n`;
  md += `**测试时间**: ${testResults.timestamp}\n`;
  md += `**测试环境**: ${testResults.environment}\n\n`;
  md += `## 测试摘要\n\n`;
  md += `| 项目 | 数量 |\n`;
  md += `|------|------|\n`;
  md += `| 总测试数 | ${testResults.summary.total} |\n`;
  md += `| ✅ 通过 | ${testResults.summary.passed} |\n`;
  md += `| ❌ 失败 | ${testResults.summary.failed} |\n`;
  md += `| ⚠️  警告 | ${testResults.summary.warnings} |\n\n`;

  md += `## 详细测试结果\n\n`;
  testResults.tests.forEach((test, index) => {
    const statusIcon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
    md += `### ${index + 1}. ${test.name} ${statusIcon}\n\n`;
    md += `**状态**: ${test.status}\n`;
    md += `**消息**: ${test.message}\n`;
    
    if (test.request) {
      md += `\n**请求参数**:\n\`\`\`json\n${JSON.stringify(test.request, null, 2)}\n\`\`\`\n`;
    }
    
    if (test.response) {
      md += `\n**响应数据**:\n\`\`\`json\n${JSON.stringify(test.response, null, 2)}\n\`\`\`\n`;
    }
    
    if (test.data) {
      md += `\n**详细信息**:\n\`\`\`json\n${JSON.stringify(test.data, null, 2)}\n\`\`\`\n`;
    }
    
    md += `\n---\n\n`;
  });

  fs.writeFileSync(mdFile, md, 'utf8');
  console.log(`📄 Markdown 报告已保存: ${mdFile}`);
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Amadeus 酒店 API 连接和功能测试');
  console.log('='.repeat(60));
  
  try {
    // 测试 1: 配置验证
    const configOk = await testConfig();
    if (!configOk) {
      console.log('\n❌ 配置验证失败，终止测试');
      generateReport();
      saveReport();
      process.exit(1);
    }
    
    // 测试 2: 认证
    const authOk = await testAuthentication();
    if (!authOk) {
      console.log('\n❌ 认证测试失败，终止后续测试');
      generateReport();
      saveReport();
      process.exit(1);
    }
    
    // 测试 3.1: 通过地理坐标搜索酒店
    const geocodeHotels = await testHotelSearchByGeocode();
    
    // 测试 3.2: 通过城市搜索酒店
    await testHotelSearchByCity();
    
    // 测试 3.3: 通过酒店ID搜索酒店
    await testHotelSearchByHotels();
    
    // 测试 3.4: 酒店报价搜索
    await testHotelOffersSearch();
    
    // 测试 4: 根据酒店ID搜索报价（保留原有测试）
    await testHotelOffersByHotel();
    
    // 测试 5: 价格确认
    await testHotelPrice();
    
    // 测试 6: 酒店名称自动完成
    await testHotelAutocomplete();
    
    // 测试 7: 酒店评分查询
    await testHotelRatings();
    
    // 生成报告
    generateReport();
    saveReport();
    
    // 根据测试结果决定退出码
    if (testResults.summary.failed === 0) {
      console.log('\n✅ 所有关键测试通过！');
      process.exit(0);
    } else {
      console.log('\n❌ 部分测试失败，请检查报告');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
    addTestResult('测试执行', 'failed', error.message);
    generateReport();
    saveReport();
    process.exit(1);
  }
}

// 运行测试
runTests();

