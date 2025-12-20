/**
 * Amadeus API 航班搜索模块
 * 负责航班搜索和价格确认
 */

const axios = require('axios');
const logger = require('../../utils/logger');
const { getAccessToken, getBaseURL, refreshAccessToken } = require('./base');

/**
 * 搜索航班报价
 * 参考：https://developers.amadeus.com/self-service/category/air/api-doc/flight-offers-search
 * 
 * @param {Object} searchParams - 搜索参数
 * @param {String} searchParams.originLocationCode - 出发机场代码（IATA代码，如：PEK）
 * @param {String} searchParams.destinationLocationCode - 到达机场代码（IATA代码，如：JFK）
 * @param {String} searchParams.departureDate - 出发日期 (YYYY-MM-DD)
 * @param {String} searchParams.returnDate - 返程日期 (可选，往返航班必填)
 * @param {Number} searchParams.adults - 成人数量（1-9）
 * @param {Number} searchParams.children - 儿童数量（可选，0-9）
 * @param {Number} searchParams.infants - 婴儿数量（可选，0-9）
 * @param {String} searchParams.travelClass - 舱位等级（ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST）
 * @param {Number} searchParams.max - 最大返回结果数（默认250，最大250）
 * @param {String} searchParams.currencyCode - 货币代码（可选，如：USD, CNY）
 * @param {Boolean} searchParams.nonStop - 是否只显示直飞航班（可选）
 * @returns {Promise<Object>} 包含data和meta的响应对象
 */
async function searchFlightOffers(searchParams) {
  try {
    const {
      originLocationCode,
      destinationLocationCode,
      departureDate,
      returnDate,
      adults = 1,
      children = 0,
      infants = 0,
      travelClass = 'ECONOMY',
      max = 250,
      currencyCode = 'USD',
      nonStop = false,
    } = searchParams;

    // 参数验证
    if (!originLocationCode || !destinationLocationCode || !departureDate) {
      throw new Error('缺少必填参数：originLocationCode, destinationLocationCode, departureDate');
    }

    if (adults < 1 || adults > 9) {
      throw new Error('成人数量必须在1-9之间');
    }

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 构建查询参数
    const params = new URLSearchParams({
      originLocationCode,
      destinationLocationCode,
      departureDate,
      adults: adults.toString(),
      travelClass,
      max: Math.min(max, 250).toString(),
      currencyCode,
    });

    if (returnDate) {
      params.append('returnDate', returnDate);
    }
    if (children > 0) {
      params.append('children', children.toString());
    }
    if (infants > 0) {
      params.append('infants', infants.toString());
    }
    if (nonStop) {
      params.append('nonStop', 'true');
    }

    // 调用 API
    const response = await axios.get(
      `${baseURL}/v2/shopping/flight-offers?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.data) {
      logger.debug(`搜索到 ${response.data.data.length} 个航班报价`);
      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta || {},
      };
    } else {
      throw new Error('API响应格式错误');
    }
  } catch (error) {
    logger.error('搜索航班报价失败:', error.message);
    
    // 如果是认证错误，尝试刷新Token后重试一次
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return searchFlightOffers(searchParams);
    }
    
    // 处理 API 错误响应
    if (error.response?.data?.errors) {
      const errorDetail = error.response.data.errors[0]?.detail || error.message;
      throw new Error(errorDetail);
    }
    
    throw error;
  }
}

/**
 * 确认航班价格
 * 注意：在预订前必须调用此API确认价格，因为价格可能已变更
 * 参考：https://developers.amadeus.com/self-service/category/air/api-doc/flight-offers-price
 * 
 * @param {Object} flightOffer - 完整的航班报价对象（从搜索API返回）
 * @returns {Promise<Object>} 确认后的价格信息
 */
async function confirmFlightPrice(flightOffer) {
  try {
    if (!flightOffer || !flightOffer.id) {
      throw new Error('flightOffer参数无效：必须包含完整的航班报价对象');
    }

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 调用 API（POST请求，需要发送完整的flightOffer对象）
    const response = await axios.post(
      `${baseURL}/v1/shopping/flight-offers/pricing`,
      {
        data: {
          type: 'flight-offers-pricing',
          flightOffers: [flightOffer],
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.amadeus+json',
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.data && response.data.data.flightOffers) {
      const confirmedOffer = response.data.data.flightOffers[0];
      logger.debug('航班价格确认成功');
      return {
        success: true,
        data: confirmedOffer,
        meta: response.data.meta || {},
      };
    } else {
      throw new Error('价格确认API响应格式错误');
    }
  } catch (error) {
    logger.error('确认航班价格失败:', error.message);
    
    // 如果是认证错误，尝试刷新Token后重试一次
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return confirmFlightPrice(flightOffer);
    }
    
    // 处理价格变更错误
    if (error.response?.status === 400) {
      const errorDetail = error.response.data?.errors?.[0]?.detail;
      if (errorDetail && errorDetail.includes('price')) {
        throw new Error('航班价格已变更，请重新搜索');
      }
    }
    
    // 处理 API 错误响应
    if (error.response?.data?.errors) {
      const errorDetail = error.response.data.errors[0]?.detail || error.message;
      throw new Error(errorDetail);
    }
    
    throw error;
  }
}

module.exports = {
  searchFlightOffers,
  confirmFlightPrice,
};

