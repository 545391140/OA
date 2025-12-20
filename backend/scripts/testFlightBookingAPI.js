/**
 * 机票预订 API 测试脚本
 * 直接测试 POST /api/flights/bookings 接口
 * 
 * 使用方法:
 * node testFlightBookingAPI.js <jwt-token> <travel-id>
 * 
 * 或者设置环境变量:
 * TEST_TOKEN=your-token TEST_TRAVEL_ID=travel-id node testFlightBookingAPI.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// 模拟航班报价数据
const mockFlightOffer = {
  id: 'test-flight-offer-123',
  source: 'GDS',
  instantTicketingRequired: false,
  nonHomogeneous: false,
  oneWay: false,
  lastTicketingDate: '2025-12-31',
  numberOfBookableSeats: 9,
  itineraries: [
    {
      duration: 'PT2H30M',
      segments: [
        {
          departure: {
            iataCode: 'PEK',
            terminal: 'T3',
            at: '2025-12-25T10:00:00'
          },
          arrival: {
            iataCode: 'PVG',
            terminal: 'T2',
            at: '2025-12-25T12:30:00'
          },
          carrierCode: 'CA',
          number: '1234',
          aircraft: {
            code: '320'
          },
          duration: 'PT2H30M'
        }
      ]
    }
  ],
  price: {
    currency: 'USD',
    total: '500.00',
    base: '450.00',
    fees: [
      {
        amount: '50.00',
        type: 'SUPPLIER'
      }
    ],
    grandTotal: '500.00'
  },
  validatingAirlineCodes: ['CA'],
  travelerPricings: [
    {
      travelerId: 'TRAVELER_1',
      fareOption: 'STANDARD',
      travelerType: 'ADULT',
      price: {
        currency: 'USD',
        total: '500.00',
        base: '450.00'
      },
      fareDetailsBySegment: [
        {
          segmentId: '1',
          cabin: 'ECONOMY',
          fareBasis: 'Y',
          class: 'Y',
          includedCheckedBags: {
            quantity: 1
          }
        }
      ]
    }
  ]
};

async function getAvailableTravels(token) {
  try {
    console.log('\n📋 获取可用的差旅申请...');
    const response = await axios.get(`${BASE_URL}/api/travel`, {
      params: { status: 'approved', limit: 10 },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.success && response.data.data && response.data.data.length > 0) {
      const travels = response.data.data.filter(t => t.status === 'approved' || t.status === 'draft');
      if (travels.length > 0) {
        console.log(`✅ 找到 ${travels.length} 个可用的差旅申请`);
        return travels;
      }
    }
    
    console.log('⚠️  没有找到可用的差旅申请');
    return [];
  } catch (error) {
    console.error('❌ 获取差旅申请失败:', error.response?.data || error.message);
    return [];
  }
}

async function testCreateBooking(token, travelId) {
  try {
    const travelers = [
      {
        id: 'TRAVELER_1',
        dateOfBirth: '1990-01-01',
        name: {
          firstName: 'Test',
          lastName: 'User'
        },
        contact: {
          emailAddress: 'test@example.com',
          phones: [
            {
              deviceType: 'MOBILE',
              countryCallingCode: '+86',
              number: '13800138000'
            }
          ]
        }
      }
    ];
    
    const bookingData = {
      travelId,
      flightOffer: mockFlightOffer,
      travelers
    };
    
    console.log('\n📤 发送预订请求...');
    console.log('URL:', `${BASE_URL}/api/flights/bookings`);
    console.log('Travel ID:', travelId);
    console.log('Travelers:', JSON.stringify(travelers, null, 2));
    
    const response = await axios.post(
      `${BASE_URL}/api/flights/bookings`,
      bookingData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000,
        validateStatus: () => true // 不抛出错误，让我们手动处理
      }
    );
    
    console.log('\n📥 响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 || response.status === 201) {
      console.log('\n✅ 预订成功！');
      if (response.data.data && response.data.data._id) {
        console.log('预订ID:', response.data.data._id);
      }
      return response.data;
    } else {
      console.log('\n❌ 预订失败！');
      console.log('错误信息:', response.data.message || response.data.error || '未知错误');
      return null;
    }
  } catch (error) {
    console.error('\n❌ 请求异常！');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('请求失败，服务器无响应:', error.message);
    } else {
      console.error('错误:', error.message);
      console.error('堆栈:', error.stack);
    }
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 开始机票预订 API 测试...\n');
    
    // 获取 token
    const token = process.env.TEST_TOKEN || process.argv[2];
    if (!token) {
      console.error('❌ 错误: 需要提供 JWT token');
      console.log('\n使用方法:');
      console.log('  node testFlightBookingAPI.js <jwt-token> [travel-id]');
      console.log('\n或设置环境变量:');
      console.log('  TEST_TOKEN=your-token node testFlightBookingAPI.js');
      console.log('\n💡 提示: 可以从浏览器开发者工具的 Network 标签中获取 Authorization header 中的 token');
      process.exit(1);
    }
    
    // 获取 travel ID
    let travelId = process.env.TEST_TRAVEL_ID || process.argv[3];
    
    // 如果没有提供 travel ID，尝试获取一个
    if (!travelId) {
      const travels = await getAvailableTravels(token);
      if (travels.length > 0) {
        travelId = travels[0]._id;
        console.log(`\n✅ 使用差旅申请: ${travelId}`);
        console.log(`   标题: ${travels[0].title || 'N/A'}`);
        console.log(`   状态: ${travels[0].status}`);
      } else {
        console.error('\n❌ 错误: 没有可用的差旅申请，请手动指定 travel ID');
        console.log('\n使用方法:');
        console.log('  node testFlightBookingAPI.js <jwt-token> <travel-id>');
        process.exit(1);
      }
    }
    
    // 执行测试
    await testCreateBooking(token, travelId);
    
    console.log('\n✅ 测试完成！');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testCreateBooking, mockFlightOffer };

