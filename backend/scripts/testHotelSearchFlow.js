/**
 * 酒店搜索和预订流程完整测试脚本
 * 测试从搜索到预订的完整流程，查看最终结果
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
let authToken = '';

// 测试结果收集
const testResults = [];

function addTestResult(testName, status, message, data = null) {
  testResults.push({
    testName,
    status,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 登录获取认证Token
 */
async function login() {
  console.log('\n🔐 登录获取认证 Token');
  console.log('─'.repeat(60));

  const testUsers = [
    { email: 'admin@company.com', password: '123456' },
    { email: 'admin@example.com', password: 'password123' },
  ];

  for (const user of testUsers) {
    try {
      console.log(`   🔍 尝试登录: ${user.email}`);
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: user.email,
        password: user.password,
      });

      if (response.data.success && response.data.token) {
        authToken = response.data.token;
        console.log(`   ✅ 登录成功: ${user.email}`);
        addTestResult('登录', 'passed', `成功获取认证 Token (${user.email})`);
        return true;
      }
    } catch (error) {
      console.log(`   ❌ 登录失败 (${user.email}): ${error.response?.data?.message || error.message}`);
    }
  }

  const errorMessage = '所有测试账号登录失败';
  console.error(`   ❌ ${errorMessage}`);
  addTestResult('登录', 'failed', errorMessage);
  return false;
}

/**
 * 测试1: 按城市搜索酒店
 */
