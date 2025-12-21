/**
 * 酒店预订管理服务模块（使用 Amadeus SDK）
 * 负责创建预订、获取订单详情、取消订单等功能
 */

const logger = require('../../utils/logger');
const axios = require('axios');
const { getAmadeusInstance, getAmadeusConfig, validateSdkConfig } = require('./amadeusSdkInstance');

// 获取配置信息（用于日志）
const config = getAmadeusConfig();
const apiEnv = config.hostname;

// 在模块加载时验证配置（可选，用于调试）
if (process.env.NODE_ENV === 'development') {
  validateSdkConfig().catch(err => {
    logger.warn('SDK 配置验证失败（将在首次 API 调用时自动处理）:', err.message);
  });
}

/**
 * 统一错误处理适配器
 * 将 SDK 错误格式转换为统一的错误格式
 */
function handleSdkError(error) {
  // 检查是否是认证错误
  const isAuthError = error.statusCode === 401 || 
                      error.code === 401 ||
                      (error.message && (error.message.includes('invalid') || error.message.includes('token') || error.message.includes('unauthorized'))) ||
                      (error.description && (String(error.description).includes('invalid') || String(error.description).includes('token') || String(error.description).includes('unauthorized')));
  
  if (isAuthError) {
    const authError = new Error('Amadeus API 认证失败：访问令牌无效。请检查 API Key 和 Secret 配置是否正确，或联系管理员检查 API 凭证。');
    authError.statusCode = 401;
    authError.code = 'AUTH_ERROR';
    authError.originalError = error;
    return authError;
  }
  
  // SDK 错误格式
  if (error.description && Array.isArray(error.description)) {
    // description 是错误数组
    const firstError = error.description[0];
    const errorMessage = firstError?.detail || firstError?.title || '酒店预订API错误';
    const errorObj = new Error(errorMessage);
    errorObj.code = error.code || firstError?.code;
    errorObj.statusCode = firstError?.status || error.statusCode || 500;
    errorObj.originalError = error;
    return errorObj;
  }
  
  if (error.description) {
    const errorObj = new Error(String(error.description));
    errorObj.code = error.code;
    errorObj.statusCode = error.statusCode || 500;
    errorObj.originalError = error;
    return errorObj;
  }
  
  // 其他错误
  return error;
}

/**
 * 创建酒店预订（使用 v2 API）
 * 参考：https://developers.amadeus.com/self-service/category/hotels/api-doc/hotel-booking/api-reference
 * 
 * v2 API 端点：POST /v2/booking/hotel-orders
 * 
 * @param {Object} bookingData - 预订数据
 * @param {String} bookingData.offerId - 酒店报价ID（必填）
 * @param {Array} bookingData.guests - 客人信息数组
 * @param {Object} bookingData.guests[].name - 姓名 {firstName: String, lastName: String}
 * @param {Object} bookingData.guests[].contact - 联系方式
 * @param {String} bookingData.guests[].contact.emailAddress - 邮箱
 * @param {Array} bookingData.guests[].contact.phones - 电话数组
 * @param {Object} bookingData.payment - 支付信息（必填）
 * @param {String} bookingData.travelAgentEmail - 旅行社邮箱（可选，默认使用第一个客人的邮箱）
 * @returns {Promise<Object>} 预订结果
 */
