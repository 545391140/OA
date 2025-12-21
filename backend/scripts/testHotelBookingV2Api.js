/**
 * 测试酒店预订 API v2（使用正确的端点）
 * 根据官方文档：Base URL: test.api.amadeus.com/v2
 * 端点: POST /booking/hotel-orders
 */

require('dotenv').config();
const axios = require('axios');
const config = require('../config');

console.log('\n=== 测试酒店预订 API v2（使用正确端点）===\n');

// 获取配置
const apiKey = process.env.AMADEUS_HOTEL_API_KEY || config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
const apiSecret = process.env.AMADEUS_HOTEL_API_SECRET || config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
const apiEnv = (config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test') === 'production' ? 'production' : 'test';

// 根据文档，v2 API 的 Base URL
const baseURL = apiEnv === 'production' 
  ? 'https://api.amadeus.com/v2'
  : 'https://test.api.amadeus.com/v2';

console.log('配置信息:');
console.log('  环境:', apiEnv);
console.log('  Base URL:', baseURL);
console.log('  API Key:', apiKey ? apiKey.substring(0, 8) + '...' : '未设置');
console.log('  注意: 使用 v2 API 端点 /booking/hotel-orders');

(async () => {
  try {
    // 1. 获取 Access Token
    console.log('\n1. 获取 Access Token:');
    const tokenBaseURL = apiEnv === 'production' 
      ? 'https://api.amadeus.com'
      : 'https://test.api.amadeus.com';
    
    const tokenResponse = await axios.post(
      `${tokenBaseURL}/v1/security/oauth2/token`,
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
    
    if (!tokenResponse.data || !tokenResponse.data.access_token) {
      throw new Error('Token 获取失败');
    }
    
    const accessToken = tokenResponse.data.access_token;
    console.log('   ✅ Token 获取成功');
    console.log('   Token:', accessToken.substring(0, 20) + '...');
    
    // 2. 获取酒店报价（使用 v3 API）
    console.log('\n2. 获取酒店报价:');
    const offersBaseURL = apiEnv === 'production' 
      ? 'https://api.amadeus.com'
      : 'https://test.api.amadeus.com';
    
    const hotelIds = 'ALNYC647';
    const offersResponse = await axios.get(
      `${offersBaseURL}/v3/shopping/hotel-offers`,
      {
        params: {
          hotelIds: hotelIds,
          checkInDate: '2025-12-25',
          checkOutDate: '2025-12-30',
          adults: '1',
          roomQuantity: '1',
          currencyCode: 'USD',
        },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 10000,
      }
    );
    
    if (!offersResponse.data || !offersResponse.data.data || offersResponse.data.data.length === 0) {
      throw new Error('无法获取酒店报价');
    }
    
    const firstHotel = offersResponse.data.data[0];
    const offerId = firstHotel.offers?.[0]?.id;
    const offer = firstHotel.offers?.[0];
    
    if (!offerId) {
      throw new Error('报价中没有找到 offerId');
    }
    
    console.log('   ✅ 获取报价成功');
    console.log('   酒店:', firstHotel.hotel?.name);
    console.log('   Offer ID:', offerId);
    console.log('   完整 Offer 数据:', JSON.stringify(offer, null, 2));
    
    // 检查是否有 tid 或其他 v2 API 需要的字段
    if (offer.self) {
      console.log('   Offer self 链接:', offer.self);
    }
    
    // 3. 测试 v2 预订 API（使用正确端点）
    console.log('\n3. 测试酒店预订 API v2:');
    console.log('   URL: POST ' + baseURL + '/booking/hotel-orders');
    console.log('   ⚠️  注意: 使用 v2 API 端点 /booking/hotel-orders');
    
    // 根据 v2 API 文档构建请求体
    // v2 API 格式与 v1 不同：
    // - 需要 type: "hotel-order"
    // - guests 格式不同：使用 tid, title, firstName, lastName, phone, email
    // - 使用 roomAssociations 而不是 offerId
    // - 需要 payment 信息
    // - 需要 travelAgent 信息
    const bookingData = {
      data: {
        type: 'hotel-order',
        guests: [
          {
            tid: 1,  // Transaction ID，从 1 开始
            title: 'MR',  // MR, MRS, MS, MISS
            firstName: 'TEST',
            lastName: 'USER',
            phone: '+11234567890',  // 完整电话号码（包含国家代码）
            email: 'test@example.com',
          },
        ],
        travelAgent: {
          contact: {
            email: 'test@example.com',  // 旅行社联系邮箱
          },
        },
        roomAssociations: [
          {
            guestReferences: [
              {
                guestReference: '1',  // 对应 guests[].tid
              },
            ],
            hotelOfferId: offerId,  // 使用报价 ID
          },
        ],
        payment: {
          method: 'CREDIT_CARD',
          paymentCard: {
            paymentCardInfo: {
              vendorCode: 'VI',  // VI=Visa, MC=MasterCard, AX=American Express, etc.
              cardNumber: '4151289722471370',  // 测试卡号
              expiryDate: '2026-08',  // YYYY-MM 格式
              holderName: 'TEST USER',
            },
          },
        },
      },
    };
    
    console.log('   请求数据:', JSON.stringify(bookingData, null, 2));
    
    try {
      const bookingResponse = await axios.post(
        `${baseURL}/booking/hotel-orders`,
        bookingData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/vnd.amadeus+json',
            'Accept': 'application/vnd.amadeus+json',
          },
          timeout: 30000,
        }
      );
      
      console.log('\n   ✅✅✅ 预订 API v2 调用成功！✅✅✅');
      console.log('   HTTP 状态码:', bookingResponse.status);
      console.log('   响应数据:', JSON.stringify(bookingResponse.data, null, 2));
      
      console.log('\n=== ✅ 测试成功：v2 API 端点可用！===\n');
      process.exit(0);
    } catch (bookingError) {
      console.error('   ❌ 预订 API v2 调用失败！');
      
      if (bookingError.response) {
        const response = bookingError.response;
        console.error('   HTTP 状态码:', response.status);
        console.error('   请求 URL:', bookingError.config?.url);
        
        if (response.data && response.data.errors) {
          const errors = response.data.errors;
          console.error('\n   错误详情:');
          errors.forEach((error, index) => {
            console.error(`   错误 ${index + 1}:`);
            console.error(`     代码: ${error.code}`);
            console.error(`     标题: ${error.title}`);
            console.error(`     详情: ${error.detail}`);
            console.error(`     状态: ${error.status}`);
          });
        }
        
        if (response.headers['www-authenticate']) {
          console.error('\n   www-authenticate 头:', response.headers['www-authenticate']);
        }
        
        console.error('\n   完整响应:', JSON.stringify(response.data, null, 2));
      } else {
        console.error('   错误信息:', bookingError.message);
      }
      
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    if (error.response) {
      console.error('HTTP 状态码:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
})();

