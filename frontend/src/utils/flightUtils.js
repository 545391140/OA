/**
 * 航班相关工具函数
 * 提供机场信息、航空公司信息等工具函数
 */

import apiClient from '../utils/axiosConfig';

// 航空公司代码到名称和logo的映射
// 使用多个logo源作为备选，提高可靠性
const getAirlineLogoUrl = (code) => {
  // 优先使用cleartrip的logo服务
  // 如果失败，可以尝试其他源
  return `https://www.cleartrip.com/images/logos/${code.toLowerCase()}.png`;
};

const AIRLINE_MAP = {
  'MU': { name: '中国东方航空', nameEn: 'China Eastern Airlines', logo: getAirlineLogoUrl('MU') },
  'CA': { name: '中国国际航空', nameEn: 'Air China', logo: getAirlineLogoUrl('CA') },
  'CZ': { name: '中国南方航空', nameEn: 'China Southern Airlines', logo: getAirlineLogoUrl('CZ') },
  'MF': { name: '厦门航空', nameEn: 'Xiamen Airlines', logo: getAirlineLogoUrl('MF') },
  '3U': { name: '四川航空', nameEn: 'Sichuan Airlines', logo: getAirlineLogoUrl('3U') },
  '9C': { name: '春秋航空', nameEn: 'Spring Airlines', logo: getAirlineLogoUrl('9C') },
  'HO': { name: '吉祥航空', nameEn: 'Juneyao Airlines', logo: getAirlineLogoUrl('HO') },
  'JD': { name: '首都航空', nameEn: 'Beijing Capital Airlines', logo: getAirlineLogoUrl('JD') },
  'GS': { name: '天津航空', nameEn: 'Tianjin Airlines', logo: getAirlineLogoUrl('GS') },
  'PN': { name: '西部航空', nameEn: 'West Air', logo: getAirlineLogoUrl('PN') },
  'KY': { name: '昆明航空', nameEn: 'Kunming Airlines', logo: getAirlineLogoUrl('KY') },
  'G5': { name: '华夏航空', nameEn: 'China Express Airlines', logo: getAirlineLogoUrl('G5') },
  '8L': { name: '祥鹏航空', nameEn: 'Lucky Air', logo: getAirlineLogoUrl('8L') },
  'EU': { name: '成都航空', nameEn: 'Chengdu Airlines', logo: getAirlineLogoUrl('EU') },
  'Y8': { name: '扬子江快运', nameEn: 'Yangtze River Express', logo: getAirlineLogoUrl('Y8') },
  'QW': { name: '青岛航空', nameEn: 'Qingdao Airlines', logo: getAirlineLogoUrl('QW') },
  'FU': { name: '福州航空', nameEn: 'Fuzhou Airlines', logo: getAirlineLogoUrl('FU') },
  'DR': { name: '瑞丽航空', nameEn: 'Ruili Airlines', logo: getAirlineLogoUrl('DR') },
  'GJ': { name: '长龙航空', nameEn: 'Loong Air', logo: getAirlineLogoUrl('GJ') },
  'TV': { name: '西藏航空', nameEn: 'Tibet Airlines', logo: getAirlineLogoUrl('TV') },
  'UQ': { name: '乌鲁木齐航空', nameEn: 'Urumqi Air', logo: getAirlineLogoUrl('UQ') },
  'GT': { name: '桂林航空', nameEn: 'Guilin Airlines', logo: getAirlineLogoUrl('GT') },
  'A6': { name: '红土航空', nameEn: 'Hongtu Airlines', logo: getAirlineLogoUrl('A6') },
  'RY': { name: '江西航空', nameEn: 'Jiangxi Air', logo: getAirlineLogoUrl('RY') },
  'LT': { name: '龙江航空', nameEn: 'Longjiang Airlines', logo: getAirlineLogoUrl('LT') },
  'DZ': { name: '东海航空', nameEn: 'Donghai Airlines', logo: getAirlineLogoUrl('DZ') },
  'GX': { name: '北部湾航空', nameEn: 'GX Airlines', logo: getAirlineLogoUrl('GX') },
  'NS': { name: '河北航空', nameEn: 'Hebei Airlines', logo: getAirlineLogoUrl('NS') },
  'JR': { name: '幸福航空', nameEn: 'Joy Air', logo: getAirlineLogoUrl('JR') },
  'KN': { name: '中国联合航空', nameEn: 'China United Airlines', logo: getAirlineLogoUrl('KN') },
  'OQ': { name: '重庆航空', nameEn: 'Chongqing Airlines', logo: getAirlineLogoUrl('OQ') },
  'ZH': { name: '深圳航空', nameEn: 'Shenzhen Airlines', logo: getAirlineLogoUrl('ZH') },
  'SC': { name: '山东航空', nameEn: 'Shandong Airlines', logo: getAirlineLogoUrl('SC') },
  'HU': { name: '海南航空', nameEn: 'Hainan Airlines', logo: getAirlineLogoUrl('HU') },
  'FM': { name: '上海航空', nameEn: 'Shanghai Airlines', logo: getAirlineLogoUrl('FM') },
  'BK': { name: '奥凯航空', nameEn: 'Okay Airways', logo: getAirlineLogoUrl('BK') },
  '8Y': { name: '华夏航空', nameEn: 'China Express Airlines', logo: getAirlineLogoUrl('8Y') },
  // 国际航空公司
  'AA': { name: '美国航空', nameEn: 'American Airlines', logo: getAirlineLogoUrl('AA') },
  'DL': { name: '达美航空', nameEn: 'Delta Air Lines', logo: getAirlineLogoUrl('DL') },
  'UA': { name: '联合航空', nameEn: 'United Airlines', logo: getAirlineLogoUrl('UA') },
  'BA': { name: '英国航空', nameEn: 'British Airways', logo: getAirlineLogoUrl('BA') },
  'LH': { name: '汉莎航空', nameEn: 'Lufthansa', logo: getAirlineLogoUrl('LH') },
  'AF': { name: '法国航空', nameEn: 'Air France', logo: getAirlineLogoUrl('AF') },
  'KL': { name: '荷兰皇家航空', nameEn: 'KLM Royal Dutch Airlines', logo: getAirlineLogoUrl('KL') },
  'JL': { name: '日本航空', nameEn: 'Japan Airlines', logo: getAirlineLogoUrl('JL') },
  'NH': { name: '全日空', nameEn: 'ANA', logo: getAirlineLogoUrl('NH') },
  'KE': { name: '大韩航空', nameEn: 'Korean Air', logo: getAirlineLogoUrl('KE') },
  'OZ': { name: '韩亚航空', nameEn: 'Asiana Airlines', logo: getAirlineLogoUrl('OZ') },
  'SQ': { name: '新加坡航空', nameEn: 'Singapore Airlines', logo: getAirlineLogoUrl('SQ') },
  'CX': { name: '国泰航空', nameEn: 'Cathay Pacific', logo: getAirlineLogoUrl('CX') },
  'EK': { name: '阿联酋航空', nameEn: 'Emirates', logo: getAirlineLogoUrl('EK') },
  'QR': { name: '卡塔尔航空', nameEn: 'Qatar Airways', logo: getAirlineLogoUrl('QR') },
  'TG': { name: '泰国国际航空', nameEn: 'Thai Airways', logo: getAirlineLogoUrl('TG') },
  'QF': { name: '澳洲航空', nameEn: 'Qantas', logo: getAirlineLogoUrl('QF') },
  'AC': { name: '加拿大航空', nameEn: 'Air Canada', logo: getAirlineLogoUrl('AC') },
};