async function createHotelBooking(bookingData) {
  try {
    const { offerId, guests, payment, travelAgentEmail } = bookingData;

    // 数据验证
    if (!offerId) {
      throw new Error('offerId参数无效');
    }
    if (!guests || !Array.isArray(guests) || guests.length === 0) {
      throw new Error('guests参数无效：必须至少包含一个客人');
    }
    if (!payment) {
      throw new Error('payment参数必填');
    }

    // 验证客人信息
    guests.forEach((guest, index) => {
      if (!guest.name || !guest.contact) {
        throw new Error(`客人${index + 1}信息不完整`);
      }
      if (!guest.name.firstName || !guest.name.lastName) {
        throw new Error(`客人${index + 1}姓名不完整`);
      }
      if (!guest.contact.emailAddress) {
        throw new Error(`客人${index + 1}邮箱必填`);
      }
      // 验证电话：必须至少有一个有效的电话号码
      if (!guest.contact.phones || !Array.isArray(guest.contact.phones) || guest.contact.phones.length === 0) {
        throw new Error(`客人${index + 1}电话必填`);
      }
      const firstPhone = guest.contact.phones[0];
      if (!firstPhone || !firstPhone.number || !firstPhone.number.trim()) {
        throw new Error(`客人${index + 1}电话号码必填`);
      }
      if (!firstPhone.countryCallingCode || !firstPhone.countryCallingCode.trim()) {
        throw new Error(`客人${index + 1}电话国家代码必填`);
      }
    });

    // 构建 v2 API 请求体
    // v2 API 格式：
    // - type: "hotel-order"
    // - guests: [{ tid, title, firstName, lastName, phone, email }]
    // - roomAssociations: [{ guestReferences, hotelOfferId }]
    // - payment: { method, paymentCard }
    // - travelAgent: { contact: { email } }
    
    // 格式化电话号码（从 phones 数组转换为完整字符串）
    // Amadeus API 要求：phone 字段必须是有效的电话号码字符串，格式：+国家代码+号码（如：+8613800138000）
    const formatPhone = (phones) => {
      if (!phones || phones.length === 0) {
        return null;
      }
      const phone = phones[0];
      if (!phone || !phone.number || !phone.number.trim()) {
        return null;
      }
      
      // 清理国家代码：移除 + 号，只保留数字
      let countryCode = (phone.countryCallingCode || '').trim().replace(/^\+/, '');
      // 清理号码：移除所有非数字字符
      let number = phone.number.trim().replace(/\D/g, '');
      
      // 验证：国家代码和号码都不能为空
      if (!countryCode || !number) {
        return null;
      }
      
      // 验证：号码长度应该在合理范围内（至少7位，最多15位）
      if (number.length < 7 || number.length > 15) {
        throw new Error(`电话号码格式无效：号码长度应在7-15位之间，当前为${number.length}位`);
      }
      
      // 返回格式：+国家代码+号码（如：+8613800138000）
      return `+${countryCode}${number}`;
    };

    const requestBody = {
      data: {
        type: 'hotel-order',
        guests: guests.map((guest, index) => {
          const formattedPhone = formatPhone(guest.contact.phones);
          if (!formattedPhone) {
            throw new Error(`客人${index + 1}电话号码格式无效`);
          }
          return {
            tid: index + 1,  // Transaction ID，从 1 开始
            title: guest.title || 'MR',  // MR, MRS, MS, MISS
            firstName: guest.name.firstName.toUpperCase(),
            lastName: guest.name.lastName.toUpperCase(),
            phone: formattedPhone,  // 格式：+国家代码+号码（如：+8613800138000）
            email: guest.contact.emailAddress.toLowerCase(),
          };
        }),
        travelAgent: {
          contact: {
            email: travelAgentEmail || guests[0].contact.emailAddress.toLowerCase(),
          },
        },
        roomAssociations: [
          {
            guestReferences: guests.map((_, index) => ({
              guestReference: String(index + 1),  // 对应 guests[].tid
            })),
            hotelOfferId: offerId,
          },
        ],
        payment: payment,  // 支付信息（必填）
      },
    };

    // 记录请求信息（用于调试）
    logger.debug('创建酒店预订请求（v2 API）:', {
      offerId,
      guestsCount: guests.length,
      hasPayment: !!payment,
      apiEnv,
      sdkConfig: {
        clientId: config.clientId.substring(0, 8) + '...',
        hostname: config.hostname,
      },
    });

    // 使用 v2 API（直接 HTTP 调用，因为 SDK 可能不支持 v2）
    // v2 API 端点：POST /v2/booking/hotel-orders
    try {
      const baseURL = apiEnv === 'production' 
        ? 'https://api.amadeus.com/v2'
        : 'https://test.api.amadeus.com/v2';
      
      const tokenBaseURL = apiEnv === 'production' 
        ? 'https://api.amadeus.com'
        : 'https://test.api.amadeus.com';
      
      // 获取 access token
      const tokenResponse = await axios.post(
        `${tokenBaseURL}/v1/security/oauth2/token`,
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );
      
      const accessToken = tokenResponse.data.access_token;
      
      // 调用 v2 API
      const response = await axios.post(
        `${baseURL}/booking/hotel-orders`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/vnd.amadeus+json',
            'Accept': 'application/vnd.amadeus+json',
          },
          timeout: 30000,
        }
      );
      
      // 将 axios 响应转换为类似 SDK 响应的格式
      const sdkLikeResponse = {
        data: response.data.data,
        meta: response.data.meta || {},
      };
      
      if (sdkLikeResponse && sdkLikeResponse.data) {
        logger.debug('酒店预订成功（v2 API）');
        return {
          success: true,
          data: sdkLikeResponse.data,
          meta: sdkLikeResponse.meta || {},
        };
      } else {
        throw new Error('预订API响应格式错误');
      }
    } catch (apiError) {
      // API 调用错误处理
      logger.error('酒店预订 API 调用失败:', {
        message: apiError.message,
        code: apiError.code,
        statusCode: apiError.response?.status || apiError.statusCode,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
      });
      
      // 检查是否是认证错误
      const isAuthError = apiError.response?.status === 401 || 
                          apiError.statusCode === 401 || 
                          (apiError.response?.data?.errors?.[0]?.code === 38190);
      
      if (isAuthError) {
        logger.warn('检测到认证错误，尝试重新获取 Token 并重试一次...');
        
        try {
          // 重新获取 token 并重试
          const tokenBaseURL = apiEnv === 'production' 
            ? 'https://api.amadeus.com'
            : 'https://test.api.amadeus.com';
          
          const retryTokenResponse = await axios.post(
            `${tokenBaseURL}/v1/security/oauth2/token`,
            new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: config.clientId,
              client_secret: config.clientSecret,
            }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              timeout: 10000,
            }
          );
          
          const retryAccessToken = retryTokenResponse.data.access_token;
          
          // 重试预订请求
          const baseURL = apiEnv === 'production' 
            ? 'https://api.amadeus.com/v2'
            : 'https://test.api.amadeus.com/v2';
          
          const retryResponse = await axios.post(
            `${baseURL}/booking/hotel-orders`,
            requestBody,
            {
              headers: {
                'Authorization': `Bearer ${retryAccessToken}`,
                'Content-Type': 'application/vnd.amadeus+json',
                'Accept': 'application/vnd.amadeus+json',
              },
              timeout: 30000,
            }
          );
          
          const retrySdkLikeResponse = {
            data: retryResponse.data.data,
            meta: retryResponse.data.meta || {},
          };
          
          if (retrySdkLikeResponse && retrySdkLikeResponse.data) {
            logger.debug('酒店预订成功（重试后）');
            return {
              success: true,
              data: retrySdkLikeResponse.data,
              meta: retrySdkLikeResponse.meta || {},
            };
          }
        } catch (retryError) {
          logger.error('重试后仍然失败:', {
            message: retryError.message,
            statusCode: retryError.response?.status,
            data: retryError.response?.data,
          });
          throw handleSdkError(retryError);
        }
      }
      
      // 处理其他错误
      if (apiError.response?.data?.errors) {
        const firstError = apiError.response.data.errors[0];
        const error = new Error(firstError.detail || firstError.title || '酒店预订失败');
        error.code = firstError.code;
        error.statusCode = firstError.status || apiError.response.status;
        error.originalError = apiError;
        throw error;
      }
      
      throw handleSdkError(apiError);
    }
  } catch (error) {
    // 详细记录错误信息
    logger.error('创建酒店预订失败:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      description: error.description,
      stack: error.stack,
      originalError: error,
    });
    
    // 如果是认证错误，提供更明确的提示
    if (error.statusCode === 401 || error.code === 401 || 
        (error.description && (String(error.description).toLowerCase().includes('invalid') || 
         String(error.description).toLowerCase().includes('token') ||
         String(error.description).toLowerCase().includes('unauthorized')))) {
      logger.error('认证失败，请检查 API Key 和 Secret 配置');
      logger.error('配置检查:', {
        hasApiKey: !!config.clientId,
        apiKeyPrefix: config.clientId ? config.clientId.substring(0, 8) + '...' : 'undefined',
        hasApiSecret: !!config.clientSecret,
        env: config.hostname,
      });
      
      const authError = new Error('Amadeus API 认证失败：访问令牌无效。请检查 API Key 和 Secret 配置是否正确，或联系管理员检查 API 凭证。如果问题持续，请尝试重启服务。');
      authError.statusCode = 401;
      authError.code = 'AUTH_ERROR';
      throw authError;
    }
    
    throw handleSdkError(error);
  }
}

