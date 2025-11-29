/**
 * 调试携程API配置
 * 检查实际发送的请求格式和配置值
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const config = require('../config');

// 默认使用生产环境（已修改为默认使用生产环境）
// 如需使用测试环境，请设置: process.env.CTRIP_USE_TEST_ENV = 'true';
// process.env.CTRIP_USE_TEST_ENV = 'true';

const CTRIP_API_CONFIG = {
  test: {
    baseURL: 'https://gateway.fat.ctripqa.com',
  },
  production: {
    baseURL: 'https://ct.ctrip.com',
  },
  get baseURL() {
    if (process.env.CTRIP_USE_TEST_ENV === 'true') {
      return this.test.baseURL;
    }
    return process.env.NODE_ENV === 'production' 
      ? this.production.baseURL 
      : this.test.baseURL;
  },
};

async function debugAPI() {
  try {
    console.log('='.repeat(60));
    console.log('调试携程API配置');
    console.log('='.repeat(60));
    
    // 1. 检查配置来源
    console.log('\n1. 配置检查:');
    const appKey = config.CTRIP_APP_KEY || process.env.CTRIP_APP_KEY;
    const appSecurity = config.CTRIP_APP_SECURITY || process.env.CTRIP_APP_SECURITY;
    
    console.log(`   从 config.CTRIP_APP_KEY 获取: ${config.CTRIP_APP_KEY || '未设置'}`);
    console.log(`   从 process.env.CTRIP_APP_KEY 获取: ${process.env.CTRIP_APP_KEY || '未设置'}`);
    console.log(`   最终使用的 appKey: ${appKey}`);
    console.log(`   appKey 长度: ${appKey?.length || 0}`);
    console.log(`   appKey 类型: ${typeof appKey}`);
    
    console.log(`\n   从 config.CTRIP_APP_SECURITY 获取: ${config.CTRIP_APP_SECURITY ? '已设置（隐藏）' : '未设置'}`);
    console.log(`   从 process.env.CTRIP_APP_SECURITY 获取: ${process.env.CTRIP_APP_SECURITY ? '已设置（隐藏）' : '未设置'}`);
    console.log(`   appSecurity 长度: ${appSecurity?.length || 0}`);
    console.log(`   appSecurity 类型: ${typeof appSecurity}`);
    
    // 2. 检查环境
    console.log('\n2. 环境检查:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   CTRIP_USE_TEST_ENV: ${process.env.CTRIP_USE_TEST_ENV}`);
    console.log(`   使用的 baseURL: ${CTRIP_API_CONFIG.baseURL}`);
    
    // 3. 构建请求
    console.log('\n3. 请求详情:');
    const url = `${CTRIP_API_CONFIG.baseURL}/SwitchAPI/Order/Ticket`;
    const requestBody = {
      appkey: appKey,
      appSecurity,
    };
    
    console.log(`   URL: ${url}`);
    console.log(`   请求方法: POST`);
    console.log(`   请求体字段: ${Object.keys(requestBody).join(', ')}`);
    console.log(`   请求体 appKey 值: ${appKey}`);
    console.log(`   请求体 appSecurity 值: ${appSecurity ? appSecurity.substring(0, 5) + '...' : '未设置'}`);
    
    // 4. 发送请求
    console.log('\n4. 发送请求...');
    try {
      const response = await axios.post(
        url,
        requestBody,
        {
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
          },
          // 启用请求拦截器来查看实际发送的数据
          transformRequest: [(data) => {
            console.log('\n   实际发送的请求体:');
            console.log(JSON.stringify(data, null, 2));
            return JSON.stringify(data);
          }],
        }
      );
      
      console.log('\n5. 响应详情:');
      console.log(`   状态码: ${response.status}`);
      console.log(`   响应头:`, JSON.stringify(response.headers, null, 2));
      console.log(`   响应数据:`, JSON.stringify(response.data, null, 2));
      
      if (response.data && response.data.Status && response.data.Status.Success) {
        console.log('\n✅ Ticket获取成功！');
        console.log(`   Ticket: ${response.data.Ticket.substring(0, 20)}...`);
      } else {
        console.log('\n❌ Ticket获取失败');
        console.log(`   错误代码: ${response.data?.Status?.ErrorCode}`);
        console.log(`   错误消息: ${response.data?.Status?.Message}`);
      }
    } catch (error) {
      console.log('\n5. 请求错误:');
      console.log(`   错误类型: ${error.name}`);
      console.log(`   错误消息: ${error.message}`);
      
      if (error.response) {
        console.log(`   响应状态码: ${error.response.status}`);
        console.log(`   响应数据:`, JSON.stringify(error.response.data, null, 2));
      }
      
      if (error.request) {
        console.log(`   请求已发送但无响应`);
      }
      
      throw error;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('调试完成');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('调试失败');
    console.log('='.repeat(60));
    console.log(`错误: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  debugAPI();
}

module.exports = { debugAPI };

