/**
 * Amadeus SDK 酒店 API 测试脚本
 * 测试使用 Amadeus Node.js SDK 调用酒店相关接口
 */

const Amadeus = require('amadeus');
const config = require('../config');
const fs = require('fs');
const path = require('path');

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
  testResults.summary.total++;
}

// 初始化 SDK
let amadeus;

function initializeSdk() {
  try {
    const apiKey = process.env.AMADEUS_HOTEL_API_KEY || config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
    const apiSecret = process.env.AMADEUS_HOTEL_API_SECRET || config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
    const env = config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test';

    if (!apiKey || !apiSecret) {
      throw new Error('Amadeus API配置缺失：请配置AMADEUS_API_KEY和AMADEUS_API_SECRET');
    }

    amadeus = new Amadeus({
      clientId: apiKey,
      clientSecret: apiSecret,
      hostname: env === 'production' ? 'production' : 'test',
    });

    console.log('   ✅ SDK 初始化成功');
    console.log(`   📍 环境: ${env}`);
    console.log(`   🔑 API Key: ${apiKey.substring(0, 10)}...`);
    return true;
  } catch (error) {
    console.error('   ❌ SDK 初始化失败:', error.message);
    addTestResult('SDK初始化', 'failed', error.message);
    return false;
  }
}

// 延迟函数
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 测试 1: 通过地理坐标搜索酒店
 */
async function testHotelsByGeocode() {
  console.log('\n🏨 测试 1: 通过地理坐标搜索酒店 (byGeocode)');
  console.log('─'.repeat(60));

  try {
    const params = {
      latitude: 40.7128,  // 纽约纬度
      longitude: -74.0060, // 纽约经度
      radius: 5,
      hotelSource: 'ALL',
    };

    console.log('   🔍 搜索参数:', JSON.stringify(params, null, 2));

    const response = await amadeus.referenceData.locations.hotels.byGeocode.get(params);

    if (response.data && Array.isArray(response.data)) {
      console.log(`   📊 找到 ${response.data.length} 个酒店`);
      
      if (response.data.length > 0) {
        const firstHotel = response.data[0];
        console.log('   🏨 第一个酒店:', JSON.stringify({
          hotelId: firstHotel.hotelId,
          name: firstHotel.name,
          geoCode: firstHotel.geoCode,
        }, null, 2));

        addTestResult('地理坐标搜索', 'passed', `成功找到 ${response.data.length} 个酒店`, {
          hotelsFound: response.data.length,
          sampleHotel: {
            hotelId: firstHotel.hotelId,
            name: firstHotel.name,
            geoCode: firstHotel.geoCode,
          },
        }, params, {
          status: 'success',
          dataCount: response.data.length,
        });
      } else {
        addTestResult('地理坐标搜索', 'warning', '搜索成功但未找到酒店（可能是测试环境数据问题）');
      }
    } else {
      addTestResult('地理坐标搜索', 'failed', 'API响应格式错误：缺少data数组');
    }
  } catch (error) {
    let errorMessage = error.description || error.message;
    if (error.code) {
      errorMessage += ` (code: ${error.code})`;
    }
    if (error.statusCode) {
      errorMessage += ` (HTTP ${error.statusCode})`;
    }
    console.error('   错误详情:', error);
    addTestResult('地理坐标搜索', 'failed', errorMessage);
  }
}

/**
 * 测试 2: 通过城市搜索酒店
 */
async function testHotelsByCity() {
  console.log('\n🏨 测试 2: 通过城市搜索酒店 (byCity)');
  console.log('─'.repeat(60));

  try {
    await delay(1000); // 避免频率限制

    const params = {
      cityCode: 'NYC',
      hotelSource: 'ALL',
    };

    console.log('   🔍 搜索参数:', JSON.stringify(params, null, 2));

    const response = await amadeus.referenceData.locations.hotels.byCity.get(params);

    if (response.data && Array.isArray(response.data)) {
      console.log(`   📊 找到 ${response.data.length} 个酒店`);
      
      if (response.data.length > 0) {
        const firstHotel = response.data[0];
        console.log('   🏨 第一个酒店:', JSON.stringify({
          hotelId: firstHotel.hotelId,
          name: firstHotel.name,
        }, null, 2));

        addTestResult('城市搜索', 'passed', `成功找到 ${response.data.length} 个酒店`, {
          hotelsFound: response.data.length,
          cityCode: 'NYC',
          sampleHotel: {
            hotelId: firstHotel.hotelId,
            name: firstHotel.name,
          },
        }, params, {
          status: 'success',
          dataCount: response.data.length,
        });
      } else {
        addTestResult('城市搜索', 'warning', '搜索成功但未找到酒店（可能是测试环境数据问题）');
      }
    } else {
      addTestResult('城市搜索', 'failed', 'API响应格式错误：缺少data数组');
    }
  } catch (error) {
    let errorMessage = error.description || error.message;
    if (error.code) {
      errorMessage += ` (code: ${error.code})`;
    }
    if (error.statusCode) {
      errorMessage += ` (HTTP ${error.statusCode})`;
    }
    console.error('   错误详情:', error);
    addTestResult('城市搜索', 'failed', errorMessage);
  }
}