// 机场信息缓存
const airportCache = new Map();

// 请求队列和延迟控制
let requestQueue = [];
let isProcessingQueue = false;
const REQUEST_DELAY = 100; // 每个请求之间的延迟（毫秒）

/**
 * 处理请求队列
 */
const processRequestQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const { resolve, reject, iataCode } = requestQueue.shift();

    try {
      // 检查缓存（再次检查，因为可能在队列中时已被其他请求缓存）
      if (airportCache.has(iataCode)) {
        resolve(airportCache.get(iataCode));
        continue;
      }

      // 调用后端API查询机场信息（使用search参数，会匹配code字段）
      // 注意：search参数会搜索name、code、pinyin等字段，所以直接搜索代码应该能找到
      const response = await apiClient.get('/locations', {
        params: {
          type: 'airport',
          search: iataCode.toUpperCase(),
          limit: 1,
          status: 'active'
        }
      });

      if (response.data && response.data.success && response.data.data && response.data.data.length > 0) {
        const airport = response.data.data[0];
        // 确保获取到正确的机场名称和城市
        const info = {
          name: airport.name || iataCode,
          city: airport.city || airport.name || ''
        };
        // 缓存结果
        airportCache.set(iataCode, info);
        console.log(`[flightUtils] 获取机场信息成功: ${iataCode} -> ${info.name}, ${info.city}`);
        resolve(info);
      } else {
        // 如果查询失败，返回默认值（仅代码）
        const defaultInfo = { name: iataCode, city: '' };
        airportCache.set(iataCode, defaultInfo);
        console.warn(`[flightUtils] 未找到机场信息: ${iataCode}`);
        resolve(defaultInfo);
      }
    } catch (error) {
      console.warn(`[flightUtils] 获取机场信息失败: ${iataCode}`, error.response?.status, error.message);
      // 如果查询失败，返回默认值（仅代码）
      const defaultInfo = { name: iataCode, city: '' };
      airportCache.set(iataCode, defaultInfo);
      resolve(defaultInfo);
    }

    // 延迟下一个请求，避免触发速率限制
    if (requestQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
  }

  isProcessingQueue = false;
};

