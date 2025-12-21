/**
 * 酒店 API 端点测试脚本
 * 测试后端 API 端点是否正常工作
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'admin@company.com',
  password: process.env.TEST_USER_PASSWORD || '123456',
};

// 测试结果存储
const testResults = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
  },
};

let authToken = null;

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

/**
 * 登录获取 Token
 */
async function login() {
  try {
    console.log('\n🔐 登录获取认证 Token');
    console.log('─'.repeat(60));

    // 尝试多个可能的测试账号（优先使用配置的账号）
    const testAccounts = [
      { email: TEST_USER.email, password: TEST_USER.password },
      { email: 'admin@company.com', password: '123456' },
      { email: 'admin@company.com', password: 'admin123456' },
      { email: 'admin@example.com', password: 'admin123' },
      { email: 'test@example.com', password: 'test123' },
    ];

    for (const account of testAccounts) {
      try {
        console.log(`   🔍 尝试登录: ${account.email}`);
        const response = await axios.post(`${BASE_URL}/api/auth/login`, account, {
          timeout: 5000,
          validateStatus: () => true, // 不抛出错误，手动处理
        });

        if (response.status === 200 && response.data.success && response.data.token) {
          authToken = response.data.token;
          console.log(`   ✅ 登录成功: ${account.email}`);
          addTestResult('登录', 'passed', `成功获取认证 Token (${account.email})`);
          return true;
        }
      } catch (error) {
        // 继续尝试下一个账号
        if (error.response?.status === 401) {
          console.log(`   ⚠️  登录失败: ${account.email} - ${error.response?.data?.message || 'Invalid credentials'}`);
        }
        continue;
      }
    }

    // 所有账号都失败
    throw new Error('所有测试账号登录失败，请检查用户凭据或设置环境变量 TEST_USER_EMAIL 和 TEST_USER_PASSWORD');
  } catch (error) {
    console.error('   ❌ 登录失败:', error.message);
    addTestResult('登录', 'failed', error.message);
    return false;
  }
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 测试 1: 通过地理坐标搜索酒店
 */
async function testSearchHotelsByGeocode() {
  console.log('\n🏨 测试 1: POST /api/hotels/search-by-geocode');
  console.log('─'.repeat(60));

  try {
    const requestData = {
      latitude: 40.7128,
      longitude: -74.0060,
      radius: 5,
      hotelSource: 'ALL',
    };

    console.log('   🔍 请求参数:', JSON.stringify(requestData, null, 2));

    const response = await axios.post(
      `${BASE_URL}/api/hotels/search-by-geocode`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.success && response.data.data) {
      console.log(`   📊 找到 ${response.data.count || response.data.data.length} 个酒店`);
      addTestResult('地理坐标搜索', 'passed', `成功找到 ${response.data.count || response.data.data.length} 个酒店`, {
        hotelsFound: response.data.count || response.data.data.length,
      }, requestData, {
        status: response.status,
        success: response.data.success,
      });
    } else {
      addTestResult('地理坐标搜索', 'failed', 'API响应格式错误');
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    const status = error.response?.status || 500;
    console.error(`   ❌ 错误 (HTTP ${status}):`, errorMessage);
    addTestResult('地理坐标搜索', 'failed', errorMessage, null, null, {
      status,
      error: error.response?.data,
    });
  }
}

/**
 * 测试 2: 通过城市搜索酒店
 */
async function testSearchHotelsByCity() {
  console.log('\n🏨 测试 2: POST /api/hotels/search-by-city');
  console.log('─'.repeat(60));

  try {
    await delay(1000);

    const requestData = {
      cityCode: 'NYC',
      hotelSource: 'ALL',
    };

    console.log('   🔍 请求参数:', JSON.stringify(requestData, null, 2));

    const response = await axios.post(
      `${BASE_URL}/api/hotels/search-by-city`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.success && response.data.data) {
      console.log(`   📊 找到 ${response.data.count || response.data.data.length} 个酒店`);
      addTestResult('城市搜索', 'passed', `成功找到 ${response.data.count || response.data.data.length} 个酒店`, {
        hotelsFound: response.data.count || response.data.data.length,
      }, requestData, {
        status: response.status,
        success: response.data.success,
      });
    } else {
      addTestResult('城市搜索', 'failed', 'API响应格式错误');
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    const status = error.response?.status || 500;
    console.error(`   ❌ 错误 (HTTP ${status}):`, errorMessage);
    addTestResult('城市搜索', 'failed', errorMessage, null, null, {
      status,
      error: error.response?.data,
    });
  }
}

/**
 * 测试 3: 搜索酒店报价
 */
async function testSearchHotelOffers() {
  console.log('\n🏨 测试 3: POST /api/hotels/search-offers');
  console.log('─'.repeat(60));

  try {
    await delay(1000);

    // 先获取酒店ID列表
    const geocodeResponse = await axios.post(
      `${BASE_URL}/api/hotels/search-by-geocode`,
      {
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 5,
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!geocodeResponse.data.success || !geocodeResponse.data.data || geocodeResponse.data.data.length === 0) {
      addTestResult('搜索报价', 'warning', '无法获取酒店ID（地理坐标搜索无结果），跳过此测试');
      return;
    }

    const hotelIds = geocodeResponse.data.data.slice(0, 5).map(h => h.hotelId).filter(Boolean);
    
    if (hotelIds.length === 0) {
      addTestResult('搜索报价', 'warning', '无法从搜索结果中提取酒店ID，跳过此测试');
      return;
    }

    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + 30);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 2);

    const requestData = {
      hotelIds: hotelIds,
      checkInDate: checkInDate.toISOString().split('T')[0],
      checkOutDate: checkOutDate.toISOString().split('T')[0],
      adults: 1,
      roomQuantity: 1,
      currencyCode: 'USD',
    };

    console.log('   🔍 请求参数:', JSON.stringify({
      ...requestData,
      hotelIds: `${hotelIds.length} 个酒店ID`,
    }, null, 2));

    await delay(1000);

    const response = await axios.post(
      `${BASE_URL}/api/hotels/search-offers`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.success && response.data.data) {
      console.log(`   📊 找到 ${response.data.count || response.data.data.length} 个酒店报价`);
      addTestResult('搜索报价', 'passed', `成功搜索到 ${response.data.count || response.data.data.length} 个酒店报价`, {
        offersFound: response.data.count || response.data.data.length,
      }, requestData, {
        status: response.status,
        success: response.data.success,
      });
    } else {
      addTestResult('搜索报价', 'failed', 'API响应格式错误');
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    const status = error.response?.status || 500;
    console.error(`   ❌ 错误 (HTTP ${status}):`, errorMessage);
    addTestResult('搜索报价', 'failed', errorMessage, null, null, {
      status,
      error: error.response?.data,
    });
  }
}

/**
 * 测试 4: 确认酒店价格
 */
async function testConfirmPrice() {
  console.log('\n🏨 测试 4: POST /api/hotels/confirm-price');
  console.log('─'.repeat(60));

  try {
    await delay(1000);

    // 先获取一个报价ID
    const geocodeResponse = await axios.post(
      `${BASE_URL}/api/hotels/search-by-geocode`,
      {
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 5,
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!geocodeResponse.data.success || !geocodeResponse.data.data || geocodeResponse.data.data.length === 0) {
      addTestResult('确认价格', 'warning', '无法获取酒店ID（地理坐标搜索无结果），跳过此测试');
      return;
    }

    const hotelIds = geocodeResponse.data.data.slice(0, 5).map(h => h.hotelId).filter(Boolean);
    
    if (hotelIds.length === 0) {
      addTestResult('确认价格', 'warning', '无法从搜索结果中提取酒店ID，跳过此测试');
      return;
    }

    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + 30);
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + 2);

    await delay(1000);

    const searchResponse = await axios.post(
      `${BASE_URL}/api/hotels/search-offers`,
      {
        hotelIds: hotelIds,
        checkInDate: checkInDate.toISOString().split('T')[0],
        checkOutDate: checkOutDate.toISOString().split('T')[0],
        adults: 1,
        roomQuantity: 1,
        currencyCode: 'USD',
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!searchResponse.data.success || !searchResponse.data.data || searchResponse.data.data.length === 0) {
      addTestResult('确认价格', 'warning', '无法获取报价ID（搜索无结果），跳过此测试');
      return;
    }

    const firstHotel = searchResponse.data.data[0];
    if (!firstHotel.offers || firstHotel.offers.length === 0) {
      addTestResult('确认价格', 'warning', '酒店没有可用报价，跳过此测试');
      return;
    }

    const offerId = firstHotel.offers[0].id;
    if (!offerId) {
      addTestResult('确认价格', 'warning', '无法从报价中提取ID，跳过此测试');
      return;
    }

    console.log(`   🎫 使用报价ID: ${offerId}`);

    const requestData = {
      offerId,
    };

    await delay(1000);

    const response = await axios.post(
      `${BASE_URL}/api/hotels/confirm-price`,
      requestData,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.success && response.data.data) {
      console.log('   💰 价格确认成功');
      addTestResult('确认价格', 'passed', '成功确认酒店价格', {
        offerId,
      }, requestData, {
        status: response.status,
        success: response.data.success,
      });
    } else {
      addTestResult('确认价格', 'failed', 'API响应格式错误');
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    const status = error.response?.status || 500;
    console.error(`   ❌ 错误 (HTTP ${status}):`, errorMessage);
    addTestResult('确认价格', 'failed', errorMessage, null, null, {
      status,
      error: error.response?.data,
    });
  }
}

/**
 * 测试 5: 获取酒店评分
 */
async function testGetHotelRatings() {
  console.log('\n⭐ 测试 5: GET /api/hotels/ratings');
  console.log('─'.repeat(60));

  try {
    await delay(1000);

    // 先获取酒店ID列表
    const geocodeResponse = await axios.post(
      `${BASE_URL}/api/hotels/search-by-geocode`,
      {
        latitude: 40.7128,
        longitude: -74.0060,
        radius: 5,
      },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!geocodeResponse.data.success || !geocodeResponse.data.data || geocodeResponse.data.data.length === 0) {
      addTestResult('获取评分', 'warning', '无法获取酒店ID（地理坐标搜索无结果），跳过此测试');
      return;
    }

    const hotelIds = geocodeResponse.data.data.slice(0, 3).map(h => h.hotelId).filter(Boolean);
    
    if (hotelIds.length === 0) {
      addTestResult('获取评分', 'warning', '无法从搜索结果中提取酒店ID，跳过此测试');
      return;
    }

    const hotelIdsParam = hotelIds.join(',');
    console.log(`   🏨 查询酒店ID: ${hotelIdsParam}`);

    await delay(1000);

    const response = await axios.get(
      `${BASE_URL}/api/hotels/ratings`,
      {
        params: {
          hotelIds: hotelIdsParam,
        },
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (response.data.success) {
      console.log(`   📊 获取到 ${response.data.count || 0} 个酒店的评分`);
      addTestResult('获取评分', 'passed', `成功获取 ${response.data.count || 0} 个酒店的评分`, {
        ratingsFound: response.data.count || 0,
      }, { hotelIds: hotelIdsParam }, {
        status: response.status,
        success: response.data.success,
      });
    } else {
      addTestResult('获取评分', 'failed', 'API响应格式错误');
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    const status = error.response?.status || 500;
    console.error(`   ❌ 错误 (HTTP ${status}):`, errorMessage);
    addTestResult('获取评分', 'failed', errorMessage, null, null, {
      status,
      error: error.response?.data,
    });
  }
}

/**
 * 测试 6: 获取预订列表
 */
async function testGetBookings() {
  console.log('\n📋 测试 6: GET /api/hotels/bookings');
  console.log('─'.repeat(60));

  try {
    await delay(1000);

    const response = await axios.get(
      `${BASE_URL}/api/hotels/bookings`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (response.data.success) {
      console.log(`   📊 找到 ${response.data.count || 0} 个预订`);
      addTestResult('获取预订列表', 'passed', `成功获取 ${response.data.count || 0} 个预订`, {
        bookingsFound: response.data.count || 0,
      }, null, {
        status: response.status,
        success: response.data.success,
      });
    } else {
      addTestResult('获取预订列表', 'failed', 'API响应格式错误');
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    const status = error.response?.status || 500;
    console.error(`   ❌ 错误 (HTTP ${status}):`, errorMessage);
    addTestResult('获取预订列表', 'failed', errorMessage, null, null, {
      status,
      error: error.response?.data,
    });
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 酒店 API 端点测试');
  console.log('='.repeat(60));
  console.log(`📍 API Base URL: ${BASE_URL}`);
  console.log(`👤 测试用户: ${TEST_USER.email}`);

  // 登录获取 Token
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('\n❌ 登录失败，无法继续测试');
    process.exit(1);
  }

  // 运行所有测试
  await testSearchHotelsByGeocode();
  await testSearchHotelsByCity();
  await testSearchHotelOffers();
  await testConfirmPrice();
  await testGetHotelRatings();
  await testGetBookings();

  // 生成报告
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试报告摘要');
  console.log('='.repeat(60));
  console.log(`总测试数: ${testResults.summary.total}`);
  console.log(`✅ 通过: ${testResults.summary.passed}`);
  console.log(`❌ 失败: ${testResults.summary.failed}`);
  console.log(`⚠️  警告: ${testResults.summary.warnings}`);

  // 保存报告
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const jsonPath = path.join(logsDir, `hotel-api-endpoints-test-${timestamp}.json`);
  const mdPath = path.join(logsDir, `hotel-api-endpoints-test-${timestamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 JSON 报告已保存: ${jsonPath}`);

  // 生成 Markdown 报告
  let mdReport = `# 酒店 API 端点测试报告\n\n`;
  mdReport += `**测试日期**: ${new Date(testResults.timestamp).toLocaleString('zh-CN')}\n`;
  mdReport += `**API Base URL**: ${testResults.baseUrl}\n\n`;
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

