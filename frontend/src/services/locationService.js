
/**
 * 地理位置服务 - 基于携程商旅API
 * 提供机场、火车站等地理位置信息的获取和缓存
 */

import apiClient from '../utils/axiosConfig';

// 携程API配置
// 注意：前端不直接调用携程API，而是通过后端代理
// 此配置仅用于参考，实际API调用通过后端进行
const CTRIP_API_CONFIG = {
  // 生产环境（默认）
  baseURL: 'https://ct.ctrip.com',
  // 测试环境（已禁用，如需使用请设置环境变量 CTRIP_USE_TEST_ENV=true）
  // baseURL: 'https://gateway.fat.ctripqa.com',
  appKey: 'obk_rjwl',
  appSecurity: 'eW5(Np%RrUuU#(Z3x$8@kOW(',
  timeout: 10000,
  // API端点
  endpoints: {
    getTicket: '/SwitchAPI/Order/Ticket',
    getCountries: '/switchAPI/basedata/v2/getcountry',
    getPOIInfo: '/switchapi/basedata/v2/queryAllPOIInfo'
  }
};

// 缓存配置
const CACHE_CONFIG = {
  // 缓存键名
  TICKET_KEY: 'ctrip_ticket_cache',
  AIRPORTS_KEY: 'ctrip_airports_cache',
  STATIONS_KEY: 'ctrip_stations_cache',
  CITIES_KEY: 'ctrip_cities_cache',
  COUNTRIES_KEY: 'ctrip_countries_cache',
  // 缓存过期时间（24小时）
  CACHE_EXPIRE_TIME: 24 * 60 * 60 * 1000,
  // Ticket过期时间（2小时）
  TICKET_EXPIRE_TIME: 2 * 60 * 60 * 1000
};

/**
 * 生成携程API签名
 * @param {string} appKey - 应用密钥
 * @param {string} appSecurity - 应用安全码
 * @param {number} timestamp - 时间戳
 * @returns {string} 签名
 */
const generateSignature = (appKey, appSecurity, timestamp) => {
  // 携程API签名算法（简化版）
  const signString = `${appKey}${appSecurity}${timestamp}`;
  return btoa(signString); // 实际项目中应使用更安全的签名算法
};

/**
 * 获取Ticket
 * @returns {Promise<string>} Ticket字符串
 */
const getTicket = async () => {
  // 先检查缓存
  if (isCacheValid(CACHE_CONFIG.TICKET_KEY, CACHE_CONFIG.TICKET_EXPIRE_TIME)) {
    console.log('从缓存获取Ticket');
    return getCachedData(CACHE_CONFIG.TICKET_KEY);
  }

  try {
    console.log('从API获取Ticket...');
    
    const requestBody = {
      appkey: CTRIP_API_CONFIG.appKey,  // 注意：API要求字段名为 appkey（全小写）
      appSecurity: CTRIP_API_CONFIG.appSecurity
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CTRIP_API_CONFIG.timeout);
    
    // 注意：直接调用外部API会有CORS问题，应该通过后端代理
    // 这里暂时禁用外部API调用，返回一个模拟的Ticket（用于开发测试）
    console.warn('外部API调用已禁用，使用模拟Ticket');
    
    // 返回一个模拟的Ticket（仅用于开发测试）
    const mockTicket = 'mock_ticket_' + Date.now();
    setCachedData(CACHE_CONFIG.TICKET_KEY, mockTicket);
    return mockTicket;
    
    /*
    // 原始API调用代码（已禁用）
    const response = await fetch(`${CTRIP_API_CONFIG.baseURL}${CTRIP_API_CONFIG.endpoints.getTicket}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`获取Ticket失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Ticket API响应:', result);
    
    if (result.Status && result.Status.Success && result.Ticket) {
      // 缓存Ticket
      setCachedData(CACHE_CONFIG.TICKET_KEY, result.Ticket);
      console.log('Ticket获取成功:', result.Ticket.substring(0, 20) + '...');
      return result.Ticket;
    } else {
      throw new Error(`Ticket获取失败: ${result.Status?.Message || '未知错误'}`);
    }
    */
  } catch (error) {
    console.error('获取Ticket失败:', error);
    // 如果出错，返回一个模拟Ticket（用于开发测试）
    const mockTicket = 'mock_ticket_error_' + Date.now();
    setCachedData(CACHE_CONFIG.TICKET_KEY, mockTicket);
    return mockTicket;
  }
};

/**
 * 获取API请求头（带Ticket）
 * @param {string} ticket - 认证Ticket
 * @returns {Object} 请求头配置
 */
const getApiHeaders = (ticket) => {
  return {
    'Content-Type': 'application/json',
    'AppKey': CTRIP_API_CONFIG.appKey,
    'Ticket': ticket
  };
};

/**
 * 检查缓存是否有效
 * @param {string} cacheKey - 缓存键
 * @param {number} expireTime - 过期时间（毫秒），可选
 * @returns {boolean} 是否有效
 */
const isCacheValid = (cacheKey, expireTime = CACHE_CONFIG.CACHE_EXPIRE_TIME) => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return false;
    
    const { timestamp, data } = JSON.parse(cached);
    const now = Date.now();
    
    return (now - timestamp) < expireTime;
  } catch (error) {
    console.error('缓存检查失败:', error);
    return false;
  }
};

/**
 * 获取缓存数据
 * @param {string} cacheKey - 缓存键
 * @returns {any} 缓存数据
 */
