/**
 * 分析酒店报价数量少的原因
 * 详细检查每个酒店的报价情况
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.API_URL || 'http://localhost:3001';
let authToken = '';

/**
 * 登录获取认证Token
 */
async function login() {
  const response = await axios.post(`${BASE_URL}/api/auth/login`, {
    email: 'admin@company.com',
    password: '123456',
  });

  if (response.data.success && response.data.token) {
    authToken = response.data.token;
    return true;
  }
  return false;
}

/**
 * 分析单个酒店的报价情况
 */
async function analyzeSingleHotel(hotelId, checkInDate, checkOutDate) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/hotels/search-offers`,
      {
        hotelIds: [hotelId],
        checkInDate,
        checkOutDate,
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
      return {
        hotelId,
        hasOffers: offers.length > 0,
        offersCount: offers.length,
        offers: offers,
      };
    }
    return {
      hotelId,
      hasOffers: false,
      offersCount: 0,
      error: 'API响应格式错误',
    };
  } catch (error) {
    return {
      hotelId,
      hasOffers: false,
      offersCount: 0,
      error: error.response?.data?.message || error.message,
    };
  }
}

/**
 * 主分析函数
 */
async function analyze() {
  console.log('🔍 分析酒店报价数量少的原因');
  console.log('='.repeat(60));

  // 登录
  console.log('\n1. 登录...');
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('登录失败');
    return;
  }
  console.log('✅ 登录成功');

  // 搜索酒店
  console.log('\n2. 搜索北京酒店...');
  const hotelsResponse = await axios.post(
    `${BASE_URL}/api/hotels/search-by-city`,
    {
      cityCode: 'BJS',
      hotelSource: 'ALL',
    },
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  const hotels = hotelsResponse.data.data || [];
  console.log(`✅ 找到 ${hotels.length} 个酒店`);

  // 提取前50个酒店ID
  const hotelIds = hotels.slice(0, 50).map(h => h.hotelId).filter(Boolean);
  console.log(`📋 分析前 ${hotelIds.length} 个酒店`);

  // 测试参数
  const checkInDate = '2025-12-22';
  const checkOutDate = '2025-12-23';

  console.log(`\n3. 分析每个酒店的报价情况（日期: ${checkInDate} 至 ${checkOutDate}）...`);
  console.log('─'.repeat(60));

  const results = [];
  let hotelsWithOffers = 0;
  let hotelsWithoutOffers = 0;
  let hotelsWithErrors = 0;

  // 逐个分析酒店（限制数量避免API限制）
  const sampleSize = Math.min(20, hotelIds.length);
  console.log(`📊 分析前 ${sampleSize} 个酒店（避免API限制）...\n`);

  for (let i = 0; i < sampleSize; i++) {
    const hotelId = hotelIds[i];
    const hotel = hotels.find(h => h.hotelId === hotelId);
    
    process.stdout.write(`   [${i + 1}/${sampleSize}] ${hotelId} (${hotel?.name || '未知'})... `);

    const result = await analyzeSingleHotel(hotelId, checkInDate, checkOutDate);
    results.push({
      ...result,
      hotelName: hotel?.name,
    });

    if (result.hasOffers) {
      hotelsWithOffers++;
      console.log(`✅ ${result.offersCount} 个报价`);
    } else if (result.error) {
      hotelsWithErrors++;
      console.log(`❌ 错误: ${result.error}`);
    } else {
      hotelsWithoutOffers++;
      console.log(`⚠️  无报价`);
    }

    // 延迟避免频率限制
    if (i < sampleSize - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // 分析结果
  console.log('\n' + '='.repeat(60));
  console.log('📊 分析结果');
  console.log('='.repeat(60));

  console.log(`\n总体统计:`);
  console.log(`  - 分析酒店数: ${sampleSize}`);
  console.log(`  - 有报价: ${hotelsWithOffers} (${((hotelsWithOffers / sampleSize) * 100).toFixed(1)}%)`);
  console.log(`  - 无报价: ${hotelsWithoutOffers} (${((hotelsWithoutOffers / sampleSize) * 100).toFixed(1)}%)`);
  console.log(`  - 错误: ${hotelsWithErrors} (${((hotelsWithErrors / sampleSize) * 100).toFixed(1)}%)`);

  // 显示有报价的酒店
  const hotelsWithOffersList = results.filter(r => r.hasOffers);
  if (hotelsWithOffersList.length > 0) {
    console.log(`\n✅ 有报价的酒店 (${hotelsWithOffersList.length} 个):`);
    hotelsWithOffersList.forEach((r, index) => {
      console.log(`   ${index + 1}. ${r.hotelName || r.hotelId}`);
      console.log(`      酒店ID: ${r.hotelId}`);
      console.log(`      报价数: ${r.offersCount}`);
      if (r.offers && r.offers.length > 0) {
        const price = r.offers[0].offers?.[0]?.price?.total;
        const currency = r.offers[0].offers?.[0]?.price?.currency;
        console.log(`      价格: ${price} ${currency}`);
      }
    });
  }

  // 显示无报价的酒店（前10个）
  const hotelsWithoutOffersList = results.filter(r => !r.hasOffers && !r.error);
  if (hotelsWithoutOffersList.length > 0) {
    console.log(`\n⚠️  无报价的酒店 (前10个):`);
    hotelsWithoutOffersList.slice(0, 10).forEach((r, index) => {
      console.log(`   ${index + 1}. ${r.hotelName || r.hotelId} (${r.hotelId})`);
    });
    if (hotelsWithoutOffersList.length > 10) {
      console.log(`   ... 还有 ${hotelsWithoutOffersList.length - 10} 个酒店无报价`);
    }
  }

  // 显示错误的酒店
  const hotelsWithErrorsList = results.filter(r => r.error);
  if (hotelsWithErrorsList.length > 0) {
    console.log(`\n❌ 查询错误的酒店:`);
    hotelsWithErrorsList.forEach((r, index) => {
      console.log(`   ${index + 1}. ${r.hotelName || r.hotelId} (${r.hotelId})`);
      console.log(`      错误: ${r.error}`);
    });
  }

  // 原因分析
  console.log('\n' + '='.repeat(60));
  console.log('💡 原因分析');
  console.log('='.repeat(60));

  const availabilityRate = (hotelsWithOffers / sampleSize) * 100;
  
  console.log(`\n1. 可用性统计:`);
  console.log(`   - 可用率: ${availabilityRate.toFixed(1)}%`);
  console.log(`   - 这意味着在指定日期（${checkInDate} 至 ${checkOutDate}），只有 ${availabilityRate.toFixed(1)}% 的酒店有可用房间`);

  console.log(`\n2. 可能的原因:`);
  console.log(`   - 日期选择：${checkInDate} 可能不是热门日期，很多酒店可能已满房`);
  console.log(`   - 测试环境：Amadeus测试环境的数据可能有限`);
  console.log(`   - 酒店状态：某些酒店可能暂时关闭或不接受预订`);
  console.log(`   - 房间类型：搜索条件（1成人，1房间）可能限制了可用性`);

  console.log(`\n3. 建议:`);
  console.log(`   - 尝试不同的日期（如未来30-60天）`);
  console.log(`   - 尝试不同的搜索参数（如增加房间数或客人数量）`);
  console.log(`   - 查询更多酒店（当前查询50个，可以增加到100个）`);
  console.log(`   - 使用生产环境API（测试环境数据可能有限）`);

  // 测试不同日期
  console.log(`\n4. 测试不同日期（可选）:`);
  console.log(`   - 可以修改脚本中的 checkInDate 和 checkOutDate 参数`);
  console.log(`   - 尝试未来30-60天的日期，可用性可能会更高`);

  console.log('\n' + '='.repeat(60));
}

// 运行分析
analyze().catch(error => {
  console.error('分析失败:', error.message);
  process.exit(1);
});

