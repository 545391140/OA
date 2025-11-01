/**
 * API测试工具
 * 用于测试携程API的连接状态和数据获取
 */

// 携程API配置
const CTRIP_API_CONFIG = {
  // 生产环境
  baseURL: 'https://ct.ctrip.com',
  // 测试环境 (注释掉)
  // baseURL: 'https://gateway.fat.ctripqa.com',
  appKey: 'RJW',
  appSecurity: '2Oxb3x#Cc',
  timeout: 10000,
  // API端点
  endpoints: {
    getTicket: '/SwitchAPI/Order/Ticket',
    getCountries: '/switchAPI/basedata/v2/getcountry',
    getPOIInfo: '/switchapi/basedata/v2/queryAllPOIInfo'
  }
};

/**
 * 生成携程API签名
 */
const generateSignature = (appKey, appSecurity, timestamp) => {
  const signString = `${appKey}${appSecurity}${timestamp}`;
  return btoa(signString);
};

/**
 * 获取API请求头
 */
const getApiHeaders = () => {
  const timestamp = Date.now();
  const signature = generateSignature(CTRIP_API_CONFIG.appKey, CTRIP_API_CONFIG.appSecurity, timestamp);
  
  return {
    'Content-Type': 'application/json',
    'AppKey': CTRIP_API_CONFIG.appKey,
    'Timestamp': timestamp.toString(),
    'Signature': signature
  };
};

/**
 * 获取Ticket
 */