/**
 * 测试 3: 通过酒店ID搜索酒店
 */
async function testHotelsByHotels() {
  console.log('\n🏨 测试 3: 通过酒店ID搜索酒店 (byHotels)');
  console.log('─'.repeat(60));

  try {
    await delay(1000); // 避免频率限制

    // 先获取一个酒店ID
    const geocodeResponse = await amadeus.referenceData.locations.hotels.byGeocode.get({
      latitude: 40.7128,
      longitude: -74.0060,
      radius: 5,
      hotelSource: 'ALL',
    });

    if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
      addTestResult('酒店ID搜索', 'warning', '无法获取酒店ID（地理坐标搜索无结果），跳过此测试');
      return;
    }

    const hotelId = geocodeResponse.data[0].hotelId;
    if (!hotelId) {
      addTestResult('酒店ID搜索', 'warning', '无法从搜索结果中提取酒店ID，跳过此测试');
      return;
    }

    console.log(`   🏨 使用酒店ID: ${hotelId}`);

    const params = {
      hotelIds: hotelId,
    };

    console.log('   🔍 搜索参数:', JSON.stringify(params, null, 2));

    await delay(1000);

    const response = await amadeus.referenceData.locations.hotels.byHotels.get(params);

    if (response.data && Array.isArray(response.data)) {
      console.log(`   📊 找到 ${response.data.length} 个酒店`);
      
      if (response.data.length > 0) {
        const firstHotel = response.data[0];
        console.log('   🏨 酒店信息:', JSON.stringify({
          hotelId: firstHotel.hotelId,
          name: firstHotel.name,
        }, null, 2));

        addTestResult('酒店ID搜索', 'passed', `成功找到 ${response.data.length} 个酒店`, {
          hotelId,
          hotelsFound: response.data.length,
          sampleHotel: {
            hotelId: firstHotel.hotelId,
            name: firstHotel.name,
          },
        }, params, {
          status: 'success',
          dataCount: response.data.length,
        });
      } else {
        addTestResult('酒店ID搜索', 'warning', '搜索成功但未找到酒店（可能是测试环境数据问题）');
      }
    } else {
      addTestResult('酒店ID搜索', 'failed', 'API响应格式错误：缺少data数组');
    }
  } catch (error) {
    let errorMessage = error.description || error.message;
    if (error.code) {
      errorMessage += ` (code: ${error.code})`;
    }
    if (error.statusCode) {
      errorMessage += ` (HTTP ${error.statusCode})`;
    }
    console.error('   错误详情:', error);
    addTestResult('酒店ID搜索', 'failed', errorMessage);
  }
}

/**
 * 测试 4: 酒店报价搜索
 */
