/**
 * 测试携程API连接
 * 用于验证API密钥是否正确配置
 * 
 * 使用方法：
 * node backend/scripts/testCtripApi.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const ctripApiService = require('../services/ctripApiService');
const config = require('../config');

// 默认使用生产环境（已修改为默认使用生产环境）
// 如需使用测试环境，请设置: process.env.CTRIP_USE_TEST_ENV = 'true';
// process.env.CTRIP_USE_TEST_ENV = 'true';

async function testAPI() {
  try {
    console.log('='.repeat(60));
    console.log('测试携程API连接');
    console.log('='.repeat(60));
    
    // 检查配置
    console.log('\n1. 检查API配置:');
    const appKey = config.CTRIP_APP_KEY || process.env.CTRIP_APP_KEY;
    const appSecurity = config.CTRIP_APP_SECURITY || process.env.CTRIP_APP_SECURITY;
    
    console.log(`   AppKey: ${appKey ? appKey.substring(0, 5) + '...' : '未配置'}`);
    console.log(`   AppSecurity: ${appSecurity ? '已配置' : '未配置'}`);
    console.log(`   使用环境: ${process.env.CTRIP_USE_TEST_ENV === 'true' ? '测试环境' : '生产环境'}`);
    
    if (!appKey || !appSecurity) {
      console.log('\n❌ API密钥未配置！');
      console.log('\n请配置以下环境变量:');
      console.log('  CTRIP_APP_KEY=your_app_key');
      console.log('  CTRIP_APP_SECURITY=your_app_security');
      console.log('\n或在 backend/config.js 中配置默认值');
      process.exit(1);
    }
    
    // 测试1: 获取Ticket
    console.log('\n2. 测试获取Ticket...');
    try {
      const ticket = await ctripApiService.getTicket();
      console.log(`   ✅ Ticket获取成功`);
      console.log(`   Ticket (前20字符): ${ticket.substring(0, 20)}...`);
    } catch (error) {
      console.log(`   ❌ Ticket获取失败: ${error.message}`);
      
      if (error.message.includes('非对接客户')) {
        console.log('\n   可能的原因:');
        console.log('   1. API密钥未激活或未正确配置');
        console.log('   2. 需要联系携程开通API权限');
        console.log('   3. AppKey或AppSecurity错误');
      }
      
      throw error;
    }
    
    // 测试2: 获取国家列表
    console.log('\n3. 测试获取国家列表...');
    try {
      const countries = await ctripApiService.getAllCountries('zh-CN');
      console.log(`   ✅ 国家列表获取成功`);
      console.log(`   国家数量: ${countries.length}`);
      console.log(`   示例国家: ${countries.slice(0, 3).map(c => c.name).join(', ')}`);
    } catch (error) {
      console.log(`   ❌ 国家列表获取失败: ${error.message}`);
      throw error;
    }
    
    // 测试3: 获取单个国家的POI数据（中国）
    console.log('\n4. 测试获取POI数据（中国）...');
    try {
      const poiData = await ctripApiService.getAllPOIInfo({
        countryId: 1,
        returnAirport: true,
        returnTrainStation: true,
        returnBusStation: true,
      });
      
      console.log(`   ✅ POI数据获取成功`);
      console.log(`   省份数量: ${poiData.dataList?.length || 0}`);
      
      if (poiData.dataList && poiData.dataList.length > 0) {
        const firstProvince = poiData.dataList[0];
        console.log(`   示例省份: ${firstProvince.provinceName}`);
        
        if (firstProvince.prefectureLevelCityInfoList && firstProvince.prefectureLevelCityInfoList.length > 0) {
          const firstCity = firstProvince.prefectureLevelCityInfoList[0];
          console.log(`   示例城市: ${firstCity.cityName}`);
          console.log(`   城市ID: ${firstCity.cityId}`);
          console.log(`   机场数量: ${firstCity.stationInfo?.airportList?.length || 0}`);
          console.log(`   火车站数量: ${firstCity.stationInfo?.trainStationList?.length || 0}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ POI数据获取失败: ${error.message}`);
      throw error;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 所有API测试通过！');
    console.log('='.repeat(60));
    console.log('\nAPI密钥配置正确，可以开始同步数据了！');
    console.log('\n运行完整同步:');
    console.log('  node backend/scripts/syncGlobalLocations.js');
    
    process.exit(0);
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
    console.log('4. 检查网络连接');
    
    process.exit(1);
  }
}

if (require.main === module) {
  testAPI();
}

module.exports = { testAPI };

