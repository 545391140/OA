/**
 * 酒店搜索服务模块（使用 Amadeus SDK）
 * 负责酒店搜索、价格确认、酒店评分等功能
 */

const Amadeus = require('amadeus');
const config = require('../../config');
const logger = require('../../utils/logger');

// 初始化 SDK 实例
const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_HOTEL_API_KEY || config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY,
  clientSecret: process.env.AMADEUS_HOTEL_API_SECRET || config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET,
  hostname: (config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test') === 'production' 
    ? 'production' 
    : 'test',
});

/**
 * 统一错误处理适配器
 * 将 SDK 错误格式转换为统一的错误格式
 */
function handleSdkError(error) {
  // SDK 错误格式
  if (error.description) {
    const errorObj = new Error(error.description);
    errorObj.code = error.code;
    errorObj.statusCode = error.statusCode || 500;
    errorObj.originalError = error;
    return errorObj;
  }
  
  // 其他错误
  return error;
}

/**
 * 通过地理坐标搜索酒店
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-name-autocomplete
 * 
 * @param {Object} searchParams - 搜索参数
 * @param {Number} searchParams.latitude - 纬度（必填）
 * @param {Number} searchParams.longitude - 经度（必填）
 * @param {Number} searchParams.radius - 搜索半径（可选，单位：公里，默认5）
 * @param {String} searchParams.hotelSource - 酒店来源（可选，ALL, AMADEUS, EXPEDIA，默认ALL）
 * @returns {Promise<Object>} 酒店列表
 */
async function searchHotelsByGeocode(searchParams) {
  try {
    const {
      latitude,
      longitude,
      radius = 5,
      hotelSource = 'ALL',
    } = searchParams;

    // 参数验证
    if (!latitude || !longitude) {
      throw new Error('缺少必填参数：latitude 和 longitude');
    }

    // 使用 SDK 调用 API（SDK 自动处理认证和 Token）
    const response = await amadeus.referenceData.locations.hotels.byGeocode.get({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString(),
      hotelSource,
    });

    if (response.data && response.data) {
      logger.debug(`找到 ${response.data.length} 个酒店`);
      return {
        success: true,
        data: response.data,
        meta: response.meta || {},
      };
    } else {
      throw new Error('API响应格式错误');
    }
  } catch (error) {
    logger.error('通过地理坐标搜索酒店失败:', error.message);
    throw handleSdkError(error);
  }
}

/**
 * 通过城市搜索酒店
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-name-autocomplete
 * 
 * @param {Object} searchParams - 搜索参数
 * @param {String} searchParams.cityCode - 城市代码（IATA代码，如：NYC）（必填）
 * @param {String} searchParams.hotelSource - 酒店来源（可选，ALL, AMADEUS, EXPEDIA，默认ALL）
 * @returns {Promise<Object>} 酒店列表
 */
async function searchHotelsByCity(searchParams) {
  try {
    const {
      cityCode,
      hotelSource = 'ALL',
    } = searchParams;

    // 参数验证
    if (!cityCode) {
      throw new Error('缺少必填参数：cityCode');
    }

    // 使用 SDK 调用 API（SDK 自动处理认证和 Token）
    const response = await amadeus.referenceData.locations.hotels.byCity.get({
      cityCode,
      hotelSource,
    });

    if (response.data && response.data) {
      logger.debug(`找到 ${response.data.length} 个酒店`);
      return {
        success: true,
        data: response.data,
        meta: response.meta || {},
      };
    } else {
      throw new Error('API响应格式错误');
    }
  } catch (error) {
    logger.error('通过城市搜索酒店失败:', error.message);
    throw handleSdkError(error);
  }
}

/**
 * 通过酒店ID搜索酒店
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-name-autocomplete
 * 
 * @param {Object} searchParams - 搜索参数
 * @param {String} searchParams.hotelIds - 酒店ID（单个或多个，逗号分隔）（必填）
 * @returns {Promise<Object>} 酒店列表
 */
async function searchHotelsByHotels(searchParams) {
  try {
    const { hotelIds } = searchParams;

    // 参数验证
    if (!hotelIds) {
      throw new Error('缺少必填参数：hotelIds');
    }

    // 使用 SDK 调用 API（SDK 自动处理认证和 Token）
    const response = await amadeus.referenceData.locations.hotels.byHotels.get({
      hotelIds: hotelIds, // 可以是单个ID或逗号分隔的多个ID
    });

    if (response.data && response.data) {
      logger.debug(`找到 ${response.data.length} 个酒店`);
      return {
        success: true,
        data: response.data,
        meta: response.meta || {},
      };
    } else {
      throw new Error('API响应格式错误');
    }
  } catch (error) {
    logger.error('通过酒店ID搜索酒店失败:', error.message);
    throw handleSdkError(error);
  }
}

