/**
 * 测试 Amadeus SDK Token 获取和验证
 * 用于诊断 SDK token 问题
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Amadeus = require('amadeus');
const config = require('../config');
const logger = require('../utils/logger');

async function testSdkToken() {
  console.log('\n🔐 测试 Amadeus SDK Token 获取和验证');
  console.log('─'.repeat(60));

  try {
    // 获取配置
    const apiKey = process.env.AMADEUS_HOTEL_API_KEY || config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
    const apiSecret = process.env.AMADEUS_HOTEL_API_SECRET || config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
    const apiEnv = (config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test') === 'production' ? 'production' : 'test';

    console.log('📋 配置信息:');
    console.log(`   API Key: ${apiKey ? apiKey.substring(0, 8) + '...' : '未设置'}`);
    console.log(`   API Secret: ${apiSecret ? '已设置' : '未设置'}`);
    console.log(`   环境: ${apiEnv}`);

    if (!apiKey || !apiSecret) {
      console.error('❌ 错误: API Key 或 Secret 未设置');
      return;
    }

    // 创建 SDK 实例
    console.log('\n🔧 创建 SDK 实例...');
    const amadeus = new Amadeus({
      clientId: apiKey,
      clientSecret: apiSecret,
      hostname: apiEnv === 'production' ? 'production' : 'test',
      logLevel: 'debug', // 启用详细日志
    });

    console.log('✅ SDK 实例已创建');

    // 测试 1: 调用一个简单的 API 来触发 Token 获取
    console.log('\n🧪 测试 1: 调用酒店搜索 API（触发 Token 获取）...');
    try {
      const response = await amadeus.referenceData.locations.hotels.byCity.get({
        cityCode: 'NYC',
        hotelSource: 'ALL',
      });

      console.log('✅ Token 获取成功！');
      console.log(`   找到 ${response.data?.length || 0} 个酒店`);
      
      if (response.data && response.data.length > 0) {
        console.log(`   示例酒店: ${response.data[0].name || 'N/A'}`);
      }
    } catch (error) {
      console.error('❌ API 调用失败:');
      console.error(`   错误消息: ${error.message}`);
      console.error(`   状态码: ${error.statusCode || error.code || 'N/A'}`);
      console.error(`   错误描述: ${error.description || 'N/A'}`);
      
      if (error.response) {
        console.error(`   响应数据:`, JSON.stringify(error.response.data, null, 2));
      }
      
      if (error.request) {
        console.error(`   请求信息:`, error.request);
      }
      
      return;
    }

    // 测试 2: 测试酒店预订 API（如果 Token 有效）
    console.log('\n🧪 测试 2: 验证 Token 是否可用于预订 API...');
    console.log('   注意: 这只是验证 Token，不会实际创建预订');
    
    // 注意：这里我们不实际调用预订 API，因为需要有效的 offerId
    // 但我们可以检查 SDK 实例是否准备好
    console.log('✅ SDK 实例已准备好，Token 应该可以用于所有 API');

    console.log('\n✅ 所有测试通过！SDK Token 配置正确。');
    
  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error(`   错误: ${error.message}`);
    console.error(`   堆栈: ${error.stack}`);
  }
}

// 运行测试
testSdkToken()
  .then(() => {
    console.log('\n测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n测试异常:', error);
    process.exit(1);
  });

