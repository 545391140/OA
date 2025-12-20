/**
 * Amadeus API 预订管理模块
 * 负责创建预订、获取订单、取消订单
 */

const axios = require('axios');
const logger = require('../../utils/logger');
const { getAccessToken, getBaseURL, refreshAccessToken } = require('./base');

/**
 * 创建机票预订
 * 参考：https://developers.amadeus.com/self-service/category/air/api-doc/flight-create-orders
 * 
 * @param {Object} bookingData - 预订数据
 * @param {Object} bookingData.flightOffer - 航班报价（必须是通过价格确认API返回的）
 * @param {Array} bookingData.travelers - 乘客信息数组
 * @param {Object} bookingData.travelers[].dateOfBirth - 出生日期 (YYYY-MM-DD)
 * @param {Object} bookingData.travelers[].name - 姓名 {firstName: String, lastName: String}
 * @param {Object} bookingData.travelers[].contact - 联系方式
 * @param {String} bookingData.travelers[].contact.emailAddress - 邮箱
 * @param {Array} bookingData.travelers[].contact.phones - 电话数组
 * @param {String} bookingData.travelers[].contact.phones[].deviceType - 设备类型（MOBILE, LANDLINE）
 * @param {String} bookingData.travelers[].contact.phones[].countryCallingCode - 国家代码（如：+86）
 * @param {String} bookingData.travelers[].contact.phones[].number - 电话号码
 * @param {String} bookingData.travelers[].id - 乘客ID（可选，系统会自动生成）
 * @returns {Promise<Object>} 预订结果
 */
async function createFlightOrder(bookingData) {
  try {
    const { flightOffer, travelers } = bookingData;

    // 数据验证
    if (!flightOffer || !flightOffer.id) {
      throw new Error('flightOffer参数无效');
    }
    if (!travelers || !Array.isArray(travelers) || travelers.length === 0) {
      throw new Error('travelers参数无效：必须至少包含一个乘客');
    }

    // 验证乘客信息
    travelers.forEach((traveler, index) => {
      if (!traveler.dateOfBirth || !traveler.name || !traveler.contact) {
        throw new Error(`乘客${index + 1}信息不完整`);
      }
      if (!traveler.name.firstName || !traveler.name.lastName) {
        throw new Error(`乘客${index + 1}姓名不完整`);
      }
      if (!traveler.contact.emailAddress) {
        throw new Error(`乘客${index + 1}邮箱必填`);
      }
    });

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 构建请求体
    const requestBody = {
      data: {
        type: 'flight-order',
        flightOffers: [flightOffer],
        travelers: travelers.map((traveler, index) => ({
          id: traveler.id || `TRAVELER_${index + 1}`,
          dateOfBirth: traveler.dateOfBirth,
          name: {
            firstName: traveler.name.firstName,
            lastName: traveler.name.lastName,
          },
          contact: {
            emailAddress: traveler.contact.emailAddress,
            phones: traveler.contact.phones || [],
          },
        })),
      },
    };

    // 调用 API
    const response = await axios.post(
      `${baseURL}/v1/booking/flight-orders`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.amadeus+json',
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 60000, // 预订可能需要更长时间
      }
    );

    if (response.data && response.data.data) {
      logger.debug('机票预订成功');
      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta || {},
      };
    } else {
      throw new Error('预订API响应格式错误');
    }
  } catch (error) {
    logger.error('创建机票预订失败:', error.message);
    logger.error('错误详情:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      errors: error.response?.data?.errors,
    });
    
    // 如果是认证错误，尝试刷新Token后重试一次
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return createFlightOrder(bookingData);
    }
    
    // 处理 API 错误响应
    if (error.response?.data?.errors) {
      const errors = error.response.data.errors;
      // 获取第一个错误的详细信息
      const firstError = errors[0];
      const errorDetail = firstError?.detail || firstError?.title || error.message;
      
      // 如果是 "Could not sell segment" 错误，提供更友好的错误信息
      if (errorDetail.includes('Could not sell segment')) {
        throw new Error('航班座位已售出或报价已过期，请重新搜索并确认价格后再预订');
      }
      
      throw new Error(errorDetail);
    }
    
    throw error;
  }
}

/**
 * 获取订单详情
 * 参考：https://developers.amadeus.com/self-service/category/air/api-doc/flight-orders
 * 
 * @param {String} orderId - Amadeus订单ID
 * @returns {Promise<Object>} 订单详情
 */
async function getFlightOrder(orderId) {
  try {
    if (!orderId) {
      throw new Error('orderId参数必填');
    }

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 调用 API
    const response = await axios.get(
      `${baseURL}/v1/booking/flight-orders/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.data) {
      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta || {},
      };
    } else {
      throw new Error('获取订单详情API响应格式错误');
    }
  } catch (error) {
    logger.error('获取订单详情失败:', error.message);
    
    // 如果是认证错误，尝试刷新Token后重试一次
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return getFlightOrder(orderId);
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
 * 取消订单
 * 
 * @param {String} orderId - Amadeus订单ID
 * @returns {Promise<Object>} 取消结果
 */
async function cancelFlightOrder(orderId) {
  try {
    if (!orderId) {
      throw new Error('orderId参数必填');
    }

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 调用 API
    const response = await axios.delete(
      `${baseURL}/v1/booking/flight-orders/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.data) {
      logger.debug('订单取消成功');
      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta || {},
      };
    } else {
      // DELETE请求可能返回204 No Content
      return {
        success: true,
        message: '订单已取消',
      };
    }
  } catch (error) {
    logger.error('取消订单失败:', error.message);
    
    // 如果是认证错误，尝试刷新Token后重试一次
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return cancelFlightOrder(orderId);
    }
    
    // 处理订单无法取消的情况
    if (error.response?.status === 400 || error.response?.status === 422) {
      const errorDetail = error.response.data?.errors?.[0]?.detail;
      throw new Error(errorDetail || '订单无法取消，可能已超过取消时限');
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
  createFlightOrder,
  getFlightOrder,
  cancelFlightOrder,
};

