/**
 * Amadeus SDK 诊断脚本
 * 用于检查 SDK 配置、环境设置和 Token 获取
 */

require('dotenv').config();
const Amadeus = require('amadeus');
const config = require('../config');
const logger = require('../utils/logger');

console.log('\n=== Amadeus SDK 诊断工具 ===\n');

// 1. 检查环境变量
console.log('1. 环境变量检查:');
console.log('   AMADEUS_HOTEL_API_KEY:', process.env.AMADEUS_HOTEL_API_KEY ? process.env.AMADEUS_HOTEL_API_KEY.substring(0, 8) + '...' : '未设置');
console.log('   AMADEUS_HOTEL_API_SECRET:', process.env.AMADEUS_HOTEL_API_SECRET ? '已设置 (' + process.env.AMADEUS_HOTEL_API_SECRET.length + ' 字符)' : '未设置');
console.log('   AMADEUS_API_ENV:', process.env.AMADEUS_API_ENV || '未设置（将使用默认值: test）');
console.log('   NODE_ENV:', process.env.NODE_ENV || '未设置');

// 2. 检查配置
console.log('\n2. 配置检查:');
const apiKey = process.env.AMADEUS_HOTEL_API_KEY || config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
const apiSecret = process.env.AMADEUS_HOTEL_API_SECRET || config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
const apiEnv = (config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test') === 'production' ? 'production' : 'test';

console.log('   使用的 API Key:', apiKey ? apiKey.substring(0, 8) + '...' : '未找到');
console.log('   使用的 API Secret:', apiSecret ? '已设置 (' + apiSecret.length + ' 字符)' : '未找到');
console.log('   环境:', apiEnv);
console.log('   SDK hostname:', apiEnv === 'production' ? 'production' : 'test');

// 3. 验证配置完整性
if (!apiKey || !apiSecret) {
  console.error('\n❌ 错误: API Key 或 Secret 缺失！');
  process.exit(1);
}

// 4. 创建 SDK 实例
console.log('\n3. 创建 SDK 实例:');
const sdkConfig = {
  clientId: apiKey,
  clientSecret: apiSecret,
  hostname: apiEnv === 'production' ? 'production' : 'test',
  logLevel: 'debug', // 启用详细日志
};

console.log('   SDK 配置:', {
  clientId: sdkConfig.clientId.substring(0, 8) + '...',
  clientSecret: '***',
  hostname: sdkConfig.hostname,
  logLevel: sdkConfig.logLevel,
});

let amadeus;
try {
  amadeus = new Amadeus(sdkConfig);
  console.log('   ✅ SDK 实例创建成功');
} catch (error) {
  console.error('   ❌ SDK 实例创建失败:', error.message);
  process.exit(1);
}

// 5. 测试 Token 获取（通过调用一个简单的 API）
console.log('\n4. 测试 Token 获取和 API 调用:');
console.log('   调用 API: referenceData.locations.hotels.byCity.get({ cityCode: "NYC" })');
console.log('   环境:', apiEnv === 'production' ? '生产环境 (https://api.amadeus.com)' : '测试环境 (https://test.api.amadeus.com)');

(async () => {
  try {
    const response = await amadeus.referenceData.locations.hotels.byCity.get({
      cityCode: 'NYC',
      hotelSource: 'ALL',
    });
    
    console.log('   ✅ API 调用成功！');
    console.log('   ✅ Token 获取成功！');
    console.log('   响应数据:', {
      hasData: !!response.data,
      dataCount: Array.isArray(response.data) ? response.data.length : 'N/A',
      meta: response.meta || {},
    });
    
    // 6. 检查实际使用的 API 端点
    console.log('\n5. 验证实际 API 端点:');
    if (apiEnv === 'production') {
      console.log('   ⚠️  警告: 当前配置为生产环境！');
      console.log('   如果 API Key 是测试环境的，会导致认证失败！');
      console.log('   请确认 API Key 是否匹配当前环境配置。');
    } else {
      console.log('   ✅ 当前配置为测试环境');
      console.log('   如果 API Key 是生产环境的，会导致认证失败！');
      console.log('   请确认 API Key 是否匹配当前环境配置。');
    }
    
    console.log('\n=== 诊断完成 ===\n');
    process.exit(0);
  } catch (error) {
    console.error('\n   ❌ API 调用失败！');
    console.error('   错误信息:', error.message);
    console.error('   错误代码:', error.code || 'N/A');
    console.error('   状态码:', error.statusCode || 'N/A');
    
    if (error.description) {
      console.error('   错误描述:', error.description);
    }
    
    if (error.response) {
      console.error('   API 响应:', JSON.stringify(error.response, null, 2));
    }
    
    // 检查是否是认证错误
    const isAuthError = error.statusCode === 401 || 
                       error.code === 401 ||
                       (error.message && error.message.toLowerCase().includes('invalid')) ||
                       (error.description && String(error.description).toLowerCase().includes('invalid'));
    
    if (isAuthError) {
      console.error('\n   ⚠️  认证错误分析:');
      console.error('   1. 检查 API Key 和 Secret 是否正确');
      console.error('   2. 检查环境配置是否匹配（test vs production）');
      console.error('   3. 确认 API Key 是否属于当前配置的环境');
      console.error('   4. 如果 API Key 是测试环境的，确保 AMADEUS_API_ENV=test');
      console.error('   5. 如果 API Key 是生产环境的，确保 AMADEUS_API_ENV=production');
    }
    
    console.log('\n=== 诊断完成（有错误）===\n');
    process.exit(1);
  }
})();