const getCachedData = (cacheKey) => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
  } catch (error) {
    console.error('获取缓存失败:', error);
  }
  return null;
};

/**
 * 设置缓存数据
 * @param {string} cacheKey - 缓存键
 * @param {any} data - 要缓存的数据
 */
const setCachedData = (cacheKey, data) => {
  try {
    const cacheData = {
      timestamp: Date.now(),
      data: data
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    console.log(`缓存已更新: ${cacheKey}`);
  } catch (error) {
    console.error('设置缓存失败:', error);
  }
};

/**
 * 获取所有机场信息
 * @returns {Promise<Array>} 机场列表
 */
export const getAllAirports = async () => {
  // 先检查缓存
  if (isCacheValid(CACHE_CONFIG.AIRPORTS_KEY)) {
    console.log('从缓存获取机场数据');
    return getCachedData(CACHE_CONFIG.AIRPORTS_KEY);
  }

  try {
    console.log('从API获取机场数据...');
    
    // 模拟携程API调用（实际项目中替换为真实API）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CTRIP_API_CONFIG.timeout);
    
    // 注意：直接调用外部API会有CORS问题，应该使用后端API
    // 暂时禁用外部API调用，直接返回默认数据或缓存数据
    console.warn('外部API调用已禁用，使用默认或缓存数据');
    
    // 尝试返回缓存数据（即使过期）
    const fallbackData = getCachedData(CACHE_CONFIG.AIRPORTS_KEY);
    if (fallbackData) {
      console.log('使用缓存数据');
      return fallbackData;
    }
    
    // 返回默认数据
    return getDefaultAirports();
    
    /*
    // 原始API调用代码（已禁用）
    const response = await fetch(`${CTRIP_API_CONFIG.baseURL}/airport/list`, {
      method: 'GET',
      headers: getApiHeaders(),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const result = await response.json();
    
    // 处理API返回的数据格式
    const airports = result.data?.airports || [];
    
    // 标准化数据格式
    const standardizedAirports = airports.map(airport => ({
      id: airport.airportCode,
      name: airport.airportName,
      city: airport.cityName,
      country: airport.countryName,
      code: airport.airportCode,
      type: 'airport',
      coordinates: {
        latitude: airport.latitude,
        longitude: airport.longitude
      },
      timezone: airport.timezone,
      status: airport.status || 'active'
    }));

    // 缓存数据
    setCachedData(CACHE_CONFIG.AIRPORTS_KEY, standardizedAirports);
    
    return standardizedAirports;
    */
  } catch (error) {
    console.error('获取机场数据失败:', error);
    
    // 如果API失败，尝试返回缓存数据（即使过期）
    const fallbackData = getCachedData(CACHE_CONFIG.AIRPORTS_KEY);
    if (fallbackData) {
      console.log('使用过期缓存数据');
      return fallbackData;
    }
    
    // 返回默认数据
    return getDefaultAirports();
  }
};

/**
 * 获取所有火车站信息
 * @returns {Promise<Array>} 火车站列表
 */
export const getAllStations = async () => {
  // 先检查缓存
  if (isCacheValid(CACHE_CONFIG.STATIONS_KEY)) {
    console.log('从缓存获取火车站数据');
    return getCachedData(CACHE_CONFIG.STATIONS_KEY);
  }

  try {
    console.log('从API获取火车站数据...');
    
    // 模拟携程API调用
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CTRIP_API_CONFIG.timeout);
    
    // 注意：直接调用外部API会有CORS问题，应该使用后端API
    // 暂时禁用外部API调用，直接返回默认数据或缓存数据
    console.warn('外部API调用已禁用，使用默认或缓存数据');
    
    // 尝试返回缓存数据（即使过期）
    const fallbackData = getCachedData(CACHE_CONFIG.STATIONS_KEY);
    if (fallbackData) {
      console.log('使用缓存数据');
      return fallbackData;
    }
    
    // 返回默认数据
    return getDefaultStations();
    
    /*
    // 原始API调用代码（已禁用）
    const response = await fetch(`${CTRIP_API_CONFIG.baseURL}/station/list`, {
      method: 'GET',
      headers: getApiHeaders(),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const result = await response.json();
    
    // 处理API返回的数据格式
    const stations = result.data?.stations || [];
    
    // 标准化数据格式
    const standardizedStations = stations.map(station => ({
      id: station.stationCode,
      name: station.stationName,
      city: station.cityName,
      country: station.countryName,
      code: station.stationCode,
      type: 'station',
      coordinates: {
        latitude: station.latitude,
        longitude: station.longitude
      },
      timezone: station.timezone,
      status: station.status || 'active'
    }));

    // 缓存数据
    setCachedData(CACHE_CONFIG.STATIONS_KEY, standardizedStations);
    
    return standardizedStations;
    */
  } catch (error) {
    console.error('获取火车站数据失败:', error);
    
    // 如果API失败，尝试返回缓存数据
    const fallbackData = getCachedData(CACHE_CONFIG.STATIONS_KEY);
    if (fallbackData) {
      console.log('使用过期缓存数据');
      return fallbackData;
    }
    
    // 返回默认数据
    return getDefaultStations();
  }
};

/**
 * 获取所有城市信息
 * @returns {Promise<Array>} 城市列表
 */
/**
 * 获取所有国家信息（使用后端API）
 * @returns {Promise<Array>} 国家列表
 */