const getTicket = async () => {
  try {
    console.log('🔑 获取Ticket...');
    
    const requestBody = {
      appKey: CTRIP_API_CONFIG.appKey,
      appSecurity: CTRIP_API_CONFIG.appSecurity
    };

    const response = await fetch(`${CTRIP_API_CONFIG.baseURL}${CTRIP_API_CONFIG.endpoints.getTicket}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('Ticket API响应状态:', response.status);

    if (response.ok) {
      const result = await response.json();
      if (result.Status && result.Status.Success && result.Ticket) {
        console.log('✅ Ticket获取成功');
        return result.Ticket;
      } else {
        throw new Error(`Ticket获取失败: ${result.Status?.Message || '未知错误'}`);
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.log('❌ Ticket获取失败:', error.message);
    throw error;
  }
};

/**
 * 测试API连接
 */
export const testApiConnection = async () => {
  console.log('🔍 开始测试携程API连接...');
  console.log('API配置:', CTRIP_API_CONFIG);
  
  const testResults = {
    ticket: { success: false, error: null, data: null },
    cities: { success: false, error: null, data: null },
    countries: { success: false, error: null, data: null }
  };

  // 测试Ticket获取
  try {
    const ticket = await getTicket();
    testResults.ticket.success = true;
    testResults.ticket.data = ticket;
  } catch (error) {
    testResults.ticket.error = error.message;
  }

  // 如果有Ticket，测试城市API
  if (testResults.ticket.success) {
    try {
      console.log('📡 测试城市API...');
      
      const requestBody = {
        Auth: {
          AppKey: CTRIP_API_CONFIG.appKey,
          Ticket: testResults.ticket.data
        },
        requestId: `test_${Date.now()}`,
        locale: 'zh-CN'
      };

      const response = await fetch(`${CTRIP_API_CONFIG.baseURL}${CTRIP_API_CONFIG.endpoints.getCountries}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'AppKey': CTRIP_API_CONFIG.appKey,
          'Ticket': testResults.ticket.data
        },
        body: JSON.stringify(requestBody)
      });

      console.log('城市API响应状态:', response.status);

      if (response.ok) {
        const data = await response.json();
        testResults.cities.success = true;
        testResults.cities.data = data;
        console.log('✅ 城市API调用成功');
      } else {
        testResults.cities.error = `HTTP ${response.status}: ${response.statusText}`;
        console.log('❌ 城市API调用失败:', testResults.cities.error);
      }
    } catch (error) {
      testResults.cities.error = error.message;
      console.log('❌ 城市API调用异常:', error.message);
    }

    // 测试国家API
    try {
      console.log('📡 测试国家API...');
      
      const requestBody = {
        Auth: {
          AppKey: CTRIP_API_CONFIG.appKey,
          Ticket: testResults.ticket.data
        },
        requestId: `test_${Date.now()}`,
        locale: 'zh-CN'
      };

      const response = await fetch(`${CTRIP_API_CONFIG.baseURL}${CTRIP_API_CONFIG.endpoints.getPOIInfo}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'AppKey': CTRIP_API_CONFIG.appKey,
          'Ticket': testResults.ticket.data
        },
        body: JSON.stringify({
          auth: {
            AppKey: CTRIP_API_CONFIG.appKey,
            Ticket: testResults.ticket.data
          },
          countryId: 1,
          provinceConditions: {
            provinceIds: "",
            provinceNames: "",
            prefectureLevelCityConditions: {
              prefectureLevelCityIds: "",
              prefectureLevelCityNames: "",
              returnDistrict: true,
              returnCounty: true
            }
          },
          poiConditions: {
            returnAirport: true,
            returnTrainStation: true,
            returnBusStation: true
          }
        })
      });

      console.log('国家API响应状态:', response.status);

      if (response.ok) {
        const data = await response.json();
        testResults.countries.success = true;
        testResults.countries.data = data;
        console.log('✅ 国家API调用成功');
      } else {
        testResults.countries.error = `HTTP ${response.status}: ${response.statusText}`;
        console.log('❌ 国家API调用失败:', testResults.countries.error);
      }
    } catch (error) {
      testResults.countries.error = error.message;
      console.log('❌ 国家API调用异常:', error.message);
    }
  }

  console.log('🎯 API测试结果:', testResults);
  return testResults;
};

/**
 * 测试网络连接
 */
export const testNetworkConnection = async () => {
  console.log('🌐 测试网络连接...');
  
  try {
    // 测试基本网络连接
    const response = await fetch('https://www.baidu.com', { 
      method: 'HEAD',
      mode: 'no-cors'
    });
    console.log('✅ 网络连接正常');
    return true;
  } catch (error) {
    console.log('❌ 网络连接异常:', error.message);
    return false;
  }
};

/**
 * 检查本地存储
 */
export const checkLocalStorage = () => {
  console.log('💾 检查本地存储...');
  
  const cacheKeys = [
    'ctrip_airports_cache',
    'ctrip_stations_cache', 
    'ctrip_cities_cache'
  ];

  const cacheStatus = {};
  
  cacheKeys.forEach(key => {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        const isValid = age < (24 * 60 * 60 * 1000); // 24小时
        
        cacheStatus[key] = {
          exists: true,
          valid: isValid,
          age: Math.round(age / (60 * 60 * 1000)), // 小时
          dataCount: Array.isArray(data) ? data.length : 0
        };
        
        console.log(`📦 ${key}: ${isValid ? '有效' : '过期'} (${cacheStatus[key].age}小时前, ${cacheStatus[key].dataCount}条数据)`);
      } else {
        cacheStatus[key] = { exists: false };
        console.log(`📦 ${key}: 不存在`);
      }
    } catch (error) {
      cacheStatus[key] = { exists: false, error: error.message };
      console.log(`📦 ${key}: 读取失败 - ${error.message}`);
    }
  });

  return cacheStatus;
};

/**
 * 运行完整诊断
 */
export const runFullDiagnosis = async () => {
  console.log('🚀 开始完整诊断...');
  
  const results = {
    network: false,
    api: null,
    cache: null,
    timestamp: new Date().toISOString()
  };

  // 1. 测试网络连接
  results.network = await testNetworkConnection();
  
  // 2. 检查本地缓存
  results.cache = checkLocalStorage();
  
  // 3. 测试API连接
  if (results.network) {
    results.api = await testApiConnection();
  } else {
    console.log('⚠️ 网络连接失败，跳过API测试');
  }

  console.log('🎯 完整诊断结果:', results);
  return results;
};