async function testSearchHotelsByCity() {
  console.log('\n🏨 测试 1: 按城市搜索酒店');
  console.log('─'.repeat(60));

  try {
    const response = await axios.post(
      `${BASE_URL}/api/hotels/search-by-city`,
      {
        cityCode: 'BJS', // 北京
        hotelSource: 'ALL',
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (response.data.success && response.data.data) {
      const hotels = response.data.data;
      console.log(`   ✅ 找到 ${hotels.length} 个酒店`);
      console.log(`   📋 前5个酒店:`, hotels.slice(0, 5).map(h => ({
        hotelId: h.hotelId,
        name: h.name,
        chainCode: h.chainCode,
      })));

      addTestResult('按城市搜索酒店', 'passed', `找到 ${hotels.length} 个酒店`, {
        total: hotels.length,
        sampleHotels: hotels.slice(0, 5),
      });

      return hotels;
    } else {
      throw new Error('搜索失败：响应格式错误');
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error(`   ❌ 搜索失败: ${errorMsg}`);
    addTestResult('按城市搜索酒店', 'failed', errorMsg);
    return null;
  }
}

/**
 * 测试2: 搜索酒店报价（分批查询）
 */
async function testSearchHotelOffers(hotels) {
  console.log('\n💰 测试 2: 搜索酒店报价（分批查询）');
  console.log('─'.repeat(60));

  if (!hotels || hotels.length === 0) {
    console.log('   ⚠️  没有酒店数据，跳过报价搜索');
    addTestResult('搜索酒店报价', 'skipped', '没有酒店数据');
    return null;
  }

  try {
    // 提取前50个酒店ID
    const hotelIds = hotels.slice(0, 50).map(h => h.hotelId).filter(Boolean);
    console.log(`   📋 准备查询 ${hotelIds.length} 个酒店的报价`);

    // 分批查询（每批20个）
    const BATCH_SIZE = 20;
    const batches = [];
    for (let i = 0; i < hotelIds.length; i += BATCH_SIZE) {
      batches.push(hotelIds.slice(i, i + BATCH_SIZE));
    }

    console.log(`   📦 分成 ${batches.length} 批查询`);

    const allOffers = [];
    let successBatches = 0;
    let failedBatches = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`   🔄 查询第 ${i + 1}/${batches.length} 批（${batch.length} 个酒店）...`);

      try {
        const response = await axios.post(
          `${BASE_URL}/api/hotels/search-offers`,
          {
            hotelIds: batch,
            checkInDate: '2025-12-22',
            checkOutDate: '2025-12-23',
            adults: 1,
            roomQuantity: 1,
            currencyCode: 'USD',
          },
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (response.data.success && response.data.data) {
          const offers = response.data.data || [];
          console.log(`      ✅ 找到 ${offers.length} 个报价`);
          allOffers.push(...offers);
          successBatches++;
        } else {
          console.log(`      ⚠️  无报价数据`);
          failedBatches++;
        }

        // 批次间延迟
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        console.log(`      ❌ 查询失败: ${errorMsg}`);
        failedBatches++;
      }
    }

    console.log(`\n   📊 汇总结果:`);
    console.log(`      - 总报价数: ${allOffers.length}`);
    console.log(`      - 成功批次: ${successBatches}/${batches.length}`);
    console.log(`      - 失败批次: ${failedBatches}/${batches.length}`);

    if (allOffers.length > 0) {
      console.log(`   🏨 前5个报价:`);
      allOffers.slice(0, 5).forEach((offer, index) => {
        console.log(`      ${index + 1}. ${offer.hotel?.name || '未知酒店'}`);
        console.log(`         价格: ${offer.offers?.[0]?.price?.total || 'N/A'} ${offer.offers?.[0]?.price?.currency || ''}`);
        console.log(`         酒店ID: ${offer.hotel?.hotelId || 'N/A'}`);
      });
    }

    addTestResult('搜索酒店报价', 'passed', `找到 ${allOffers.length} 个报价`, {
      totalOffers: allOffers.length,
      successBatches,
      failedBatches,
      totalBatches: batches.length,
      sampleOffers: allOffers.slice(0, 5),
    });

    return allOffers;
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error(`   ❌ 搜索失败: ${errorMsg}`);
    addTestResult('搜索酒店报价', 'failed', errorMsg);
    return null;
  }
}

/**
 * 测试3: 确认酒店价格
 */
async function testConfirmPrice(offers) {
  console.log('\n💵 测试 3: 确认酒店价格');
  console.log('─'.repeat(60));

  if (!offers || offers.length === 0) {
    console.log('   ⚠️  没有报价数据，跳过价格确认');
    addTestResult('确认酒店价格', 'skipped', '没有报价数据');
    return null;
  }

  try {
    // 使用第一个报价的offerId
    const firstOffer = offers[0];
    const offerId = firstOffer.offers?.[0]?.id;

    if (!offerId) {
      console.log('   ⚠️  报价中没有offerId，跳过价格确认');
      addTestResult('确认酒店价格', 'skipped', '报价中没有offerId');
      return null;
    }

    console.log(`   🔍 确认报价ID: ${offerId}`);
    console.log(`   🏨 酒店: ${firstOffer.hotel?.name || '未知'}`);

    const response = await axios.post(
      `${BASE_URL}/api/hotels/confirm-price`,
      { offerId },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (response.data.success && response.data.data) {
      const confirmedPrice = response.data.data;
      console.log(`   ✅ 价格确认成功`);
      console.log(`   💰 确认价格: ${confirmedPrice.offers?.[0]?.price?.total || 'N/A'} ${confirmedPrice.offers?.[0]?.price?.currency || ''}`);

      addTestResult('确认酒店价格', 'passed', '价格确认成功', {
        offerId,
        hotelName: firstOffer.hotel?.name,
        price: confirmedPrice.offers?.[0]?.price,
      });

      return confirmedPrice;
    } else {
      throw new Error('价格确认失败：响应格式错误');
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error(`   ❌ 价格确认失败: ${errorMsg}`);
    addTestResult('确认酒店价格', 'failed', errorMsg);
    return null;
  }
}

/**
 * 测试4: 查询酒店评分
 */
async function testGetHotelRatings(offers) {
  console.log('\n⭐ 测试 4: 查询酒店评分');
  console.log('─'.repeat(60));

  if (!offers || offers.length === 0) {
    console.log('   ⚠️  没有报价数据，跳过评分查询');
    addTestResult('查询酒店评分', 'skipped', '没有报价数据');
    return null;
  }

  try {
    // 获取前3个酒店的ID
    const hotelIds = offers.slice(0, 3).map(o => o.hotel?.hotelId).filter(Boolean);
    
    if (hotelIds.length === 0) {
      console.log('   ⚠️  无法提取酒店ID，跳过评分查询');
      addTestResult('查询酒店评分', 'skipped', '无法提取酒店ID');
      return null;
    }

    console.log(`   🔍 查询 ${hotelIds.length} 个酒店的评分`);

    const response = await axios.get(
      `${BASE_URL}/api/hotels/ratings?hotelIds=${hotelIds.join(',')}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (response.data.success) {
      const ratings = response.data.data || [];
      console.log(`   ✅ 查询成功`);
      console.log(`   📊 找到 ${ratings.length} 个酒店的评分数据`);

      if (ratings.length > 0) {
        ratings.forEach((rating, index) => {
          console.log(`      ${index + 1}. 酒店ID: ${rating.hotelId || 'N/A'}`);
          console.log(`         评分: ${rating.rating || 'N/A'}`);
        });
      } else {
        console.log(`   ⚠️  未找到评分数据（可能是测试环境数据问题）`);
      }

      addTestResult('查询酒店评分', 'passed', `查询成功，找到 ${ratings.length} 个评分`, {
        totalRatings: ratings.length,
        ratings,
      });

      return ratings;
    } else {
      throw new Error('查询失败：响应格式错误');
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error(`   ❌ 查询失败: ${errorMsg}`);
    addTestResult('查询酒店评分', 'failed', errorMsg);
    return null;
  }
}

/**
 * 生成测试报告
 */
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试报告');
  console.log('='.repeat(60));

  const passed = testResults.filter(r => r.status === 'passed').length;
  const failed = testResults.filter(r => r.status === 'failed').length;
  const skipped = testResults.filter(r => r.status === 'skipped').length;

  console.log(`\n✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`⏭️  跳过: ${skipped}`);
  console.log(`📋 总计: ${testResults.length}`);

  console.log('\n详细结果:');
  testResults.forEach((result, index) => {
    const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
    console.log(`\n${index + 1}. ${icon} ${result.testName}`);
    console.log(`   状态: ${result.status}`);
    console.log(`   消息: ${result.message}`);
    if (result.data) {
      console.log(`   数据:`, JSON.stringify(result.data, null, 2));
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('🎯 最终结果总结');
  console.log('='.repeat(60));

  const hotelSearchResult = testResults.find(r => r.testName === '按城市搜索酒店');
  const offersResult = testResults.find(r => r.testName === '搜索酒店报价');
  const priceResult = testResults.find(r => r.testName === '确认酒店价格');
  const ratingsResult = testResults.find(r => r.testName === '查询酒店评分');

  if (hotelSearchResult?.data) {
    console.log(`\n🏨 酒店搜索:`);
    console.log(`   - 找到 ${hotelSearchResult.data.total} 个酒店`);
  }

  if (offersResult?.data) {
    console.log(`\n💰 酒店报价:`);
    console.log(`   - 找到 ${offersResult.data.totalOffers} 个报价`);
    console.log(`   - 成功批次: ${offersResult.data.successBatches}/${offersResult.data.totalBatches}`);
    console.log(`   - 失败批次: ${offersResult.data.failedBatches}`);
  }

  if (priceResult?.data) {
    console.log(`\n💵 价格确认:`);
    console.log(`   - 酒店: ${priceResult.data.hotelName}`);
    console.log(`   - 价格: ${priceResult.data.price?.total} ${priceResult.data.price?.currency}`);
  }

  if (ratingsResult?.data) {
    console.log(`\n⭐ 酒店评分:`);
    console.log(`   - 找到 ${ratingsResult.data.totalRatings} 个评分`);
  }

  console.log('\n' + '='.repeat(60));
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('🚀 开始酒店搜索和预订流程测试');
  console.log('='.repeat(60));
  console.log(`📍 API地址: ${BASE_URL}`);
  console.log(`⏰ 开始时间: ${new Date().toLocaleString()}`);

  try {
    // 1. 登录
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.error('\n❌ 登录失败，无法继续测试');
      generateReport();
      process.exit(1);
    }

    // 2. 搜索酒店
    const hotels = await testSearchHotelsByCity();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. 搜索报价
    const offers = await testSearchHotelOffers(hotels);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. 确认价格
    const confirmedPrice = await testConfirmPrice(offers);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 5. 查询评分
    const ratings = await testGetHotelRatings(offers);

    // 生成报告
    generateReport();

    console.log(`\n⏰ 结束时间: ${new Date().toLocaleString()}`);
    console.log('\n✅ 测试完成！');

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    console.error(error.stack);
    generateReport();
    process.exit(1);
  }
}

// 运行测试
runTests();

