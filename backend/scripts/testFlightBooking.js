/**
 * 机票预订提交测试脚本
 * 用于测试 POST /api/flights/bookings 接口
 */

const axios = require('axios');
const mongoose = require('mongoose');
const config = require('../config');
const Travel = require('../models/Travel');
const User = require('../models/User');

const BASE_URL = 'http://localhost:3001';

// 模拟航班报价数据（简化版，用于测试）
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

async function getTestData() {
  try {
    const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system';
    console.log('连接 MongoDB:', mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // 隐藏密码
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    
    // 获取一个可用的差旅申请
    const travel = await Travel.findOne({ 
      status: { $in: ['draft', 'approved'] } 
    }).limit(1).lean();
    
    if (!travel) {
      throw new Error('没有找到可用的差旅申请（状态为 draft 或 approved）');
    }
    
    // 获取差旅申请的所有者
    const user = await User.findById(travel.employee).lean();
    
    if (!user) {
      throw new Error('没有找到差旅申请的所有者');
    }
    
    await mongoose.disconnect();
    
    return {
      travelId: travel._id.toString(),
      userId: user._id.toString(),
      userEmail: user.email,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    };
  } catch (error) {
    console.error('获取测试数据失败:', error.message);
    throw error;
  }
}

async function loginAndGetToken(email) {
  try {
    // 这里需要实际的登录逻辑
    // 为了测试，我们假设使用 mock token 或实际的 JWT token
    // 在实际环境中，你需要先登录获取 token
    console.log('⚠️  注意：需要有效的 JWT token 才能测试');
    console.log('   请从浏览器开发者工具中获取 Authorization header 中的 token');
    return null;
  } catch (error) {
    console.error('登录失败:', error.message);
    throw error;
  }
}

async function testCreateBooking(token, travelId, userEmail) {
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
          emailAddress: userEmail || 'test@example.com',
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
    console.log('请求数据:', JSON.stringify(bookingData, null, 2));
    
    const response = await axios.post(
      `${BASE_URL}/api/flights/bookings`,
      bookingData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    console.log('\n✅ 预订成功！');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    return response.data;
  } catch (error) {
    console.error('\n❌ 预订失败！');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误信息:', error.response.data);
    } else if (error.request) {
      console.error('请求失败:', error.message);
    } else {
      console.error('错误:', error.message);
    }
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 开始机票预订测试...\n');
    
    // 1. 获取测试数据
    console.log('1️⃣  获取测试数据...');
    const testData = await getTestData();
    console.log('✅ 测试数据:', testData);
    
    // 2. 获取 token（需要用户提供）
    console.log('\n2️⃣  获取认证 token...');
    const token = process.env.TEST_TOKEN || process.argv[2];
    
    if (!token) {
      console.log('\n⚠️  未提供 token，跳过实际 API 调用');
      console.log('   使用方法: node testFlightBooking.js <your-jwt-token>');
      console.log('   或设置环境变量: TEST_TOKEN=your-token node testFlightBooking.js');
      console.log('\n📋 测试数据准备完成:');
      console.log(JSON.stringify({
        travelId: testData.travelId,
        flightOffer: mockFlightOffer,
        travelers: [
          {
            id: 'TRAVELER_1',
            dateOfBirth: '1990-01-01',
            name: { firstName: 'Test', lastName: 'User' },
            contact: {
              emailAddress: testData.userEmail,
              phones: [{ deviceType: 'MOBILE', countryCallingCode: '+86', number: '13800138000' }]
            }
          }
        ]
      }, null, 2));
      return;
    }
    
    // 3. 执行预订测试
    console.log('\n3️⃣  执行预订测试...');
    await testCreateBooking(token, testData.travelId, testData.userEmail);
    
    console.log('\n✅ 测试完成！');
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testCreateBooking, getTestData, mockFlightOffer };

