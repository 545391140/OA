/**
 * 测试酒店预订 API
 * 验证预订 API 的 Token 和调用是否正确
 */

require('dotenv').config();
const Amadeus = require('amadeus');
const config = require('../config');
const logger = require('../utils/logger');

console.log('\n=== 酒店预订 API 测试 ===\n');

// 获取配置
const apiKey = process.env.AMADEUS_HOTEL_API_KEY || config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
const apiSecret = process.env.AMADEUS_HOTEL_API_SECRET || config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
const apiEnv = (config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test') === 'production' ? 'production' : 'test';

console.log('配置信息:');
console.log('  环境:', apiEnv);
console.log('  API Key:', apiKey ? apiKey.substring(0, 8) + '...' : '未设置');
console.log('  API Secret:', apiSecret ? '已设置' : '未设置');

// 创建 SDK 实例
const amadeus = new Amadeus({
  clientId: apiKey,
  clientSecret: apiSecret,
  hostname: apiEnv === 'production' ? 'production' : 'test',
  logLevel: 'debug',
});

console.log('\n1. 测试 Token 获取（通过酒店搜索 API）:');
(async () => {
  try {
    // 先调用一个简单的 API 来获取 Token
    const searchResponse = await amadeus.referenceData.locations.hotels.byCity.get({
      cityCode: 'NYC',
      hotelSource: 'ALL',
    });
    console.log('   ✅ Token 获取成功');
    console.log('   Token 信息: 已通过 SDK 自动获取');
    
    // 获取酒店报价（用于测试预订）
    console.log('\n2. 获取酒店报价（用于测试预订）:');
    // 使用已知有效的酒店 ID（从之前的测试报告中）
    // 如果这些 ID 无效，则从搜索结果中获取
    const knownValidHotelIds = ['ALNYC647', 'XTNYC130', 'TMNYC822', 'LENYC7A3'];
    let hotelIds = knownValidHotelIds;
    
    // 如果已知 ID 无效，尝试从搜索结果中获取
    if (searchResponse.data && searchResponse.data.length > 0) {
      const searchHotelIds = searchResponse.data.slice(0, 5).map(h => h.hotelId).filter(Boolean);
      hotelIds = [...new Set([...knownValidHotelIds, ...searchHotelIds])].slice(0, 5);
    }
    
    console.log('   使用的酒店 ID:', hotelIds);
    
    // 尝试获取报价，如果失败则尝试其他酒店 ID
    let offersResponse;
    let lastError;
    for (let i = 0; i < hotelIds.length; i++) {
      try {
        const testHotelIds = hotelIds.slice(0, i + 1);
        console.log(`   尝试使用 ${testHotelIds.length} 个酒店 ID: ${testHotelIds.join(', ')}`);
        
        offersResponse = await amadeus.shopping.hotelOffersSearch.get({
          hotelIds: testHotelIds.join(','),
          checkInDate: '2025-12-25',
          checkOutDate: '2025-12-30',
          adults: '1',
          roomQuantity: '1',
          currencyCode: 'USD',
        });
        
        if (offersResponse.data && offersResponse.data.length > 0) {
          console.log(`   ✅ 成功获取报价（使用 ${testHotelIds.length} 个酒店 ID）`);
          break;
        }
      } catch (error) {
        lastError = error;
        console.log(`   ⚠️  使用 ${hotelIds.slice(0, i + 1).join(', ')} 失败: ${error.description || error.message}`);
        // 继续尝试下一个组合
        if (i < hotelIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 延迟 1 秒
          continue;
        }
      }
    }
    
    if (!offersResponse || !offersResponse.data || offersResponse.data.length === 0) {
      if (lastError) {
        throw lastError;
      }
      throw new Error('无法获取酒店报价');
    }
    
    console.log('   ✅ 获取报价成功');
    console.log('   报价数量:', offersResponse.data?.length || 0);
    
    if (!offersResponse.data || offersResponse.data.length === 0) {
      console.log('\n   ⚠️  警告: 没有找到可用报价，无法测试预订 API');
      console.log('   这可能是测试环境的正常情况');
      process.exit(0);
    }
    
    const firstOffer = offersResponse.data[0];
    const offerId = firstOffer.offers?.[0]?.id;
    
    if (!offerId) {
      console.log('\n   ⚠️  警告: 报价中没有找到 offerId');
      console.log('   报价结构:', JSON.stringify(firstOffer, null, 2));
      process.exit(0);
    }
    
    console.log('   找到 offerId:', offerId);
    
    // 测试预订 API（使用测试数据）
    console.log('\n3. 测试酒店预订 API:');
    console.log('   ⚠️  注意: 这是测试环境的真实 API 调用');
    console.log('   如果 API Key 没有预订权限，会返回 401 错误');
    
    const bookingData = {
      data: {
        offerId: offerId,
        guests: [
          {
            id: 'GUEST_1',
            name: {
              firstName: 'TEST',
              lastName: 'USER',
            },
            contact: {
              emailAddress: 'test@example.com',
              phones: [
                {
                  deviceType: 'MOBILE',
                  countryCallingCode: '1',
                  number: '1234567890',
                },
              ],
            },
          },
        ],
      },
    };
    
    console.log('   请求数据:', JSON.stringify(bookingData, null, 2));
    
    try {
      const bookingResponse = await amadeus.booking.hotelBookings.post(bookingData);
      console.log('   ✅ 预订 API 调用成功！');
      console.log('   响应:', JSON.stringify(bookingResponse.data || bookingResponse, null, 2));
    } catch (bookingError) {
      console.error('   ❌ 预订 API 调用失败！');
      console.error('   错误信息:', bookingError.message);
      console.error('   错误代码:', bookingError.code || 'N/A');
      console.error('   状态码:', bookingError.statusCode || 'N/A');
      
      if (bookingError.description) {
        console.error('   错误描述:', bookingError.description);
      }
      
      if (bookingError.response) {
        console.error('   API 响应:', JSON.stringify(bookingError.response, null, 2));
      }
      
      // 检查是否是认证错误
      const isAuthError = bookingError.statusCode === 401 || 
                         bookingError.code === 401 ||
                         (bookingError.message && bookingError.message.toLowerCase().includes('invalid')) ||
                         (bookingError.description && String(bookingError.description).toLowerCase().includes('invalid'));
      
      if (isAuthError) {
        console.error('\n   ⚠️  认证错误分析:');
        console.error('   1. 检查 API Key 是否有酒店预订权限');
        console.error('   2. 确认 API Key 是否属于当前环境（test vs production）');
        console.error('   3. 检查 Token 是否在预订 API 调用时仍然有效');
        console.error('   4. 某些 API Key 可能只有搜索权限，没有预订权限');
      }
      
      // 检查是否是权限错误
      const isPermissionError = bookingError.statusCode === 403 || 
                                bookingError.code === 403 ||
                                (bookingError.message && bookingError.message.toLowerCase().includes('forbidden'));
      
      if (isPermissionError) {
        console.error('\n   ⚠️  权限错误:');
        console.error('   API Key 可能没有酒店预订权限');
        console.error('   请检查 Amadeus 开发者门户中的 API Key 权限设置');
      }
      
      process.exit(1);
    }
    
    console.log('\n=== 测试完成 ===\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误代码:', error.code || 'N/A');
    console.error('状态码:', error.statusCode || 'N/A');
    if (error.description) {
      console.error('错误描述:', error.description);
    }
    process.exit(1);
  }
})();