/**
 * 根据机场代码获取机场信息（名称和城市）
 * @param {string} iataCode - 机场IATA代码（3位）
 * @returns {Promise<{name: string, city: string}>} 机场名称和城市
 */
export const getAirportInfo = async (iataCode) => {
  if (!iataCode) {
    return { name: '', city: '' };
  }

  // 检查缓存
  if (airportCache.has(iataCode)) {
    return airportCache.get(iataCode);
  }

  // 将请求加入队列，避免并发过多
  return new Promise((resolve, reject) => {
    requestQueue.push({ resolve, reject, iataCode });
    processRequestQueue();
  });
};

/**
 * 批量获取机场信息（使用队列控制，避免并发过多）
 * @param {string[]} iataCodes - 机场IATA代码数组
 * @returns {Promise<Map<string, {name: string, city: string}>>} 机场信息映射
 */
export const getAirportInfoBatch = async (iataCodes) => {
  const results = new Map();
  const uncachedCodes = [];

  // 先检查缓存
  iataCodes.forEach(code => {
    if (airportCache.has(code)) {
      results.set(code, airportCache.get(code));
    } else {
      uncachedCodes.push(code);
    }
  });

  // 串行查询未缓存的代码，避免并发过多
  if (uncachedCodes.length > 0) {
    for (const code of uncachedCodes) {
      try {
        const info = await getAirportInfo(code);
        results.set(code, info);
      } catch (error) {
        console.warn(`Failed to fetch airport info for ${code}:`, error);
        // 设置默认值
        const defaultInfo = { name: code, city: '' };
        airportCache.set(code, defaultInfo);
        results.set(code, defaultInfo);
      }
    }
  }

  return results;
};

/**
 * 根据航空公司代码获取航空公司信息
 * @param {string} carrierCode - 航空公司代码（2位）
 * @returns {{name: string, nameEn: string, logo: string}} 航空公司信息
 */
export const getAirlineInfo = (carrierCode) => {
  if (!carrierCode) {
    return { name: carrierCode || '', nameEn: '', logo: '' };
  }

  const code = carrierCode.toUpperCase();
  return AIRLINE_MAP[code] || {
    name: carrierCode,
    nameEn: '',
    logo: ''
  };
};

/**
 * 获取飞机型号名称（根据IATA代码）
 * @param {string} aircraftCode - 飞机型号代码（如 "332" 表示 A330-200）
 * @returns {string} 飞机型号名称
 */
export const getAircraftName = (aircraftCode) => {
  if (!aircraftCode) return '';

  // 飞机型号代码映射（IATA标准）
  const aircraftMap = {
    '319': 'A319',
    '320': 'A320',
    '321': 'A321',
    '32A': 'A320neo',
    '32B': 'A321neo',
    '330': 'A330',
    '332': 'A330-200',
    '333': 'A330-300',
    '338': 'A330-800',
    '339': 'A330-900',
    '340': 'A340',
    '342': 'A340-200',
    '343': 'A340-300',
    '345': 'A340-500',
    '346': 'A340-600',
    '350': 'A350',
    '351': 'A350-1000',
    '359': 'A350-900',
    '380': 'A380',
    '388': 'A380-800',
    '737': 'B737',
    '738': 'B737-800',
    '739': 'B737-900',
    '73H': 'B737-800',
    '73J': 'B737-900ER',
    '73M': 'B737 MAX',
    '73W': 'B737-700',
    '73X': 'B737 MAX 8',
    '73Y': 'B737 MAX 9',
    '757': 'B757',
    '752': 'B757-200',
    '753': 'B757-300',
    '767': 'B767',
    '762': 'B767-200',
    '763': 'B767-300',
    '764': 'B767-400',
    '777': 'B777',
    '772': 'B777-200',
    '773': 'B777-300',
    '77L': 'B777-200LR',
    '77W': 'B777-300ER',
    '787': 'B787',
    '788': 'B787-8',
    '789': 'B787-9',
    '78J': 'B787-10',
    'CRJ': 'CRJ',
    'CR7': 'CRJ-700',
    'CR9': 'CRJ-900',
    'E90': 'E190',
    'E95': 'E195',
    'ARJ': 'ARJ21',
    'C91': 'C919',
  };

  return aircraftMap[aircraftCode] || aircraftCode;
};

