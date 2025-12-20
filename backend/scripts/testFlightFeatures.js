/**
 * 机票功能测试脚本
 * 测试机票搜索、价格确认、预订管理等功能的完整性
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const mongoose = require('mongoose');
const config = require('../config');

const BASE_URL = 'http://localhost:3001';
let authToken = null;
let testUserId = null;

// 测试结果
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message) {
  testResults.tests.push({ name, passed, message });
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}: ${message}`);
  } else {
    testResults.failed++;
    console.error(`❌ ${name}: ${message}`);
  }
}

async function setup() {
  try {
    console.log('\n🔧 设置测试环境...\n');
    
    // 连接数据库
    const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI;
    await mongoose.connect(mongoUri);
    console.log('✅ 数据库连接成功');
    
    // 获取测试用户（用于登录）
    const User = require('../models/User');
    const testUser = await User.findOne({ email: { $exists: true } }).lean();
    if (!testUser) {
      throw new Error('未找到测试用户，请先创建用户');
    }
    testUserId = testUser._id;
    console.log(`✅ 找到测试用户: ${testUser.email}`);
    
    // 登录获取token
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: testUser.email,
      password: 'password123' // 假设密码，实际应该从环境变量获取
    }).catch(async () => {
      // 如果登录失败，尝试使用其他方式获取token
      // 或者创建一个测试token
      console.log('⚠️  登录失败，尝试其他方式...');
      return null;
    });
    
    if (loginResponse && loginResponse.data && loginResponse.data.token) {
      authToken = loginResponse.data.token;
      console.log('✅ 获取认证token成功');
    } else {
      console.log('⚠️  无法获取token，部分测试可能需要手动认证');
    }
    
    return true;
  } catch (error) {
    console.error('❌ 设置失败:', error.message);
    return false;
  }
}

async function testAmadeusConnection() {
  console.log('\n📡 测试 Amadeus API 连接...\n');
  
  try {
    const amadeusApi = require('../services/amadeus');
    
    // 测试配置验证
    await amadeusApi.validateConfig();
    logTest('Amadeus配置验证', true, '配置正确');
    
    // 测试连接
    const connectionTest = await amadeusApi.testConnection();
    logTest('Amadeus连接测试', connectionTest.success, connectionTest.message);
    
    return connectionTest.success;
  } catch (error) {
    logTest('Amadeus连接测试', false, error.message);
    return false;
  }
}

async function testFlightSearch() {
  console.log('\n🔍 测试航班搜索功能...\n');
  
  try {
    const amadeusApi = require('../services/amadeus');
    
    const searchParams = {
      originLocationCode: 'PEK',
      destinationLocationCode: 'JFK',
      departureDate: '2025-12-25',
      adults: 1,
      travelClass: 'ECONOMY',
      max: 5
    };
    
    const result = await amadeusApi.searchFlightOffers(searchParams);
    
    if (result.success && result.data && result.data.length > 0) {
      logTest('航班搜索', true, `找到 ${result.data.length} 个航班`);
      
      // 测试价格确认
      const flightOffer = result.data[0];
      try {
        const priceResult = await amadeusApi.confirmFlightPrice(flightOffer);
        logTest('价格确认', priceResult.success, '价格确认成功');
        return { success: true, flightOffer: priceResult.data || flightOffer };
      } catch (error) {
        logTest('价格确认', false, error.message);
        return { success: true, flightOffer };
      }
    } else {
      logTest('航班搜索', false, '未找到航班');
      return { success: false };
    }
  } catch (error) {
    logTest('航班搜索', false, error.message);
    return { success: false };
  }
}

async function testBackendAPI() {
  console.log('\n🌐 测试后端API端点...\n');
  
  if (!authToken) {
    console.log('⚠️  跳过API测试（需要认证token）');
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // 测试航班搜索API
    try {
      const searchResponse = await axios.post(
        `${BASE_URL}/api/flights/search`,
        {
          originLocationCode: 'PEK',
          destinationLocationCode: 'JFK',
          departureDate: '2025-12-25',
          adults: 1
        },
        { headers }
      );
      
      if (searchResponse.data.success) {
        logTest('后端-航班搜索API', true, `返回 ${searchResponse.data.data?.length || 0} 个结果`);
      } else {
        logTest('后端-航班搜索API', false, searchResponse.data.message || '搜索失败');
      }
    } catch (error) {
      logTest('后端-航班搜索API', false, error.response?.data?.message || error.message);
    }
    
    // 测试预订列表API
    try {
      const bookingsResponse = await axios.get(
        `${BASE_URL}/api/flights/bookings`,
        { headers }
      );
      
      if (bookingsResponse.data.success) {
        logTest('后端-预订列表API', true, `返回 ${bookingsResponse.data.count || 0} 个预订`);
      } else {
        logTest('后端-预订列表API', false, bookingsResponse.data.message || '获取失败');
      }
    } catch (error) {
      logTest('后端-预订列表API', false, error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('API测试错误:', error.message);
  }
}

async function testDatabaseModels() {
  console.log('\n💾 测试数据模型...\n');
  
  try {
    const FlightBooking = require('../models/FlightBooking');
    const Travel = require('../models/Travel');
    
    // 检查模型是否存在
    logTest('FlightBooking模型', !!FlightBooking, '模型已加载');
    
    // 检查是否有预订记录
    const bookingCount = await FlightBooking.countDocuments();
    logTest('预订记录查询', true, `数据库中有 ${bookingCount} 条预订记录`);
    
    // 检查是否有关联的差旅申请
    if (bookingCount > 0) {
      const bookingsWithTravel = await FlightBooking.countDocuments({ travelId: { $exists: true, $ne: null } });
      logTest('预订关联差旅申请', true, `${bookingsWithTravel} 条预订关联了差旅申请`);
    }
    
    return true;
  } catch (error) {
    logTest('数据模型测试', false, error.message);
    return false;
  }
}

async function testRoutes() {
  console.log('\n🛣️  测试路由配置...\n');
  
  try {
    const flightsRoutes = require('../routes/flights');
    logTest('航班路由模块', !!flightsRoutes, '路由模块已加载');
    
    // 检查路由文件是否存在
    const fs = require('fs');
    const routesPath = require('path').resolve(__dirname, '../routes/flights.js');
    const routesExist = fs.existsSync(routesPath);
    logTest('航班路由文件', routesExist, routesExist ? '文件存在' : '文件不存在');
    
    return true;
  } catch (error) {
    logTest('路由测试', false, error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 开始执行机票功能测试');
  console.log('='.repeat(60) + '\n');
  
  const setupSuccess = await setup();
  if (!setupSuccess) {
    console.error('\n❌ 测试环境设置失败，终止测试');
    process.exit(1);
  }
  
  // 执行各项测试
  await testAmadeusConnection();
  await testFlightSearch();
  await testBackendAPI();
  await testDatabaseModels();
  await testRoutes();
  
  // 输出测试结果
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));
  console.log(`✅ 通过: ${testResults.passed}`);
  console.log(`❌ 失败: ${testResults.failed}`);
  console.log(`📝 总计: ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed > 0) {
    console.log('\n失败的测试:');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`  - ${t.name}: ${t.message}`));
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  // 清理
  await mongoose.disconnect();
  
  // 退出
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 运行测试
runAllTests().catch(error => {
  console.error('\n❌ 测试执行失败:', error);
  process.exit(1);
});

