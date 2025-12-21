/**
 * 使用全新 Token 测试酒店预订 API
 * 确保使用最新权限获取的 Token
 */

require('dotenv').config();
const axios = require('axios');
const config = require('../config');

console.log('\n=== 使用全新 Token 测试酒店预订 API ===\n');

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
console.log('  时间:', new Date().toISOString());

(async () => {
  try {
    // 1. 获取全新的 Access Token（确保使用最新权限）
    console.log('\n1. 获取全新的 Access Token（使用最新权限）:');
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
    console.log('   Token 类型:', tokenResponse.data.token_type);
    console.log('   用户名:', tokenResponse.data.username || 'N/A');
    console.log('   应用名称:', tokenResponse.data.application_name || 'N/A');
    
    // 2. 获取酒店报价
    console.log('\n2. 获取酒店报价（用于测试预订）:');
    const hotelIds = 'ALNYC647';
    
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
    
    // 3. 测试预订 API（使用全新 Token）
    console.log('\n3. 测试酒店预订 API（使用全新 Token）:');
    console.log('   URL: POST ' + baseURL + '/v1/booking/hotel-bookings');
    console.log('   ⚠️  如果权限已启用，这次应该成功');
    
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
    console.log('   使用的 Token:', accessToken.substring(0, 20) + '...');
    
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
      
      console.log('\n   ✅✅✅ 预订 API 调用成功！✅✅✅');
      console.log('   HTTP 状态码:', bookingResponse.status);
      console.log('   响应数据:', JSON.stringify(bookingResponse.data, null, 2));
      
      if (bookingResponse.data && bookingResponse.data.data) {
        console.log('\n   📋 预订详情:');
        console.log('   预订 ID:', bookingResponse.data.data.id || 'N/A');
        console.log('   预订参考号:', bookingResponse.data.data.associatedRecords?.reference || 'N/A');
        console.log('   酒店:', bookingResponse.data.data.offer?.hotel?.name || 'N/A');
        console.log('   价格:', bookingResponse.data.data.price?.total, bookingResponse.data.data.price?.currency);
      }
      
      console.log('\n=== ✅ 测试成功：预订接口可用！权限已生效！===\n');
      process.exit(0);
    } catch (bookingError) {
      console.error('\n   ❌ 预订 API 调用失败！');
      
      if (bookingError.response) {
        const response = bookingError.response;
        console.error('   HTTP 状态码:', response.status);
        
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
          
          if (response.headers['www-authenticate'].includes('no apiproduct match found')) {
            console.error('\n   ⚠️  权限仍未生效：');
            console.error('   1. 权限申请后可能需要等待几分钟到几小时才能生效');
            console.error('   2. 请确认在 Amadeus 开发者门户中已正确启用权限');
            console.error('   3. 确认权限是针对测试环境（Test）还是生产环境（Production）');
            console.error('   4. 如果权限是针对生产环境，需要设置 AMADEUS_API_ENV=production');
          }
        }
        
        console.error('\n   完整响应:', JSON.stringify(response.data, null, 2));
      } else {
        console.error('   错误信息:', bookingError.message);
      }
      
      console.log('\n=== ❌ 测试失败：权限可能尚未生效 ===\n');
      console.log('建议：');
      console.log('1. 等待 5-10 分钟后重新测试');
      console.log('2. 确认权限是针对正确的环境（Test/Production）');
      console.log('3. 检查 Amadeus 开发者门户中的权限状态');
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