async function testHotelOffersSearch() {
  console.log('\n🏨 测试 4: 酒店报价搜索 (hotelOffersSearch)');
  console.log('─'.repeat(60));

  try {
    await delay(1000); // 避免频率限制

    // 先获取酒店ID列表
    const geocodeResponse = await amadeus.referenceData.locations.hotels.byGeocode.get({
      latitude: 40.7128,
      longitude: -74.0060,
      radius: 5,
      hotelSource: 'ALL',
    });

    if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
      addTestResult('酒店报价搜索', 'warning', '无法获取酒店ID（地理坐标搜索无结果），跳过此测试');
      return;
    }

    // 获取前5个酒店ID
    const hotelIds = geocodeResponse.data.slice(0, 5).map(h => h.hotelId).filter(Boolean);
    
    if (hotelIds.length === 0) {
      addTestResult('酒店报价搜索', 'warning', '无法从搜索结果中提取酒店ID，跳过此测试');
      return;
    }

    console.log(`   🏨 使用 ${hotelIds.length} 个酒店ID: ${hotelIds.join(', ')}`);

    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + 30);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 2);

    // SDK 使用方式：hotelIds 可以是逗号分隔的字符串
    const params = {
      hotelIds: hotelIds.join(','), // SDK 需要逗号分隔的字符串
      checkInDate: checkInDate.toISOString().split('T')[0],
      checkOutDate: checkOutDate.toISOString().split('T')[0],
      adults: '1',
      roomQuantity: '1',
      currencyCode: 'USD',
    };

    console.log('   🔍 搜索参数:', JSON.stringify(params, null, 2));

    await delay(1000);

    const response = await amadeus.shopping.hotelOffersSearch.get(params);

    if (response.data && Array.isArray(response.data)) {
      console.log(`   📊 找到 ${response.data.length} 个酒店报价`);
      
      if (response.data.length > 0) {
        const firstHotel = response.data[0];
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

        addTestResult('酒店报价搜索', 'passed', `成功搜索到 ${response.data.length} 个酒店报价`, {
          hotelsFound: response.data.length,
          hotelIdsUsed: hotelIds,
          hotelStructure,
          sampleHotel: {
            hotelId: firstHotel.hotel?.hotelId,
            name: firstHotel.hotel?.name,
            offersCount: firstHotel.offers?.length || 0,
          },
        }, params, {
          status: 'success',
          dataCount: response.data.length,
        });
      } else {
        addTestResult('酒店报价搜索', 'warning', '搜索成功但未找到报价（可能是测试环境数据问题或酒店已满员）');
      }
    } else {
      addTestResult('酒店报价搜索', 'failed', 'API响应格式错误：缺少data数组');
    }
  } catch (error) {
    let errorMessage = error.description || error.message;
    if (error.code) {
      errorMessage += ` (code: ${error.code})`;
    }
    if (error.statusCode) {
      errorMessage += ` (HTTP ${error.statusCode})`;
    }
    console.error('   错误详情:', error);
    addTestResult('酒店报价搜索', 'failed', errorMessage);
  }
}

/**
 * 测试 5: 酒店报价价格确认
 */
async function testHotelOfferPrice() {
  console.log('\n🏨 测试 5: 酒店报价价格确认 (hotelOfferSearch)');
  console.log('─'.repeat(60));

  try {
    await delay(1000); // 避免频率限制

    // 先获取一个报价ID
    const geocodeResponse = await amadeus.referenceData.locations.hotels.byGeocode.get({
      latitude: 40.7128,
      longitude: -74.0060,
      radius: 5,
      hotelSource: 'ALL',
    });

    if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
      addTestResult('价格确认', 'warning', '无法获取酒店ID（地理坐标搜索无结果），跳过此测试');
      return;
    }

    const hotelIds = geocodeResponse.data.slice(0, 5).map(h => h.hotelId).filter(Boolean);
    
    if (hotelIds.length === 0) {
      addTestResult('价格确认', 'warning', '无法从搜索结果中提取酒店ID，跳过此测试');
      return;
    }

    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + 30);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 2);

    await delay(1000);

    const searchResponse = await amadeus.shopping.hotelOffersSearch.get({
      hotelIds: hotelIds.join(','),
      checkInDate: checkInDate.toISOString().split('T')[0],
      checkOutDate: checkOutDate.toISOString().split('T')[0],
      adults: '1',
      roomQuantity: '1',
      currencyCode: 'USD',
    });

    if (!searchResponse.data || searchResponse.data.length === 0) {
      addTestResult('价格确认', 'warning', '无法获取报价ID（搜索无结果），跳过此测试');
      return;
    }

    const firstHotel = searchResponse.data[0];
    if (!firstHotel.offers || firstHotel.offers.length === 0) {
      addTestResult('价格确认', 'warning', '酒店没有可用报价，跳过此测试');
      return;
    }

    const offerId = firstHotel.offers[0].id;
    if (!offerId) {
      addTestResult('价格确认', 'warning', '无法从报价中提取ID，跳过此测试');
      return;
    }

    console.log(`   🎫 使用报价ID: ${offerId}`);

    await delay(1000);

    // SDK 使用方式：hotelOfferSearch(offerId).get()
    const response = await amadeus.shopping.hotelOfferSearch(offerId).get();

    if (response.data && response.data) {
      const priceData = response.data;
      console.log('   💰 价格信息:', JSON.stringify({
        total: priceData.price?.total,
        currency: priceData.price?.currency,
        base: priceData.price?.base,
      }, null, 2));

      addTestResult('价格确认', 'passed', '成功确认酒店价格', {
        offerId,
        price: priceData.price,
      }, { offerId }, {
        status: 'success',
        price: priceData.price,
      });
    } else {
      addTestResult('价格确认', 'failed', 'API响应格式错误');
    }
  } catch (error) {
    let errorMessage = error.description || error.message;
    if (error.code) {
      errorMessage += ` (code: ${error.code})`;
    }
    if (error.statusCode) {
      errorMessage += ` (HTTP ${error.statusCode})`;
    }
    console.error('   错误详情:', error);
    addTestResult('价格确认', 'failed', errorMessage);
  }
}

