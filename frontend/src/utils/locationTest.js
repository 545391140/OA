/**
 * 地理位置功能测试脚本
 * 用于验证地理位置服务的各项功能
 */

import {
  getAllLocations,
  getAllAirports,
  getAllStations,
  getAllCities,
  searchLocations,
  clearAllCache,
  getCacheStatus
} from '../services/locationService';

/**
 * 测试地理位置服务功能
 */
export const testLocationService = async () => {
  console.log('🧪 开始测试地理位置服务功能...');
  
  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  };

  // 测试1: 获取缓存状态
  console.log('\n📊 测试1: 获取缓存状态');
  testResults.total++;
  try {
    const cacheStatus = getCacheStatus();
    console.log('✅ 缓存状态获取成功:', cacheStatus);
    testResults.passed++;
  } catch (error) {
    console.error('❌ 缓存状态获取失败:', error);
    testResults.failed++;
    testResults.errors.push('缓存状态获取失败: ' + error.message);
  }

  // 测试2: 获取所有机场数据
  console.log('\n✈️ 测试2: 获取所有机场数据');
  testResults.total++;
  try {
    const airports = await getAllAirports();
    console.log(`✅ 机场数据获取成功: ${airports.length} 个机场`);
    if (airports.length > 0) {
      console.log('示例机场:', airports[0]);
    }
    testResults.passed++;
  } catch (error) {
    console.error('❌ 机场数据获取失败:', error);
    testResults.failed++;
    testResults.errors.push('机场数据获取失败: ' + error.message);
  }

  // 测试3: 获取所有火车站数据
  console.log('\n🚄 测试3: 获取所有火车站数据');
  testResults.total++;
  try {
    const stations = await getAllStations();
    console.log(`✅ 火车站数据获取成功: ${stations.length} 个火车站`);
    if (stations.length > 0) {
      console.log('示例火车站:', stations[0]);
    }
    testResults.passed++;
  } catch (error) {
    console.error('❌ 火车站数据获取失败:', error);
    testResults.failed++;
    testResults.errors.push('火车站数据获取失败: ' + error.message);
  }

  // 测试4: 获取所有城市数据
  console.log('\n🏙️ 测试4: 获取所有城市数据');
  testResults.total++;
  try {
    const cities = await getAllCities();
    console.log(`✅ 城市数据获取成功: ${cities.length} 个城市`);
    if (cities.length > 0) {
      console.log('示例城市:', cities[0]);
    }
    testResults.passed++;
  } catch (error) {
    console.error('❌ 城市数据获取失败:', error);
    testResults.failed++;
    testResults.errors.push('城市数据获取失败: ' + error.message);
  }

  // 测试5: 获取所有地理位置数据
  console.log('\n🌍 测试5: 获取所有地理位置数据');
  testResults.total++;
  try {
    const allLocations = await getAllLocations();
    console.log(`✅ 所有地理位置数据获取成功: ${allLocations.length} 个位置`);
    
    // 统计各类型数量
    const airportCount = allLocations.filter(l => l.type === 'airport').length;
    const stationCount = allLocations.filter(l => l.type === 'station').length;
    const cityCount = allLocations.filter(l => l.type === 'city').length;
    
    console.log(`📊 数据统计: 机场${airportCount}个, 火车站${stationCount}个, 城市${cityCount}个`);
    testResults.passed++;
  } catch (error) {
    console.error('❌ 所有地理位置数据获取失败:', error);
    testResults.failed++;
    testResults.errors.push('所有地理位置数据获取失败: ' + error.message);
  }

  // 测试6: 搜索功能测试
  console.log('\n🔍 测试6: 搜索功能测试');
  testResults.total++;
  try {
    const allLocations = await getAllLocations();
    
    // 测试中文搜索
    const chineseResults = searchLocations('北京', allLocations);
    console.log(`✅ 中文搜索'北京': ${chineseResults.length} 个结果`);
    
    // 测试英文搜索
    const englishResults = searchLocations('Beijing', allLocations);
    console.log(`✅ 英文搜索'Beijing': ${englishResults.length} 个结果`);
    
    // 测试代码搜索
    const codeResults = searchLocations('PEK', allLocations);
    console.log(`✅ 代码搜索'PEK': ${codeResults.length} 个结果`);
    
    testResults.passed++;
  } catch (error) {
    console.error('❌ 搜索功能测试失败:', error);
    testResults.failed++;
    testResults.errors.push('搜索功能测试失败: ' + error.message);
  }

  // 测试7: 缓存机制测试
  console.log('\n💾 测试7: 缓存机制测试');
  testResults.total++;
  try {
    // 清除缓存
    clearAllCache();
    console.log('✅ 缓存清除成功');
    
    // 重新获取缓存状态
    const cacheStatusAfterClear = getCacheStatus();
    console.log('✅ 清除后缓存状态:', cacheStatusAfterClear);
    
    testResults.passed++;
  } catch (error) {
    console.error('❌ 缓存机制测试失败:', error);
    testResults.failed++;
    testResults.errors.push('缓存机制测试失败: ' + error.message);
  }

  // 输出测试结果
  console.log('\n📋 测试结果汇总:');
  console.log(`总测试数: ${testResults.total}`);
  console.log(`通过: ${testResults.passed}`);
  console.log(`失败: ${testResults.failed}`);
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ 错误详情:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }

  return testResults;
};

/**
 * 在浏览器控制台中运行测试
 */
export const runLocationTest = () => {
  console.log('🚀 启动地理位置功能测试...');
  testLocationService().then(results => {
    if (results.failed === 0) {
      console.log('🎉 所有测试通过！地理位置功能运行正常！');
    } else {
      console.log('⚠️ 部分测试失败，请检查错误信息');
    }
  }).catch(error => {
    console.error('💥 测试运行失败:', error);
  });
};

// 将测试函数添加到全局对象，方便在浏览器控制台调用
if (typeof window !== 'undefined') {
  window.testLocationService = testLocationService;
  window.runLocationTest = runLocationTest;
  console.log('🧪 地理位置测试函数已添加到全局对象:');
  console.log('- window.testLocationService() - 运行完整测试');
  console.log('- window.runLocationTest() - 快速测试');
}

export default {
  testLocationService,
  runLocationTest
};



