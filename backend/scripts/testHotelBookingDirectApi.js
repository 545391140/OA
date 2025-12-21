/**
 * 直接使用 HTTP 接口测试酒店预订 API（非 SDK）
 * 用于验证 API Key 是否有预订权限
 */

require('dotenv').config();
const axios = require('axios');
const config = require('../config');

console.log('\n=== 直接 HTTP 接口测试酒店预订 API（非 SDK）===\n');

// 获取配置
const apiKey = process.env.AMADEUS_HOTEL_API_KEY || config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
const apiSecret = process.env.AMADEUS_HOTEL_API_SECRET || config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
const apiEnv = (config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test') === 'production' ? 'production' : 'test';

const baseURL = apiEnv === 'production' 
  ? 'https://api.amadeus.com'
  : 'https://test.api.amadeus.com';

console.log('配置信息:');
console.log('  环境:', apiEnv);
console.log('  Base URL:', baseURL);
console.log('  API Key:', apiKey ? apiKey.substring(0, 8) + '...' : '未设置');
console.log('  API Secret:', apiSecret ? '已设置' : '未设置');

(async () => {
  try {
    // 1. 获取 Access Token
    console.log('\n1. 获取 Access Token:');
    console.log('   URL: POST ' + baseURL + '/v1/security/oauth2/token');
    
    const tokenResponse = await axios.post(
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
    
    if (!tokenResponse.data || !tokenResponse.data.access_token) {
      throw new Error('Token 获取失败：响应格式错误');
    }
    
    const accessToken = tokenResponse.data.access_token;
    console.log('   ✅ Token 获取成功');
    console.log('   Token:', accessToken.substring(0, 20) + '...');
    console.log('   有效期:', tokenResponse.data.expires_in, '秒');
    
    // 2. 获取酒店报价（用于测试预订）
    console.log('\n2. 获取酒店报价（用于测试预订）:');
    console.log('   URL: GET ' + baseURL + '/v3/shopping/hotel-offers');
    
    // 使用已知有效的酒店 ID
    const hotelIds = 'ALNYC647'; // 从之前的测试中知道这个 ID 有效
    
    const offersResponse = await axios.get(
      `${baseURL}/v3/shopping/hotel-offers`,
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
    
    if (!offerId) {
      throw new Error('报价中没有找到 offerId');
    }
    
    console.log('   ✅ 获取报价成功');
    console.log('   酒店:', firstHotel.hotel?.name);
    console.log('   Offer ID:', offerId);
    console.log('   价格:', firstHotel.offers[0].price?.total, firstHotel.offers[0].price?.currency);
    
    // 3. 直接调用预订 API（非 SDK）
    console.log('\n3. 直接调用预订 API（HTTP 接口，非 SDK）:');
    console.log('   URL: POST ' + baseURL + '/v1/booking/hotel-bookings');
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
    console.log('   请求头:', {
      'Authorization': `Bearer ${accessToken.substring(0, 20)}...`,
      'Content-Type': 'application/vnd.amadeus+json',
      'Accept': 'application/vnd.amadeus+json',
    });
    
    try {
      const bookingResponse = await axios.post(
        `${baseURL}/v1/booking/hotel-bookings`,
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
      
      console.log('   ✅ 预订 API 调用成功！');
      console.log('   HTTP 状态码:', bookingResponse.status);
      console.log('   响应数据:', JSON.stringify(bookingResponse.data, null, 2));
      
      console.log('\n=== 测试完成：预订接口可用 ===\n');
      process.exit(0);
    } catch (bookingError) {
      console.error('   ❌ 预订 API 调用失败！');
      
      if (bookingError.response) {
        const response = bookingError.response;
        console.error('   HTTP 状态码:', response.status);
        console.error('   响应头:', JSON.stringify(response.headers, null, 2));
        console.error('   响应数据:', JSON.stringify(response.data, null, 2));
        
        // 提取错误信息
        let errors = [];
        if (response.data && response.data.errors) {
          errors = response.data.errors;
          console.error('\n   错误详情:');
          errors.forEach((error, index) => {
            console.error(`   错误 ${index + 1}:`);
            console.error(`     代码: ${error.code}`);
            console.error(`     标题: ${error.title}`);
            console.error(`     详情: ${error.detail}`);
            console.error(`     状态: ${error.status}`);
          });
        }
        
        // 检查 www-authenticate 头
        if (response.headers['www-authenticate']) {
          console.error('\n   www-authenticate 头:', response.headers['www-authenticate']);
        }
        
        // 分析错误类型
        if (response.status === 401) {
          console.error('\n   ⚠️  认证错误分析:');
          console.error('   1. HTTP 401 表示认证失败');
          if (errors.length > 0) {
            console.error('   2. 错误代码:', errors[0].code);
            console.error('   3. 如果错误代码是 38190，表示 API Key 缺少预订权限');
          }
          console.error('   4. 如果 www-authenticate 包含 "no apiproduct match found"，确认是权限问题');
        }
      } else if (bookingError.request) {
        console.error('   请求已发送但未收到响应');
        console.error('   错误信息:', bookingError.message);
      } else {
        console.error('   请求配置错误:', bookingError.message);
      }
      
      console.log('\n=== 测试完成：预订接口不可用 ===\n');
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