/**
 * 根据酒店ID搜索报价
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-search
 * API v3.0.9: getMultiHotelOffers
 * 
 * @param {Object} searchParams - 搜索参数
 * @param {String|Array} searchParams.hotelIds - 酒店ID（单个或多个，建议使用多个以提高成功率）
 * @param {String} searchParams.checkInDate - 入住日期 (YYYY-MM-DD)
 * @param {String} searchParams.checkOutDate - 退房日期 (YYYY-MM-DD)
 * @param {Number} searchParams.adults - 成人数量（1-9）
 * @param {Number} searchParams.roomQuantity - 房间数量（默认1）
 * @param {String} searchParams.currencyCode - 货币代码（可选）
 * @returns {Promise<Object>} 包含data和meta的响应对象
 */
async function searchHotelOffersByHotel(searchParams) {
  try {
    const {
      hotelIds,
      checkInDate,
      checkOutDate,
      adults = 1,
      roomQuantity = 1,
      currencyCode = 'USD',
    } = searchParams;

    // 参数验证
    if (!hotelIds) {
      throw new Error('缺少必填参数：hotelIds');
    }
    if (!checkInDate || !checkOutDate) {
      throw new Error('缺少必填参数：checkInDate 和 checkOutDate');
    }

    // 处理 hotelIds：如果是数组，转换为逗号分隔的字符串
    const hotelIdsParam = Array.isArray(hotelIds) ? hotelIds.join(',') : hotelIds;

    // 使用 SDK 调用 API（SDK 自动处理认证和 Token）
    // 注意：SDK 的 hotelOffersSearch.get 方法需要 hotelIds 作为字符串参数
    const response = await amadeus.shopping.hotelOffersSearch.get({
      hotelIds: hotelIdsParam,
      checkInDate,
      checkOutDate,
      adults: adults.toString(),
      roomQuantity: roomQuantity.toString(),
      currencyCode,
    });

    if (response.data && response.data) {
      logger.debug(`搜索到 ${response.data.length} 个酒店报价`);
      return {
        success: true,
        data: response.data,
        meta: response.meta || {},
      };
    } else {
      throw new Error('API响应格式错误');
    }
  } catch (error) {
    logger.error('根据酒店ID搜索报价失败:', error.message);
    throw handleSdkError(error);
  }
}

/**
 * 确认酒店价格
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-search
 * API v3.0.9: getOfferPricing
 * 
 * @param {String} offerId - 酒店报价ID（必填）
 * @returns {Promise<Object>} 确认后的价格信息
 */
async function confirmHotelPrice(offerId) {
  try {
    if (!offerId) {
      throw new Error('offerId参数必填');
    }

    // 使用 SDK 调用 API（SDK 自动处理认证和 Token）
    // 注意：SDK 使用 hotelOfferSearch(offerId).get() 方法
    const response = await amadeus.shopping.hotelOfferSearch(offerId).get();

    if (response.data && response.data) {
      logger.debug('酒店价格确认成功');
      return {
        success: true,
        data: response.data,
        meta: response.meta || {},
      };
    } else {
      throw new Error('价格确认API响应格式错误');
    }
  } catch (error) {
    logger.error('确认酒店价格失败:', error.message);
    
    // 处理价格变更错误
    if (error.code === 400 || error.statusCode === 400) {
      const errorDetail = error.description || error.message;
      if (errorDetail && errorDetail.includes('price')) {
        throw new Error('酒店价格已变更，请重新搜索');
      }
    }
    
    throw handleSdkError(error);
  }
}

/**
 * 酒店评分查询
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-ratings
 * 
 * @param {Object} searchParams - 搜索参数
 * @param {String} searchParams.hotelIds - 酒店ID列表（逗号分隔，必填）
 * @returns {Promise<Object>} 酒店评分列表
 */
async function getHotelRatings(searchParams) {
  try {
    const { hotelIds } = searchParams;

    // 参数验证
    if (!hotelIds) {
      throw new Error('缺少必填参数：hotelIds');
    }

    // 使用 SDK 调用 API（SDK 自动处理认证和 Token）
    const response = await amadeus.eReputation.hotelSentiments.get({
      hotelIds: hotelIds, // 逗号分隔的酒店ID列表
    });

    // SDK 返回格式：response.data 可能是数组或对象
    const ratingsData = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);
    
    if (ratingsData.length > 0 || (response.data && typeof response.data === 'object')) {
      logger.debug(`获取到 ${ratingsData.length} 个酒店的评分`);
      return {
        success: true,
        data: ratingsData,
        meta: response.meta || {},
      };
    } else {
      // 即使没有数据，API调用成功也算通过（可能是测试环境数据问题）
      logger.warn('酒店评分查询成功但未找到评分数据（可能是测试环境数据问题）');
      return {
        success: true,
        data: [],
        meta: response.meta || {},
      };
    }
  } catch (error) {
    logger.error('获取酒店评分失败:', error.message);
    throw handleSdkError(error);
  }
}

module.exports = {
  // 酒店搜索（三个接口）
  searchHotelsByGeocode,
  searchHotelsByCity,
  searchHotelsByHotels,
  
  // 酒店报价搜索
  searchHotelOffersByHotel,
  
  // 价格确认和评分
  confirmHotelPrice,
  getHotelRatings,
  
  // SDK 实例（可选导出，用于高级用法）
  amadeus,
};