/**
 * 获取订单详情
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-booking-management
 * 
 * @param {String} bookingId - Amadeus订单ID
 * @returns {Promise<Object>} 订单详情
 */
async function getHotelBooking(bookingId) {
  try {
    if (!bookingId) {
      throw new Error('bookingId参数必填');
    }

    // 使用 SDK 调用 API（SDK 自动处理认证和 Token）
    const { getAmadeusInstance } = require('./amadeusSdkInstance');
    const amadeus = getAmadeusInstance();
    const response = await amadeus.booking.hotelBooking(bookingId).get();

    if (response.data && response.data) {
      return {
        success: true,
        data: response.data,
        meta: response.meta || {},
      };
    } else {
      throw new Error('获取订单详情API响应格式错误');
    }
  } catch (error) {
    logger.error('获取订单详情失败:', error.message);
    throw handleSdkError(error);
  }
}

/**
 * 取消订单
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-booking-management
 * 
 * @param {String} bookingId - Amadeus订单ID
 * @returns {Promise<Object>} 取消结果
 */
async function cancelHotelBooking(bookingId) {
  try {
    if (!bookingId) {
      throw new Error('bookingId参数必填');
    }

    // 使用 SDK 调用 API（SDK 自动处理认证和 Token）
    const { getAmadeusInstance } = require('./amadeusSdkInstance');
    const amadeus = getAmadeusInstance();
    const response = await amadeus.booking.hotelBooking(bookingId).delete();

    if (response.data && response.data) {
      logger.debug('订单取消成功');
      return {
        success: true,
        data: response.data,
        meta: response.meta || {},
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
    
    // 处理订单无法取消的情况
    if (error.code === 400 || error.statusCode === 400 || 
        error.code === 422 || error.statusCode === 422) {
      const errorDetail = error.description || error.message;
      throw new Error(errorDetail || '订单无法取消，可能已超过取消时限');
    }
    
    throw handleSdkError(error);
  }
}

module.exports = {
  createHotelBooking,
  getHotelBooking,
  cancelHotelBooking,
};

