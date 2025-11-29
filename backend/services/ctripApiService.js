/**
 * 携程商旅API服务
 * 提供标准地理信息数据的获取功能
 * 文档：https://openapi.ctripbiz.com/#/
 */

const axios = require('axios');
const config = require('../config');

// 携程API配置
const CTRIP_API_CONFIG = {
  // 生产环境
  production: {
    baseURL: 'https://ct.ctrip.com',
  },
  // 测试环境
  test: {
    baseURL: 'https://gateway.fat.ctripqa.com',
  },
  // 当前使用的环境
  // 默认使用生产环境
  // 可以通过环境变量 CTRIP_USE_TEST_ENV=true 强制使用测试环境
  get baseURL() {
    if (process.env.CTRIP_USE_TEST_ENV === 'true') {
      return this.test.baseURL;
    }
    // 默认使用生产环境
    return this.production.baseURL;
  },
  timeout: 30000, // 30秒超时
};

// Ticket缓存（内存缓存）
let ticketCache = {
  ticket: null,
  expiresAt: null,
};

/**
 * 获取Ticket（认证令牌）
 * Ticket有效时间为2小时，如果2小时内有使用，有效期会延迟2小时
 * @returns {Promise<string>} Ticket字符串
 */
async function getTicket() {
  // 检查缓存是否有效
  if (ticketCache.ticket && ticketCache.expiresAt && Date.now() < ticketCache.expiresAt) {
    return ticketCache.ticket;
  }

  try {
    const appKey = config.CTRIP_APP_KEY || process.env.CTRIP_APP_KEY;
    const appSecurity = config.CTRIP_APP_SECURITY || process.env.CTRIP_APP_SECURITY;

    if (!appKey || !appSecurity) {
      throw new Error('携程API配置缺失：请配置CTRIP_APP_KEY和CTRIP_APP_SECURITY');
    }

    const response = await axios.post(
      `${CTRIP_API_CONFIG.baseURL}/SwitchAPI/Order/Ticket`,
      {
        appkey: appKey,
        appSecurity,
      },
      {
        timeout: CTRIP_API_CONFIG.timeout,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.Status && response.data.Status.Success) {
      const ticket = response.data.Ticket;
      
      // 缓存Ticket，设置过期时间为2小时（7200000毫秒）
      ticketCache = {
        ticket,
        expiresAt: Date.now() + 2 * 60 * 60 * 1000 - 60000, // 提前1分钟过期，确保安全
      };

      console.log('携程Ticket获取成功');
      return ticket;
    } else {
      throw new Error(
        response.data?.Status?.Message || 
        `获取Ticket失败: ${response.data?.Status?.ErrorCode || '未知错误'}`
      );
    }
  } catch (error) {
    console.error('获取携程Ticket失败:', error.message);
    throw new Error(`获取携程Ticket失败: ${error.message}`);
  }
}

/**
 * 刷新Ticket（强制重新获取）
 */
async function refreshTicket() {
  ticketCache = { ticket: null, expiresAt: null };
  return await getTicket();
}

/**
 * 获取全量国家数据
 * @param {string} locale - 语言环境，默认zh-CN
 * @returns {Promise<Array>} 国家列表
 */
async function getAllCountries(locale = 'zh-CN') {
  try {
    const ticket = await getTicket();
    const appKey = config.CTRIP_APP_KEY || process.env.CTRIP_APP_KEY;

    const response = await axios.post(
      `${CTRIP_API_CONFIG.baseURL}/switchAPI/basedata/v2/getcountry`,
      {
        Auth: {
          AppKey: appKey,
          Ticket: ticket,
        },
        requestId: `country_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        locale,
      },
      {
        timeout: CTRIP_API_CONFIG.timeout,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.responseCode === 20000) {
      return response.data.countryList || [];
    } else {
      throw new Error(
        response.data?.responseDesc || 
        `获取国家数据失败: ${response.data?.responseCode || '未知错误'}`
      );
    }
  } catch (error) {
    console.error('获取国家数据失败:', error.message);
    
    // 如果是认证错误，尝试刷新Ticket后重试一次
    if (error.response?.data?.responseCode === 309 || error.message.includes('Ticket')) {
      console.log('Ticket可能过期，尝试刷新后重试...');
      await refreshTicket();
      return getAllCountries(locale);
    }
    
    throw error;
  }
}

/**
 * 获取全量标准地理信息数据（POI信息）
 * @param {Object} options - 查询选项
 * @param {number} options.countryId - 国家ID（必填）
 * @param {string} options.provinceIds - 省份ID列表，多个用逗号分隔
 * @param {string} options.provinceNames - 省份名称列表，多个用逗号分隔
 * @param {string} options.prefectureLevelCityIds - 地级市ID列表，多个用逗号分隔
 * @param {string} options.prefectureLevelCityNames - 地级市名称列表，多个用逗号分隔
 * @param {boolean} options.returnDistrict - 是否返回地级市下属区，默认true
 * @param {boolean} options.returnCounty - 是否返回地级市下属县，默认true
 * @param {boolean} options.returnAirport - 是否返回机场信息，默认true
 * @param {boolean} options.returnTrainStation - 是否返回火车站，默认true
 * @param {boolean} options.returnBusStation - 是否返回汽车站，默认true
 * @param {string} options.startDate - 查询增量数据的起始日期（格式：yyyy-MM-dd）
 * @returns {Promise<Object>} POI数据
 */
async function getAllPOIInfo(options = {}) {
  try {
    const {
      countryId,
      provinceIds = '',
      provinceNames = '',
      prefectureLevelCityIds = '',
      prefectureLevelCityNames = '',
      returnDistrict = true,
      returnCounty = true,
      returnAirport = true,
      returnTrainStation = true,
      returnBusStation = true,
      startDate = null,
    } = options;

    if (!countryId) {
      throw new Error('countryId参数必填');
    }

    const ticket = await getTicket();
    const appKey = config.CTRIP_APP_KEY || process.env.CTRIP_APP_KEY;

    const requestBody = {
      Auth: {
        AppKey: appKey,
        Ticket: ticket,
      },
      countryId: Number(countryId),
      provinceConditions: {
        provinceIds: provinceIds || '',
        provinceNames: provinceNames || '',
        prefectureLevelCityConditions: {
          prefectureLevelCityIds: prefectureLevelCityIds || '',
          prefectureLevelCityNames: prefectureLevelCityNames || '',
          returnDistrict,
          returnCounty,
        },
      },
      poiConditions: {
        returnAirport,
        returnTrainStation,
        returnBusStation,
      },
    };

    // 如果提供了startDate，添加到请求中
    if (startDate) {
      requestBody.startDate = startDate;
    }

    const response = await axios.post(
      `${CTRIP_API_CONFIG.baseURL}/switchapi/basedata/v2/queryAllPOIInfo`,
      requestBody,
      {
        timeout: CTRIP_API_CONFIG.timeout * 2, // POI查询可能需要更长时间
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.status && response.data.status.success) {
      return {
        dataList: response.data.dataList || [],
        invalidGeoList: response.data.invalidGeoList || [],
        status: response.data.status,
      };
    } else {
      throw new Error(
        response.data?.status?.errorMessage || 
        `获取POI数据失败: ${response.data?.status?.errorCode || '未知错误'}`
      );
    }
  } catch (error) {
    console.error('获取POI数据失败:', error.message);
    
    // 如果是认证错误，尝试刷新Ticket后重试一次
    if (error.response?.data?.status?.errorCode === 309 || error.message.includes('Ticket')) {
      console.log('Ticket可能过期，尝试刷新后重试...');
      await refreshTicket();
      return getAllPOIInfo(options);
    }
    
    throw error;
  }
}

/**
 * 将携程POI数据转换为系统Location格式
 * @param {Object} poiData - 携程POI数据
 * @returns {Array} Location格式的数据数组
 */
function convertPOIToLocations(poiData) {
  const locations = [];
  const { dataList } = poiData;

  if (!dataList || !Array.isArray(dataList)) {
    return locations;
  }

  dataList.forEach((province) => {
    // 添加省份信息
    locations.push({
      name: province.provinceName,
      code: province.provinceId?.toString(),
      type: 'province',
      province: province.provinceName,
      country: '中国',
      enName: province.provinceEnName,
      status: 'active',
    });

    // 处理地级市
    province.prefectureLevelCityInfoList?.forEach((city) => {
      // 添加城市信息
      const cityLocation = {
        name: city.cityName,
        code: city.cityCode || city.cityId?.toString(),
        type: 'city',
        city: city.cityName,
        province: province.provinceName,
        country: '中国',
        enName: city.cityEnName,
        pinyin: city.cityPinYin,
        cityLevel: 4, // 默认4级，需要根据实际情况设置
        status: 'active',
      };

      // 处理机场
      if (city.stationInfo?.airportList) {
        city.stationInfo.airportList.forEach((airport) => {
          locations.push({
            name: airport.airportName,
            code: airport.airportCode,
            type: 'airport',
            city: city.cityName,
            province: province.provinceName,
            country: '中国',
            enName: airport.airportEnName,
            parentId: null, // 需要关联到城市Location的ID
            status: 'active',
          });
        });
      }

      // 处理火车站
      if (city.stationInfo?.trainStationList) {
        city.stationInfo.trainStationList.forEach((station) => {
          locations.push({
            name: station.trainName,
            code: station.trainCode,
            type: 'station',
            city: city.cityName,
            province: province.provinceName,
            country: '中国',
            enName: station.trainEnName,
            parentId: null, // 需要关联到城市Location的ID
            status: 'active',
          });
        });
      }

      // 处理汽车站
      if (city.stationInfo?.busStationList) {
        city.stationInfo.busStationList.forEach((busStation) => {
          locations.push({
            name: busStation.busName,
            code: busStation.busPinYinName,
            type: 'bus',
            city: city.cityName,
            province: province.provinceName,
            country: '中国',
            pinyin: busStation.busPinYinName,
            parentId: null, // 需要关联到城市Location的ID
            status: 'active',
          });
        });
      }

      // 处理县级市
      if (city.countyList) {
        city.countyList.forEach((county) => {
          locations.push({
            name: county.countyName,
            code: county.countyCode || county.countyId?.toString(),
            type: 'city',
            city: county.countyName,
            province: province.provinceName,
            country: '中国',
            enName: county.countyEnName,
            pinyin: county.countyPinyin,
            cityLevel: 4,
            status: 'active',
          });
        });
      }

      locations.push(cityLocation);
    });
  });

  return locations;
}

module.exports = {
  getTicket,
  refreshTicket,
  getAllCountries,
  getAllPOIInfo,
  convertPOIToLocations,
};