export const getAllCountries = async () => {
  // 先检查缓存
  if (isCacheValid(CACHE_CONFIG.COUNTRIES_KEY)) {
    console.log('从缓存获取国家数据');
    return getCachedData(CACHE_CONFIG.COUNTRIES_KEY);
  }

  try {
    console.log('从后端API获取国家数据...');
    
    // 使用后端API代理
    const response = await apiClient.get('/ctrip/countries', {
      params: { locale: 'zh-CN' }
    });
    
    if (response.data && response.data.success) {
      const countries = response.data.data || [];
    
    // 标准化数据格式
    const standardizedCountries = countries.map(country => ({
      id: country.countryId?.toString(),
      name: country.name,
      city: country.name,
      country: country.name,
      code: country.code,
      type: 'country',
      enName: country.enName,
      continentId: country.continentId,
      coordinates: { latitude: 0, longitude: 0 },
      timezone: 'UTC',
      status: 'active',
    }));

    // 缓存数据
    setCachedData(CACHE_CONFIG.COUNTRIES_KEY, standardizedCountries);
    console.log(`国家数据获取成功: ${standardizedCountries.length}条`);
    
    return standardizedCountries;
    } else {
      throw new Error(response.data?.message || '获取国家数据失败');
    }
  } catch (error) {
    console.error('获取国家数据失败:', error);
    
    // 如果API失败，尝试返回缓存数据
    const fallbackData = getCachedData(CACHE_CONFIG.COUNTRIES_KEY);
    if (fallbackData) {
      console.log('使用过期缓存数据');
      return fallbackData;
    }
    
    // 返回默认数据
    return getDefaultCountries();
  }
};

/**
 * 获取全量地理信息数据（城市、机场、火车站等）
 * @param {number|null} countryId - 国家ID，默认为1（中国），null表示获取所有国家
 * @returns {Promise<Array>} 地理信息列表
 */
export const getAllPOIInfo = async (countryId = 1) => {
  // 先检查缓存
  const cacheKey = `${CACHE_CONFIG.CITIES_KEY}_${countryId || 'all'}`;
  if (isCacheValid(cacheKey)) {
    console.log('从缓存获取POI数据');
    return getCachedData(cacheKey);
  }

  try {
    console.log(`从后端API获取POI数据... (国家ID: ${countryId || '全部'})`);
    
    // 使用后端API代理获取POI数据并转换为Location格式
    const response = await apiClient.post('/ctrip/poi/locations', {
      countryId: countryId || undefined, // 如果为null，不传countryId参数
      returnDistrict: true,
      returnCounty: true,
      returnAirport: true,
      returnTrainStation: true,
      returnBusStation: true,
    });
    
    if (response.data && response.data.success) {
      const locations = response.data.data || [];
      
      // 缓存数据
      setCachedData(cacheKey, locations);
      console.log(`POI数据获取成功: ${locations.length}条`);
      
      return locations;
    } else {
      throw new Error(response.data?.message || '获取POI数据失败');
    }
  } catch (error) {
    console.error('获取POI数据失败:', error);
    
    // 如果API失败，尝试返回缓存数据
    const fallbackData = getCachedData(cacheKey);
    if (fallbackData) {
      console.log('使用过期缓存数据');
      return fallbackData;
    }
    
    // 返回默认数据
    return getDefaultCities();
  }
};

export const getAllCities = async () => {
  // 使用新的POI API获取城市数据（仅中国）
  return getAllPOIInfo(1);
};

/**
 * 获取全球所有国家的POI数据
 * @param {Object} options - 选项
 * @param {boolean} options.parallel - 是否并行获取（默认false，串行获取避免API限流）
 * @param {number} options.delay - 每个国家之间的延迟（毫秒），默认1000
 * @param {Function} options.onProgress - 进度回调函数 (current, total) => void
 * @returns {Promise<Array>} 全球地理信息列表
 */
