/**
 * 测试携程API连接（生产环境）
 * 用于验证生产环境的API密钥是否正确配置
 * 
 * 使用方法：
 * node backend/scripts/testCtripApiProduction.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const ctripApiService = require('../services/ctripApiService');
const config = require('../config');

// 强制使用生产环境
process.env.CTRIP_USE_TEST_ENV = 'false';
process.env.NODE_ENV = 'production';

async function testAPI() {
  try {
    console.log('='.repeat(60));
    console.log('测试携程API连接（生产环境）');
    console.log('='.repeat(60));
    
    // 检查配置
    console.log('\n1. 检查API配置:');
    const appKey = config.CTRIP_APP_KEY || process.env.CTRIP_APP_KEY;
    const appSecurity = config.CTRIP_APP_SECURITY || process.env.CTRIP_APP_SECURITY;
    
    console.log(`   AppKey: ${appKey ? appKey.substring(0, 5) + '...' : '未配置'}`);
    console.log(`   AppSecurity: ${appSecurity ? '已配置' : '未配置'}`);
    console.log(`   使用环境: 生产环境 (https://ct.ctrip.com)`);
    
    if (!appKey || !appSecurity) {
      console.log('\n❌ API密钥未配置！');
      process.exit(1);
    }
    
    // 测试1: 获取Ticket
    console.log('\n2. 测试获取Ticket（生产环境）...');
    try {
      const ticket = await ctripApiService.getTicket();
      console.log(`   ✅ Ticket获取成功`);
      console.log(`   Ticket (前20字符): ${ticket.substring(0, 20)}...`);
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ API测试通过！');
      console.log('='.repeat(60));
      console.log('\n生产环境API密钥配置正确！');
      
      process.exit(0);
    } catch (error) {
      console.log(`   ❌ Ticket获取失败: ${error.message}`);
      
      if (error.message.includes('非对接客户')) {
        console.log('\n   可能的原因:');
        console.log('   1. API密钥未激活或未正确配置');
        console.log('   2. 需要联系携程开通API权限');
        console.log('   3. AppKey或AppSecurity错误');
        console.log('   4. 测试环境和生产环境的密钥可能不同');
      }
      
      throw error;
    }
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ API测试失败');
    console.log('='.repeat(60));
    console.log(`错误: ${error.message}`);
    
    if (error.response) {
      console.log(`状态码: ${error.response.status}`);
      console.log(`响应数据:`, JSON.stringify(error.response.data, null, 2));
    }
    
    console.log('\n故障排查建议:');
    console.log('1. 检查API密钥是否正确');
    console.log('2. 确认API密钥已激活');
    console.log('3. 联系携程确认API权限');
    console.log('4. 确认测试环境和生产环境的密钥是否不同');
    
    process.exit(1);
  }
}

if (require.main === module) {
  testAPI();
}

module.exports = { testAPI };

