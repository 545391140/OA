/**
 * 快速测试机票预订
 * 使用 mock token 或实际登录获取 token
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

// Mock token（如果后端支持开发模式）
const MOCK_TOKEN = 'mock-jwt-token-dev';

// 模拟航班报价
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
          aircraft: { code: '320' },
          duration: 'PT2H30M'
        }
      ]
    }
  ],
  price: {
    currency: 'USD',
    total: '500.00',
    base: '450.00',
    fees: [{ amount: '50.00', type: 'SUPPLIER' }],
    grandTotal: '500.00'
  },
  validatingAirlineCodes: ['CA'],
  travelerPricings: [
    {
      travelerId: 'TRAVELER_1',
      fareOption: 'STANDARD',
      travelerType: 'ADULT',
      price: { currency: 'USD', total: '500.00', base: '450.00' },
      fareDetailsBySegment: [
        {
          segmentId: '1',
          cabin: 'ECONOMY',
          fareBasis: 'Y',
          class: 'Y',
          includedCheckedBags: { quantity: 1 }
        }
      ]
    }
  ]
};

async function tryLogin() {
  try {
    // 尝试使用常见的测试账号登录
    const testAccounts = [
      { email: 'admin@example.com', password: 'admin123' },
      { email: 'test@example.com', password: 'test123' },
      { email: 'demo@example.com', password: 'demo123' }
    ];
    
    for (const account of testAccounts) {
      try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, account, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        if (response.status === 200 && response.data.success && response.data.token) {
          console.log(`✅ 登录成功: ${account.email}`);
          return response.data.token;
        }
      } catch (e) {
        // 继续尝试下一个账号
      }
    }
  } catch (error) {
    // 忽略登录错误
  }
  return null;
}

async function getTravelsWithMockToken() {
  try {
    const response = await axios.get(`${BASE_URL}/api/travel`, {
      params: { status: 'approved', limit: 10 },
      headers: { 'Authorization': `Bearer ${MOCK_TOKEN}` },
      timeout: 5000,
      validateStatus: () => true
    });
    
    if (response.status === 200 && response.data.success) {
      return response.data.data || [];
    }
  } catch (error) {
    // 忽略错误
  }
  return [];
}

async function getTravelsWithToken(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/travel`, {
      params: { status: 'approved', limit: 10 },
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 5000,
      validateStatus: () => true
    });
    
    if (response.status === 200 && response.data.success) {
      return response.data.data || [];
    }
  } catch (error) {
    console.error('获取差旅申请失败:', error.response?.data || error.message);
  }
  return [];
}

async function testBooking(token, travelId) {
  const travelers = [
    {
      id: 'TRAVELER_1',
      dateOfBirth: '1990-01-01',
      name: { firstName: 'Test', lastName: 'User' },
      contact: {
        emailAddress: 'test@example.com',
        phones: [{
          deviceType: 'MOBILE',
          countryCallingCode: '+86',
          number: '13800138000'
        }]
      }
    }
  ];
  
  const bookingData = {
    travelId,
    flightOffer: mockFlightOffer,
    travelers
  };
  
  console.log('\n📤 发送预订请求...');
  console.log('Travel ID:', travelId);
  
  try {
    const response = await axios.post(
      `${BASE_URL}/api/flights/bookings`,
      bookingData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000,
        validateStatus: () => true
      }
    );
    
    console.log('\n📥 响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 || response.status === 201) {
      console.log('\n✅ 预订成功！');
      return true;
    } else {
      console.log('\n❌ 预订失败！');
      return false;
    }
  } catch (error) {
    console.error('\n❌ 请求异常:', error.response?.data || error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 开始机票预订测试...\n');
  
  // 1. 尝试获取 token
  console.log('1️⃣  获取认证 token...');
  let token = MOCK_TOKEN;
  
  // 先尝试 mock token
  console.log('   尝试使用 mock token...');
  let travels = await getTravelsWithMockToken();
  
  if (travels.length === 0) {
    // 尝试登录获取真实 token
    console.log('   尝试登录获取真实 token...');
    token = await tryLogin();
    if (token) {
      travels = await getTravelsWithToken(token);
    }
  }
  
  if (!token || travels.length === 0) {
    console.log('\n⚠️  无法获取 token 或没有可用的差旅申请');
    console.log('\n请手动提供 token:');
    console.log('  1. 打开浏览器，登录系统');
    console.log('  2. 打开开发者工具 (F12)');
    console.log('  3. 在 Network 标签中找到任意 API 请求');
    console.log('  4. 复制 Authorization header 中的 token');
    console.log('  5. 运行: node scripts/testFlightBookingAPI.js <token>');
    process.exit(1);
  }
  
  console.log(`✅ 找到 ${travels.length} 个可用的差旅申请`);
  const travel = travels[0];
  console.log(`   使用差旅申请: ${travel._id}`);
  console.log(`   标题: ${travel.title || 'N/A'}`);
  console.log(`   状态: ${travel.status}`);
  
  // 2. 执行预订测试
  console.log('\n2️⃣  执行预订测试...');
  const success = await testBooking(token, travel._id);
  
  if (success) {
    console.log('\n✅ 测试完成！预订成功！');
  } else {
    console.log('\n❌ 测试失败！请查看上面的错误信息。');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n❌ 测试失败:', error.message);
  process.exit(1);
});