export const getGlobalPOIInfo = async (options = {}) => {
  const {
    parallel = false,
    delay = 1000,
    onProgress = null
  } = options;

  // 检查缓存
  const globalCacheKey = `${CACHE_CONFIG.CITIES_KEY}_global`;
  if (isCacheValid(globalCacheKey)) {
    console.log('从缓存获取全球POI数据');
    return getCachedData(globalCacheKey);
  }

  try {
    console.log('开始获取全球POI数据...');
    
    // 先获取所有国家列表
    const countries = await getAllCountries();
    console.log(`获取到 ${countries.length} 个国家，开始获取POI数据...`);

    let allLocations = [];
    
    if (parallel) {
      // 并行获取（可能触发API限流）
      console.log('并行获取模式（可能触发API限流）');
      const promises = countries.map(country => 
        getAllPOIInfo(country.id ? parseInt(country.id) : null).catch(err => {
          console.warn(`获取 ${country.name} 数据失败:`, err.message);
          return [];
        })
      );
      
      const results = await Promise.all(promises);
      allLocations = results.flat();
    } else {
      // 串行获取（推荐，避免API限流）
      console.log('串行获取模式（避免API限流）');
      for (let i = 0; i < countries.length; i++) {
        const country = countries[i];
        const countryId = country.id ? parseInt(country.id) : null;
        
        try {
          console.log(`[${i + 1}/${countries.length}] 获取 ${country.name} 的数据...`);
          const locations = await getAllPOIInfo(countryId);
          allLocations = allLocations.concat(locations);
          
          // 调用进度回调
          if (onProgress) {
            onProgress(i + 1, countries.length);
          }
          
          // 延迟，避免请求过快
          if (i < countries.length - 1 && delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          console.warn(`获取 ${country.name} 数据失败:`, error.message);
          // 继续处理下一个国家
        }
      }
    }

    console.log(`全球POI数据获取完成: 共 ${allLocations.length} 条数据`);

    // 缓存全球数据
    setCachedData(globalCacheKey, allLocations);
    
    return allLocations;
  } catch (error) {
    console.error('获取全球POI数据失败:', error);
    
    // 如果失败，尝试返回缓存数据
    const fallbackData = getCachedData(globalCacheKey);
    if (fallbackData) {
      console.log('使用过期缓存数据');
      return fallbackData;
    }
    
    // 返回默认数据
    return getDefaultCities();
  }
};

/**
 * 获取所有地理位置信息（机场+火车站+城市）
 * @returns {Promise<Array>} 所有地理位置列表
 */
export const getAllLocations = async () => {
  try {
    console.log('开始获取所有地理位置数据...');
    
    // 并行获取所有数据
    const [airports, stations, cities] = await Promise.all([
      getAllAirports(),
      getAllStations(),
      getAllCities()
    ]);
    
    // 合并所有数据
    const allLocations = [...airports, ...stations, ...cities];
    
    console.log(`获取完成: ${airports.length}个机场, ${stations.length}个火车站, ${cities.length}个城市`);
    
    return allLocations;
  } catch (error) {
    console.error('获取地理位置数据失败:', error);
    return [];
  }
};

/**
 * 搜索地理位置
 * @param {string} keyword - 搜索关键词
 * @param {Array} locations - 地理位置列表
 * @returns {Array} 搜索结果
 */
export const searchLocations = (keyword, locations) => {
  if (!keyword || !locations) return [];
  
  const lowerKeyword = keyword.toLowerCase();
  
  return locations.filter(location => {
    return (
      (location.name && location.name.toLowerCase().includes(lowerKeyword)) ||
      (location.city && location.city.toLowerCase().includes(lowerKeyword)) ||
      (location.code && location.code.toLowerCase().includes(lowerKeyword)) ||
      (location.country && location.country.toLowerCase().includes(lowerKeyword))
    );
  });
};

/**
 * 清除所有缓存
 */
export const clearAllCache = () => {
  try {
    localStorage.removeItem(CACHE_CONFIG.AIRPORTS_KEY);
    localStorage.removeItem(CACHE_CONFIG.STATIONS_KEY);
    localStorage.removeItem(CACHE_CONFIG.CITIES_KEY);
    console.log('所有地理位置缓存已清除');
  } catch (error) {
    console.error('清除缓存失败:', error);
  }
};

/**
 * 获取缓存状态
 * @returns {Object} 缓存状态信息
 */
export const getCacheStatus = () => {
  const airportsValid = isCacheValid(CACHE_CONFIG.AIRPORTS_KEY);
  const stationsValid = isCacheValid(CACHE_CONFIG.STATIONS_KEY);
  const citiesValid = isCacheValid(CACHE_CONFIG.CITIES_KEY);
  
  return {
    airports: {
      valid: airportsValid,
      data: airportsValid ? getCachedData(CACHE_CONFIG.AIRPORTS_KEY) : null
    },
    stations: {
      valid: stationsValid,
      data: stationsValid ? getCachedData(CACHE_CONFIG.STATIONS_KEY) : null
    },
    cities: {
      valid: citiesValid,
      data: citiesValid ? getCachedData(CACHE_CONFIG.CITIES_KEY) : null
    }
  };
};

// 默认数据（当API不可用时使用）
const getDefaultAirports = () => [
  // 城市汇总选项
  {
    id: 'BJ_ALL',
    name: '北京 (所有机场)',
    city: '北京',
    country: '中国',
    code: 'BJS BJ',
    type: 'city',
    coordinates: { latitude: 39.9042, longitude: 116.4074 },
    timezone: 'Asia/Shanghai',
    status: 'active',
    isSummary: true
  },
  // 中国主要机场
  {
    id: 'PEK',
    name: '北京首都国际机场',
    city: '北京',
    country: '中国',
    code: 'PEK',
    type: 'airport',
    coordinates: { latitude: 40.0799, longitude: 116.6031 },
    timezone: 'Asia/Shanghai',
    status: 'active',
    parentId: 'BJ_ALL'
  },
  {
    id: 'PKX',
    name: '北京大兴国际机场',
    city: '北京',
    country: '中国',
    code: 'PKX',
    type: 'airport',
    coordinates: { latitude: 39.5098, longitude: 116.4106 },
    timezone: 'Asia/Shanghai',
    status: 'active',
    parentId: 'BJ_ALL'
  },
  {
    id: 'NAY',
    name: '北京南苑机场',
    city: '北京',
    country: '中国',
    code: 'NAY',
    type: 'airport',
    coordinates: { latitude: 39.7825, longitude: 116.3881 },
    timezone: 'Asia/Shanghai',
    status: 'active',
    parentId: 'BJ_ALL'
  },
  {
    id: 'PVG',
    name: '上海浦东国际机场',
    city: '上海',
    country: '中国',
    code: 'PVG',
    type: 'airport',
    coordinates: { latitude: 31.1434, longitude: 121.8052 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'CAN',
    name: '广州白云国际机场',
    city: '广州',
    country: '中国',
    code: 'CAN',
    type: 'airport',
    coordinates: { latitude: 23.3924, longitude: 113.2988 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'SZX',
    name: '深圳宝安国际机场',
    city: '深圳',
    country: '中国',
    code: 'SZX',
    type: 'airport',
    coordinates: { latitude: 22.6393, longitude: 113.8106 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'CTU',
    name: '成都双流国际机场',
    city: '成都',
    country: '中国',
    code: 'CTU',
    type: 'airport',
    coordinates: { latitude: 30.5783, longitude: 103.9469 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'XIY',
    name: '西安咸阳国际机场',
    city: '西安',
    country: '中国',
    code: 'XIY',
    type: 'airport',
    coordinates: { latitude: 34.4471, longitude: 108.7516 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'KMG',
    name: '昆明长水国际机场',
    city: '昆明',
    country: '中国',
    code: 'KMG',
    type: 'airport',
    coordinates: { latitude: 25.1019, longitude: 102.9292 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'URC',
    name: '乌鲁木齐地窝堡国际机场',
    city: '乌鲁木齐',
    country: '中国',
    code: 'URC',
    type: 'airport',
    coordinates: { latitude: 43.9071, longitude: 87.4742 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'TSN',
    name: '天津滨海国际机场',
    city: '天津',
    country: '中国',
    code: 'TSN',
    type: 'airport',
    coordinates: { latitude: 39.1244, longitude: 117.3464 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'NKG',
    name: '南京禄口国际机场',
    city: '南京',
    country: '中国',
    code: 'NKG',
    type: 'airport',
    coordinates: { latitude: 31.7420, longitude: 118.8620 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  // 国际主要机场
  {
    id: 'NRT',
    name: '东京成田国际机场',
    city: '东京',
    country: '日本',
    code: 'NRT',
    type: 'airport',
    coordinates: { latitude: 35.7720, longitude: 140.3928 },
    timezone: 'Asia/Tokyo',
    status: 'active',
  },
  {
    id: 'ICN',
    name: '首尔仁川国际机场',
    city: '首尔',
    country: '韩国',
    code: 'ICN',
    type: 'airport',
    coordinates: { latitude: 37.4602, longitude: 126.4407 },
    timezone: 'Asia/Seoul',
    status: 'active',
  },
  {
    id: 'SIN',
    name: '新加坡樟宜机场',
    city: '新加坡',
    country: '新加坡',
    code: 'SIN',
    type: 'airport',
    coordinates: { latitude: 1.3644, longitude: 103.9915 },
    timezone: 'Asia/Singapore',
    status: 'active',
  },
  {
    id: 'HKG',
    name: '香港国际机场',
    city: '香港',
    country: '中国',
    code: 'HKG',
    type: 'airport',
    coordinates: { latitude: 22.3080, longitude: 113.9185 },
    timezone: 'Asia/Hong_Kong',
    status: 'active',
  },
  {
    id: 'LAX',
    name: '洛杉矶国际机场',
    city: '洛杉矶',
    country: '美国',
    code: 'LAX',
    type: 'airport',
    coordinates: { latitude: 33.9416, longitude: -118.4085 },
    timezone: 'America/Los_Angeles',
    status: 'active',
  },
  {
    id: 'JFK',
    name: '纽约肯尼迪国际机场',
    city: '纽约',
    country: '美国',
    code: 'JFK',
    type: 'airport',
    coordinates: { latitude: 40.6413, longitude: -73.7781 },
    timezone: 'America/New_York',
    status: 'active',
  },
  {
    id: 'LHR',
    name: '伦敦希思罗机场',
    city: '伦敦',
    country: '英国',
    code: 'LHR',
    type: 'airport',
    coordinates: { latitude: 51.4700, longitude: -0.4543 },
    timezone: 'Europe/London',
    status: 'active',
  },
  {
    id: 'CDG',
    name: '巴黎戴高乐机场',
    city: '巴黎',
    country: '法国',
    code: 'CDG',
    type: 'airport',
    coordinates: { latitude: 49.0097, longitude: 2.5479 },
    timezone: 'Europe/Paris',
    status: 'active',
  },
  {
    id: 'FRA',
    name: '法兰克福机场',
    city: '法兰克福',
    country: '德国',
    code: 'FRA',
    type: 'airport',
    coordinates: { latitude: 50.0379, longitude: 8.5622 },
    timezone: 'Europe/Berlin',
    status: 'active',
  },
  {
    id: 'DXB',
    name: '迪拜国际机场',
    city: '迪拜',
    country: '阿联酋',
    code: 'DXB',
    type: 'airport',
    coordinates: { latitude: 25.2532, longitude: 55.3657 },
    timezone: 'Asia/Dubai',
    status: 'active',
  }
];

const getDefaultStations = () => [
  // 城市汇总选项
  {
    id: 'BJ_STATIONS_ALL',
    name: '北京 (所有车站)',
    city: '北京',
    country: '中国',
    code: 'BJS BJ',
    type: 'city',
    coordinates: { latitude: 39.9042, longitude: 116.4074 },
    timezone: 'Asia/Shanghai',
    status: 'active',
    isSummary: true
  },
  // 中国主要火车站
  {
    id: 'BJP',
    name: '北京站',
    city: '北京',
    country: '中国',
    code: 'BJP',
    type: 'station',
    coordinates: { latitude: 39.9042, longitude: 116.4074 },
    timezone: 'Asia/Shanghai',
    status: 'active',
    parentId: 'BJ_STATIONS_ALL'
  },
  {
    id: 'BXP',
    name: '北京西站',
    city: '北京',
    country: '中国',
    code: 'BXP',
    type: 'station',
    coordinates: { latitude: 39.8964, longitude: 116.3203 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'BXN',
    name: '北京南站',
    city: '北京',
    country: '中国',
    code: 'BXN',
    type: 'station',
    coordinates: { latitude: 39.8650, longitude: 116.3785 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'BXT',
    name: '北京北站',
    city: '北京',
    country: '中国',
    code: 'BXT',
    type: 'station',
    coordinates: { latitude: 39.9442, longitude: 116.3531 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'BXD',
    name: '北京东站',
    city: '北京',
    country: '中国',
    code: 'BXD',
    type: 'station',
    coordinates: { latitude: 39.9042, longitude: 116.4374 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'BXY',
    name: '北京朝阳站',
    city: '北京',
    country: '中国',
    code: 'BXY',
    type: 'station',
    coordinates: { latitude: 39.9442, longitude: 116.5031 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'BXF',
    name: '北京丰台站',
    city: '北京',
    country: '中国',
    code: 'BXF',
    type: 'station',
    coordinates: { latitude: 39.8642, longitude: 116.3031 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'BXS',
    name: '北京清河站',
    city: '北京',
    country: '中国',
    code: 'BXS',
    type: 'station',
    coordinates: { latitude: 40.0242, longitude: 116.3231 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'BXC',
    name: '北京昌平站',
    city: '北京',
    country: '中国',
    code: 'BXC',
    type: 'station',
    coordinates: { latitude: 40.2242, longitude: 116.2031 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'BXM',
    name: '北京密云站',
    city: '北京',
    country: '中国',
    code: 'BXM',
    type: 'station',
    coordinates: { latitude: 40.3842, longitude: 116.8431 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'BPG',
    name: '北京平谷站',
    city: '北京',
    country: '中国',
    code: 'BPG',
    type: 'station',
    coordinates: { latitude: 40.1442, longitude: 117.1031 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'BTZ',
    name: '北京通州站',
    city: '北京',
    country: '中国',
    code: 'BTZ',
    type: 'station',
    coordinates: { latitude: 39.9042, longitude: 116.6631 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'SHH',
    name: '上海站',
    city: '上海',
    country: '中国',
    code: 'SHH',
    type: 'station',
    coordinates: { latitude: 31.2492, longitude: 121.4737 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'SHQ',
    name: '上海虹桥站',
    city: '上海',
    country: '中国',
    code: 'SHQ',
    type: 'station',
    coordinates: { latitude: 31.1974, longitude: 121.3200 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'SHN',
    name: '上海南站',
    city: '上海',
    country: '中国',
    code: 'SHN',
    type: 'station',
    coordinates: { latitude: 31.1536, longitude: 121.4297 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'GZQ',
    name: '广州站',
    city: '广州',
    country: '中国',
    code: 'GZQ',
    type: 'station',
    coordinates: { latitude: 23.1478, longitude: 113.2644 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'GZN',
    name: '广州南站',
    city: '广州',
    country: '中国',
    code: 'GZN',
    type: 'station',
    coordinates: { latitude: 22.9902, longitude: 113.2644 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'SZN',
    name: '深圳北站',
    city: '深圳',
    country: '中国',
    code: 'SZN',
    type: 'station',
    coordinates: { latitude: 22.6109, longitude: 114.0292 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'SZH',
    name: '深圳站',
    city: '深圳',
    country: '中国',
    code: 'SZH',
    type: 'station',
    coordinates: { latitude: 22.5306, longitude: 114.1175 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'CDW',
    name: '成都东站',
    city: '成都',
    country: '中国',
    code: 'CDW',
    type: 'station',
    coordinates: { latitude: 30.6311, longitude: 104.1406 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'CDQ',
    name: '成都站',
    city: '成都',
    country: '中国',
    code: 'CDQ',
    type: 'station',
    coordinates: { latitude: 30.6961, longitude: 104.0736 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'XAY',
    name: '西安北站',
    city: '西安',
    country: '中国',
    code: 'XAY',
    type: 'station',
    coordinates: { latitude: 34.3769, longitude: 108.9403 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'XAY',
    name: '西安站',
    city: '西安',
    country: '中国',
    code: 'XAY',
    type: 'station',
    coordinates: { latitude: 34.2778, longitude: 108.9606 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'KMM',
    name: '昆明南站',
    city: '昆明',
    country: '中国',
    code: 'KMM',
    type: 'station',
    coordinates: { latitude: 24.8806, longitude: 102.8331 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'KMM',
    name: '昆明站',
    city: '昆明',
    country: '中国',
    code: 'KMM',
    type: 'station',
    coordinates: { latitude: 25.0156, longitude: 102.7222 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'WCN',
    name: '武汉站',
    city: '武汉',
    country: '中国',
    code: 'WCN',
    type: 'station',
    coordinates: { latitude: 30.6103, longitude: 114.4203 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'WHN',
    name: '武汉站',
    city: '武汉',
    country: '中国',
    code: 'WHN',
    type: 'station',
    coordinates: { latitude: 30.6103, longitude: 114.4203 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'NJH',
    name: '南京南站',
    city: '南京',
    country: '中国',
    code: 'NJH',
    type: 'station',
    coordinates: { latitude: 31.9706, longitude: 118.7969 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'NJH',
    name: '南京站',
    city: '南京',
    country: '中国',
    code: 'NJH',
    type: 'station',
    coordinates: { latitude: 32.0881, longitude: 118.7969 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'HZH',
    name: '杭州东站',
    city: '杭州',
    country: '中国',
    code: 'HZH',
    type: 'station',
    coordinates: { latitude: 30.2906, longitude: 120.2103 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'HZH',
    name: '杭州站',
    city: '杭州',
    country: '中国',
    code: 'HZH',
    type: 'station',
    coordinates: { latitude: 30.2906, longitude: 120.2103 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  }
];

const getDefaultCountries = () => [
  {
    id: '1',
    name: '中国',
    city: '中国',
    country: '中国',
    code: 'CN',
    type: 'country',
    enName: 'China',
    continentId: 1,
    coordinates: { latitude: 35.8617, longitude: 104.1954 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: '2',
    name: '美国',
    city: '美国',
    country: '美国',
    code: 'US',
    type: 'country',
    enName: 'United States',
    continentId: 4,
    coordinates: { latitude: 39.8283, longitude: -98.5795 },
    timezone: 'America/New_York',
    status: 'active',
  },
  {
    id: '3',
    name: '日本',
    city: '日本',
    country: '日本',
    code: 'JP',
    type: 'country',
    enName: 'Japan',
    continentId: 1,
    coordinates: { latitude: 36.2048, longitude: 138.2529 },
    timezone: 'Asia/Tokyo',
    status: 'active',
  },
  {
    id: '4',
    name: '韩国',
    city: '韩国',
    country: '韩国',
    code: 'KR',
    type: 'country',
    enName: 'South Korea',
    continentId: 1,
    coordinates: { latitude: 35.9078, longitude: 127.7669 },
    timezone: 'Asia/Seoul',
    status: 'active',
  },
  {
    id: '5',
    name: '新加坡',
    city: '新加坡',
    country: '新加坡',
    code: 'SG',
    type: 'country',
    enName: 'Singapore',
    continentId: 1,
    coordinates: { latitude: 1.3521, longitude: 103.8198 },
    timezone: 'Asia/Singapore',
    status: 'active',
  },
  {
    id: '6',
    name: '英国',
    city: '英国',
    country: '英国',
    code: 'GB',
    type: 'country',
    enName: 'United Kingdom',
    continentId: 2,
    coordinates: { latitude: 55.3781, longitude: -3.4360 },
    timezone: 'Europe/London',
    status: 'active',
  },
  {
    id: '7',
    name: '法国',
    city: '法国',
    country: '法国',
    code: 'FR',
    type: 'country',
    enName: 'France',
    continentId: 2,
    coordinates: { latitude: 46.2276, longitude: 2.2137 },
    timezone: 'Europe/Paris',
    status: 'active',
  },
  {
    id: '8',
    name: '德国',
    city: '德国',
    country: '德国',
    code: 'DE',
    type: 'country',
    enName: 'Germany',
    continentId: 2,
    coordinates: { latitude: 51.1657, longitude: 10.4515 },
    timezone: 'Europe/Berlin',
    status: 'active',
  },
  {
    id: '9',
    name: '澳大利亚',
    city: '澳大利亚',
    country: '澳大利亚',
    code: 'AU',
    type: 'country',
    enName: 'Australia',
    continentId: 5,
    coordinates: { latitude: -25.2744, longitude: 133.7751 },
    timezone: 'Australia/Sydney',
    status: 'active',
  },
  {
    id: '10',
    name: '加拿大',
    city: '加拿大',
    country: '加拿大',
    code: 'CA',
    type: 'country',
    enName: 'Canada',
    continentId: 4,
    coordinates: { latitude: 56.1304, longitude: -106.3468 },
    timezone: 'America/Toronto',
    status: 'active',
  }
];

const getDefaultCities = () => [
  // 中国主要城市
  {
    id: 'BJ',
    name: '北京',
    city: '北京',
    country: '中国',
    code: 'BJ',
    type: 'city',
    coordinates: { latitude: 39.9042, longitude: 116.4074 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'SH',
    name: '上海',
    city: '上海',
    country: '中国',
    code: 'SH',
    type: 'city',
    coordinates: { latitude: 31.2304, longitude: 121.4737 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'GZ',
    name: '广州',
    city: '广州',
    country: '中国',
    code: 'GZ',
    type: 'city',
    coordinates: { latitude: 23.1291, longitude: 113.2644 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'SZ',
    name: '深圳',
    city: '深圳',
    country: '中国',
    code: 'SZ',
    type: 'city',
    coordinates: { latitude: 22.5431, longitude: 114.0579 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'CD',
    name: '成都',
    city: '成都',
    country: '中国',
    code: 'CD',
    type: 'city',
    coordinates: { latitude: 30.5728, longitude: 104.0668 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'XA',
    name: '西安',
    city: '西安',
    country: '中国',
    code: 'XA',
    type: 'city',
    coordinates: { latitude: 34.3416, longitude: 108.9398 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'KM',
    name: '昆明',
    city: '昆明',
    country: '中国',
    code: 'KM',
    type: 'city',
    coordinates: { latitude: 25.0389, longitude: 102.7183 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'WLMQ',
    name: '乌鲁木齐',
    city: '乌鲁木齐',
    country: '中国',
    code: 'WLMQ',
    type: 'city',
    coordinates: { latitude: 43.8256, longitude: 87.6168 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'TJ',
    name: '天津',
    city: '天津',
    country: '中国',
    code: 'TJ',
    type: 'city',
    coordinates: { latitude: 39.3434, longitude: 117.3616 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'NJ',
    name: '南京',
    city: '南京',
    country: '中国',
    code: 'NJ',
    type: 'city',
    coordinates: { latitude: 32.0603, longitude: 118.7969 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'HZ',
    name: '杭州',
    city: '杭州',
    country: '中国',
    code: 'HZ',
    type: 'city',
    coordinates: { latitude: 30.2741, longitude: 120.1551 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'WH',
    name: '武汉',
    city: '武汉',
    country: '中国',
    code: 'WH',
    type: 'city',
    coordinates: { latitude: 30.5928, longitude: 114.3055 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'CQ',
    name: '重庆',
    city: '重庆',
    country: '中国',
    code: 'CQ',
    type: 'city',
    coordinates: { latitude: 29.4316, longitude: 106.9123 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'SY',
    name: '沈阳',
    city: '沈阳',
    country: '中国',
    code: 'SY',
    type: 'city',
    coordinates: { latitude: 41.8057, longitude: 123.4315 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'DL',
    name: '大连',
    city: '大连',
    country: '中国',
    code: 'DL',
    type: 'city',
    coordinates: { latitude: 38.9140, longitude: 121.6147 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'QD',
    name: '青岛',
    city: '青岛',
    country: '中国',
    code: 'QD',
    type: 'city',
    coordinates: { latitude: 36.0986, longitude: 120.3719 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'JN',
    name: '济南',
    city: '济南',
    country: '中国',
    code: 'JN',
    type: 'city',
    coordinates: { latitude: 36.6512, longitude: 117.1201 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'FZ',
    name: '福州',
    city: '福州',
    country: '中国',
    code: 'FZ',
    type: 'city',
    coordinates: { latitude: 26.0745, longitude: 119.2965 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'XM',
    name: '厦门',
    city: '厦门',
    country: '中国',
    code: 'XM',
    type: 'city',
    coordinates: { latitude: 24.4798, longitude: 118.0819 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  {
    id: 'NN',
    name: '南宁',
    city: '南宁',
    country: '中国',
    code: 'NN',
    type: 'city',
    coordinates: { latitude: 22.8172, longitude: 108.3669 },
    timezone: 'Asia/Shanghai',
    status: 'active',
  },
  // 国际主要城市
  {
    id: 'TYO',
    name: '东京',
    city: '东京',
    country: '日本',
    code: 'TYO',
    type: 'city',
    coordinates: { latitude: 35.6762, longitude: 139.6503 },
    timezone: 'Asia/Tokyo',
    status: 'active',
  },
  {
    id: 'SEL',
    name: '首尔',
    city: '首尔',
    country: '韩国',
    code: 'SEL',
    type: 'city',
    coordinates: { latitude: 37.5665, longitude: 126.9780 },
    timezone: 'Asia/Seoul',
    status: 'active',
  },
  {
    id: 'SIN',
    name: '新加坡',
    city: '新加坡',
    country: '新加坡',
    code: 'SIN',
    type: 'city',
    coordinates: { latitude: 1.3521, longitude: 103.8198 },
    timezone: 'Asia/Singapore',
    status: 'active',
  },
  {
    id: 'HKG',
    name: '香港',
    city: '香港',
    country: '中国',
    code: 'HKG',
    type: 'city',
    coordinates: { latitude: 22.3193, longitude: 114.1694 },
    timezone: 'Asia/Hong_Kong',
    status: 'active',
  },
  {
    id: 'LAX',
    name: '洛杉矶',
    city: '洛杉矶',
    country: '美国',
    code: 'LAX',
    type: 'city',
    coordinates: { latitude: 34.0522, longitude: -118.2437 },
    timezone: 'America/Los_Angeles',
    status: 'active',
  },
  {
    id: 'NYC',
    name: '纽约',
    city: '纽约',
    country: '美国',
    code: 'NYC',
    type: 'city',
    coordinates: { latitude: 40.7128, longitude: -74.0060 },
    timezone: 'America/New_York',
    status: 'active',
  },
  {
    id: 'LON',
    name: '伦敦',
    city: '伦敦',
    country: '英国',
    code: 'LON',
    type: 'city',
    coordinates: { latitude: 51.5074, longitude: -0.1278 },
    timezone: 'Europe/London',
    status: 'active',
  },
  {
    id: 'PAR',
    name: '巴黎',
    city: '巴黎',
    country: '法国',
    code: 'PAR',
    type: 'city',
    coordinates: { latitude: 48.8566, longitude: 2.3522 },
    timezone: 'Europe/Paris',
    status: 'active',
  },
  {
    id: 'BER',
    name: '柏林',
    city: '柏林',
    country: '德国',
    code: 'BER',
    type: 'city',
    coordinates: { latitude: 52.5200, longitude: 13.4050 },
    timezone: 'Europe/Berlin',
    status: 'active',
  },
  {
    id: 'SYD',
    name: '悉尼',
    city: '悉尼',
    country: '澳大利亚',
    code: 'SYD',
    type: 'city',
    coordinates: { latitude: -33.8688, longitude: 151.2093 },
    timezone: 'Australia/Sydney',
    status: 'active',
  },
  {
    id: 'TOR',
    name: '多伦多',
    city: '多伦多',
    country: '加拿大',
    code: 'TOR',
    type: 'city',
    coordinates: { latitude: 43.6532, longitude: -79.3832 },
    timezone: 'America/Toronto',
    status: 'active',
  }
];

export default {
  getAllAirports,
  getAllStations,
  getAllCities,
  getAllCountries,
  getAllPOIInfo,
  getGlobalPOIInfo,
  getAllLocations,
  searchLocations,
  clearAllCache,
  getCacheStatus
};