/**
 * 测试 6: 酒店评分查询
 */
async function testHotelRatings() {
  console.log('\n⭐ 测试 6: 酒店评分查询 (hotelSentiments)');
  console.log('─'.repeat(60));

  try {
    await delay(1000); // 避免频率限制

    // 先获取酒店ID列表
    const geocodeResponse = await amadeus.referenceData.locations.hotels.byGeocode.get({
      latitude: 40.7128,
      longitude: -74.0060,
      radius: 5,
      hotelSource: 'ALL',
    });

    if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
      addTestResult('酒店评分', 'warning', '无法获取酒店ID（地理坐标搜索无结果），跳过此测试');
      return;
    }

    const hotelIds = geocodeResponse.data.slice(0, 3).map(h => h.hotelId).filter(Boolean);
    
    if (hotelIds.length === 0) {
      addTestResult('酒店评分', 'warning', '无法从搜索结果中提取酒店ID，跳过此测试');
      return;
    }

    const hotelIdsParam = hotelIds.join(',');
    console.log(`   🏨 查询酒店ID: ${hotelIdsParam}`);

    const params = {
      hotelIds: hotelIdsParam, // SDK 需要逗号分隔的字符串
    };

    console.log('   🔍 搜索参数:', JSON.stringify(params, null, 2));

    await delay(1000);

    const response = await amadeus.eReputation.hotelSentiments.get(params);

    // SDK 返回格式：response.data 可能是数组或对象
    const ratingsData = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);
    
    if (ratingsData.length > 0 || (response.data && typeof response.data === 'object')) {
      // 检查是否是空数组或空对象
      const isEmpty = Array.isArray(response.data) && response.data.length === 0;
      
      if (!isEmpty && ratingsData.length > 0) {
        const firstRating = ratingsData[0];
        console.log(`   📊 找到 ${ratingsData.length} 个酒店的评分`);
        console.log('   ⭐ 第一个评分:', JSON.stringify({
          hotelId: firstRating.hotelId,
          overallRating: firstRating.overallRating,
        }, null, 2));

        addTestResult('酒店评分', 'passed', `成功获取 ${ratingsData.length} 个酒店的评分`, {
          hotelIds: hotelIds,
          ratingsFound: ratingsData.length,
          sampleRating: {
            hotelId: firstRating.hotelId,
            overallRating: firstRating.overallRating,
          },
        }, params, {
          status: 'success',
          dataCount: ratingsData.length,
        });
      } else {
        // 空响应也视为成功（测试环境可能没有数据）
        console.log('   ⚠️  查询成功但未找到评分数据（可能是测试环境数据问题）');
        addTestResult('酒店评分', 'warning', '查询成功但未找到评分数据（可能是测试环境数据问题）', {
          hotelIds: hotelIds,
          response: response.data,
        }, params, {
          status: 'success',
          dataCount: 0,
        });
      }
    } else {
      // 检查响应结构
      console.log('   📋 响应结构:', JSON.stringify({
        hasData: !!response.data,
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        responseKeys: response.data ? Object.keys(response.data) : [],
      }, null, 2));
      
      // 即使没有数据，API调用成功也算通过
      addTestResult('酒店评分', 'warning', 'API调用成功但未找到评分数据（可能是测试环境数据问题）', {
        hotelIds: hotelIds,
        responseStructure: {
          hasData: !!response.data,
          dataType: typeof response.data,
          isArray: Array.isArray(response.data),
        },
      }, params, {
        status: 'success',
        dataCount: 0,
      });
    }
  } catch (error) {
    let errorMessage = error.description || error.message;
    if (error.code) {
      errorMessage += ` (code: ${error.code})`;
    }
    if (error.statusCode) {
      errorMessage += ` (HTTP ${error.statusCode})`;
    }
    console.error('   错误详情:', error);
    addTestResult('酒店评分', 'failed', errorMessage);
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Amadeus SDK 酒店 API 连接和功能测试');
  console.log('='.repeat(60));

  // 检查 SDK 是否安装
  try {
    require.resolve('amadeus');
  } catch (error) {
    console.error('\n❌ 错误: amadeus SDK 未安装');
    console.error('请先运行: npm install amadeus --save');
    process.exit(1);
  }

  // 初始化 SDK
  console.log('\n📋 测试 0: SDK 初始化');
  console.log('─'.repeat(60));
  if (!initializeSdk()) {
    console.error('\n❌ SDK 初始化失败，无法继续测试');
    process.exit(1);
  }
  addTestResult('SDK初始化', 'passed', 'SDK 初始化成功');

  // 运行所有测试
  await testHotelsByGeocode();
  await testHotelsByCity();
  await testHotelsByHotels();
  await testHotelOffersSearch();
  await testHotelOfferPrice();
  await testHotelRatings();

  // 生成报告
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试报告摘要');
  console.log('='.repeat(60));
  console.log(`总测试数: ${testResults.summary.total}`);
  console.log(`✅ 通过: ${testResults.summary.passed}`);
  console.log(`❌ 失败: ${testResults.summary.failed}`);
  console.log(`⚠️  警告: ${testResults.summary.warnings}`);
  console.log(`环境: ${testResults.environment}`);
  console.log(`时间: ${testResults.timestamp}`);

  // 保存报告
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const jsonPath = path.join(logsDir, `hotel-sdk-test-report-${timestamp}.json`);
  const mdPath = path.join(logsDir, `hotel-sdk-test-report-${timestamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 JSON 报告已保存: ${jsonPath}`);

  // 生成 Markdown 报告
  let mdReport = `# Amadeus SDK 酒店 API 测试报告\n\n`;
  mdReport += `**测试日期**: ${new Date(testResults.timestamp).toLocaleString('zh-CN')}\n`;
  mdReport += `**测试环境**: ${testResults.environment}\n`;
  mdReport += `**SDK版本**: ${require('amadeus/package.json').version || 'unknown'}\n\n`;
  mdReport += `## 测试摘要\n\n`;
  mdReport += `| 项目 | 数量 |\n`;
  mdReport += `|------|------|\n`;
  mdReport += `| 总测试数 | ${testResults.summary.total} |\n`;
  mdReport += `| ✅ 通过 | ${testResults.summary.passed} |\n`;
  mdReport += `| ❌ 失败 | ${testResults.summary.failed} |\n`;
  mdReport += `| ⚠️ 警告 | ${testResults.summary.warnings} |\n\n`;
  mdReport += `## 详细测试结果\n\n`;

  testResults.tests.forEach((test, index) => {
    mdReport += `### ${index + 1}. ${test.name}\n\n`;
    mdReport += `- **状态**: ${test.status === 'passed' ? '✅ 通过' : test.status === 'failed' ? '❌ 失败' : '⚠️ 警告'}\n`;
    mdReport += `- **消息**: ${test.message}\n`;
    
    if (test.data) {
      mdReport += `- **数据**: \`\`\`json\n${JSON.stringify(test.data, null, 2)}\n\`\`\`\n`;
    }
    
    if (test.request) {
      mdReport += `- **请求参数**: \`\`\`json\n${JSON.stringify(test.request, null, 2)}\n\`\`\`\n`;
    }
    
    if (test.response) {
      mdReport += `- **响应**: \`\`\`json\n${JSON.stringify(test.response, null, 2)}\n\`\`\`\n`;
    }
    
    mdReport += '\n';
  });

  fs.writeFileSync(mdPath, mdReport);
  console.log(`📄 Markdown 报告已保存: ${mdPath}`);

  if (testResults.summary.failed > 0) {
    console.log('\n❌ 部分测试失败，请检查报告');
    process.exit(1);
  } else {
    console.log('\n✅ 所有测试通过！');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('\n❌ 测试运行失败:', error);
  process.exit(1);
});

